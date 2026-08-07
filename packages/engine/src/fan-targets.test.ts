import { describe, expect, it } from 'vitest'
import { estimateAllPungs, estimateDragonTargets, estimateFanTargets, estimateHalfFullFlush, estimateSevenPairs, estimateSimplesAndHonors, estimateWindTargets } from './fan-targets.js'
import { emptyHand, type Hand } from './hand.js'
import type { Meld } from './meld.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'

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

function pungMeld(id: string, typeId: TileTypeId): Meld {
  return { id, kind: 'pung', exposure: 'exposed', tiles: idsFor(typeId, 3), ownerSeat: 0 }
}

function chowMeld(id: string, typeIds: [TileTypeId, TileTypeId, TileTypeId]): Meld {
  return { id, kind: 'chow', exposure: 'exposed', tiles: typeIds.map((t) => idsFor(t, 1)[0]!), ownerSeat: 0 }
}

describe('estimateSevenPairs', () => {
  it('returns null when the hand has any meld (structurally impossible)', () => {
    const hand = handWith([...idsFor('C1', 2), ...idsFor('C2', 2)], [pungMeld('0-0', 'D5')])
    expect(estimateSevenPairs(hand)).toBeNull()
  })

  it('reports inProgress with the singles as tilesNeeded, for a concealed hand with several pairs', () => {
    // 5 pairs + 3 singles = 13 tiles, sevenPairsShantenFromCounts: kinds=8, pairs=5 -> shanten = 6-5+0 = 1
    const hand = handWith([
      ...idsFor('C1', 2),
      ...idsFor('C2', 2),
      ...idsFor('C3', 2),
      ...idsFor('C4', 2),
      ...idsFor('C5', 2),
      ...idsFor('C6', 1),
      ...idsFor('C7', 1),
      ...idsFor('C8', 1),
    ])
    const estimate = estimateSevenPairs(hand)
    expect(estimate).not.toBeNull()
    expect(estimate!.fanId).toBe(19)
    expect(estimate!.points).toBe(24)
    expect(estimate!.status).toBe('inProgress')
    expect(estimate!.probabilityBasis).toBe('shanten')
    expect(estimate!.tilesNeeded.sort()).toEqual(['C6', 'C7', 'C8'])
    expect(estimate!.completionProbability).toBeCloseTo((6 - 1) / 7)
    expect(estimate!.value).toBeCloseTo(estimate!.completionProbability * 24)
  })

  it('reports locked with empty tilesNeeded for a complete seven-pairs hand', () => {
    const hand = handWith([
      ...idsFor('C1', 2),
      ...idsFor('C2', 2),
      ...idsFor('C3', 2),
      ...idsFor('C4', 2),
      ...idsFor('C5', 2),
      ...idsFor('C6', 2),
      ...idsFor('C7', 2),
    ])
    const estimate = estimateSevenPairs(hand)
    expect(estimate).not.toBeNull()
    expect(estimate!.status).toBe('locked')
    expect(estimate!.tilesNeeded).toEqual([])
    expect(estimate!.completionProbability).toBe(1)
  })
})

describe('estimateHalfFullFlush', () => {
  it('returns null when melds already span more than one suit', () => {
    const hand = handWith([...idsFor('C1', 4)], [pungMeld('0-0', 'D5'), pungMeld('0-1', 'B3')])
    expect(estimateHalfFullFlush(hand)).toBeNull()
  })

  it('targets Half Flush (fan 50) once an honor tile is present, with offending other-suit tiles as tilesNeeded', () => {
    const hand = handWith([...idsFor('C1', 3), ...idsFor('C2', 3), ...idsFor('WE', 2), ...idsFor('D5', 2)])
    const estimate = estimateHalfFullFlush(hand)
    expect(estimate).not.toBeNull()
    expect(estimate!.fanId).toBe(50)
    expect(estimate!.points).toBe(6)
    expect(estimate!.probabilityBasis).toBe('heuristic')
    expect(estimate!.status).toBe('inProgress')
    expect(estimate!.tilesNeeded).toEqual(['D5'])
  })

  it('targets Full Flush (fan 22) when no honors are present, and reports locked once every tile matches', () => {
    const hand = handWith([...idsFor('C1', 3), ...idsFor('C2', 3), ...idsFor('C3', 3), ...idsFor('C4', 3), ...idsFor('C5', 1)])
    const estimate = estimateHalfFullFlush(hand)
    expect(estimate).not.toBeNull()
    expect(estimate!.fanId).toBe(22)
    expect(estimate!.points).toBe(24)
    expect(estimate!.status).toBe('locked')
    expect(estimate!.tilesNeeded).toEqual([])
    expect(estimate!.completionProbability).toBe(1)
  })

  it('returns null when there are no suited tiles at all toward any flush', () => {
    const hand = handWith([...idsFor('WE', 3), ...idsFor('WS', 3), ...idsFor('DR', 3), ...idsFor('DG', 3)])
    expect(estimateHalfFullFlush(hand)).toBeNull()
  })
})

