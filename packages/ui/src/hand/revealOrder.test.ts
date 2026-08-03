import { describe, expect, it } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId, type WinningShape } from '@mahjong-mcr/engine'
import { revealOrder } from './revealOrder.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function types(order: readonly TileInstanceId[]): TileTypeId[] {
  return order.map(typeIdOfInstance)
}

describe('revealOrder', () => {
  it('suit-sorts a losing seat (no winning shape)', () => {
    const tiles = [...idsFor('B5', 1), ...idsFor('C2', 1), ...idsFor('D9', 1), ...idsFor('C1', 1)]
    expect(types(revealOrder(tiles, null))).toEqual(['C1', 'C2', 'D9', 'B5'])
  })

  // The regression this file exists for. Mixed Straight's three chows are
  // 1-2-3, 4-5-6, 7-8-9 in three DIFFERENT suits, so ordering sets by suit
  // reshuffles them into suit order and destroys the run — the fan's whole
  // point. Caught live: a hand scored "Mixed Straight" rendered 7-8-9 first
  // because characters sort before dots and bamboo.
  it('keeps a Mixed Straight reading 1-2-3, 4-5-6, 7-8-9 across three suits', () => {
    const tiles = [
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B2', 3),
      ...idsFor('D9', 2),
    ]
    const shape: WinningShape = {
      decomposition: {
        pair: 'D9',
        sets: [
          { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
          { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
          { type: 'chow', tiles: ['D4', 'D5', 'D6'] },
          { type: 'pung', tiles: ['B2', 'B2', 'B2'] },
        ],
      },
      specialShape: null,
    }

    expect(types(revealOrder(tiles, shape))).toEqual([
      'C1', 'C2', 'C3',
      'B2', 'B2', 'B2', // rank 2 pung sorts on rank, between the 1-2-3 and 4-5-6 chows
      'D4', 'D5', 'D6',
      'B7', 'B8', 'B9',
      'D9', 'D9',
    ])
  })

  it('sorts honor sets after every numbered set', () => {
    const tiles = [
      ...idsFor('WE', 3),
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D5', 2),
    ]
    const shape: WinningShape = {
      decomposition: {
        pair: 'D5',
        sets: [
          { type: 'pung', tiles: ['WE', 'WE', 'WE'] },
          { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
        ],
      },
      specialShape: null,
    }
    expect(types(revealOrder(tiles, shape))).toEqual(['C1', 'C2', 'C3', 'WE', 'WE', 'WE', 'D5', 'D5'])
  })

  it('lays the winner out in their real sets, pair last', () => {
    const tiles = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 3),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 2),
    ]
    const shape: WinningShape = {
      decomposition: {
        pair: 'WE',
        sets: [
          { type: 'pung', tiles: ['D4', 'D4', 'D4'] },
          { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
          { type: 'chow', tiles: ['B7', 'B8', 'B9'] },
        ],
      },
      specialShape: null,
    }

    // Sets in suit order (characters, dots, bamboo), then the pair — NOT the
    // decomposition's own emission order, and not a flat suit sort (which
    // would interleave the pung with nothing and bury the pair mid-run).
    expect(types(revealOrder(tiles, shape))).toEqual([
      'C1', 'C2', 'C3',
      'D4', 'D4', 'D4',
      'B7', 'B8', 'B9',
      'WE', 'WE',
    ])
  })

  it('puts identical tiles adjacent for Seven Pairs', () => {
    const tiles = [
      ...idsFor('C1', 2), ...idsFor('C5', 2), ...idsFor('D3', 2), ...idsFor('D8', 2),
      ...idsFor('B2', 2), ...idsFor('B9', 2), ...idsFor('WE', 2),
    ]
    const shape: WinningShape = { decomposition: null, specialShape: 'sevenPairs' }
    const result = types(revealOrder(tiles, shape))

    expect(result).toHaveLength(14)
    for (let i = 0; i < result.length; i += 2) {
      expect(result[i], `pair at ${i}`).toBe(result[i + 1])
    }
  })

  it('keeps the doubled tile adjacent for Thirteen Orphans', () => {
    const orphans: TileTypeId[] = ['C1', 'C9', 'D1', 'D9', 'B1', 'B9', 'WE', 'WS', 'WW', 'WN', 'DR', 'DG', 'DW']
    const tiles = [...orphans.flatMap((t) => idsFor(t, 1)), ...idsFor('DW', 2).slice(1)]
    const shape: WinningShape = { decomposition: null, specialShape: 'thirteenOrphans' }
    const result = types(revealOrder(tiles, shape))

    expect(result).toHaveLength(14)
    expect(result.indexOf('DW')).toBe(result.lastIndexOf('DW') - 1)
  })

  // The winner's score is computed with the winning tile folded in
  // (deriveScoreHandParams appends it for a discard win), but that tile
  // physically sits in the discarder's river and is never in the rendered
  // hand. So the decomposition legitimately describes one more tile than
  // exists on screen.
  it('renders every tile it was given when the decomposition describes one that is not there', () => {
    const tiles = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), // C3 completed the chow but was claimed off a discard
      ...idsFor('D4', 3),
      ...idsFor('WE', 2),
    ]
    const shape: WinningShape = {
      decomposition: {
        pair: 'WE',
        sets: [
          { type: 'chow', tiles: ['C1', 'C2', 'C3'] },
          { type: 'pung', tiles: ['D4', 'D4', 'D4'] },
        ],
      },
      specialShape: null,
    }

    const result = revealOrder(tiles, shape)
    expect(result).toHaveLength(tiles.length)
    expect([...result].sort()).toEqual([...tiles].sort())
  })

  it('never drops or duplicates a tile, whatever the shape claims', () => {
    const tiles = [...idsFor('C1', 2), ...idsFor('B4', 1), ...idsFor('DR', 1)]
    const nonsense: WinningShape = {
      // A parse that has nothing to do with these tiles at all.
      decomposition: { pair: 'D2', sets: [{ type: 'pung', tiles: ['WS', 'WS', 'WS'] }] },
      specialShape: null,
    }
    const result = revealOrder(tiles, nonsense)
    expect([...result].sort()).toEqual([...tiles].sort())
  })

  it('is deterministic — the same tiles in a different draw order render identically', () => {
    const tiles = [...idsFor('C1', 2), ...idsFor('C2', 1), ...idsFor('B4', 1)]
    const shuffled = [tiles[3]!, tiles[1]!, tiles[2]!, tiles[0]!]
    expect(revealOrder(shuffled, null)).toEqual(revealOrder(tiles, null))
  })
})
