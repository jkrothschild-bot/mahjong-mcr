import { describe, expect, it } from 'vitest'
import { resolveFanConflicts, scoreHand, scoreHandDetailed } from './score-hand.js'
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
  it('scores a real Big Four Winds hand at 88+6, since a simple-tile pair unavoidably also triggers Half Flush', () => {
    // Pair is a simple tile (C5, neither terminal nor honor) so this hand
    // does NOT also incidentally satisfy All Terminals and Honors (fan 18)
    // — see exclusions.ts's comment on why [1, 18] isn't a blanket
    // exclusion. But a suited pair alongside 4 honor-only sets means this
    // hand is unavoidably also "one suit (the pair) combined with honor
    // tiles" — Half Flush (fan 50) — for ANY suited pair choice, so rather
    // than chase a fully clean isolation, this test just verifies the
    // correct combined total.
    const melds = [
      pungMeld('0-0', idsFor('WE', 3)),
      pungMeld('0-1', idsFor('WS', 3)),
      pungMeld('0-2', idsFor('WW', 3)),
      pungMeld('0-3', idsFor('WN', 3)),
    ]
    const concealedTiles = idsFor('C5', 2)
    const result = scoreHand({ concealedTiles, melds })
    expect(result.basicPoints).toBe(94)
    expect(result.fanMatches.map((m) => m.fanId).sort()).toEqual([1, 50])
  })

  it('falls back to Chicken Hand (8 pts) when no other fan matches', () => {
    // A deliberately "boring" hand, immune to every fan implemented so far
    // (now including the full 4/2/1-point tiers): 3 chows scattered across
    // suits with no shared rank, no same-suit shift, and none touching a
    // terminal (avoids the whole Double/Triple/Straight/Terminal-Chow
    // family and Outside Hand); one pung of a plain non-terminal odd simple
    // tile (avoids Pung of Terminals or Honors, Double Pung, All Even
    // Pungs); a lone dragon PAIR, not pung, to kill No Honors (76) without
    // tripping any dragon-pung fan or Pung of Terminals/Honors (which only
    // counts pungs, not pairs); all 3 suits used (kills One Voided Suit,
    // Half/Full Flush). Since M2 session 8, a hand matching nothing else
    // falls back to fan 43 (Chicken Hand) rather than scoring literal 0 —
    // real rulebook behavior (§3.8.1 p.16), not a simplification. (This
    // hand has already been rebuilt twice as new batches started
    // legitimately matching the previous one — a good sign the pipeline
    // works across batches, but it means this test needs a tile set immune
    // to *every* fan implemented so far, not just the ones that existed
    // when it was last written.)
    const concealedTiles = [
      ...idsFor('C3', 1), ...idsFor('C4', 1), ...idsFor('C5', 1),
      ...idsFor('D5', 1), ...idsFor('D6', 1), ...idsFor('D7', 1),
      ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('B4', 1),
      ...idsFor('B7', 3),
      ...idsFor('DR', 2),
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

  it('scores a real All Honors hand at 64+6, since a 4-pung all-honor hand can never avoid every honor-count fan', () => {
    // Only 7 honor types exist (4 winds + 3 dragons), and since a pung uses
    // 3 of a type's 4 copies, a 4-pung-plus-pair all-honor hand always uses
    // exactly 5 DISTINCT honor types (4 pung-types + 1 pair-type — the pair
    // can never reuse a pung's type, since only 1 copy would be left).
    // That forces the wind/dragon pung split among the 4 sets into one of
    // (1,3), (2,2), (3,1), (4,0) windPungs/dragonPungs — and EVERY one of
    // those hits some other honor-family fan (3 dragon pungs = Big Three
    // Dragons 88pts; 3 or 4 wind pungs = Big Three/Four Winds; only the
    // (2,2) split's forced overlap is mild: exactly 2 dragon pungs always
    // also satisfies Two Dragon Pungs, fan 54, 6pts). So rather than chase
    // an impossible full isolation, this uses the mildest unavoidable
    // split and verifies the correct combined total. All 4 sets are
    // exposed melds here (not split concealed/exposed) specifically to
    // avoid ALSO tripping Two Concealed Pungs (66, 2pts) — that overlap
    // isn't a universal fact about All Honors (melding is a free choice),
    // just an easily-avoided artifact of how this fixture is built.
    const melds = [
      pungMeld('0-0', idsFor('WE', 3)),
      pungMeld('0-1', idsFor('WS', 3)),
      pungMeld('0-2', idsFor('DR', 3)),
      pungMeld('0-3', idsFor('DG', 3)),
    ]
    const concealedTiles = idsFor('WW', 2)
    expect(concealedTiles.length).toBe(2)
    const result = scoreHand({ concealedTiles, melds })
    expect(result.basicPoints).toBe(70)
    expect(result.fanMatches.map((m) => m.fanId).sort()).toEqual([11, 54])
  })

  it('correctly stacks All Honors, Four Concealed Pungs, and the forced Two Dragon Pungs overlap', () => {
    // Same (2,2) wind/dragon split as above (see its comment for why this
    // is the mildest achievable honor-family overlap), fully concealed this
    // time so Four Concealed Pungs (fan 12) also applies — three
    // legitimately co-occurring fans, no bug.
    const concealedTiles = [
      ...idsFor('WE', 3), ...idsFor('WS', 3), ...idsFor('DR', 3), ...idsFor('DG', 3),
      ...idsFor('WW', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(134)
    expect(result.fanMatches.map((m) => m.fanId).sort()).toEqual([11, 12, 54])
  })

  it('scores a real Quadruple Chow hand (48-point tier), picking the max across decomposeHand\'s multiple valid parses', () => {
    // This tile multiset also has other valid decompositions (e.g.
    // pung+chow+pung+pung) that decomposeHand will find alongside the
    // "4 identical chows" parse — scoreHand must pick whichever scores
    // highest, not just the first one found.
    //
    // The pair choice here is an unavoidable three-way tradeoff: Quadruple
    // Chow's own definition never constrains the pair, so it's either (a)
    // the SAME suit as the 4 chows, triggering Full Flush (+24 — the worst
    // option), (b) an HONOR tile, triggering Half Flush (+6), or (c), used
    // here, a DIFFERENT suit's simple tile, which unavoidably also
    // satisfies All Chows (63 — the pair isn't honor, and all 4 real sets
    // are chows) and One Voided Suit (75 — exactly 2 suits used) for a
    // minimal +3. This is the smallest achievable combined total, not a
    // bug — same "verify the correct combined total" approach as the All
    // Honors test above, since a fully isolated Quadruple Chow hand doesn't
    // exist.
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('D5', 2)]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(51)
    expect(result.fanMatches.map((m) => m.fanId).sort()).toEqual([14, 63, 75])
  })

  it('scores Seven Shifted Pairs at 88 alone, not 88+24 or more, once its unavoidable structural implications are excluded', () => {
    // Ranks 1-7 (not 2-8) specifically: touching the terminal (rank 1)
    // keeps this hand out of All Simples (68) territory, so the only
    // structural freebie left is No Honors (76) — genuinely unavoidable,
    // since honor tiles have no rank and can never form a consecutive-pair
    // run — excluded via exclusions.ts's [6, 76] (added this session), on
    // top of the pre-existing [6, 19] (Seven Pairs).
    const concealedTiles = [
      ...idsFor('D1', 2), ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2),
      ...idsFor('D5', 2), ...idsFor('D6', 2), ...idsFor('D7', 2),
    ]
    expect(concealedTiles.length).toBe(14)
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.basicPoints).toBe(88)
    expect(result.fanMatches).toEqual([{ fanId: 6, count: 1 }])
  })
})

