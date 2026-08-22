import type { Action } from './actions.js'
import { addFlower, addToConcealed, emptyHand, type Hand } from './hand.js'
import type { MeldId, Seat } from './meld.js'
import type { Move } from './moves.js'
import { drawTile, buildWall, type Wall, type WallEnd, INITIAL_DEAL_COUNT } from './wall.js'
import { isFlowerOrSeason, type TileInstanceId, type Wind } from './tiles.js'

export type GamePhase =
  | 'awaitingDraw'
  | 'awaitingDiscard'
  | 'awaitingClaims'
  | 'awaitingRobKongClaims'
  | 'handEnded'

export interface PendingClaim {
  tile: TileInstanceId
  fromSeat: Seat
  kind: 'discard' | 'addedKongRob'
  meldIdBeingPromoted?: MeldId
  // Every seat with at least one legal non-pass move on this tile, computed
  // once when the window opens. The window resolves only once every seat
  // here has declared — see claims.ts.
  eligibleSeats: Seat[]
  declarations: Partial<Record<Seat, Move>>
}

export interface PlayerState {
  seat: Seat
  seatWind: Wind
  hand: Hand
  discards: TileInstanceId[]
  score: number // placeholder, always 0 in M1 — scoring is M2
}

export interface HandResult {
  outcome: 'win' | 'exhaustiveDraw'
  winnerSeats?: Seat[] // length <= 1 in M1 — see docs/rules/decisions.md item 2
  winMethod?: 'selfDraw' | 'discard' | 'robKong'
  winningTile?: TileInstanceId
  loserSeat?: Seat
}

export interface GameState {
  seed: number
  handNumber: number
  prevailingWind: Wind
  dealerSeat: Seat
  wall: Wall
  players: [PlayerState, PlayerState, PlayerState, PlayerState]
  currentSeat: Seat
  phase: GamePhase
  pendingClaim?: PendingClaim
  actionLog: Action[]
  result?: HandResult
  // The tile currentSeat most recently drew (normal turn draw, or a kong's
  // replacement draw). Only meaningful during 'awaitingDiscard' — needed so
  // a 'selfDrawWin' move knows which tile completed the hand, since that
  // isn't otherwise derivable from GameState without re-scanning the log.
  lastDrawnTile?: TileInstanceId
}

const WINDS_IN_SEAT_ORDER: readonly Wind[] = ['east', 'south', 'west', 'north']

export function seatWindFor(seat: Seat, dealerSeat: Seat): Wind {
  const offset = (seat - dealerSeat + 4) % 4
  return WINDS_IN_SEAT_ORDER[offset]!
}

export interface StartHandParams {
  seed: number
  handNumber: number
  prevailingWind: Wind
  dealerSeat: Seat
}

export interface InitialDealStep {
  kind: 'four-tile-group' | 'dealer-final-two' | 'final-single' | 'flower-replacement'
  seat: Seat
  source: WallEnd
  tiles: readonly TileInstanceId[]
  wallAfter: Wall
}

export interface InitialDealResult {
  wall: Wall
  hands: [Hand, Hand, Hand, Hand]
  dealtHandsForLog: Record<Seat, TileInstanceId[]>
  steps: readonly InitialDealStep[]
}

function seatsFromDealer(dealerSeat: Seat): [Seat, Seat, Seat, Seat] {
  return [0, 1, 2, 3].map((offset) => ((dealerSeat + offset) % 4) as Seat) as [Seat, Seat, Seat, Seat]
}

export interface InitialPrimaryDealGroup {
  kind: 'four-tile-group' | 'dealer-final-two' | 'final-single'
  seat: Seat
  count: number
}

export function initialPrimaryDealGroups(dealerSeat: Seat): readonly InitialPrimaryDealGroup[] {
  const seats = seatsFromDealer(dealerSeat)
  const groups: InitialPrimaryDealGroup[] = []
  for (let pass = 0; pass < 3; pass++) {
    for (const seat of seats) groups.push({ kind: 'four-tile-group', seat, count: 4 })
  }
  groups.push({ kind: 'dealer-final-two', seat: dealerSeat, count: 2 })
  for (const seat of seats.slice(1)) groups.push({ kind: 'final-single', seat, count: 1 })
  return groups
}

