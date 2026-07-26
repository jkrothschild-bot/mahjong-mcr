import { describe, expect, it } from 'vitest'
import { FANS_48_DETECTORS } from './fans-48.js'
import type { HandContext } from './types.js'
import type { Decomposition } from '../win-detection.js'

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Quadruple Chow (fan 14)', () => {
  it('matches four identical chows (same suit, same starting tile)', () => {
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
    expect(FANS_48_DETECTORS[14]!(ctx)).toEqual([{ fanId: 14, count: 1 }])
  })

  it('rejects 3 identical chows plus 1 different chow', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_48_DETECTORS[14]!(ctx)).toEqual([])
  })

  it('rejects 4 shifted (non-identical) chows', () => {
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
    expect(FANS_48_DETECTORS[14]!(ctx)).toEqual([])
  })
})

describe('Four Pure Shifted Pungs (fan 15)', () => {
  it('matches four pungs in one suit, each rank shifted up by one', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_48_DETECTORS[15]!(ctx)).toEqual([{ fanId: 15, count: 1 }])
  })

  it('rejects pungs with a gap in the shift sequence', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] }, // gap: should be C4
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_48_DETECTORS[15]!(ctx)).toEqual([])
  })

  it('rejects pungs spanning two suits', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['B4', 'B4', 'B4'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_48_DETECTORS[15]!(ctx)).toEqual([])
  })

  it('rejects a hand with a chow among the 4 sets', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_48_DETECTORS[15]!(ctx)).toEqual([])
  })
})
