import { describe, expect, it } from 'vitest'
import { isDragonTypeId, isHonorTypeId, isTerminalTypeId, isWindTypeId, parseSuited } from './set-helpers.js'

describe('parseSuited', () => {
  it('parses suited tiles into suit + rank', () => {
    expect(parseSuited('C5')).toEqual({ suit: 'C', rank: 5 })
    expect(parseSuited('D1')).toEqual({ suit: 'D', rank: 1 })
    expect(parseSuited('B9')).toEqual({ suit: 'B', rank: 9 })
  })

  it('does NOT conflate Dragons with the Dots suit despite both starting with "D"', () => {
    // This is the exact bug this test guards against: a naive `id[0]`
    // check would treat "DR"/"DG"/"DW" (dragons) as the same "suit" as
    // "D1".."D9" (dots).
    expect(parseSuited('DR')).toBeNull()
    expect(parseSuited('DG')).toBeNull()
    expect(parseSuited('DW')).toBeNull()
  })

  it('returns null for winds and bonus tiles', () => {
    expect(parseSuited('WE')).toBeNull()
    expect(parseSuited('F1')).toBeNull()
    expect(parseSuited('S1')).toBeNull()
  })
})

describe('type predicates', () => {
  it('isWindTypeId / isDragonTypeId / isHonorTypeId agree and do not overlap with suits', () => {
    for (const id of ['WE', 'WS', 'WW', 'WN']) {
      expect(isWindTypeId(id)).toBe(true)
      expect(isHonorTypeId(id)).toBe(true)
      expect(isDragonTypeId(id)).toBe(false)
    }
    for (const id of ['DR', 'DG', 'DW']) {
      expect(isDragonTypeId(id)).toBe(true)
      expect(isHonorTypeId(id)).toBe(true)
      expect(isWindTypeId(id)).toBe(false)
    }
    // Dots suit tiles must never be mistaken for dragons despite the shared "D" prefix.
    for (const id of ['D1', 'D5', 'D9']) {
      expect(isDragonTypeId(id)).toBe(false)
      expect(isHonorTypeId(id)).toBe(false)
    }
  })

  it('isTerminalTypeId matches only 1s and 9s of each suit', () => {
    expect(isTerminalTypeId('C1')).toBe(true)
    expect(isTerminalTypeId('C9')).toBe(true)
    expect(isTerminalTypeId('C5')).toBe(false)
    expect(isTerminalTypeId('WE')).toBe(false)
  })
})
