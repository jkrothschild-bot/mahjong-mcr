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

  // Win-circumstance context, added for the 8-point tier's "special
  // situation" fans (Last Tile Draw, Last Tile Claim, Out with Replacement
  // Tile, Robbing the Kong). All optional/undefined-safe so every earlier
  // batch's tests (which don't set these) keep working unchanged. These
  // mirror what game-state.ts's HandResult already tracks (winMethod) plus
  // a couple of fields the live engine doesn't populate yet — scoreHand()
  // is still a standalone module (see M2 session 1's decision not to wire
  // it into moves.ts's win legality yet), so wiring real values in from
  // GameState is tracked as follow-up, same integration point.
  winMethod?: 'selfDraw' | 'discard' | 'robKong'
  isLastTileOfWall?: boolean // self-draw win on literally the wall's final drawable tile (fan 44)
  isLastDiscardOfGame?: boolean // discard win on the literal last discard of the game (fans 45/46)
  wonOnKongReplacement?: boolean // self-draw win on a kong's replacement tile specifically, not a flower-chain continuation of one (fan 46)
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
