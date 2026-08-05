import type { Meld } from './meld.js'
import { typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'

// Fixed order over the 34 standard tile types — used for the "lowest
// nonzero type" pruning trick in the backtracking search below, and for
// deterministic iteration when trying pair candidates.
export const ORDERED_STANDARD_TYPE_IDS: readonly TileTypeId[] = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9',
  'WE', 'WS', 'WW', 'WN',
  'DR', 'DG', 'DW',
]

export function groupConcealedByType(tiles: readonly TileInstanceId[]): Record<TileTypeId, number> {
  const counts: Record<TileTypeId, number> = {}
  for (const tile of tiles) {
    const id = typeIdOfInstance(tile)
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

// Only suited types (single digit rank, e.g. "C5") can start a chow, and
// only up to rank 7 (7-8-9 is the highest possible run). Winds ("WE" etc.)
// and dragons ("DR" etc.) never match this pattern, so no special-casing
// for honors is needed beyond this regex.
export function chowNeighbors(typeId: TileTypeId): [TileTypeId, TileTypeId] | null {
  const match = /^([CDB])([1-9])$/.exec(typeId)
  if (!match) return null
  const suit = match[1]!
  const rank = Number(match[2])
  if (rank > 7) return null
  return [`${suit}${rank + 1}`, `${suit}${rank + 2}`]
}

export interface SetShape {
  type: 'chow' | 'pung'
  tiles: [TileTypeId, TileTypeId, TileTypeId]
}

export interface Decomposition {
  pair: TileTypeId
  sets: SetShape[]
}

function lowestNonzeroType(counts: Record<TileTypeId, number>): TileTypeId | null {
  for (const id of ORDERED_STANDARD_TYPE_IDS) {
    if ((counts[id] ?? 0) > 0) return id
  }
  return null
}

// Backtracking search: consume the lowest-indexed remaining tile type into
// either a pung or a chow at each step, recursing on both branches (not
// short-circuiting) so ALL valid decompositions are collected — M2's fan
// scorer needs every valid parse of an ambiguous hand to find the
// highest-scoring interpretation, so this is designed to never special-case
// down to "first match wins."
//
// Mutates `counts` during recursion and always restores it before
// returning, so callers can reuse the same object across pair-candidate
// trials without re-copying it each time.
function findSets(counts: Record<TileTypeId, number>, setsNeeded: number): SetShape[][] {
  if (setsNeeded === 0) {
    const allConsumed = Object.values(counts).every((count) => count === 0)
    return allConsumed ? [[]] : []
  }

  const lowest = lowestNonzeroType(counts)
  if (lowest === null) return [] // tiles ran out before sets did

  const results: SetShape[][] = []

  if ((counts[lowest] ?? 0) >= 3) {
    counts[lowest]! -= 3
    for (const rest of findSets(counts, setsNeeded - 1)) {
      results.push([{ type: 'pung', tiles: [lowest, lowest, lowest] }, ...rest])
    }
    counts[lowest]! += 3
  }

  const neighbors = chowNeighbors(lowest)
  if (neighbors) {
    const [n1, n2] = neighbors
    if ((counts[lowest] ?? 0) >= 1 && (counts[n1] ?? 0) >= 1 && (counts[n2] ?? 0) >= 1) {
      counts[lowest]! -= 1
      counts[n1] = (counts[n1] ?? 0) - 1
      counts[n2] = (counts[n2] ?? 0) - 1
      for (const rest of findSets(counts, setsNeeded - 1)) {
        results.push([{ type: 'chow', tiles: [lowest, n1, n2] }, ...rest])
      }
      counts[lowest]! += 1
      counts[n1] = (counts[n1] ?? 0) + 1
      counts[n2] = (counts[n2] ?? 0) + 1
    }
  }

  return results
}

// The core of decomposeHand, parameterized directly on how many sets are
// needed rather than deriving it from a real `melds` array — pulled out so
// knittedStraightRemainders (below) can ask for a specific set count (0 or
// 1) against a tile pool that isn't itself a real concealed hand (the
// remainder after removing the 9 knitted tiles), without needing to
// fabricate placeholder Meld objects just to manipulate the arithmetic.
function decomposeWithSetsNeeded(concealedTiles: readonly TileInstanceId[], setsNeeded: number): Decomposition[] {
  if (setsNeeded < 0) return []

  const counts = groupConcealedByType(concealedTiles)
  const decompositions: Decomposition[] = []

  for (const pairType of ORDERED_STANDARD_TYPE_IDS) {
    if ((counts[pairType] ?? 0) < 2) continue
    counts[pairType]! -= 2
    for (const sets of findSets(counts, setsNeeded)) {
      decompositions.push({ pair: pairType, sets })
    }
    counts[pairType]! += 2
  }

  return decompositions
}

// Standard winning shape: melds.length existing melds (each — including a
// kong, despite its 4 physical tiles — counts as exactly one "set") plus a
// decomposition of the concealed tiles into (4 - melds.length) more sets and
// one pair. Deliberately does NOT special-case a concealed 4-of-a-kind: the
// generic search below only ever consumes 3 tiles for a pung, so an
// undeclared concealed kong can only contribute if the 4th tile happens to
// also complete an adjacent chow — correctly refusing to "backdoor" an
// undeclared kong into a win otherwise.
export function decomposeHand(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): Decomposition[] {
  return decomposeWithSetsNeeded(concealedTiles, 4 - melds.length)
}

// Provisional per docs/rules/decisions.md item 5: no melds of any kind
// (including a concealed kong), and exactly 7 *distinct* pairs — four of the
// same tile does not count as two pairs of that type.
export function isSevenPairs(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): boolean {
  if (melds.length !== 0) return false
  if (concealedTiles.length !== 14) return false
  const counts = groupConcealedByType(concealedTiles)
  const values = Object.values(counts)
  return values.length === 7 && values.every((count) => count === 2)
}

// §3.7.2.2 shape (2), p.13: 13 distinct terminal/honor types — the 1 and 9
// of each suit plus all 7 honors — twelve of them as single tiles and one
// doubled as the pair (14 tiles total, no melds). Structurally this can
// never include a meld: any pung/kong of a required type would need 3-4
// physical copies of it while still needing all 13 *other* distinct types
// represented as well, which doesn't fit in a 14-tile hand.
export const THIRTEEN_ORPHAN_TYPE_IDS: readonly TileTypeId[] = [
  'C1', 'C9', 'D1', 'D9', 'B1', 'B9', 'WE', 'WS', 'WW', 'WN', 'DR', 'DG', 'DW',
]

export function isThirteenOrphans(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): boolean {
  if (melds.length !== 0) return false
  if (concealedTiles.length !== 14) return false
  const counts = groupConcealedByType(concealedTiles)

  for (const id of Object.keys(counts)) {
    if (!THIRTEEN_ORPHAN_TYPE_IDS.includes(id)) return false // a non terminal/honor tile is present
  }

  let pairsFound = 0
  for (const id of THIRTEEN_ORPHAN_TYPE_IDS) {
    const count = counts[id] ?? 0
    if (count === 0) return false // missing one of the 13 required types
    if (count === 1) continue
    if (count === 2) {
      pairsFound++
      continue
    }
    return false // 3+ copies of one type can't occur in this shape
  }
  return pairsFound === 1
}

// --- Knitted-tile shapes (§3.7.2.2 shape (4); docs/rules/decisions.md #6/#12/#20) ---

// The 3 "knitted sequences" fans 20/34/35 are all built from — {1,4,7},
// {2,5,8}, {3,6,9}, identified by rank mod 3.
const KNITTED_SEQUENCES: readonly number[][] = [
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
]
const SUIT_CHARS: readonly ('C' | 'D' | 'B')[] = ['C', 'D', 'B']
// All 6 orderings of the 3 suits, one knitted sequence assigned per suit —
// the rulebook doesn't pin which suit gets which sequence, just that all 3
// are used, one each (docs/rules/decisions.md #12).
const SUIT_PERMUTATIONS: readonly ('C' | 'D' | 'B')[][] = [
  ['C', 'D', 'B'], ['C', 'B', 'D'], ['D', 'C', 'B'], ['D', 'B', 'C'], ['B', 'C', 'D'], ['B', 'D', 'C'],
]

// Every TileTypeId in this engine is either suited (`${'C'|'D'|'B'}${1-9}`)
// or one of the 7 honors (`WE`/`WS`/`WW`/`WN`/`DR`/`DG`/`DW`) — flowers and
// seasons never appear in concealedTiles (see tiles.ts), so "not suited" is
// a safe, sufficient honor check within this module.
function isHonorType(id: TileTypeId): boolean {
  return !/^[CDB][1-9]$/.test(id)
}

// Fans 20 (Greater, exactly 7 honors) and 34 (Lesser, 5-6 honors) share one
// structural shape — §3.7.2.2 shape (4), docs/rules/decisions.md #6/#12: 14
// distinct single tiles, NO pair and no melds at all (a genuine exception to
// "every winning hand has a pair"); the suit tiles (7, 8, or 9 of them,
// since only 5-7 honors are structurally possible — see fans-12.ts's own
// comment) partition across the 3 suits with each suit's ranks sharing
// exactly one knitted sequence and all three sequences used. Point-tier
// discrimination (Greater vs Lesser) happens entirely in the fan detectors
// (fans-24.ts/fans-12.ts) via honor count; this is the shape-recognition
// half those detectors could never reach before — scoreHandDetailed never
// generated a matching candidate, so they were dead code (decisions.md #19).
export function isHonorsAndKnittedTiles(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): boolean {
  if (melds.length !== 0) return false
  if (concealedTiles.length !== 14) return false
  const typeIds = concealedTiles.map(typeIdOfInstance)
  if (new Set(typeIds).size !== 14) return false

  const honorCount = typeIds.filter(isHonorType).length
  if (honorCount < 5 || honorCount > 7) return false

  const bySuit: Record<'C' | 'D' | 'B', number[]> = { C: [], D: [], B: [] }
  for (const id of typeIds) {
    const match = /^([CDB])([1-9])$/.exec(id)
    if (match) bySuit[match[1] as 'C' | 'D' | 'B'].push(Number(match[2]))
  }
  const seqIndices = SUIT_CHARS.map((suit) => {
    const ranks = bySuit[suit]
    if (ranks.length === 0) return null // every suit used must contribute at least one tile
    const sequences = new Set(ranks.map((r) => r % 3))
    return sequences.size === 1 ? sequences.values().next().value! : null // all of one suit's ranks must share one sequence
  })
  if (seqIndices.some((idx) => idx === null)) return false
  return new Set(seqIndices).size === 3 // the three suits present must use three DIFFERENT sequences
}

export interface KnittedStraightRemainder {
  // The decomposition of whatever's left after removing the 9 knitted
  // tiles — 1 pair + 1 more set (0 melds declared) or just the pair (1 meld
  // already declared; 4 - melds.length - 3 = 0).
  decomposition: Decomposition
}

// Fan 35, Knitted Straight (§3.8.1 p.15 / App.1 p.34, verified against the
// actual rulebook text — see docs/rules/decisions.md #20): "a special
// Straight formed not with standard chows but with 3 different Knitted
// sequences" — i.e. the 9-tile knitted pattern stands in for 3 of the
// standard 4 sets, NOT the no-pair 14-singles shape fans 20/34 use (the
// rulebook's own wording and worked examples — one captioned "Combined with
// Tile Hog", impossible under a no-duplicates shape — confirm this). Tries
// every suit-to-sequence assignment; for each where the 9 tiles are
// physically present, decomposes the remainder (via the same core search
// decomposeHand uses) and returns every valid remainder decomposition found.
// scoreHandDetailed tries each as its own independent candidate — same
// "Freedom to Choose the Highest Points" pattern as the standard shape's own
// multiple decompositions.
export function knittedStraightRemainders(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): KnittedStraightRemainder[] {
  const additionalSetsNeeded = 4 - melds.length - 3
  if (additionalSetsNeeded < 0 || additionalSetsNeeded > 1) return []

  const results: KnittedStraightRemainder[] = []
  for (const suitOrder of SUIT_PERMUTATIONS) {
    const neededTypeIds: TileTypeId[] = []
    for (let i = 0; i < 3; i++) {
      for (const rank of KNITTED_SEQUENCES[i]!) {
        neededTypeIds.push(`${suitOrder[i]}${rank}`)
      }
    }

    const remaining = concealedTiles.slice()
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

    for (const decomposition of decomposeWithSetsNeeded(remaining, additionalSetsNeeded)) {
      results.push({ decomposition })
    }
  }
  return results
}

// Structural shapes recognized: standard (four sets + pair), Seven Pairs,
// Thirteen Orphans, Greater/Lesser Honors and Knitted Tiles, and Knitted
// Straight — all four §3.7.2.2 shapes, plus the knitted-tile variants within
// shape (4)/fan 35 (docs/rules/decisions.md #6/#12/#20 — closed 2026-08-05;
// see #19/#20 for the "decomposeHand had no notion of a knitted set" bug
// this closes).
export function isWinningHand(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): boolean {
  return (
    decomposeHand(concealedTiles, melds).length > 0 ||
    isSevenPairs(concealedTiles, melds) ||
    isThirteenOrphans(concealedTiles, melds) ||
    isHonorsAndKnittedTiles(concealedTiles, melds) ||
    knittedStraightRemainders(concealedTiles, melds).length > 0
  )
}
