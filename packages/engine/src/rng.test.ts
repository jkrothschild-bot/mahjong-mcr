import { describe, expect, it } from 'vitest'
import { mulberry32, nextSeed, shuffle } from './rng.js'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('always returns values in [0, 1)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  it('is deterministic for a given seed', () => {
    const items = Array.from({ length: 144 }, (_, i) => i)
    const a = shuffle(items, mulberry32(7))
    const b = shuffle(items, mulberry32(7))
    expect(a).toEqual(b)
  })

  it('does not mutate the input array', () => {
    const items = [1, 2, 3, 4, 5]
    const copy = items.slice()
    shuffle(items, mulberry32(1))
    expect(items).toEqual(copy)
  })

  it('is a permutation (same multiset of elements)', () => {
    const items = Array.from({ length: 144 }, (_, i) => i)
    const shuffled = shuffle(items, mulberry32(99))
    expect(shuffled.slice().sort((x, y) => x - y)).toEqual(items)
  })
})

describe('nextSeed', () => {
  it('is deterministic and produces a stream of 32-bit integers', () => {
    const rngA = mulberry32(555)
    const rngB = mulberry32(555)
    const seedsA = Array.from({ length: 16 }, () => nextSeed(rngA))
    const seedsB = Array.from({ length: 16 }, () => nextSeed(rngB))
    expect(seedsA).toEqual(seedsB)
    for (const s of seedsA) {
      expect(Number.isInteger(s)).toBe(true)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThan(4294967296)
    }
  })
})
