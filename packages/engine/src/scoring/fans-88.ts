import { groupConcealedByType, isThirteenOrphans } from '../win-detection.js'
import { typeIdOfInstance, type TileTypeId } from '../tiles.js'
import type { FanMatch, HandContext } from './types.js'
import { allSets, isDragonTypeId, isWindTypeId, parseSuited } from './set-helpers.js'

// 1. Big Four Winds — 88 pts. §3.8.1 p.14 / App.1 p.24: "Pungs or Kongs of
// all four Wind Tiles." Only 4 copies of each wind exist, so "4 sets, each
// a wind pung/kong" structurally guarantees one of each of the 4 winds —
// two pungs of the same wind would need 6 copies of it.
function detectBigFourWinds(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const windPungs = sets.filter((s) => s.kind !== 'chow' && isWindTypeId(s.typeId))
  return windPungs.length === 4 ? [{ fanId: 1, count: 1 }] : []
}

// 2. Big Three Dragons — 88 pts. §3.8.1 p.14 / App.1 p.24: "Pungs or Kongs
// of all three Dragon Tiles." Same structural argument as Big Four Winds —
// only 3 dragon types exist, 4 copies each.
function detectBigThreeDragons(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const dragonPungs = sets.filter((s) => s.kind !== 'chow' && isDragonTypeId(s.typeId))
  return dragonPungs.length === 3 ? [{ fanId: 2, count: 1 }] : []
}

const GREEN_TYPE_IDS = new Set<TileTypeId>(['B2', 'B3', 'B4', 'B6', 'B8', 'DG'])

// 3. All Green — 88 pts. §3.8.1 p.14 / App.1 p.24: "chows, pungs and
// pair(s) made up solely of 'green' tiles: 2,3,4,6,8 Bam, and Green
// Dragon." A whole-hand tile-membership check, independent of how the
// tiles are grouped into sets — doesn't need the decomposition at all.
function detectAllGreen(ctx: HandContext): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  const allGreen = allTileIds.every((id) => GREEN_TYPE_IDS.has(id))
  return allGreen ? [{ fanId: 3, count: 1 }] : []
}

const NINE_GATES_BASE_COUNTS: Readonly<Record<number, number>> = {
  1: 3, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 3,
}

// 4. Nine Gates — 88 pts. §3.8.1 p.14 / App.1 p.26: "Holding the
// 1,1,1,2,3,4,5,6,7,8,9,9,9 tiles in any one suit, creating the nine-sided
// wait of 1-9." A shape check on the raw concealed tiles (like a special
// shape), not a decomposition match: the base 13-tile hand plus exactly one
// more tile anywhere in 1-9 of that suit.
function detectNineGates(ctx: HandContext): FanMatch[] {
  if (ctx.melds.length !== 0) return []
  if (ctx.concealedTiles.length !== 14) return []
  const parsed = ctx.concealedTiles.map((tile) => parseSuited(typeIdOfInstance(tile)))
  if (parsed.some((p) => p === null)) return [] // any honor/bonus tile disqualifies immediately
  const suits = new Set(parsed.map((p) => p!.suit))
  if (suits.size !== 1) return []

  const counts: Record<number, number> = {}
  for (const p of parsed) {
    counts[p!.rank] = (counts[p!.rank] ?? 0) + 1
  }

  let extraRank = -1
  for (let rank = 1; rank <= 9; rank++) {
    const diff = (counts[rank] ?? 0) - NINE_GATES_BASE_COUNTS[rank]!
    if (diff === 0) continue
    if (diff === 1 && extraRank === -1) {
      extraRank = rank
      continue
    }
    return [] // any other difference (short, or more than one extra) isn't Nine Gates
  }
  return extraRank !== -1 ? [{ fanId: 4, count: 1 }] : []
}

// 5. Four Kongs — 88 pts. §3.8.1 p.14 / App.1 p.25: "Any hand that includes
// four kongs. They may be concealed or melded." Kongs are always tracked
// as melds (M1 design — even a concealed kong lives in Hand.melds with
// exposure:'concealed'), so this is a pure meld count, no decomposition
// needed.
function detectFourKongs(ctx: HandContext): FanMatch[] {
  const kongCount = ctx.melds.filter((m) => m.kind === 'kong').length
  return kongCount === 4 ? [{ fanId: 5, count: 1 }] : []
}

// 6. Seven Shifted Pairs — 88 pts. §3.8.1 p.14 / App.1 p.26: "seven pairs of
// the same suit, each shifted one up from the last." A stricter version of
// the base Seven Pairs shape (win-detection.ts's isSevenPairs): same
// concealed-only + 7-distinct-pairs check, plus the 7 types must be one
// suit with consecutive ranks.
//
// Gated on ctx.specialShape === 'sevenPairs' (not just re-derived from raw
// tiles): scoreHand trials the SAME 14 tiles as several independent
// candidates (the special shape, plus every standard-decomposition
// candidate decomposeHand finds, e.g. reading three shifted pairs as a
// chow instead). Without this gate, this detector would also fire on a
// standard-decomposition candidate whose tiles just happen to structurally
// look like shifted pairs too — illegitimately combining a pair-based fan
// with sets that candidate is reading as chows/pungs instead, violating
// the Non-Separation Principle (§3.9.1.5: a fixed set combination can't be
// rearranged to also claim a different fan). Found via a failing test once
// the 1/2-point tiers added chow/pair-based fans that could piggyback on a
// standard decomposition of the same seven-shifted-pairs tile set.
function detectSevenShiftedPairs(ctx: HandContext): FanMatch[] {
  if (ctx.specialShape !== 'sevenPairs') return []
  if (ctx.melds.length !== 0) return []
  if (ctx.concealedTiles.length !== 14) return []
  const counts = groupConcealedByType(ctx.concealedTiles)
  const typeIds = Object.keys(counts)
  if (typeIds.length !== 7) return []
  if (!Object.values(counts).every((c) => c === 2)) return []

  const parsed = typeIds.map(parseSuited)
  if (parsed.some((p) => p === null)) return [] // any honor type disqualifies immediately
  const suits = new Set(parsed.map((p) => p!.suit))
  if (suits.size !== 1) return []

  const ranks = parsed.map((p) => p!.rank).sort((a, b) => a - b)
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1]! + 1) return []
  }
  return [{ fanId: 6, count: 1 }]
}

// 7. Thirteen Orphans — 88 pts. §3.7.2.2 p.13 (structural shape) / §3.8.1
// p.14 / App.1 p.26. Direct reuse of win-detection.ts's isThirteenOrphans
// (already implemented and tested in M1) — no separate logic needed here.
// Gated on ctx.specialShape (see fan 6's comment above for why) — harmless
// in practice today, since a genuine 13-orphan tile multiset structurally
// can never also admit a standard decomposition, but kept for the same
// correctness reason and in case that ever changes.
function detectThirteenOrphans(ctx: HandContext): FanMatch[] {
  return ctx.specialShape === 'thirteenOrphans' && isThirteenOrphans(ctx.concealedTiles, ctx.melds)
    ? [{ fanId: 7, count: 1 }]
    : []
}

export const FANS_88_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  1: detectBigFourWinds,
  2: detectBigThreeDragons,
  3: detectAllGreen,
  4: detectNineGates,
  5: detectFourKongs,
  6: detectSevenShiftedPairs,
  7: detectThirteenOrphans,
}
