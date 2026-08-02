import type { Action } from './actions.js'
import { addFlower, addToConcealed, emptyHand, type Hand } from './hand.js'
import type { MeldId, Seat } from './meld.js'
import type { Move } from './moves.js'
import { drawWithFlowerReplacement, buildWall, type Wall, INITIAL_DEAL_COUNT } from './wall.js'
import type { TileInstanceId, Wind } from './tiles.js'

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

// Deals a fresh hand from an already-built wall: 13 tiles to each seat in
// turn order starting from the dealer, then the dealer's 14th tile folded
// into the deal itself (so the dealer's first move is a discard, not a
// draw). Every logical tile dealt goes through drawWithFlowerReplacement,
// so a flower dealt out during the deal is correctly replaced and bucketed
// rather than silently ending up in the concealed hand. Exported (not just
// used by startHand below) so scenario.ts's practice-mode hand builder can
// deal from a purpose-built wall (a specific hand for one seat, the rest
// shuffled) without duplicating this loop.
export function dealHandFromWall(wall: Wall, params: StartHandParams): GameState {
  const { seed, handNumber, prevailingWind, dealerSeat } = params
  const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), emptyHand(), emptyHand()]
  const dealtHandsForLog: Record<Seat, TileInstanceId[]> = { 0: [], 1: [], 2: [], 3: [] }

  const dealOrder: Seat[] = []
  for (let round = 0; round < 13; round++) {
    for (let i = 0; i < 4; i++) dealOrder.push(((dealerSeat + i) % 4) as Seat)
  }
  dealOrder.push(dealerSeat) // the dealer's folded-in 14th tile
  if (dealOrder.length !== INITIAL_DEAL_COUNT) {
    throw new Error(`Deal order length ${dealOrder.length} does not match INITIAL_DEAL_COUNT`)
  }

  for (const seat of dealOrder) {
    const draw = drawWithFlowerReplacement(wall, 'front')
    wall = draw.wall
    for (const flower of draw.flowersDrawn) {
      hands[seat] = addFlower(hands[seat], flower)
      dealtHandsForLog[seat]!.push(flower)
    }
    if (draw.finalTile === undefined) {
      throw new Error('Wall exhausted during the initial deal — should never happen with a fresh 144-tile wall')
    }
    hands[seat] = addToConcealed(hands[seat], draw.finalTile)
    dealtHandsForLog[seat]!.push(draw.finalTile)
  }

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
