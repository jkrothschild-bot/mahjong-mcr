import { describe, expect, it } from 'vitest'
import { FANS_2_DETECTORS } from './fans-2.js'
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

function kongMeld(id: string, tiles: number[], exposure: MeldExposure): Meld {
  return { id, kind: 'kong', exposure, kongSource: exposure === 'concealed' ? 'concealed' : 'exposedFromDiscard', tiles, ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Dragon Pung (fan 59)', () => {
  it('matches count 1 for a single dragon pung', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[59]!(ctx)).toEqual([{ fanId: 59, count: 1 }])
  })

  it('rejects a hand with no dragon pungs', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'pung', tiles: ['WW', 'WW', 'WW'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[59]!(ctx)).toEqual([])
  })
})

describe('Prevalent Wind (fan 60)', () => {
  it('matches a pung of the prevailing wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, prevailingWind: 'east' })
    expect(FANS_2_DETECTORS[60]!(ctx)).toEqual([{ fanId: 60, count: 1 }])
  })

  it('rejects when the wind pung does not match the prevailing wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, prevailingWind: 'south' })
    expect(FANS_2_DETECTORS[60]!(ctx)).toEqual([])
  })

  it('rejects when prevailingWind is not supplied', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[60]!(ctx)).toEqual([])
  })
})

describe('Seat Wind (fan 61)', () => {
  it('matches a pung of the seat wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, seatWind: 'south' })
    expect(FANS_2_DETECTORS[61]!(ctx)).toEqual([{ fanId: 61, count: 1 }])
  })

  it('rejects when the wind pung does not match the seat wind', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
      ],
    }
    const ctx = ctxWith({ decomposition, seatWind: 'north' })
    expect(FANS_2_DETECTORS[61]!(ctx)).toEqual([])
  })
})

describe('Concealed Hand (fan 62)', () => {
  it('matches zero melds plus a discard win', () => {
    const ctx = ctxWith({ melds: [], winMethod: 'discard' })
    expect(FANS_2_DETECTORS[62]!(ctx)).toEqual([{ fanId: 62, count: 1 }])
  })

  it('rejects a self-drawn win', () => {
    const ctx = ctxWith({ melds: [], winMethod: 'selfDraw' })
    expect(FANS_2_DETECTORS[62]!(ctx)).toEqual([])
  })

  it('rejects a hand with any meld', () => {
    const melds = [pungMeld('0-0', idsFor('C5', 3))]
    const ctx = ctxWith({ melds, winMethod: 'discard' })
    expect(FANS_2_DETECTORS[62]!(ctx)).toEqual([])
  })
})

describe('All Chows (fan 63)', () => {
  it('matches 4 chows and a non-honor pair', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[63]!(ctx)).toEqual([{ fanId: 63, count: 1 }])
  })

  it('rejects a hand with any pung', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[63]!(ctx)).toEqual([])
  })

  it('rejects an honor pair even with all chows', () => {
    const decomposition: Decomposition = {
      pair: 'WE',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[63]!(ctx)).toEqual([])
  })
})

describe('Tile Hog (fan 64)', () => {
  it('matches 4 copies of one type split across a pung and an adjacent chow', () => {
    const concealedTiles = [...idsFor('C5', 3), ...idsFor('C5', 1), ...idsFor('C6', 1), ...idsFor('C7', 1)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([{ fanId: 64, count: 1 }])
  })

  it('rejects when the 4 copies are declared as a kong', () => {
    const melds = [kongMeld('0-0', idsFor('C5', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([])
  })

  it('rejects a hand with only 3 copies of any type', () => {
    const concealedTiles = [...idsFor('C5', 3), ...idsFor('D1', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[64]!(ctx)).toEqual([])
  })
})

describe('Double Pung (fan 65)', () => {
  it('matches count 1 for a single shared-rank pair of pungs in two suits', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[65]!(ctx)).toEqual([{ fanId: 65, count: 1 }])
  })

  it('rejects when only one suit has that rank', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[65]!(ctx)).toEqual([])
  })
})

describe('Two Concealed Pungs (fan 66)', () => {
  it('matches exactly 2 concealed pungs', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([{ fanId: 66, count: 1 }])
  })

  it('rejects when one pung is exposed', () => {
    const melds = [pungMeld('0-0', idsFor('WE', 3), 'exposed')]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([])
  })

  it('rejects 3 concealed pungs (Three Concealed Pungs territory instead)', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_2_DETECTORS[66]!(ctx)).toEqual([])
  })
})

describe('Concealed Kong (fan 67)', () => {
  it('matches count 1 for a single concealed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_2_DETECTORS[67]!(ctx)).toEqual([{ fanId: 67, count: 1 }])
  })

  it('rejects an exposed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'exposed')]
    const ctx = ctxWith({ melds })
    expect(FANS_2_DETECTORS[67]!(ctx)).toEqual([])
  })
})

describe('All Simples (fan 68)', () => {
  it('matches a hand with no terminal or honor tiles', () => {
    const concealedTiles = [...idsFor('C2', 3), ...idsFor('D5', 3), ...idsFor('B4', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[68]!(ctx)).toEqual([{ fanId: 68, count: 1 }])
  })

  it('rejects a hand containing a terminal', () => {
    const concealedTiles = [...idsFor('C1', 2), ...idsFor('D5', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[68]!(ctx)).toEqual([])
  })

  it('rejects a hand containing an honor', () => {
    const concealedTiles = [...idsFor('WE', 2), ...idsFor('D5', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_2_DETECTORS[68]!(ctx)).toEqual([])
  })
})
