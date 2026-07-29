import { describe, expect, it } from 'vitest'
import { computeGridPositions, computeRowPositions, fitScale, placeGroup } from './stageLayout.js'

describe('fitScale', () => {
  it('returns 1 when the natural size already fits', () => {
    expect(fitScale(100, 50, 200, 200)) .toBe(1)
  })

  it('shrinks proportionally to the tighter dimension', () => {
    expect(fitScale(200, 100, 100, 100)).toBe(0.5)
  })

  it('never upscales past 1', () => {
    expect(fitScale(10, 10, 1000, 1000)).toBe(1)
  })
})

describe('computeRowPositions', () => {
  it('returns nothing for zero tiles', () => {
    expect(computeRowPositions(0, { width: 100, height: 100 }, 10, 10, 2)).toEqual({
      positions: [],
      scale: 1,
      naturalWidth: 0,
      naturalHeight: 0,
    })
  })

  it('lays tiles in a single row when they all fit', () => {
    const layout = computeRowPositions(3, { width: 100, height: 50 }, 10, 10, 2)
    expect(layout.positions).toEqual([
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 24, y: 0 },
    ])
    expect(layout.scale).toBe(1)
  })

  it('wraps to a new row once the region width is used up', () => {
    // region width 25 fits 2 tiles of width 10 + gap 2 (22 <= 25), not a 3rd (34 > 25)
    const layout = computeRowPositions(3, { width: 25, height: 100 }, 10, 10, 2)
    expect(layout.positions).toEqual([
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 0, y: 12 },
    ])
  })

  it('forces a wrap after a groupBreakAfter index even if more would fit the row', () => {
    const layout = computeRowPositions(4, { width: 100, height: 100 }, 10, 10, 2, new Set([1]))
    expect(layout.positions).toEqual([
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 0, y: 12 },
      { x: 12, y: 12 },
    ])
  })

  it('scales the whole block down as one unit when it overflows the region height', () => {
    // 5 tiles, 1 column wide (forced by a narrow region), height 5*10+4*2=58 > region height 29
    const layout = computeRowPositions(5, { width: 10, height: 29 }, 10, 10, 2)
    expect(layout.scale).toBeCloseTo(29 / 58)
  })
})

describe('computeGridPositions', () => {
  it('always uses exactly `columns` columns regardless of how many would fit at natural size', () => {
    // region is wide enough for far more than 6 columns, but discards' hard
    // rule is exactly 6 regardless of available width.
    const layout = computeGridPositions(7, 6, { width: 2000, height: 2000 }, 10, 10, 2)
    expect(layout.positions[6]).toEqual({ x: 0, y: 12 }) // 7th tile wraps to row 2, col 0
    expect(layout.naturalWidth).toBe(6 * 10 + 5 * 2) // exactly 6 columns wide, never more
  })

  it('scales down as one unit (never fewer columns) when the fixed grid overflows its region', () => {
    const layout = computeGridPositions(12, 6, { width: 62, height: 10 }, 10, 10, 2)
    // 12 tiles / 6 columns = 2 rows; natural height = 2*10+1*2 = 22 > region height 10
    expect(layout.scale).toBeCloseTo(10 / 22)
    expect(layout.positions).toHaveLength(12)
  })
})

describe('placeGroup', () => {
  it('centers an unscaled group within its region', () => {
    const layout = computeRowPositions(2, { width: 100, height: 100 }, 10, 10, 0)
    // naturalWidth = 20, region width 100 -> centered offset x = 40
    const placed = placeGroup(layout, { x: 0, y: 0, width: 100, height: 100 }, 10, 10)
    expect(placed).toEqual([
      { x: 45, y: 50 },
      { x: 55, y: 50 },
    ])
  })

  it('offsets by the region origin, not just its size', () => {
    const layout = computeRowPositions(1, { width: 10, height: 10 }, 10, 10, 0)
    const placed = placeGroup(layout, { x: 200, y: 300, width: 10, height: 10 }, 10, 10)
    expect(placed).toEqual([{ x: 205, y: 305 }])
  })
})
