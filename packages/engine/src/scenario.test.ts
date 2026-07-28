import { describe, expect, it } from 'vitest'
import { startScenarioHand, type ScenarioPreset } from './scenario.js'
import { typeIdOfInstance, type TileTypeId } from './tiles.js'
import type { Seat } from './meld.js'

function multisetOf(typeIds: readonly TileTypeId[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const id of typeIds) counts[id] = (counts[id] ?? 0) + 1
  return counts
}

const TWO_AWAY_FROM_MIXED_TRIPLE_CHOW: ScenarioPreset = {
  id: 'two-away-mixed-triple-chow',
  label: 'Two away from Mixed Triple Chow',
  description: 'test fixture',
  concealedTypeIds: ['C2', 'C3', 'D2', 'B2', 'B3', 'WE', 'WE', 'WS', 'DR', 'DR', 'C7', 'C8', 'C9'],
}

describe('startScenarioHand', () => {
  it("deals forSeat's exact requested multiset of tile types, for a non-dealer seat (13 tiles)", () => {
    const state = startScenarioHand({ preset: TWO_AWAY_FROM_MIXED_TRIPLE_CHOW, seed: 1, forSeat: 0 as Seat, dealerSeat: 2 as Seat })
    const hand = state.players[0]!.hand
    expect(hand.concealedTiles).toHaveLength(13)
    expect(multisetOf(hand.concealedTiles.map(typeIdOfInstance))).toEqual(multisetOf(TWO_AWAY_FROM_MIXED_TRIPLE_CHOW.concealedTypeIds))
  })

  it("deals forSeat's exact requested multiset when forSeat IS the dealer (14 tiles)", () => {
    const dealerPreset: ScenarioPreset = {
      id: 'dealer-scenario',
      label: 'Dealer scenario',
      description: 'test fixture',
      concealedTypeIds: [...TWO_AWAY_FROM_MIXED_TRIPLE_CHOW.concealedTypeIds, 'C1'],
    }
    const state = startScenarioHand({ preset: dealerPreset, seed: 1, forSeat: 0 as Seat, dealerSeat: 0 as Seat })
    const hand = state.players[0]!.hand
    expect(hand.concealedTiles).toHaveLength(14)
    expect(multisetOf(hand.concealedTiles.map(typeIdOfInstance))).toEqual(multisetOf(dealerPreset.concealedTypeIds))
  })

  it('deals every other seat a legal 13-tile hand', () => {
    const state = startScenarioHand({ preset: TWO_AWAY_FROM_MIXED_TRIPLE_CHOW, seed: 7, forSeat: 0 as Seat, dealerSeat: 2 as Seat })
    for (const seat of [1, 2, 3] as Seat[]) {
      const hand = state.players[seat]!.hand
      // Seat 2 is dealer, so it holds the folded-in 14th tile.
      expect(hand.concealedTiles.length).toBe(seat === 2 ? 14 : 13)
    }
  })

  it('the wall still totals 144 tiles across the deal, all hands, and the drawable remainder', () => {
    const state = startScenarioHand({ preset: TWO_AWAY_FROM_MIXED_TRIPLE_CHOW, seed: 3, forSeat: 0 as Seat, dealerSeat: 1 as Seat })
    const seen = new Set<number>()
    for (const tile of state.wall.tiles.slice(state.wall.drawIndex)) seen.add(tile)
    for (const player of state.players) {
      for (const tile of player.hand.concealedTiles) seen.add(tile)
      for (const tile of player.hand.flowers) seen.add(tile)
    }
    expect(seen.size).toBe(144)
  })

  it('is deterministic: the same seed reproduces identical dealt hands for the other seats', () => {
    const a = startScenarioHand({ preset: TWO_AWAY_FROM_MIXED_TRIPLE_CHOW, seed: 99, forSeat: 0 as Seat, dealerSeat: 1 as Seat })
    const b = startScenarioHand({ preset: TWO_AWAY_FROM_MIXED_TRIPLE_CHOW, seed: 99, forSeat: 0 as Seat, dealerSeat: 1 as Seat })
    expect(a).toEqual(b)
  })

  it('throws if the preset length does not match the expected dealer/non-dealer tile count', () => {
    const tooShort: ScenarioPreset = { id: 'bad', label: 'bad', description: 'test fixture', concealedTypeIds: ['C1', 'C2'] }
    expect(() => startScenarioHand({ preset: tooShort, seed: 1, forSeat: 0 as Seat, dealerSeat: 2 as Seat })).toThrow(/needs exactly 13/)
  })

  it('throws if the preset requests a flower/season type', () => {
    const badPreset: ScenarioPreset = {
      id: 'bad-flower',
      label: 'bad',
      description: 'test fixture',
      concealedTypeIds: [...TWO_AWAY_FROM_MIXED_TRIPLE_CHOW.concealedTypeIds.slice(0, 12), 'F1'],
    }
    expect(() => startScenarioHand({ preset: badPreset, seed: 1, forSeat: 0 as Seat, dealerSeat: 2 as Seat })).toThrow(/non-standard/)
  })

  it('throws if the preset requests more copies of a type than physically exist', () => {
    const tooManyDragons: ScenarioPreset = {
      id: 'bad-count',
      label: 'bad',
      description: 'test fixture',
      concealedTypeIds: ['DR', 'DR', 'DR', 'DR', 'DR', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
    }
    expect(() => startScenarioHand({ preset: tooManyDragons, seed: 1, forSeat: 0 as Seat, dealerSeat: 2 as Seat })).toThrow()
  })
})
