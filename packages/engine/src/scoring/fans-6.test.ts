import { describe, expect, it } from 'vitest'
import { FANS_6_DETECTORS } from './fans-6.js'
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

function pungMeld(id: string, tiles: number[], exposure: 'exposed' | 'concealed' = 'exposed'): Meld {
  return { id, kind: 'pung', exposure, tiles, ownerSeat: 0 }
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('All Pungs (fan 49)', () => {
  it('matches 4 pungs of mixed tile types plus any pair', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_6_DETECTORS[49]!(ctx)).toEqual([{ fanId: 49, count: 1 }])
  })

  it('rejects a hand with a chow', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
        { type: 'pung', tiles: ['D3', 'D3', 'D3'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_6_DETECTORS[49]!(ctx)).toEqual([])
  })
})

describe('Half Flush (fan 50)', () => {
  it('matches one suit mixed with honor tiles', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('WE', 3), ...idsFor('C9', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_6_DETECTORS[50]!(ctx)).toEqual([{ fanId: 50, count: 1 }])
  })

  it('rejects a pure one-suit hand with no honors (that is Full Flush territory)', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_6_DETECTORS[50]!(ctx)).toEqual([])
  })

  it('rejects tiles spanning two suits even with honors present', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('D2', 4), ...idsFor('WE', 3), ...idsFor('C9', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_6_DETECTORS[50]!(ctx)).toEqual([])
  })
})

describe('Mixed Shifted Chows (fan 51)', () => {
  it('matches one chow per suit with consecutive ranks', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_6_DETECTORS[51]!(ctx)).toEqual([{ fanId: 51, count: 1 }])
  })

  it('rejects non-consecutive chow ranks', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C3', 'C4', 'C5'] },
        { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_6_DETECTORS[51]!(ctx)).toEqual([])
  })
})

describe('All Types (fan 52)', () => {
  it('matches each of the 4 sets plus the pair being a different category', () => {
    const decomposition: Decomposition = {
      pair: 'DR', // dragon
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] }, // characters
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] }, // dots
        { type: 'pung', tiles: ['B7', 'B7', 'B7'] }, // bamboo
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] }, // wind
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_6_DETECTORS[52]!(ctx)).toEqual([{ fanId: 52, count: 1 }])
  })

  it('rejects two sets sharing the same category', () => {
    const decomposition: Decomposition = {
      pair: 'DR',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] }, // also characters — duplicate category
        { type: 'pung', tiles: ['B7', 'B7', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_6_DETECTORS[52]!(ctx)).toEqual([])
  })

  // KNOWN BUG, not fixed here (fixture only) — found during Step 4/5 triage
  // of the validation harness's unclassified mismatches. This detector
  // bails out via `if (!ctx.decomposition) return []` before ever looking
  // at ctx.specialShape, so it can never fire for a Seven Pairs candidate
  // (score-hand.ts's candidate list gives Seven Pairs `decomposition: null,
  // specialShape: 'sevenPairs'`). But a direct rulebook check
  // (rules-lawyer, verified against docs/rules/mcr_EN.pdf) confirms fan 19
  // Seven Pairs's OWN Appendix 1 worked example (24-Point Fan section,
  // Example 1: pairs of Dots/Bamboo/Characters/Red Dragon/East Wind/North
  // Wind) is captioned "Combined with All Types" — i.e. the rulebook
  // itself directly shows a Seven Pairs hand scoring fan 52 when its 7
  // pairs collectively span all 5 categories (Characters/Bamboo/Dots/
  // Winds/Dragons). Confirmed via the validation harness (1200-hand
  // cross-check, seed 20260805): ~19 Seven Pairs hands score 'All Types'
  // on PyMahjongGB's side that we miss entirely.
  it('BUG: never fires for a Seven Pairs hand, even when its 7 pairs span all 5 categories', () => {
    const ctx = ctxWith({ specialShape: 'sevenPairs', decomposition: null })
    expect(FANS_6_DETECTORS[52]!(ctx)).toEqual([]) // WRONG, should be [{ fanId: 52, count: 1 }] when all 5 categories are represented
  })
})

describe('Melded Hand (fan 53)', () => {
  it('matches 4 exposed melds with the pair completed by a discard claim', () => {
    const melds = [
      pungMeld('0-0', idsFor('C5', 3)),
      pungMeld('0-1', idsFor('D3', 3)),
      pungMeld('0-2', idsFor('WE', 3)),
      pungMeld('0-3', idsFor('DR', 3)),
    ]
    const decomposition: Decomposition = { pair: 'C1', sets: [] }
    const ctx = ctxWith({ melds, decomposition, winMethod: 'discard' })
    expect(FANS_6_DETECTORS[53]!(ctx)).toEqual([{ fanId: 53, count: 1 }])
  })

  it('rejects a self-drawn win', () => {
    const melds = [
      pungMeld('0-0', idsFor('C5', 3)),
      pungMeld('0-1', idsFor('D3', 3)),
      pungMeld('0-2', idsFor('WE', 3)),
      pungMeld('0-3', idsFor('DR', 3)),
    ]
    const decomposition: Decomposition = { pair: 'C1', sets: [] }
    const ctx = ctxWith({ melds, decomposition, winMethod: 'selfDraw' })
    expect(FANS_6_DETECTORS[53]!(ctx)).toEqual([])
  })

  it('rejects a hand with one concealed meld', () => {
    const melds = [
      pungMeld('0-0', idsFor('C5', 3), 'concealed'),
      pungMeld('0-1', idsFor('D3', 3)),
      pungMeld('0-2', idsFor('WE', 3)),
      pungMeld('0-3', idsFor('DR', 3)),
    ]
    const decomposition: Decomposition = { pair: 'C1', sets: [] }
    const ctx = ctxWith({ melds, decomposition, winMethod: 'discard' })
    expect(FANS_6_DETECTORS[53]!(ctx)).toEqual([])
  })

  it('rejects a hand where not all 4 sets are already melds', () => {
    const melds = [pungMeld('0-0', idsFor('C5', 3)), pungMeld('0-1', idsFor('D3', 3))]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ melds, decomposition, winMethod: 'discard' })
    expect(FANS_6_DETECTORS[53]!(ctx)).toEqual([])
  })
})

describe('Two Dragon Pungs (fan 54)', () => {
  it('matches exactly 2 dragon pungs plus a non-dragon pair', () => {
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['DG', 'DG', 'DG'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_6_DETECTORS[54]!(ctx)).toEqual([{ fanId: 54, count: 1 }])
  })

  it('rejects only 1 dragon pung', () => {
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
    expect(FANS_6_DETECTORS[54]!(ctx)).toEqual([])
  })
})
