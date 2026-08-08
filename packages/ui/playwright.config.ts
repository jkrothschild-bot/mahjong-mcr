import { defineConfig, devices } from '@playwright/test'

// Used by the ux-reviewer agent (.claude/agents/ux-reviewer.md) for
// screenshot-based UX review against SPEC.md §4-5. Not wired into CI yet —
// M0 is scaffold only; real UI smoke tests come with the M3 board build.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  webServer: {
    // Builds before previewing so `test:e2e` is self-sufficient — it no
    // longer depends on a separate `npm run build` having already been run
    // first, in CI or locally (OPEN-WORK.md §D6: folding e2e into the
    // standard `npm test` gate needs this to "just work" without every
    // caller having to know to build first).
    command: 'npm run build && npm run preview -- --port 4173',
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
