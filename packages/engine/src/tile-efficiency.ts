import type { Hand } from './hand.js'
import type { Meld } from './meld.js'
import {
  calculateShantenFromCounts,
  sevenPairsShantenFromCounts,
  standardShantenFromCounts,
  thirteenOrphansShantenFromCounts,
  type ShantenResult,
} from './shanten.js'
import { typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'
import { groupConcealedByType, ORDERED_STANDARD_TYPE_IDS } from './win-detection.js'

export interface UkeireResult {
  // The standard tile types that would strictly reduce shanten if drawn.
  tileTypes: TileTypeId[]
  // Sum of remaining copies of those types. Raw 4-per-type accounting (this
  // hand's own copies subtracted, nothing else) — NOT unseen-count aware;
  // combining with what's actually visible in discards/melds elsewhere on
  // the board is a UI-layer concern (see packages/ui/src/board/unseenCounts.ts).
  totalCount: number
}

// KICKOFF-phase10-strategy-coach.md Stage 1a: shanten/ukeire for ONE named
// shape, not the min across all three — the thing calculateShantenFromCounts
// deliberately collapses away, and exactly what a route table needs back.
// meldCount !== 0 makes sevenPairs/thirteenOrphans structurally Infinity
// (shanten.ts's own restriction, mirroring win-detection.ts's isSevenPairs/
// isThirteenOrphans) — that falls out of this dispatch for free, no special
// casing needed by any caller.
function shantenForShape(
  counts: Readonly<Record<TileTypeId, number>>,
  meldCount: number,
  shape: ShantenResult['shape'],
  cache: Map<string, number>,
): number {
  switch (shape) {
    case 'standard':
      return standardShantenFromCounts(counts, meldCount, cache)
    case 'sevenPairs':
      return sevenPairsShantenFromCounts(counts, meldCount)
    case 'thirteenOrphans':
      return thirteenOrphansShantenFromCounts(counts, meldCount)
  }
}

export const ALL_SHANTEN_SHAPES: readonly ShantenResult['shape'][] = ['standard', 'sevenPairs', 'thirteenOrphans']

// The standard types that would strictly lower shanten if drawn ("ukeire"),
// and how many raw copies of them remain. Only considers the 34 standard
// types — flowers/seasons never affect hand shape (hand.ts's own comment).
//
// `cache` defaults to a fresh Map, but evaluateDiscards below passes one
// shared Map across every type probed here (and across every distinct
// discard candidate) — the 34 probes below very often revisit overlapping
// sub-states in shanten.ts's search, and without sharing, a single discard
// decision measured over 1 second; with it, low single digits of
// milliseconds (verified directly, not assumed — see shanten.ts's
// searchBlocks comment for the full story).
export function usefulTiles(
  concealedTiles: readonly TileInstanceId[],
  melds: readonly Meld[],
  cache: Map<string, number> = new Map(),
): UkeireResult {
  const baseCounts = groupConcealedByType(concealedTiles)
  const baseShanten = calculateShantenFromCounts(baseCounts, melds.length, cache).shanten

  const tileTypes: TileTypeId[] = []
  let totalCount = 0

  for (const type of ORDERED_STANDARD_TYPE_IDS) {
    const ownedCopies = baseCounts[type] ?? 0
    if (ownedCopies >= 4) continue // none left to draw
    const counts = { ...baseCounts, [type]: ownedCopies + 1 }
    const shanten = calculateShantenFromCounts(counts, melds.length, cache).shanten
    if (shanten < baseShanten) {
      tileTypes.push(type)
      totalCount += 4 - ownedCopies
    }
  }

  return { tileTypes, totalCount }
}

// Ukeire toward ONE named shape specifically, mirroring usefulTiles above
// exactly except the shanten it improves against — Stage 1a's "per shape,
// not just the min" requirement applied to outs, not just shanten. When
// `baseShanten` is already Infinity (meldCount !== 0, probing sevenPairs/
// thirteenOrphans), every probe would also be Infinity, and Infinity <
// Infinity is false, so this naturally returns zero outs without needing to
// special-case that — but short-circuits anyway to skip 34 pointless probes
// per candidate.
function usefulTilesForShape(
  baseCounts: Readonly<Record<TileTypeId, number>>,
  meldCount: number,
  shape: ShantenResult['shape'],
  cache: Map<string, number>,
): UkeireResult {
  const baseShanten = shantenForShape(baseCounts, meldCount, shape, cache)
  if (baseShanten === Infinity) return { tileTypes: [], totalCount: 0 }

  const tileTypes: TileTypeId[] = []
  let totalCount = 0

  for (const type of ORDERED_STANDARD_TYPE_IDS) {
    const ownedCopies = baseCounts[type] ?? 0
    if (ownedCopies >= 4) continue
    const counts = { ...baseCounts, [type]: ownedCopies + 1 }
    const shanten = shantenForShape(counts, meldCount, shape, cache)
    if (shanten < baseShanten) {
      tileTypes.push(type)
      totalCount += 4 - ownedCopies
    }
  }

  return { tileTypes, totalCount }
}

// One shape's row in a discard candidate's route table — KICKOFF-phase10's
// 1a `routes` field. `ukeireCount` is this shape's OWN outs (usefulTilesForShape
// above), not usefulTiles' combined-shape count.
export interface RouteAssessment {
  shape: ShantenResult['shape']
  shanten: number
  ukeireCount: number
}

// Measured, not assumed (KICKOFF-phase10-strategy-coach.md's own explicit
// instruction): a full evaluateDiscards pass over a real 14-tile hand, with
// this route table added, ran ~13-43ms depending on hand shape (a scattered
// hand with few duplicate types, vs. one with a triplet/pairs that widens
// standardShantenFromCounts' own head-pair search) — a fresh, uncached
// Map per call, the realistic per-hint-request cost. Comfortably under
// interactive-feel budgets (well under the ~100ms "instant" threshold) for a
// once-per-hint-open computation, not a per-frame one, so this is fine as-is
// without needing Stage 2's depth-2 profiling concerns yet.
// Exported for hints.ts's Hand Plan tab (KICKOFF-phase10 gap: it was showing
// a single crowned-min shape/shanten via calculateShanten, the exact
// collapse Stage 1a undid for discard ranking) — same per-shape table,
// computed directly on a hand's current counts rather than a post-discard
// candidate.
export function routeTableFor(
  counts: Readonly<Record<TileTypeId, number>>,
  meldCount: number,
  cache: Map<string, number>,
): RouteAssessment[] {
  return ALL_SHANTEN_SHAPES.map((shape) => ({
    shape,
    shanten: shantenForShape(counts, meldCount, shape, cache),
    ukeireCount: usefulTilesForShape(counts, meldCount, shape, cache).totalCount,
  }))
}

export interface DiscardEvaluation {
  tile: TileInstanceId
  resultingShanten: number
  ukeire: UkeireResult
  // KICKOFF-phase10-strategy-coach.md Stage 1a: per-shape shanten/outs after
  // this discard, additive alongside resultingShanten/ukeire (which stay the
  // MIN-across-shapes numbers, unchanged meaning) — what lets rankDiscards
  // reason about which routes a candidate keeps alive vs. kills, instead of
  // only ever seeing the single best route.
  routes: RouteAssessment[]
}

// Evaluates every concealed tile as a discard candidate: the resulting
// shanten and ukeire after discarding it. `hand` is expected to hold the
// "extra" 14th tile (mid discard-decision) — the same shape a discard move
// is legal against. Tiles of the same type always evaluate identically
// (shanten only depends on type counts, never on which physical instance
// is kept), so the underlying shanten/ukeire computation runs once per
// distinct type and is reused across every physical tile of that type.
export function evaluateDiscards(hand: Hand): DiscardEvaluation[] {
  const evaluationByType = new Map<TileTypeId, Omit<DiscardEvaluation, 'tile'>>()
  // Shared across every distinct discard candidate evaluated below, not
  // just within one usefulTiles call — see usefulTiles' own comment. Now
  // also shared across the per-shape route table probes (routeTableFor),
  // the same sharing tile-efficiency.ts's own comments already establish is
  // load-bearing for performance, not optional.
  const cache = new Map<string, number>()

  return hand.concealedTiles.map((tile): DiscardEvaluation => {
    const typeId = typeIdOfInstance(tile)
    let evaluation = evaluationByType.get(typeId)
    if (!evaluation) {
      const remaining = hand.concealedTiles.filter((t) => t !== tile)
      const remainingCounts = groupConcealedByType(remaining)
      evaluation = {
        resultingShanten: calculateShantenFromCounts(remainingCounts, hand.melds.length, cache).shanten,
        ukeire: usefulTiles(remaining, hand.melds, cache),
        routes: routeTableFor(remainingCounts, hand.melds.length, cache),
      }
      evaluationByType.set(typeId, evaluation)
    }
    return { tile, ...evaluation }
  })
}
