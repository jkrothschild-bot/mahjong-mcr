import { describe, expect, it } from 'vitest'
import { FANS_32_DETECTORS } from './fans-32.js'
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

function kongMeld(id: string, tiles: number[]): Meld {
  return { id, kind: 'kong', exposure: 'exposed', kongSource: 'exposedFromDiscard', tiles, ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Four Shifted Chows (fan 16)', () => {
  it('matches four chows shifted by 1 each time, one suit', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[16]!(ctx)).toEqual([{ fanId: 16, count: 1 }])
  })

  it('matches four chows shifted by 2 each time, one suit', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[16]!(ctx)).toEqual([{ fanId: 16, count: 1 }])
  })

  it('rejects a mix of shift-1 and shift-2 steps', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] }, // shift 1
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] }, // shift 2 from previous
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[16]!(ctx)).toEqual([])
  })

  it('rejects identical (unshifted) chows — that is Quadruple Chow, not this fan', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[16]!(ctx)).toEqual([])
  })

  it('rejects chows spanning two suits', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['B3', 'B4', 'B5'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[16]!(ctx)).toEqual([])
  })
})

describe('Three Kongs (fan 17)', () => {
  it('matches exactly 3 kongs', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4)), kongMeld('0-1', idsFor('C1', 4)), kongMeld('0-2', idsFor('D5', 4))]
    const ctx = ctxWith({ melds })
    expect(FANS_32_DETECTORS[17]!(ctx)).toEqual([{ fanId: 17, count: 1 }])
  })

  it('rejects 4 kongs (that is Four Kongs, fan 5, not this one)', () => {
    const melds = [
      kongMeld('0-0', idsFor('WE', 4)),
      kongMeld('0-1', idsFor('C1', 4)),
      kongMeld('0-2', idsFor('D5', 4)),
      kongMeld('0-3', idsFor('DR', 4)),
    ]
    const ctx = ctxWith({ melds })
    expect(FANS_32_DETECTORS[17]!(ctx)).toEqual([])
  })

  it('rejects only 2 kongs', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4)), kongMeld('0-1', idsFor('C1', 4))]
    const ctx = ctxWith({ melds })
    expect(FANS_32_DETECTORS[17]!(ctx)).toEqual([])
  })
})

describe('All Terminals and Honors (fan 18)', () => {
  it('matches a mix of terminal and honor pungs plus a terminal or honor pair', () => {
    const decomposition: Decomposition = {
      pair: 'DG',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B9', 'B9', 'B9'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[18]!(ctx)).toEqual([{ fanId: 18, count: 1 }])
  })

  it('rejects a hand with a chow', () => {
    const decomposition: Decomposition = {
      pair: 'DG',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B9', 'B9', 'B9'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[18]!(ctx)).toEqual([])
  })

  it('rejects a hand with a simple-tile pung (not terminal, not honor)', () => {
    const decomposition: Decomposition = {
      pair: 'DG',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B9', 'B9', 'B9'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_32_DETECTORS[18]!(ctx)).toEqual([])
  })
})
