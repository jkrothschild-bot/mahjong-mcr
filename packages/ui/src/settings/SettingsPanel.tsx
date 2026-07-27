import { BOT_SPEED_PRESETS, type Settings } from './useSettings.js'

const SPEED_LABELS: { preset: keyof typeof BOT_SPEED_PRESETS; label: string }[] = [
  { preset: 'instant', label: 'Instant' },
  { preset: 'fast', label: 'Fast' },
  { preset: 'normal', label: 'Normal' },
  { preset: 'relaxed', label: 'Relaxed' },
]

export interface SettingsPanelProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
}

// Plain form wiring over useSettings — bot speed and confirm-before-
// discard. Sound/color-blind palette/tile size are PLAN.md M7 (Polish)
// scope, not here; the claim timer was removed entirely (owner's call —
// claims now wait indefinitely for the human's decision).
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
    </div>
  )
}
