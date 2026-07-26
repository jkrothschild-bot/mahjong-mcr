import { describe, expect, it } from 'vitest'
import { resolveFanConflicts, scoreHand } from './score-hand.js'
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

function pungMeld(id: string, tiles: number[]): Meld {
  return { id, kind: 'pung', exposure: 'exposed', tiles, ownerSeat: 0 }
}

describe('resolveFanConflicts', () => {
  it('drops the lower-scoring fan of a real conflicting pair (Big Four Winds vs Big Three Winds)', () => {
    // fan 1 (Big Four Winds, 88) excludes fan 38 (Big Three Winds, 12) —
    // real pair from exclusions.ts, even though fan 38 has no detector yet.
    const resolved = resolveFanConflicts([
      { fanId: 1, count: 1 },
      { fanId: 38, count: 1 },
    ])
    expect(resolved).toEqual([{ fanId: 1, count: 1 }])
  })

  it('leaves non-conflicting fans untouched', () => {
    const resolved = resolveFanConflicts([
      { fanId: 3, count: 1 }, // All Green
      { fanId: 5, count: 1 }, // Four Kongs — no exclusion between these two
    ])
    expect(resolved).toHaveLength(2)
  })

  it('resolves a chain of conflicts (both pairs conflicting)', () => {
    // 77/78/79 (the three wait types) are all mutually exclusive.
    const resolved = resolveFanConflicts([
      { fanId: 77, count: 1 },
      { fanId: 78, count: 1 },
      { fanId: 79, count: 1 },
    ])
    // All three have equal points (1 each); resolution should collapse to exactly one.
    expect(resolved).toHaveLength(1)
  })
})

describe('scoreHand', () => {
  it('scores a real Big Four Winds hand at 88 points', () => {
    const melds = [
      pungMeld('0-0', idsFor('WE', 3)),
      pungMeld('0-1', idsFor('WS', 3)),
      pungMeld('0-2', idsFor('WW', 3)),
      pungMeld('0-3', idsFor('WN', 3)),
    ]
    const concealedTiles = idsFor('C1', 2)
    const result = scoreHand({ concealedTiles, melds })
    expect(result.basicPoints).toBe(88)
    expect(result.fanMatches).toEqual([{ fanId: 1, count: 1 }])
  })

  it('scores a hand matching none of the implemented fans at 0 points', () => {
    // An ordinary hand: three chows, a pung, a pair — none of the 7
    // implemented (88-point) fans apply to this.
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(0)
    expect(result.fanMatches).toEqual([])
  })

  it('scores a Thirteen Orphans hand at 88 points via the special-shape path', () => {
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C9', 1), ...idsFor('D1', 1), ...idsFor('D9', 1),
      ...idsFor('B1', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 2),
    ]
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(88)
    expect(result.fanMatches).toEqual([{ fanId: 7, count: 1 }])
  })

  it('scores a real All Honors hand (64-point tier) end to end through decomposeHand', () => {
    // One pung exposed so this hand does NOT also satisfy Four Concealed
    // Pungs (fan 12) — isolating All Honors alone. There's no stated
    // exclusion between fans 11 and 12, so a fully-concealed all-honors
    // hand legitimately stacks both (64+64=128) — a real fan-stacking
    // case, not a bug, discovered while writing this test.
    const melds = [pungMeld('0-0', idsFor('WE', 3))]
    const concealedTiles = [...idsFor('WS', 3), ...idsFor('DR', 3), ...idsFor('WW', 3), ...idsFor('DG', 2)]
    expect(concealedTiles.length).toBe(11)
    const result = scoreHand({ concealedTiles, melds })
    expect(result.basicPoints).toBe(64)
    expect(result.fanMatches).toEqual([{ fanId: 11, count: 1 }])
  })

  it('correctly stacks All Honors and Four Concealed Pungs when a hand satisfies both (no stated exclusion)', () => {
    const concealedTiles = [
      ...idsFor('WE', 3), ...idsFor('WS', 3), ...idsFor('DR', 3), ...idsFor('WW', 3),
      ...idsFor('DG', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(128)
    expect(result.fanMatches.map((m) => m.fanId).sort()).toEqual([11, 12])
  })
})