// Official MCR deal order (§3.5.7.5-6): three passes of four tiles per
// player, East's separated "one and three" pair, then one tile for each
// other seat. Only after all 53 primary tiles have left the FRONT are
// Flowers exposed and replaced, dealer first, from the BACK (§3.4.20).
//
// Returning the steps keeps the animation a projection of this exact
// engine operation. The UI never invents its own deal cursor or decides
// which tiles are Flowers.
export function performInitialDeal(initialWall: Wall, dealerSeat: Seat): InitialDealResult {
  let wall = initialWall
  const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), emptyHand(), emptyHand()]
  const dealtHandsForLog: Record<Seat, TileInstanceId[]> = { 0: [], 1: [], 2: [], 3: [] }
  const steps: InitialDealStep[] = []
  const seats = seatsFromDealer(dealerSeat)

  const takePrimary = (seat: Seat, count: number, kind: InitialDealStep['kind']) => {
    const tiles: TileInstanceId[] = []
    for (let i = 0; i < count; i++) {
      const draw = drawTile(wall, 'front')
      wall = draw.wall
      tiles.push(draw.tile)
      dealtHandsForLog[seat]!.push(draw.tile)
      hands[seat] = isFlowerOrSeason(draw.tile)
        ? addFlower(hands[seat], draw.tile)
        : addToConcealed(hands[seat], draw.tile)
    }
    steps.push({ kind, seat, source: 'front', tiles, wallAfter: wall })
  }

  for (const group of initialPrimaryDealGroups(dealerSeat)) takePrimary(group.seat, group.count, group.kind)

  if (wall.frontIndex !== INITIAL_DEAL_COUNT) {
    throw new Error(`Initial deal consumed ${wall.frontIndex - initialWall.frontIndex} primary tiles instead of ${INITIAL_DEAL_COUNT}`)
  }

  for (const seat of seats) {
    let replacementsNeeded = hands[seat].flowers.length
    while (replacementsNeeded > 0) {
      const draw = drawTile(wall, 'back')
      wall = draw.wall
      dealtHandsForLog[seat]!.push(draw.tile)
      if (isFlowerOrSeason(draw.tile)) {
        hands[seat] = addFlower(hands[seat], draw.tile)
      } else {
        hands[seat] = addToConcealed(hands[seat], draw.tile)
        replacementsNeeded--
      }
      steps.push({ kind: 'flower-replacement', seat, source: 'back', tiles: [draw.tile], wallAfter: wall })
    }
  }

  return { wall, hands, dealtHandsForLog, steps }
}

// Deals a fresh hand from an already-built wall using performInitialDeal's
// rulebook-ordered groups and post-deal Flower replacement. Exported (not
// just used by startHand below) so scenario.ts's practice-mode hand builder
// can deal from a purpose-built wall without duplicating this operation.
export function dealHandFromWall(wall: Wall, params: StartHandParams): GameState {
  const { seed, handNumber, prevailingWind, dealerSeat } = params
  const dealt = performInitialDeal(wall, dealerSeat)
  wall = dealt.wall
  const { hands, dealtHandsForLog } = dealt

  const players = ([0, 1, 2, 3] as const).map(
    (seat): PlayerState => ({
      seat,
      seatWind: seatWindFor(seat, dealerSeat),
      hand: hands[seat],
      discards: [],
      score: 0,
    }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  const dealAction: Action = { seq: 0, seat: dealerSeat, type: 'deal', hands: dealtHandsForLog }

  return {
    seed,
    handNumber,
    prevailingWind,
    dealerSeat,
    wall,
    players,
    currentSeat: dealerSeat,
    phase: 'awaitingDiscard',
    actionLog: [dealAction],
  }
}

export function startHand(params: StartHandParams): GameState {
  return dealHandFromWall(buildWall(params.seed), params)
}
