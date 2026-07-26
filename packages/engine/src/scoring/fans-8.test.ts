import { describe, expect, it } from 'vitest'
import { FANS_8_DETECTORS } from './fans-8.js'
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

function kongMeld(id: string, tiles: number[], exposure: MeldExposure): Meld {
  return { id, kind: 'kong', exposure, kongSource: exposure === 'concealed' ? 'concealed' : 'exposedFromDiscard', tiles, ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Mixed Straight (fan 39)', () => {
  it('matches chows at 1/4/7 across three different suits', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_8_DETECTORS[39]!(ctx)).toEqual([{ fanId: 39, count: 1 }])
  })

  it('rejects two of the three chows sharing a suit', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_8_DETECTORS[39]!(ctx)).toEqual([])
  })
})

describe('Reversible Tiles (fan 40)', () => {
  it('matches a hand of only vertically-symmetrical tiles', () => {
    const concealedTiles = [
      ...idsFor('D1', 2), ...idsFor('D2', 2), ...idsFor('D8', 2),
      ...idsFor('B2', 2), ...idsFor('B4', 2), ...idsFor('B9', 2),
      ...idsFor('DW', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_8_DETECTORS[40]!(ctx)).toEqual([{ fanId: 40, count: 1 }])
  })

  it('rejects a hand containing any Character tile (never reversible)', () => {
    const concealedTiles = [...idsFor('D1', 2), ...idsFor('D2', 2), ...idsFor('C1', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_8_DETECTORS[40]!(ctx)).toEqual([])
  })

  it('rejects a Dot tile that is not vertically symmetrical (e.g. 6 or 7 Dots)', () => {
    const concealedTiles = [...idsFor('D1', 2), ...idsFor('D6', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_8_DETECTORS[40]!(ctx)).toEqual([])
  })
})

describe('Mixed Triple Chow (fan 41)', () => {
  it('matches the same chow sequence present in all three suits', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B4', 'B5', 'B6'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_8_DETECTORS[41]!(ctx)).toEqual([{ fanId: 41, count: 1 }])
  })

  it('rejects when only two suits share the sequence', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B1', 'B2', 'B3'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_8_DETECTORS[41]!(ctx)).toEqual([])
  })
})

describe('Mixed Shifted Pungs (fan 42)', () => {
  it('matches one pung per suit with ranks forming a consecutive run', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['D4', 'D4', 'D4'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_8_DETECTORS[42]!(ctx)).toEqual([{ fanId: 42, count: 1 }])
  })

  it('rejects non-consecutive pung ranks', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['D4', 'D4', 'D4'] },
        { type: 'pung', tiles: ['B6', 'B6', 'B6'] },
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_8_DETECTORS[42]!(ctx)).toEqual([])
  })
})

describe('Last Tile Draw (fan 44)', () => {
  it('matches a self-drawn win on the wall\'s last tile', () => {
    const ctx = ctxWith({ winMethod: 'selfDraw', isLastTileOfWall: true })
    expect(FANS_8_DETECTORS[44]!(ctx)).toEqual([{ fanId: 44, count: 1 }])
  })

  it('rejects a self-drawn win that is not the last tile', () => {
    const ctx = ctxWith({ winMethod: 'selfDraw', isLastTileOfWall: false })
    expect(FANS_8_DETECTORS[44]!(ctx)).toEqual([])
  })

  it('rejects a discard win even if isLastTileOfWall is set', () => {
    const ctx = ctxWith({ winMethod: 'discard', isLastTileOfWall: true })
    expect(FANS_8_DETECTORS[44]!(ctx)).toEqual([])
  })
})

describe('Last Tile Claim (fan 45)', () => {
  it('matches a discard win on the game\'s last discard', () => {
    const ctx = ctxWith({ winMethod: 'discard', isLastDiscardOfGame: true })
    expect(FANS_8_DETECTORS[45]!(ctx)).toEqual([{ fanId: 45, count: 1 }])
  })

  it('rejects a self-drawn win', () => {
    const ctx = ctxWith({ winMethod: 'selfDraw', isLastDiscardOfGame: true })
    expect(FANS_8_DETECTORS[45]!(ctx)).toEqual([])
  })
})

describe('Out with Replacement Tile (fan 46)', () => {
  it('matches via the last-discard-of-the-game clause', () => {
    const ctx = ctxWith({ winMethod: 'discard', isLastDiscardOfGame: true })
    expect(FANS_8_DETECTORS[46]!(ctx)).toEqual([{ fanId: 46, count: 1 }])
  })

  it('matches via the kong-replacement clause', () => {
    const ctx = ctxWith({ winMethod: 'selfDraw', wonOnKongReplacement: true })
    expect(FANS_8_DETECTORS[46]!(ctx)).toEqual([{ fanId: 46, count: 1 }])
  })

  it('rejects a plain self-drawn win with no replacement tile', () => {
    const ctx = ctxWith({ winMethod: 'selfDraw', wonOnKongReplacement: false })
    expect(FANS_8_DETECTORS[46]!(ctx)).toEqual([])
  })
})

describe('Robbing The Kong (fan 47)', () => {
  it('matches winMethod robKong', () => {
    const ctx = ctxWith({ winMethod: 'robKong' })
    expect(FANS_8_DETECTORS[47]!(ctx)).toEqual([{ fanId: 47, count: 1 }])
  })

  it('rejects a normal discard win', () => {
    const ctx = ctxWith({ winMethod: 'discard' })
    expect(FANS_8_DETECTORS[47]!(ctx)).toEqual([])
  })
})

describe('Two Concealed Kongs (fan 48)', () => {
  it('matches exactly 2 concealed kongs', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed'), kongMeld('0-1', idsFor('C1', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_8_DETECTORS[48]!(ctx)).toEqual([{ fanId: 48, count: 1 }])
  })

  it('rejects only 1 concealed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_8_DETECTORS[48]!(ctx)).toEqual([])
  })

  it('rejects 2 kongs when one is exposed', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed'), kongMeld('0-1', idsFor('C1', 4), 'exposed')]
    const ctx = ctxWith({ melds })
    expect(FANS_8_DETECTORS[48]!(ctx)).toEqual([])
  })
})
