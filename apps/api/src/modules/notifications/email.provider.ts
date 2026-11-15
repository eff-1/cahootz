import net from 'node:net';
import tls from 'node:tls';

/**
 * Email delivery behind an interface so the provider can be swapped without
 * touching business logic.
 *
 * Production/Staging: configured via environment variables for either:
 *   - Resend HTTP API (`RESEND_API_KEY`, `EMAIL_FROM`, optional `RESEND_API_URL`)
 *   - SMTP / Mailpit (`SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, optional `SMTP_USER`, `SMTP_PASS`, `SMTP_TLS`)
 * Tests: use `InMemoryEmailOutbox` (`NODE_ENV=test`).
 *
 * Security: email bodies must never include passwords. One-time codes are sent
 * only to the address being verified, and are never logged.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Machine-readable tag for tests/analytics. Never contains secrets. */
  template: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export interface ResendProviderOptions {
  apiKey: string;
  fromAddress: string;
  apiUrl?: string;
  fetchFn?: typeof fetch;
}

/**
 * Real Resend HTTP API adapter (`POST https://api.resend.com/emails`).
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly apiUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ResendProviderOptions) {
    if (!options.apiKey || !options.apiKey.trim()) {
      throw new Error('ResendEmailProvider requires a non-empty RESEND_API_KEY.');
    }
    if (!options.fromAddress || !options.fromAddress.trim()) {
      throw new Error('ResendEmailProvider requires a non-empty EMAIL_FROM address.');
    }
    this.apiKey = options.apiKey.trim();
    this.fromAddress = options.fromAddress.trim();
    this.apiUrl = options.apiUrl ?? 'https://api.resend.com/emails';
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await this.fetchFn(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        tags: [{ name: 'template', value: message.template }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Resend API delivery failed with HTTP ${response.status}: ${errorText}`);
    }
  }
}

export interface SmtpProviderOptions {
  host: string;
  port: number;
  fromAddress: string;
  user?: string;
  pass?: string;
  useTls?: boolean;
  timeoutMs?: number;
}

/**
 * Real RFC 5321 SMTP adapter using Node's built-in `node:net` / `node:tls`.
 * Supports standard SMTP servers as well as local Mailpit/MailHog in staging/dev.
 */
export class SmtpEmailProvider implements EmailProvider {
  private readonly host: string;
  private readonly port: number;
  private readonly fromAddress: string;
  private readonly user?: string;
  private readonly pass?: string;
  private readonly useTls: boolean;
  private readonly timeoutMs: number;

  constructor(options: SmtpProviderOptions) {
    if (!options.host || !options.host.trim()) {
      throw new Error('SmtpEmailProvider requires a non-empty SMTP_HOST.');
    }
    if (!options.fromAddress || !options.fromAddress.trim()) {
      throw new Error('SmtpEmailProvider requires a non-empty EMAIL_FROM address.');
    }
    this.host = options.host.trim();
    this.port = options.port || 587;
    this.fromAddress = options.fromAddress.trim();
    this.user = options.user?.trim();
    this.pass = options.pass;
    this.useTls = options.useTls ?? this.port === 465;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async send(message: EmailMessage): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket: net.Socket = this.useTls
        ? tls.connect({ host: this.host, port: this.port })
        : net.createConnection({ host: this.host, port: this.port });

      let buffer = '';
      const commands: string[] = [`EHLO cahootz.local`];

      if (this.user && this.pass) {
        const authToken = Buffer.from(`\u0000${this.user}\u0000${this.pass}`, 'utf8').toString(
          'base64'
        );
        commands.push(`AUTH PLAIN ${authToken}`);
      }

      const safeSubject = message.subject.replace(/[\r\n]+/g, ' ');
      const rfc822Body = [
        `From: <${this.fromAddress}>`,
        `To: <${message.to}>`,
        `Subject: ${safeSubject}`,
        `X-Cahootz-Template: ${message.template}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        // Dot-stuff lines starting with '.' per RFC 5321 section 4.5.2
        ...message.text.split(/\r?\n/).map((line) => (line.startsWith('.') ? `.${line}` : line)),
        `.`,
      ].join('\r\n');

      commands.push(
        `MAIL FROM:<${this.fromAddress}>`,
        `RCPT TO:<${message.to}>`,
        `DATA`,
        rfc822Body,
        `QUIT`
      );

      let step = -1; // -1 = waiting for initial 220 banner

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.setTimeout(this.timeoutMs, () => {
        cleanup();
        reject(new Error(`SMTP connection timed out after ${this.timeoutMs}ms`));
      });

      socket.on('error', (err) => {
        cleanup();
        reject(err);
      });

      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\r\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line) continue;
          // Multi-line SMTP replies have '-' at index 3 (e.g., "250-PIPELINING"); wait for final line "250 OK"
          if (line.length >= 4 && line[3] === '-') continue;

          const code = Number(line.slice(0, 3));
          if (code >= 400 || Number.isNaN(code)) {
            cleanup();
            reject(new Error(`SMTP error at step ${step}: ${line}`));
            return;
          }

          step++;
          if (step < commands.length) {
            socket.write(`${commands[step]}\r\n`);
          } else {
            cleanup();
            resolve();
            return;
          }
        }
      });
    });
  }
}

/**
 * Test-only provider: keeps messages in memory so unit/integration tests can assert OTPs without external network calls.
 */
export class InMemoryEmailOutbox implements EmailProvider {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push({ ...message });
  }

  lastTo(address: string): EmailMessage | undefined {
    for (let i = this.sent.length - 1; i >= 0; i--) {
      if (this.sent[i]!.to === address) return this.sent[i];
    }
    return undefined;
  }
}

/**
 * Factory that builds the active EmailProvider from environment variables.
 * - Uses `ResendEmailProvider` if `RESEND_API_KEY` is set.
 * - Uses `SmtpEmailProvider` if `SMTP_HOST` is set.
 * - Throws in production if neither is configured; uses `InMemoryEmailOutbox` in tests.
 */
export function createEmailProviderFromEnv(
  env: Record<string, string | undefined> = process.env
): EmailProvider {
  const fromAddress = env.EMAIL_FROM || 'no-reply@cahootz.edu.ng';

  if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim()) {
    return new ResendEmailProvider({
      apiKey: env.RESEND_API_KEY,
      fromAddress,
      apiUrl: env.RESEND_API_URL,
    });
  }

  if (env.SMTP_HOST && env.SMTP_HOST.trim()) {
    return new SmtpEmailProvider({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      fromAddress,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      useTls: env.SMTP_TLS === 'true',
    });
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Production email provider not configured: set either RESEND_API_KEY or SMTP_HOST in environment.'
    );
  }

  return new InMemoryEmailOutbox();
}
