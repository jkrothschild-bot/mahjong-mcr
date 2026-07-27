import { legalMoves, type GameState, type Move, type Seat } from '@mahjong-mcr/engine'

// Placeholder bot policy — deliberately simple and deterministic (never
// random), so it's reproducible per state and safe to snapshot-test. This
// is an M4-replaceable stub: M4 ("shanten calculator... 3 competent bots")
// swaps this out for real tile-efficiency-aware decisions. The only
// property this needs for M3 is "a legal, non-flaky opponent that keeps a
// hand moving":
//   1. Always take a win when one's on offer (declining a free win would be
//      actively confusing to watch as a learner).
//   2. In the discard phase, prefer to actually discard over voluntarily
//      declaring a kong (legalMoves lists kong options before discards;
//      picking the literal first legal move would make bots kong
//      constantly, which isn't a useful default to demonstrate).
//   3. Otherwise take the first legal non-pass option (a claim, or the only
//      available move), falling back to pass.
export function chooseBotMove(state: GameState, seat: Seat): Move {
  const moves = legalMoves(state, seat)

  const win = moves.find((m) => m.kind === 'win' || m.kind === 'selfDrawWin')
  if (win) return win

  const discard = moves.find((m) => m.kind === 'discard')
  if (discard) return discard

  const nonPass = moves.find((m) => m.kind !== 'pass')
  if (nonPass) return nonPass

  const pass = moves.find((m) => m.kind === 'pass')
  if (pass) return pass

  throw new Error(`No legal moves for seat ${seat} in phase ${state.phase}`)
}
