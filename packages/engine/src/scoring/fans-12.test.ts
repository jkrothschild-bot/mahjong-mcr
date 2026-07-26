import { describe, expect, it } from 'vitest'
import { FANS_12_DETECTORS } from './fans-12.js'
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

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Lesser Honors and Knitted Tiles (fan 34)', () => {
  it('matches 6 honors plus 8 suit singles split across 3 different knitted sequences', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), // 6 honors, missing DW
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1), // Characters: full 1-4-7
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1), // Dots: full 2-5-8
      ...idsFor('B3', 1), ...idsFor('B6', 1), // Bamboo: 2 of 3-6-9
    ]
    expect(concealedTiles.length).toBe(14)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[34]!(ctx)).toEqual([{ fanId: 34, count: 1 }])
  })

  it('rejects exactly 7 honors (that is Greater Honors and Knitted Tiles, fan 20, not this one)', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D2', 1), ...idsFor('D5', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1),
    ]
    expect(concealedTiles.length).toBe(14)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[34]!(ctx)).toEqual([])
  })

  it('rejects two suits sharing the same knitted sequence', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1),
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1), // Characters: seq 1-4-7
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1), // Dots: ALSO seq 1-4-7
      ...idsFor('B3', 1), ...idsFor('B6', 1),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[34]!(ctx)).toEqual([])
  })
})

describe('Knitted Straight (fan 35)', () => {
  it('matches 9 knitted tiles (full sequences, one per suit) plus a pung and a pair', () => {
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('D1', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[35]!(ctx)).toEqual([{ fanId: 35, count: 1 }])
  })

  it('matches with one real exposed meld standing in for one of the 3 knitted-adjacent sets', () => {
    // melds.length = 1 -> additionalSetsNeeded = 0, so the 9 knitted tiles
    // plus the exposed meld already account for all 4 sets; only a pair
    // remains in concealedTiles.
    const melds = [pungMeld('0-0', idsFor('WE', 3))]
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('D1', 2),
    ]
    expect(concealedTiles.length).toBe(11)
    const ctx = ctxWith({ melds, concealedTiles })
    expect(FANS_12_DETECTORS[35]!(ctx)).toEqual([{ fanId: 35, count: 1 }])
  })

  it('rejects a hand missing one tile of a knitted sequence', () => {
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C8', 1), // C8 instead of C7 — breaks the 1-4-7 sequence
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('D1', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[35]!(ctx)).toEqual([])
  })

  it('rejects a hand with 2 real exposed melds (cannot fit 3 knitted-equivalent sets)', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3))]
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1),
    ]
    const ctx = ctxWith({ melds, concealedTiles })
    expect(FANS_12_DETECTORS[35]!(ctx)).toEqual([])
  })
})

describe('Upper Four / Lower Four (fans 36/37)', () => {
  it('Upper Four matches a hand entirely of ranks 6-9', () => {
    const concealedTiles = [
      ...idsFor('C6', 3), ...idsFor('C7', 3), ...idsFor('C8', 3),
      ...idsFor('D9', 3), ...idsFor('D6', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[36]!(ctx)).toEqual([{ fanId: 36, count: 1 }])
  })

  it('Upper Four rejects a hand containing a rank-5 tile', () => {
    const concealedTiles = [...idsFor('C5', 1), ...idsFor('C6', 3), ...idsFor('C7', 3), ...idsFor('C8', 3), ...idsFor('D9', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[36]!(ctx)).toEqual([])
  })

  it('Lower Four matches a hand entirely of ranks 1-4', () => {
    const concealedTiles = [
      ...idsFor('C1', 3), ...idsFor('C2', 3), ...idsFor('C3', 3),
      ...idsFor('D4', 3), ...idsFor('D1', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[37]!(ctx)).toEqual([{ fanId: 37, count: 1 }])
  })

  it('Lower Four rejects a hand containing a rank-5 tile', () => {
    const concealedTiles = [...idsFor('C5', 1), ...idsFor('C1', 3), ...idsFor('C2', 3), ...idsFor('C3', 3), ...idsFor('D4', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_12_DETECTORS[37]!(ctx)).toEqual([])
  })
})

describe('Big Three Winds (fan 38)', () => {
  it('matches exactly 3 wind pungs plus any pair', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3)), pungMeld('0-2', idsFor('WW', 3))]
    const decomposition: Decomposition = { pair: 'C1', sets: [{ type: 'chow', tiles: ['D1', 'D2', 'D3'] }] }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_12_DETECTORS[38]!(ctx)).toEqual([{ fanId: 38, count: 1 }])
  })

  it('rejects 4 wind pungs (that is Big Four Winds, fan 1, not this one)', () => {
    const melds = [
      pungMeld('0-0', idsFor('WE', 3)),
      pungMeld('0-1', idsFor('WS', 3)),
      pungMeld('0-2', idsFor('WW', 3)),
      pungMeld('0-3', idsFor('WN', 3)),
    ]
    const decomposition: Decomposition = { pair: 'C1', sets: [] }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_12_DETECTORS[38]!(ctx)).toEqual([])
  })

  it('rejects only 2 wind pungs', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3))]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_12_DETECTORS[38]!(ctx)).toEqual([])
  })
})
