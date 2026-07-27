import {
  FAN_REGISTRY,
  computeSettlement,
  drawableRemaining,
  scoreHand,
  typeIdOfInstance,
  type GameState,
  type ScoreHandParams,
  type ScoreResult,
  type SettlementResult,
  type TileInstanceId,
} from '@mahjong-mcr/engine'

const FLOWER_FAN_ID = 81

// ScoreHandParams' win-circumstance fields aren't derived anywhere in the
// engine (see score-hand.ts's own doc comment) — this computes all of them
// from a handEnded GameState. Returns null for an exhaustive draw (nothing
// to score) or a state that hasn't ended yet.
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

  const wallEmpty = drawableRemaining(state.wall) === 0

  return {
    concealedTiles,
    melds: winner.hand.melds,
    winMethod,
    isLastTileOfWall: winMethod === 'selfDraw' && wallEmpty,
    isLastDiscardOfGame: winMethod === 'discard' && wallEmpty,
    wonOnKongReplacement: winMethod === 'selfDraw' && wasWonOnKongReplacement(state),
    isLastCopyOfItsKind: isLastCopyOfItsKind(state, winningTile),
    prevailingWind: state.prevailingWind,
    seatWind: winner.seatWind,
    winningTile,
  }
}

// Fan 46 (Out with Replacement Tile): true iff the draw that produced the
// winning tile was a kong's replacement draw, not an ordinary turn draw.
// The action log doesn't mark this directly — a replacement draw is logged
// identically to a normal one (wall.ts: "kong/flower replacements simply
// come from the opposite end of the same wall") — so this scans backward
// from the trailing 'win' entry, past any flower-chain replacements and
// (for an unrobbed added kong) the other seats' rob-kong passes, to find
// the kong action that triggered this specific draw.
function wasWonOnKongReplacement(state: GameState): boolean {
  const log = state.actionLog
  let i = log.length - 2 // skip the 'win' entry itself
  while (i >= 0 && log[i]!.type === 'flowerReplacement') i--
  if (i < 0 || log[i]!.type !== 'draw') return false
  i--
  while (i >= 0 && log[i]!.type === 'pass') i--
  const trigger = i >= 0 ? log[i] : undefined
  return trigger?.type === 'concealedKong' || trigger?.type === 'addedKong' || (trigger?.type === 'claim' && trigger.claimType === 'kong')
}

// Fan 58 (Last Tile): the winning tile is the 4th/last copy of its type,
// with the other 3 already visible to every player via discards or exposed
// melds (concealed kongs don't count — those tiles were never actually
// visible to opponents). The winning tile itself may already be sitting in
// a discard pile: a discard win never removes the claimed tile from the
// discarder's river (finalizeWin skips applyMeldClaim's bookkeeping
// entirely), so it's explicitly excluded rather than counted as one of the
// "other three".
function isLastCopyOfItsKind(state: GameState, winningTile: TileInstanceId): boolean {
  const typeId = typeIdOfInstance(winningTile)
  const visible: TileInstanceId[] = []
  for (const player of state.players) {
    visible.push(...player.discards)
    for (const meld of player.hand.melds) {
      if (meld.exposure === 'exposed') visible.push(...meld.tiles)
    }
  }
  const otherCopies = visible.filter((tile) => tile !== winningTile && typeIdOfInstance(tile) === typeId)
  return otherCopies.length === 3
}

export interface HandOutcome {
  scoreResult: ScoreResult
  settlement: SettlementResult
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

  const scoreResult = scoreHand(params)
  const flowerPoints = winner.hand.flowers.length * FAN_REGISTRY[FLOWER_FAN_ID]!.points
  const settlement = computeSettlement({
    winnerSeat,
    basicPoints: scoreResult.basicPoints,
    flowerPoints,
    winMethod: result.winMethod!,
    discarderSeat: result.loserSeat,
  })

  return { scoreResult, settlement }
}
