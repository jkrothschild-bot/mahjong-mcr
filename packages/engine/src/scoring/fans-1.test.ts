import { describe, expect, it } from 'vitest'
import { FANS_1_DETECTORS } from './fans-1.js'
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

describe('Pure Double Chow (fan 69)', () => {
  it('matches count 1 for one repeated chow', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['D5', 'D6', 'D7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[69]!(ctx)).toEqual([{ fanId: 69, count: 1 }])
  })

  it('rejects distinct chows with no repeat', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['C5', 'C6', 'C7'] },
        { type: 'chow', tiles: ['D5', 'D6', 'D7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[69]!(ctx)).toEqual([])
  })
})

describe('Mixed Double Chow (fan 70)', () => {
  it('matches count 1 for the same rank shared by two suits', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['D2', 'D3', 'D4'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[70]!(ctx)).toEqual([{ fanId: 70, count: 1 }])
  })

  it('rejects when no rank is shared across suits', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['D5', 'D6', 'D7'] },
        { type: 'chow', tiles: ['B1', 'B2', 'B3'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[70]!(ctx)).toEqual([])
  })
})

describe('Short Straight (fan 71)', () => {
  it('matches two same-suit chows shifted by 3 (a 6-consecutive-tile run)', () => {
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[71]!(ctx)).toEqual([{ fanId: 71, count: 1 }])
  })

  it('rejects a shift of 1 or 2 instead of 3', () => {
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C2', 'C3', 'C4'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[71]!(ctx)).toEqual([])
  })
})

describe('Two Terminal Chows (fan 72)', () => {
  it('matches 1-2-3 and 7-8-9 in the same suit', () => {
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['C7', 'C8', 'C9'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[72]!(ctx)).toEqual([{ fanId: 72, count: 1 }])
  })

  it('rejects when the two terminal chows are in different suits', () => {
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'chow', tiles: ['B5', 'B6', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[72]!(ctx)).toEqual([])
  })
})

describe('Pung of Terminals or Honors (fan 73)', () => {
  it('counts one per qualifying terminal/wind pung, excluding dragons', () => {
    const decomposition: Decomposition = {
      pair: 'C5',
      sets: [
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'chow', tiles: ['D2', 'D3', 'D4'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[73]!(ctx)).toEqual([{ fanId: 73, count: 2 }])
  })

  it('rejects a hand with none', () => {
    const decomposition: Decomposition = {
      pair: 'C5',
      sets: [
        { type: 'pung', tiles: ['C4', 'C4', 'C4'] },
        { type: 'chow', tiles: ['D2', 'D3', 'D4'] },
        { type: 'chow', tiles: ['B2', 'B3', 'B4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_1_DETECTORS[73]!(ctx)).toEqual([])
  })

  // docs/rules/decisions.md #24: excludes the specific pung matching
  // ctx.prevailingWind/seatWind from its own count (same physical-set-level
  // resolution as the dragon exclusion above), but must NOT drop credit for
  // an unrelated terminal/wind pung elsewhere in the same hand — a whole-fan
  // exclusion pair in exclusions.ts would have done exactly that (see the
  // note above RAW_EXCLUSION_PAIRS's [60,73]/[61,73] non-entry).
  it('excludes the pung matching prevailingWind from its count, but still counts an unrelated terminal pung', () => {
    const decomposition: Decomposition = {
      pair: 'C5',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] }, // matches prevailingWind — excluded
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] }, // independent terminal pung — still counts
        { type: 'chow', tiles: ['D2', 'D3', 'D4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] }, // dragon — already excluded
      ],
    }
    const ctx = ctxWith({ decomposition, prevailingWind: 'east' })
    expect(FANS_1_DETECTORS[73]!(ctx)).toEqual([{ fanId: 73, count: 1 }])
  })

  it('excludes the pung matching seatWind from its count the same way', () => {
    const decomposition: Decomposition = {
      pair: 'C5',
      sets: [
        { type: 'pung', tiles: ['WS', 'WS', 'WS'] }, // matches seatWind — excluded
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] }, // independent terminal pung — still counts
        { type: 'chow', tiles: ['D2', 'D3', 'D4'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
      ],
    }
    const ctx = ctxWith({ decomposition, seatWind: 'south' })
    expect(FANS_1_DETECTORS[73]!(ctx)).toEqual([{ fanId: 73, count: 1 }])
  })

  it('excludes a pung matching BOTH prevailingWind and seatWind (double wind) from the count exactly once, still not double-subtracting', () => {
    const decomposition: Decomposition = {
      pair: 'C5',
      sets: [
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] }, // matches both — excluded once
        { type: 'pung', tiles: ['C1', 'C1', 'C1'] },
        { type: 'pung', tiles: ['C9', 'C9', 'C9'] },
        { type: 'chow', tiles: ['D2', 'D3', 'D4'] },
      ],
    }
    const ctx = ctxWith({ decomposition, prevailingWind: 'east', seatWind: 'east' })
    expect(FANS_1_DETECTORS[73]!(ctx)).toEqual([{ fanId: 73, count: 2 }])
  })
})

describe('Melded Kong (fan 74)', () => {
  it('counts one per exposed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'exposed'), kongMeld('0-1', idsFor('C1', 4), 'exposed')]
    const ctx = ctxWith({ melds })
    expect(FANS_1_DETECTORS[74]!(ctx)).toEqual([{ fanId: 74, count: 2 }])
  })

  it('rejects a concealed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_1_DETECTORS[74]!(ctx)).toEqual([])
  })
})

