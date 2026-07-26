import { isWinningHand } from '../win-detection.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '../tiles.js'
import type { FanMatch, HandContext } from './types.js'
import { allSets, isDragonTypeId, isHonorTypeId, isTerminalTypeId, isWindTypeId, parseSuited, type SuitChar } from './set-helpers.js'

// 69. Pure Double Chow — 1 pt, PER QUALIFYING RANK. §3.8.1 p.16 / App.1 p.41:
// "Two identical chows in the same suit." Exact count === 2 per (suit,rank)
// key deliberately excludes the count-3 case (Pure Triple Chow, fan 23) and
// count-4 case (Quadruple Chow, fan 14) by construction — both already
// exclude this fan via the original rulebook-transcribed table ([23,69],
// [14,69]).
function detectPureDoubleChow(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const chowCounts = new Map<string, number>()
  for (const s of sets) {
    if (s.kind !== 'chow') continue
    chowCounts.set(s.typeId, (chowCounts.get(s.typeId) ?? 0) + 1)
  }
  let count = 0
  for (const c of chowCounts.values()) {
    if (c === 2) count++
  }
  return count > 0 ? [{ fanId: 69, count }] : []
}

// 70. Mixed Double Chow — 1 pt, PER QUALIFYING RANK. §3.8.1 p.16 / App.1
// p.41: "Two chows of the same numbers, in two different suits." Same
// per-rank counting shape as Double Pung (fans-2.ts); Mixed Triple Chow
// (fan 41, all 3 suits share the rank) excludes this at that rank via
// exclusions.ts's [41,70] (added this session).
function detectMixedDoubleChow(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const suitsByRank = new Map<number, Set<SuitChar>>()
  for (const s of sets) {
    if (s.kind !== 'chow') continue
    const parsed = parseSuited(s.typeId)
    if (!parsed) continue
    if (!suitsByRank.has(parsed.rank)) suitsByRank.set(parsed.rank, new Set())
    suitsByRank.get(parsed.rank)!.add(parsed.suit)
  }
  let count = 0
  for (const suits of suitsByRank.values()) {
    if (suits.size === 2) count++
  }
  return count > 0 ? [{ fanId: 70, count }] : []
}

// 71. Short Straight — 1 pt. §3.8.1 p.16 / App.1 p.41: "Two chows in the
// same suit forming a run of six consecutive numbers (e.g. 1-2-3 and
// 4-5-6)." Existence check (not per-instance counted, unlike 69/70 above —
// this is a shape over a PAIR of chows, not a single-rank property, so
// counting disjoint pairs would need extra bookkeeping this 1-point fan
// doesn't seem to warrant). Four Shifted Chows (16) and Pure Straight (28)
// both trivially contain this shape, excluded via exclusions.ts's [16,71]
// (original table) and [28,71] (added this session).
function detectShortStraight(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const ranksBySuit: Record<SuitChar, number[]> = { C: [], D: [], B: [] }
  for (const s of sets) {
    if (s.kind !== 'chow') continue
    const parsed = parseSuited(s.typeId)
    if (parsed) ranksBySuit[parsed.suit].push(parsed.rank)
  }
  for (const suit of ['C', 'D', 'B'] as const) {
    const ranks = ranksBySuit[suit]
    for (let i = 0; i < ranks.length; i++) {
      for (let j = 0; j < ranks.length; j++) {
        if (i !== j && Math.abs(ranks[i]! - ranks[j]!) === 3) return [{ fanId: 71, count: 1 }]
      }
    }
  }
  return []
}

// 72. Two Terminal Chows — 1 pt. §3.8.1 p.16 / App.1 p.41: "1-2-3 and 7-8-9
// in the same suit." Existence check. Pure Terminal Chows (13),
// Three-Suited Terminal Chows (29), and Pure Straight (28) all trivially
// contain this shape — excluded via [13,72]/[29,72] (original table) and
// [28,72] (added this session).
function detectTwoTerminalChows(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  for (const suit of ['C', 'D', 'B'] as const) {
    const hasLow = sets.some((s) => s.kind === 'chow' && s.typeId === `${suit}1`)
    const hasHigh = sets.some((s) => s.kind === 'chow' && s.typeId === `${suit}7`)
    if (hasLow && hasHigh) return [{ fanId: 72, count: 1 }]
  }
  return []
}

