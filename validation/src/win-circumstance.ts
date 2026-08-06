// Randomizes the win-circumstance/context fields every GeneratedCase needs
// (HandContext's optional fields — see packages/engine/src/scoring/types.ts),
// shared by every generator so win-method/wind/rare-flag distribution is
// consistent across structures rather than each generator inventing its own.
import { typeIdOfInstance, type Meld, type Rng, type TileInstanceId, type Wind } from '@mahjong-mcr/engine'
import { chance, randomWind } from './hand-helpers.js'

export interface WinCircumstance {
  winMethod: 'selfDraw' | 'discard' | 'robKong'
  isLastTileOfWall: boolean
  isLastDiscardOfGame: boolean
  wonOnKongReplacement: boolean
  isLastCopyOfItsKind: boolean
  prevailingWind: Wind
  seatWind: Wind
}

// PyMahjongGB doesn't just trust the is4thTile flag it's given — it
// structurally overrides it (fan_calculator.cpp's calculate_fan, "校正和牌
// 标记"): forced FALSE if the winner's own remaining CONCEALED tiles hold
// another copy of the winning tile's type (can't be "the last one" if you're
// still holding a spare); forced TRUE if the winning tile's type already has
// exactly 3 copies sitting in one of the winner's own exposed packs (a pung
// of X, winning specifically on a 4th X, is unambiguously the last physical
// copy no matter what anyone was told). Our engine has no such override —
// scoreHand trusts isLastCopyOfItsKind exactly as given, because the real
// game always derives it correctly from full-table visibility
// (derive-context.ts's isLastCopyOfItsKind scans every player's discards
// and exposed melds, a strict superset of PyMahjongGB's narrow structural
// check). This generator has no other-player visibility to model at all, so
// to avoid manufacturing a state the two sides are GUARANTEED to disagree
// on, it replicates PyMahjongGB's own two structural corrections before
// falling back to a random choice in the genuinely free middle case
// (representing "the other 3 copies were visible via discards/opponents'
// melds" — invisible to this simplified single-hand model either way, but a
// legitimate real-game scenario scoreHand must still handle correctly).
//
// FIXED (docs/rules/decisions.md #30(h), then #33): a single
// otherCopiesInOwnHand used to serve TWO different purposes that need
// different scopes, and conflating them broke one to fix the other on the
// first attempt at this fix (caught by re-running the harness, not by
// reasoning alone — recorded here so the distinction isn't lost again):
//   1. The "is4thTile forced FALSE" check just below, which per
//      PyMahjongGB's own comment ("the winner's own remaining CONCEALED
//      tiles") only cares about CONCEALED spares — a copy already sitting
//      in the winner's own exposed meld is public, not a hidden spare, and
//      is exactly what forcedLastCopy's separate inAnyPack check exists to
//      interpret instead.
//   2. The robKong-feasibility downgrade a few lines below (only an
//      OPPONENT can hold a promotable pung; if the WINNER's own hand holds
//      even one more copy of the winning tile's type — concealed OR
//      exposed — a robKong scenario is physically impossible, since only 4
//      copies of any tile exist total). This one genuinely needs melds
//      included; the old bug's fix must not narrow this one too.
// Two functions now, each scoped to what its own caller actually needs.
function otherCopiesInConcealedHand(concealedTiles: readonly TileInstanceId[], winningTile: TileInstanceId): number {
  const winType = typeIdOfInstance(winningTile)
  return concealedTiles.filter((t) => t !== winningTile && typeIdOfInstance(t) === winType).length
}

function otherCopiesAnywhereInOwnHand(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[], winningTile: TileInstanceId): number {
  const winType = typeIdOfInstance(winningTile)
  const inConcealed = otherCopiesInConcealedHand(concealedTiles, winningTile)
  const inMelds = melds.reduce((sum, m) => sum + m.tiles.filter((t) => typeIdOfInstance(t) === winType).length, 0)
  return inConcealed + inMelds
}

