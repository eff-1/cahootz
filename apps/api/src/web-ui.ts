import { BRAND_NAME } from '../../../packages/shared/src/index.ts';

export function renderClientAppJs(): string {
  return `// Cahootz Student Web Client (Vanilla ES2022, Zero External Dependencies)
(function () {
  const STORAGE_KEY = 'cahootz_auth';

  function getAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setAuth(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  function clearAuth() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  async function apiFetch(path, options = {}) {
    const auth = getAuth();
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {}
    );
    if (auth && auth.accessToken && !headers['Authorization']) {
      headers['Authorization'] = 'Bearer ' + auth.accessToken;
    }
    const res = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (json && json.error && json.error.message) || ('Request failed (' + res.status + ')');
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return json.data !== undefined ? json.data : json;
  }

  function setStatus(elId, message, isError) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.className = isError ? 'status-banner status-error' : 'status-banner status-ok';
    el.hidden = !message;
  }

  // Update nav user badge + dashboard metrics if logged in
  async function refreshStudentBanner() {
    const auth = getAuth();
    const badge = document.getElementById('nav-user-status');
    if (badge) {
      badge.textContent = auth && auth.email ? ('Signed in: ' + auth.email) : 'Not signed in';
    }
    if (!auth || !auth.accessToken) return;

    try {
      const me = await apiFetch('/api/v1/students/me');
      const xpEl = document.getElementById('dashboard-xp');
      const streakEl = document.getElementById('dashboard-streak');
      const relEl = document.getElementById('dashboard-reliability');
      if (xpEl) xpEl.textContent = me.xp + ' XP';
      if (streakEl) streakEl.textContent = (me.streak ? me.streak.currentStreakDays : 0) + ' Days';
      if (relEl && me.reliability) {
        relEl.textContent = me.reliability.band + ' (' + me.reliability.score + '%)';
      }
    } catch {}
  }

  // ─── 1. Home / Register & Login Page (/) ───────────────────────
  function initHomePage() {
    const regForm = document.getElementById('register-form');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus('auth-status', 'Creating your student account...', false);
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const dateOfBirth = document.getElementById('reg-dob').value;
        try {
          await apiFetch('/api/v1/auth/register', {
            method: 'POST',
            body: { email, password, dateOfBirth, privacyNoticeVersion: 'v1.0-draft' },
          });
          const loginData = await apiFetch('/api/v1/auth/login', {
            method: 'POST',
            body: { email, password },
          });
          setAuth({
            accessToken: loginData.accessToken,
            userId: loginData.user.id,
            email: loginData.user.email,
          });
          setStatus('auth-status', 'Account created and signed in as ' + loginData.user.email, false);
          await refreshStudentBanner();
        } catch (err) {
          setStatus('auth-status', err.message, true);
        }
      });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus('auth-status', 'Signing in...', false);
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        try {
          const loginData = await apiFetch('/api/v1/auth/login', {
            method: 'POST',
            body: { email, password },
          });
          setAuth({
            accessToken: loginData.accessToken,
            userId: loginData.user.id,
            email: loginData.user.email,
          });
          setStatus('auth-status', 'Signed in as ' + loginData.user.email, false);
          await refreshStudentBanner();
        } catch (err) {
          setStatus('auth-status', err.message, true);
        }
      });
    }
  }

  // ─── 2. Onboarding Page (/onboarding) ──────────────────────────
  async function initOnboardingPage() {
    const form = document.getElementById('onboarding-form');
    if (!form) return;

    const instSelect = document.getElementById('institution-select');
    const courseSelect = document.getElementById('course-select');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('onboarding-status', 'Saving your academic profile...', false);
      const institutionId = instSelect.value;
      const displayName = document.getElementById('display-name').value.trim();
      const courseId = courseSelect.value;
      try {
        await apiFetch('/api/v1/students/onboarding', {
          method: 'POST',
          body: {
            institutionId,
            displayName,
            courseIds: [courseId],
            studyGoals: ['Exam Prep', 'Past Questions'],
          },
        });
        setStatus('onboarding-status', 'Profile saved! Ready to discover study partners.', false);
      } catch (err) {
        setStatus('onboarding-status', err.message, true);
      }
    });

    try {
      const instData = await apiFetch('/api/v1/institutions');
      const items = (instData && instData.items) || [];
      if (items.length > 0 && instSelect) {
        instSelect.innerHTML = '';
        for (const inst of items) {
          const opt = document.createElement('option');
          opt.value = inst.id;
          opt.textContent = inst.name;
          instSelect.appendChild(opt);
        }
        const struct = await apiFetch('/api/v1/institutions/' + items[0].id + '/structure');
        if (struct && struct.courses && courseSelect) {
          courseSelect.innerHTML = '';
          for (const c of struct.courses) {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.code + ' — ' + c.title;
            courseSelect.appendChild(opt);
          }
        }
      }
    } catch {}
  }

  // ─── 3. Discover & Invitations Page (/discover) ────────────────
  async function initDiscoverPage() {
    const partnersContainer = document.getElementById('partners-list');
    if (!partnersContainer) return;

    let defaultCourseId = 'course-pilot-csc-301';

    async function loadPartners() {
      const auth = getAuth();
      if (!auth || !auth.accessToken) return;
      try {
        const me = await apiFetch('/api/v1/students/me');
        if (me && me.courseIds && me.courseIds[0]) {
          defaultCourseId = me.courseIds[0];
        }
        const data = await apiFetch('/api/v1/discovery/partners');
        const items = (data && data.items) || [];
        if (items.length === 0) {
          partnersContainer.innerHTML = '<p class="empty-state">No matching study partners online yet. Keep this page open while classmates join.</p>';
          return;
        }
        partnersContainer.innerHTML = '';
        for (const p of items) {
          const card = document.createElement('article');
          card.className = 'card partner-row';
          const info = document.createElement('div');
          const h3 = document.createElement('h3');
          h3.textContent = p.displayName + ' ';
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = p.reliabilityBand;
          h3.appendChild(badge);
          const desc = document.createElement('p');
          desc.textContent = (p.matchReasons || []).join(' · ') || 'Shared course match';
          info.appendChild(h3);
          info.appendChild(desc);

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-primary invite-partner-btn';
          btn.setAttribute('data-partner-id', p.userId);
          btn.setAttribute('data-course-id', (p.sharedCourseIds && p.sharedCourseIds[0]) || defaultCourseId);
          btn.textContent = 'Invite to Study';
          btn.addEventListener('click', async () => {
            try {
              setStatus('discover-status', 'Sending study invitation to ' + p.displayName + '...', false);
              const inv = await apiFetch('/api/v1/discovery/invitations', {
                method: 'POST',
                body: {
                  recipientId: p.userId,
                  courseId: (p.sharedCourseIds && p.sharedCourseIds[0]) || defaultCourseId,
                  goal: 'CSC 301 Past Questions & Focus Block',
                  durationMinutes: 25,
                },
              });
              setStatus('discover-status', 'Invitation sent (' + inv.id + ')! Waiting for partner to accept...', false);
              await pollInvitations();
            } catch (err) {
              setStatus('discover-status', err.message, true);
            }
          });

          card.appendChild(info);
          card.appendChild(btn);
          partnersContainer.appendChild(card);
        }
      } catch (err) {
        // Tolerate transient network drops during polling
      }
    }

    async function pollInvitations() {
      const auth = getAuth();
      if (!auth || !auth.accessToken) return;
      try {
        const data = await apiFetch('/api/v1/discovery/invitations');
        const items = (data && data.items) || [];
        const incomingBox = document.getElementById('incoming-invitations-list');
        const activeSessionBox = document.getElementById('active-session-banner');

        if (incomingBox) {
          const pendingIncoming = items.filter((i) => i.recipientId === auth.userId && i.status === 'PENDING');
          incomingBox.innerHTML = '';
          for (const inv of pendingIncoming) {
            const row = document.createElement('div');
            row.className = 'card partner-row';
            const label = document.createElement('p');
            label.textContent = 'Incoming Study Invitation: ' + inv.goal + ' (' + inv.durationMinutes + ' min)';
            const acceptBtn = document.createElement('button');
            acceptBtn.type = 'button';
            acceptBtn.className = 'btn-primary accept-invitation-btn';
            acceptBtn.setAttribute('data-invitation-id', inv.id);
            acceptBtn.textContent = 'Accept & Enter Room';
            acceptBtn.addEventListener('click', async () => {
              try {
                setStatus('discover-status', 'Accepting invitation and opening focus room...', false);
                const accepted = await apiFetch('/api/v1/discovery/invitations/' + inv.id + '/respond', {
                  method: 'POST',
                  body: { accept: true },
                });
                if (accepted && accepted.sessionId) {
                  window.location.href = '/sessions/' + accepted.sessionId;
                }
              } catch (err) {
                setStatus('discover-status', err.message, true);
              }
            });
            row.appendChild(label);
            row.appendChild(acceptBtn);
            incomingBox.appendChild(row);
          }
        }

        const acceptedWithSession = items.find((i) => i.status === 'ACCEPTED' && i.sessionId);
        if (acceptedWithSession && activeSessionBox) {
          activeSessionBox.hidden = false;
          activeSessionBox.innerHTML = '';
          const link = document.createElement('a');
          link.id = 'enter-active-session-link';
          link.href = '/sessions/' + acceptedWithSession.sessionId;
          link.className = 'btn-primary';
          link.textContent = 'Enter Active Session Room';
          activeSessionBox.appendChild(link);
        }
      } catch {}
    }

    const studyNowBtn = document.getElementById('toggle-study-now-btn');
    if (studyNowBtn) {
      studyNowBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/v1/discovery/study-now', {
            method: 'POST',
            body: { courseId: defaultCourseId, goalNote: 'Ready now for 25m focus', durationMinutes: 25 },
          });
          setStatus('discover-status', 'Looking to Study Now signal activated for 30 minutes!', false);
          await loadPartners();
        } catch (err) {
          setStatus('discover-status', err.message, true);
        }
      });
    }

    const refreshBtn = document.getElementById('refresh-partners-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadPartners();
        pollInvitations();
      });
    }

    await loadPartners();
    await pollInvitations();
    setInterval(() => {
      loadPartners();
      pollInvitations();
    }, 1200);
  }

  // ─── 4. Study Together Focus Room (/sessions/:id) ──────────────
  async function initSessionRoomPage() {
    const timerEl = document.getElementById('session-timer-display');
    if (!timerEl) return;

    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1] || 'demo';
    const resumeStorageKey = 'cahootz_resume_' + sessionId;
    let clientSeq = 0;
    let wasOfflineOrFailed = false;

    // Authoritative server timer interpolation state
    let timerAnchor = {
      remainingSeconds: 25 * 60,
      state: 'SCHEDULED',
      receivedAtPerfNow: performance.now(),
    };

    function formatMmSs(totalSec) {
      const clamped = Math.max(0, Math.round(totalSec));
      const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
      const ss = String(clamped % 60).padStart(2, '0');
      return mm + ':' + ss;
    }

    function renderInterpolatedTimer() {
      let currentRemaining = timerAnchor.remainingSeconds;
      if (timerAnchor.state === 'ACTIVE') {
        const elapsedSinceSync = (performance.now() - timerAnchor.receivedAtPerfNow) / 1000;
        currentRemaining = Math.max(0, timerAnchor.remainingSeconds - elapsedSinceSync);
      }
      timerEl.textContent = formatMmSs(currentRemaining);
      timerEl.setAttribute('data-remaining-seconds', String(Math.round(currentRemaining)));
    }

    setInterval(renderInterpolatedTimer, 250);

    async function tryAutoReconnect() {
      if (sessionId === 'demo') return;
      const savedResumeToken = localStorage.getItem(resumeStorageKey);
      if (!savedResumeToken) return;
      try {
        await apiFetch('/api/v1/sessions/' + sessionId + '/reconnect', {
          method: 'POST',
          body: { resumeToken: savedResumeToken },
        });
        wasOfflineOrFailed = false;
        setStatus('session-status', 'Reconnected within 5-minute grace window — zero penalty applied!', false);
      } catch {}
    }

    window.addEventListener('offline', () => {
      wasOfflineOrFailed = true;
      setStatus('session-status', 'Connection lost — 5-minute fairness reconnect grace active (no penalty).', false);
    });

    window.addEventListener('online', () => {
      tryAutoReconnect();
    });

    async function pollSessionState() {
      const auth = getAuth();
      if (!auth || !auth.accessToken || sessionId === 'demo') return;
      try {
        if (wasOfflineOrFailed) {
          await tryAutoReconnect();
        }
        const data = await apiFetch('/api/v1/sessions/' + sessionId + '/state');
        const session = data.session;
        const timer = data.timerSnapshot;
        const pings = data.pings || [];
        const meStats = data.studentStats;

        if (session && session.participants && session.participants[auth.userId]) {
          const myPart = session.participants[auth.userId];
          if (myPart.resumeToken) {
            localStorage.setItem(resumeStorageKey, myPart.resumeToken);
          }
          if (myPart.presenceState === 'AWAY_UNREACHABLE') {
            await tryAutoReconnect();
          }
        }

        if (timer) {
          timerAnchor = {
            remainingSeconds: timer.remainingSeconds,
            state: session.state,
            receivedAtPerfNow: performance.now(),
          };
          renderInterpolatedTimer();
        }

        const stateBadge = document.getElementById('session-state-badge');
        if (stateBadge && session) {
          stateBadge.textContent = session.state;
        }

        // Check if there is a PENDING ping addressed to the current student
        const pendingPing = pings.find((p) => p.recipientId === auth.userId && p.outcome === 'PENDING');
        const pingBanner = document.getElementById('ping-banner');
        const respondBtn = document.getElementById('respond-ping-btn');
        if (pingBanner && respondBtn) {
          if (pendingPing) {
            pingBanner.hidden = false;
            respondBtn.setAttribute('data-ping-id', pendingPing.id);
          } else {
            pingBanner.hidden = true;
          }
        }

        if (meStats) {
          const xpEl = document.getElementById('session-total-xp');
          const streakEl = document.getElementById('session-streak');
          const relEl = document.getElementById('session-reliability');
          if (xpEl) xpEl.textContent = meStats.xp + ' XP';
          if (streakEl) streakEl.textContent = meStats.streakDays + ' Days';
          if (relEl) relEl.textContent = meStats.reliabilityBand + ' (' + meStats.reliabilityScore + '%)';
        }
      } catch (err) {
        wasOfflineOrFailed = true;
      }
    }

    async function sendHeartbeat() {
      const auth = getAuth();
      if (!auth || !auth.accessToken || sessionId === 'demo') return;
      clientSeq += 1;
      try {
        await apiFetch('/api/v1/sessions/' + sessionId + '/heartbeat', {
          method: 'POST',
          body: {
            clientEventId: 'hb-' + auth.userId + '-' + clientSeq + '-' + Date.now(),
            clientSeq,
            visibility: document.visibilityState === 'hidden' ? 'HIDDEN' : 'VISIBLE',
          },
        });
      } catch {
        wasOfflineOrFailed = true;
      }
    }

    // Wire session control buttons
    const checkinBtn = document.getElementById('checkin-btn');
    if (checkinBtn) {
      checkinBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/v1/sessions/' + sessionId + '/check-in', {
            method: 'POST',
            body: {},
          });
          setStatus('session-status', 'Checked in to study session!', false);
          await sendHeartbeat();
          await pollSessionState();
        } catch (err) {
          setStatus('session-status', err.message, true);
        }
      });
    }

    const sendPingBtn = document.getElementById('send-ping-btn');
    if (sendPingBtn) {
      sendPingBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/v1/sessions/' + sessionId + '/ping', {
            method: 'POST',
            body: { idempotencyKey: 'ping-' + Date.now() },
          });
          setStatus('session-status', 'Accountability ping sent to your study partner.', false);
          await pollSessionState();
        } catch (err) {
          setStatus('session-status', err.message, true);
        }
      });
    }

    const respondPingBtn = document.getElementById('respond-ping-btn');
    if (respondPingBtn) {
      respondPingBtn.addEventListener('click', async () => {
        const pingId = respondPingBtn.getAttribute('data-ping-id');
        if (!pingId) return;
        try {
          await apiFetch('/api/v1/sessions/' + sessionId + '/ping/' + pingId + '/respond', {
            method: 'POST',
            body: {},
          });
          setStatus('session-status', "Confirmed! You responded 'I'm here' to the accountability ping.", false);
          await pollSessionState();
        } catch (err) {
          setStatus('session-status', err.message, true);
        }
      });
    }

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/v1/sessions/' + sessionId + '/pause', {
            method: 'POST',
            body: { reason: 'Short study break' },
          });
          setStatus('session-status', 'Session timer paused.', false);
          await pollSessionState();
        } catch (err) {
          setStatus('session-status', err.message, true);
        }
      });
    }

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/v1/sessions/' + sessionId + '/resume', {
            method: 'POST',
            body: {},
          });
          setStatus('session-status', 'Session timer resumed.', false);
          await pollSessionState();
        } catch (err) {
          setStatus('session-status', err.message, true);
        }
      });
    }

    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/v1/sessions/' + sessionId + '/complete', {
            method: 'POST',
            body: {},
          });
          setStatus('session-status', 'Study session completed! XP and streak updated.', false);
          await pollSessionState();
        } catch (err) {
          setStatus('session-status', err.message, true);
        }
      });
    }

    const disputeForm = document.getElementById('dispute-form');
    if (disputeForm) {
      disputeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reason = document.getElementById('dispute-reason-input').value.trim();
        try {
          const disp = await apiFetch('/api/v1/sessions/' + sessionId + '/dispute', {
            method: 'POST',
            body: { reason },
          });
          setStatus('session-status', 'Dispute filed (' + disp.status + '): ' + (disp.resolutionNote || 'Queued for review'), false);
          await pollSessionState();
        } catch (err) {
          setStatus('session-status', err.message, true);
        }
      });
    }

    await pollSessionState();
    setInterval(pollSessionState, 900);
    setInterval(sendHeartbeat, 15000);
  }

  // ─── 5. Direct Messages Page (/messages) ───────────────────────
  async function initMessagesPage() {
    const form = document.getElementById('send-message-form');
    if (!form) return;

    const listEl = document.getElementById('messages-list');

    async function loadMessages() {
      const auth = getAuth();
      if (!auth || !auth.accessToken) return;
      try {
        const data = await apiFetch('/api/v1/messages');
        const items = (data && data.items) || [];
        if (listEl) {
          if (items.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No direct messages yet.</p>';
          } else {
            listEl.innerHTML = '';
            for (const m of items) {
              const p = document.createElement('p');
              p.textContent = (m.senderId === auth.userId ? 'You: ' : 'Partner: ') + m.body;
              listEl.appendChild(p);
            }
          }
        }
      } catch {}
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const recipientId = document.getElementById('chat-recipient-id').value.trim();
      const body = document.getElementById('chat-message-input').value.trim();
      try {
        await apiFetch('/api/v1/messages', {
          method: 'POST',
          body: { recipientId, body, clientMessageId: 'msg-' + Date.now() },
        });
        document.getElementById('chat-message-input').value = '';
        setStatus('messages-status', 'Message sent.', false);
        await loadMessages();
      } catch (err) {
        setStatus('messages-status', err.message, true);
      }
    });

    const reportBtn = document.getElementById('report-user-btn');
    if (reportBtn) {
      reportBtn.addEventListener('click', async () => {
        const targetUserId = document.getElementById('chat-recipient-id').value.trim();
        try {
          const rep = await apiFetch('/api/v1/moderation/reports', {
            method: 'POST',
            body: {
              targetUserId,
              targetType: 'USER',
              targetId: targetUserId,
              category: 'SPAM',
              description: 'Reported from 1:1 message screen',
            },
          });
          setStatus('messages-status', 'Report submitted (ID: ' + rep.id + '). Immutable evidence snapshot captured.', false);
        } catch (err) {
          setStatus('messages-status', err.message, true);
        }
      });
    }

    const blockBtn = document.getElementById('block-user-btn');
    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {
        const blockedId = document.getElementById('chat-recipient-id').value.trim();
        try {
          await apiFetch('/api/v1/students/block', {
            method: 'POST',
            body: { blockedId, reason: 'Blocked from messages screen' },
          });
          setStatus('messages-status', 'Student blocked. Symmetric block enforced across discovery, sessions, and DMs.', false);
        } catch (err) {
          setStatus('messages-status', err.message, true);
        }
      });
    }

    await loadMessages();
  }

  // ─── 6. Privacy & Data Rights Page (/settings/privacy) ─────────
  function initPrivacyPage() {
    const exportBtn = document.getElementById('export-data-btn');
    const deleteBtn = document.getElementById('delete-account-btn');
    const outEl = document.getElementById('privacy-output');

    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const data = await apiFetch('/api/v1/privacy/export');
          if (outEl) {
            outEl.hidden = false;
            outEl.textContent = JSON.stringify(data, null, 2);
          }
          setStatus('privacy-status', 'NDPA 2023 portable JSON data export generated.', false);
        } catch (err) {
          setStatus('privacy-status', err.message, true);
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        try {
          const data = await apiFetch('/api/v1/privacy/delete-account', {
            method: 'POST',
            body: {},
          });
          if (outEl) {
            outEl.hidden = false;
            outEl.textContent = JSON.stringify(data, null, 2);
          }
          clearAuth();
          setStatus('privacy-status', 'Account deletion scheduled (30-day grace period). Active sessions revoked.', false);
        } catch (err) {
          setStatus('privacy-status', err.message, true);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refreshStudentBanner();
    initHomePage();
    initOnboardingPage();
    initDiscoverPage();
    initSessionRoomPage();
    initMessagesPage();
    initPrivacyPage();
  });
})();
`;
}

