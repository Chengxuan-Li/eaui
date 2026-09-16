import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// vite.config.ts exports a function so the Pages base path applies to builds
// only (decision 0017); the tests run against the serve configuration.
export default mergeConfig(
  viteConfig({ command: 'serve', mode: 'test' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
)