function forcedLastCopy(otherInConcealedHand: number, melds: readonly Meld[], winningTile: TileInstanceId): boolean | null {
  if (otherInConcealedHand > 0) return false
  const winType = typeIdOfInstance(winningTile)
  const inAnyPack = melds.some((m) => m.tiles.filter((t) => typeIdOfInstance(t) === winType).length === 3)
  if (inAnyPack) return true
  return null
}

export function randomWinCircumstance(
  rng: Rng,
  concealedTiles: readonly TileInstanceId[],
  melds: readonly Meld[],
  winningTile: TileInstanceId,
): WinCircumstance {
  const otherInConcealedHand = otherCopiesInConcealedHand(concealedTiles, winningTile)
  const otherAnywhereInOwnHand = otherCopiesAnywhereInOwnHand(concealedTiles, melds, winningTile)
  const r = rng.next()
  let winMethod: 'selfDraw' | 'discard' | 'robKong' = r < 0.45 ? 'selfDraw' : r < 0.9 ? 'discard' : 'robKong'
  // Robbing the Kong requires an OPPONENT to hold the other 3 copies of the
  // winning tile's type in their own about-to-be-promoted pung — physically
  // impossible if the winner's own hand already holds any of those copies,
  // CONCEALED OR EXPOSED (only 4 exist total). Picking robKong anyway would
  // build a hand the real game could never produce and PyMahjongGB has no
  // way to interpret consistently with our side (an early run generated
  // exactly this and produced a wildly wrong-looking mismatch — Three
  // Concealed Pungs + Robbing the Kong on our side vs. a much smaller
  // PyMahjongGB total, seed 9 in the Stage 1 debugging log).
  if (winMethod === 'robKong' && otherAnywhereInOwnHand > 0) winMethod = 'discard'
  const hasKong = melds.some((m) => m.kind === 'kong')
  const forced = forcedLastCopy(otherInConcealedHand, melds, winningTile)
  // A genuine robKong win means the opponent's exposed pung (3 copies) plus
  // this winning tile account for all 4 physical copies — always "the last
  // tile", even though neither of forcedLastCopy's two structural checks
  // can see it (the other 3 copies live in an opponent's pack, which this
  // single-hand generator never models). Both sides need to be told this
  // explicitly, or PyMahjongGB (no override applies here — see
  // forcedLastCopy's comment) and this engine would silently disagree on
  // fan 58 the same way seed 9 did before this fix.
  const isLastCopyOfItsKind = winMethod === 'robKong' ? true : (forced ?? chance(0.15, rng))

  return {
    winMethod,
    isLastTileOfWall: winMethod === 'selfDraw' && chance(0.1, rng),
    // Matches derive-context.ts's deriveWinLegalityContext exactly: only a
    // plain 'discard' win can be "the last discard of the game" — a
    // robKong win claims a just-promoted meld, not a wall-driven discard,
    // so the real engine never sets this flag for winMethod==='robKong'.
    // An early scratch run that allowed robKong+isLastDiscardOfGame
    // together produced a state the live engine can never reach and a
    // spurious PyMahjongGB mismatch as a result — this mirrors that fix.
    isLastDiscardOfGame: winMethod === 'discard' && chance(0.1, rng),
    wonOnKongReplacement: winMethod === 'selfDraw' && hasKong && chance(0.25, rng),
    isLastCopyOfItsKind,
    prevailingWind: randomWind(rng),
    seatWind: randomWind(rng),
  }
}

// Picks which physical tile "completed" the hand — a free choice for a
// generated (not played-out) hand, since HandContext folds the winning tile
// into concealedTiles regardless of winMethod (see case-types.ts). Any
// element works; picking uniformly at random exercises the wait-shape fans
// (77/78/79) whenever the resulting 13-tile remainder happens to have a
// unique completion.
export function pickWinningTile(concealedTiles: readonly TileInstanceId[], rng: Rng): TileInstanceId {
  const idx = Math.floor(rng.next() * concealedTiles.length)
  const tile = concealedTiles[idx]
  if (tile === undefined) throw new Error('pickWinningTile: empty concealedTiles')
  return tile
}
