import { isSevenPairs } from '../win-detection.js'
import { typeIdOfInstance } from '../tiles.js'
import type { FanMatch, HandContext } from './types.js'
import { allSets, combinations3, isHonorTypeId, parseSuited } from './set-helpers.js'

// 19. Seven Pairs — 24 pts. §3.8.1 p.15 / App.1 p.29: "A hand formed by
// seven pairs." Direct reuse of win-detection.ts's isSevenPairs (M1). Note:
// Seven Shifted Pairs (fan 6, 88 pts) is a stricter version of this same
// shape — see exclusions.ts's [6, 19] entry for why that pair is excluded.
// Gated on ctx.specialShape === 'sevenPairs' — see fans-88.ts's
// detectSevenShiftedPairs comment for why (avoids piggybacking onto a
// standard-decomposition candidate of the same 14 tiles).
function detectSevenPairs(ctx: HandContext): FanMatch[] {
  return ctx.specialShape === 'sevenPairs' && isSevenPairs(ctx.concealedTiles, ctx.melds)
    ? [{ fanId: 19, count: 1 }]
    : []
}

// The three "knitted sequences" — {1,4,7}, {2,5,8}, {3,6,9} — identified by
// rank mod 3 (1,4,7 -> 1; 2,5,8 -> 2; 3,6,9 -> 0).
function knittedSequenceIndex(rank: number): number {
  return rank % 3
}

// 20. Greater Honors and Knitted Tiles — 24 pts. §3.8.1 p.14 / App.1 p.29:
// "Formed by 7 single Honors (one of every Wind and Dragon), and singles of
// suit tiles belonging to separate Knitted sequences (for example, 1-4-7 of
// Bamboos, 2-5-8 of Characters, and 3-6-9 of Dots)." This is a 14-single,
// no-pair shape (§3.7.2.2 shape 3), verified against the rulebook's own
// worked example image (page 29): 7 distinct honors + 7 suit singles split
// 3+2+2 across three DIFFERENT knitted sequences, one per suit (that
// specific 2/2/3 split is just what the one example happens to show, not a
// stated formula — the implemented rule is the more general one the text
// and example both support: each suit contributes a non-empty subset of
// its own assigned sequence, all three sequences used, totalling 7).
// Documented as a judgment call in docs/rules/decisions.md.
function detectGreaterHonorsAndKnittedTiles(ctx: HandContext): FanMatch[] {
  if (ctx.melds.length !== 0) return []
  if (ctx.concealedTiles.length !== 14) return []
  const typeIds = ctx.concealedTiles.map(typeIdOfInstance)
  if (new Set(typeIds).size !== 14) return [] // must be 14 distinct singles, no pair/duplicate at all

  const honorIds = typeIds.filter(isHonorTypeId)
  if (honorIds.length !== 7) return [] // "Greater" requires ALL 7 honors (vs "Lesser", fan 34, any subset)

  const suitIds = typeIds.filter((id) => !isHonorTypeId(id))
  if (suitIds.length !== 7) return []
  const parsed = suitIds.map(parseSuited)
  if (parsed.some((p) => p === null)) return [] // shouldn't happen (only honors+suits exist), defensive

  const bySuit: Record<'C' | 'D' | 'B', number[]> = { C: [], D: [], B: [] }
  for (const p of parsed) bySuit[p!.suit].push(p!.rank)

  const seqIndices: (number | null)[] = (['C', 'D', 'B'] as const).map((suit) => {
    const ranks = bySuit[suit]
    if (ranks.length === 0) return null // every suit must contribute at least one tile
    const sequences = new Set(ranks.map(knittedSequenceIndex))
    return sequences.size === 1 ? sequences.values().next().value! : null // all of one suit's ranks must share one sequence
  })
  if (seqIndices.some((idx) => idx === null)) return []
  if (new Set(seqIndices).size !== 3) return [] // the three suits must use three DIFFERENT sequences

  return [{ fanId: 20, count: 1 }]
}

const EVEN_RANKS = new Set([2, 4, 6, 8])

// 21. All Even Pungs — 24 pts. §3.8.1 p.15 / App.1 p.30: "A hand formed
// with Pungs of even-numbered suit tiles, and a pair of the same." No
// chows, no honors, no odd ranks anywhere (sets or pair).
function detectAllEvenPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  // See fans-2.ts's detectAllChows comment: a knittedStraight candidate's
  // `sets` can be empty or partial, which would otherwise make the "no
  // chows"/"every set is even" checks below pass vacuously or incompletely
  // (docs/rules/decisions.md #20).
  if (sets.length !== 4) return []
  if (sets.some((s) => s.kind === 'chow')) return []
  const parsedSets = sets.map((s) => parseSuited(s.typeId))
  if (parsedSets.some((p) => p === null)) return []
  if (!parsedSets.every((p) => EVEN_RANKS.has(p!.rank))) return []
  const pairParsed = parseSuited(ctx.decomposition.pair)
  if (!pairParsed || !EVEN_RANKS.has(pairParsed.rank)) return []
  return [{ fanId: 21, count: 1 }]
}

