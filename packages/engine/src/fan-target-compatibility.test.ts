import { describe, expect, it } from 'vitest'
import { allStage3Pairs, isRouteCompatible, pairKey, routeCompatibilityReason, STAGE3_FAN_IDS } from './fan-target-compatibility.js'
import { FANS_1_DETECTORS } from './scoring/fans-1.js'
import { FANS_2_DETECTORS } from './scoring/fans-2.js'
import { FANS_6_DETECTORS } from './scoring/fans-6.js'
import { FANS_24_DETECTORS } from './scoring/fans-24.js'
import { FANS_88_DETECTORS } from './scoring/fans-88.js'
import type { HandContext } from './scoring/types.js'
import type { Decomposition, SetShape } from './win-detection.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'

// One combined detector lookup across every batch file that hosts one of
// the 10 Stage 3 fans — mirrors score-hand.ts's own ALL_DETECTORS merge,
// scoped to just these 10 rather than all 81 (that map isn't exported).
const DETECTORS: Readonly<Record<number, (ctx: HandContext) => { fanId: number; count: number }[]>> = {
  ...FANS_1_DETECTORS,
  ...FANS_2_DETECTORS,
  ...FANS_6_DETECTORS,
  ...FANS_24_DETECTORS,
  ...FANS_88_DETECTORS,
}

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function ctxWith(partial: Partial<HandContext>): HandContext {
  return { concealedTiles: [], melds: [], decomposition: null, specialShape: null, ...partial }
}

// Builds BOTH a `Decomposition` (type-id based, what the pung/kong-requiring
// detectors read via allSets) and a matching `concealedTiles` array (real
// instance ids, what the whole-hand tile-membership detectors read) for the
// SAME physical hand, so a single ctx can be checked against detectors of
// either kind at once. All-concealed (melds: []) — none of the 10 families
// require any tile to be exposed.
function fourPungsHand(pungs: [TileTypeId, TileTypeId, TileTypeId, TileTypeId], pairType: TileTypeId): { decomposition: Decomposition; concealedTiles: TileInstanceId[] } {
  const sets: SetShape[] = pungs.map((t) => ({ type: 'pung', tiles: [t, t, t] }))
  const decomposition: Decomposition = { pair: pairType, sets }
  const typeCounts = new Map<TileTypeId, number>()
  for (const t of pungs) typeCounts.set(t, (typeCounts.get(t) ?? 0) + 3)
  typeCounts.set(pairType, (typeCounts.get(pairType) ?? 0) + 2)
  const concealedTiles: TileInstanceId[] = []
  for (const [type, count] of typeCounts) concealedTiles.push(...idsFor(type, count))
  return { decomposition, concealedTiles }
}

function sevenPairsHand(types: readonly TileTypeId[]): TileInstanceId[] {
  if (types.length !== 7) throw new Error('Seven Pairs needs exactly 7 distinct types')
  return types.flatMap((t) => idsFor(t, 2))
}

function fires(fanId: number, ctx: HandContext): boolean {
  const matches = DETECTORS[fanId]?.(ctx) ?? []
  return matches.length > 0
}

describe('STAGE3_FAN_IDS coverage', () => {
  it('every one of the 10 families has a real detector wired above', () => {
    for (const fanId of STAGE3_FAN_IDS) {
      expect(DETECTORS[fanId], `no detector found for fan ${fanId}`).toBeDefined()
    }
  })
})

describe('completeness: every one of the 45 pairs is explicitly classified', () => {
  const pairs = allStage3Pairs()

  it('has exactly 45 pairs (C(10,2))', () => {
    expect(pairs).toHaveLength(45)
  })

  it.each(pairs)('pair (%i, %i) has a reason string', (a, b) => {
    const reason = routeCompatibilityReason(a, b)
    expect(reason, `pairKey ${pairKey(a, b)} is missing from the table`).toBeDefined()
    expect(reason!.length).toBeGreaterThan(0)
  })
})

describe('incompatible pairs: no complete hand can satisfy both (structural)', () => {
  it('Seven Pairs (19) vs every pung/kong-requiring fan', () => {
    for (const fanId of [49, 59, 2, 60, 61]) {
      expect(isRouteCompatible(19, fanId), `expected (19, ${fanId}) incompatible`).toBe(false)
    }
  })

  it('every zero-honor fan (22, 68, 76) vs every honor-requiring fan (50, 59, 2, 60, 61)', () => {
    for (const zeroHonor of [22, 68, 76]) {
      for (const requiresHonor of [50, 59, 2, 60, 61]) {
        expect(isRouteCompatible(zeroHonor, requiresHonor), `expected (${zeroHonor}, ${requiresHonor}) incompatible`).toBe(false)
      }
    }
  })
})

