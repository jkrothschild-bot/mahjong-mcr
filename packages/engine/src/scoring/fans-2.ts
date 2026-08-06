import { typeIdOfInstance, type TileTypeId } from '../tiles.js'
import type { FanMatch, HandContext } from './types.js'
import {
  allSets,
  isDragonTypeId,
  isHonorTypeId,
  isTerminalTypeId,
  parseSuited,
  windTypeId,
  type SuitChar,
} from './set-helpers.js'
import { meldTileTypeId } from '../meld.js'

// 59. Dragon Pung — 2 pts, PER QUALIFYING PUNG. §3.8.1 p.16 / App.1 p.39: "A
// Pung or Kong of Dragon Tiles." Unlike the "Two Dragon Pungs"-style named
// fans, this one's count field genuinely counts (0-3 dragon pungs can exist
// in one hand). Whenever exactly 2 or 3 dragon pungs are present, this
// necessarily also satisfies Two Dragon Pungs (54) or Big Three Dragons (2)
// respectively for the SAME physical pungs — already excluded via
// exclusions.ts's [2,59]/[10,59]/[54,59] (the last one added this session).
function detectDragonPung(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const count = sets.filter((s) => s.kind !== 'chow' && isDragonTypeId(s.typeId)).length
  return count > 0 ? [{ fanId: 59, count }] : []
}

// 60. Prevalent Wind — 2 pts. §3.8.1 p.16 / App.1 p.39: "A Pung or Kong of
// the Wind Tile that matches the current Prevalent (round) Wind." Needs
// ctx.prevailingWind, threaded in from real game state by the caller (not
// yet wired — see types.ts's doc comment).
function detectPrevalentWind(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition || !ctx.prevailingWind) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const target = windTypeId(ctx.prevailingWind)
  return sets.some((s) => s.kind !== 'chow' && s.typeId === target) ? [{ fanId: 60, count: 1 }] : []
}

// 61. Seat Wind — 2 pts. §3.8.1 p.16 / App.1 p.39: "A Pung or Kong of the
// Wind Tile that matches the player's own Seat Wind." Needs ctx.seatWind.
function detectSeatWind(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition || !ctx.seatWind) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const target = windTypeId(ctx.seatWind)
  return sets.some((s) => s.kind !== 'chow' && s.typeId === target) ? [{ fanId: 61, count: 1 }] : []
}

// 62. Concealed Hand — 2 pts. §3.8.1 p.16 / App.1 p.39: "A hand with no
// melded (exposed) sets, completed by winning off another player's
// discard." Naturally mutually exclusive with Fully Concealed Hand (fan 56,
// same zero-EXPOSED-meld shape but a self-drawn win) by winMethod alone.
//
// FIXED (docs/rules/decisions.md #30(b), then #33): same bug and same fix
// as fan 56's sibling detector in fans-4.ts — see that function's comment
// for the full §3.6.8 citation. A concealed kong doesn't disqualify a
// discard win from Concealed Hand either.
function detectConcealedHand(ctx: HandContext): FanMatch[] {
  const noExposedMelds = ctx.melds.every((m) => m.exposure === 'concealed')
  return noExposedMelds && ctx.winMethod === 'discard' ? [{ fanId: 62, count: 1 }] : []
}

// 63. All Chows — 2 pts. §3.8.1 p.16 / App.1 p.39: "A hand composed
// entirely of Chows (and a pair), with no Honor tiles at all." Also
// excludes fan 76 (No Honors) via the rulebook's own "No Honors is implied"
// Non-Repeat note (already in exclusions.ts).
function detectAllChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  // A knittedStraight candidate's decomposition only covers the non-knitted
  // remainder (0-1 real sets) — allSets() can't see the other 3 (knitted)
  // sets, so `sets.every(...)` below would otherwise pass vacuously on an
  // empty/near-empty list. Every OTHER candidate always has sets.length===4
  // already, so this guard is a no-op for them (docs/rules/decisions.md #20).
  if (sets.length !== 4) return []
  if (!sets.every((s) => s.kind === 'chow')) return []
  if (isHonorTypeId(ctx.decomposition.pair)) return []
  return [{ fanId: 63, count: 1 }]
}

