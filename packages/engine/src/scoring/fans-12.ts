import { decomposeHand } from '../win-detection.js'
import { typeIdOf, typeIdOfInstance, type Rank, type Suit, type TileInstanceId, type TileTypeId } from '../tiles.js'
import type { Meld, Seat } from '../meld.js'
import type { FanMatch, HandContext } from './types.js'
import { allSets, isHonorTypeId, isWindTypeId, parseSuited } from './set-helpers.js'

function knittedSequenceIndex(rank: number): number {
  return rank % 3
}

// 34. Lesser Honors and Knitted Tiles — 12 pts. §3.8.1 p.15 / App.1 p.34:
// "A hand made of singles of the following tiles: Any Honors, along with
// Suit tiles that belong to different Knitted sequences... each of the 3
// suits must belong to a different Knitted sequence." Same 14-distinct-
// singles-no-pair shape as Greater (fan 20), but "Any Honors" (not
// necessarily all 7) rather than exactly 7. Combinatorially, a valid split
// needs 3-9 suit tiles (1-3 per suit, 3 suits) and therefore 5-11 honors,
// capped at the 7 that exist — so honors is always 5, 6, or 7. Greater
// claims exactly 7, so Lesser is exactly 5 or 6 (mutually exclusive with
// Greater by count, same pattern as the Winds/Dragons/Kongs fan families).
function detectLesserHonorsAndKnittedTiles(ctx: HandContext): FanMatch[] {
  if (ctx.melds.length !== 0) return []
  if (ctx.concealedTiles.length !== 14) return []
  const typeIds = ctx.concealedTiles.map(typeIdOfInstance)
  if (new Set(typeIds).size !== 14) return []

  const honorIds = typeIds.filter(isHonorTypeId)
  if (honorIds.length !== 5 && honorIds.length !== 6) return []

  const suitIds = typeIds.filter((id) => !isHonorTypeId(id))
  const parsed = suitIds.map(parseSuited)
  if (parsed.some((p) => p === null)) return []

  const bySuit: Record<'C' | 'D' | 'B', number[]> = { C: [], D: [], B: [] }
  for (const p of parsed) bySuit[p!.suit].push(p!.rank)

  const seqIndices: (number | null)[] = (['C', 'D', 'B'] as const).map((suit) => {
    const ranks = bySuit[suit]
    if (ranks.length === 0) return null
    const sequences = new Set(ranks.map(knittedSequenceIndex))
    return sequences.size === 1 ? sequences.values().next().value! : null
  })
  if (seqIndices.some((idx) => idx === null)) return []
  if (new Set(seqIndices).size !== 3) return []

  return [{ fanId: 34, count: 1 }]
}

const KNITTED_SEQUENCES: readonly number[][] = [
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
]
const SUIT_PERMUTATIONS: readonly Suit[][] = [
  ['characters', 'dots', 'bamboo'],
  ['characters', 'bamboo', 'dots'],
  ['dots', 'characters', 'bamboo'],
  ['dots', 'bamboo', 'characters'],
  ['bamboo', 'characters', 'dots'],
  ['bamboo', 'dots', 'characters'],
]

function dummyMelds(count: number): Meld[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `dummy-${i}`,
    kind: 'pung',
    exposure: 'exposed',
    tiles: [],
    ownerSeat: 0 as Seat,
  }))
}

// 35. Knitted Straight — 12 pts. §3.8.1 p.15 / App.1 p.34-35: "A special
// Straight which is formed not with standard chows but with 3 different
// Knitted sequences... 1-4-7 of Dots, 2-5-8 of Characters, and 3-6-9 of
// Bamboos." Unlike fans 20/34 (partial, any non-empty subset per suit),
// this is the FULL 9-tile pattern (all 3 numbers of each sequence, one
// sequence per suit) standing in for 3 of the 4 required sets — confirmed
// via App.1 p.35's example 3 (3-6-9 Characters + a pung of East + a pair
// of Red Dragon = 9 knitted + 1 more set + pair). Since decomposeHand has
// no notion of a "knitted" set, this is checked directly: try every
// suit-to-sequence assignment, remove the 9 matching tiles from
// concealedTiles if present, and confirm the remainder (plus however many
// real melds already exist) forms the remaining set(s) + pair via
// decomposeHand directly (melds.length can only be 0 or 1 for this to fit
// within 4 total sets).
function detectKnittedStraight(ctx: HandContext): FanMatch[] {
  const additionalSetsNeeded = 4 - ctx.melds.length - 3
  if (additionalSetsNeeded < 0 || additionalSetsNeeded > 1) return []

  for (const suitOrder of SUIT_PERMUTATIONS) {
    const neededTypeIds: TileTypeId[] = []
    for (let i = 0; i < 3; i++) {
      for (const rank of KNITTED_SEQUENCES[i]!) {
        neededTypeIds.push(typeIdOf({ kind: 'suit', suit: suitOrder[i]!, rank: rank as Rank }))
      }
    }

    const remaining: TileInstanceId[] = ctx.concealedTiles.slice()
    let allFound = true
    for (const typeId of neededTypeIds) {
      const idx = remaining.findIndex((t) => typeIdOfInstance(t) === typeId)
      if (idx === -1) {
        allFound = false
        break
      }
      remaining.splice(idx, 1)
    }
    if (!allFound) continue

    const fakeMelds = dummyMelds(4 - additionalSetsNeeded)
    if (decomposeHand(remaining, fakeMelds).length > 0) {
      return [{ fanId: 35, count: 1 }]
    }
  }
  return []
}

function detectAllTilesInRankSet(ctx: HandContext, ranks: ReadonlySet<number>, fanId: number): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  const parsed = allTileIds.map(parseSuited)
  if (parsed.some((p) => p === null)) return []
  if (!parsed.every((p) => ranks.has(p!.rank))) return []
  return [{ fanId, count: 1 }]
}

const UPPER_FOUR_RANKS = new Set([6, 7, 8, 9])
const LOWER_FOUR_RANKS = new Set([1, 2, 3, 4])

// 36. Upper Four — 12 pts. §3.8.1 p.15 / App.1 p.34-35: "A hand created
// solely with suit tiles 6 through 9."
function detectUpperFour(ctx: HandContext): FanMatch[] {
  return detectAllTilesInRankSet(ctx, UPPER_FOUR_RANKS, 36)
}

// 37. Lower Four — 12 pts. §3.8.1 p.15 / App.1 p.36: "A hand created with
// suit tiles 1 through 4 only."
function detectLowerFour(ctx: HandContext): FanMatch[] {
  return detectAllTilesInRankSet(ctx, LOWER_FOUR_RANKS, 37)
}

// 38. Big Three Winds — 12 pts. §3.8.1 p.15 / App.1 p.36: "A hand that
// includes one pung (or kong) of each of the three winds." Exactly 3 wind
// pungs (any pair) — a hand with 3 wind pungs AND a 4th-wind pair is Little
// Four Winds (fan 9, 64 pts) instead; exclusions.ts's existing [9, 38] pair
// (found in session 1's comprehensive table) resolves that overlap in
// scoreHand's favor of the higher-scoring fan 9.
function detectBigThreeWinds(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const windPungs = sets.filter((s) => s.kind !== 'chow' && isWindTypeId(s.typeId))
  return windPungs.length === 3 ? [{ fanId: 38, count: 1 }] : []
}

export const FANS_12_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  34: detectLesserHonorsAndKnittedTiles,
  35: detectKnittedStraight,
  36: detectUpperFour,
  37: detectLowerFour,
  38: detectBigThreeWinds,
}
