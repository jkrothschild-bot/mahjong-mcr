import type { Hand } from './hand.js'
import type { Meld } from './meld.js'
import { calculateShantenFromCounts } from './shanten.js'
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

export interface DiscardEvaluation {
  tile: TileInstanceId
  resultingShanten: number
  ukeire: UkeireResult
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
  // just within one usefulTiles call — see usefulTiles' own comment.
  const cache = new Map<string, number>()

  return hand.concealedTiles.map((tile): DiscardEvaluation => {
    const typeId = typeIdOfInstance(tile)
    let evaluation = evaluationByType.get(typeId)
    if (!evaluation) {
      const remaining = hand.concealedTiles.filter((t) => t !== tile)
      evaluation = {
        resultingShanten: calculateShantenFromCounts(groupConcealedByType(remaining), hand.melds.length, cache).shanten,
        ukeire: usefulTiles(remaining, hand.melds, cache),
      }
      evaluationByType.set(typeId, evaluation)
    }
    return { tile, ...evaluation }
  })
}
