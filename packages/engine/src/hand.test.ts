import { describe, expect, it } from 'vitest'
import {
  addFlower,
  addMeld,
  addToConcealed,
  emptyHand,
  expectedHandTileCount,
  handTileCount,
  promoteMeldToKong,
  removeFromConcealed,
} from './hand.js'
import type { Meld } from './meld.js'

function pungMeld(id: string, tiles: number[]): Meld {
  return { id, kind: 'pung', exposure: 'exposed', tiles, ownerSeat: 0 }
}

describe('hand mutators (pure, do not mutate input)', () => {
  it('addToConcealed appends without mutating original', () => {
    const hand = emptyHand()
    const next = addToConcealed(hand, 5)
    expect(next.concealedTiles).toEqual([5])
    expect(hand.concealedTiles).toEqual([])
  })

  it('addFlower appends to flowers without mutating original', () => {
    const hand = emptyHand()
    const next = addFlower(hand, 136)
    expect(next.flowers).toEqual([136])
    expect(hand.flowers).toEqual([])
  })

  it('removeFromConcealed removes exactly the given instances', () => {
    const hand = { ...emptyHand(), concealedTiles: [1, 2, 2, 3] }
    const next = removeFromConcealed(hand, [2])
    expect(next.concealedTiles).toEqual([1, 2, 3])
    expect(hand.concealedTiles).toEqual([1, 2, 2, 3]) // unmutated
  })

  it('removeFromConcealed throws if a tile is not present', () => {
    const hand = { ...emptyHand(), concealedTiles: [1, 2, 3] }
    expect(() => removeFromConcealed(hand, [99])).toThrow()
  })

  it('addMeld removes consumed tiles and appends the meld', () => {
    const hand = { ...emptyHand(), concealedTiles: [10, 11, 20, 21] }
    const meld = pungMeld('0-0', [10, 11, 99])
    const next = addMeld(hand, meld, [10, 11])
    expect(next.concealedTiles).toEqual([20, 21])
    expect(next.melds).toEqual([meld])
  })

  it('promoteMeldToKong upgrades a pung and removes the added tile', () => {
    const hand = { ...emptyHand(), concealedTiles: [50], melds: [pungMeld('0-0', [10, 11, 12])] }
    const next = promoteMeldToKong(hand, '0-0', 50)
    expect(next.concealedTiles).toEqual([])
    expect(next.melds[0]).toEqual({
      id: '0-0',
      kind: 'kong',
      exposure: 'exposed',
      kongSource: 'promotedFromPung',
      tiles: [10, 11, 12, 50],
      ownerSeat: 0,
    })
  })

  it('promoteMeldToKong throws if the meld is not a pung', () => {
    const chow: Meld = { id: '0-0', kind: 'chow', exposure: 'exposed', tiles: [1, 5, 9], ownerSeat: 0 }
    const hand = { ...emptyHand(), concealedTiles: [50], melds: [chow] }
    expect(() => promoteMeldToKong(hand, '0-0', 50)).toThrow()
  })
})

describe('handTileCount / expectedHandTileCount', () => {
  it('matches 13 + kongCount for a settled (post-discard) hand', () => {
    const hand = {
      concealedTiles: Array.from({ length: 10 }, (_, i) => i),
      melds: [pungMeld('0-0', [90, 91, 92])],
      flowers: [],
    }
    expect(handTileCount(hand)).toBe(13)
    expect(expectedHandTileCount(hand, false)).toBe(13)
    expect(expectedHandTileCount(hand, true)).toBe(14)
  })

  it('accounts for kongs adding one to the expected count', () => {
    const kong: Meld = {
      id: '0-0',
      kind: 'kong',
      exposure: 'exposed',
      kongSource: 'exposedFromDiscard',
      tiles: [1, 2, 3, 4],
      ownerSeat: 0,
    }
    const hand = { concealedTiles: Array.from({ length: 9 }, (_, i) => i + 10), melds: [kong], flowers: [] }
    expect(handTileCount(hand)).toBe(13)
    expect(expectedHandTileCount(hand, false)).toBe(14)
  })
})

