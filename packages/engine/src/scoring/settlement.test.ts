import { describe, expect, it } from 'vitest'
import { computeSettlement } from './settlement.js'

describe('computeSettlement', () => {
  it('self-drawn win: each of the 3 others pays 8 + basicPoints, winner nets 3x that', () => {
    const result = computeSettlement({ winnerSeat: 0, basicPoints: 8, flowerPoints: 0, winMethod: 'selfDraw' })
    expect(result.payments[1]).toBe(-16)
    expect(result.payments[2]).toBe(-16)
    expect(result.payments[3]).toBe(-16)
    expect(result.payments[0]).toBe(48) // 3 * 16
  })

  it('discard win: discarder pays 8 + basicPoints, the other two pay 8 only', () => {
    const result = computeSettlement({
      winnerSeat: 0,
      basicPoints: 8,
      flowerPoints: 0,
      winMethod: 'discard',
      discarderSeat: 2,
    })
    expect(result.payments[2]).toBe(-16) // discarder: 8 + 8
    expect(result.payments[1]).toBe(-8) // extra points only
    expect(result.payments[3]).toBe(-8)
    expect(result.payments[0]).toBe(32) // 16 + 8 + 8
  })

  it('robbing the kong is settled the same way as a discard win', () => {
    const result = computeSettlement({
      winnerSeat: 1,
      basicPoints: 8,
      flowerPoints: 0,
      winMethod: 'robKong',
      discarderSeat: 3,
    })
    expect(result.payments[3]).toBe(-16)
    expect(result.payments[0]).toBe(-8)
    expect(result.payments[2]).toBe(-8)
    expect(result.payments[1]).toBe(32)
  })

  it('flower points fold into the payment total but are tracked separately', () => {
    const result = computeSettlement({
      winnerSeat: 0,
      basicPoints: 8,
      flowerPoints: 2,
      winMethod: 'selfDraw',
    })
    expect(result.basicPoints).toBe(8) // unchanged, for the caller's own 8-point-minimum check
    expect(result.flowerPoints).toBe(2)
    expect(result.payments[1]).toBe(-18) // 8 + (8 + 2)
    expect(result.payments[0]).toBe(54) // 3 * 18
  })

  it('throws if discarderSeat is missing for a discard win', () => {
    expect(() => computeSettlement({ winnerSeat: 0, basicPoints: 8, flowerPoints: 0, winMethod: 'discard' })).toThrow()
  })

  it('throws if discarderSeat equals the winner', () => {
    expect(() =>
      computeSettlement({ winnerSeat: 0, basicPoints: 8, flowerPoints: 0, winMethod: 'discard', discarderSeat: 0 }),
    ).toThrow()
  })

  it('every settlement nets to zero across all seats', () => {
    const selfDraw = computeSettlement({ winnerSeat: 2, basicPoints: 24, flowerPoints: 3, winMethod: 'selfDraw' })
    const discard = computeSettlement({ winnerSeat: 2, basicPoints: 24, flowerPoints: 3, winMethod: 'discard', discarderSeat: 0 })
    for (const result of [selfDraw, discard]) {
      const total = Object.values(result.payments).reduce((a, b) => a + b, 0)
      expect(total).toBe(0)
    }
  })
})
