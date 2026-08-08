import { DEFAULT_GAME_CONFIG, isGameConfig, type GameConfig } from './gameConfig.js'

const CURRENT_CONFIG_KEY = 'mcr-mahjong:current-game-config:v1'
const PREFERRED_ASSISTANCE_KEY = 'mcr-mahjong:preferred-assistance:v1'

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Browser storage can be unavailable or full; game startup still works.
  }
}

export function loadCurrentGameConfig(): GameConfig | null {
  const raw = safeGet(window.sessionStorage, CURRENT_CONFIG_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isGameConfig(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function storeCurrentGameConfig(config: GameConfig): void {
  safeSet(window.sessionStorage, CURRENT_CONFIG_KEY, JSON.stringify(config))
  storePreferredAssistance(config.assistance)
}

export function storePreferredAssistance(assistance: GameConfig['assistance']): void {
  safeSet(window.localStorage, PREFERRED_ASSISTANCE_KEY, assistance)
}

export function clearCurrentGameConfig(): void {
  try {
    window.sessionStorage.removeItem(CURRENT_CONFIG_KEY)
  } catch {
    // See safeSet: storage failure must never block navigation.
  }
}

export function loadPreferredAssistance(): GameConfig['assistance'] {
  const stored = safeGet(window.localStorage, PREFERRED_ASSISTANCE_KEY)
  return stored === 'none' || stored === 'learning' ? stored : DEFAULT_GAME_CONFIG.assistance
}
