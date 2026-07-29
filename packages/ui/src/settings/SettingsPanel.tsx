import { BOT_SPEED_PRESETS, type Settings, type TileScale } from './useSettings.js'

const SPEED_LABELS: { preset: keyof typeof BOT_SPEED_PRESETS; label: string }[] = [
  { preset: 'instant', label: 'Instant' },
  { preset: 'fast', label: 'Fast' },
  { preset: 'normal', label: 'Normal' },
  { preset: 'relaxed', label: 'Relaxed' },
]

const TILE_SCALE_LABELS: { preset: TileScale; label: string }[] = [
  { preset: 'normal', label: 'Normal' },
  { preset: 'large', label: 'Large' },
  { preset: 'xlarge', label: 'X-Large' },
]

export interface SettingsPanelProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
}

// Plain form wiring over useSettings — bot speed, confirm-before-discard,
// step mode, color-blind palette, tile size (PLAN.md M7 Polish scope), and
// reduce-motion (M8 Step 3 — App.tsx ORs this with the OS-level
// prefers-reduced-motion query, so either alone disables tile animation).
// Sound is still unimplemented; the claim timer was removed entirely
// (owner's call — claims now wait indefinitely for the human's decision).
export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-sm">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Bot speed</legend>
        <div role="radiogroup" aria-label="Bot speed" className="flex gap-2">
          {SPEED_LABELS.map(({ preset, label }) => (
            <label key={preset} className="flex items-center gap-1">
              <input
                type="radio"
                name="bot-speed"
                checked={settings.botSpeedMs === BOT_SPEED_PRESETS[preset]}
                onChange={() => onUpdate({ botSpeedMs: BOT_SPEED_PRESETS[preset] })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.confirmBeforeDiscard}
          onChange={(e) => onUpdate({ confirmBeforeDiscard: e.target.checked })}
        />
        Confirm before discard
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={settings.stepMode} onChange={(e) => onUpdate({ stepMode: e.target.checked })} />
        Step mode (advance bots one decision at a time)
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.colorBlindPalette}
          onChange={(e) => onUpdate({ colorBlindPalette: e.target.checked })}
        />
        Color-blind-safe palette
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Tile size</legend>
        <div role="radiogroup" aria-label="Tile size" className="flex gap-2">
          {TILE_SCALE_LABELS.map(({ preset, label }) => (
            <label key={preset} className="flex items-center gap-1">
              <input
                type="radio"
                name="tile-scale"
                checked={settings.tileScale === preset}
                onChange={() => onUpdate({ tileScale: preset })}
              />
              {label}
            </label>
          ))}
        </div>
        {settings.tileScale !== 'normal' && (
          <p className="text-xs text-neutral-400">Larger tiles may require scrolling to see the full board.</p>
        )}
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(e) => onUpdate({ reducedMotion: e.target.checked })}
        />
        Reduce motion
      </label>
    </div>
  )
}
