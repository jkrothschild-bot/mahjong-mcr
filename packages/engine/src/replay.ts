import { startHand, type GameState, type StartHandParams } from './game-state.js'
import type { Seat } from './meld.js'
import { applyMove, type Move } from './moves.js'

export interface RecordedMove {
  seat: Seat
  move: Move
}

// Full match replay ("kifu", SPEC.md §9). `actions.ts`'s Action log records
// *side effects* (draw/discard/claim/win entries), not input Moves —
// reconstructing exact Moves from it is fiddly. Instead, the UI already
// funnels every move (human and bot alike) through one dispatch point
// (packages/ui/src/game/useGameLoop.ts) — recording that exact (seat, Move)
// sequence gives an exact replay script for free: re-run startHand once,
// then re-apply the same moves in order. Pure and cheap enough to
// recompute on every scrubber step (hands are short); no incremental
// undo/redo machinery needed.
export function replayToIndex(startParams: StartHandParams, moveLog: readonly RecordedMove[], uptoIndex: number): GameState {
  let state = startHand(startParams)
  const count = Math.max(0, Math.min(uptoIndex, moveLog.length))
  for (let i = 0; i < count; i++) {
    const { seat, move } = moveLog[i]!
    state = applyMove(state, seat, move)
  }
  return state
}
