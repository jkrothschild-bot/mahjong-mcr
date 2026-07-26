import { defineConfig, devices } from '@playwright/test'

// Used by the ux-reviewer agent (.claude/agents/ux-reviewer.md) for
// screenshot-based UX review against SPEC.md §4-5. Not wired into CI yet —
// M0 is scaffold only; real UI smoke tests come with the M3 board build.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  webServer: {
    command: 'npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    // vite preview serves under the configured `base` (/mahjong-mcr/), same as Pages.
    baseURL: 'http://localhost:4173/mahjong-mcr/',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'ipad-landscape',
      use: { ...devices['iPad Pro 11 landscape'] },
    },
    {
      name: 'ipad-portrait',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
})
