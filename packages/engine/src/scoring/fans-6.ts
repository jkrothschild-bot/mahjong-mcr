import { typeIdOfInstance } from '../tiles.js'
import type { FanMatch, HandContext } from './types.js'
import { allSets, isDragonTypeId, isWindTypeId, parseSuited, SUIT_PERMUTATIONS, type SuitChar } from './set-helpers.js'

// 49. All Pungs — 6 pts. §3.8.1 p.16 / App.1 p.38: "A hand formed by four
// Pungs (or Kongs) and one pair." Any tile types — just no chows.
function detectAllPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  return sets.every((s) => s.kind !== 'chow') ? [{ fanId: 49, count: 1 }] : []
}

// 50. Half Flush — 6 pts. §3.8.1 p.16 / App.1 p.38: "Formed by tiles from
// any one of the three suits, in combination with Honor tiles." Requires
// at least one honor tile present — a hand of one suit with ZERO honors is
// Full Flush's (fan 22) territory instead, keeping the two naturally
// mutually exclusive by definition (matching the "half" vs "full" naming),
// no exclusion-table entry needed.
function detectHalfFlush(ctx: HandContext): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  const suits = new Set<SuitChar>()
  let hasHonor = false
  for (const id of allTileIds) {
    const parsed = parseSuited(id)
    if (parsed) suits.add(parsed.suit)
    else hasHonor = true
  }
  if (!hasHonor || suits.size !== 1) return []
  return [{ fanId: 50, count: 1 }]
}

// 51. Mixed Shifted Chows — 6 pts. §3.8.1 p.16 / App.1 p.38: "Three chows,
// one in each suit, each shifted up one number from the last." Same
// "some suit assignment gives 3 consecutive ranks" search as Mixed Shifted
// Pungs (fans-8.ts), applied to chows instead.
function detectMixedShiftedChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const chows = sets.filter((s) => s.kind === 'chow')
  const ranksBySuit: Record<SuitChar, Set<number>> = { C: new Set(), D: new Set(), B: new Set() }
  for (const s of chows) {
    const p = parseSuited(s.typeId)
    if (p) ranksBySuit[p.suit].add(p.rank)
  }
  for (let r = 1; r <= 7; r++) {
    const targets = [r, r + 1, r + 2]
    for (const perm of SUIT_PERMUTATIONS) {
      if (targets.every((rank, i) => ranksBySuit[perm[i]!].has(rank))) {
        return [{ fanId: 51, count: 1 }]
      }
    }
  }
  return []
}

// 52. All Types — 6 pts. §3.8.1 p.16 / App.1 p.38: "A hand in which each of
// the five sets is composed of a different type of tile (Characters,
// Bamboo, Dots, Winds, and Dragons)." The 4 real sets plus the pair count
// as "five sets" here — each must be a different one of the 5 categories.
// Since there are exactly 5 possible categories and 5 groups, "5 distinct
// categories represented" is equivalent to every category appearing
// exactly once.
function detectAllTypes(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  if (sets.length !== 4) return []

  const categoryOf = (typeId: string): string | null => {
    const parsed = parseSuited(typeId)
    if (parsed) return parsed.suit
    if (isWindTypeId(typeId)) return 'wind'
    if (isDragonTypeId(typeId)) return 'dragon'
    return null
  }

  const categories = new Set<string>()
  for (const s of sets) {
    const category = categoryOf(s.typeId)
    if (category) categories.add(category)
  }
  const pairCategory = categoryOf(ctx.decomposition.pair)
  if (pairCategory) categories.add(pairCategory)

  return categories.size === 5 ? [{ fanId: 52, count: 1 }] : []
}

// 53. Melded Hand — 6 pts. §3.8.1 p.16 / App.1 p.38: "Every set in the hand
// (chow, pung, kong, and pair) must be completed with tiles discarded by
// other players. All sets must be exposed, and the player goes out on a
// single wait off another player." All 4 sets are already exposed melds
// (nothing left in the concealed-side decomposition), and the win itself
// is a discard claim completing the pair. Inevitably implies Single Wait
// (fan 79) — already excluded via exclusions.ts's [53, 79].
function detectMeldedHand(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  if (ctx.decomposition.sets.length !== 0) return []
  if (ctx.melds.length !== 4) return []
  if (!ctx.melds.every((m) => m.exposure === 'exposed')) return []
  if (ctx.winMethod !== 'discard') return []
  return [{ fanId: 53, count: 1 }]
}

// 54. Two Dragon Pungs — 6 pts. §3.8.1 p.16 / App.1 p.38: "Two pungs (or
// kongs) of Dragon tiles." Exactly 2 (not 3 — that's Big Three Dragons,
// fan 2; not 2-with-a-dragon-pair — that's Little Three Dragons, fan 10,
// which explicitly excludes this fan already).
function detectTwoDragonPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const dragonPungs = sets.filter((s) => s.kind !== 'chow' && isDragonTypeId(s.typeId))
  return dragonPungs.length === 2 ? [{ fanId: 54, count: 1 }] : []
}

export const FANS_6_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  49: detectAllPungs,
  50: detectHalfFlush,
  51: detectMixedShiftedChows,
  52: detectAllTypes,
  53: detectMeldedHand,
  54: detectTwoDragonPungs,
}
