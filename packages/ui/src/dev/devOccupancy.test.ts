import { describe, expect, it } from 'vitest'
import { startHand, typeIdOfInstance } from '@mahjong-mcr/engine'
import { applyDevOccupancy, parseDevOccupancyMode } from './devOccupancy.js'

function freshState() {
  return startHand({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
}

describe('parseDevOccupancyMode', () => {
  it('recognizes preview/worst/oneChow/threeMelds and rejects anything else', () => {
    expect(parseDevOccupancyMode('?occupancy=worst')).toBe('worst')
    expect(parseDevOccupancyMode('?occupancy=preview')).toBe('preview')
    expect(parseDevOccupancyMode('?occupancy=oneChow')).toBe('oneChow')
    expect(parseDevOccupancyMode('?occupancy=threeMelds')).toBe('threeMelds')
    expect(parseDevOccupancyMode('?occupancy=bogus')).toBeNull()
    expect(parseDevOccupancyMode('')).toBeNull()
  })
})

describe("applyDevOccupancy('preview')", () => {
  it('fills every river, shows five human flowers, maximises the left bot at eight, and makes north a three-kong hand', () => {
    const state = applyDevOccupancy(freshState(), 'preview', 0)
    for (const player of state.players) {
      expect(player.discards).toHaveLength(25)
      expect(player.hand.flowers).toHaveLength(player.seat === 1 ? 8 : 5)
      expect(player.hand.melds).toHaveLength(player.seat === 2 ? 3 : 2)
    }
    expect(state.players[0].hand.flowers).toHaveLength(5)
    expect(state.players[1].hand.flowers).toHaveLength(8)
    expect(state.players[2].hand.melds.every((meld) => meld.kind === 'kong')).toBe(true)
  })
})

// Caught live during KICKOFF-phase9-human-melds.md's own visual
// verification (ux-reviewer): 'worst' mode's synthetic kongs drew their 4
// tiles from a shared rolling id cursor with no type check, so they weren't
// actually 4-of-a-kind — a "kong" of mismatched tiles reads as visibly
// broken in a screenshot and undermined verifying item 4's concealed-kong
// (2 back / 2 face) rendering. Locking this in so it can't silently regress.
describe("applyDevOccupancy('worst') synthetic kongs", () => {
  it('fills every discard zone to its exact 5x5 visual capacity', () => {
    const state = applyDevOccupancy(freshState(), 'worst', 0)
    expect(state.players.map((player) => player.discards.length)).toEqual([25, 25, 25, 25])
  })

  it('every synthetic kong is 4 tiles of the same type, for every seat', () => {
    const state = applyDevOccupancy(freshState(), 'worst', 0)
    for (const player of state.players) {
      expect(player.hand.melds).toHaveLength(4)
      for (const meld of player.hand.melds) {
        expect(meld.kind).toBe('kong')
        expect(meld.tiles).toHaveLength(4)
        const types = new Set(meld.tiles.map(typeIdOfInstance))
        expect(types.size, `meld ${meld.id} tiles: ${meld.tiles.join(',')}`).toBe(1)
      }
    }
  })

  it("makes exactly one of each seat's 4 kongs concealed (kongSource 'concealed'), for item 4's visual check", () => {
    const state = applyDevOccupancy(freshState(), 'worst', 0)
    for (const player of state.players) {
      const concealedKongs = player.hand.melds.filter((m) => m.kongSource === 'concealed')
      expect(concealedKongs).toHaveLength(1)
    }
  })
})

describe("applyDevOccupancy('threeMelds') human hand", () => {
  it('gives the human a pung, a chow, and a concealed kong, all internally coherent (real matching types)', () => {
    const state = applyDevOccupancy(freshState(), 'threeMelds', 0)
    const melds = state.players[0]!.hand.melds
    expect(melds.map((m) => m.kind).sort()).toEqual(['chow', 'kong', 'pung'])

    const pung = melds.find((m) => m.kind === 'pung')!
    expect(new Set(pung.tiles.map(typeIdOfInstance)).size).toBe(1)

    const kong = melds.find((m) => m.kind === 'kong')!
    expect(new Set(kong.tiles.map(typeIdOfInstance)).size).toBe(1)
    expect(kong.kongSource).toBe('concealed')
  })

  it('leaves the other three seats untouched', () => {
    const before = freshState()
    const after = applyDevOccupancy(before, 'threeMelds', 0)
    for (const seat of [1, 2, 3] as const) {
      expect(after.players[seat]).toEqual(before.players[seat])
    }
  })
})
