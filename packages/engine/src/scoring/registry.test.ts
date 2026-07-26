import { describe, expect, it } from 'vitest'
import { FAN_REGISTRY } from './registry.js'

describe('FAN_REGISTRY', () => {
  it('has exactly 81 entries', () => {
    expect(Object.keys(FAN_REGISTRY).length).toBe(81)
  })

  it('every entry\'s id matches its key, and points is one of the twelve grades', () => {
    const validGrades = new Set([88, 64, 48, 32, 24, 16, 12, 8, 6, 4, 2, 1])
    for (const [key, meta] of Object.entries(FAN_REGISTRY)) {
      expect(meta.id).toBe(Number(key))
      expect(validGrades.has(meta.points)).toBe(true)
      expect(meta.name.length).toBeGreaterThan(0)
    }
  })

  it('reconciles to the book\'s own point-grade counts (§3.8.1)', () => {
    const counts: Record<number, number> = {}
    for (const meta of Object.values(FAN_REGISTRY)) {
      counts[meta.points] = (counts[meta.points] ?? 0) + 1
    }
    expect(counts).toEqual({
      88: 7, 64: 6, 48: 2, 32: 3, 24: 9, 16: 6, 12: 5, 8: 10, 6: 6, 4: 4, 2: 10, 1: 13,
    })
  })
})
