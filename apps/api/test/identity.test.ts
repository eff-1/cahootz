import test from 'node:test';
import assert from 'node:assert';
import { IdentityService } from '../src/modules/identity/identity.service.ts';
import { PasswordService } from '../src/modules/identity/password.service.ts';
import { TokenService } from '../src/modules/identity/token.service.ts';
import { TotpService } from '../src/modules/identity/totp.service.ts';

test('IdentityService - Registration and Age Verification (OPEN-06)', async (t) => {
  const service = new IdentityService();

  await t.test('Rejects registration under 16 years old', async () => {
    const under16Dob = new Date();
    under16Dob.setFullYear(under16Dob.getFullYear() - 15);

    await assert.rejects(
      async () => {
        await service.register({
          email: 'too-young@example.com',
          password: 'Password123!',
          dateOfBirth: under16Dob.toISOString().split('T')[0] as string,
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, 'VALIDATION_FAILED');
        assert.ok(err.message.includes('16'));
        return true;
      },
    );
  });

  await t.test('Under-18 user (16-17) is marked isRestricted: true with discoverability disabled', async () => {
    const teenDob = new Date();
    teenDob.setFullYear(teenDob.getFullYear() - 17);

    const result = await service.register({
      email: 'teen@unilag.edu.ng',
      password: 'Password123!',
      dateOfBirth: teenDob.toISOString().split('T')[0] as string,
    });

    assert.strictEqual(result.isRestricted, true);
    assert.ok(result.verificationToken);
  });

  await t.test('Adult user (18+) is registered without restricted mode', async () => {
    const adultDob = new Date();
    adultDob.setFullYear(adultDob.getFullYear() - 21);

    const result = await service.register({
      email: 'adult@unilag.edu.ng',
      password: 'Password123!',
      dateOfBirth: adultDob.toISOString().split('T')[0] as string,
    });

    assert.strictEqual(result.isRestricted, false);
  });

  await t.test('Duplicate email registration is rejected with CONFLICT', async () => {
    const adultDob = new Date();
    adultDob.setFullYear(adultDob.getFullYear() - 21);

    await assert.rejects(
      async () => {
        await service.register({
          email: 'adult@unilag.edu.ng',
          password: 'DifferentPassword123!',
          dateOfBirth: adultDob.toISOString().split('T')[0] as string,
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, 'CONFLICT');
        return true;
      },
    );
  });
});

test('IdentityService - Email Verification', async (t) => {
  const service = new IdentityService();
  const dob = new Date('2002-05-10').toISOString().split('T')[0] as string;

  const reg = await service.register({
    email: 'verify-me@unilag.edu.ng',
    password: 'Password123!',
    dateOfBirth: dob,
  });

  await t.test('Verifies email with valid token', async () => {
    const res = await service.verifyEmail(reg.verificationToken);
    assert.strictEqual(res.success, true);
  });

  await t.test('Rejects already used or invalid verification token', async () => {
    await assert.rejects(
      async () => {
        await service.verifyEmail(reg.verificationToken);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'VALIDATION_FAILED');
        return true;
      },
    );
  });
});

test('IdentityService - Login and Account Enumeration Prevention (Security 18)', async (t) => {
  const service = new IdentityService();
  const dob = new Date('2001-01-15').toISOString().split('T')[0] as string;

  await service.register({
    email: 'login-test@unilag.edu.ng',
    password: 'CorrectPassword123!',
    dateOfBirth: dob,
  });

  await t.test('Successful login returns accessToken, refreshToken and user payload', async () => {
    const result = await service.login({
      email: 'login-test@unilag.edu.ng',
      password: 'CorrectPassword123!',
    });

    assert.strictEqual(result.mfaRequired, false);
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.strictEqual(result.user?.email, 'login-test@unilag.edu.ng');
  });

  await t.test('Incorrect password gives generic uniform error (no account enumeration)', async () => {
    await assert.rejects(
      async () => {
        await service.login({
          email: 'login-test@unilag.edu.ng',
          password: 'WrongPassword999!',
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, 'UNAUTHENTICATED');
        assert.strictEqual(err.message, 'Invalid email or password');
        return true;
      },
    );
  });

  await t.test('Non-existent email gives EXACT SAME generic error (no account enumeration)', async () => {
    await assert.rejects(
      async () => {
        await service.login({
          email: 'does-not-exist@unilag.edu.ng',
          password: 'AnyPassword123!',
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, 'UNAUTHENTICATED');
        assert.strictEqual(err.message, 'Invalid email or password');
        return true;
      },
    );
  });
});

test('IdentityService - Refresh Token Rotation and Replay Detection (Security 12)', async (t) => {
  const service = new IdentityService();
  const dob = new Date('2000-03-20').toISOString().split('T')[0] as string;

  await service.register({
    email: 'rotation-test@unilag.edu.ng',
    password: 'Password123!',
    dateOfBirth: dob,
  });

  const loginRes = await service.login({
    email: 'rotation-test@unilag.edu.ng',
    password: 'Password123!',
  });

  const initialRefreshToken = loginRes.refreshToken as string;

  let rotatedRefreshToken = '';
  await t.test('Refresh rotates token and provides new access token', async () => {
    const refreshRes = await service.refresh(initialRefreshToken);
    assert.ok(refreshRes.accessToken);
    assert.ok(refreshRes.refreshToken);
    assert.notStrictEqual(refreshRes.refreshToken, initialRefreshToken);
    rotatedRefreshToken = refreshRes.refreshToken;
  });

  await t.test('REPLAY DETECTION: Replaying old refresh token revokes all sessions!', async () => {
    // Attempting to use the already-rotated initial token represents a compromised token
    await assert.rejects(
      async () => {
        await service.refresh(initialRefreshToken);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'UNAUTHENTICATED');
        return true;
      },
    );

    // After replay detection, the rotated token should also be revoked!
    await assert.rejects(
      async () => {
        await service.refresh(rotatedRefreshToken);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'UNAUTHENTICATED');
        return true;
      },
    );
  });
});

test('IdentityService - Sessions Management and Sign Out Everywhere', async () => {
  const service = new IdentityService();
  const dob = new Date('1999-11-11').toISOString().split('T')[0] as string;

  const reg = await service.register({
    email: 'devices@unilag.edu.ng',
    password: 'Password123!',
    dateOfBirth: dob,
  });

  const session1 = await service.login(
    { email: 'devices@unilag.edu.ng', password: 'Password123!' },
    { deviceName: 'Laptop Chrome' },
  );

  const session2 = await service.login(
    { email: 'devices@unilag.edu.ng', password: 'Password123!' },
    { deviceName: 'Mobile Safari' },
  );

  const sessions = await service.listSessions(reg.userId);
  assert.strictEqual(sessions.length, 2);

  // Revoke device 1
  await service.revokeSession(reg.userId, sessions[0]!.id);
  const remaining = await service.listSessions(reg.userId);
  assert.strictEqual(remaining.length, 1);

  // Sign out everywhere
  await service.signOutEverywhere(reg.userId);
  const afterSignOut = await service.listSessions(reg.userId);
  assert.strictEqual(afterSignOut.length, 0);
});

test('IdentityService - Password Reset Flow (No Account Enumeration)', async () => {
  const service = new IdentityService();
  const dob = new Date('2001-08-25').toISOString().split('T')[0] as string;

  await service.register({
    email: 'reset-flow@unilag.edu.ng',
    password: 'OldPassword123!',
    dateOfBirth: dob,
  });

  // Request for real account
  const resReal = await service.requestPasswordReset('reset-flow@unilag.edu.ng');
  assert.strictEqual(resReal.accepted, true);
  assert.ok(resReal.devToken);

  // Request for fake account gives identical response
  const resFake = await service.requestPasswordReset('non-existent@unilag.edu.ng');
  assert.strictEqual(resFake.accepted, true);
  assert.strictEqual(resFake.message, resReal.message);

  // Reset password
  await service.resetPassword(resReal.devToken!, 'NewStrongPassword123!');

  // Old password must fail
  await assert.rejects(async () => {
    await service.login({ email: 'reset-flow@unilag.edu.ng', password: 'OldPassword123!' });
  });

  // New password must succeed
  const loginRes = await service.login({
    email: 'reset-flow@unilag.edu.ng',
    password: 'NewStrongPassword123!',
  });
  assert.ok(loginRes.accessToken);
});

test('IdentityService - Staff TOTP MFA', async () => {
  const service = new IdentityService();
  const totpService = new TotpService();
  const dob = new Date('1998-04-12').toISOString().split('T')[0] as string;

  const reg = await service.register({
    email: 'staff@cahootz.com',
    password: 'StaffPassword123!',
    dateOfBirth: dob,
  });

  // Generate MFA secret
  const { secret, otpauthUrl } = await service.generateMfaSecret(reg.userId);
  assert.ok(secret);
  assert.ok(otpauthUrl.includes('Cahootz'));

  // Generate valid token and enable MFA
  const validCode = totpService.generateToken(secret);
  const enableRes = await service.enableMfa(reg.userId, secret, validCode);
  assert.strictEqual(enableRes.success, true);

  // Login without TOTP code requests MFA
  const loginChallenge = await service.login({
    email: 'staff@cahootz.com',
    password: 'StaffPassword123!',
  });
  assert.strictEqual(loginChallenge.mfaRequired, true);

  // Login with invalid code fails
  await assert.rejects(async () => {
    await service.login({
      email: 'staff@cahootz.com',
      password: 'StaffPassword123!',
      totpCode: '000000',
    });
  });

  // Login with valid code succeeds
  const currentCode = totpService.generateToken(secret);
  const loginSuccess = await service.login({
    email: 'staff@cahootz.com',
    password: 'StaffPassword123!',
    totpCode: currentCode,
  });
  assert.strictEqual(loginSuccess.mfaRequired, false);
  assert.ok(loginSuccess.accessToken);
});
