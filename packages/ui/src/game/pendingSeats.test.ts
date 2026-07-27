import { describe, expect, it } from 'vitest'
import {
  buildWall,
  emptyHand,
  seatWindFor,
  type GamePhase,
  type GameState,
  type Hand,
  type PendingClaim,
  type PlayerState,
  type Seat,
} from '@mahjong-mcr/engine'
import { pendingSeatsNeedingDecision } from './pendingSeats.js'

// Same hand-rolled baseState pattern used in packages/engine/src/moves.test.ts —
// needed here too since we're asserting on specific phase/pendingClaim shapes,
// not whatever a real random deal happens to produce.
function baseState(opts: {
  currentSeat?: Seat
  phase?: GamePhase
  pendingClaim?: PendingClaim
}): GameState {
  const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), emptyHand(), emptyHand()]
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
    phase: opts.phase ?? 'awaitingDraw',
    pendingClaim: opts.pendingClaim,
    actionLog: [],
  }
}

describe('pendingSeatsNeedingDecision', () => {
  it('returns just currentSeat during awaitingDraw', () => {
    const state = baseState({ phase: 'awaitingDraw', currentSeat: 2 })
    expect(pendingSeatsNeedingDecision(state)).toEqual([2])
  })

  it('returns just currentSeat during awaitingDiscard', () => {
    const state = baseState({ phase: 'awaitingDiscard', currentSeat: 1 })
    expect(pendingSeatsNeedingDecision(state)).toEqual([1])
  })

  it('returns nothing once the hand has ended', () => {
    const state = baseState({ phase: 'handEnded' })
    expect(pendingSeatsNeedingDecision(state)).toEqual([])
  })

  it('returns all eligible seats during awaitingClaims when none have declared yet', () => {
    const state = baseState({
      phase: 'awaitingClaims',
      pendingClaim: { tile: 0, fromSeat: 0, kind: 'discard', eligibleSeats: [1, 2, 3], declarations: {} },
    })
    expect(pendingSeatsNeedingDecision(state).sort()).toEqual([1, 2, 3])
  })

  it('excludes seats that have already declared during awaitingClaims', () => {
    const state = baseState({
      phase: 'awaitingClaims',
      pendingClaim: {
        tile: 0,
        fromSeat: 0,
        kind: 'discard',
        eligibleSeats: [1, 2, 3],
        declarations: { 1: { kind: 'pass' } },
      },
    })
    expect(pendingSeatsNeedingDecision(state).sort()).toEqual([2, 3])
  })

  it('returns an empty array during awaitingClaims if pendingClaim is somehow missing', () => {
    const state = baseState({ phase: 'awaitingClaims' })
    expect(pendingSeatsNeedingDecision(state)).toEqual([])
  })

  it('handles awaitingRobKongClaims the same way as awaitingClaims', () => {
    const state = baseState({
      phase: 'awaitingRobKongClaims',
      pendingClaim: {
        tile: 0,
        fromSeat: 0,
        kind: 'addedKongRob',
        eligibleSeats: [1],
        declarations: {},
      },
    })
    expect(pendingSeatsNeedingDecision(state)).toEqual([1])
  })
})