// scoreHandDetailed reports WHICH candidate parse scoreHand ended up
// scoring, so the board can lay a revealed winning hand out in its real
// groups. It was always computed and thrown away; nothing about candidate
// generation or selection changed.
describe('scoreHandDetailed', () => {
  // The guarantee that matters most. If these two ever disagree, every
  // rulebook fixture and the PyMahjongGB cross-check are testing a different
  // code path from the one the app actually runs.
  it.each([
    ['Big Four Winds', { concealedTiles: idsFor('C5', 2), melds: [pungMeld('0-0', idsFor('WE', 3)), pungMeld('0-1', idsFor('WS', 3)), pungMeld('0-2', idsFor('WW', 3)), pungMeld('0-3', idsFor('WN', 3))] }],
    ['Seven Shifted Pairs', { concealedTiles: [...idsFor('D1', 2), ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2), ...idsFor('D5', 2), ...idsFor('D6', 2), ...idsFor('D7', 2)], melds: [] }],
    ['no valid win at all', { concealedTiles: idsFor('C1', 3), melds: [] }],
  ])('scores %s identically to scoreHand', (_label, params) => {
    const narrow = scoreHand(params)
    const { winningShape, ...detailed } = scoreHandDetailed(params)
    expect(detailed).toEqual(narrow)
  })

  it('exposes no extra keys on scoreHand — the fixture suite asserts its exact shape', () => {
    const result = scoreHand({ concealedTiles: idsFor('C1', 3), melds: [] })
    expect(Object.keys(result).sort()).toEqual(['basicPoints', 'fanMatches'])
  })

  it('reports the standard parse that was scored, covering the concealed tiles only', () => {
    // One meld, so decomposeHand needs 3 more sets plus a pair from the
    // concealed tiles — and must NOT echo the meld back in `sets`.
    const melds = [pungMeld('0-0', idsFor('WE', 3))]
    const concealedTiles = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DR', 2),
    ]
    const { winningShape } = scoreHandDetailed({ concealedTiles, melds })

    expect(winningShape?.specialShape).toBeNull()
    expect(winningShape?.decomposition?.pair).toBe('DR')
    expect(winningShape?.decomposition?.sets).toHaveLength(3)
  })

  it('reports sevenPairs rather than a decomposition when the pairs shape is what scored', () => {
    const concealedTiles = [
      ...idsFor('D1', 2), ...idsFor('D2', 2), ...idsFor('D3', 2), ...idsFor('D4', 2),
      ...idsFor('D5', 2), ...idsFor('D6', 2), ...idsFor('D7', 2),
    ]
    const { winningShape } = scoreHandDetailed({ concealedTiles, melds: [] })

    expect(winningShape?.specialShape).toBe('sevenPairs')
    expect(winningShape?.decomposition).toBeNull()
  })

  it('reports no shape when nothing scored', () => {
    expect(scoreHandDetailed({ concealedTiles: idsFor('C1', 3), melds: [] }).winningShape).toBeNull()
  })
})

