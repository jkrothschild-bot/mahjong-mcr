const VISITOR_KEY = 'mcr-mahjong:analytics-visitor:v1'
const SESSION_KEY = 'mcr-mahjong:analytics-session:v1'

function randomId(prefix: string): string {
  try { return crypto.randomUUID() } catch { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

function persistentId(storage: Storage, key: string, prefix: string): string {
  try {
    const current = storage.getItem(key)
    if (current) return current
    const created = randomId(prefix)
    storage.setItem(key, created)
    return created
  } catch {
    return randomId(prefix)
  }
}

export function getVisitorId(): string { return persistentId(window.localStorage, VISITOR_KEY, 'visitor') }
export function getAnalyticsSessionId(): string { return persistentId(window.sessionStorage, SESSION_KEY, 'session') }
