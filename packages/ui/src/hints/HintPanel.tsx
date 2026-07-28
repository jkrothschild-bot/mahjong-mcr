import { useState } from 'react'
import type { Hand } from '@mahjong-mcr/engine'
import { BestMoveTab } from './BestMoveTab.js'

export interface HintPanelProps {
  hand: Hand
  onClose: () => void
}

type HintTab = 'bestMove' | 'handPlan' | 'tileSafety'

const TABS: { id: HintTab; label: string }[] = [
  { id: 'bestMove', label: 'Best move' },
  { id: 'handPlan', label: 'Hand plan' },
  { id: 'tileSafety', label: 'Tile safety' },
]

// SPEC.md §6's Strategy Coach: on-demand only, hidden until the player taps
// Hint (CLAUDE.md — never automatic, never shown for bots). The three tabs
// map onto the original nudge/options/tutor depth levels; Hand Plan and
// Tile Safety are placeholders here and get real content in the next two
// phases (computeHandPlan / assessTileSafety are already built, just not
// wired into this shell yet).
//
// Rendered as a modal overlay (same pattern as TileCountGrid/ScoreScreen),
// not inline in the board's normal flow — an inline panel here pushed the
// board's total height well past the iPad viewport (measured ~380px
// overflow with just the Best Move tab; Hand Plan/Tile Safety will only add
// more), which breaks SPEC.md §5a's no-scrolling rule. A modal keeps the
// board's own layout completely unaffected regardless of how much content
// later phases add to these tabs.
export function HintPanel({ hand, onClose }: HintPanelProps) {
  const [tab, setTab] = useState<HintTab>('bestMove')

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Strategy Coach"
        data-testid="hint-panel"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg border border-indigo-700 bg-neutral-900 p-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-indigo-300">Strategy Coach</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Close
          </button>
        </div>

        <div role="tablist" aria-label="Hint depth" className="flex gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-11 rounded-md border px-3 text-sm ${
                tab === id ? 'border-indigo-400 bg-indigo-500 text-neutral-900 font-semibold' : 'border-neutral-600 hover:bg-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'bestMove' && <BestMoveTab hand={hand} />}
          {tab === 'handPlan' && <p className="text-sm text-neutral-400">Coming soon.</p>}
          {tab === 'tileSafety' && <p className="text-sm text-neutral-400">Coming soon.</p>}
        </div>
      </div>
    </div>
  )
}
