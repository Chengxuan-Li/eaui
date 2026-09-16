import { defineConfig, devices } from '@playwright/test'

// Defaults to the locally installed Microsoft Edge so no browser download is needed.
// To use Playwright's bundled browser instead, run `npx playwright install chromium`
// and set PLAYWRIGHT_CHANNEL=chromium.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'
const baseURL = 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: 'e2e',
  // The production bundle is checked by playwright.preview.config.ts.
  testIgnore: /production\.spec\.ts/,
  fullyParallel: true,
  // Each worker runs Edge with MapLibre, ECharts, and axe. The default worker
  // count starved the dev server and timed out tests on a 32-core machine.
  workers: process.env.CI ? undefined : 4,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-1280',
      use: {
        ...devices['Desktop Chrome'],
        channel,
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
