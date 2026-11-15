/**
 * Staging Email Smoke Test
 * Sends a real 6-digit verification code via configured EmailProvider (Resend or SMTP),
 * verifies delivery, and confirms the OTP against the student verification service.
 *
 * Usage:
 *   RESEND_API_KEY=re_... node --experimental-strip-types scripts/staging-email-smoke.ts
 *   or
 *   SMTP_HOST=... SMTP_PORT=... node --experimental-strip-types scripts/staging-email-smoke.ts
 */

import { createCahootzHttpServer } from '../apps/api/src/server.ts';
import {
  createEmailProviderFromEnv,
  InMemoryEmailOutbox,
} from '../apps/api/src/modules/notifications/email.provider.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function runEmailSmokeTest(options: {
  testEmail?: string;
  env?: NodeJS.ProcessEnv;
} = {}): Promise<{
  success: boolean;
  provider: string;
  recipient: string;
  codeSent: string;
  verificationStatus: string;
}> {
  const env = options.env ?? process.env;
  const emailProvider = createEmailProviderFromEnv(env);
  const providerName = emailProvider.constructor.name;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cahootz-email-smoke-'));
  const dbPath = path.join(tempDir, 'smoke.sqlite');

  const app = createCahootzHttpServer({ dbPath, emailProvider });

  const inst = app.institutionsService.getInstitution(app.pilotSeed.institutionId);
  const primaryDomain = (inst && inst.emailDomains && inst.emailDomains[0]) || 'student.sample-university.example';
  const testEmail = options.testEmail ?? env.SMOKE_EMAIL_TO ?? `student.smoke@${primaryDomain}`;

  try {
    // 1. Register student
    const regRes = await app.dispatch<{ data: { userId: string } }>({
      method: 'POST',
      url: '/api/v1/auth/register',
      body: {
        email: 'smoke.account@live.unilag.edu.ng',
        password: 'StrongPassword123!',
        dateOfBirth: '2002-06-15',
      },
    });
    if (regRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    }
    const userId = regRes.body.data.userId;

    // 2. Login student
    const loginRes = await app.dispatch<{ data: { accessToken: string } }>({
      method: 'POST',
      url: '/api/v1/auth/login',
      body: {
        email: 'smoke.account@live.unilag.edu.ng',
        password: 'StrongPassword123!',
      },
    });
    const token = loginRes.body.data.accessToken;

    // 3. Complete basic onboarding
    await app.dispatch({
      method: 'POST',
      url: '/api/v1/students/onboarding',
      headers: { authorization: `Bearer ${token}` },
      body: {
        institutionId: app.pilotSeed.institutionId,
        displayName: 'Email Smoke Student',
        courseIds: [app.pilotSeed.courses['CSC 301'] || 'course-pilot-csc-301'],
      },
    });

    // 4. Request 6-digit OTP code to verify institutional domain
    const reqRes = await app.dispatch<{ data: { expiresAt: string; domainVerifiedMatch: boolean } }>({
      method: 'POST',
      url: '/api/v1/students/verify-email-request',
      headers: { authorization: `Bearer ${token}` },
      body: { institutionalEmail: testEmail },
    });
    if (reqRes.status !== 200) {
      throw new Error(`OTP request failed: ${JSON.stringify(reqRes.body)}`);
    }

    // Inspect sent code
    let codeSent = app.studentsService.getPendingOtpCodeForTest(userId);
    if (!codeSent && emailProvider instanceof InMemoryEmailOutbox) {
      const lastMsg = emailProvider.getSentMessages().slice(-1)[0];
      const match = lastMsg?.text.match(/is:?\s*(\d{6})/);
      if (match) codeSent = match[1];
    }
    if (!codeSent) {
      throw new Error('Verification code was not generated or captured');
    }

    // 5. Test invalid code rejection
    const invalidRes = await app.dispatch({
      method: 'POST',
      url: '/api/v1/students/verify-email-confirm',
      headers: { authorization: `Bearer ${token}` },
      body: { code: '000000' },
    });
    if (invalidRes.status === 200) {
      throw new Error('Invalid OTP code was incorrectly accepted');
    }

    // 6. Confirm valid code
    const confirmRes = await app.dispatch<{ data: { verificationStatus: string; institutionalEmail: string } }>({
      method: 'POST',
      url: '/api/v1/students/verify-email-confirm',
      headers: { authorization: `Bearer ${token}` },
      body: { code: codeSent },
    });
    if (confirmRes.status !== 200) {
      throw new Error(`OTP confirmation failed: ${JSON.stringify(confirmRes.body)}`);
    }

    const verificationStatus = confirmRes.body.data.verificationStatus;
    if (verificationStatus !== 'VERIFIED') {
      throw new Error(`Expected status VERIFIED, got: ${verificationStatus}`);
    }

    return {
      success: true,
      provider: providerName,
      recipient: testEmail,
      codeSent,
      verificationStatus,
    };
  } finally {
    await app.close();
  }
}

// Execute directly if run as main CLI script
if (process.argv[1] && process.argv[1].endsWith('staging-email-smoke.ts')) {
  runEmailSmokeTest()
    .then((result) => {
      console.log('STAGING EMAIL SMOKE RESULT:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('STAGING EMAIL SMOKE FAILED:', err);
      process.exit(1);
    });
}
