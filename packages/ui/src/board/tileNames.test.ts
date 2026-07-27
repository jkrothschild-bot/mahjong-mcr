import { describe, expect, it } from 'vitest'
import { ALL_TILE_TYPE_IDS, tileDisplayName } from './tileNames.js'

describe('ALL_TILE_TYPE_IDS', () => {
  it('has exactly the 34 standard tile types, no duplicates, no flowers/seasons', () => {
    expect(ALL_TILE_TYPE_IDS).toHaveLength(34)
    expect(new Set(ALL_TILE_TYPE_IDS).size).toBe(34)
  })
})

describe('tileDisplayName', () => {
  it('names suited tiles with rank + suit', () => {
    expect(tileDisplayName('C1')).toBe('1 Characters')
    expect(tileDisplayName('D5')).toBe('5 Dots')
    expect(tileDisplayName('B9')).toBe('9 Bamboo')
  })

  it('names winds and dragons', () => {
    expect(tileDisplayName('WE')).toBe('East Wind')
    expect(tileDisplayName('WN')).toBe('North Wind')
    expect(tileDisplayName('DR')).toBe('Red Dragon')
    expect(tileDisplayName('DW')).toBe('White Dragon')
  })
})
