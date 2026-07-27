import type { SortMode } from './handOrder.js'

const SORT_BUTTONS: readonly { mode: SortMode; label: string }[] = [
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

// One-tap sort buttons per SPEC.md §5 — richer than a single "auto-sort".
// Purely visual: onSort only ever reorders client-side display state (see
// useHandOrder), never engine state.
export function SortToolbar({ onSort }: SortToolbarProps) {
  return (
    <div role="group" aria-label="Sort hand" className="flex gap-1.5">
      {SORT_BUTTONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onSort(mode)}
          className="min-h-11 min-w-11 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-medium text-neutral-100 hover:bg-neutral-700"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