// 73. Pung of Terminals or Honors — 1 pt, PER QUALIFYING SET. §3.8.1 p.16 /
// App.1 p.41: "A Pung or Kong of Ones, Nines, or Winds. (A Dragon pung
// scores 2 points instead — see fan 59.)" Deliberately excludes dragons.
// Every exact-count wind/terminal-pung fan that structurally forces this
// (Big/Little Four Winds, Big Three Winds, All Terminals, All Honors, Nine
// Gates) already excludes fan 73 via the original rulebook-transcribed
// table.
function detectPungOfTerminalsOrHonors(ctx: HandContext): FanMatch[] {
  if (!ctx.decomposition) return []
  const sets = allSets(ctx.melds, ctx.decomposition)
  const count = sets.filter(
    (s) => s.kind !== 'chow' && (isTerminalTypeId(s.typeId) || isWindTypeId(s.typeId)) && !isDragonTypeId(s.typeId),
  ).length
  return count > 0 ? [{ fanId: 73, count }] : []
}

// 74. Melded Kong — 1 pt, PER QUALIFYING KONG. §3.8.1 p.16 / App.1 p.41: "A
// Kong claimed from another player's discard, or promoted from an already-
// melded Pung." Two Melded Kongs (57) excludes this at count 2 via
// exclusions.ts's [57,74] (added this session).
function detectMeldedKong(ctx: HandContext): FanMatch[] {
  const count = ctx.melds.filter((m) => m.kind === 'kong' && m.exposure === 'exposed').length
  return count > 0 ? [{ fanId: 74, count }] : []
}

const SUIT_PREFIXES: readonly SuitChar[] = ['C', 'D', 'B']

// 75. One Voided Suit — 1 pt. §3.8.1 p.16 / App.1 p.41: "A hand using tiles
// from exactly two of the three suits (honors allowed freely)." Exactly 2
// suits represented — a hand using only 1 suit (+ honors) is Half/Full
// Flush's territory instead, so this is implemented as an exact match
// (=== 2), not "at most 2", to avoid this fan silently stacking onto every
// Half/Full Flush hand as well. Judgment call — see docs/rules/decisions.md.
function detectOneVoidedSuit(ctx: HandContext): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  const suits = new Set<SuitChar>()
  for (const id of allTileIds) {
    const parsed = parseSuited(id)
    if (parsed) suits.add(parsed.suit)
  }
  return suits.size === 2 ? [{ fanId: 75, count: 1 }] : []
}

// 76. No Honors — 1 pt. §3.8.1 p.16 / App.1 p.41: "A hand formed entirely of
// suit tiles, without Winds or Dragons."
function detectNoHonors(ctx: HandContext): FanMatch[] {
  const allTileIds = [
    ...ctx.concealedTiles.map(typeIdOfInstance),
    ...ctx.melds.flatMap((m) => m.tiles.map(typeIdOfInstance)),
  ]
  return allTileIds.every((id) => !isHonorTypeId(id)) ? [{ fanId: 76, count: 1 }] : []
}

const STANDARD_TYPE_IDS: readonly TileTypeId[] = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9',
  'WE', 'WS', 'WW', 'WN', 'DR', 'DG', 'DW',
]

// Finds a physical instance of `type` not already present in `used` — needed
// to test "would adding a tile of this type complete the hand" without
// inventing a 5th copy of anything. Instances of each standard type are
// contiguous in TILE_TYPE_BY_ID (see tiles.ts), but a linear scan is simple
// and this only runs for the 3 low-value wait-shape fans below.
function findAvailableInstance(type: TileTypeId, used: ReadonlySet<TileInstanceId>): TileInstanceId | null {
  for (let i = 0; i < TILE_TYPE_BY_ID.length; i++) {
    if (!used.has(i) && typeIdOfInstance(i) === type) return i
  }
  return null
}

type WaitShape = 'edge' | 'closed' | 'single'

