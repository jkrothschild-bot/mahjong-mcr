import type { Decomposition } from '../win-detection.js'
import type { Meld, Seat } from '../meld.js'
import type { TileInstanceId, Wind } from '../tiles.js'

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

  // Added for the 4/2/1-point tiers. Same "optional, undefined-safe,
  // real-value wiring deferred" pattern as the win-circumstance fields
  // above — game-state.ts doesn't track a prevailing/seat wind concept yet,
  // and scoreHand() doesn't know which physical tile completed the hand
  // (concealedTiles already has it merged in indistinguishably), so these
  // are genuine new context the live engine will need to supply later.
  isLastCopyOfItsKind?: boolean // winning tile is the 4th/last copy of its type, with the other 3 already visible to all players via discards/exposures (fan 58, Last Tile)
  prevailingWind?: Wind // the match's current prevailing wind (fan 60, Prevalent Wind)
  seatWind?: Wind // this player's seat wind (fan 61, Seat Wind)
  // The specific physical tile that completed the hand, so wait-shape fans
  // (77/78/79) can identify which set/pair it belongs to. Undefined-safe:
  // wait-type detectors simply don't match without it.
  winningTile?: TileInstanceId
}

export interface FanMatch {
  fanId: number
  count: number // >1 for fans that can apply multiple times (later batches; always 1 for this batch's fans)
}

export interface ScoreResult {
  fanMatches: FanMatch[] // after exclusion resolution — the final scored set
  basicPoints: number // sum of fanMatches' points * count
}

// WHICH parse scoreHand ended up scoring — the structural half of the
// candidate HandContext that won, with the win-circumstance fields dropped
// (those are inputs, not findings).
//
// scoreHand trials every decomposition plus each valid special shape and
// keeps the highest total; before this it returned only the total and threw
// the winning parse away. The UI needs it to lay a revealed winning hand out
// the way it was actually won — four sets and a pair in their real groups,
// or seven pairs as pairs — rather than as an undifferentiated sorted run.
//
// Deliberately exposed through scoreHandDetailed, NOT by widening
// ScoreResult: dozens of scoring fixtures assert `toEqual({ fanMatches,
// basicPoints })` and an extra key would fail every one of them. This is
// display metadata; it must not be able to perturb a single scored value.
export interface WinningShape {
  // Standard four-sets-plus-pair parse. Covers the CONCEALED tiles only —
  // decomposeHand counts melds toward setsNeeded but never emits them in
  // `sets` — so this maps directly onto the concealed block a seat renders.
  decomposition: Decomposition | null
  // Non-null instead of `decomposition` for the two shapes that have no set
  // structure at all. A consumer has to regroup these from tile counts
  // (7 pairs; 13 distinct terminals/honors with one doubled).
  specialShape: 'sevenPairs' | 'thirteenOrphans' | null
}

export interface DetailedScoreResult extends ScoreResult {
  // Null only when nothing scored at all (no valid candidate) — a real win
  // always has a winning shape.
  winningShape: WinningShape | null
}

export interface SettlementResult {
  winnerSeat: Seat
  basicPoints: number
  flowerPoints: number
  payments: Record<Seat, number> // signed: negative = pays this many, positive = receives
}
