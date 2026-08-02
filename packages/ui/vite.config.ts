/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/mahjong-mcr/',
  server: {
    host: true,
  },
  plugins: [react(), tailwindcss()],
  // tileImages.ts assumes every tile-face asset resolves to a real, hashed
  // URL (see its own doc comment) — without this, Vite inlines small assets
  // as base64 data URIs below its default 4KB threshold, which one tile
  // (White Dragon's pure-vector SVG, no embedded PNG) falls under while
  // every other tile face doesn't, producing inconsistent behavior between
  // tiles for no reason a caller should have to care about.
  build: { assetsInlineLimit: 0 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ holds Playwright specs (run via `test:e2e`), not Vitest tests.
    exclude: ['**/node_modules/**', 'e2e/**'],
    // Phase 7's board rebuild (four always-rendered discard zones, three
    // seat lines, melds/flowers inline on every hand) made a full-suite
    // parallel run noticeably heavier per-render — the previous 5000ms
    // default started intermittently timing out whichever test happened to
    // land under the worst worker contention that run (a different test
    // each time, never the same one twice — the tell that this is resource
    // contention, not a per-test regression). Bumped once, globally,
    // instead of chasing individual flaky timeouts test-by-test.
    testTimeout: 15000,
  },
})
