import { describe, expect, it } from 'vitest'
import { FANS_16_DETECTORS } from './fans-16.js'
import type { HandContext } from './types.js'
import type { Decomposition } from '../win-detection.js'
import type { Meld } from '../meld.js'

function pungMeld(id: string, tiles: string[]): Meld {
  // Only fanId/kind/exposure matter to these detectors — tiles content here
  // is a placeholder since these tests build synthetic Decompositions/melds
  // directly rather than routing through decomposeHand.
  return { id, kind: 'pung', exposure: 'exposed', tiles: tiles.map(() => 0), ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Pure Straight (fan 28)', () => {
  it('matches chows starting at 1, 4, and 7 of one suit, plus any 4th set', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[28]!(ctx)).toEqual([{ fanId: 28, count: 1 }])
  })

  it('rejects a hand missing the middle chow (2-3-4 instead of 4-5-6)', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[28]!(ctx)).toEqual([])
  })

  it('rejects the three chows spanning two suits', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[28]!(ctx)).toEqual([])
  })
})

describe('Three-Suited Terminal Chows (fan 29)', () => {
  it('matches 1-2-3 and 7-8-9 in two suits, pair of 5s in the third', () => {
    const decomposition: Decomposition = {
      pair: 'B5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[29]!(ctx)).toEqual([{ fanId: 29, count: 1 }])
  })

  it('rejects the pair being in one of the chow suits instead of the third suit', () => {
    const decomposition: Decomposition = {
      pair: 'C5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[29]!(ctx)).toEqual([])
  })

  it('rejects a wrong chow (4-5-6 instead of the required 7-8-9)', () => {
    const decomposition: Decomposition = {
      pair: 'B5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['D1', 'D2', 'D3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[29]!(ctx)).toEqual([])
  })
})

describe('Pure Shifted Chows (fan 30)', () => {
  it('matches 3 chows shifted by 1, one suit, plus a 4th unrelated set', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[30]!(ctx)).toEqual([{ fanId: 30, count: 1 }])
  })

  it('matches 3 chows shifted by 2, one suit', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[30]!(ctx)).toEqual([{ fanId: 30, count: 1 }])
  })

  it('rejects a mix of shift-1 and shift-2 steps', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[30]!(ctx)).toEqual([])
  })

  // FIXED (docs/rules/decisions.md #34): this used to assert `[]`, relying
  // on the old exact-3-chows check to (incidentally, and incompletely — see
  // detectPureShiftedPungs' own comment for the isolated real case that
  // exposed this) keep this mutually exclusive with Four Shifted Chows (fan
  // 16). The detector now correctly fires for the qualifying 3-subset;
  // exclusions.ts's new [16,30] entry suppresses the double-count when fan
  // 16 also fires.
  it('matches a qualifying 3-subset even when a 4th chow extends the same shifted run (Four Shifted Chows territory too — exclusions.ts[16,30] handles the overlap)', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[30]!(ctx)).toEqual([{ fanId: 30, count: 1 }])
  })

  // docs/rules/decisions.md #34: a 4th chow that does NOT extend the same
  // suit/sequence (found via the validation harness, seed 3563778031) must
  // still let the qualifying 3-subset fire.
  it('matches a qualifying 3-subset even when a 4th, unrelated chow is also present', () => {
    const decomposition: Decomposition = {
      pair: 'B2',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] }, // different suit, not part of the run
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[30]!(ctx)).toEqual([{ fanId: 30, count: 1 }])
  })
})

describe('All Fives (fan 31)', () => {
  it('matches every set (chow/pung) and the pair spanning/being rank 5', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[31]!(ctx)).toEqual([{ fanId: 31, count: 1 }])
  })

  it('rejects a chow that does not span rank 5 (6-7-8)', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['D6', 'D7', 'D8'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[31]!(ctx)).toEqual([])
  })

  it('rejects a non-5 pair even when all sets include 5', () => {
    const decomposition: Decomposition = {
      pair: 'D6',
      sets: [
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[31]!(ctx)).toEqual([])
  })

  it('rejects a hand with an honor set', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[31]!(ctx)).toEqual([])
  })
})

describe('Triple Pung (fan 32)', () => {
  it('matches a pung of the same rank in all three suits, plus any 4th set', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[32]!(ctx)).toEqual([{ fanId: 32, count: 1 }])
  })

  it('rejects when only 2 suits share the rank', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'pung', tiles: ['B6', 'B6', 'B6'] },
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[32]!(ctx)).toEqual([])
  })
})

describe('Three Concealed Pungs (fan 33)', () => {
  it('matches exactly 3 concealed pungs plus one exposed meld', () => {
    const melds = [pungMeld('0-0', ['C1', 'C1', 'C1'])] // exposed, the 4th set
    const decomposition: Decomposition = {
      pair: 'D1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_16_DETECTORS[33]!(ctx)).toEqual([{ fanId: 33, count: 1 }])
  })

  it('rejects 4 concealed pungs (that is Four Concealed Pungs, fan 12, not this one)', () => {
    const decomposition: Decomposition = {
      pair: 'D1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_16_DETECTORS[33]!(ctx)).toEqual([])
  })

  it('rejects only 2 concealed pungs', () => {
    const melds = [pungMeld('0-0', ['C1', 'C1', 'C1']), pungMeld('0-1', ['D1', 'D1', 'D1'])] // both exposed
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition })
    expect(FANS_16_DETECTORS[33]!(ctx)).toEqual([])
  })
})
