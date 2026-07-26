import { describe, expect, it } from 'vitest'
import { FANS_64_DETECTORS } from './fans-64.js'
import type { HandContext } from './types.js'
import type { Decomposition } from '../win-detection.js'
import type { Meld, MeldExposure } from '../meld.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileTypeId } from '../tiles.js'

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function pungMeld(id: string, tiles: number[], exposure: MeldExposure = 'exposed'): Meld {
  return { id, kind: 'pung', exposure, tiles, ownerSeat: 0 }
}

function concealedKongMeld(id: string, tiles: number[]): Meld {
  return { id, kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles, ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('All Terminals (fan 8)', () => {
  it('matches 4 terminal pungs plus a terminal pair, no honors, no chows', () => {
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['C9', 'C9', 'C9'] },
        { type: 'pung', tiles: ['D1', 'D1', 'D1'] },
        { type: 'pung', tiles: ['B9', 'B9', 'B9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[8]!(ctx)).toEqual([{ fanId: 8, count: 1 }])
  })

  it('rejects a hand with one non-terminal pung', () => {
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] }, // not terminal
        { type: 'pung', tiles: ['D1', 'D1', 'D1'] },
        { type: 'pung', tiles: ['B9', 'B9', 'B9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[8]!(ctx)).toEqual([])
  })

  it('rejects a hand with an honor pung (must be terminals only, no honors)', () => {
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] }, // honor, not terminal
        { type: 'pung', tiles: ['D1', 'D1', 'D1'] },
        { type: 'pung', tiles: ['B9', 'B9', 'B9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[8]!(ctx)).toEqual([])
  })
})

describe('Little Four Winds (fan 9)', () => {
  it('matches 3 wind pungs plus a pair of the 4th wind', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3)), pungMeld('0-2', idsFor('WW', 3))]
    const decomposition: Decomposition = { pair: 'WN', sets: [{ type: 'chow', tiles: ['C1', 'C2', 'C3'] }] }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_64_DETECTORS[9]!(ctx)).toEqual([{ fanId: 9, count: 1 }])
  })

  it('rejects only 2 wind pungs', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3))]
    const decomposition: Decomposition = {
      pair: 'WN',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_64_DETECTORS[9]!(ctx)).toEqual([])
  })

  it('rejects 3 wind pungs with a non-wind pair', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3)), pungMeld('0-2', idsFor('WW', 3))]
    const decomposition: Decomposition = { pair: 'C1', sets: [{ type: 'chow', tiles: ['D1', 'D2', 'D3'] }] }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_64_DETECTORS[9]!(ctx)).toEqual([])
  })
})

describe('Little Three Dragons (fan 10)', () => {
  it('matches 2 dragon pungs plus a pair of the 3rd dragon', () => {
    const melds = [pungMeld('0-0', idsFor('DR', 3)), pungMeld('0-1', idsFor('DG', 3))]
    const decomposition: Decomposition = {
      pair: 'DW',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_64_DETECTORS[10]!(ctx)).toEqual([{ fanId: 10, count: 1 }])
  })

  it('rejects only 1 dragon pung', () => {
    const melds = [pungMeld('0-0', idsFor('DR', 3))]
    const decomposition: Decomposition = {
      pair: 'DW',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['C7', 'C7', 'C7'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_64_DETECTORS[10]!(ctx)).toEqual([])
  })
})

describe('All Honors (fan 11)', () => {
  it('matches 4 honor pungs plus an honor pair', () => {
    const decomposition: Decomposition = {
      pair: 'DG',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['WW', 'WW', 'WW'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[11]!(ctx)).toEqual([{ fanId: 11, count: 1 }])
  })

  it('rejects a hand with one terminal (non-honor) pung', () => {
    const decomposition: Decomposition = {
      pair: 'DG',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] }, // terminal, not honor
        { type: 'pung', tiles: ['WW', 'WW', 'WW'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[11]!(ctx)).toEqual([])
  })
})

describe('Four Concealed Pungs (fan 12)', () => {
  it('matches 4 concealed pungs formed entirely within the concealed hand', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['D2', 'D2', 'D2'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['B4', 'B4', 'B4'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[12]!(ctx)).toEqual([{ fanId: 12, count: 1 }])
  })

  it('still matches with a concealed kong standing in for one of the 4 pungs', () => {
    const melds = [concealedKongMeld('0-0', idsFor('D2', 4))]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['B4', 'B4', 'B4'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_64_DETECTORS[12]!(ctx)).toEqual([{ fanId: 12, count: 1 }])
  })

  it('rejects a hand with one EXPOSED pung (claimed from a discard)', () => {
    const melds = [pungMeld('0-0', idsFor('D2', 3), 'exposed')]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['B4', 'B4', 'B4'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_64_DETECTORS[12]!(ctx)).toEqual([])
  })

  it('rejects a hand with a chow among the 4 sets', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'chow', tiles: ['D2', 'D3', 'D4'] },
        { type: 'pung', tiles: ['B4', 'B4', 'B4'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'pung', tiles: ['B6', 'B6', 'B6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[12]!(ctx)).toEqual([])
  })
})

describe('Pure Terminal Chows (fan 13)', () => {
  it('matches two 1-2-3 chows and two 7-8-9 chows in one suit, pair of 5s', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[13]!(ctx)).toEqual([{ fanId: 13, count: 1 }])
  })

  it('rejects the chows spanning two suits', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[13]!(ctx)).toEqual([])
  })

  it('rejects only 1 low chow and 3 high chows', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_64_DETECTORS[13]!(ctx)).toEqual([])
  })
})
