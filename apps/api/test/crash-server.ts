import { createCahootzHttpServer } from '../src/server.ts';
import fs from 'node:fs';

const dbPath = process.env.CRASH_DB_PATH;
const metaPath = process.env.CRASH_META_PATH;
if (!dbPath || !metaPath) {
  process.stderr.write('CRASH_DB_PATH and CRASH_META_PATH required\n');
  process.exit(1);
}

async function run() {
  const app = createCahootzHttpServer({ dbPath });

  // 1. Register Host & Peer
  const regHost = await app.dispatch<{ data: { userId: string } }>({
    method: 'POST',
    url: '/api/v1/auth/register',
    body: {
      email: 'host.crash@live.unilag.edu.ng',
      password: 'StrongPassword123!',
      dateOfBirth: '2002-01-15',
    },
  });
  const hostId = regHost.body.data.userId;

  const regPeer = await app.dispatch<{ data: { userId: string } }>({
    method: 'POST',
    url: '/api/v1/auth/register',
    body: {
      email: 'peer.crash@live.unilag.edu.ng',
      password: 'StrongPassword123!',
      dateOfBirth: '2002-02-20',
    },
  });
  const peerId = regPeer.body.data.userId;

  // 2. Login Host & Peer
  const loginHost = await app.dispatch<{ data: { accessToken: string } }>({
    method: 'POST',
    url: '/api/v1/auth/login',
    body: {
      email: 'host.crash@live.unilag.edu.ng',
      password: 'StrongPassword123!',
    },
  });
  const hostToken = loginHost.body.data.accessToken;

  const loginPeer = await app.dispatch<{ data: { accessToken: string } }>({
    method: 'POST',
    url: '/api/v1/auth/login',
    body: {
      email: 'peer.crash@live.unilag.edu.ng',
      password: 'StrongPassword123!',
    },
  });
  const peerToken = loginPeer.body.data.accessToken;

  const courseId = app.pilotSeed.courses['CSC 301'] || 'course-pilot-csc-301';

  // 3. Onboard Host & Peer
  await app.dispatch({
    method: 'POST',
    url: '/api/v1/students/onboarding',
    headers: { authorization: `Bearer ${hostToken}` },
    body: {
      institutionId: app.pilotSeed.institutionId,
      displayName: 'Host Crasher',
      courseIds: [courseId],
    },
  });

  await app.dispatch({
    method: 'POST',
    url: '/api/v1/students/onboarding',
    headers: { authorization: `Bearer ${peerToken}` },
    body: {
      institutionId: app.pilotSeed.institutionId,
      displayName: 'Peer Crasher',
      courseIds: [courseId],
    },
  });

  // 4. Send & Accept Invitation
  const invite = await app.dispatch<{ data: { id: string } }>({
    method: 'POST',
    url: '/api/v1/discovery/invitations',
    headers: { authorization: `Bearer ${hostToken}` },
    body: {
      recipientId: peerId,
      courseId,
      goal: 'Crash test survival goal',
      durationMinutes: 25,
    },
  });
  if (invite.status !== 201) {
    throw new Error(`Invitation failed with status ${invite.status}: ${JSON.stringify(invite.body)}`);
  }
  const invId = invite.body.data.id;

  const accept = await app.dispatch<{ data: { sessionId: string } }>({
    method: 'POST',
    url: `/api/v1/discovery/invitations/${invId}/respond`,
    headers: { authorization: `Bearer ${peerToken}` },
    body: { accept: true },
  });
  const sessionId = accept.body.data.sessionId;

  // 5. Check-in
  await app.dispatch({
    method: 'POST',
    url: `/api/v1/sessions/${sessionId}/check-in`,
    headers: { authorization: `Bearer ${hostToken}` },
    body: { expectedVersion: 1 },
  });

  // 6. Direct Message
  const dm = await app.dispatch<{ data: { id: string } }>({
    method: 'POST',
    url: '/api/v1/messages',
    headers: { authorization: `Bearer ${hostToken}` },
    body: {
      recipientId: peerId,
      body: 'Pre-crash direct message that must survive SIGKILL!',
    },
  });
  const dmId = dm.body.data.id;

  // Write metadata before kill
  fs.writeFileSync(metaPath, JSON.stringify({ hostId, peerId, sessionId, dmId }));

  // Immediate abrupt termination (SIGKILL) mid-session!
  // No server.close(), no syncToSql(), no process cleanup handlers!
  process.kill(process.pid, 'SIGKILL');
}

run().catch((err) => {
  process.stderr.write((err?.stack || String(err)) + '\n');
  process.exit(1);
});
