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
// same zero-meld shape but a self-drawn win) by winMethod alone.
function detectConcealedHand(ctx: HandContext): FanMatch[] {
  return ctx.melds.length === 0 && ctx.winMethod === 'discard' ? [{ fanId: 62, count: 1 }] : []
}

// 63. All Chows — 2 pts. §3.8.1 p.16 / App.1 p.39: "A hand composed
// entirely of Chows (and a pair), with no Honor tiles at all." Also
// excludes fan 76 (No Honors) via the rulebook's own "No Honors is implied"
// Non-Repeat note (already in exclusions.ts).
function detectAllChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (!sets.every((s) => s.kind === 'chow')) return []
  if (isHonorTypeId(ctx.decomposition.pair)) return []
  return [{ fanId: 63, count: 1 }]
}

// 64. Tile Hog — 2 pts. §3.8.1 p.16 / App.1 p.40: "Using all four copies of
// one tile type in the hand, without those four being declared as a Kong."
// Whole-hand tile-count check (concealed tiles + meld tiles combined,
// tracking whether a kong was ever declared for that type) rather than a
// decomposition-based one — the 4 copies can be split across e.g. a pung
// plus an adjacent chow.
function detectTileHog(ctx: HandContext): FanMatch[] {
  const counts = new Map<TileTypeId, number>()
  const kongTypes = new Set<TileTypeId>()
  for (const tile of ctx.concealedTiles) {
    const id = typeIdOfInstance(tile)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  for (const meld of ctx.melds) {
    const id = meldTileTypeId(meld)
    counts.set(id, (counts.get(id) ?? 0) + meld.tiles.length)
    if (meld.kind === 'kong') kongTypes.add(id)
  }
  for (const [id, count] of counts) {
    if (count === 4 && !kongTypes.has(id)) return [{ fanId: 64, count: 1 }]
  }
  return []
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
// achieved without melding." Deliberately PUNGS only (not kongs, unlike
// Three/Four Concealed Pungs' "Pungs or Kongs" wording) and an exact count
// of 2 — naturally distinct from any 3-or-4-count sibling fan by construction.
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
