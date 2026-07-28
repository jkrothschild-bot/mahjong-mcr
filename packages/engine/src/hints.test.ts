import { describe, expect, it } from 'vitest'
import { chooseDiscard, rankDiscards } from './bots/policy.js'
import { computeBestMoveHint } from './hints.js'
import { emptyHand, type Hand } from './hand.js'
import { evaluateDiscards } from './tile-efficiency.js'
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

// Same "one obviously-correct discard" shape as tile-efficiency.test.ts:
// tenpai-13 (waiting on C2/C5) plus one isolated North Wind that doesn't
// interact with anything else.
function tenpaiPlusIsolated(): TileInstanceId[] {
  return [
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
    ...idsFor('WN', 1),
  ]
}

describe('computeBestMoveHint', () => {
  it('recommends the same discard bots/policy.ts\'s chooseDiscard would pick, for several different hands', () => {
    const hands: Hand[] = [
      handWith(tenpaiPlusIsolated()),
      handWith([...idsFor('C9', 2), ...idsFor('C3', 1), ...idsFor('C4', 1), ...idsFor('C5', 1), ...idsFor('B1', 1), ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('D2', 1), ...idsFor('D3', 1), ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WW', 1), ...idsFor('DR', 2)]),
    ]
    for (const hand of hands) {
      const hint = computeBestMoveHint(hand)
      expect(hint).not.toBeNull()
      expect(hint!.recommendedDiscard).toBe(chooseDiscard(hand))
    }
  })

  it('gives a one-line reason referencing the actual shanten/ukeire numbers', () => {
    const hint = computeBestMoveHint(handWith(tenpaiPlusIsolated()))!
    expect(hint.reason).toMatch(/tenpai/)
    // Waiting on C2 or C5, 4 unseen copies of each = 8 total remaining copies
    // (ukeire.totalCount counts copies, not distinct types).
    expect(hint.reason).toMatch(/8 tiles/)
  })

  it('alternatives is exactly rankDiscards(evaluateDiscards(hand)) minus the top pick, same order', () => {
    const hand = handWith(tenpaiPlusIsolated())
    const hint = computeBestMoveHint(hand)!
    const ranked = rankDiscards(evaluateDiscards(hand))
    expect(hint.recommendedDiscard).toBe(ranked[0]!.tile)
    expect(hint.alternatives).toEqual(ranked.slice(1))
    expect(hint.alternatives.some((a) => a.tile === hint.recommendedDiscard)).toBe(false)
  })

  it('returns null for an empty hand', () => {
    expect(computeBestMoveHint(handWith([]))).toBeNull()
  })
})
