import { describe, expect, it } from 'vitest'
import { FANS_88_DETECTORS } from './fans-88.js'
import type { HandContext } from './types.js'
import type { Decomposition } from '../win-detection.js'
import type { Meld } from '../meld.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileTypeId } from '../tiles.js'

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function pungMeld(id: string, tiles: number[]): Meld {
  return { id, kind: 'pung', exposure: 'exposed', tiles, ownerSeat: 0 }
}

function kongMeld(id: string, tiles: number[]): Meld {
  return { id, kind: 'kong', exposure: 'exposed', kongSource: 'exposedFromDiscard', tiles, ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Big Four Winds (fan 1)', () => {
  it('matches 4 wind pungs (melds) + any pair', () => {
    const melds = [
      pungMeld('0-0', idsFor('WE', 3)),
      pungMeld('0-1', idsFor('WS', 3)),
      pungMeld('0-2', idsFor('WW', 3)),
      pungMeld('0-3', idsFor('WN', 3)),
    ]
    const decomposition: Decomposition = { pair: 'C1', sets: [] }
    const ctx = ctxWith({ concealedTiles: idsFor('C1', 2), melds, decomposition })
    expect(FANS_88_DETECTORS[1]!(ctx)).toEqual([{ fanId: 1, count: 1 }])
  })

  it('rejects only 3 wind pungs plus a non-wind set', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3)), pungMeld('0-2', idsFor('WW', 3))]
    const decomposition: Decomposition = { pair: 'C1', sets: [{ type: 'chow', tiles: ['D1', 'D2', 'D3'] }] }
    const ctx = ctxWith({ concealedTiles: [...idsFor('C1', 2), ...idsFor('D1', 1), ...idsFor('D2', 1), ...idsFor('D3', 1)], melds, decomposition })
    expect(FANS_88_DETECTORS[1]!(ctx)).toEqual([])
  })
})

describe('Big Three Dragons (fan 2)', () => {
  it('matches 3 dragon pungs plus any 4th set and pair', () => {
    const melds = [pungMeld('0-0', idsFor('DR', 3)), pungMeld('0-1', idsFor('DG', 3)), pungMeld('0-2', idsFor('DW', 3))]
    const decomposition: Decomposition = { pair: 'C9', sets: [{ type: 'chow', tiles: ['C1', 'C2', 'C3'] }] }
    const ctx = ctxWith({
      concealedTiles: [...idsFor('C9', 2), ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1)],
      melds,
      decomposition,
    })
    expect(FANS_88_DETECTORS[2]!(ctx)).toEqual([{ fanId: 2, count: 1 }])
  })

  it('rejects only 2 dragon pungs', () => {
    const melds = [pungMeld('0-0', idsFor('DR', 3)), pungMeld('0-1', idsFor('DG', 3))]
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_88_DETECTORS[2]!(ctx)).toEqual([])
  })
})

describe('All Green (fan 3)', () => {
  it('matches when every tile is from the green set (2/3/4/6/8 Bam + Green Dragon)', () => {
    const concealedTiles = [
      ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('B4', 1),
      ...idsFor('B6', 3),
      ...idsFor('DG', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[3]!(ctx)).toEqual([{ fanId: 3, count: 1 }])
  })

  it('rejects a hand with one non-green tile', () => {
    const concealedTiles = [
      ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('B4', 1),
      ...idsFor('B6', 3),
      ...idsFor('C1', 2), // not green
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[3]!(ctx)).toEqual([])
  })
})

describe('Nine Gates (fan 4)', () => {
  it('matches the base 1,1,1,2,3,4,5,6,7,8,9,9,9 shape plus one more tile in the same suit', () => {
    const concealedTiles = [
      ...idsFor('C1', 3),
      ...idsFor('C2', 1), ...idsFor('C3', 1), ...idsFor('C4', 1),
      ...idsFor('C5', 2), // the +1 completing tile lands on 5
      ...idsFor('C6', 1), ...idsFor('C7', 1), ...idsFor('C8', 1),
      ...idsFor('C9', 3),
    ]
    expect(concealedTiles.length).toBe(14)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[4]!(ctx)).toEqual([{ fanId: 4, count: 1 }])
  })

  it('rejects a bare 13-tile hand (not yet complete)', () => {
    const concealedTiles = [
      ...idsFor('C1', 3),
      ...idsFor('C2', 1), ...idsFor('C3', 1), ...idsFor('C4', 1), ...idsFor('C5', 1),
      ...idsFor('C6', 1), ...idsFor('C7', 1), ...idsFor('C8', 1),
      ...idsFor('C9', 3),
    ]
    expect(concealedTiles.length).toBe(13)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[4]!(ctx)).toEqual([])
  })

  it('rejects the right tile counts spread across two suits', () => {
    const concealedTiles = [
      ...idsFor('C1', 3),
      ...idsFor('C2', 1), ...idsFor('C3', 1), ...idsFor('C4', 1), ...idsFor('C5', 1),
      ...idsFor('C6', 1), ...idsFor('C7', 1), ...idsFor('C8', 1),
      ...idsFor('C9', 2),
      ...idsFor('D9', 1), // wrong suit for the 14th tile
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[4]!(ctx)).toEqual([])
  })
})

