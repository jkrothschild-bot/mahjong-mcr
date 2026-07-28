import { SCENARIO_LIBRARY, type ScenarioPreset } from '@mahjong-mcr/engine'

export interface PracticePickerProps {
  onSelect: (preset: ScenarioPreset) => void
  onClose: () => void
}

// SPEC.md §9's practice mode entry point: pick one of the curated
// SCENARIO_LIBRARY presets to start a standalone practice hand from (see
// usePracticeHand's own doc comment for why this never touches the live
// match or session stats).
export function PracticePicker({ onSelect, onClose }: PracticePickerProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Practice mode"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Practice mode</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {SCENARIO_LIBRARY.map((preset) => (
            <div key={preset.id} className="flex flex-col gap-1 rounded-md border border-neutral-700 p-3">
              <h3 className="text-sm font-semibold">{preset.label}</h3>
              <p className="text-xs text-neutral-400">{preset.description}</p>
              <button
                type="button"
                onClick={() => onSelect(preset)}
                className="min-h-11 mt-1 self-start rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
