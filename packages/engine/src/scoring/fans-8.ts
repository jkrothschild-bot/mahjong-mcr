import { typeIdOfInstance, type TileTypeId } from '../tiles.js'
import type { FanMatch, HandContext } from './types.js'
import { allSets, parseSuited, type ParsedSuited } from './set-helpers.js'

const SUIT_CHARS = ['C', 'D', 'B'] as const
type SuitChar = (typeof SUIT_CHARS)[number]
const SUIT_PERMUTATIONS: readonly SuitChar[][] = [
  ['C', 'D', 'B'],
  ['C', 'B', 'D'],
  ['D', 'C', 'B'],
  ['D', 'B', 'C'],
  ['B', 'C', 'D'],
  ['B', 'D', 'C'],
]

// 39. Mixed Straight — 8 pts. §3.8.1 p.16 / App.1 p.36: "A straight (tiles 1
// through 9) formed by chows from all three suits." Chow(1) + chow(4) +
// chow(7), each in a DIFFERENT suit (contrast with Pure Straight, fan 28,
// which needs all three in the SAME suit).
function detectMixedStraight(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const suitsByRank: Record<number, Set<SuitChar>> = { 1: new Set(), 4: new Set(), 7: new Set() }
  for (const s of sets) {
    if (s.kind !== 'chow') continue
    const parsed = parseSuited(s.typeId)
    if (!parsed) continue
    if (parsed.rank === 1 || parsed.rank === 4 || parsed.rank === 7) {
      suitsByRank[parsed.rank]!.add(parsed.suit)
    }
  }
  for (const s1 of suitsByRank[1]!) {
    for (const s4 of suitsByRank[4]!) {
      if (s4 === s1) continue
      for (const s7 of suitsByRank[7]!) {
        if (s7 === s1 || s7 === s4) continue
        return [{ fanId: 39, count: 1 }]
      }
    }
  }
  return []
}

const REVERSIBLE_TYPE_IDS = new Set<TileTypeId>([
  'D1', 'D2', 'D3', 'D4', 'D5', 'D8', 'D9',
  'B2', 'B4', 'B5', 'B6', 'B8', 'B9',
  'DW',
])

// 40. Reversible Tiles — 8 pts. §3.8.1 p.16 / App.1 p.37: "A hand created
// entirely with those tiles which are vertically symmetrical... the 1, 2,
// 3, 4, 5, 8, and 9 Dots, the 2, 4, 5, 6, 8, and 9 Bams, and the White
// Dragon." A whole-hand tile-membership check, like All Green/Full Flush.
function detectReversibleTiles(ctx: HandContext): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  return allTileIds.every((id) => REVERSIBLE_TYPE_IDS.has(id)) ? [{ fanId: 40, count: 1 }] : []
}

// 41. Mixed Triple Chow — 8 pts. §3.8.1 p.16 / App.1 p.37: "Three chows of
// the same numerical sequence, one in each suit." Contrast with Pure Triple
// Chow (fan 23, same suit) and Pure Straight/Mixed Straight (different
// ranks, not the same one three times).
function detectMixedTripleChow(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const parsed: ParsedSuited[] = []
  for (const s of sets) {
    if (s.kind !== 'chow') continue
    const p = parseSuited(s.typeId)
    if (p) parsed.push(p)
  }
  for (let rank = 1; rank <= 7; rank++) {
    const suitsWithRank = new Set(parsed.filter((p) => p.rank === rank).map((p) => p.suit))
    if (suitsWithRank.size === 3) return [{ fanId: 41, count: 1 }]
  }
  return []
}