describe('Four Kongs (fan 5)', () => {
  it('matches 4 kong melds', () => {
    const melds = [
      kongMeld('0-0', idsFor('WE', 4)),
      kongMeld('0-1', idsFor('C1', 4)),
      kongMeld('0-2', idsFor('D5', 4)),
      kongMeld('0-3', idsFor('DR', 4)),
    ]
    const ctx = ctxWith({ melds })
    expect(FANS_88_DETECTORS[5]!(ctx)).toEqual([{ fanId: 5, count: 1 }])
  })

  it('rejects 3 kongs plus a pung', () => {
    const melds = [
      kongMeld('0-0', idsFor('WE', 4)),
      kongMeld('0-1', idsFor('C1', 4)),
      kongMeld('0-2', idsFor('D5', 4)),
      pungMeld('0-3', idsFor('DR', 3)),
    ]
    const ctx = ctxWith({ melds })
    expect(FANS_88_DETECTORS[5]!(ctx)).toEqual([])
  })
})

describe('Seven Shifted Pairs (fan 6)', () => {
  it('matches 7 consecutive-rank pairs in one suit', () => {
    const concealedTiles = [
      ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2), ...idsFor('D5', 2),
      ...idsFor('D6', 2), ...idsFor('D7', 2), ...idsFor('D8', 2),
    ]
    const ctx = ctxWith({ concealedTiles, specialShape: 'sevenPairs' })
    expect(FANS_88_DETECTORS[6]!(ctx)).toEqual([{ fanId: 6, count: 1 }])
  })

  it('rejects a matching tile shape when specialShape is not sevenPairs (avoids piggybacking on a standard-decomposition candidate)', () => {
    const concealedTiles = [
      ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2), ...idsFor('D5', 2),
      ...idsFor('D6', 2), ...idsFor('D7', 2), ...idsFor('D8', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[6]!(ctx)).toEqual([])
  })

  it('rejects 7 pairs in one suit that are not consecutive', () => {
    const concealedTiles = [
      ...idsFor('D1', 2), ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2),
      ...idsFor('D5', 2), ...idsFor('D6', 2), ...idsFor('D9', 2), // gap before the last pair
    ]
    const ctx = ctxWith({ concealedTiles, specialShape: 'sevenPairs' })
    expect(FANS_88_DETECTORS[6]!(ctx)).toEqual([])
  })

  it('rejects 7 consecutive-rank pairs spanning two suits', () => {
    const concealedTiles = [
      ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2), ...idsFor('D5', 2),
      ...idsFor('D6', 2), ...idsFor('D7', 2), ...idsFor('C8', 2),
    ]
    const ctx = ctxWith({ concealedTiles, specialShape: 'sevenPairs' })
    expect(FANS_88_DETECTORS[6]!(ctx)).toEqual([])
  })
})

describe('Thirteen Orphans (fan 7)', () => {
  it('matches one of each of the 13 terminal/honor types plus a pair of one', () => {
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C9', 1), ...idsFor('D1', 1), ...idsFor('D9', 1),
      ...idsFor('B1', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 2),
    ]
    const ctx = ctxWith({ concealedTiles, specialShape: 'thirteenOrphans' })
    expect(FANS_88_DETECTORS[7]!(ctx)).toEqual([{ fanId: 7, count: 1 }])
  })

  it('rejects the same tile shape when specialShape is not thirteenOrphans', () => {
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C9', 1), ...idsFor('D1', 1), ...idsFor('D9', 1),
      ...idsFor('B1', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[7]!(ctx)).toEqual([])
  })

  it('rejects a standard hand', () => {
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_88_DETECTORS[7]!(ctx)).toEqual([])
  })
})
