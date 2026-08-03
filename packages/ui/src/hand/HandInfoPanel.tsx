import type { Hand, Wind } from '@mahjong-mcr/engine'
import { FanTrackerPanel } from './FanTrackerPanel.js'
import { WaitsPanel } from './WaitsPanel.js'

export interface HandInfoPanelProps {
  open: boolean
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
  onClose: () => void
}

// The live fan tracker + ready-hand waits, on demand.
//
// These used to sit in HudBar, in flow directly beneath the board. That was a
// layout bug, not a style preference: GameStage measures whatever height is
// left over in Board.tsx's flex column, and computeDesignWidth derives
// designWidth from that element's aspect ratio. Both panels render NOTHING
// until there's something to say and then appear at ~150px — so the board
// physically resized mid-hand, every time a fan locked in or the hand became
// ready. That is the single worst moment to move the tiles under the player,
// and it made the board smaller exactly when they were concentrating.
//
// As a modal the panels cost zero layout: the flex column's leftover height
// is now constant, so designWidth and every tile position stay put whatever
// these have to report.
//
// SPEC.md §5 asks for the fan tracker under a "Score panel (collapsible)" and
// calls it the core learning surface — collapsible is exactly what this is,
// and on-demand is the same posture the Strategy Coach already has
// (CLAUDE.md: hidden by default, shown when the player asks).
//
// Mirrors StatsPanel/TileCountGrid's modal shape rather than inventing a
// fourth overlay style.
export function HandInfoPanel({ open, hand, prevailingWind, seatWind, onClose }: HandInfoPanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Hand info"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Hand info</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

        {/* Both children still self-suppress when they have nothing to report
            (that behaviour is theirs, and its tests are unchanged) — so an
            early hand shows this placeholder rather than an empty dialog that
            looks broken. In HudBar the same emptiness was invisible; in a
            deliberately-opened panel it needs an answer. */}
        <FanTrackerPanel hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} />
        <WaitsPanel hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} />
        <p className="text-sm text-neutral-400">
          Fans you have locked in appear here as they are secured, and your waits appear once the hand is ready.
        </p>
      </div>
    </div>
  )
}