export function renderAccessibleWebPage(pathname: string): string | null {
  const isSessionRoute = pathname === '/sessions/demo' || /^\/sessions\/[^/]+$/.test(pathname);
  const routeKey = isSessionRoute ? '/sessions/:id' : pathname;

  const pages: Record<string, { title: string; heading: string; content: string }> = {
    '/': {
      title: `${BRAND_NAME} — Study Together & Accountability Platform`,
      heading: `Commit to Study Together on ${BRAND_NAME}`,
      content: `
        <p class="subtitle">Academic commitment platform for university students. Find a study partner in your course, commit to a timed session, and build your streak.</p>
        <div id="auth-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <section aria-labelledby="stats-heading" class="grid">
          <h2 id="stats-heading" class="sr-only">Your Study Progress</h2>
          <div class="card">
            <span class="label">Total XP Earned</span>
            <strong id="dashboard-xp" class="metric">0 XP</strong>
            <span class="hint">Append-only XP ledger</span>
          </div>
          <div class="card">
            <span class="label">Current Study Streak</span>
            <strong id="dashboard-streak" class="metric">0 Days</strong>
            <span class="hint">Africa/Lagos timezone · 1 freeze / 14d</span>
          </div>
          <div class="card">
            <span class="label">Reliability Band</span>
            <strong id="dashboard-reliability" class="metric">New (100%)</strong>
            <span class="hint">Zero penalty for network drops</span>
          </div>
        </section>
        <div class="grid">
          <form id="register-form" class="card form-stack" aria-label="Create Student Account">
            <h2>Create Student Account</h2>
            <div class="field">
              <label for="reg-email">Email Address</label>
              <input id="reg-email" name="email" type="email" required placeholder="student@live.unilag.edu.ng" />
            </div>
            <div class="field">
              <label for="reg-password">Password (min 10 chars)</label>
              <input id="reg-password" name="password" type="password" required value="StrongPassword123!" />
            </div>
            <div class="field">
              <label for="reg-dob">Date of Birth</label>
              <input id="reg-dob" name="dateOfBirth" type="date" required value="2003-04-15" />
            </div>
            <button id="register-submit-btn" type="submit" class="btn-primary">Register &amp; Sign In</button>
          </form>
          <form id="login-form" class="card form-stack" aria-label="Sign In">
            <h2>Sign In to Existing Account</h2>
            <div class="field">
              <label for="login-email">Email Address</label>
              <input id="login-email" name="email" type="email" required placeholder="student@live.unilag.edu.ng" />
            </div>
            <div class="field">
              <label for="login-password">Password</label>
              <input id="login-password" name="password" type="password" required value="StrongPassword123!" />
            </div>
            <button id="login-submit-btn" type="submit" class="btn-secondary">Sign In</button>
          </form>
        </div>
      `,
    },
    '/onboarding': {
      title: `Academic Onboarding — ${BRAND_NAME}`,
      heading: 'Complete Your Academic Profile',
      content: `
        <p class="subtitle">Select your institution, department, level, and current courses. Core studying is never blocked while verification is pending.</p>
        <div id="onboarding-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <form id="onboarding-form" aria-label="Student Academic Onboarding" class="card form-stack">
          <div class="field">
            <label for="institution-select">University / Institution</label>
            <select id="institution-select" name="institutionId">
              <option value="inst-pilot-sample-uni">Sample University (SAMPLE — NOT REAL)</option>
            </select>
          </div>
          <div class="field">
            <label for="display-name">Display Name</label>
            <input id="display-name" name="displayName" type="text" required value="Tunde Bakare" />
          </div>
          <div class="field">
            <label for="course-select">Enrolled Course</label>
            <select id="course-select" name="courseId">
              <option value="course-pilot-csc-301">CSC 301 — Operating Systems</option>
            </select>
          </div>
          <button id="onboarding-submit-btn" type="submit" class="btn-primary">Save Profile &amp; Continue</button>
        </form>
      `,
    },
    '/discover': {
      title: `Discover Study Partners — ${BRAND_NAME}`,
      heading: 'Discover Study Partners in Your Institution',
      content: `
        <p class="subtitle">Matched transparently by shared courses, academic level, availability, and Study Now signal.</p>
        <div id="discover-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <div id="active-session-banner" class="card" hidden></div>
        <div class="actions">
          <button id="toggle-study-now-btn" type="button" class="btn-secondary">Looking to Study Now (30m)</button>
          <button id="refresh-partners-btn" type="button" class="btn-outline">Refresh Matches</button>
        </div>
        <section aria-labelledby="incoming-heading" class="stack">
          <h2 id="incoming-heading">Incoming Study Invitations</h2>
          <div id="incoming-invitations-list" class="stack">
            <p class="empty-state">No pending invitations right now.</p>
          </div>
        </section>
        <section aria-labelledby="matches-heading" class="stack">
          <h2 id="matches-heading">Course Partner Matches</h2>
          <div id="partners-list" class="stack">
            <article class="card partner-row">
              <div>
                <h3>Zainab M. <span class="badge">Very Reliable</span> <span class="badge-now">Looking to Study Now</span></h3>
                <p>Shared course: CSC 301 · Goal: Past Questions</p>
              </div>
              <a href="/sessions/demo" class="btn-primary">Invite to Study</a>
            </article>
          </div>
        </section>
      `,
    },
    '/sessions/:id': {
      title: `Study Together Focus Room — ${BRAND_NAME}`,
      heading: 'Study Together Focus Session',
      content: `
        <p class="subtitle">Synchronized server timer · 15s heartbeat · 5-minute fairness reconnect grace · No camera or screen surveillance.</p>
        <div id="session-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <div id="ping-banner" role="alert" class="card ping-alert" hidden>
          <h2>Accountability Ping Received!</h2>
          <p>Your study partner checked in on your focus progress.</p>
          <button id="respond-ping-btn" type="button" class="btn-primary">I'm here</button>
        </div>
        <section aria-labelledby="timer-heading" class="card timer-box">
          <h2 id="timer-heading">Server-Synchronized Focus Timer (<span id="session-state-badge">SCHEDULED</span>)</h2>
          <div id="session-timer-display" role="timer" aria-label="Remaining focus time" data-remaining-seconds="1500" class="timer-digits">25:00</div>
          <p class="hint">5-minute reconnect grace active — power cuts or mobile data drops are never penalized.</p>
          <div class="actions">
            <button id="checkin-btn" type="button" class="btn-primary">Check In</button>
            <button id="send-ping-btn" type="button" class="btn-secondary">Send Ping</button>
            <button id="pause-btn" type="button" class="btn-outline">Pause Timer</button>
            <button id="resume-btn" type="button" class="btn-outline">Resume Timer</button>
            <button id="complete-btn" type="button" class="btn-primary">Complete Session</button>
          </div>
        </section>
        <section aria-labelledby="session-metrics-heading" class="grid">
          <h2 id="session-metrics-heading" class="sr-only">Session Rewards &amp; Streak</h2>
          <div class="card">
            <span class="label">Total XP</span>
            <strong id="session-total-xp" class="metric">0 XP</strong>
          </div>
          <div class="card">
            <span class="label">Current Streak</span>
            <strong id="session-streak" class="metric">0 Days</strong>
          </div>
          <div class="card">
            <span class="label">Reliability</span>
            <strong id="session-reliability" class="metric">New (100%)</strong>
          </div>
        </section>
        <form id="dispute-form" aria-label="Dispute Session Outcome" class="card form-stack">
          <h2>Dispute Session Outcome (24h Window)</h2>
          <div class="field">
            <label for="dispute-reason-input">Reason for Dispute (e.g., power outage or mobile data drop)</label>
            <input id="dispute-reason-input" name="reason" type="text" required value="Power cut during final 5 minutes" />
          </div>
          <button id="submit-dispute-btn" type="submit" class="btn-outline">Submit Dispute</button>
        </form>
      `,
    },
    '/communities': {
      title: `Course Communities — ${BRAND_NAME}`,
      heading: 'Course Communities &amp; Q&amp;A',
      content: `
        <p class="subtitle">Auto-joined from your enrolled courses. Every post requires a course tag.</p>
        <article class="card">
          <h2><span class="badge">CSC 301</span> How does Peterson's solution guarantee mutual exclusion?</h2>
          <p>Accepted Answer: The flag array expresses intent to enter the critical section while turn breaks ties deterministically.</p>
        </article>
      `,
    },
    '/messages': {
      title: `Study Partner Messages — ${BRAND_NAME}`,
      heading: '1:1 Academic Direct Messages',
      content: `
        <p class="subtitle">Available only between confirmed study partners or shared-course adults. File uploads are disabled in MVP.</p>
        <div id="messages-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <section aria-labelledby="chat-heading" class="card form-stack">
          <h2 id="chat-heading">Direct Message Conversation</h2>
          <div id="messages-list" class="stack">
            <p><strong>Zainab M.:</strong> Ready for our CSC 301 past-question review?</p>
          </div>
          <form id="send-message-form" class="form-stack">
            <div class="field">
              <label for="chat-recipient-id">Recipient Student ID</label>
              <input id="chat-recipient-id" name="recipientId" type="text" required placeholder="Partner User ID" />
            </div>
            <div class="field">
              <label for="chat-message-input">Your Message</label>
              <input id="chat-message-input" name="body" type="text" required placeholder="Write a message..." />
            </div>
            <div class="actions">
              <button id="send-message-btn" type="submit" class="btn-primary">Send Message</button>
              <button id="report-user-btn" type="button" class="btn-outline">One-Tap Report</button>
              <button id="block-user-btn" type="button" class="btn-outline">Block Student</button>
            </div>
          </form>
        </section>
      `,
    },
    '/settings/privacy': {
      title: `Privacy & Data Rights (NDPA 2023) — ${BRAND_NAME}`,
      heading: 'Privacy, Security &amp; NDPA 2023 Data Rights',
      content: `
        <p class="subtitle">Manage profile discoverability, active device sessions, JSON data portability export, and 30-day account deletion.</p>
        <div id="privacy-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <section aria-labelledby="rights-heading" class="card stack">
          <h2 id="rights-heading">Self-Service Controls</h2>
          <div class="actions">
            <button id="export-data-btn" type="button" class="btn-primary">Export My Data (JSON)</button>
            <button id="delete-account-btn" type="button" class="btn-outline">Request Account Deletion (30d Grace)</button>
          </div>
          <pre id="privacy-output" class="code-box" hidden></pre>
        </section>
      `,
    },
  };

  const page = pages[routeKey];
  if (!page) return null;

  return `<!DOCTYPE html>
<html lang="en-NG">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${page.title}</title>
  <style>
    :root {
      --navy: #0B1B3A;
      --blue: #1D4ED8;
      --bg: #F7F6F2;
      --surface: #FFFFFF;
      --text: #0B1B3A;
      --muted: #334155;
      --green: #065F46;
      --green-bg: #D1FAE5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      overflow-x: hidden;
    }
    .skip-link {
      position: absolute;
      left: -9999px;
      top: 8px;
      background: var(--navy);
      color: #FFFFFF;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 700;
      text-decoration: none;
    }
    .skip-link:focus { left: 8px; z-index: 1000; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    nav {
      background: var(--navy);
      color: #FFFFFF;
      padding: 12px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }
    nav a {
      color: #FFFFFF;
      text-decoration: none;
      font-weight: 600;
      min-height: 44px;
      min-width: 44px;
      display: inline-flex;
      align-items: center;
      padding: 0 8px;
    }
    nav a:hover, nav a:focus { text-decoration: underline; }
    .nav-user {
      font-size: 0.85rem;
      color: #E2E8F0;
      padding: 4px 8px;
    }
    main {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px 16px 48px;
    }
    h1 { font-size: 1.5rem; margin-top: 0; }
    h2 { font-size: 1.2rem; margin-top: 0; }
    h3 { font-size: 1.05rem; margin-top: 0; }
    .subtitle { color: var(--muted); margin-bottom: 16px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .stack { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    .card {
      background: var(--surface);
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      padding: 16px;
    }
    .ping-alert {
      border: 2px solid var(--blue);
      background: #EFF6FF;
      margin-bottom: 16px;
    }
    .status-banner {
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .status-ok {
      background: var(--green-bg);
      color: var(--green);
      border: 1px solid var(--green);
    }
    .status-error {
      background: #FEE2E2;
      color: #7F1D1D;
      border: 1px solid #7F1D1D;
    }
    .label { display: block; font-size: 0.85rem; color: var(--muted); font-weight: 600; }
    .metric { display: block; font-size: 1.6rem; margin: 4px 0; color: var(--navy); }
    .hint { display: block; font-size: 0.82rem; color: var(--muted); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; }
    .btn-primary, .btn-secondary, .btn-outline {
      min-height: 44px;
      min-width: 44px;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .btn-primary { background: var(--blue); color: #FFFFFF; border: 2px solid var(--blue); }
    .btn-secondary { background: var(--navy); color: #FFFFFF; border: 2px solid var(--navy); }
    .btn-outline { background: #FFFFFF; color: var(--navy); border: 2px solid var(--navy); }
    .form-stack { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    label { font-weight: 700; font-size: 0.95rem; }
    input, select {
      min-height: 44px;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #475569;
      border-radius: 8px;
      font-size: 1rem;
      color: var(--text);
      background: #FFFFFF;
    }
    .badge {
      background: var(--green-bg);
      color: var(--green);
      font-size: 0.8rem;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .badge-now {
      background: #DBEAFE;
      color: #1E3A8A;
      font-size: 0.8rem;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .timer-digits {
      font-size: 3rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      margin: 10px 0;
    }
    .code-box {
      background: #F1F5F9;
      color: var(--navy);
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.8rem;
    }
  </style>
  <script src="/app.js" defer></script>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <nav aria-label="Primary Navigation">
    <a href="/">${BRAND_NAME}</a>
    <div>
      <a href="/onboarding">Onboarding</a>
      <a href="/discover">Discover</a>
      <a href="/sessions/demo">Study Room</a>
      <a href="/communities">Communities</a>
      <a href="/messages">Messages</a>
      <a href="/settings/privacy">Privacy</a>
    </div>
    <span id="nav-user-status" class="nav-user">Not signed in</span>
  </nav>
  <main id="main-content">
    <h1>${page.heading}</h1>
    ${page.content}
  </main>
</body>
</html>`;
}
