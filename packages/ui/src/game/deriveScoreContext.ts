import {
  FAN_REGISTRY,
  computeSettlement,
  deriveWinLegalityContext,
  scoreHandDetailed,
  type GameState,
  type ScoreHandParams,
  type ScoreResult,
  type Seat,
  type SettlementResult,
  type WinningShape,
} from '@mahjong-mcr/engine'

const FLOWER_FAN_ID = 81

// ScoreHandParams' win-circumstance fields are derived by the engine's own
// deriveWinLegalityContext (packages/engine/src/scoring/derive-context.ts,
// added for M5's 8-point win-legality gate in moves.ts) — this just adds
// the concealedTiles/melds a finished GameState's winner actually has.
// Returns null for an exhaustive draw (nothing to score) or a state that
// hasn't ended yet. Passing actionLog.length - 1 (not the default) tells
// deriveWinLegalityContext to skip the trailing 'win' entry finalizeWin
// already appended — moves.ts's prospective gate check has no such entry
// yet when it calls the same function, which is the one difference between
// this post-hoc caller and that one.
export function deriveScoreHandParams(state: GameState): ScoreHandParams | null {
  const result = state.result
  if (!result || result.outcome !== 'win') return null

  const winnerSeat = result.winnerSeats![0]!
  const winner = state.players[winnerSeat]
  const winMethod = result.winMethod!
  const winningTile = result.winningTile!

  // A self-draw win already has the winning tile folded into concealedTiles
  // (added by the draw that preceded selfDrawWin); a discard/robKong win
  // short-circuits meld formation entirely (moves.ts's finalizeWin never
  // calls applyMeldClaim), so the tile is never added to the winner's hand
  // at all. scoreHand expects it included either way — see
  // property.test.ts's identical winMethod-conditional splice.
  const concealedTiles =
    winMethod === 'selfDraw' ? winner.hand.concealedTiles : [...winner.hand.concealedTiles, winningTile]

  return {
    concealedTiles,
    melds: winner.hand.melds,
    ...deriveWinLegalityContext(state, winnerSeat, winMethod, winningTile, state.actionLog.length - 1),
  }
}

export interface HandOutcome {
  scoreResult: ScoreResult
  settlement: SettlementResult
  // Which seat won, and the parse its score was actually computed from —
  // used by the board to lay the winner's revealed hand out in its real
  // groups (revealOrder.ts). Comes from the SAME scoring pass the points
  // came from, deliberately: re-deriving "the winning shape" separately
  // could pick a different tie-broken parse from the one that was scored,
  // and the board would then illustrate a hand that isn't the one on the
  // score screen.
  winnerSeat: Seat
  winningShape: WinningShape | null
}

// Combines scoreHand + computeSettlement for a finished hand — the single
// place both the score screen (display) and the match-score accumulator
// (bookkeeping) derive a win's point total from, so they can't drift apart.
// Null for an exhaustive draw: nothing to score or settle.
export function deriveHandOutcome(state: GameState): HandOutcome | null {
  const params = deriveScoreHandParams(state)
  if (!params) return null

  const result = state.result!
  const winnerSeat = result.winnerSeats![0]!
  const winner = state.players[winnerSeat]

  const { winningShape, ...scoreResult } = scoreHandDetailed(params)
  const flowerPoints = winner.hand.flowers.length * FAN_REGISTRY[FLOWER_FAN_ID]!.points
  const settlement = computeSettlement({
    winnerSeat,
    basicPoints: scoreResult.basicPoints,
    flowerPoints,
    winMethod: result.winMethod!,
    discarderSeat: result.loserSeat,
  })

  return { scoreResult, settlement, winnerSeat, winningShape }
}
