import { useState } from 'react'
import type { SortMode } from './handOrder.js'

const SORT_OPTIONS: readonly { mode: SortMode; label: string }[] = [
  { mode: 'suit', label: 'Suit' },
  { mode: 'number', label: 'Number' },
  { mode: 'honors', label: 'Honors' },
  { mode: 'simples', label: 'Simples' },
  { mode: 'odds', label: 'Odds' },
  { mode: 'evens', label: 'Evens' },
]

const PLACEHOLDER = ''

export interface SortToolbarProps {
  onSort: (mode: SortMode) => void
}

// A dropdown rather than 6 always-visible buttons: SPEC.md §5 asks for
// one-tap access to every sort mode, not specifically 6 side-by-side
// buttons, and those were eating a disproportionate share of the human
// seat's row. Resets back to the placeholder after every selection so
// picking the same mode twice in a row (e.g. re-sorting by Suit again
// after a manual drag) still fires onSort — a real <select>'s onChange
// only fires on a value change, not a re-selection of the same option.
export function SortToolbar({ onSort }: SortToolbarProps) {
  const [value, setValue] = useState(PLACEHOLDER)

  return (
    <select
      aria-label="Sort hand"
      value={value}
      onChange={(e) => {
        onSort(e.target.value as SortMode)
        setValue(PLACEHOLDER)
      }}
      className="min-h-11 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-medium text-neutral-100 hover:bg-neutral-700"
    >
      <option value={PLACEHOLDER} disabled>
        Sort by…
      </option>
      {SORT_OPTIONS.map(({ mode, label }) => (
        <option key={mode} value={mode}>
          {label}
        </option>
      ))}
    </select>
  )
}
