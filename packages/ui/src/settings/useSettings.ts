import { useCallback, useState } from 'react'

export type TileScale = 'normal' | 'large'

// Deliberately small. Three settings were removed on the owner's call to cut
// the control count, each for its own reason:
//
// - `confirmBeforeDiscard`: discarding already needs a deliberate
//   double-click or drag-to-river, so the modal was belt-and-braces.
// - `reducedMotion`: this only ever OR'd with the OS-level
//   prefers-reduced-motion query, which App.tsx still honours on its own —
//   so removing the toggle costs nobody the behaviour.
// - `colorBlindPalette`: removed with its Okabe-Ito alternative triad. See
//   TileSafetyTab.tsx's own note; the danger levels remain labelled in text
//   ("Low/Medium/High risk"), which is the non-colour channel that keeps
//   them readable, but the colour cue itself is now red/amber/emerald only.
//   Recorded here rather than silently dropped because SPEC.md §8/§9 and
//   PLAN.md M7 both still list a colour-blind palette as a goal.
// - `stepMode`: advanced bots one decision per tap instead of on the speed
//   timer. Removed as not earning its place — the Instant/Fast/Normal/Relaxed
//   presets already cover pacing, and "Relaxed" gives thinking time without a
//   second mechanism (and without a "Next" button appearing mid-board).
export interface Settings {
  botSpeedMs: number
  // SPEC.md §8's "tile size / zoom" — a named preset, not a continuous
  // value, matching BOT_SPEED_PRESETS below.
  tileScale: TileScale
}

// SPEC.md §7's bot-speed presets. A named preset, not a raw slider value,
// is what SettingsPanel exposes — this is just the lookup table behind it.
export const BOT_SPEED_PRESETS = {
  instant: 0,
  fast: 500,
  normal: 1500,
  relaxed: 3000,
} as const

export const TILE_SCALE_VALUES: readonly TileScale[] = ['normal', 'large']

export const DEFAULT_SETTINGS: Settings = {
  botSpeedMs: BOT_SPEED_PRESETS.normal,
  tileScale: 'normal',
}

const STORAGE_KEY = 'mcr-mahjong:settings:v1'

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isTileScale(value: unknown): value is TileScale {
  return typeof value === 'string' && (TILE_SCALE_VALUES as readonly string[]).includes(value)
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
  // Unknown keys in stored JSON are ignored rather than rejected, which is
  // what makes dropping a setting a non-event for anyone who already has one
  // persisted: a v1 blob still carrying confirmBeforeDiscard,
  // colorBlindPalette, reducedMotion or stepMode loads fine — those keys are
  // simply never read again. That's also why STORAGE_KEY doesn't need a
  // version bump for any of these removals.
  return {
    botSpeedMs: isNumber(candidate.botSpeedMs) ? candidate.botSpeedMs : DEFAULT_SETTINGS.botSpeedMs,
    tileScale: isTileScale(candidate.tileScale) ? candidate.tileScale : DEFAULT_SETTINGS.tileScale,
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
