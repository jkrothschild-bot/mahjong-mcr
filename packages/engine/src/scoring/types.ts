import type { Decomposition } from '../win-detection.js'
import type { Meld, Seat } from '../meld.js'
import type { TileInstanceId } from '../tiles.js'

// Everything a fan detector needs to decide whether (and how many times) it
// applies to a completed hand. Grown incrementally as later fan batches need
// more context (e.g. seat/prevailing wind, win method) — kept minimal for
// now since this batch's 7 fans don't need any of that.
//
// Represents ONE candidate parse being trialed, not every possible parse at
// once: decomposeHand() can return multiple valid decompositions of an
// ambiguous hand, and score-hand.ts evaluates each one (plus each
// structurally-valid special shape) as its own separate HandContext, then
// keeps whichever trial scores highest — that's where "Freedom to Choose
// the Highest Points" (§3.9.1.5) applies at the whole-hand level.
export interface HandContext {
  concealedTiles: TileInstanceId[] // final concealed tiles, winning tile included
  melds: Meld[]
  decomposition: Decomposition | null // the one candidate parse for this trial; null if using specialShape instead
  specialShape: 'sevenPairs' | 'thirteenOrphans' | null
}

export interface FanMatch {
  fanId: number
  count: number // >1 for fans that can apply multiple times (later batches; always 1 for this batch's fans)
}

export interface ScoreResult {
  fanMatches: FanMatch[] // after exclusion resolution — the final scored set
  basicPoints: number // sum of fanMatches' points * count
}

export interface SettlementResult {
  winnerSeat: Seat
  basicPoints: number
  flowerPoints: number
  payments: Record<Seat, number> // signed: negative = pays this many, positive = receives
}
