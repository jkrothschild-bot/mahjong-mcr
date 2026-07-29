import { describe, expect, it } from 'vitest'
import { ALL_TILE_TYPE_IDS } from '../board/tileNames.js'
import { botBackImageSrc, tileImageSrc } from './tileImages.js'

describe('tileImageSrc', () => {
  it('returns a real asset URL for all 34 standard tile types', () => {
    for (const typeId of ALL_TILE_TYPE_IDS) {
      expect(tileImageSrc(typeId)).toBeTruthy()
    }
  })

  it('maps suited tiles through the m/p/s (Characters/Dots/Bamboo) convention, not the engine\'s own C/D/B codes', () => {
    expect(tileImageSrc('C5')).toMatch(/m5/)
    expect(tileImageSrc('D5')).toMatch(/p5/)
    expect(tileImageSrc('B5')).toMatch(/s5/)
  })

  it('maps winds and dragons through their traditional asset letters', () => {
    expect(tileImageSrc('WE')).toMatch(/\/E[^/]*\.svg/)
    expect(tileImageSrc('WS')).toMatch(/\/S[^/]*\.svg/)
    expect(tileImageSrc('WW')).toMatch(/\/W[^/]*\.svg/)
    expect(tileImageSrc('WN')).toMatch(/\/N[^/]*\.svg/)
    expect(tileImageSrc('DR')).toMatch(/\/C[^/]*\.svg/) // Chun (red)
    expect(tileImageSrc('DG')).toMatch(/\/F[^/]*\.svg/) // Faat (green)
    expect(tileImageSrc('DW')).toMatch(/\/P[^/]*\.svg/) // Pak (white)
  })

  it('returns a real asset URL for flowers and seasons (original art)', () => {
    for (const typeId of ['F1', 'F2', 'F3', 'F4', 'S1', 'S2', 'S3', 'S4'] as const) {
      expect(tileImageSrc(typeId)).toMatch(new RegExp(`${typeId.startsWith('F') ? 'flower' : 'season'}${typeId[1]}`))
    }
  })

  it("doesn't resolve a season to the same asset as its same-numbered bamboo tile (case-insensitive filesystems collide 'S1.svg' with 's1.svg')", () => {
    expect(tileImageSrc('B1')).not.toEqual(tileImageSrc('S1'))
    expect(tileImageSrc('B1')).toMatch(/s1/)
    expect(tileImageSrc('S1')).toMatch(/season1/)
  })
})

describe('botBackImageSrc', () => {
  it('returns a real asset URL', () => {
    expect(botBackImageSrc()).toBeTruthy()
  })
})
