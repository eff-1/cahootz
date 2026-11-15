import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/api/test',
  testMatch: 'playwright-e2e.spec.ts',
  timeout: 90_000,
  use: {
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    viewport: { width: 375, height: 667 },
  },
  reporter: [['list']],
});