describe('One Voided Suit (fan 75)', () => {
  it('matches tiles from exactly 2 of the 3 suits', () => {
    const concealedTiles = [...idsFor('C1', 2), ...idsFor('D5', 3), ...idsFor('WE', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_1_DETECTORS[75]!(ctx)).toEqual([{ fanId: 75, count: 1 }])
  })

  it('rejects a hand using only 1 suit', () => {
    const concealedTiles = [...idsFor('C1', 2), ...idsFor('C5', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_1_DETECTORS[75]!(ctx)).toEqual([])
  })

  it('rejects a hand using all 3 suits', () => {
    const concealedTiles = [...idsFor('C1', 2), ...idsFor('D5', 3), ...idsFor('B2', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_1_DETECTORS[75]!(ctx)).toEqual([])
  })
})

describe('No Honors (fan 76)', () => {
  it('matches a hand with no wind/dragon tiles', () => {
    const concealedTiles = [...idsFor('C1', 2), ...idsFor('D5', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_1_DETECTORS[76]!(ctx)).toEqual([{ fanId: 76, count: 1 }])
  })

  it('rejects a hand containing a wind tile', () => {
    const concealedTiles = [...idsFor('C1', 2), ...idsFor('WE', 3)]
    const ctx = ctxWith({ concealedTiles })
    expect(FANS_1_DETECTORS[76]!(ctx)).toEqual([])
  })
})

describe('Wait-type fans (77 Edge, 78 Closed, 79 Single)', () => {
  it('classifies a "3 completes 1-2-3" wait as Edge Wait only', () => {
    const c = idsFor('C1', 1).concat(idsFor('C2', 1), idsFor('C3', 1))
    const concealedTiles = [...c, ...idsFor('D5', 3), ...idsFor('B7', 3), ...idsFor('WE', 3), ...idsFor('DR', 2)]
    expect(concealedTiles.length).toBe(14)
    const decomposition: Decomposition = {
      pair: 'DR',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'pung', tiles: ['B7', 'B7', 'B7'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ concealedTiles, decomposition, winningTile: c[2] })
    expect(FANS_1_DETECTORS[77]!(ctx)).toEqual([{ fanId: 77, count: 1 }])
    expect(FANS_1_DETECTORS[78]!(ctx)).toEqual([])
    expect(FANS_1_DETECTORS[79]!(ctx)).toEqual([])
  })

  it('classifies a "5 completes 4_6" wait as Closed Wait only', () => {
    const c = idsFor('C4', 1).concat(idsFor('C5', 1), idsFor('C6', 1))
    const concealedTiles = [...c, ...idsFor('WE', 3), ...idsFor('DR', 3), ...idsFor('B2', 3), ...idsFor('D9', 2)]
    expect(concealedTiles.length).toBe(14)
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['B2', 'B2', 'B2'] },
      ],
    }
    const ctx = ctxWith({ concealedTiles, decomposition, winningTile: c[1] })
    expect(FANS_1_DETECTORS[78]!(ctx)).toEqual([{ fanId: 78, count: 1 }])
    expect(FANS_1_DETECTORS[77]!(ctx)).toEqual([])
    expect(FANS_1_DETECTORS[79]!(ctx)).toEqual([])
  })

  it('classifies completing a lone tile into a pair as Single Wait only', () => {
    const dr = idsFor('DR', 2)
    const concealedTiles = [...idsFor('C2', 3), ...idsFor('D5', 3), ...idsFor('B8', 3), ...idsFor('WE', 3), ...dr]
    expect(concealedTiles.length).toBe(14)
    const decomposition: Decomposition = {
      pair: 'DR',
      sets: [
        { type: 'pung', tiles: ['C2', 'C2', 'C2'] },
        { type: 'pung', tiles: ['D5', 'D5', 'D5'] },
        { type: 'pung', tiles: ['B8', 'B8', 'B8'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
      ],
    }
    const ctx = ctxWith({ concealedTiles, decomposition, winningTile: dr[1] })
    expect(FANS_1_DETECTORS[79]!(ctx)).toEqual([{ fanId: 79, count: 1 }])
    expect(FANS_1_DETECTORS[77]!(ctx)).toEqual([])
    expect(FANS_1_DETECTORS[78]!(ctx)).toEqual([])
  })

  it('rejects a genuine two-sided wait (not specially named) for all three fans', () => {
    const c = idsFor('C4', 1).concat(idsFor('C5', 1), idsFor('C6', 1))
    const concealedTiles = [...c, ...idsFor('WE', 3), ...idsFor('DR', 3), ...idsFor('B2', 3), ...idsFor('D9', 2)]
    expect(concealedTiles.length).toBe(14)
    const decomposition: Decomposition = {
      pair: 'D9',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['DR', 'DR', 'DR'] },
        { type: 'pung', tiles: ['B2', 'B2', 'B2'] },
      ],
    }
    // Winning on the "6" here: pre-win tiles (C4, C5 + the rest) can also be
    // completed by drawing "C3" instead (forming C3-C4-C5) — a genuine
    // multi-sided wait, so none of the 3 wait fans should fire.
    const ctx = ctxWith({ concealedTiles, decomposition, winningTile: c[2] })
    expect(FANS_1_DETECTORS[77]!(ctx)).toEqual([])
    expect(FANS_1_DETECTORS[78]!(ctx)).toEqual([])
    expect(FANS_1_DETECTORS[79]!(ctx)).toEqual([])
  })

  it('rejects all three when winningTile is not supplied', () => {
    const ctx = ctxWith({ decomposition: { pair: 'C1', sets: [] } })
    expect(FANS_1_DETECTORS[77]!(ctx)).toEqual([])
    expect(FANS_1_DETECTORS[78]!(ctx)).toEqual([])
    expect(FANS_1_DETECTORS[79]!(ctx)).toEqual([])
  })

  // REGRESSION FIXTURE (docs/rules/decisions.md #36). classifyWait used to
  // guard with `if (!ctx.winningTile ...)`. TileInstanceId is a 0-based index
  // into TILE_TYPE_BY_ID and instance 0 is a REAL tile (the first physical
  // copy of C1), so `!0 === true` made the guard treat a perfectly valid
  // winning tile as absent — all three wait fans silently vanished for that
  // one tile, and the SAME hand scored differently depending on which
  // physical copy of a type completed it.
  //
  // Worse than a display defect: moves.ts's canDeclareWin gates legality on
  // `basicPoints >= MINIMUM_POINTS_TO_WIN`, so a hand whose 8th point came
  // from a wait fan was REJECTED as an illegal win when the winning tile
  // happened to be instance 0. See score-hand.test.ts's companion fixture.
  it('classifies the wait identically whichever physical copy is the winning tile', () => {
    const c1 = idsFor('C1', 2)
    expect(c1[0]).toBe(0) // the whole point of the fixture — instance 0 is a real C1
    const concealedTiles = [...c1, ...idsFor('B2', 3), ...idsFor('B8', 3), ...idsFor('D4', 3), ...idsFor('C7', 3)]
    const decomposition: Decomposition = {
      pair: 'C1',
      sets: [
        { type: 'pung', tiles: ['B2', 'B2', 'B2'] },
        { type: 'pung', tiles: ['B8', 'B8', 'B8'] },
        { type: 'pung', tiles: ['D4', 'D4', 'D4'] },
        { type: 'pung', tiles: ['C7', 'C7', 'C7'] },
      ],
    }

    const withInstance1 = ctxWith({ concealedTiles, decomposition, winningTile: c1[1] })
    expect(FANS_1_DETECTORS[79]!(withInstance1)).toEqual([{ fanId: 79, count: 1 }])

    // The first copy of the SAME type, same hand — must give the same fan.
    const withInstance0 = ctxWith({ concealedTiles, decomposition, winningTile: c1[0] })
    expect(FANS_1_DETECTORS[79]!(withInstance0)).toEqual([{ fanId: 79, count: 1 }])
  })
})

describe('Self-Drawn (fan 80)', () => {
  it('matches a self-drawn win', () => {
    const ctx = ctxWith({ winMethod: 'selfDraw' })
    expect(FANS_1_DETECTORS[80]!(ctx)).toEqual([{ fanId: 80, count: 1 }])
  })

  it('rejects a discard win', () => {
    const ctx = ctxWith({ winMethod: 'discard' })
    expect(FANS_1_DETECTORS[80]!(ctx)).toEqual([])
  })
})

describe('Flower Tiles (fan 81)', () => {
  it('has no detector — scored separately via settlement.ts flowerPoints', () => {
    expect(FANS_1_DETECTORS[81]).toBeUndefined()
  })
})
