import { describe, expect, it } from 'vitest'
import {
  buildWall,
  emptyHand,
  seatWindFor,
  TILE_TYPE_BY_ID,
  typeIdOfInstance,
  type GamePhase,
  type GameState,
  type Hand,
  type Meld,
  type PendingClaim,
  type PlayerState,
  type Seat,
  type TileInstanceId,
  type TileTypeId,
} from '@mahjong-mcr/engine'
import { chooseBotMove } from './botAgent.js'

// Same conventions as packages/engine/src/moves.test.ts.
function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[], melds: Meld[] = []): Hand {
  return { ...emptyHand(), concealedTiles, melds }
}

function baseState(
  hands: [Hand, Hand, Hand, Hand],
  opts: { currentSeat?: Seat; phase?: GamePhase; pendingClaim?: PendingClaim; lastDrawnTile?: TileInstanceId } = {},
): GameState {
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: buildWall(1),
    players,
    currentSeat: opts.currentSeat ?? 0,
    phase: opts.phase ?? 'awaitingDiscard',
    pendingClaim: opts.pendingClaim,
    lastDrawnTile: opts.lastDrawnTile,
    actionLog: [],
  }
}

describe('chooseBotMove', () => {
  it('draws when that is the only legal move', () => {
    const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), emptyHand(), emptyHand()]
    const state = baseState(hands, { phase: 'awaitingDraw', currentSeat: 1 })
    expect(chooseBotMove(state, 1)).toEqual({ kind: 'draw' })
  })

  it('takes a self-draw win when available', () => {
    // chow(C1,C2,C3) + chow(D4,D5,D6) + chow(B7,B8,B9) + pung(DW,DW,DW) + pair(C9,C9)
    const complete = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3), ...idsFor('C9', 2),
    ]
    const hands: [Hand, Hand, Hand, Hand] = [handWith(complete), emptyHand(), emptyHand(), emptyHand()]
    const state = baseState(hands, { phase: 'awaitingDiscard', currentSeat: 0, lastDrawnTile: complete[0] })
    expect(chooseBotMove(state, 0)).toEqual({ kind: 'selfDrawWin' })
  })

  it('prefers discarding over a voluntary concealed kong', () => {
    const hand = handWith([...idsFor('WE', 4), ...idsFor('C2', 1), ...idsFor('C3', 1)])
    const hands: [Hand, Hand, Hand, Hand] = [hand, emptyHand(), emptyHand(), emptyHand()]
    const state = baseState(hands, { phase: 'awaitingDiscard', currentSeat: 0 })
    const move = chooseBotMove(state, 0)
    expect(move.kind).toBe('discard')
  })

  it('takes a win claim over pung/chow when all are on offer', () => {
    // Seat 1 holds 2 concealed C5s — pung(C5,C5,+discarded C5) + chow(D4,D5,D6)
    // + chow(B7,B8,B9) + pung(DW,DW,DW) + pair(C9,C9) is a complete hand, so
    // the discarded 3rd C5 is both pung-able AND win-able; win must be chosen.
    const winningIfC5 = [
      ...idsFor('C5', 2),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3), ...idsFor('C9', 2),
    ]
    const [c5ForDiscard] = idsFor('C5', 3).slice(2) // a 3rd C5 instance, distinct from the 2 already in hand
    const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), handWith(winningIfC5), emptyHand(), emptyHand()]
    const pendingClaim: PendingClaim = {
      tile: c5ForDiscard!,
      fromSeat: 0,
      kind: 'discard',
      eligibleSeats: [1],
      declarations: {},
    }
    const state = baseState(hands, { phase: 'awaitingClaims', currentSeat: 0, pendingClaim })
    expect(chooseBotMove(state, 1)).toEqual({ kind: 'win' })
  })

  it('takes the only qualifying claim option when no win is available', () => {
    const hand = handWith([...idsFor('C5', 2), ...idsFor('B1', 1)])
    const [c5ForDiscard] = idsFor('C5', 3).slice(2)
    const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), hand, emptyHand(), emptyHand()]
    const pendingClaim: PendingClaim = {
      tile: c5ForDiscard!,
      fromSeat: 0,
      kind: 'discard',
      eligibleSeats: [1],
      declarations: {},
    }
    let state = baseState(hands, { phase: 'awaitingClaims', currentSeat: 0, pendingClaim })
    // The real policy actually applies the candidate move (via applyMove) to
    // check its resulting shanten, unlike the old placeholder — so, unlike
    // before, the discarder's `discards` must genuinely contain the claimed
    // tile (matching what a real 'discard' move would have produced).
    state = { ...state, players: [{ ...state.players[0], discards: [c5ForDiscard!] }, state.players[1], state.players[2], state.players[3]] }
    expect(chooseBotMove(state, 1)).toEqual({ kind: 'pung' })
  })

  it('passes when no other option is legal', () => {
    const hand = handWith([...idsFor('B1', 1)]) // cannot pung/chow/win a C5
    const [c5ForDiscard] = idsFor('C5', 1)
    const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), hand, emptyHand()]
    const pendingClaim: PendingClaim = {
      tile: c5ForDiscard!,
      fromSeat: 0,
      kind: 'discard',
      eligibleSeats: [2],
      declarations: {},
    }
    const state = baseState(hands, { phase: 'awaitingClaims', currentSeat: 0, pendingClaim })
    expect(chooseBotMove(state, 2)).toEqual({ kind: 'pass' })
  })

  it('is deterministic — repeated calls on the same state return the same move', () => {
    const hand = handWith([...idsFor('WE', 4), ...idsFor('C2', 1), ...idsFor('C3', 1)])
    const hands: [Hand, Hand, Hand, Hand] = [hand, emptyHand(), emptyHand(), emptyHand()]
    const state = baseState(hands, { phase: 'awaitingDiscard', currentSeat: 0 })
    expect(chooseBotMove(state, 0)).toEqual(chooseBotMove(state, 0))
  })

  it('assigns different seats different presets, so their claim decisions can genuinely diverge', () => {
    // Same shanten-neutral-pung fixture verified in the engine's
    // bots/policy.test.ts: pung(DW×3)+pung(DG×3) + taatsu(C3,C4) +
    // taatsu(D3,D4) + pair(C9,C9) reserved as head + 1 filler. Claiming the
    // pung consumes the reserved head pair while the vacated budget slot
    // can only re-admit one of the two other taatsu — net shanten
    // unchanged (1->1). seat3 (conservative) should decline it; seat1
    // (efficient) should take it.
    const concealed = [
      ...idsFor('DW', 3),
      ...idsFor('DG', 3),
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('D3', 1),
      ...idsFor('D4', 1),
      ...idsFor('C9', 2),
      ...idsFor('WN', 1),
    ]
    const [c9third] = idsFor('C9', 3).slice(2)

    function stateForClaimant(claimantSeat: Seat): GameState {
      const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), emptyHand(), emptyHand()]
      hands[claimantSeat] = handWith(concealed)
      const pendingClaim: PendingClaim = { tile: c9third!, fromSeat: 0, kind: 'discard', eligibleSeats: [claimantSeat], declarations: {} }
      let state = baseState(hands, { phase: 'awaitingClaims', currentSeat: 0, pendingClaim })
      state = { ...state, players: [{ ...state.players[0], discards: [c9third!] }, state.players[1], state.players[2], state.players[3]] }
      return state
    }

    expect(chooseBotMove(stateForClaimant(1), 1)).toEqual({ kind: 'pung' }) // efficient
    expect(chooseBotMove(stateForClaimant(3), 3)).toEqual({ kind: 'pass' }) // conservative
  })
})
