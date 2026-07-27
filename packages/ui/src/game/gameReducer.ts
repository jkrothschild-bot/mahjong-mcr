import { applyMove, type GameState, type Move, type Seat } from '@mahjong-mcr/engine'

export interface ApplyMoveAction {
  type: 'apply'
  seat: Seat
  move: Move
}

// Thin wrapper around applyMove: guards against dispatching once the hand
// has ended, since applyMove itself throws in that case. This matters
// because bot moves are scheduled via setTimeout (see useGameLoop) — a
// stale timer can fire in the same tick the hand ends from an unrelated
// dispatch, and a reducer must never throw.
export function gameReducer(state: GameState, action: ApplyMoveAction): GameState {
  if (state.phase === 'handEnded') return state
  return applyMove(state, action.seat, action.move)
}
