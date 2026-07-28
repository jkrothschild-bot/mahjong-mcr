import { drawableRemaining, startHand } from '@mahjong-mcr/engine'
import { describe, expect, it } from 'vitest'
import { formatPositionText } from './formatPosition.js'

describe('formatPositionText', () => {
  const state = startHand({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })

  it('names the requesting seat as [you] and reveals its own hand', () => {
    const text = formatPositionText(state, 0)
    expect(text).toContain('Seat 0 (dealer) — east wind [you]')
    expect(text).toMatch(/Hand: .+/)
  })

  it('does not reveal other seats concealed tiles, only a count', () => {
    const text = formatPositionText(state, 0)
    const seat1Section = text.split('Seat 1')[1]!.split('Seat 2')[0]!
    expect(seat1Section).toContain('Concealed tiles: 13')
    expect(seat1Section).not.toContain('Hand:')
  })

  it('includes wall count, hand number, and prevailing wind', () => {
    const text = formatPositionText(state, 0)
    expect(text).toContain('hand 1')
    expect(text).toContain('East round')
    expect(text).toContain(`Wall: ${drawableRemaining(state.wall)} tiles left`)
  })

  it('is stable text (pure function of state)', () => {
    expect(formatPositionText(state, 0)).toBe(formatPositionText(state, 0))
  })
})