// 42. Mixed Shifted Pungs — 8 pts. §3.8.1 p.16 / App.1 p.37: "Three Pungs
// or Kongs, one in each suit, each shifted up one number from the last."
// One pung per suit, whose ranks — in some suit assignment — form 3
// consecutive numbers (the rulebook doesn't pin a fixed suit-to-position
// mapping, just that the ranks are consecutive across the three suits).
function detectMixedShiftedPungs(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const pungs = sets.filter((s) => s.kind !== 'chow')
  const ranksBySuit: Record<SuitChar, Set<number>> = { C: new Set(), D: new Set(), B: new Set() }
  for (const s of pungs) {
    const p = parseSuited(s.typeId)
    if (p) ranksBySuit[p.suit].add(p.rank)
  }
  for (let r = 1; r <= 7; r++) {
    const targets = [r, r + 1, r + 2]
    for (const perm of SUIT_PERMUTATIONS) {
      if (targets.every((rank, i) => ranksBySuit[perm[i]!].has(rank))) {
        return [{ fanId: 42, count: 1 }]
      }
    }
  }
  return []
}

// 43. Chicken Hand is intentionally NOT a detector here — §3.8.1 p.16 / App.1
// p.37: "A hand that would otherwise earn 0 points (excluding the Flower
// Tiles)." It's a whole-scorer fallback (if no other fan matches, award
// this instead), handled directly in score-hand.ts's scoreOneCandidate
// rather than as a per-fan detector function.

// 44. Last Tile Draw — 8 pts. §3.8.1 p.16 / App.1 p.37: "Going out on a pick
// of the very last tile of the wall. (Points for Self-Drawn may not be
// combined.)" — that exclusion is already in exclusions.ts ([44, 80]).
function detectLastTileDraw(ctx: HandContext): FanMatch[] {
  return ctx.winMethod === 'selfDraw' && ctx.isLastTileOfWall ? [{ fanId: 44, count: 1 }] : []
}

// 45. Last Tile Claim — 8 pts. §3.8.1 p.16 / App.1 p.37: "The last tile (of
// the game) discarded by another player."
function detectLastTileClaim(ctx: HandContext): FanMatch[] {
  return ctx.winMethod === 'discard' && ctx.isLastDiscardOfGame ? [{ fanId: 45, count: 1 }] : []
}

// 46. Out with Replacement Tile — 8 pts. §3.8.1 p.16 / App.1 p.37 (verified
// directly against the rulebook image — this dual condition is the book's
// own text, not an extraction artifact): "Going out off the discard which
// is the last tile in the game. Going out on the replacement tile drawn
// after achieving a kong (not on a Flower replacement)." Note this first
// clause is textually identical to fan 45's own condition — flagged in
// docs/rules/decisions.md as an apparent rulebook redundancy rather than
// silently resolved, since no exclusion between 45/46 is stated anywhere.
function detectOutWithReplacementTile(ctx: HandContext): FanMatch[] {
  const lastDiscardOfGame = ctx.winMethod === 'discard' && ctx.isLastDiscardOfGame
  const kongReplacement = ctx.winMethod === 'selfDraw' && ctx.wonOnKongReplacement
  return lastDiscardOfGame || kongReplacement ? [{ fanId: 46, count: 1 }] : []
}

// 47. Robbing The Kong — 8 pts. §3.8.1 p.16 / App.1 p.37: "Winning off the
// tile that somebody adds to a melded pung (to create a Kong)." Maps
// directly to M1's HandResult.winMethod === 'robKong'.
function detectRobbingTheKong(ctx: HandContext): FanMatch[] {
  return ctx.winMethod === 'robKong' ? [{ fanId: 47, count: 1 }] : []
}

// 48. Two Concealed Kongs — 8 pts. §3.8.1 p.16 / App.1 p.37: "A hand that
// includes two Concealed Kongs."
function detectTwoConcealedKongs(ctx: HandContext): FanMatch[] {
  const count = ctx.melds.filter((m) => m.kind === 'kong' && m.exposure === 'concealed').length
  return count === 2 ? [{ fanId: 48, count: 1 }] : []
}

export const FANS_8_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  39: detectMixedStraight,
  40: detectReversibleTiles,
  41: detectMixedTripleChow,
  42: detectMixedShiftedPungs,
  // 43 (Chicken Hand) deliberately omitted — see comment above.
  44: detectLastTileDraw,
  45: detectLastTileClaim,
  46: detectOutWithReplacementTile,
  47: detectRobbingTheKong,
  48: detectTwoConcealedKongs,
}
