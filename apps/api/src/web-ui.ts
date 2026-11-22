import { BRAND_NAME } from '../../../packages/shared/src/index.ts';

export function renderClientAppJs(): string {
  const code = `(function () {
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

    async function applySessionPayload(data) {
      const auth = getAuth();
      if (!auth || !data) return;
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
    }

    async function pollSessionState() {
      const auth = getAuth();
      if (!auth || !auth.accessToken || sessionId === 'demo') return;
      try {
        if (wasOfflineOrFailed) {
          await tryAutoReconnect();
        }
        const data = await apiFetch('/api/v1/sessions/' + sessionId + '/state');
        await applySessionPayload(data);
      } catch (err) {
        wasOfflineOrFailed = true;
      }
    }

    function connectSessionSse() {
      const auth = getAuth();
      if (!auth || !auth.accessToken || sessionId === 'demo' || typeof EventSource === 'undefined') {
        return;
      }
      try {
        const es = new EventSource(
          '/api/v1/sessions/' + sessionId + '/stream?token=' + encodeURIComponent(auth.accessToken)
        );
        es.addEventListener('state', (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            applySessionPayload(payload);
          } catch {}
        });
        es.onerror = () => {
          es.close();
        };
      } catch {}
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

    connectSessionSse();
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

  // ─── 7. Course Communities Page (/communities) ─────────────────
  async function initCommunitiesPage() {
    const form = document.getElementById('create-post-form');
    if (!form) return;

    const postsList = document.getElementById('community-posts-list');
    const courseSelect = document.getElementById('community-course-select');

    async function loadPosts() {
      const auth = getAuth();
      if (!auth || !auth.accessToken || !postsList) return;
      try {
        const courseId = courseSelect ? courseSelect.value : 'course-pilot-csc-301';
        const data = await apiFetch('/api/v1/communities/posts?courseId=' + encodeURIComponent(courseId));
        const items = (data && data.items) || [];
        if (items.length === 0) {
          postsList.innerHTML = '<p class="empty-state">No questions posted in this course yet. Ask the first question above!</p>';
          return;
        }
        postsList.innerHTML = '';
        for (const post of items) {
          const card = document.createElement('article');
          card.className = 'card stack';
          const h3 = document.createElement('h3');
          h3.textContent = post.title + ' ';
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = post.courseId;
          h3.appendChild(badge);
          const bodyP = document.createElement('p');
          bodyP.textContent = post.body;
          card.appendChild(h3);
          card.appendChild(bodyP);

          const ansList = document.createElement('div');
          ansList.className = 'stack';
          for (const ans of post.answers || []) {
            const ansRow = document.createElement('div');
            ansRow.className = 'card';
            const ansText = document.createElement('p');
            ansText.textContent = (ans.isAccepted ? '[ACCEPTED ANSWER] ' : 'Answer: ') + ans.body;
            ansRow.appendChild(ansText);
            if (!ans.isAccepted && post.authorId === auth.userId) {
              const acceptBtn = document.createElement('button');
              acceptBtn.type = 'button';
              acceptBtn.className = 'btn-outline accept-answer-btn';
              acceptBtn.setAttribute('data-post-id', post.id);
              acceptBtn.setAttribute('data-answer-id', ans.id);
              acceptBtn.textContent = 'Mark Accepted Answer';
              acceptBtn.addEventListener('click', async () => {
                try {
                  await apiFetch('/api/v1/communities/posts/' + post.id + '/accept-answer', {
                    method: 'POST',
                    body: { answerId: ans.id },
                  });
                  setStatus('communities-status', 'Accepted answer marked!', false);
                  await loadPosts();
                } catch (err) {
                  setStatus('communities-status', err.message, true);
                }
              });
              ansRow.appendChild(acceptBtn);
            }
            ansList.appendChild(ansRow);
          }
          card.appendChild(ansList);

          const ansForm = document.createElement('form');
          ansForm.className = 'actions';
          const ansInput = document.createElement('input');
          ansInput.type = 'text';
          ansInput.required = true;
          ansInput.placeholder = 'Write an answer (min 5 chars)...';
          ansInput.setAttribute('aria-label', 'Write an answer for ' + post.title);
          ansInput.className = 'answer-input';
          const ansBtn = document.createElement('button');
          ansBtn.type = 'submit';
          ansBtn.className = 'btn-secondary submit-answer-btn';
          ansBtn.textContent = 'Post Answer';
          ansForm.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            try {
              await apiFetch('/api/v1/communities/posts/' + post.id + '/answers', {
                method: 'POST',
                body: { body: ansInput.value.trim() },
              });
              ansInput.value = '';
              setStatus('communities-status', 'Answer posted!', false);
              await loadPosts();
            } catch (err) {
              setStatus('communities-status', err.message, true);
            }
          });
          ansForm.appendChild(ansInput);
          ansForm.appendChild(ansBtn);
          card.appendChild(ansForm);
          postsList.appendChild(card);
        }
      } catch {}
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const courseId = courseSelect ? courseSelect.value : 'course-pilot-csc-301';
      const title = document.getElementById('post-title-input').value.trim();
      const body = document.getElementById('post-body-input').value.trim();
      try {
        await apiFetch('/api/v1/communities/posts', {
          method: 'POST',
          body: { courseId, title, body, tags: ['Q&A'] },
        });
        document.getElementById('post-title-input').value = '';
        document.getElementById('post-body-input').value = '';
        setStatus('communities-status', 'Course Q&A question published!', false);
        await loadPosts();
      } catch (err) {
        setStatus('communities-status', err.message, true);
      }
    });

    await loadPosts();
  }

  // ─── 8. Moderator & Two-Approver Admin Console (/admin) ────────
  async function initAdminPage() {
    const queueList = document.getElementById('moderation-queue-list');
    if (!queueList) return;

    const appealsList = document.getElementById('appeals-queue-list');
    const adminActionsList = document.getElementById('admin-actions-list');

    async function loadAdminQueues() {
      const auth = getAuth();
      if (!auth || !auth.accessToken) return;
      try {
        const modData = await apiFetch('/api/v1/moderation/queue');
        const reports = (modData && modData.reports) || [];
        const appeals = (modData && modData.appeals) || [];

        if (reports.length === 0) {
          queueList.innerHTML = '<p class="empty-state">No open moderation reports in queue.</p>';
        } else {
          queueList.innerHTML = '';
          for (const r of reports) {
            const card = document.createElement('div');
            card.className = 'card stack';
            const p = document.createElement('p');
            p.textContent = 'Report [' + r.category + '] against ' + r.targetUserId + ' — ' + r.description;
            const warnBtn = document.createElement('button');
            warnBtn.type = 'button';
            warnBtn.className = 'btn-primary issue-sanction-btn';
            warnBtn.setAttribute('data-report-id', r.id);
            warnBtn.textContent = 'Issue 24h Restriction';
            warnBtn.addEventListener('click', async () => {
              try {
                const res = await apiFetch('/api/v1/moderation/reports/' + r.id + '/sanctions', {
                  method: 'POST',
                  body: { action: 'RESTRICT_24H', reason: 'Verified spam/harassment violation' },
                });
                const sanctionId = res.sanction ? res.sanction.id : '';
                setStatus('admin-status', 'Sanction RESTRICT_24H issued (ID: ' + sanctionId + ')', false);
                const sanctionInput = document.getElementById('appeal-sanction-id');
                if (sanctionInput && sanctionId) sanctionInput.value = sanctionId;
                await loadAdminQueues();
              } catch (err) {
                setStatus('admin-status', err.message, true);
              }
            });
            card.appendChild(p);
            card.appendChild(warnBtn);
            queueList.appendChild(card);
          }
        }

        if (appealsList) {
          if (appeals.length === 0) {
            appealsList.innerHTML = '<p class="empty-state">No pending sanction appeals.</p>';
          } else {
            appealsList.innerHTML = '';
            for (const a of appeals) {
              const card = document.createElement('div');
              card.className = 'card stack';
              const p = document.createElement('p');
              p.textContent = 'Appeal (' + a.status + ') for Sanction ' + a.sanctionId + ': ' + a.reason;
              card.appendChild(p);
              if (a.status === 'PENDING') {
                const overturnBtn = document.createElement('button');
                overturnBtn.type = 'button';
                overturnBtn.className = 'btn-secondary overturn-appeal-btn';
                overturnBtn.setAttribute('data-appeal-id', a.id);
                overturnBtn.textContent = 'Overturn Sanction (Independent Review)';
                overturnBtn.addEventListener('click', async () => {
                  try {
                    const resolved = await apiFetch('/api/v1/moderation/appeals/' + a.id + '/resolve', {
                      method: 'POST',
                      body: { decision: 'OVERTURNED', note: 'Overturned by second independent moderator' },
                    });
                    setStatus('admin-status', 'Appeal ' + resolved.status + ' by ' + resolved.reviewedByModeratorId, false);
                    await loadAdminQueues();
                  } catch (err) {
                    setStatus('admin-status', err.message, true);
                  }
                });
                card.appendChild(overturnBtn);
              }
              appealsList.appendChild(card);
            }
          }
        }

        const actData = await apiFetch('/api/v1/admin/actions');
        const actions = (actData && actData.items) || [];
        if (adminActionsList) {
          if (actions.length === 0) {
            adminActionsList.innerHTML = '<p class="empty-state">No sensitive actions proposed.</p>';
          } else {
            adminActionsList.innerHTML = '';
            for (const act of actions) {
              const card = document.createElement('div');
              card.className = 'card stack';
              const p = document.createElement('p');
              p.textContent = act.actionType + ' on ' + act.targetId + ' — Status: ' + act.status + ' (Proposed by ' + act.proposedByStaffId + ')';
              card.appendChild(p);
              if (act.status === 'PENDING_SECOND_APPROVAL') {
                const appBtn = document.createElement('button');
                appBtn.type = 'button';
                appBtn.className = 'btn-primary approve-admin-action-btn';
                appBtn.setAttribute('data-action-id', act.id);
                appBtn.textContent = 'Second-Approver Execute';
                appBtn.addEventListener('click', async () => {
                  try {
                    const executed = await apiFetch('/api/v1/admin/actions/' + act.id + '/approve', {
                      method: 'POST',
                      body: {},
                    });
                    setStatus('admin-status', 'Two-Approver action ' + executed.status + ' by ' + executed.approvedByStaffId, false);
                    await loadAdminQueues();
                  } catch (err) {
                    setStatus('admin-status', err.message, true);
                  }
                });
                card.appendChild(appBtn);
              }
              adminActionsList.appendChild(card);
            }
          }
        }
      } catch {}
    }

    async function switchStaffIdentity(staffId, role) {
      try {
        const data = await apiFetch('/api/v1/auth/dev-staff-token', {
          method: 'POST',
          body: { staffId, role },
        });
        setAuth({
          accessToken: data.accessToken,
          userId: data.user.id,
          email: data.user.email,
        });
        setStatus('admin-status', 'Signed in with MFA as ' + staffId + ' (' + role + ')', false);
        await loadAdminQueues();
      } catch (err) {
        setStatus('admin-status', err.message, true);
      }
    }

    const mod1Btn = document.getElementById('switch-mod1-btn');
    if (mod1Btn) mod1Btn.addEventListener('click', () => switchStaffIdentity('staff-mod-1', 'PLATFORM_MODERATOR'));
    const mod2Btn = document.getElementById('switch-mod2-btn');
    if (mod2Btn) mod2Btn.addEventListener('click', () => switchStaffIdentity('staff-mod-2', 'PLATFORM_MODERATOR'));

    const appealForm = document.getElementById('file-appeal-form');
    if (appealForm) {
      appealForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sanctionId = document.getElementById('appeal-sanction-id').value.trim();
        const reason = document.getElementById('appeal-reason-input').value.trim() || 'Context was academic discussion of OS deadlock recovery';
        try {
          const ap = await apiFetch('/api/v1/moderation/appeals', {
            method: 'POST',
            body: { sanctionId, reason },
          });
          setStatus('admin-status', 'Appeal submitted (ID: ' + ap.id + ') — awaiting independent moderator.', false);
        } catch (err) {
          setStatus('admin-status', err.message, true);
        }
      });
    }

    const proposeForm = document.getElementById('propose-admin-action-form');
    if (proposeForm) {
      proposeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetId = document.getElementById('admin-target-input').value.trim() || 'COURSE_PROPOSALS_ENABLED';
        const reason = document.getElementById('admin-reason-input').value.trim() || 'Scheduled end-of-semester catalogue freeze';
        try {
          const req = await apiFetch('/api/v1/admin/actions', {
            method: 'POST',
            body: { actionType: 'DISABLE_SAFETY_KILLSWITCH', targetId, reason },
          });
          setStatus('admin-status', 'Sensitive action proposed (' + req.status + ')', false);
          await loadAdminQueues();
        } catch (err) {
          setStatus('admin-status', err.message, true);
        }
      });
    }

    await loadAdminQueues();
  }

  document.addEventListener('DOMContentLoaded', () => {
    refreshStudentBanner();
    initHomePage();
    initOnboardingPage();
    initDiscoverPage();
    initSessionRoomPage();
    initMessagesPage();
    initPrivacyPage();
    initCommunitiesPage();
    initAdminPage();
  });
})();
`;
  return code.replace(/\/\/[^\n]*/g, '');
}

