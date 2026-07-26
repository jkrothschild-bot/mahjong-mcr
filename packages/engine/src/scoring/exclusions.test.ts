import { describe, expect, it } from 'vitest'
import { areExclusive, EXCLUDES } from './exclusions.js'

describe('EXCLUDES / areExclusive', () => {
  it('is symmetric: both directions of a known pair are registered', () => {
    expect(areExclusive(1, 38)).toBe(true) // Big Four Winds <-> Big Three Winds
    expect(areExclusive(38, 1)).toBe(true)
  })

  it('returns false for fans with no stated exclusion', () => {
    expect(areExclusive(1, 2)).toBe(false) // Big Four Winds / Big Three Dragons — no note either way
  })

  it('the three wait-types are mutually exclusive with each other', () => {
    expect(areExclusive(77, 78)).toBe(true)
    expect(areExclusive(77, 79)).toBe(true)
    expect(areExclusive(78, 79)).toBe(true)
  })

  it('every registered fan id in the table is within 1-81', () => {
    for (const [a, set] of EXCLUDES.entries()) {
      expect(a).toBeGreaterThanOrEqual(1)
      expect(a).toBeLessThanOrEqual(81)
      for (const b of set) {
        expect(b).toBeGreaterThanOrEqual(1)
        expect(b).toBeLessThanOrEqual(81)
      }
    }
  })
})
