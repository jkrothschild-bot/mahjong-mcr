import { describe, expect, it } from 'vitest'
import { decomposeHand, isHonorsAndKnittedTiles, isSevenPairs, isThirteenOrphans, isWinningHand, knittedStraightRemainders } from './win-detection.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileTypeId } from './tiles.js'
import type { Meld } from './meld.js'

// Returns `count` distinct physical instance ids of the given standard tile
// type (there are always exactly 4 copies of each standard type in the
// canonical table, so this is safe for count <= 4).
function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function exposedPung(id: string, typeId: TileTypeId): Meld {
  return { id, kind: 'pung', exposure: 'exposed', tiles: idsFor(typeId, 3), ownerSeat: 0 }
}

function exposedKong(id: string, typeId: TileTypeId): Meld {
  return {
    id,
    kind: 'kong',
    exposure: 'exposed',
    kongSource: 'exposedFromDiscard',
    tiles: idsFor(typeId, 4),
    ownerSeat: 0,
  }
}

describe('decomposeHand / isWinningHand — standard shape', () => {
  it('recognizes a full concealed 4-sets-plus-pair hand', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C3', 1), // + C2 below completes chow 1-2-3
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C2', 3), // 1 for the chow, 2 for the pair
    ]
    expect(concealed.length).toBe(14)
    expect(isWinningHand(concealed, [])).toBe(true)
    expect(decomposeHand(concealed, []).length).toBeGreaterThan(0)
  })

  it('recognizes a win with one exposed kong (15 physical tiles: 11 concealed + 4 in the kong)', () => {
    const kong = exposedKong('0-0', 'WE')
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 3),
      ...idsFor('C9', 2),
    ]
    expect(concealed.length).toBe(11)
    expect(concealed.length + kong.tiles.length).toBe(15)
    expect(isWinningHand(concealed, [kong])).toBe(true)
  })

  it('a concealed 4-of-a-kind that cannot join any chow fails to validate', () => {
    const concealed = [
      ...idsFor('C5', 4),
      ...idsFor('C1', 2), // candidate pair
      ...idsFor('WE', 3),
      ...idsFor('DG', 3),
      ...idsFor('DR', 2),
    ]
    expect(concealed.length).toBe(14)
    expect(isWinningHand(concealed, [])).toBe(false)
  })

  it('a concealed 4-of-a-kind IS usable when 3 form a pung and the 4th joins an adjacent chow', () => {
    const concealed = [
      ...idsFor('C5', 4),
      ...idsFor('C4', 1),
      ...idsFor('C6', 1),
      ...idsFor('WE', 3),
      ...idsFor('DG', 3),
      ...idsFor('B1', 2),
    ]
    expect(concealed.length).toBe(14)
    expect(isWinningHand(concealed, [])).toBe(true)
  })

  it('rejects a bare 13-tile tenpai hand (one tile short of complete)', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C2', 2), // only 1 for the chow + 1 of the pair — missing the 14th tile
    ]
    expect(concealed.length).toBe(13)
    expect(isWinningHand(concealed, [])).toBe(false)
  })

  it('rejects four valid sets plus two singleton tiles that do not form a pair', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('WE', 1), ...idsFor('WS', 1), // two different singles, not a pair
    ]
    expect(concealed.length).toBe(14)
    expect(isWinningHand(concealed, [])).toBe(false)
  })
})

