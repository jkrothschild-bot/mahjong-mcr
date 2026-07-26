import { describe, expect, it } from 'vitest'
import { isKong, meldTileTypeId, nextMeldId, type Meld } from './meld.js'

describe('nextMeldId', () => {
  it('numbers melds per-seat starting at 0', () => {
    expect(nextMeldId(0, [])).toBe('0-0')
    const existing: Meld[] = [{ id: '0-0', kind: 'pung', exposure: 'exposed', tiles: [1, 2, 3], ownerSeat: 0 }]
    expect(nextMeldId(0, existing)).toBe('0-1')
    expect(nextMeldId(1, existing)).toBe('1-0')
  })
})

describe('isKong', () => {
  it('is true only for kong melds', () => {
    const pung: Meld = { id: 'a', kind: 'pung', exposure: 'exposed', tiles: [1, 2, 3], ownerSeat: 0 }
    const kong: Meld = { id: 'b', kind: 'kong', exposure: 'exposed', tiles: [1, 2, 3, 4], ownerSeat: 0 }
    expect(isKong(pung)).toBe(false)
    expect(isKong(kong)).toBe(true)
  })
})

describe('meldTileTypeId', () => {
  it('returns the type id of the meld tiles (ids 0-3 are all C1)', () => {
    const meld: Meld = { id: 'a', kind: 'pung', exposure: 'exposed', tiles: [0, 1, 2], ownerSeat: 0 }
    expect(meldTileTypeId(meld)).toBe('C1')
  })

  it('throws for a meld with no tiles', () => {
    const meld: Meld = { id: 'a', kind: 'pung', exposure: 'exposed', tiles: [], ownerSeat: 0 }
    expect(() => meldTileTypeId(meld)).toThrow()
  })
})
