import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
/** The built app is served under the GitHub Pages project path, like production. */
const BASE = `http://localhost:${PORT}/Tour-argentina/`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'android-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `node tests/e2e/serve.mjs ${PORT} /Tour-argentina/`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