describe('isSevenPairs / isWinningHand — seven pairs', () => {
  it('recognizes 7 distinct pairs with no melds', () => {
    const concealed = [
      ...idsFor('C1', 2), ...idsFor('C2', 2), ...idsFor('C3', 2), ...idsFor('C4', 2),
      ...idsFor('C5', 2), ...idsFor('C6', 2), ...idsFor('C7', 2),
    ]
    expect(concealed.length).toBe(14)
    expect(isSevenPairs(concealed, [])).toBe(true)
    expect(isWinningHand(concealed, [])).toBe(true)
  })

  it('rejects 6 pairs plus 2 non-matching singletons', () => {
    const concealed = [
      ...idsFor('C1', 2), ...idsFor('C3', 2), ...idsFor('C5', 2),
      ...idsFor('C7', 2), ...idsFor('C9', 2), ...idsFor('D1', 2),
      ...idsFor('WE', 1), ...idsFor('WS', 1),
    ]
    expect(concealed.length).toBe(14)
    expect(isSevenPairs(concealed, [])).toBe(false)
    expect(isWinningHand(concealed, [])).toBe(false)
  })

  it('rejects a seven-pairs-shaped concealed hand if any meld is present', () => {
    const concealed = [
      ...idsFor('C1', 2), ...idsFor('C2', 2), ...idsFor('C3', 2), ...idsFor('C4', 2),
      ...idsFor('C5', 2), ...idsFor('C6', 2), ...idsFor('C7', 2),
    ]
    const meld = exposedPung('0-0', 'DR')
    expect(isSevenPairs(concealed, [meld])).toBe(false)
  })
})

describe('isThirteenOrphans / isWinningHand — Thirteen Orphans (§3.7.2.2 shape 2, p.13)', () => {
  it('recognizes one of each of the 13 terminal/honor types plus a pair of one of them', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C9', 1), ...idsFor('D1', 1), ...idsFor('D9', 1),
      ...idsFor('B1', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1),
      ...idsFor('DW', 2), // the doubled type completing the pair
    ]
    expect(concealed.length).toBe(14)
    expect(isThirteenOrphans(concealed, [])).toBe(true)
    expect(isWinningHand(concealed, [])).toBe(true)
  })

  it('rejects a hand missing one of the 13 required types, even with an extra duplicate elsewhere', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C9', 1), ...idsFor('D1', 1), ...idsFor('D9', 1),
      ...idsFor('B1', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 3), ...idsFor('DG', 1),
      // no DW at all -> DW is missing; DR tripled instead to still reach 14
      // physical tiles (11 singles + 3 DR = 14)
    ]
    expect(concealed.length).toBe(14)
    expect(isThirteenOrphans(concealed, [])).toBe(false)
    expect(isWinningHand(concealed, [])).toBe(false)
  })

  it('rejects a bare 13-tile tenpai orphans hand (one tile short, no doubled type yet)', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C9', 1), ...idsFor('D1', 1), ...idsFor('D9', 1),
      ...idsFor('B1', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
    ]
    expect(concealed.length).toBe(13)
    expect(isThirteenOrphans(concealed, [])).toBe(false)
  })

  it('rejects a 14-tile hand containing a non-terminal/honor tile, even if otherwise orphans-shaped', () => {
    const concealed = [
      ...idsFor('C1', 1), ...idsFor('C9', 1), ...idsFor('D1', 1), ...idsFor('D9', 1),
      ...idsFor('B1', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1),
      ...idsFor('C5', 2), // a simple-tile pair instead of doubling one of the 13 required types (DW is missing entirely)
    ]
    expect(concealed.length).toBe(14)
    expect(isThirteenOrphans(concealed, [])).toBe(false)
  })
})

