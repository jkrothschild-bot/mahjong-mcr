import type { SortMode } from './handOrder.js'

// The one mode this control fires. The other five comparators in
// handOrder.ts (number/honors/simples/odds/evens) are deliberately kept —
// they're pure, tested, and cost nothing to leave in place, so restoring a
// multi-mode control later is a UI change only, with no logic to rewrite.
const SORT_MODE: SortMode = 'suit'

export interface SortToolbarProps {
  onSort: (mode: SortMode) => void
}

// A single button, not a 6-option control.
//
// History, so this doesn't get "restored" by accident: this began as 6
// always-visible buttons (M8 Step 2), became a native <select> when the
// board reclaimed HudBar's dedicated button-row height, and is now one
// button that always sorts by suit — the owner's call, on the grounds that
// suit is the sort actually used in play and a picker is a two-step
// interaction for a one-step job.
//
// NOTE: this deliberately diverges from PLAN.md M3 and SPEC.md §5/§5b, which
// both call for the full Suit/Number/Honors/Simples/Odds/Evens toolbar from
// the owner's reference screenshot. See SPEC.md §5b for the recorded
// decision.
//
// Kept as a one-shot action, not a mode: the button never renders as
// "selected" after a press, and pressing it repeatedly must fire onSort every
// time (sortByMode is idempotent, so a second press is a visual no-op — but
// that's the sort function's business, not this control's).
export function SortToolbar({ onSort }: SortToolbarProps) {
  return (
    <button
      type="button"
      aria-label="Sort hand"
      onClick={() => onSort(SORT_MODE)}
      className="min-h-11 rounded-md border border-neutral-600 bg-neutral-800 px-4 text-sm font-medium text-neutral-100 hover:bg-neutral-700 active:bg-neutral-600"
    >
      Sort
    </button>
  )
}
