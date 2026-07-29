import '@testing-library/jest-dom/vitest'

// jsdom has no layout engine and no ResizeObserver — GameStage.tsx (M8
// Step 1's fixed-resolution stage) uses one to measure available space.
// This stub never fires callbacks (jsdom's getBoundingClientRect always
// returns zeros anyway, so there's nothing meaningful to observe); it just
// exists so `new ResizeObserver(...)` doesn't throw during render. Real
// browsers (including iPad Safari) implement ResizeObserver natively.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

// jsdom doesn't implement window.matchMedia either — motion/react's
// useReducedMotion() (M8 Step 3) calls it to watch the OS-level
// prefers-reduced-motion preference. Stub always reports "no preference"
// (matches: false) and a no-op listener API; real browsers implement this
// natively.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia
