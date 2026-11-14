import { defineConfig, devices } from '@playwright/test';

const API_PORT = 8799;
const WEB_PORT = 5199;
// Use an installed browser instead of the bundled one with e.g. PW_CHANNEL=chrome or PW_CHANNEL=msedge
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    channel,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: 'npm run start -w backend',
      port: API_PORT,
      env: { BBS_PORT: String(API_PORT), BBS_DB: ':memory:' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -w frontend',
      port: WEB_PORT,
      env: { WEB_PORT: String(WEB_PORT), BBS_API: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