export function renderClientAppCss(): string {
  return `
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
      margin-right: 12px;
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 4px 8px;
    }
    nav a:focus, nav a:hover { text-decoration: underline; }
    .nav-user { font-size: 0.9rem; color: #E2E8F0; }
    main {
      max-width: 960px;
      margin: 24px auto;
      padding: 0 16px 48px;
    }
    h1 { font-size: 1.8rem; margin: 0 0 12px; color: var(--navy); }
    h2 { font-size: 1.3rem; margin: 0 0 8px; color: var(--navy); }
    h3 { font-size: 1.1rem; margin: 0 0 6px; }
    p.subtitle { color: var(--muted); margin: 0 0 20px; font-size: 1rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stack { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
    .card {
      background: var(--surface);
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(11,27,58,0.06);
    }
    .card-partner {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-left: 4px solid var(--blue);
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
          <form id="register-form" method="POST" action="#" class="card form-stack" aria-label="Create Student Account">
            <h2>Create Student Account</h2>
            <div class="field">
              <label for="reg-email">Email Address</label>
              <input id="reg-email" name="email" type="email" required placeholder="student@live.unilag.edu.ng" />
            </div>
            <div class="field">
              <label for="reg-password">Password (min 10 chars)</label>
              <input id="reg-password" name="password" type="password" required placeholder="Min 10 characters" />
            </div>
            <div class="field">
              <label for="reg-dob">Date of Birth</label>
              <input id="reg-dob" name="dateOfBirth" type="date" required />
            </div>
            <button id="register-submit-btn" type="submit" class="btn-primary">Register &amp; Sign In</button>
          </form>
          <form id="login-form" method="POST" action="#" class="card form-stack" aria-label="Sign In">
            <h2>Sign In to Existing Account</h2>
            <div class="field">
              <label for="login-email">Email Address</label>
              <input id="login-email" name="email" type="email" required placeholder="student@live.unilag.edu.ng" />
            </div>
            <div class="field">
              <label for="login-password">Password</label>
              <input id="login-password" name="password" type="password" required placeholder="Your password" />
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
        <form id="onboarding-form" method="POST" action="#" aria-label="Student Academic Onboarding" class="card form-stack">
          <div class="field">
            <label for="institution-select">University / Institution</label>
            <select id="institution-select" name="institutionId">
              <option value="inst-pilot-sample-uni">Sample University (SAMPLE — NOT REAL)</option>
            </select>
          </div>
          <div class="field">
            <label for="display-name">Display Name</label>
            <input id="display-name" name="displayName" type="text" required placeholder="Display Name" />
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
        <form id="dispute-form" method="POST" action="#" aria-label="Dispute Session Outcome" class="card form-stack">
          <h2>Dispute Session Outcome (24h Window)</h2>
          <div class="field">
            <label for="dispute-reason-input">Reason for Dispute (e.g., power outage or mobile data drop)</label>
            <input id="dispute-reason-input" name="reason" type="text" required placeholder="Reason for dispute" />
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
        <div id="communities-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <form id="create-post-form" method="POST" action="#" aria-label="Ask a Course Question" class="card form-stack">
          <h2>Ask a Course Question</h2>
          <div class="field">
            <label for="community-course-select">Course Tag (Required)</label>
            <select id="community-course-select" name="courseId">
              <option value="course-pilot-csc-301">CSC 301 — Operating Systems</option>
            </select>
          </div>
          <div class="field">
            <label for="post-title-input">Question Title</label>
            <input id="post-title-input" name="title" type="text" required placeholder="How does Peterson's solution guarantee mutual exclusion?" />
          </div>
          <div class="field">
            <label for="post-body-input">Question Details</label>
            <input id="post-body-input" name="body" type="text" required placeholder="Explain the role of the flag array and turn variable..." />
          </div>
          <button id="create-post-btn" type="submit" class="btn-primary">Publish Course Question</button>
        </form>
        <section aria-labelledby="course-posts-heading" class="stack">
          <h2 id="course-posts-heading">Recent Course Q&amp;A</h2>
          <div id="community-posts-list" class="stack">
            <article class="card">
              <h3><span class="badge">CSC 301</span> How does Peterson's solution guarantee mutual exclusion?</h3>
              <p>Accepted Answer: The flag array expresses intent to enter the critical section while turn breaks ties deterministically.</p>
            </article>
          </div>
        </section>
      `,
    },
    '/admin': {
      title: `Moderation & Two-Approver Admin Console — ${BRAND_NAME}`,
      heading: 'Safety Moderation &amp; Two-Approver Admin Console',
      content: `
        <p class="subtitle">MFA-gated staff operations · SLA-ordered report queue · Independent-moderator appeals · Two-Approver sensitive actions.</p>
        <div id="admin-status" role="status" aria-live="polite" class="status-banner" hidden></div>
        <div class="actions">
          <button id="switch-mod1-btn" type="button" class="btn-secondary">Act as Moderator 1 (MFA)</button>
          <button id="switch-mod2-btn" type="button" class="btn-outline">Act as Moderator 2 (MFA)</button>
        </div>
        <section aria-labelledby="mod-queue-heading" class="card stack">
          <h2 id="mod-queue-heading">Moderation SLA Queue</h2>
          <div id="moderation-queue-list" class="stack">
            <p class="empty-state">No open moderation reports in queue.</p>
          </div>
        </section>
        <form id="file-appeal-form" method="POST" action="#" aria-label="Submit Sanction Appeal" class="card form-stack">
          <h2>Student Sanction Appeal</h2>
          <div class="field">
            <label for="appeal-sanction-id">Sanction ID</label>
            <input id="appeal-sanction-id" name="sanctionId" type="text" required placeholder="Sanction UUID" />
          </div>
          <div class="field">
            <label for="appeal-reason-input">Appeal Explanation</label>
            <input id="appeal-reason-input" name="reason" type="text" placeholder="Explanation of appeal" />
          </div>
          <button id="submit-appeal-btn" type="submit" class="btn-outline">Submit Appeal</button>
        </form>
        <section aria-labelledby="appeals-heading" class="card stack">
          <h2 id="appeals-heading">Pending Appeals (Requires Different Moderator)</h2>
          <div id="appeals-queue-list" class="stack">
            <p class="empty-state">No pending sanction appeals.</p>
          </div>
        </section>
        <form id="propose-admin-action-form" method="POST" action="#" aria-label="Propose Sensitive Admin Action" class="card form-stack">
          <h2>Two-Approver Sensitive Action Queue</h2>
          <div class="field">
            <label for="admin-target-input">Target Feature / User ID</label>
            <input id="admin-target-input" name="targetId" type="text" placeholder="Target Feature or User ID" />
          </div>
          <div class="field">
            <label for="admin-reason-input">Operational Reason</label>
            <input id="admin-reason-input" name="reason" type="text" placeholder="Operational reason for action" />
          </div>
          <button id="propose-admin-btn" type="submit" class="btn-primary">Propose Sensitive Action</button>
          <div id="admin-actions-list" class="stack"></div>
        </form>
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
          <form id="send-message-form" method="POST" action="#" class="form-stack">
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
  <link rel="stylesheet" href="/styles.css" />
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
      <a href="/admin">Moderation</a>
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