describe('estimateDragonTargets', () => {
  it('returns empty when no dragon has any concealed or melded copy', () => {
    const hand = handWith([...idsFor('C1', 3), ...idsFor('C2', 3)])
    expect(estimateDragonTargets(hand)).toEqual([])
  })

  it('emits a Dragon Pung (fan 59) target for a partial dragon, no Big Three Dragons target below 2 complete', () => {
    const hand = handWith([...idsFor('DR', 2), ...idsFor('C1', 3)])
    const results = estimateDragonTargets(hand)
    expect(results).toHaveLength(1)
    expect(results[0]!.fanId).toBe(59)
    expect(results[0]!.points).toBe(2)
    expect(results[0]!.probabilityBasis).toBe('shanten')
    expect(results[0]!.status).toBe('inProgress')
    expect(results[0]!.tilesNeeded).toEqual(['DR'])
    expect(results[0]!.completionProbability).toBeCloseTo(2 / 3)
  })

  it('emits both a Dragon Pung target for the closest remaining dragon and an inProgress Big Three Dragons target once 2 are complete', () => {
    const hand = handWith([...idsFor('DW', 2)], [pungMeld('0-0', 'DR'), pungMeld('0-1', 'DG')])
    const results = estimateDragonTargets(hand)
    const dragonPung = results.find((r) => r.fanId === 59)
    const bigThree = results.find((r) => r.fanId === 2)
    expect(dragonPung).toBeDefined()
    expect(dragonPung!.tilesNeeded).toEqual(['DW'])
    expect(bigThree).toBeDefined()
    expect(bigThree!.status).toBe('inProgress')
    expect(bigThree!.points).toBe(88)
    expect(bigThree!.tilesNeeded).toEqual(['DW'])
    expect(bigThree!.completionProbability).toBeCloseTo(2 / 3)
  })

  it('emits a locked Big Three Dragons target and no Dragon Pung target once all three are complete', () => {
    const hand = handWith([...idsFor('C1', 1)], [pungMeld('0-0', 'DR'), pungMeld('0-1', 'DG'), pungMeld('0-2', 'DW')])
    const results = estimateDragonTargets(hand)
    expect(results).toHaveLength(1)
    expect(results[0]!.fanId).toBe(2)
    expect(results[0]!.status).toBe('locked')
    expect(results[0]!.tilesNeeded).toEqual([])
    expect(results[0]!.completionProbability).toBe(1)
    expect(results[0]!.value).toBe(88)
  })

  it('recognizes a complete dragon pung sitting concealed (never declared as a meld)', () => {
    const hand = handWith([...idsFor('DR', 3), ...idsFor('C1', 1)])
    const results = estimateDragonTargets(hand)
    expect(results).toEqual([])
  })
})

