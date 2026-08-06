import { describe, expect, it } from 'vitest'
import { FANS_24_DETECTORS } from './fans-24.js'
import type { HandContext } from './types.js'
import type { Decomposition } from '../win-detection.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileTypeId } from '../tiles.js'

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

describe('Seven Pairs (fan 19)', () => {
  it('matches 7 distinct pairs, no melds', () => {
    const concealedTiles = [
      ...idsFor('C1', 2), ...idsFor('C2', 2), ...idsFor('C3', 2), ...idsFor('C4', 2),
      ...idsFor('C5', 2), ...idsFor('C6', 2), ...idsFor('C7', 2),
    ]
    const ctx = ctxWith({ concealedTiles, specialShape: 'sevenPairs' })
    expect(FANS_24_DETECTORS[19]!(ctx)).toEqual([{ fanId: 19, count: 1 }])
  })

  it('rejects a matching tile shape when specialShape is not sevenPairs (avoids piggybacking on a standard-decomposition candidate)', () => {
    const concealedTiles = [
      ...idsFor('C1', 2), ...idsFor('C2', 2), ...idsFor('C3', 2), ...idsFor('C4', 2),
      ...idsFor('C5', 2), ...idsFor('C6', 2), ...idsFor('C7', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[19]!(ctx)).toEqual([])
  })

  it('rejects a standard (non-seven-pairs) hand', () => {
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3), ...idsFor('C9', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[19]!(ctx)).toEqual([])
  })
})

describe('Greater Honors and Knitted Tiles (fan 20)', () => {
  it('matches 7 distinct honors plus 7 suit singles split 3/2/2 across 3 different knitted sequences', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1), // Characters: full 1-4-7 sequence
      ...idsFor('D2', 1), ...idsFor('D5', 1), // Dots: 2 of 2-5-8
      ...idsFor('B3', 1), ...idsFor('B6', 1), // Bamboo: 2 of 3-6-9
    ]
    expect(concealedTiles.length).toBe(14)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[20]!(ctx)).toEqual([{ fanId: 20, count: 1 }])
  })

  it('rejects only 6 honors (Greater requires all 7)', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), // only 6 honors, missing DW
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1),
    ]
    expect(concealedTiles.length).toBe(13)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[20]!(ctx)).toEqual([])
  })

  it('rejects a suit whose ranks span two different knitted sequences', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C7', 1), // C1(seq1) + C2(seq2) mixed within Characters
      ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[20]!(ctx)).toEqual([])
  })

  it('rejects two suits sharing the same knitted sequence', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1), // Characters: seq 1-4-7
      ...idsFor('D1', 1), ...idsFor('D4', 1), // Dots: ALSO seq 1-4-7 — not a different sequence
      ...idsFor('B3', 1),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[20]!(ctx)).toEqual([])
  })

  it('rejects a hand with a duplicate tile type (must be 14 distinct singles)', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('C1', 2), ...idsFor('C4', 1), ...idsFor('C7', 1), // C1 duplicated
      ...idsFor('D2', 1), ...idsFor('D5', 1),
      ...idsFor('B3', 1),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[20]!(ctx)).toEqual([])
  })
})