// Shared logic for fans 77/78/79 (Edge/Closed/Single Wait). §3.8.1 p.16 /
// App.1 p.42, each fan's own text includes "(not valid if waiting for more
// than one tile)" — so before classifying the SHAPE of the wait, this
// checks how many of the 34 standard tile types would independently
// complete the pre-win (13-tile) hand into ANY recognized winning shape.
// Only when exactly one type works (which must then be the actual winning
// tile) does a shape get classified at all; a genuine multi-sided wait
// returns null for all three fans, matching the rulebook's own carve-out.
//
// Classification, given a unique completing type: if it matches the
// decomposition's pair, that's Single Wait (waiting on a lone tile to pair
// it) — checked first, since a lone-pair wait is unambiguous by
// construction. Otherwise, if it's the middle tile of some chow in this
// decomposition (e.g. holding 4/6, waiting on 5), that's Closed Wait —
// also unambiguous by construction (exactly one rank closes a 2-gap).
// Otherwise, if it's the "3" completing 1-2-3 or the "7" completing 7-8-9
// specifically (the only two chow shapes with no possible tile on the far
// side), that's Edge Wait. Any other position (the low or high end of a
// non-terminal chow — an inherently two-sided shape) classifies as none of
// the three, which is correct: MCR doesn't name a fan for a plain open wait.
function classifyWait(ctx: HandContext): WaitShape | null {
  if (!ctx.winningTile || !ctx.decomposition) return null
  const idx = ctx.concealedTiles.indexOf(ctx.winningTile)
  if (idx === -1) return null
  const preWinTiles = ctx.concealedTiles.slice()
  preWinTiles.splice(idx, 1)

  const usedInstances = new Set(preWinTiles)
  const completingTypes: TileTypeId[] = []
  for (const type of STANDARD_TYPE_IDS) {
    const candidate = findAvailableInstance(type, usedInstances)
    if (candidate === null) continue
    const trialTiles = [...preWinTiles, candidate]
    if (isWinningHand(trialTiles, ctx.melds)) completingTypes.push(type)
  }
  if (completingTypes.length !== 1) return null

  const winningType = typeIdOfInstance(ctx.winningTile)
  if (completingTypes[0] !== winningType) return null // defensive; shouldn't happen

  if (ctx.decomposition.pair === winningType) return 'single'

  for (const set of ctx.decomposition.sets) {
    if (set.type !== 'chow') continue
    if (!set.tiles.includes(winningType)) continue
    const start = parseSuited(set.tiles[0])
    const won = parseSuited(winningType)
    if (!start || !won) continue
    if ((start.rank === 1 && won.rank === 3) || (start.rank === 7 && won.rank === 7)) return 'edge'
    if (won.rank === start.rank + 1) return 'closed'
    return null // low or high end of a non-terminal chow — an open wait, not specially named
  }
  return null
}

// 77. Edge Wait — 1 pt.
function detectEdgeWait(ctx: HandContext): FanMatch[] {
  return classifyWait(ctx) === 'edge' ? [{ fanId: 77, count: 1 }] : []
}

// 78. Closed Wait — 1 pt.
function detectClosedWait(ctx: HandContext): FanMatch[] {
  return classifyWait(ctx) === 'closed' ? [{ fanId: 78, count: 1 }] : []
}

// 79. Single Wait — 1 pt.
function detectSingleWait(ctx: HandContext): FanMatch[] {
  return classifyWait(ctx) === 'single' ? [{ fanId: 79, count: 1 }] : []
}

// 80. Self-Drawn — 1 pt. §3.8.1 p.16 / App.1 p.42: "Winning by drawing the
// winning tile yourself." Last Tile Draw (44) and Fully Concealed Hand (56)
// both universally require a self-drawn win, so both exclude this fan
// already ([44,80] original table; [56,80] added this session). Out with
// Replacement Tile (46) is NOT excluded — its kong-replacement clause is
// self-drawn, but its other clause (last discard of the game) is not, so it
// doesn't universally imply Self-Drawn.
function detectSelfDrawn(ctx: HandContext): FanMatch[] {
  return ctx.winMethod === 'selfDraw' ? [{ fanId: 80, count: 1 }] : []
}

// 81. Flower Tiles is intentionally NOT a detector here — §3.8.1 p.16 /
// App.1 p.42: "One point per Flower or Season tile obtained." It's scored
// as `flowerPoints` in settlement.ts (see M2 session 1's decision), tracked
// entirely separately from `basicPoints`/fan matching — same reasoning as
// Chicken Hand (43)'s exclusion from its own tier's detector map.

export const FANS_1_DETECTORS: Readonly<Record<number, (ctx: HandContext) => FanMatch[]>> = {
  69: detectPureDoubleChow,
  70: detectMixedDoubleChow,
  71: detectShortStraight,
  72: detectTwoTerminalChows,
  73: detectPungOfTerminalsOrHonors,
  74: detectMeldedKong,
  75: detectOneVoidedSuit,
  76: detectNoHonors,
  77: detectEdgeWait,
  78: detectClosedWait,
  79: detectSingleWait,
  80: detectSelfDrawn,
  // 81 (Flower Tiles) deliberately omitted — see comment above.
}
