import type { Action } from '../actions.js'
import type { GameState } from '../game-state.js'
import { drawableRemaining } from '../wall.js'
import { typeIdOfInstance, type TileInstanceId } from '../tiles.js'
import type { Seat } from '../meld.js'
import type { ScoreHandParams } from './score-hand.js'

// Win-circumstance derivation (isLastTileOfWall, wonOnKongReplacement, etc.)
// used to be UI-only (packages/ui/src/game/deriveScoreContext.ts), computed
// only AFTER a hand had already ended (state.result set). M5 needs the same
// derivation PROSPECTIVELY — "if seat X declared a win right now via method
// M on tile T, what would it score" — to gate win-legality on MCR's 8-point
// minimum (§3.9.1.1) before a win is ever offered or accepted. None of the
// underlying signals actually require a finished state.result (they only
// ever read the wall, actionLog, and players), so this single function
// serves both the prospective (M5) and post-hoc (UI score screen) callers —
// see fromIndexExclusive below for the one place the two cases differ.

// Fan 46 (Out with Replacement Tile): true iff the draw that produced the
// winning tile was a kong's replacement draw, not an ordinary turn draw.
// `fromIndexExclusive` is where to start scanning backward from — the
// caller passes actionLog.length for a prospective check (no win logged
// yet) or actionLog.length - 1 for a post-hoc check (skip the trailing
// 'win' entry finalizeWin already appended).
function wonOnKongReplacementFromLog(log: readonly Action[], fromIndexExclusive: number): boolean {
  let i = fromIndexExclusive - 1
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
// visible to opponents). Doesn't depend on log position, so it's identical
// prospectively or post-hoc.
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

export type WinLegalityContext = Pick<
  ScoreHandParams,
  | 'winMethod'
  | 'isLastTileOfWall'
  | 'isLastDiscardOfGame'
  | 'wonOnKongReplacement'
  | 'isLastCopyOfItsKind'
  | 'prevailingWind'
  | 'seatWind'
  | 'winningTile'
>

// `logLengthForKongCheck` lets a post-hoc caller (the finished-hand score
// screen) skip the trailing 'win' log entry finalizeWin already appended;
// a prospective caller (win-legality gating, before any win is applied)
// passes state.actionLog.length directly. Defaults to the prospective case.
export function deriveWinLegalityContext(
  state: GameState,
  winnerSeat: Seat,
  winMethod: 'selfDraw' | 'discard' | 'robKong',
  winningTile: TileInstanceId,
  logLengthForKongCheck: number = state.actionLog.length,
): WinLegalityContext {
  const winner = state.players[winnerSeat]
  const wallEmpty = drawableRemaining(state.wall) === 0
  return {
    winMethod,
    isLastTileOfWall: winMethod === 'selfDraw' && wallEmpty,
    isLastDiscardOfGame: winMethod === 'discard' && wallEmpty,
    wonOnKongReplacement: winMethod === 'selfDraw' && wonOnKongReplacementFromLog(state.actionLog, logLengthForKongCheck),
    isLastCopyOfItsKind: isLastCopyOfItsKind(state, winningTile),
    prevailingWind: state.prevailingWind,
    seatWind: winner.seatWind,
    winningTile,
  }
}

// A self-draw win already has the winning tile folded into concealedTiles
// (added by the draw that preceded the decision); a discard/robKong win
// short-circuits meld formation entirely, so the tile is never added to the
// winner's hand at all — scoreHand expects it included either way.
function concealedTilesIncludingWin(concealedTiles: TileInstanceId[], winMethod: 'selfDraw' | 'discard' | 'robKong', winningTile: TileInstanceId): TileInstanceId[] {
  return winMethod === 'selfDraw' ? concealedTiles : [...concealedTiles, winningTile]
}

// The single place that assembles everything scoreHand needs to judge
// "if seat X won right now via method M on tile T, what would it score" —
// used both by moves.ts's advisory legal-move filtering and by its
// enforcement check in finalizeWin, so both paths can never disagree.
export function buildProspectiveScoreHandParams(
  state: GameState,
  winnerSeat: Seat,
  winMethod: 'selfDraw' | 'discard' | 'robKong',
  winningTile: TileInstanceId,
): ScoreHandParams {
  const hand = state.players[winnerSeat].hand
  const context = deriveWinLegalityContext(state, winnerSeat, winMethod, winningTile)
  return {
    concealedTiles: concealedTilesIncludingWin(hand.concealedTiles, winMethod, winningTile),
    melds: hand.melds,
    ...context,
  }
}