describe('All Even Pungs (fan 21)', () => {
  it('matches 4 even-numbered pungs plus an even pair', () => {
    const decomposition: Decomposition = {
      pair: 'B8',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
        { type: 'pung', tiles: ['D6', 'D6', 'D6'] },
        { type: 'pung', tiles: ['D8', 'D8', 'D8'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[21]!(ctx)).toEqual([{ fanId: 21, count: 1 }])
  })

  it('rejects a hand with one odd-numbered pung', () => {
    const decomposition: Decomposition = {
      pair: 'B8',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['D6', 'D6', 'D6'] },
        { type: 'pung', tiles: ['D8', 'D8', 'D8'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[21]!(ctx)).toEqual([])
  })

  it('rejects an odd pair even when all sets are even', () => {
    const decomposition: Decomposition = {
      pair: 'B7',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
        { type: 'pung', tiles: ['D6', 'D6', 'D6'] },
        { type: 'pung', tiles: ['D8', 'D8', 'D8'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[21]!(ctx)).toEqual([])
  })

  it('rejects a hand with a chow', () => {
    const decomposition: Decomposition = {
      pair: 'B8',
      sets: [
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
        { type: 'pung', tiles: ['D6', 'D6', 'D6'] },
        { type: 'pung', tiles: ['D8', 'D8', 'D8'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[21]!(ctx)).toEqual([])
  })
})

describe('Full Flush (fan 22)', () => {
  it('matches a hand entirely of one suit', () => {
    const concealedTiles = [
      ...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[22]!(ctx)).toEqual([{ fanId: 22, count: 1 }])
  })

  it('rejects a hand spanning two suits', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 3), ...idsFor('D1', 4), ...idsFor('D2', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[22]!(ctx)).toEqual([])
  })

  it('rejects a hand with an honor tile mixed in', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('WE', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[22]!(ctx)).toEqual([])
  })
})

describe('Pure Triple Chow (fan 23)', () => {
  it('matches exactly 3 identical chows plus a different 4th set', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'pung', tiles: ['B7', 'B7', 'B7'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[23]!(ctx)).toEqual([{ fanId: 23, count: 1 }])
  })

  it('rejects only 2 identical chows', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'pung', tiles: ['B7', 'B7', 'B7'] },
        { type: 'pung', tiles: ['B8', 'B8', 'B8'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[23]!(ctx)).toEqual([])
  })

  it('rejects 4 identical chows (that is Quadruple Chow, fan 14, not this one)', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[23]!(ctx)).toEqual([])
  })
})

describe('Pure Shifted Pungs (fan 24)', () => {
  it('matches exactly 3 pungs shifted by 1, plus a chow', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[24]!(ctx)).toEqual([{ fanId: 24, count: 1 }])
  })

  // FIXED (docs/rules/decisions.md #34): this used to assert `[]` here,
  // relying on the old exact-3-pungs check to (incidentally, and as it
  // turned out incompletely — see the seeds cited on detectPureShiftedPungs'
  // own comment) keep this mutually exclusive with Four Pure Shifted Pungs
  // (fan 15). The detector now correctly fires for the qualifying 3-subset
  // (any 3 of the 4 consecutive pungs) — exclusions.ts's new [15,24] entry
  // is what actually suppresses the double-count when fan 15 also fires,
  // not the detector declining to look.
  it('matches a qualifying 3-subset even when a 4th pung extends the same shifted run (Four Pure Shifted Pungs territory too — exclusions.ts[15,24] handles the overlap)', () => {
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
    expect(FANS_24_DETECTORS[24]!(ctx)).toEqual([{ fanId: 24, count: 1 }])
  })

  // docs/rules/decisions.md #34: a 4th pung that does NOT extend the same
  // suit/sequence (found via the validation harness, seeds
  // 1613793028/3097971845) must still let the qualifying 3-subset fire —
  // this is the actual bug the exact-count check caused.
  it('matches a qualifying 3-subset even when a 4th, unrelated pung is also present', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
        { type: 'pung', tiles: ['B7', 'B7', 'B7'] }, // different suit, not part of the run
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[24]!(ctx)).toEqual([{ fanId: 24, count: 1 }])
  })

  it('rejects a gap in the shift sequence', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['C5', 'C5', 'C5'] }, // gap: should be C4
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[24]!(ctx)).toEqual([])
  })

  it('rejects pungs spanning two suits', () => {
    const decomposition: Decomposition = {
      pair: 'D5',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['C3', 'C3', 'C3'] },
        { type: 'pung', tiles: ['B4', 'B4', 'B4'] },
        { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_24_DETECTORS[24]!(ctx)).toEqual([])
  })
})

describe('Upper / Middle / Lower Tiles (fans 25/26/27)', () => {
  it('Upper Tiles matches a hand entirely of ranks 7-8-9', () => {
    const concealedTiles = [
      ...idsFor('C7', 3), ...idsFor('C8', 3), ...idsFor('C9', 3),
      ...idsFor('D7', 3), ...idsFor('D8', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[25]!(ctx)).toEqual([{ fanId: 25, count: 1 }])
  })

  it('Upper Tiles rejects a hand containing a rank-6 tile', () => {
    const concealedTiles = [...idsFor('C6', 1), ...idsFor('C7', 3), ...idsFor('C8', 3), ...idsFor('C9', 3), ...idsFor('D8', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[25]!(ctx)).toEqual([])
  })

  it('Middle Tiles matches a hand entirely of ranks 4-5-6', () => {
    const concealedTiles = [
      ...idsFor('C4', 3), ...idsFor('C5', 3), ...idsFor('C6', 3),
      ...idsFor('D4', 3), ...idsFor('D5', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[26]!(ctx)).toEqual([{ fanId: 26, count: 1 }])
  })

  it('Lower Tiles matches a hand entirely of ranks 1-2-3', () => {
    const concealedTiles = [
      ...idsFor('C1', 3), ...idsFor('C2', 3), ...idsFor('C3', 3),
      ...idsFor('D1', 3), ...idsFor('D2', 2),
    ]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[27]!(ctx)).toEqual([{ fanId: 27, count: 1 }])
  })

  it('Lower Tiles rejects a hand with an honor tile', () => {
    const concealedTiles = [...idsFor('C1', 3), ...idsFor('C2', 3), ...idsFor('C3', 3), ...idsFor('D1', 3), ...idsFor('WE', 2)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_24_DETECTORS[27]!(ctx)).toEqual([])
  })
})
