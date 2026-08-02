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
]

export interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
}

// Modal overlay, matching every other top-bar panel (TileCountGrid,
// StatsPanel, FanEncyclopedia, etc.) — this used to render inline in
// App.tsx's document flow, which pushed the board down and made GameStage's
// ResizeObserver measure a smaller available area, visibly reshaping/
// rescaling the whole stage every time Settings opened. An overlay removes
// it from flow entirely, matching how every other button already behaves.
//
// Plain form wiring over useSettings — bot speed, confirm-before-discard,
// step mode, color-blind palette, tile size (PLAN.md M7 Polish scope), and
// reduce-motion (M8 Step 3 — App.tsx ORs this with the OS-level
// prefers-reduced-motion query, so either alone disables tile animation).
// Sound is still unimplemented; the claim timer was removed entirely
// (owner's call — claims now wait indefinitely for the human's decision).
export function SettingsPanel({ open, onClose, settings, onUpdate }: SettingsPanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5 text-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

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
    </div>
  )
}
