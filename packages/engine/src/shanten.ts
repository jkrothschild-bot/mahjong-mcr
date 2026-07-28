import type { Meld } from './meld.js'
import type { TileInstanceId, TileTypeId } from './tiles.js'
import { chowNeighbors, groupConcealedByType, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'

// Standard-shape shanten (four sets + one pair). Model the hand as 5 blocks:
// 4 "set" blocks + 1 "head" block, with the following per-block cost budget
// (see docs/rules/decisions.md's mahjong-theory citation note — this is
// standard shanten-calculator theory, not sourced from the MCR rulebook):
//   complete set (existing meld, or a found pung/chow)         cost 0
//   complete pair reserved as head                             cost 0
//   partial set (taatsu: pair-toward-pung, adjacent/gapped run) cost 1
//   the head block, if no pair is reserved for it               cost 1
// shanten = (sum of block costs) - 1, i.e. a complete hand (all costs 0)
// scores -1 ("agari"), and a hand one tile away (tenpai) scores 0.
//
// Closed form: with S = complete sets found in the concealed tiles, T =
// partial sets (taatsu) found (capped so melds.length + S + T <= 4), and P
// = 1 if a pair is reserved as head else 0:
//   shanten = 8 - 2*(melds.length + S) - T - P
//
// Every candidate head-pair choice (including "reserve none") must be tried
// and the minimum taken — a pair can either be the head (free) or a taatsu
// counting against the cap, and greedily maximizing 2S+T alone can miss the
// better split. Verified against moves.test.ts's tenpaiWaitingOnC5 fixture:
// chow(D4-6)+chow(B7-9)+pung(DW×3) = S=3, C3-C4 taatsu = T=1 (cap 0+3+1=4),
// C9·C9 reserved as head = P=1 -> shanten = 8-2*3-1-1 = 0 (tenpai on C5). ✓
export function standardShanten(concealedTiles: readonly TileInstanceId[], melds: readonly Meld[]): number {
  const n = 4 - melds.length
  if (n < 0) return Infinity

  const baseCounts = groupConcealedByType(concealedTiles)
  let best = Infinity

  // Baseline: no pair reserved as head at all.
  best = Math.min(best, 8 - 2 * melds.length - searchBlocks({ ...baseCounts }, n))

  // Try reserving each type with >=2 copies as the head pair.
  for (const type of ORDERED_STANDARD_TYPE_IDS) {
    if ((baseCounts[type] ?? 0) < 2) continue
    const counts = { ...baseCounts }
    counts[type]! -= 2
    best = Math.min(best, 8 - 2 * melds.length - searchBlocks(counts, n) - 1)
  }

  return best
}

function partialChowNeighbors(typeId: TileTypeId): TileTypeId[] {
  const match = /^([CDB])([1-9])$/.exec(typeId)
  if (!match) return []
  const suit = match[1]!
  const rank = Number(match[2])
  const neighbors: TileTypeId[] = []
  if (rank + 1 <= 9) neighbors.push(`${suit}${rank + 1}`)
  if (rank + 2 <= 9) neighbors.push(`${suit}${rank + 2}`)
  return neighbors
}

function lowestNonzeroType(counts: Record<TileTypeId, number>): TileTypeId | null {
  for (const id of ORDERED_STANDARD_TYPE_IDS) {
    if ((counts[id] ?? 0) > 0) return id
  }
  return null
}

// Exhaustive search (mutates `counts` during recursion, always restores
// before returning) for the maximum value of `2*sets + partials` achievable
// using at most `budget` total blocks. Every branch — complete pung/chow,
// partial pung, partial chow (adjacent or gapped), or leaving the tile
// unconsumed ("floating") — is tried and the max taken, so this is a true
// maximum, not a greedy heuristic. Budget is capped at 4 and hands are at
// most ~14 tiles, so this terminates quickly with no memoization needed.
function searchBlocks(counts: Record<TileTypeId, number>, budget: number): number {
  const lowest = lowestNonzeroType(counts)
  if (lowest === null || budget <= 0) return 0

  let best = 0

  if ((counts[lowest] ?? 0) >= 3) {
    counts[lowest]! -= 3
    best = Math.max(best, 2 + searchBlocks(counts, budget - 1))
    counts[lowest]! += 3
  }

  const complete = chowNeighbors(lowest)
  if (complete) {
    const [n1, n2] = complete
    if ((counts[lowest] ?? 0) >= 1 && (counts[n1] ?? 0) >= 1 && (counts[n2] ?? 0) >= 1) {
      counts[lowest]! -= 1
      counts[n1] = (counts[n1] ?? 0) - 1
      counts[n2] = (counts[n2] ?? 0) - 1
      best = Math.max(best, 2 + searchBlocks(counts, budget - 1))
      counts[lowest]! += 1
      counts[n1] = (counts[n1] ?? 0) + 1
      counts[n2] = (counts[n2] ?? 0) + 1
    }
  }

  if ((counts[lowest] ?? 0) >= 2) {
    counts[lowest]! -= 2
    best = Math.max(best, 1 + searchBlocks(counts, budget - 1))
    counts[lowest]! += 2
  }

  for (const neighbor of partialChowNeighbors(lowest)) {
    if ((counts[lowest] ?? 0) >= 1 && (counts[neighbor] ?? 0) >= 1) {
      counts[lowest]! -= 1
      counts[neighbor] = (counts[neighbor] ?? 0) - 1
      best = Math.max(best, 1 + searchBlocks(counts, budget - 1))
      counts[lowest]! += 1
      counts[neighbor] = (counts[neighbor] ?? 0) + 1
    }
  }

  // Leave this tile unconsumed (floating) — always a valid choice, same budget.
  counts[lowest]! -= 1
  best = Math.max(best, searchBlocks(counts, budget))
  counts[lowest]! += 1

  return best
}
