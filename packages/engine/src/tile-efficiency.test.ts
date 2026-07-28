import { describe, expect, it } from 'vitest'
import { emptyHand, type Hand } from './hand.js'
import { calculateShanten } from './shanten.js'
import { evaluateDiscards, usefulTiles } from './tile-efficiency.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from './tiles.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[]): Hand {
  return { ...emptyHand(), concealedTiles }
}

describe('usefulTiles', () => {
  it('finds C2 and C5 as the useful types for a standard-shape tenpai hand', () => {
    // tenpaiWaitingOnC5 shape, but framed as C3-C4 waiting either C2 or C5.
    const concealed = [
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    const result = usefulTiles(concealed, [])
    expect(result.tileTypes.sort()).toEqual(['C2', 'C5'])
    expect(result.totalCount).toBe(8) // 4 remaining copies of each
  })

  it('accounts for copies already in hand when counting remaining copies', () => {
    // Same shape, but already holding one of the two winning tiles (C5) —
    // 3 remain of C5, still 4 of C2.
    const concealed = [
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('C5', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    // Now this is a complete hand (14 tiles), so nothing should be "useful"
    // — it's already won, not waiting on anything.
    expect(concealed.length).toBe(14)
    const result = usefulTiles(concealed, [])
    expect(result.tileTypes).toEqual([])
  })
})

describe('evaluateDiscards', () => {
  it('correctly identifies the one obviously-correct discard from an otherwise-tenpai 14-tile hand', () => {
    const tenpai13 = [
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ]
    const [isolated] = idsFor('WN', 1) // North Wind — no adjacency to anything else here
    const hand = handWith([...tenpai13, isolated!])

    const evaluations = evaluateDiscards(hand)
    expect(evaluations).toHaveLength(14)

    const discardingIsolated = evaluations.find((e) => e.tile === isolated)!
    expect(discardingIsolated.resultingShanten).toBe(0)

    const bestShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
    expect(bestShanten).toBe(0)
    // Discarding the isolated tile is the unique way to stay at shanten 0.
    const atBest = evaluations.filter((e) => e.resultingShanten === bestShanten)
    expect(atBest.map((e) => e.tile)).toEqual([isolated])
  })

  it('gives every physical tile of the same type an identical evaluation', () => {
    const concealed = [
      ...idsFor('C9', 2), // the pair under test
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
    ]
    const hand = handWith(concealed)
    const evaluations = evaluateDiscards(hand)
    const c9Evaluations = evaluations.filter((e) => typeIdOfInstance(e.tile) === 'C9')
    expect(c9Evaluations).toHaveLength(2)
    expect(c9Evaluations[0]!.resultingShanten).toBe(c9Evaluations[1]!.resultingShanten)
    expect(c9Evaluations[0]!.ukeire).toEqual(c9Evaluations[1]!.ukeire)
  })

  it('cross-checks resultingShanten against an independent direct calculateShanten call for every candidate', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C4', 2),
      ...idsFor('C7', 2),
      ...idsFor('D1', 2),
      ...idsFor('D4', 2),
      ...idsFor('D7', 2),
      ...idsFor('B1', 1),
      ...idsFor('B4', 1),
    ]
    const hand = handWith(concealed)
    for (const evaluation of evaluateDiscards(hand)) {
      const remaining = concealed.filter((t) => t !== evaluation.tile)
      const direct = calculateShanten(remaining, []).shanten
      expect(evaluation.resultingShanten).toBe(direct)
    }
  })

  it('recognizes Seven Pairs is the better shape for a pairs-heavy 14-tile hand', () => {
    const concealed = [
      ...idsFor('C1', 2),
      ...idsFor('C4', 2),
      ...idsFor('C7', 2),
      ...idsFor('D1', 2),
      ...idsFor('D4', 2),
      ...idsFor('D7', 2),
      ...idsFor('B1', 1),
      ...idsFor('B4', 1),
    ]
    const hand = handWith(concealed)
    const evaluations = evaluateDiscards(hand)
    const bestShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
    // Discarding either lone single (B1 or B4) reaches Seven Pairs tenpai (shanten 0).
    expect(bestShanten).toBe(0)
    const [b1] = idsFor('B1', 1)
    const [b4] = idsFor('B4', 1)
    const bestTiles = evaluations.filter((e) => e.resultingShanten === bestShanten).map((e) => e.tile)
    expect(bestTiles.sort()).toEqual([b1, b4].sort())
  })
})
