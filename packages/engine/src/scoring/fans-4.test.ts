import { describe, expect, it } from 'vitest'
import { FANS_4_DETECTORS } from './fans-4.js'
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

describe('Outside Hand (fan 55)', () => {
  it('matches terminal-touching chows, a wind pung, and a terminal pair', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B1', 'B1', 'B1'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_4_DETECTORS[55]!(ctx)).toEqual([{ fanId: 55, count: 1 }])
  })

  it('rejects a middle chow (4-5-6) that touches no terminal', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C4', 'C5', 'C6'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B1', 'B1', 'B1'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_4_DETECTORS[55]!(ctx)).toEqual([])
  })

  it('rejects a simple-tile pair even if every set qualifies', () => {
    const decomposition: Decomposition = {
      pair: 'C5',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B1', 'B1', 'B1'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_4_DETECTORS[55]!(ctx)).toEqual([])
  })

  it('rejects a simple-tile pung', () => {
    const decomposition: Decomposition = {
      pair: 'C9',
      sets: [
        { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        { type: 'chow', tiles: ['D7', 'D8', 'D9'] },
        { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
        { type: 'pung', tiles: ['B5', 'B5', 'B5'] },
      ],
    }
    const ctx = ctxWith({ decomposition })
    expect(FANS_4_DETECTORS[55]!(ctx)).toEqual([])
  })
})

describe('Fully Concealed Hand (fan 56)', () => {
  it('matches zero melds plus a self-drawn win', () => {
    const ctx = ctxWith({ melds: [], winMethod: 'selfDraw' })
    expect(FANS_4_DETECTORS[56]!(ctx)).toEqual([{ fanId: 56, count: 1 }])
  })

  it('rejects a discard win', () => {
    const ctx = ctxWith({ melds: [], winMethod: 'discard' })
    expect(FANS_4_DETECTORS[56]!(ctx)).toEqual([])
  })

  it('rejects any hand with an exposed meld, even self-drawn', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'exposed')]
    const ctx = ctxWith({ melds, winMethod: 'selfDraw' })
    expect(FANS_4_DETECTORS[56]!(ctx)).toEqual([])
  })

  // KNOWN BUG, not fixed here (fixture only) — docs/rules/mcr_EN.pdf §3.8.1
  // p.16/p.14: fan 56's own text says "without any melds", and the same
  // table's fan 5 (Four Kongs, "may be concealed or melded"), fan 57 (Two
  // Melded Kongs, "One Melded Kong and one Concealed Kong are 6 points"),
  // and fans 67/74 (Concealed Kong vs Melded Kong) all consistently use
  // "meld"/"melded" to mean claimed-from-another-player, never a concealed
  // kong the player declared themselves. A concealed kong should NOT
  // disqualify a self-drawn win from Fully Concealed Hand — but
  // detectFullyConcealedHand checks `ctx.melds.length === 0` (any set at
  // all), not exposure, so it wrongly rejects this case. Found via the
  // validation harness (1200-hand cross-check, seed 20260805): every hand
  // with a concealed kong plus a self-drawn win under-scores by missing fan
  // 56 (and, downstream, keeps Self-Drawn (80) instead of the [56,80]
  // exclusion suppressing it — see score-hand.test.ts).
  it('BUG: incorrectly rejects a self-drawn win that includes only a CONCEALED kong (should still qualify)', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'concealed')]
    const ctx = ctxWith({ melds, winMethod: 'selfDraw' })
    expect(FANS_4_DETECTORS[56]!(ctx)).toEqual([]) // WRONG, should be [{ fanId: 56, count: 1 }]
  })
})

describe('Two Melded Kongs (fan 57)', () => {
  it('matches exactly 2 exposed kongs', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'exposed'), kongMeld('0-1', idsFor('C1', 4), 'exposed')]
    const ctx = ctxWith({ melds })
    expect(FANS_4_DETECTORS[57]!(ctx)).toEqual([{ fanId: 57, count: 1 }])
  })

  it('rejects only 1 exposed kong', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'exposed')]
    const ctx = ctxWith({ melds })
    expect(FANS_4_DETECTORS[57]!(ctx)).toEqual([])
  })

  it('rejects 2 kongs when one is concealed', () => {
    const melds = [kongMeld('0-0', idsFor('WE', 4), 'exposed'), kongMeld('0-1', idsFor('C1', 4), 'concealed')]
    const ctx = ctxWith({ melds })
    expect(FANS_4_DETECTORS[57]!(ctx)).toEqual([])
  })
})

describe('Last Tile (fan 58)', () => {
  it('matches when the context flags the winning tile as the last of its kind', () => {
    const ctx = ctxWith({ isLastCopyOfItsKind: true })
    expect(FANS_4_DETECTORS[58]!(ctx)).toEqual([{ fanId: 58, count: 1 }])
  })

  it('rejects when the flag is absent', () => {
    const ctx = ctxWith({})
    expect(FANS_4_DETECTORS[58]!(ctx)).toEqual([])
  })
})
