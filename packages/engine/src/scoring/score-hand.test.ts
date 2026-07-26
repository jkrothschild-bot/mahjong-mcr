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
    // Pair is a simple tile (C5, neither terminal nor honor) so this hand
    // does NOT also incidentally satisfy All Terminals and Honors (fan 18)
    // — isolating Big Four Winds alone. Fan 18 only overlaps with Big Four
    // Winds when the pair happens to also be terminal/honor; that's a
    // legitimate independent stack, not tested here (see exclusions.ts's
    // comment on why [1, 18] isn't a blanket exclusion).
    const melds = [
      pungMeld('0-0', idsFor('WE', 3)),
      pungMeld('0-1', idsFor('WS', 3)),
      pungMeld('0-2', idsFor('WW', 3)),
      pungMeld('0-3', idsFor('WN', 3)),
    ]
    const concealedTiles = idsFor('C5', 2)
    const result = scoreHand({ concealedTiles, melds })
    expect(result.basicPoints).toBe(88)
    expect(result.fanMatches).toEqual([{ fanId: 1, count: 1 }])
  })

  it('falls back to Chicken Hand (8 pts) when no other fan matches', () => {
    // A deliberately "boring" hand: two shifted-by-3 chows in one suit (not
    // a 1-or-2 shift, so it doesn't trip Pure Shifted Chows), a chow in a
    // second suit at a rank that doesn't line up into any straight, a lone
    // pung (not a triple), and a non-terminal/non-honor/non-reversible
    // pair — chosen to avoid every fan implemented so far. Since M2 session
    // 8, a hand matching nothing else falls back to fan 43 (Chicken Hand)
    // rather than scoring literal 0 — real rulebook behavior (§3.8.1 p.16),
    // not a simplification. (An earlier version of this test, from session
    // 1, used a hand that later sessions' Mixed Straight fan legitimately
    // started matching — a good sign the pipeline actually works across
    // batches, but it meant this test needed a tile set immune to *every*
    // fan implemented so far, not just the ones that existed when it was
    // written.)
    const concealedTiles = [
      ...idsFor('C2', 1), ...idsFor('C3', 1), ...idsFor('C4', 1),
      ...idsFor('C5', 1), ...idsFor('C6', 1), ...idsFor('C7', 1),
      ...idsFor('D1', 1), ...idsFor('D2', 1), ...idsFor('D3', 1),
      ...idsFor('B5', 3),
      ...idsFor('C9', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(8)
    expect(result.fanMatches).toEqual([{ fanId: 43, count: 1 }])
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
    // 2 wind pungs + 2 dragon pungs (exposed) + a 3rd-wind pair — avoids
    // every honor "count tier" fan (Big/Little Four Winds need 3 or 4 wind
    // pungs; Big/Little Three Dragons need 2 or 3 dragon pungs with a
    // dragon pair; Big Three Winds needs 3 wind pungs; Four/Three Concealed
    // Pungs need 4 or 3 concealed pungs) so this isolates All Honors alone.
    // Discovered by trial and error across three sessions — honor-family
    // fans overlap constantly by coincidence, never by necessary subset.
    const melds = [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3))]
    const concealedTiles = [...idsFor('DR', 3), ...idsFor('DG', 3), ...idsFor('WW', 2)]
    expect(concealedTiles.length).toBe(8)
    const result = scoreHand({ concealedTiles, melds })
    expect(result.basicPoints).toBe(64)
    expect(result.fanMatches).toEqual([{ fanId: 11, count: 1 }])
  })

  it('correctly stacks All Honors and Four Concealed Pungs when a hand satisfies both (no stated exclusion)', () => {
    // Same "avoid every honor count-tier fan" construction as above, but
    // fully concealed this time so Four Concealed Pungs (fan 12) also
    // applies alongside All Honors — a genuine independent stack.
    const concealedTiles = [
      ...idsFor('WE', 3), ...idsFor('WS', 3), ...idsFor('DR', 3), ...idsFor('DG', 3),
      ...idsFor('WW', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(128)
    expect(result.fanMatches.map((m) => m.fanId).sort()).toEqual([11, 12])
  })

  it('scores a real Quadruple Chow hand (48-point tier), picking the max across decomposeHand\'s multiple valid parses', () => {
    // This tile multiset also has other valid decompositions (e.g.
    // pung+chow+pung+pung) that decomposeHand will find alongside the
    // "4 identical chows" parse — scoreHand must pick whichever scores
    // highest, not just the first one found.
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('D5', 2)]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(48)
    expect(result.fanMatches).toEqual([{ fanId: 14, count: 1 }])
  })

  it('scores Seven Shifted Pairs at 88 alone, not 88+24, since it always also structurally satisfies Seven Pairs', () => {
    const concealedTiles = [
      ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2), ...idsFor('D5', 2),
      ...idsFor('D6', 2), ...idsFor('D7', 2), ...idsFor('D8', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(88)
    expect(result.fanMatches).toEqual([{ fanId: 6, count: 1 }])
  })
})
