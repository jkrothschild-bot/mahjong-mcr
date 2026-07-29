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