describe('compatible pairs: a real constructed hand where BOTH real detectors fire', () => {
  it('(19, 50) Seven Pairs + Half Flush', () => {
    const ctx = ctxWith({ concealedTiles: sevenPairsHand(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'DR']), specialShape: 'sevenPairs' })
    expect(fires(19, ctx)).toBe(true)
    expect(fires(50, ctx)).toBe(true)
  })

  it('(19, 22) Seven Pairs + Full Flush', () => {
    const ctx = ctxWith({ concealedTiles: sevenPairsHand(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']), specialShape: 'sevenPairs' })
    expect(fires(19, ctx)).toBe(true)
    expect(fires(22, ctx)).toBe(true)
  })

  it('(19, 68) Seven Pairs + All Simples', () => {
    const ctx = ctxWith({ concealedTiles: sevenPairsHand(['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']), specialShape: 'sevenPairs' })
    expect(fires(19, ctx)).toBe(true)
    expect(fires(68, ctx)).toBe(true)
  })

  it('(19, 76) Seven Pairs + No Honors (deliberately not also Full Flush: multi-suit, includes terminals)', () => {
    const ctx = ctxWith({ concealedTiles: sevenPairsHand(['C1', 'C9', 'D1', 'D9', 'B1', 'B9', 'C5']), specialShape: 'sevenPairs' })
    expect(fires(19, ctx)).toBe(true)
    expect(fires(76, ctx)).toBe(true)
  })

  it('(49, 50) All Pungs + Half Flush', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['C1', 'C4', 'C7', 'DR'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(50, ctx)).toBe(true)
  })

  it('(49, 22) All Pungs + Full Flush', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['C1', 'C3', 'C5', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(22, ctx)).toBe(true)
  })

  it('(49, 59) All Pungs + Dragon Pung', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'C1', 'C4', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(59, ctx)).toBe(true)
  })

  it('(49, 2) All Pungs + Big Three Dragons', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'DG', 'DW', 'C1'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(2, ctx)).toBe(true)
  })

  it('(49, 60) All Pungs + Prevalent Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['WE', 'C1', 'C4', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles, prevailingWind: 'east' })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(60, ctx)).toBe(true)
  })

  it('(49, 61) All Pungs + Seat Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['WE', 'C1', 'C4', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles, seatWind: 'east' })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(61, ctx)).toBe(true)
  })

  it('(49, 68) All Pungs + All Simples', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['C2', 'C4', 'D3', 'B6'], 'C8')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(68, ctx)).toBe(true)
  })

  it('(49, 76) All Pungs + No Honors', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['C1', 'C4', 'D3', 'B6'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(49, ctx)).toBe(true)
    expect(fires(76, ctx)).toBe(true)
  })

  it('(50, 59) Half Flush + Dragon Pung', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'C1', 'C4', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(50, ctx)).toBe(true)
    expect(fires(59, ctx)).toBe(true)
  })

  it('(50, 2) Half Flush + Big Three Dragons', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'DG', 'DW', 'C1'], 'C4')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(50, ctx)).toBe(true)
    expect(fires(2, ctx)).toBe(true)
  })

  it('(50, 60) Half Flush + Prevalent Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['WE', 'C1', 'C4', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles, prevailingWind: 'east' })
    expect(fires(50, ctx)).toBe(true)
    expect(fires(60, ctx)).toBe(true)
  })

  it('(50, 61) Half Flush + Seat Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['WE', 'C1', 'C4', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles, seatWind: 'east' })
    expect(fires(50, ctx)).toBe(true)
    expect(fires(61, ctx)).toBe(true)
  })

  it('(22, 68) Full Flush + All Simples', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['C2', 'C4', 'C6', 'C7'], 'C8')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(22, ctx)).toBe(true)
    expect(fires(68, ctx)).toBe(true)
  })

  it('(22, 76) Full Flush + No Honors (also a real exclusions.ts [22,76] pair, resolving the point double-count separately)', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['C1', 'C3', 'C5', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(22, ctx)).toBe(true)
    expect(fires(76, ctx)).toBe(true)
  })

  it('(59, 2) Dragon Pung + Big Three Dragons (also a real exclusions.ts [2,59] pair, resolving the point double-count separately)', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'DG', 'DW', 'C1'], 'C4')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(59, ctx)).toBe(true)
    expect(fires(2, ctx)).toBe(true)
  })

  it('(59, 60) Dragon Pung + Prevalent Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'WE', 'C1', 'C4'], 'C7')
    const ctx = ctxWith({ decomposition, concealedTiles, prevailingWind: 'east' })
    expect(fires(59, ctx)).toBe(true)
    expect(fires(60, ctx)).toBe(true)
  })

  it('(59, 61) Dragon Pung + Seat Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'WE', 'C1', 'C4'], 'C7')
    const ctx = ctxWith({ decomposition, concealedTiles, seatWind: 'east' })
    expect(fires(59, ctx)).toBe(true)
    expect(fires(61, ctx)).toBe(true)
  })

  it('(2, 60) Big Three Dragons + Prevalent Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'DG', 'DW', 'WE'], 'C1')
    const ctx = ctxWith({ decomposition, concealedTiles, prevailingWind: 'east' })
    expect(fires(2, ctx)).toBe(true)
    expect(fires(60, ctx)).toBe(true)
  })

  it('(2, 61) Big Three Dragons + Seat Wind', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['DR', 'DG', 'DW', 'WE'], 'C1')
    const ctx = ctxWith({ decomposition, concealedTiles, seatWind: 'east' })
    expect(fires(2, ctx)).toBe(true)
    expect(fires(61, ctx)).toBe(true)
  })

  it('(60, 61) Prevalent Wind + Seat Wind, same physical pung (the "double wind" hand)', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['WE', 'C1', 'C4', 'C7'], 'C9')
    const ctx = ctxWith({ decomposition, concealedTiles, prevailingWind: 'east', seatWind: 'east' })
    expect(fires(60, ctx)).toBe(true)
    expect(fires(61, ctx)).toBe(true)
  })

  it('(68, 76) All Simples + No Honors (also a real exclusions.ts [68,76] pair, resolving the point double-count separately)', () => {
    const { decomposition, concealedTiles } = fourPungsHand(['C2', 'C4', 'D3', 'B6'], 'C8')
    const ctx = ctxWith({ decomposition, concealedTiles })
    expect(fires(68, ctx)).toBe(true)
    expect(fires(76, ctx)).toBe(true)
  })
})
