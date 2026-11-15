import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type net from 'node:net';
import { createCahootzHttpServer, type CahootzApplicationContext } from '../src/server.ts';

let appContext: CahootzApplicationContext;
let baseUrl = '';
let dbPath = '';

test.beforeAll(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cahootz-pw-'));
  dbPath = path.join(dir, 'cahootz-playwright.sqlite');
  appContext = createCahootzHttpServer({ dbPath });
  await new Promise<void>((resolve) => {
    appContext.server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = appContext.server.address() as net.AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.afterAll(async () => {
  if (appContext) {
    await appContext.close();
  }
});

test.describe('Phase 2 Requirement C — Real Headless Chromium E2E & @axe-core/playwright Suite', () => {
  test('1. Runs @axe-core/playwright accessibility audit on all 7 web routes at 375x667 mobile width', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    const routes = [
      '/',
      '/onboarding',
      '/discover',
      '/sessions/demo',
      '/communities',
      '/messages',
      '/settings/privacy',
    ];

    const axeSummary: Array<{
      route: string;
      violationsCount: number;
      passesCount: number;
      incompleteCount: number;
      horizontalOverflowPx: number;
    }> = [];

    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const overflowPx = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );

      axeSummary.push({
        route,
        violationsCount: results.violations.length,
        passesCount: results.passes.length,
        incompleteCount: results.incomplete.length,
        horizontalOverflowPx: overflowPx,
      });

      expect(
        results.violations,
        `Axe violations on ${route}: ${JSON.stringify(results.violations)}`
      ).toEqual([]);
      expect(overflowPx, `Horizontal overflow on ${route} at 375px width`).toBeLessThanOrEqual(0);
    }

    console.log('REAL_AXE_PLAYWRIGHT_RESULTS=' + JSON.stringify(axeSummary));
    await context.close();
  });

  test('2. Full Two-Browser-Context Commitment Loop (375x667 + Slow 3G Throttling + 3-Min Offline Drop + <2s Timer Sync + Ping + XP/Streak)', async ({
    browser,
  }) => {
    const contextA = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const contextB = await browser.newContext({ viewport: { width: 375, height: 667 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Apply Slow 3G network throttling via Chromium DevTools Protocol (CDP)
    const cdpA = await contextA.newCDPSession(pageA);
    const cdpB = await contextB.newCDPSession(pageB);
    const slow3G = {
      offline: false,
      latency: 150, // 150ms RTT
      downloadThroughput: (400 * 1024) / 8, // 400 kbps
      uploadThroughput: (400 * 1024) / 8,
      connectionType: 'cellular3g' as const,
    };
    await cdpA.send('Network.enable');
    await cdpA.send('Network.emulateNetworkConditions', slow3G);
    await cdpB.send('Network.enable');
    await cdpB.send('Network.emulateNetworkConditions', slow3G);

    // 1. Register both students on '/'
    await pageA.goto(`${baseUrl}/`);
    await pageA.fill('#reg-email', 'tunde.pw@live.unilag.edu.ng');
    await pageA.fill('#reg-password', 'StrongPassword123!');
    await pageA.fill('#reg-dob', '2003-04-12');
    await pageA.click('#register-submit-btn');
    await expect(pageA.locator('#auth-status')).toContainText('Account created and signed in as tunde.pw@live.unilag.edu.ng');

    await pageB.goto(`${baseUrl}/`);
    await pageB.fill('#reg-email', 'zainab.pw@live.unilag.edu.ng');
    await pageB.fill('#reg-password', 'StrongPassword123!');
    await pageB.fill('#reg-dob', '2003-08-22');
    await pageB.click('#register-submit-btn');
    await expect(pageB.locator('#auth-status')).toContainText('Account created and signed in as zainab.pw@live.unilag.edu.ng');

    // 2. Complete Academic Onboarding for both students on '/onboarding'
    await pageA.goto(`${baseUrl}/onboarding`);
    await pageA.fill('#display-name', 'Tunde Bakare');
    await pageA.click('#onboarding-submit-btn');
    await expect(pageA.locator('#onboarding-status')).toContainText('Profile saved!');

    await pageB.goto(`${baseUrl}/onboarding`);
    await pageB.fill('#display-name', 'Zainab Musa');
    await pageB.click('#onboarding-submit-btn');
    await expect(pageB.locator('#onboarding-status')).toContainText('Profile saved!');

    // 3. Discover & Invite on '/discover'
    await pageB.goto(`${baseUrl}/discover`);
    await pageB.click('#toggle-study-now-btn');
    await expect(pageB.locator('#discover-status')).toContainText('Looking to Study Now signal activated');

    await pageA.goto(`${baseUrl}/discover`);
    await pageA.click('#refresh-partners-btn');
    const inviteBtn = pageA.locator('.invite-partner-btn').first();
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();
    await expect(pageA.locator('#discover-status')).toContainText('Invitation sent');

    // 4. Student B sees incoming invitation and clicks "Accept & Enter Room"
    await pageB.click('#refresh-partners-btn');
    const acceptBtn = pageB.locator('.accept-invitation-btn').first();
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 });
    await acceptBtn.click();

    // Student B is navigated to /sessions/:sessionId
    await pageB.waitForURL(/\/sessions\/[^/]+$/);
    const sessionUrl = pageB.url();
    const sessionId = sessionUrl.split('/').pop()!;

    // Student A navigates to the same active session room via the banner link
    await pageA.click('#refresh-partners-btn');
    const enterLink = pageA.locator('#enter-active-session-link');
    await expect(enterLink).toBeVisible({ timeout: 10_000 });
    await enterLink.click();
    await pageA.waitForURL(sessionUrl);

    // 5. Both students Check In -> Session becomes ACTIVE
    await pageA.click('#checkin-btn');
    await pageB.click('#checkin-btn');
    await expect(pageA.locator('#session-state-badge')).toHaveText('ACTIVE', { timeout: 10_000 });
    await expect(pageB.locator('#session-state-badge')).toHaveText('ACTIVE', { timeout: 10_000 });

    // 6. Measure real timer difference between Client A and Client B in the live DOM
    const [remA, remB] = await Promise.all([
      pageA.locator('#session-timer-display').getAttribute('data-remaining-seconds'),
      pageB.locator('#session-timer-display').getAttribute('data-remaining-seconds'),
    ]);
    const timerDiffSeconds = Math.abs(Number(remA) - Number(remB));
    console.log(
      `REAL_BROWSER_TIMER_MEASUREMENT=${JSON.stringify({
        clientARemainingSeconds: Number(remA),
        clientBRemainingSeconds: Number(remB),
        timerDiffSeconds,
      })}`
    );
    expect(timerDiffSeconds).toBeLessThanOrEqual(2);

    // 7. Student A sends an Accountability Ping -> Student B sees ping banner and clicks "I'm here"
    await pageA.click('#send-ping-btn');
    await expect(pageB.locator('#ping-banner')).toBeVisible({ timeout: 10_000 });
    await pageB.click('#respond-ping-btn');
    await expect(pageB.locator('#session-status')).toContainText("Confirmed! You responded 'I'm here'");

    // 8. Simulate Student B going offline for 3 minutes (180s) -> Reconnects with zero penalty
    // Advance 5 minutes of active study before disconnect
    await pageA.evaluate(async (sid) => {
      const auth = JSON.parse(localStorage.getItem('cahootz_auth') || '{}');
      await fetch(`/api/v1/sessions/${sid}/simulate-clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ advanceSeconds: 300 }),
      });
      await fetch(`/api/v1/sessions/${sid}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ visibility: 'VISIBLE' }),
      });
    }, sessionId);
    await pageB.evaluate(async (sid) => {
      const auth = JSON.parse(localStorage.getItem('cahootz_auth') || '{}');
      await fetch(`/api/v1/sessions/${sid}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ visibility: 'VISIBLE' }),
      });
      await fetch(`/api/v1/sessions/${sid}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({}),
      });
    }, sessionId);

    // Set Context B genuinely offline in Chromium
    await contextB.setOffline(true);

    // Advance virtual clock by 3 minutes (180s) while B is offline
    await pageA.evaluate(async (sid) => {
      const auth = JSON.parse(localStorage.getItem('cahootz_auth') || '{}');
      await fetch(`/api/v1/sessions/${sid}/simulate-clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ advanceSeconds: 180 }),
      });
    }, sessionId);

    // Restore Context B network -> Client B automatically reconnects using resumeToken
    await contextB.setOffline(false);
    await cdpB.send('Network.emulateNetworkConditions', slow3G);
    await expect(pageB.locator('#session-status')).toContainText(
      'Reconnected within 5-minute grace window — zero penalty applied!',
      { timeout: 10_000 }
    );

    // 9. Advance remaining 17 minutes (1020s) of active study and Complete Session
    await pageA.evaluate(async (sid) => {
      const auth = JSON.parse(localStorage.getItem('cahootz_auth') || '{}');
      await fetch(`/api/v1/sessions/${sid}/simulate-clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ advanceSeconds: 1020 }),
      });
      await fetch(`/api/v1/sessions/${sid}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ visibility: 'VISIBLE' }),
      });
    }, sessionId);
    await pageB.evaluate(async (sid) => {
      const auth = JSON.parse(localStorage.getItem('cahootz_auth') || '{}');
      await fetch(`/api/v1/sessions/${sid}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ visibility: 'VISIBLE' }),
      });
    }, sessionId);

    await pageA.click('#complete-btn');
    await expect(pageA.locator('#session-state-badge')).toHaveText('COMPLETED', { timeout: 10_000 });
    await expect(pageA.locator('#session-total-xp')).toHaveText('25 XP', { timeout: 10_000 });
    await expect(pageA.locator('#session-streak')).toHaveText('1 Days', { timeout: 10_000 });
    await expect(pageB.locator('#session-total-xp')).toHaveText('25 XP', { timeout: 10_000 });
    await expect(pageB.locator('#session-reliability')).toContainText('100%', { timeout: 10_000 });

    // 10. Test Privacy Export on '/settings/privacy' in the live browser
    await pageA.goto(`${baseUrl}/settings/privacy`);
    await pageA.click('#export-data-btn');
    await expect(pageA.locator('#privacy-status')).toContainText('NDPA 2023 portable JSON data export generated');
    await expect(pageA.locator('#privacy-output')).toContainText('tunde.pw@live.unilag.edu.ng');

    await contextA.close();
    await contextB.close();
  });
});
