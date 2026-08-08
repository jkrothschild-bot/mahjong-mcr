import type { AnalyticsEventName, AnalyticsProperties } from './analyticsEvents.js'

export interface AnalyticsService {
  track(event: AnalyticsEventName, properties?: AnalyticsProperties): void | Promise<void>
  identify?(userId: string | null): void | Promise<void>
}

export class NoopAnalyticsService implements AnalyticsService {
  track(): void {}
  identify(): void {}
}

export function trackSafely(service: AnalyticsService, event: AnalyticsEventName, properties?: AnalyticsProperties): void {
  try { void Promise.resolve(service.track(event, properties)).catch(() => {}) } catch { /* Analytics never blocks product use. */ }
}
