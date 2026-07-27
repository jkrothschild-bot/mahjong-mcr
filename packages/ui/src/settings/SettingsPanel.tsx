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

// Plain form wiring over useSettings — the four M3-relevant settings (bot
// speed, confirm-before-discard, claim timer). Sound/color-blind
// palette/tile size are PLAN.md M7 (Polish) scope, not here.
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
        <input
          type="checkbox"
          checked={settings.claimTimerEnabled}
          onChange={(e) => onUpdate({ claimTimerEnabled: e.target.checked })}
        />
        Claim decision timer
      </label>

      <label className="flex items-center gap-2">
        Timer duration (seconds)
        <input
          type="number"
          min={1}
          disabled={!settings.claimTimerEnabled}
          value={settings.claimTimerMs / 1000}
          onChange={(e) => {
            const seconds = Number(e.target.value)
            if (Number.isFinite(seconds) && seconds > 0) onUpdate({ claimTimerMs: seconds * 1000 })
          }}
          className="w-16 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 disabled:opacity-40"
        />
      </label>
    </div>
  )
}
