import type { Meld } from './meld.js'
import { typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'

// Fixed order over the 34 standard tile types — used for the "lowest
// nonzero type" pruning trick in the backtracking search below, and for
// deterministic iteration when trying pair candidates.
const ORDERED_STANDARD_TYPE_IDS: readonly TileTypeId[] = [
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
function chowNeighbors(typeId: TileTypeId): [TileTypeId, TileTypeId] | null {
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

// Standard winning shape: melds.length existing melds (each — including a
// kong, despite its 4 physical tiles — counts as exactly one "set") plus a
// decomposition of the concealed tiles into (4 - melds.length) more sets and
// one pair. Deliberately does NOT special-case a concealed 4-of-a-kind: the
// generic search below only ever consumes 3 tiles for a pung, so an
// undeclared concealed kong can only contribute if the 4th tile happens to
// also complete an adjacent chow — correctly refusing to "backdoor" an
// undeclared kong into a win otherwise.
export function decomposeHand(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): Decomposition[] {
  const setsNeeded = 4 - melds.length
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

export function isWinningHand(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): boolean {
  return decomposeHand(concealedTiles, melds).length > 0 || isSevenPairs(concealedTiles, melds)
}