// 22. Full Flush — 24 pts. §3.8.1 p.15 / App.1 p.30: "All the tiles are in
// the same suit." A whole-hand tile-membership check (like All Green),
// independent of set structure — no honors anywhere (hence the "does not
// combine with No Honors" note: Full Flush inevitably implies No Honors).
function detectFullFlush(ctx: HandContext): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  const parsed = allTileIds.map(parseSuited)
  if (parsed.some((p) => p === null)) return [] // any honor disqualifies
  const suits = new Set(parsed.map((p) => p!.suit))
  return suits.size === 1 ? [{ fanId: 22, count: 1 }] : []
}

// 23. Pure Triple Chow — 24 pts. §3.8.1 p.15 / App.1 p.30: "Three chows of
// the same numerical sequence and in the same suit." Exactly 3 identical
// chows among the sets (not 4 — that's Quadruple Chow, fan 14; kept
// mutually exclusive by exact count like the Winds/Dragons/Kongs families).
function detectPureTripleChow(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const chows = sets.filter((s) => s.kind === 'chow')
  const countByTypeId = new Map<string, number>()
  for (const c of chows) countByTypeId.set(c.typeId, (countByTypeId.get(c.typeId) ?? 0) + 1)
  const hasExactlyThree = [...countByTypeId.values()].some((count) => count === 3)
  return hasExactlyThree ? [{ fanId: 23, count: 1 }] : []
}

// 24. Pure Shifted Pungs — 24 pts. §3.8.1 p.15 / App.1 p.32: "Three Pungs
// or Kongs of the same suit, each shifted one up from the last."
//
// FIXED (docs/rules/decisions.md #34): used to require the WHOLE hand to
// have exactly 3 pung-type sets, incorrectly rejecting a hand with a 4th,
// unrelated pung/kong alongside a genuine qualifying trio (found via the
// validation harness, seeds 1613793028/3097971845 — both had a 4th pung in
// a different suit or non-adjacent rank). Now searches every 3-combination
// of the hand's pung-type sets for one that's same-suit and consecutively
// shifted, rather than requiring the count to be exactly 3. This also now
// fires on a genuine Four Pure Shifted Pungs hand (fan 15, all 4
// consecutively shifted) — the old exact-count check happened to also
// prevent that overlap as a side effect; now handled explicitly via
// exclusions.ts's new [15,24] entry.
function detectPureShiftedPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const pungs = sets.filter((s) => s.kind !== 'chow')
  for (const trio of combinations3(pungs)) {
    const parsed = trio.map((s) => parseSuited(s.typeId))
    if (parsed.some((p) => p === null)) continue
    const suits = new Set(parsed.map((p) => p!.suit))
    if (suits.size !== 1) continue
    const ranks = parsed.map((p) => p!.rank).sort((a, b) => a - b)
    if (ranks[1] === ranks[0]! + 1 && ranks[2] === ranks[1]! + 1) return [{ fanId: 24, count: 1 }]
  }
  return []
}

function detectAllTilesInRankSet(ctx: HandContext, ranks: ReadonlySet<number>, fanId: number): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  const parsed = allTileIds.map(parseSuited)
  if (parsed.some((p) => p === null)) return [] // no honors
  if (!parsed.every((p) => ranks.has(p!.rank))) return []
  return [{ fanId, count: 1 }]
}

const UPPER_RANKS = new Set([7, 8, 9])
const MIDDLE_RANKS = new Set([4, 5, 6])
const LOWER_RANKS = new Set([1, 2, 3])

// 25. Upper Tiles — 24 pts. §3.8.1 p.15 / App.1 p.31: "A hand consisting
// entirely of 7, 8, and 9 tiles."
function detectUpperTiles(ctx: HandContext): FanMatch[] {
  return detectAllTilesInRankSet(ctx, UPPER_RANKS, 25)
}

// 26. Middle Tiles — 24 pts. §3.8.1 p.15 / App.1 p.31: "A hand consisting
// entirely of 4, 5, and 6 tiles."
function detectMiddleTiles(ctx: HandContext): FanMatch[] {
  return detectAllTilesInRankSet(ctx, MIDDLE_RANKS, 26)
}

// 27. Lower Tiles — 24 pts. §3.8.1 p.15 / App.1 p.31: "A hand consisting
// entirely of 1, 2, and 3 tiles."
function detectLowerTiles(ctx: HandContext): FanMatch[] {
  return detectAllTilesInRankSet(ctx, LOWER_RANKS, 27)
}

export const FANS_24_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  19: detectSevenPairs,
  20: detectGreaterHonorsAndKnittedTiles,
  21: detectAllEvenPungs,
  22: detectFullFlush,
  23: detectPureTripleChow,
  24: detectPureShiftedPungs,
  25: detectUpperTiles,
  26: detectMiddleTiles,
  27: detectLowerTiles,
}
