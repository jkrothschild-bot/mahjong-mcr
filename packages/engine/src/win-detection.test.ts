import { describe, expect, it } from 'vitest'
import { decomposeHand, isSevenPairs, isWinningHand } from './win-detection.js'
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
