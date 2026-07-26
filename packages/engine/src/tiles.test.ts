import { describe, expect, it } from 'vitest'
import {
  buildDeck,
  isFlowerOrSeason,
  TILE_TYPE_BY_ID,
  typeIdOf,
  typeIdOfInstance,
  typeOf,
} from './tiles.js'

describe('canonical tile table', () => {
  it('has exactly 144 tiles', () => {
    expect(TILE_TYPE_BY_ID.length).toBe(144)
  })

  it('has 4 copies of each of the 34 standard types and 1 copy of each of the 8 bonus types', () => {
    const counts = new Map<string, number>()
    for (const type of TILE_TYPE_BY_ID) {
      const id = typeIdOf(type)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    expect(counts.size).toBe(42) // 9*3 suits + 4 winds + 3 dragons + 4 flowers + 4 seasons

    const standardIds = [...counts.keys()].filter((id) => !id.startsWith('F') && !id.startsWith('S'))
    const bonusIds = [...counts.keys()].filter((id) => id.startsWith('F') || id.startsWith('S'))

    expect(standardIds.length).toBe(34)
    expect(bonusIds.length).toBe(8)
    for (const id of standardIds) expect(counts.get(id)).toBe(4)
    for (const id of bonusIds) expect(counts.get(id)).toBe(1)
  })

  it('typeOf/typeIdOfInstance agree with typeIdOf(typeOf(id))', () => {
    for (let id = 0; id < 144; id++) {
      expect(typeIdOfInstance(id)).toBe(typeIdOf(typeOf(id)))
    }
  })

  it('throws on an out-of-range instance id', () => {
    expect(() => typeOf(144)).toThrow()
    expect(() => typeOf(-1)).toThrow()
  })
})

describe('buildDeck', () => {
  it('returns ids 0..143 in order', () => {
    expect(buildDeck()).toEqual(Array.from({ length: 144 }, (_, i) => i))
  })
})

describe('isFlowerOrSeason', () => {
  it('is true only for the 8 bonus tiles (ids 136-143)', () => {
    for (let id = 0; id < 144; id++) {
      expect(isFlowerOrSeason(id)).toBe(id >= 136)
    }
  })
})
