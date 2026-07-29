import type { SortMode } from './handOrder.js'

const SORT_OPTIONS: readonly { mode: SortMode; label: string }[] = [
  { mode: 'suit', label: 'Suit' },
  { mode: 'number', label: 'Number' },
  { mode: 'honors', label: 'Honors' },
  { mode: 'simples', label: 'Simples' },
  { mode: 'odds', label: 'Odds' },
  { mode: 'evens', label: 'Evens' },
]

export interface SortToolbarProps {
  onSort: (mode: SortMode) => void
}

// 6 always-visible buttons, not a dropdown — SPEC.md §5's original ask was
// one-tap access to every sort mode. A native <select> was used instead
// while this lived inside the old per-seat panel, which didn't have room
// for 6 side-by-side buttons; M8 Step 2 moved Sort into a dedicated HudBar
// with real space, so that constraint is gone. Buttons are also simpler
// and more robust here than a custom-styled <select> replacement would be —
// no ARIA listbox/combobox pattern to get right, just native <button>
// semantics. No persistent "selected" state: sorting is a one-shot action,
// not a toggle, so picking the same mode twice in a row (e.g. re-sorting by
// Suit again after a manual drag) just fires onSort again, same as before.
export function SortToolbar({ onSort }: SortToolbarProps) {
  return (
    <div role="group" aria-label="Sort hand" className="flex flex-wrap gap-1">
      {SORT_OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onSort(mode)}
          className="min-h-11 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-medium text-neutral-100 hover:bg-neutral-700"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