// FIXED 2026-08-05 (was a KNOWN BUG — see docs/rules/decisions.md #19/#20).
// §3.7.2.2 (p.13) recognizes a 4th winning shape covering Greater/Lesser
// Honors and Knitted Tiles (fans 20/34, 14 single tiles, no pair at all) and
// Knitted Straight (fan 35, App.1 p.34/p.35 — verified directly against the
// rulebook text, not from memory, per decisions.md #20: "a special Straight
// formed not with standard chows but with 3 different Knitted sequences",
// i.e. the 9 knitted tiles stand in for 3 of the standard 4 sets, leaving
// room for 1 more real set + a pair — NOT the no-pair 14-singles shape fans
// 20/34 use, despite superficially similar tile composition). All three
// fans' detector functions (fans-24.ts/fans-12.ts) were already correct;
// the bug was entirely in candidate generation never producing a matching
// HandContext for them to run against — isHonorsAndKnittedTiles and
// knittedStraightRemainders (below) close that gap.
describe('isHonorsAndKnittedTiles / isWinningHand — Greater/Lesser Honors and Knitted Tiles (§3.7.2.2 shape 4, fans 20/34)', () => {
  it('recognizes a valid Greater-style hand (7 honors) as winning', () => {
    // All 7 honors (singles) + 1-4-7 Bamboo + 2-5-8 Characters + a single
    // Dots tile from the 3rd sequence (3-6-9) — 7 + 3 + 3 + 1 = 14 single
    // tiles, no pair at all, matching detectGreaterHonorsAndKnittedTiles's
    // "any non-empty per-suit split, one sequence per suit" rule
    // (docs/rules/decisions.md item #12).
    const concealed = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('B1', 1), ...idsFor('B4', 1), ...idsFor('B7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('D3', 1),
    ]
    expect(concealed.length).toBe(14)
    expect(isHonorsAndKnittedTiles(concealed, [])).toBe(true)
    expect(isWinningHand(concealed, [])).toBe(true)
  })

  it('recognizes a valid Lesser-style hand (5 honors) as winning', () => {
    // 5 honors + 1-4-7 Characters (3) + 2-5-8 Dots (3) + 3-6-9 Bamboo (3) = 5+9=14.
    const concealed = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1),
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1),
      ...idsFor('D2', 1), ...idsFor('D5', 1), ...idsFor('D8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
    ]
    expect(concealed.length).toBe(14)
    expect(isHonorsAndKnittedTiles(concealed, [])).toBe(true)
    expect(isWinningHand(concealed, [])).toBe(true)
  })

  it('rejects a hand with a meld (this shape can never have one)', () => {
    const concealed = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('B1', 1), ...idsFor('B4', 1), ...idsFor('B7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1),
    ]
    const kong: Meld = { id: '0-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: idsFor('D3', 4), ownerSeat: 0 }
    expect(isHonorsAndKnittedTiles(concealed, [kong])).toBe(false)
  })

  it('rejects two suits sharing the same knitted sequence', () => {
    const concealed = [
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('WN', 1),
      ...idsFor('DR', 1), ...idsFor('DG', 1), ...idsFor('DW', 1),
      ...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1), // Characters: seq 1-4-7
      ...idsFor('D1', 1), ...idsFor('D4', 1), // Dots: ALSO seq 1-4-7 — not a different sequence
      ...idsFor('B3', 1),
    ]
    expect(isHonorsAndKnittedTiles(concealed, [])).toBe(false)
    expect(isWinningHand(concealed, [])).toBe(false)
  })
})

describe('knittedStraightRemainders / isWinningHand — Knitted Straight (fan 35, App.1 p.34-35)', () => {
  it('recognizes 9 knitted tiles + a concealed pung + a pair (0 melds) as winning', () => {
    // 1-4-7 Dots + 2-5-8 Characters + 3-6-9 Bamboo (App.1 p.35's own worked
    // example pattern) + a pung of East + a pair of C1.
    const concealed = [
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('C1', 2),
    ]
    expect(concealed.length).toBe(14)
    const remainders = knittedStraightRemainders(concealed, [])
    expect(remainders.length).toBeGreaterThan(0)
    expect(remainders[0]!.decomposition).toEqual({ pair: 'C1', sets: [{ type: 'pung', tiles: ['WE', 'WE', 'WE'] }] })
    expect(isWinningHand(concealed, [])).toBe(true)
  })

  it('recognizes 9 knitted tiles + a pair alone, with 1 real meld already declared', () => {
    const concealed = [
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('C1', 2),
    ]
    const meld: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('WE', 3), ownerSeat: 0 }
    expect(concealed.length).toBe(11)
    expect(knittedStraightRemainders(concealed, [meld]).length).toBeGreaterThan(0)
    expect(isWinningHand(concealed, [meld])).toBe(true)
  })

  it('rejects a hand missing one tile of the knitted pattern', () => {
    const concealed = [
      ...idsFor('D1', 1), ...idsFor('D4', 1), // missing D7
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('C1', 3),
    ]
    expect(concealed.length).toBe(14)
    expect(knittedStraightRemainders(concealed, [])).toEqual([])
  })
})
