import { describe, expect, it } from 'vitest'
import { performInitialDeal, seatWindFor, startHand } from './game-state.js'
import { INITIAL_DEAL_COUNT } from './wall.js'
import { buildDeck } from './tiles.js'

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
  it('deals three four-tile passes in seat order, then East one-and-three and the other final singles (§3.5.7.5)', () => {
    const tiles = buildDeck()
    const wall = { tiles, frontIndex: 0, backIndex: 143 }
    const dealt = performInitialDeal(wall, 0)

    expect(dealt.steps.slice(0, 12).map((step) => [step.kind, step.seat, step.tiles.length])).toEqual([
      ['four-tile-group', 0, 4], ['four-tile-group', 1, 4], ['four-tile-group', 2, 4], ['four-tile-group', 3, 4],
      ['four-tile-group', 0, 4], ['four-tile-group', 1, 4], ['four-tile-group', 2, 4], ['four-tile-group', 3, 4],
      ['four-tile-group', 0, 4], ['four-tile-group', 1, 4], ['four-tile-group', 2, 4], ['four-tile-group', 3, 4],
    ])
    expect(dealt.steps.slice(12, 16).map((step) => [step.kind, step.seat, step.tiles])).toEqual([
      ['dealer-final-two', 0, [48, 49]],
      ['final-single', 1, [50]],
      ['final-single', 2, [51]],
      ['final-single', 3, [52]],
    ])
    expect(dealt.hands[0].concealedTiles).toEqual([0, 1, 2, 3, 16, 17, 18, 19, 32, 33, 34, 35, 48, 49])
    expect(dealt.hands[1].concealedTiles).toEqual([4, 5, 6, 7, 20, 21, 22, 23, 36, 37, 38, 39, 50])
    expect(dealt.wall.frontIndex).toBe(53)
  })

  it('waits until all 53 primary tiles are dealt, then replaces Flowers from the back in dealer order', () => {
    const tiles = buildDeck().slice()
    ;[tiles[0], tiles[136]] = [tiles[136]!, tiles[0]!]
    ;[tiles[4], tiles[137]] = [tiles[137]!, tiles[4]!]
    const dealt = performInitialDeal({ tiles, frontIndex: 0, backIndex: 143 }, 0)
    const replacements = dealt.steps.filter((step) => step.kind === 'flower-replacement')

    expect(dealt.steps[15]!.wallAfter.frontIndex).toBe(INITIAL_DEAL_COUNT)
    expect(replacements.length).toBe(8)
    expect(replacements.every((step) => step.source === 'back' && step.wallAfter.frontIndex === INITIAL_DEAL_COUNT)).toBe(true)
    expect(replacements.map((step) => step.seat)).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
    expect(dealt.wall.frontIndex).toBe(INITIAL_DEAL_COUNT)
    expect(dealt.wall.backIndex).toBe(135)
    expect(dealt.hands[0].flowers).toHaveLength(7)
    expect(dealt.hands[1].flowers).toHaveLength(1)
    expect(dealt.hands[0].concealedTiles).toHaveLength(14)
    expect(dealt.hands[1].concealedTiles).toHaveLength(13)
  })

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

  it('conserves tiles: dealt concealed + flowers across all seats equals total tiles consumed from both wall ends', () => {
    // Try several seeds to exercise both the flower-free and flower-during-deal paths.
    for (let seed = 0; seed < 30; seed++) {
      const state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
      const dealtTotal = state.players.reduce(
        (sum, p) => sum + p.hand.concealedTiles.length + p.hand.flowers.length,
        0,
      )
      // KICKOFF-phase8-addendum-decisions.md: flower replacements drawn
      // during the deal come from the BACK end (§3.4.20 is general, not
      // deal-scoped), so the deal's own primary tiles (always exactly
      // INITIAL_DEAL_COUNT, one per dealOrder slot) advance frontIndex,
      // while any flower replacements advance backIndex instead — the two
      // together, not frontIndex alone, account for every tile dealt.
      expect(dealtTotal).toBe(144 - state.wall.backIndex + state.wall.frontIndex - 1)
      expect(state.wall.frontIndex).toBe(INITIAL_DEAL_COUNT)
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
    expect(a.wall.frontIndex).toBe(b.wall.frontIndex)
    expect(a.wall.backIndex).toBe(b.wall.backIndex)
  })
})
