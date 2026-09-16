import { defineConfig, devices } from '@playwright/test'

// Checks the production bundle, which the dev-server specs cannot: the base
// path, and files that only a build emits, such as MapLibre's worker
// (decision 0017). Kept separate so the everyday `npm run test:e2e` stays fast
// and needs no build; `npm run test:e2e:preview` builds and runs this one.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const baseURL = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: 'e2e',
  testMatch: /production\.spec\.ts/,
  reporter: 'list',
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'production',
      use: {
        ...devices['Desktop Chrome'],
        channel,
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    // Serves whatever is in dist; the script builds before calling Playwright.
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: `${baseURL}/eaui/`,
    reuseExistingServer: !process.env.CI,
  },
})