// End-to-end proof that the knitted-shape fix (docs/rules/decisions.md
// #19/#20) reaches scoreHand, not just isWinningHand — these hands were
// unscoreable at all (basicPoints: 0, no Chicken Hand floor) before
// win-detection.ts gained isHonorsAndKnittedTiles/knittedStraightRemainders.
describe('scoreHand — knitted-tile shapes (fans 20/34/35) reach real scoring, not just isWinningHand', () => {
  it('scores a Greater Honors and Knitted Tiles hand (fan 20, 24 pts)', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('B1', 1), ...idsFor('B4', 1), ...idsFor('B7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('D3', 1),
    ]
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.fanMatches).toContainEqual({ fanId: 20, count: 1 })
    expect(result.basicPoints).toBeGreaterThanOrEqual(24)

    const { winningShape } = scoreHandDetailed({ concealedTiles, melds: [] })
    expect(winningShape?.specialShape).toBe('honorsAndKnittedTiles')
    expect(winningShape?.decomposition).toBeNull()
  })

  it('scores a Lesser Honors and Knitted Tiles hand (fan 34, 12 pts)', () => {
    const concealedTiles = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1),
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
    ]
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.fanMatches).toContainEqual({ fanId: 34, count: 1 })
    expect(result.basicPoints).toBeGreaterThanOrEqual(12)
  })

  it('scores a Knitted Straight hand (fan 35, 12 pts) — App.1 p.35\'s own worked-example pattern', () => {
    const concealedTiles = [
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('C1', 2),
    ]
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.fanMatches).toContainEqual({ fanId: 35, count: 1 })
    expect(result.basicPoints).toBeGreaterThanOrEqual(12)

    const { winningShape } = scoreHandDetailed({ concealedTiles, melds: [] })
    expect(winningShape?.specialShape).toBe('knittedStraight')
    // The remainder decomposition (pung of East + pair of C1) — NOT null,
    // unlike every other special shape (see types.ts's WinningShape comment).
    expect(winningShape?.decomposition).toEqual({ pair: 'C1', sets: [{ type: 'pung', tiles: ['WE', 'WE', 'WE'] }] })
  })

  // A Knitted Straight candidate's decomposition covers only the 0-1 real
  // sets left over after the 9 knitted tiles are set aside — allSets() never
  // sees the other 3 (knitted) sets at all. Found via the validation harness
  // (targeted-35): several "whole-hand universal" detectors trusted `sets`
  // to be the complete 4-set picture and fired incorrectly on an empty or
  // 1-element list (docs/rules/decisions.md #20). Each of the 7 below was
  // fixed with a `sets.length !== 4` guard; this hand structurally can NEVER
  // legitimately qualify for any of them (the knitted portion always
  // includes non-terminal middle-rank tiles), so none should ever fire.
  it('does not let a Knitted Straight hand falsely trigger whole-hand-universal fans', () => {
    const concealedTiles = [
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('C1', 2),
    ]
    const result = scoreHand({ concealedTiles, melds: [] })
    const falselyVulnerable = [8, 11, 18, 21, 31, 49, 63] // All Terminals, All Honors, All Terminals and Honors, All Even Pungs, All Fives, All Pungs, All Chows
    for (const fanId of falselyVulnerable) {
      expect(result.fanMatches).not.toContainEqual({ fanId, count: 1 })
    }
  })

  it('a Knitted Straight hand is no longer stuck at Chicken Hand\'s 8-point floor', () => {
    // Before the fix, isWinningHand was false for this exact hand, so it
    // couldn't even be declared a win. Sanity-check the floor didn't just
    // silently swallow it into a low Chicken Hand score instead.
    const concealedTiles = [
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('C1', 2),
    ]
    const result = scoreHand({ concealedTiles, melds: [] })
    expect(result.fanMatches).not.toContainEqual({ fanId: 43, count: 1 }) // Chicken Hand
  })
})
