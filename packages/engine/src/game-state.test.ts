import { describe, expect, it } from 'vitest'
import { seatWindFor, startHand } from './game-state.js'
import { INITIAL_DEAL_COUNT } from './wall.js'

describe('seatWindFor', () => {
  it('gives the dealer east and rotates south/west/north for the following seats', () => {
    expect(seatWindFor(0, 0)).toBe('east')
    expect(seatWindFor(1, 0)).toBe('south')
    expect(seatWindFor(2, 0)).toBe('west')
    expect(seatWindFor(3, 0)).toBe('north')
  })

  it('rotates relative to whichever seat is dealer', () => {
    expect(seatWindFor(2, 2)).toBe('east')
    expect(seatWindFor(3, 2)).toBe('south')
    expect(seatWindFor(0, 2)).toBe('west')
    expect(seatWindFor(1, 2)).toBe('north')
  })
})

describe('startHand', () => {
  it('deals 13 tiles to each non-dealer seat and 14 to the dealer, dealer discards first', () => {
    const state = startHand({ seed: 42, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    expect(state.phase).toBe('awaitingDiscard')
    expect(state.currentSeat).toBe(0)
    for (const player of state.players) {
      const expected = player.seat === state.dealerSeat ? 14 : 13
      expect(player.hand.concealedTiles.length).toBe(expected)
      expect(player.hand.melds).toEqual([])
      expect(player.discards).toEqual([])
    }
  })

  it('conserves tiles: dealt concealed + flowers across all seats equals wall.drawIndex', () => {
    // Try several seeds to exercise both the flower-free and flower-during-deal paths.
    for (let seed = 0; seed < 30; seed++) {
      const state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
      const dealtTotal = state.players.reduce(
        (sum, p) => sum + p.hand.concealedTiles.length + p.hand.flowers.length,
        0,
      )
      expect(dealtTotal).toBe(state.wall.drawIndex)
      expect(dealtTotal).toBeGreaterThanOrEqual(INITIAL_DEAL_COUNT)
    }
  })

  it('assigns seat winds consistent with seatWindFor for a non-zero dealer', () => {
    const state = startHand({ seed: 7, handNumber: 5, prevailingWind: 'south', dealerSeat: 2 })
    for (const player of state.players) {
      expect(player.seatWind).toBe(seatWindFor(player.seat, 2))
    }
  })

  it('is deterministic for a given seed', () => {
    const a = startHand({ seed: 99, handNumber: 1, prevailingWind: 'east', dealerSeat: 1 })
    const b = startHand({ seed: 99, handNumber: 1, prevailingWind: 'east', dealerSeat: 1 })
    expect(a.players.map((p) => p.hand.concealedTiles)).toEqual(b.players.map((p) => p.hand.concealedTiles))
    expect(a.wall.drawIndex).toBe(b.wall.drawIndex)
  })
})
