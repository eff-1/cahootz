/**
 * Email delivery behind an interface so the provider can be swapped without
 * touching business logic. In development the SMTP adapter points at Mailpit;
 * tests use the in-memory outbox.
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

/** Test/dev provider: keeps messages in memory. */
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