describe('estimateAllPungs', () => {
  it('returns null when the hand has any chow meld (structurally impossible)', () => {
    const hand = handWith([...idsFor('C1', 3), ...idsFor('C2', 2)], [chowMeld('0-0', ['D4', 'D5', 'D6'])])
    expect(estimateAllPungs(hand)).toBeNull()
  })

  it('returns null when nothing is even a pair yet (too speculative for v1)', () => {
    const hand = handWith([
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('B1', 1), ...idsFor('B4', 1), ...idsFor('B7', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
    ])
    expect(estimateAllPungs(hand)).toBeNull()
  })

  it('reports inProgress with each pair-toward-pung as tilesNeeded, for one pung + five pairs', () => {
    // 1 complete pung (C1) + 5 pairs; n=4, best found by reserving one pair
    // as head: shanten = 8 - 2*(1) [C1 pung via value] ... see fan-targets.ts's
    // own worked example in the estimator's comment for the by-hand trace.
    const hand = handWith([
      ...idsFor('C1', 3), ...idsFor('C2', 2), ...idsFor('C3', 2),
      ...idsFor('C4', 2), ...idsFor('C5', 2), ...idsFor('C6', 2),
    ])
    const estimate = estimateAllPungs(hand)
    expect(estimate).not.toBeNull()
    expect(estimate!.fanId).toBe(49)
    expect(estimate!.points).toBe(6)
    expect(estimate!.probabilityBasis).toBe('shanten')
    expect(estimate!.status).toBe('inProgress')
    expect(estimate!.tilesNeeded.sort()).toEqual(['C2', 'C3', 'C4', 'C5', 'C6'])
    expect(estimate!.completionProbability).toBeCloseTo((8 - 2) / 9)
    expect(estimate!.value).toBeCloseTo(estimate!.completionProbability * 6)
  })

  it('reports locked with empty tilesNeeded for a complete all-pungs hand', () => {
    const hand = handWith(
      [...idsFor('C1', 3), ...idsFor('C9', 2)],
      [pungMeld('0-0', 'WE'), pungMeld('0-1', 'WS'), pungMeld('0-2', 'DR')],
    )
    const estimate = estimateAllPungs(hand)
    expect(estimate).not.toBeNull()
    expect(estimate!.status).toBe('locked')
    expect(estimate!.tilesNeeded).toEqual([])
    expect(estimate!.completionProbability).toBe(1)
  })
})

describe('estimateWindTargets', () => {
  it('returns empty with no context supplied', () => {
    const hand = handWith([...idsFor('WE', 2), ...idsFor('C1', 3)])
    expect(estimateWindTargets(hand)).toEqual([])
  })

  it('reports inProgress for a partial prevailing-wind pung', () => {
    const hand = handWith([...idsFor('WE', 2), ...idsFor('C1', 3)])
    const results = estimateWindTargets(hand, { prevailingWind: 'east' })
    expect(results).toHaveLength(1)
    expect(results[0]!.fanId).toBe(60)
    expect(results[0]!.points).toBe(2)
    expect(results[0]!.probabilityBasis).toBe('heuristic')
    expect(results[0]!.status).toBe('inProgress')
    expect(results[0]!.tilesNeeded).toEqual(['WE'])
    expect(results[0]!.completionProbability).toBeCloseTo(2 / 3)
  })

  it('reports locked for a melded seat-wind pung', () => {
    const hand = handWith([...idsFor('C1', 1)], [pungMeld('0-0', 'WS')])
    const results = estimateWindTargets(hand, { seatWind: 'south' })
    expect(results).toHaveLength(1)
    expect(results[0]!.fanId).toBe(61)
    expect(results[0]!.status).toBe('locked')
    expect(results[0]!.tilesNeeded).toEqual([])
    expect(results[0]!.completionProbability).toBe(1)
  })

  it('emits both fan 60 and fan 61 when prevailing and seat wind coincide', () => {
    const hand = handWith([...idsFor('WN', 3), ...idsFor('C1', 1)])
    const results = estimateWindTargets(hand, { prevailingWind: 'north', seatWind: 'north' })
    expect(results.map((r) => r.fanId).sort()).toEqual([60, 61])
    for (const r of results) {
      expect(r.status).toBe('locked')
      expect(r.completionProbability).toBe(1)
    }
  })

  it('returns nothing for a wind with zero copies (too speculative for v1)', () => {
    const hand = handWith([...idsFor('C1', 3), ...idsFor('C2', 3)])
    expect(estimateWindTargets(hand, { prevailingWind: 'west' })).toEqual([])
  })
})

describe('estimateSimplesAndHonors', () => {
  it('returns empty when a meld contains an honor tile', () => {
    const hand = handWith([...idsFor('C1', 1)], [pungMeld('0-0', 'WE')])
    expect(estimateSimplesAndHonors(hand)).toEqual([])
  })

  it('still reports No Honors but not All Simples when a meld has a terminal but no honor', () => {
    const hand = handWith([...idsFor('C5', 1)], [pungMeld('0-0', 'C1')])
    const results = estimateSimplesAndHonors(hand)
    expect(results).toHaveLength(1)
    expect(results[0]!.fanId).toBe(76)
  })

  it('reports both inProgress with offending tiles as tilesNeeded', () => {
    const hand = handWith([...idsFor('C5', 4), ...idsFor('C6', 4), ...idsFor('C8', 3), ...idsFor('WE', 1), ...idsFor('C1', 1)])
    const results = estimateSimplesAndHonors(hand)
    const noHonors = results.find((r) => r.fanId === 76)!
    const allSimples = results.find((r) => r.fanId === 68)!
    expect(noHonors.status).toBe('inProgress')
    expect(noHonors.tilesNeeded).toEqual(['WE'])
    expect(allSimples.status).toBe('inProgress')
    expect(allSimples.tilesNeeded.sort()).toEqual(['C1', 'WE'])
  })

  it('reports both locked for a hand with no terminal or honor tiles anywhere', () => {
    const hand = handWith([...idsFor('C5', 4), ...idsFor('C6', 4), ...idsFor('D5', 4), ...idsFor('D6', 1)])
    const results = estimateSimplesAndHonors(hand)
    expect(results).toHaveLength(2)
    for (const r of results) {
      expect(r.status).toBe('locked')
      expect(r.completionProbability).toBe(1)
    }
  })
})

describe('estimateFanTargets', () => {
  it('aggregates all applicable families, sorted by value descending', () => {
    // 2 dragon pungs concealed/melded plus a near-flush shape: several
    // families should fire at once.
    const hand = handWith([...idsFor('DW', 2), ...idsFor('C1', 3), ...idsFor('C2', 3)], [pungMeld('0-0', 'DR'), pungMeld('0-1', 'DG')])
    const results = estimateFanTargets(hand)
    expect(results.length).toBeGreaterThan(1)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.value).toBeGreaterThanOrEqual(results[i]!.value)
    }
    expect(results.some((r) => r.fanId === 2)).toBe(true)
    expect(results.some((r) => r.fanId === 59)).toBe(true)
  })

  it('returns an empty array for a hand with no reachable v1 targets', () => {
    // 4 distinct melded pungs across suits/honors, one concealed tile left:
    // seven pairs is impossible (has melds), flush is impossible (melds
    // span multiple suits), and no dragon has any copy.
    const hand = handWith(
      [...idsFor('C1', 1)],
      [pungMeld('0-0', 'D2'), pungMeld('0-1', 'B3'), pungMeld('0-2', 'WE'), pungMeld('0-3', 'WS')],
    )
    expect(estimateFanTargets(hand)).toEqual([])
  })
})
