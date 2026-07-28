import { useState } from 'react'
import { replayToIndex, type GameState, type MatchState, type Seat } from '@mahjong-mcr/engine'
import { Board } from '../board/Board.js'
import type { HandMoveLog } from '../game/useGameLoop.js'

export interface ReplayViewProps {
  handMoveLogs: readonly HandMoveLog[]
  initialHandIndex?: number
  onClose: () => void
}

const ZERO_SCORES: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

// Board needs a MatchState to render the wind indicator ("East 2 of 16"),
// but a HandMoveLog only keeps what replayToIndex needs (StartHandParams +
// moves) — deliberately minimal, see useGameLoop.ts's own doc comment.
// roundHandIndex is fully derivable from handNumber alone (the dealer
// rotation is a fixed 4-hands-per-round cycle, docs/rules/decisions.md #4),
// so this needs no data beyond the reconstructed GameState itself.
function displayMatchState(state: GameState): MatchState {
  return {
    matchSeed: state.seed,
    prevailingWind: state.prevailingWind,
    roundHandIndex: (((state.handNumber - 1) % 4) + 1) as 1 | 2 | 3 | 4,
    dealerSeat: state.dealerSeat,
    matchHandNumber: state.handNumber,
    completed: false,
    handSeeds: [],
  }
}

// SPEC.md §9's full match replay ("kifu") with a scrubber: step back
// through any hand played this session, move by move. Feeds a
// replayToIndex-reconstructed GameState straight into the existing Board
// component with inert callbacks — Board has no special "read-only" mode,
// it just never receives a real interaction here (no discard button click
// can ever fire since isHumanTurn is always false).
export function ReplayView({ handMoveLogs, initialHandIndex, onClose }: ReplayViewProps) {
  const [handIndex, setHandIndex] = useState(initialHandIndex ?? handMoveLogs.length - 1)
  const [moveIndex, setMoveIndex] = useState(0)

  const log = handMoveLogs[handIndex]!
  const state = replayToIndex(log.startParams, log.moves, moveIndex)

  const goToHand = (index: number) => {
    setHandIndex(index)
    setMoveIndex(0)
  }

  return (
    <div data-testid="replay-view" className="fixed inset-0 z-10 flex flex-col items-center gap-1 overflow-y-auto bg-neutral-950 p-1">
      <div className="flex w-full max-w-5xl items-center justify-between gap-2 text-sm text-neutral-100">
        <h2 className="font-semibold">Replay</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Prev hand"
            disabled={handIndex === 0}
            onClick={() => goToHand(handIndex - 1)}
            className="min-h-11 rounded-md border border-neutral-600 px-2 disabled:opacity-40"
          >
            ◀
          </button>
          <span data-testid="replay-hand-indicator" className="whitespace-nowrap">
            Hand {handIndex + 1} of {handMoveLogs.length}
          </span>
          <button
            type="button"
            aria-label="Next hand"
            disabled={handIndex === handMoveLogs.length - 1}
            onClick={() => goToHand(handIndex + 1)}
            className="min-h-11 rounded-md border border-neutral-600 px-2 disabled:opacity-40"
          >
            ▶
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 hover:bg-neutral-800"
        >
          Close
        </button>
      </div>

      <Board
        state={state}
        matchState={displayMatchState(state)}
        matchScores={ZERO_SCORES}
        isHumanTurn={false}
        selectedTileId={null}
        onTileClick={() => {}}
        onRequestDiscard={() => {}}
        selectedTypeId={null}
        onInspectTile={() => {}}
      />

      <div className="flex w-full max-w-5xl items-center gap-2 text-sm text-neutral-100">
        <button
          type="button"
          aria-label="Prev move"
          disabled={moveIndex === 0}
          onClick={() => setMoveIndex((i) => Math.max(0, i - 1))}
          className="min-h-11 rounded-md border border-neutral-600 px-2 disabled:opacity-40"
        >
          ◀
        </button>
        <span data-testid="replay-move-indicator" className="whitespace-nowrap">
          Move {moveIndex} of {log.moves.length}
        </span>
        <button
          type="button"
          aria-label="Next move"
          disabled={moveIndex === log.moves.length}
          onClick={() => setMoveIndex((i) => Math.min(log.moves.length, i + 1))}
          className="min-h-11 rounded-md border border-neutral-600 px-2 disabled:opacity-40"
        >
          ▶
        </button>
        <input
          type="range"
          aria-label="Move scrubber"
          min={0}
          max={log.moves.length}
          value={moveIndex}
          onChange={(e) => setMoveIndex(Number(e.target.value))}
          className="flex-1"
        />
      </div>
    </div>
  )
}
