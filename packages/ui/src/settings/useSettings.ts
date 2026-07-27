import { useCallback, useState } from 'react'

export interface Settings {
  botSpeedMs: number
  confirmBeforeDiscard: boolean
}

// SPEC.md §7's bot-speed presets. A named preset, not a raw slider value,
// is what SettingsPanel exposes — this is just the lookup table behind it.
export const BOT_SPEED_PRESETS = {
  instant: 0,
  fast: 500,
  normal: 1500,
  relaxed: 3000,
} as const

export const DEFAULT_SETTINGS: Settings = {
  botSpeedMs: BOT_SPEED_PRESETS.normal,
  confirmBeforeDiscard: false,
}

const STORAGE_KEY = 'mcr-mahjong:settings:v1'

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// Pure — no localStorage access — so it's directly unit-testable, including
// corrupt/partial/missing input. Never throws: anything unrecognized just
// falls back to the corresponding default field, not the whole object, so
// a settings-shape change in a future version doesn't wipe an otherwise-
// valid stored value.
export function loadSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS
  const candidate = parsed as Partial<Record<keyof Settings, unknown>>
  return {
    botSpeedMs: isNumber(candidate.botSpeedMs) ? candidate.botSpeedMs : DEFAULT_SETTINGS.botSpeedMs,
    confirmBeforeDiscard:
      typeof candidate.confirmBeforeDiscard === 'boolean' ? candidate.confirmBeforeDiscard : DEFAULT_SETTINGS.confirmBeforeDiscard,
  }
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings)
}

export interface UseSettingsResult {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

// localStorage-backed settings, read once on mount, written on every
// update. Storage access is guarded — private-browsing/quota failures mean
// settings just don't persist across reloads, never a crash.
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return loadSettings(window.localStorage.getItem(STORAGE_KEY))
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeSettings(next))
      } catch {
        // Ignored — see the doc comment above.
      }
      return next
    })
  }, [])

  return { settings, update }
}