// 64. Tile Hog — 2 pts, PER QUALIFYING TILE TYPE. §3.8.1 p.16 / App.1 p.40:
// "Using all four copies of one tile type in the hand, without those four
// being declared as a Kong." Whole-hand tile-count check (concealed tiles +
// meld tiles combined, tracking whether a kong was ever declared for that
// type) rather than a decomposition-based one — the 4 copies can be split
// across e.g. a pung plus an adjacent chow.
//
// FIXED (docs/rules/decisions.md #27): this used to `return` on the FIRST
// qualifying type found, undercounting any hand that hogs two separate
// types at once. Confirmed countable (not flat, count-always-1) directly
// against PyMahjongGB's own per-type scoring (e.g. seed 1823602851 in the
// 1200-hand harness sample scores 'Tile Hog': 2) — every other generic,
// per-unit fan in this file (Dragon Pung 59, Double Pung 65, Concealed Kong
// 67) is likewise countable, and fan 64's own definition names a single
// TILE TYPE as the qualifying unit, so two independently-hogged types are
// two separate instances of the same named condition, not one.
function detectTileHog(ctx: HandContext): FanMatch[] {
  const counts = new Map<TileTypeId, number>()
  const kongTypes = new Set<TileTypeId>()
  for (const tile of ctx.concealedTiles) {
    const id = typeIdOfInstance(tile)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  for (const meld of ctx.melds) {
    // Credit each physical tile's own type individually — a chow's 3 tiles
    // are 3 DIFFERENT types (meldTileTypeId's "typeId = tiles[0]" convention
    // is only valid for pung/kong, where all tiles share one type).
    for (const tile of meld.tiles) {
      const id = typeIdOfInstance(tile)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    if (meld.kind === 'kong') kongTypes.add(meldTileTypeId(meld))
  }
  let hoggedTypes = 0
  for (const [id, count] of counts) {
    if (count === 4 && !kongTypes.has(id)) hoggedTypes++
  }
  return hoggedTypes > 0 ? [{ fanId: 64, count: hoggedTypes }] : []
}

// 65. Double Pung — 2 pts, PER QUALIFYING RANK. §3.8.1 p.16 / App.1 p.40:
// "Two Pungs (or Kongs) of the same number, in two different suits." Counts
// how many distinct ranks have pungs in exactly 2 suits — Triple Pung (32,
// all 3 suits share a rank) is excluded from double-counting the same rank
// via exclusions.ts's [32,65] (added this session), since a rank with all
// 3 suits present is deliberately NOT counted here (strict === 2, not >=2).
function detectDoublePung(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const pungs = sets.filter((s) => s.kind !== 'chow')
  const suitsByRank = new Map<number, Set<SuitChar>>()
  for (const s of pungs) {
    const parsed = parseSuited(s.typeId)
    if (!parsed) continue
    if (!suitsByRank.has(parsed.rank)) suitsByRank.set(parsed.rank, new Set())
    suitsByRank.get(parsed.rank)!.add(parsed.suit)
  }
  let count = 0
  for (const suits of suitsByRank.values()) {
    if (suits.size === 2) count++
  }
  return count > 0 ? [{ fanId: 65, count }] : []
}

// 66. Two Concealed Pungs — 2 pts. §3.8.1 p.16 / App.1 p.40: "Two Pungs
// achieved without melding."
//
// KNOWN BUG (fixtured in fans-2.test.ts, not fixed here): this detector
// only counts s.kind === 'pung', excluding concealed kongs. That was
// believed to be a deliberate rulebook distinction from Three/Four
// Concealed Pungs' "Pungs or Kongs" wording, but a direct re-read of
// App.1 p.40's own worked example for fan 66 ("Concealed Pung; Concealed
// Kong... Combined with Double Pung, Concealed Kong...") shows the example
// itself composes "Two" from one concealed pung PLUS one concealed kong —
// contradicting the "pungs only" reading. Should filter on
// `s.kind !== 'chow'`, matching every sibling concealed-pung-count
// detector (fans-16.ts's Three Concealed Pungs, fans-64.ts's Four
// Concealed Pungs).
function detectTwoConcealedPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const count = sets.filter((s) => s.kind === 'pung' && s.concealed).length
  return count === 2 ? [{ fanId: 66, count: 1 }] : []
}

// 67. Concealed Kong — 2 pts, PER QUALIFYING KONG. §3.8.1 p.16 / App.1 p.40:
// "A Kong created from four self-drawn identical tiles, declared without
// melding." Generic countable fan; Two Concealed Kongs (48) excludes it at
// count 2 via exclusions.ts's [48,67] (added this session), for the same
// "named exact-count fan implies the generic per-unit fan" reason as
// Dragon Pung/Double Pung above.
function detectConcealedKong(ctx: HandContext): FanMatch[] {
  const count = ctx.melds.filter((m) => m.kind === 'kong' && m.exposure === 'concealed').length
  return count > 0 ? [{ fanId: 67, count }] : []
}

// 68. All Simples — 2 pts. §3.8.1 p.16 / App.1 p.40: "A hand formed
// entirely without Terminal or Honor tiles." Whole-hand tile-membership
// check.
function detectAllSimples(ctx: HandContext): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  return allTileIds.every((id) => !isTerminalTypeId(id) && !isHonorTypeId(id)) ? [{ fanId: 68, count: 1 }] : []
}

export const FANS_2_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  59: detectDragonPung,
  60: detectPrevalentWind,
  61: detectSeatWind,
  62: detectConcealedHand,
  63: detectAllChows,
  64: detectTileHog,
  65: detectDoublePung,
  66: detectTwoConcealedPungs,
  67: detectConcealedKong,
  68: detectAllSimples,
}
