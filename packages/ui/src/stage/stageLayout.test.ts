import { describe, expect, it } from 'vitest'
import type { TileScale } from '../settings/useSettings.js'
import { TILE_BOX_PX, TILE_FACE_COMPACT_PX } from '../tiles/tileStyles.js'
import { computeGridPositions, computeRowPositions, fitScale, getSeatRegions, placeGroup, type SeatOffset } from './stageLayout.js'

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

// Regression guard for the actual bug reported post-ship: at `xlarge`,
// the human hand rendered *smaller* than `normal` (a static, scale-
// independent region forced a 2-row `large`/`xlarge` hand to shrink below
// `normal`'s un-shrunk single row), and bot melds/discards were shrunk to
// ~0.2-0.3x regardless of `tileScale` (a human meld rendered at ~30px, a
// bot's top-seat meld/discard at ~20px — illegible). `getSeatRegions` is
// the fix — this asserts the actual *rendered* tile size (computed the
// same way HandTiles/Melds/Discards do: computeRowPositions against the
// real region, then tileHeight * layout.scale), not just the region
// rectangles themselves, since a bigger region alone doesn't guarantee a
// bigger render if the natural block also grew (that's exactly how the
// original bug slipped through a purely visual review).
//
// Hand gets the strict guarantee (normal < large < xlarge) — it's the
// literal reported bug. Melds/discards get a looser, honest one: strictly
// bigger than the pre-fix worst case (union the old 20-30px range) and
// never *decreasing* as tileScale goes up — not "hits exact natural size
// at every tier," because the fixed 768px stage genuinely can't fit a
// properly-grown hand *and* fully natural-sized melds/discards/backs for
// all 4 seats simultaneously at `xlarge` (see getSeatRegions' own comment
// on this trade-off) — `large` and `xlarge` end up at the same rendered
// compact-tile size, both comfortably above the pre-fix range.
describe('getSeatRegions: rendered tile size grows (or holds, never shrinks) with tileScale', () => {
  const SCALES: TileScale[] = ['normal', 'large', 'xlarge']
  const GAP = 4
  const HAND_TILE_COUNT = 14
  // Comfortably above the worst pre-fix rendered size (a human meld at
  // ~30px, a bot top-seat meld/discard at ~20px).
  const PRE_FIX_WORST_CASE_PX = 32

  function renderedHeight(tileWidth: number, tileHeight: number, region: { width: number; height: number }, count: number): number {
    const layout = computeRowPositions(count, region, tileWidth, tileHeight, GAP)
    return tileHeight * layout.scale
  }

  function expectStrictlyIncreasing(values: readonly number[]) {
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!)
    }
  }

  function expectNonDecreasing(values: readonly number[]) {
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!)
    }
  }

  it("the human hand's rendered tile height increases at every tier — this is the literal bug: xlarge used to render smaller than normal", () => {
    const heights = SCALES.map((scale) => {
      const { width, height } = TILE_BOX_PX[scale]
      const region = getSeatRegions(scale)[0].hand!
      return renderedHeight(width, height, region, HAND_TILE_COUNT)
    })
    expectStrictlyIncreasing(heights)
  })

  it("a bot's discards render well above the pre-fix worst case and never shrink as tileScale increases, for a full first row (Discards.tsx's real hard-coded 6-column grid)", () => {
    const DISCARD_COLUMNS = 6 // matches Discards.tsx's own hard-coded rule
    for (const offset of [0, 1, 2, 3] satisfies SeatOffset[]) {
      const heights = SCALES.map((scale) => {
        const { width, height } = TILE_FACE_COMPACT_PX[scale]
        const region = getSeatRegions(scale)[offset].discards
        const layout = computeGridPositions(DISCARD_COLUMNS, DISCARD_COLUMNS, region, width, height, GAP)
        return height * layout.scale
      })
      expectNonDecreasing(heights)
      heights.forEach((h) => expect(h).toBeGreaterThan(PRE_FIX_WORST_CASE_PX))
    }
  })

  it('melds render well above the pre-fix worst case and never shrink as tileScale increases, for a realistic exposed-meld count, at every seat', () => {
    const REALISTIC_MELD_TILE_COUNT = 4 // one exposed kong, or two exposed pairs
    for (const offset of [0, 1, 2, 3] satisfies SeatOffset[]) {
      const heights = SCALES.map((scale) => {
        const { width, height } = TILE_FACE_COMPACT_PX[scale]
        const region = getSeatRegions(scale)[offset].melds
        return renderedHeight(width, height, region, REALISTIC_MELD_TILE_COUNT)
      })
      expectNonDecreasing(heights)
      heights.forEach((h) => expect(h).toBeGreaterThan(PRE_FIX_WORST_CASE_PX))
    }
  })
})
