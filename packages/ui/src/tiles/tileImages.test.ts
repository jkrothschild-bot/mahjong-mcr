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

  it('returns undefined for flowers/seasons — no art exists for these yet', () => {
    expect(tileImageSrc('F1')).toBeUndefined()
    expect(tileImageSrc('S1')).toBeUndefined()
  })
})

describe('botBackImageSrc', () => {
  it('returns a real asset URL', () => {
    expect(botBackImageSrc()).toBeTruthy()
  })
})
