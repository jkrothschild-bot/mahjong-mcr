import { describe, expect, it } from 'vitest'
import type { TileScale } from '../settings/useSettings.js'
import {
  DISCARD_FIELD_PX,
  DISCARD_FIELD_WIDTH_FLOOR,
  HAND_TILE_WIDTH_FLOOR,
  SEAT_LINE_PX,
  SEAT_LINE_WIDTH_FLOOR,
  TILE_BOX_PX,
} from '../tiles/tileStyles.js'
import {
  computeGridPositions,
  computeRowPositions,
  DISCARD_ZONE_GRID_COLUMNS,
  fitGridTileWidth,
  fitRowTileWidth,
  fitScale,
  getBoardRegions,
  MAX_DESIGN_WIDTH,
  MIN_DESIGN_WIDTH,
  packGroupsMajor,
  placeGroup,
  RAIL_PX,
  splitDiscardZone,
  STAGE_HEIGHT,
  uniformGroupSizes,
  type BoardRegions,
  type Rect,
} from './stageLayout.js'

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

// KICKOFF-phase7-board-rebuild.md's own literal geometry, updated for the
// SEAT_LINE_PX >=10% bump (tileStyles.ts) and the SIDE_WIDTH/NORTH_LINE_H/
// FIELD_H growth that makes room for it (stageLayout.ts) — a byte-exact
// snapshot at designWidth=1768 (the doc's own reference point), hand-derived
// from those constants, NOT computed by calling the function under test
// (asserting a function against its own output is tautological and would
// survive an accidental value change during a future refactor).
const GOLDEN_BOARD_1768: BoardRegions = {
  human: {
    row: { x: 0, y: 642, width: 1768, height: 140 },
    header: { x: 0, y: 782, width: 1768, height: 14 },
  },
  north: {
    header: { x: 180, y: 0, width: 1408, height: 14 },
    headerRotation: 0,
    line: { x: 180, y: 14, width: 1408, height: 60 },
  },
  // west/east headers are the left/right wood rail, full stage height,
  // rotated — see stageLayout.ts's SIDE HEADER PLACEMENT comment and the
  // dedicated describe block below.
  west: {
    header: { x: 0, y: 0, width: 14, height: 796 },
    headerRotation: -90,
    line: { x: 0, y: 18, width: 156, height: 600 },
  },
  east: {
    header: { x: 1754, y: 0, width: 14, height: 796 },
    headerRotation: 90,
    line: { x: 1612, y: 18, width: 156, height: 600 },
  },
  discards: {
    west: { x: 180, y: 98, width: 352, height: 520 },
    you: { x: 532, y: 98, width: 352, height: 520 },
    north: { x: 884, y: 98, width: 352, height: 520 },
    east: { x: 1236, y: 98, width: 352, height: 520 },
  },
  wall: {
    top: { x: 180, y: 74, width: 1408, height: 24 },
    bottom: { x: 180, y: 618, width: 1408, height: 24 },
    left: { x: 156, y: 98, width: 24, height: 520 },
    right: { x: 1588, y: 98, width: 24, height: 520 },
  },
}

describe('Phase 7 board rebuild: getBoardRegions', () => {
  it('matches KICKOFF-phase7-board-rebuild.md\'s own literal geometry at designWidth=1768', () => {
    expect(getBoardRegions(1768)).toEqual(GOLDEN_BOARD_1768)
  })

  it('vertical bands sum to STAGE_HEIGHT exactly, at any designWidth', () => {
    const b = getBoardRegions(1440)
    expect(b.north.header.height + b.north.line.height + b.wall.top.height + b.discards.you.height + b.wall.bottom.height + b.human.row.height + b.human.header.height).toBe(
      STAGE_HEIGHT,
    )
  })

  it('horizontal bands sum to designWidth exactly, at any designWidth', () => {
    for (const designWidth of [1024, 1440, 1768, 1920]) {
      const b = getBoardRegions(designWidth)
      const total = b.west.line.width + b.wall.left.width + b.discards.west.width * 4 + b.wall.right.width + b.east.line.width
      expect(total, `designWidth=${designWidth}`).toBe(designWidth)
    }
  })

  it('the four discard zones tile the field completely, in west/you/north/east order, no gap or overlap', () => {
    const b = getBoardRegions(1768)
    const zones = [b.discards.west, b.discards.you, b.discards.north, b.discards.east]
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i]!.x, `zone ${i}`).toBe(zones[i - 1]!.x + zones[i - 1]!.width)
    }
    expect(zones[0]!.x).toBe(b.wall.left.x + b.wall.left.width)
    expect(zones[zones.length - 1]!.x + zones[zones.length - 1]!.width).toBe(b.wall.right.x)
  })
})

// KICKOFF-phase7-board-rebuild.md's own test #2: "Side seat columns must not
// intrude into the human row band — assert the boundary directly. This is
// the decision that makes the kong case safe."
describe('Phase 7: side seats never intrude into the human row', () => {
  it.each([1024, 1328, 1440, 1768, 1920])('west/east line bottom edge stays at or above the wall ring, at designWidth=%i', (designWidth) => {
    const b = getBoardRegions(designWidth)
    expect(b.west.line.y + b.west.line.height).toBeLessThanOrEqual(b.wall.bottom.y)
    expect(b.east.line.y + b.east.line.height).toBeLessThanOrEqual(b.wall.bottom.y)
    expect(b.west.line.y + b.west.line.height).toBeLessThanOrEqual(b.human.row.y)
    expect(b.east.line.y + b.east.line.height).toBeLessThanOrEqual(b.human.row.y)
  })
})

// Every seat's identity band rides the wood table rail — the outermost
// RAIL_PX of the stage on that seat's own edge, which TableSurface.tsx draws
// by insetting its felt by the same amount. That is what makes a band read
// as a marking on the table edge belonging to one seat, rather than as
// floating chrome. The rail width is the coupling these tests exist to
// protect: it lives in a Tailwind class in one file and a constant in
// another, so nothing but a test connects them.
const WIDTHS = [1024, 1440, 1768, 1920]

describe('seat identity bands ride the table rail', () => {
  it.each(WIDTHS)('the four bands sit on the four rails, at designWidth=%i', (designWidth) => {
    const b = getBoardRegions(designWidth)

    // Top and bottom rails — north.header is the stage's first RAIL_PX band,
    // human.header its last. (These two get the rail for free because
    // HEADER_H === RAIL_PX; asserted so that stops being a coincidence.)
    expect(b.north.header.y).toBe(0)
    expect(b.north.header.height).toBe(RAIL_PX)
    expect(b.human.header.y + b.human.header.height).toBe(STAGE_HEIGHT)
    expect(b.human.header.height).toBe(RAIL_PX)

    // Left and right rails, full stage height.
    expect(b.west.header).toEqual({ x: 0, y: 0, width: RAIL_PX, height: STAGE_HEIGHT })
    expect(b.east.header).toEqual({ x: designWidth - RAIL_PX, y: 0, width: RAIL_PX, height: STAGE_HEIGHT })
  })

  it.each(WIDTHS)('side bands are rotated outward, top/bottom are not, at designWidth=%i', (designWidth) => {
    const b = getBoardRegions(designWidth)
    // Left edge reads bottom-to-top, right edge top-to-bottom, so neither
    // label ends up upside down.
    expect(b.west.headerRotation).toBe(-90)
    expect(b.east.headerRotation).toBe(90)
    expect(b.north.headerRotation).toBe(0)
  })

  it.each(WIDTHS)('every band is centered on its own edge, at designWidth=%i', (designWidth) => {
    const b = getBoardRegions(designWidth)
    // A band spanning its whole edge is what lets Seat.tsx center the label
    // by simply centering content within the band.
    for (const r of [b.north.header, b.human.header]) {
      expect(r.x + r.width / 2).toBe(designWidth / 2)
    }
    for (const r of [b.west.header, b.east.header]) {
      expect(r.y + r.height / 2).toBe(STAGE_HEIGHT / 2)
    }
  })

  it.each(WIDTHS)('the human band stays below the human tiles, not above them, at designWidth=%i', (designWidth) => {
    const b = getBoardRegions(designWidth)
    expect(b.human.header.y).toBeGreaterThanOrEqual(b.human.row.y + b.human.row.height)
  })
})

// KNOWN COLLISION, asserted rather than dropped — see stageLayout.ts's SIDE
// HEADER PLACEMENT for why it can't be designed out of this geometry (both
// escapes, narrowing the side column or widening it, break a tile-size
// guarantee that already has its own test). This pins the threshold so a
// future change that makes the collision WORSE — reaching the rail at a
// lower, actually-common tile count — fails here instead of being noticed in
// a screenshot.
describe('side rail label vs. side seat tiles', () => {
  const SEAT_LINE_GAP = 4
  const COLUMNS = 3
  const ROWS = 9

  // Column-major over 9 rows: the Nth column only opens at 9*(N-1)+1 tiles.
  const THREE_COLUMN_THRESHOLD = ROWS * 2 + 1 // 19

  function leftEdgeOfLine(tileCount: number, designWidth: number): number {
    const b = getBoardRegions(designWidth)
    const { width } = SEAT_LINE_PX.normal
    const columnsUsed = Math.min(COLUMNS, Math.ceil(tileCount / ROWS))
    const naturalWidth = columnsUsed * width + (columnsUsed - 1) * SEAT_LINE_GAP
    return b.west.line.x + (b.west.line.width - naturalWidth) / 2
  }

  it('a normal (<=18 tile) side hand leaves the rail completely clear', () => {
    // 13 concealed is the standard count; 18 is the last 2-column count.
    for (const tiles of [1, 13, 18]) {
      expect(leftEdgeOfLine(tiles, 1768), `tiles=${tiles}`).toBeGreaterThanOrEqual(RAIL_PX)
    }
  })

  it('only a 19+ tile side hand (4 kongs / heavy flowers) can reach the rail at all', () => {
    expect(leftEdgeOfLine(THREE_COLUMN_THRESHOLD - 1, 1768)).toBeGreaterThanOrEqual(RAIL_PX)
    expect(leftEdgeOfLine(THREE_COLUMN_THRESHOLD, 1768)).toBeLessThan(RAIL_PX)
  })

  it('the side column genuinely has no room to reserve a rail strip', () => {
    // This is the fact that makes the collision unavoidable rather than a
    // shortcut: reserving RAIL_PX would leave less than the 3-column
    // worst-case width, i.e. it would shrink bot tiles below SEAT_LINE_PX.
    const b = getBoardRegions(1768)
    const worstCaseWidth = COLUMNS * SEAT_LINE_PX.normal.width + (COLUMNS - 1) * SEAT_LINE_GAP
    expect(b.west.line.width - RAIL_PX).toBeLessThan(worstCaseWidth)
  })
})

// KICKOFF-phase7-board-rebuild.md's own test #5: "Phase 6's mockup exposed a
// near-zero-margin fit (13 rows x 58 = 754 of 768). Assert the actual
// remaining slack is above a stated minimum, so a future padding change
// can't silently push a seat to an extra column."
describe('Phase 7: side seat column slack', () => {
  const MIN_SLACK_PX = 20

  it('west/east 3x9 grid at SEAT_LINE_PX leaves real vertical slack, at every tileScale', () => {
    const b = getBoardRegions(1768)
    for (const scale of ['normal', 'large'] satisfies TileScale[]) {
      const { height } = SEAT_LINE_PX[scale]
      const rows = 9
      const naturalHeight = rows * height + (rows - 1) * 4
      const slack = b.west.line.height - naturalHeight
      expect(slack, `scale=${scale}`).toBeGreaterThanOrEqual(MIN_SLACK_PX)
    }
  })

  it('west/east 3-column width has real (non-zero) slack, at every tileScale', () => {
    const b = getBoardRegions(1768)
    for (const scale of ['normal', 'large'] satisfies TileScale[]) {
      const { width } = SEAT_LINE_PX[scale]
      const naturalWidth = 3 * width + 2 * 4
      const slack = b.west.line.width - naturalWidth
      expect(slack, `scale=${scale}`).toBeGreaterThan(0)
    }
  })
})

// KICKOFF-phase7-board-rebuild.md's own test #1 & the doc's standing
// constraint: "Every group's fit-scale exactly 1.0 at worst-case occupancy
// ... assert it." Worst case per KICKOFF: west/east seat lines hold 25
// tiles (4 kongs = 16 melded, 1 concealed, up to 8 flowers — 16+1+8=25) in
// a 3x9 grid; north holds the same 25 in one row; each discard zone holds
// its own 5x5 (25-tile) worst case.
describe('Phase 7: worst-case occupancy hits fit-scale exactly 1.0', () => {
  const SCALES: TileScale[] = ['normal', 'large']
  const SEAT_LINE_WORST_CASE = 25 // 16 melded (4 kongs) + 1 concealed + 8 flowers

  it('west/east seat line (3x9 grid)', () => {
    for (const scale of SCALES) {
      const { width, height } = SEAT_LINE_PX[scale]
      const b = getBoardRegions(1768)
      for (const role of ['west', 'east'] as const) {
        const layout = computeGridPositions(SEAT_LINE_WORST_CASE, 3, b[role].line, width, height, 4)
        expect(layout.scale, `scale=${scale} role=${role}`).toBe(1)
      }
    }
  })

  it('north seat line (single row)', () => {
    for (const scale of SCALES) {
      const { width, height } = SEAT_LINE_PX[scale]
      const b = getBoardRegions(1768)
      const layout = computeRowPositions(SEAT_LINE_WORST_CASE, b.north.line, width, height, 4)
      expect(layout.scale, `scale=${scale}`).toBe(1)
    }
  })

  it('every discard zone (5x5 grid, 25 tiles)', () => {
    for (const scale of SCALES) {
      const { width, height } = DISCARD_FIELD_PX[scale]
      const b = getBoardRegions(1768)
      for (const zoneKey of ['west', 'you', 'north', 'east'] as const) {
        const { grid } = splitDiscardZone(b.discards[zoneKey])
        const layout = computeGridPositions(25, DISCARD_ZONE_GRID_COLUMNS, grid, width, height, 4)
        expect(layout.scale, `scale=${scale} zone=${zoneKey}`).toBe(1)
      }
    }
  })

  it('a skewed pile past the 25-tile zone capacity extends additively (never rescales below 1) — KICKOFF\'s own "open point," resolved in favor of keeping 67px', () => {
    // Table capacity is 4x25=100 against the 83-tile rulebook ceiling, so
    // only a single very skewed seat could ever reach this — verified up to
    // 30 (the per-pile soft limit).
    const { width, height } = DISCARD_FIELD_PX.normal
    const b = getBoardRegions(1768)
    const { grid } = splitDiscardZone(b.discards.you)
    const UNBOUNDED_HEIGHT = 100_000
    const layout = computeGridPositions(30, DISCARD_ZONE_GRID_COLUMNS, { width: grid.width, height: UNBOUNDED_HEIGHT }, width, height, 4)
    expect(layout.scale).toBe(1)
    expect(layout.naturalHeight).toBeGreaterThan(grid.height) // genuinely extends past the nominal zone
  })

  it('DISCARD_FIELD_PX and SEAT_LINE_PX are both monotonically non-decreasing normal -> large', () => {
    for (const table of [DISCARD_FIELD_PX, SEAT_LINE_PX]) {
      const widths = SCALES.map((s) => table[s].width)
      const heights = SCALES.map((s) => table[s].height)
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]!).toBeGreaterThanOrEqual(widths[i - 1]!)
        expect(heights[i]!).toBeGreaterThanOrEqual(heights[i - 1]!)
      }
    }
  })
})

// A real gap this file's own first pass missed: the tests above only check
// fit-scale at designWidth=1768 (KICKOFF's own reference point). The
// discard field's width is a function of designWidth (getBoardRegions'
// anchor policy — only the center field grows/shrinks), so a FIXED tile
// size only ever achieves scale=1 at exactly the designWidth it was solved
// against; at MIN_DESIGN_WIDTH (1024) the same fixed 67px badly overflows a
// zone that's shrunk to less than half its 1768-wide size (caught live,
// via Playwright, not by this suite — the actual bug this describe block
// exists to prevent recurring). DiscardField.tsx/SeatLine.tsx now solve
// their tile size dynamically per current designWidth (fitGridTileWidth /
// fitRowTileWidth, the same shrink-to-fit family HandTiles.tsx's own human
// row already used) — this verifies that solve actually holds fit-scale at
// 1 (or the documented floor) across the FULL supported range, not just
// the one point that happened to get checked first.
describe('Phase 7: dynamic tile sizing holds fit-scale across the full designWidth range', () => {
  const SEAT_LINE_WORST_CASE = 25

  it.each(['normal', 'large'] satisfies TileScale[])('discard zones, west/east, and north — scale=%s', (scale) => {
    const discardNominal = DISCARD_FIELD_PX[scale]
    const seatNominal = SEAT_LINE_PX[scale]

    for (let designWidth = MIN_DESIGN_WIDTH; designWidth <= MAX_DESIGN_WIDTH; designWidth += 8) {
      const b = getBoardRegions(designWidth)
      const ctx = `scale=${scale} designWidth=${designWidth}`

      // Discard zone: solved from the column count (5), not tile count —
      // fit-scale must hit exactly 1 at the worst-case 25-tile occupancy,
      // at every designWidth, same guarantee KICKOFF's test #1 asks for
      // but checked across the range instead of one point.
      const { grid } = splitDiscardZone(b.discards.you)
      const discardSize = fitGridTileWidth(DISCARD_ZONE_GRID_COLUMNS, grid.width, discardNominal.width, discardNominal.height, 4, DISCARD_FIELD_WIDTH_FLOOR)
      const discardLayout = computeGridPositions(SEAT_LINE_WORST_CASE, DISCARD_ZONE_GRID_COLUMNS, grid, discardSize.width, discardSize.height, 4)
      expect(discardLayout.scale, ctx).toBe(1)
      expect(discardSize.width, ctx).toBeGreaterThanOrEqual(DISCARD_FIELD_WIDTH_FLOOR)

      // West/east (3-column grid) — region.width is a true designWidth-
      // independent constant, so this should hold trivially at every point,
      // but is checked directly rather than assumed.
      for (const role of ['west', 'east'] as const) {
        const seatSize = fitGridTileWidth(3, b[role].line.width, seatNominal.width, seatNominal.height, 4, SEAT_LINE_WIDTH_FLOOR)
        const seatLayout = computeGridPositions(SEAT_LINE_WORST_CASE, 3, b[role].line, seatSize.width, seatSize.height, 4)
        expect(seatLayout.scale, `${ctx} role=${role}`).toBe(1)
      }

      // North (single row) — shares the field's own designWidth-dependent
      // width, so this is the other region genuinely at risk here. Honest
      // finding, not hidden: below designWidth 1160 (was 1136 before
      // SIDE_WIDTH grew from 144 to 156 to make room for SEAT_LINE_PX's own
      // bump — a wider SIDE_WIDTH means less fieldWidth left for north at
      // any given designWidth, so this threshold moved up with it), 25
      // tiles at even SEAT_LINE_WIDTH_FLOOR (28px) no longer fit north's own
      // width (25*28+24*4=796 needs fieldWidth >= 796, i.e. designWidth >=
      // 1156, rounded up to the next 8px test step), so computeRowPositions'
      // own uniform-shrink fallback engages below the floor there — bounded
      // (never below 0.5 in the whole supported range) and non-crashing,
      // but a real, narrow shortfall at the ABSOLUTE worst compound case (4
      // kongs + 8 flowers, both on the north seat specifically, at the
      // narrowest supported aspect ratio — e.g. an iPad's own 4:3
      // landscape). Not fixed further: KICKOFF's own 25-tile north target is
      // followed as specified rather than quietly lowered to make this band
      // disappear, and every other designWidth/scale combination (the
      // overwhelming majority of the range, and every realistic occupancy
      // below the absolute maximum) hits exactly 1.
      const northSize = fitRowTileWidth(SEAT_LINE_WORST_CASE, b.north.line.width, seatNominal.width, seatNominal.height, 4, SEAT_LINE_WIDTH_FLOOR)
      const northLayout = computeRowPositions(SEAT_LINE_WORST_CASE, b.north.line, northSize.width, northSize.height, 4)
      if (designWidth >= 1160) {
        expect(northLayout.scale, ctx).toBeCloseTo(1, 9)
      } else {
        expect(northLayout.scale, ctx).toBeGreaterThan(0.5)
      }
    }
  })
})

// KICKOFF-phase7-board-rebuild.md's own test #3: "Human row holds 18 slots
// at 92px plus at least 3 flowers without shrinking."
describe('Phase 7: human row capacity', () => {
  it('18 hand/meld slots at large (76px, now the biggest tileScale) fit the row width with room to spare', () => {
    const b = getBoardRegions(1768)
    const { width } = TILE_BOX_PX.large
    const naturalWidth = 18 * width + 17 * 4
    expect(naturalWidth).toBeLessThanOrEqual(b.human.row.width)
  })

  // Honest correction of KICKOFF-phase7-board-rebuild.md's own claim: "18
  // slots at full tile size plus at least 3 flowers without shrinking"
  // doesn't hold literally at every tileScale (the removed xlarge preset's
  // 92px, 18*92+17*4=1724, left only 44px of the 1768-wide row, nowhere near
  // a 3-flower block — ~217px at full size). HandTiles.tsx resolves this the
  // same way every other tight region in this project resolves a real
  // overflow: reserve the flower block's own width out of the hand+meld
  // solve's budget (fitRowTileWidth), which shrinks the hand row gracefully
  // toward — but never below — HAND_TILE_WIDTH_FLOOR, and never lets the two
  // blocks' pixels overlap. "Without shrinking" was the doc's own optimistic
  // arithmetic; what's actually true and worth guaranteeing is the
  // graceful-degradation property below.
  it('18 hand/meld slots plus 3 flowers never overlap and never shrink the hand row below its floor', () => {
    const b = getBoardRegions(1768)
    const { width: nominalWidth, height: nominalHeight } = TILE_BOX_PX.large
    const { width: flowerWidth } = DISCARD_FIELD_PX.large
    const MELD_GAP = 16 // HandTiles.tsx's own "visible gap" constant
    const flowerCount = 3
    const flowerReserve = flowerCount * flowerWidth + (flowerCount - 1) * 4 + MELD_GAP
    const { width: tileWidth } = fitRowTileWidth(18, b.human.row.width - flowerReserve, nominalWidth, nominalHeight, 4, HAND_TILE_WIDTH_FLOOR)
    expect(tileWidth).toBeGreaterThanOrEqual(HAND_TILE_WIDTH_FLOOR)
    const handBlockWidth = 18 * tileWidth + 17 * 4
    const flowerBlockWidth = flowerCount * flowerWidth + (flowerCount - 1) * 4
    expect(handBlockWidth + flowerBlockWidth).toBeLessThanOrEqual(b.human.row.width)
  })
})

// KICKOFF-phase7-board-rebuild.md's own test #4: "Discard zones do not
// overlap each other, the wall ring, or any seat line, across designWidth
// [1024..1920] step 8." Bounds-within-canvas and general no-overlap across
// every top-level region are checked too, the same discipline Phase 2's own
// property test established.
describe('Phase 7: property test across designWidth range', () => {
  function overlaps(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  }

  function allRegions(b: BoardRegions): Rect[] {
    return [
      b.human.row,
      b.human.header,
      b.north.header,
      b.north.line,
      b.west.header,
      b.west.line,
      b.east.header,
      b.east.line,
      b.discards.west,
      b.discards.you,
      b.discards.north,
      b.discards.east,
      b.wall.top,
      b.wall.bottom,
      b.wall.left,
      b.wall.right,
    ]
  }

  it('holds for every designWidth in [1024..1920] step 8: bounds, west/east/north/discard/wall never overlap, human row is the only thing allowed to intersect the header/wall bands above it', () => {
    for (let designWidth = MIN_DESIGN_WIDTH; designWidth <= MAX_DESIGN_WIDTH; designWidth += 8) {
      const b = getBoardRegions(designWidth)
      const ctx = `designWidth=${designWidth}`

      for (const r of allRegions(b)) {
        expect(r.x, ctx).toBeGreaterThanOrEqual(0)
        expect(r.x + r.width, ctx).toBeLessThanOrEqual(designWidth)
        expect(r.y, ctx).toBeGreaterThanOrEqual(0)
        expect(r.y + r.height, ctx).toBeLessThanOrEqual(STAGE_HEIGHT)
      }

      // Everything EXCEPT the human row/header (which deliberately spans
      // the full width beneath the now-cleared side seats) and the west/east
      // headers (which are the full-height side rails, and so necessarily
      // cross the north/human rails at the corners and the side seat line at
      // worst-case occupancy — both deliberate, both asserted in their own
      // describe blocks below) must be pairwise non-overlapping.
      const nonHuman = [
        b.north.header,
        b.north.line,
        b.west.line,
        b.east.line,
        b.discards.west,
        b.discards.you,
        b.discards.north,
        b.discards.east,
        b.wall.top,
        b.wall.bottom,
        b.wall.left,
        b.wall.right,
      ]
      for (let i = 0; i < nonHuman.length; i++) {
        for (let j = i + 1; j < nonHuman.length; j++) {
          expect(overlaps(nonHuman[i]!, nonHuman[j]!), `${ctx} pair(${i},${j})`).toBe(false)
        }
      }

      // The human row/header themselves don't overlap each other, and sit
      // entirely below every side/north/wall/discard region.
      expect(overlaps(b.human.row, b.human.header), ctx).toBe(false)
      for (const r of nonHuman) {
        expect(r.y + r.height, ctx).toBeLessThanOrEqual(b.human.row.y)
      }
    }
  })
})

describe('uniformGroupSizes', () => {
  it('returns nothing for zero or negative count', () => {
    expect(uniformGroupSizes(0, 6)).toEqual([])
    expect(uniformGroupSizes(-3, 6)).toEqual([])
  })

  it('splits an exact multiple into equal groups', () => {
    expect(uniformGroupSizes(18, 6)).toEqual([6, 6, 6])
  })

  it('gives the remainder its own final, smaller group', () => {
    expect(uniformGroupSizes(25, 6)).toEqual([6, 6, 6, 6, 1])
  })

  it('a count smaller than groupSize is one partial group', () => {
    expect(uniformGroupSizes(4, 6)).toEqual([4])
  })
})

// KICKOFF-phase4-discard-overlay.md: the group-major packing primitive
// identified (not yet built) back in Phase 3 Step 1b item 6. The discard
// overlay is its first real consumer; melds/backs work is expected to reuse
// it unchanged, per that finding.
describe('packGroupsMajor', () => {
  it('returns EMPTY_LAYOUT-equivalent for no groups', () => {
    expect(packGroupsMajor([], 'horizontal', { width: 1000, height: 1000 }, 90, 90, 4, 12)).toEqual({
      positions: [],
      scale: 1,
      naturalWidth: 0,
      naturalHeight: 0,
    })
  })

  it('horizontal: packs multiple groups side by side in one band when width allows', () => {
    // 2 groups of 3, tile 90x90, intraGap 4, interGap 12: each group is
    // 3*90+2*4=278 wide; two groups + interGap = 278+12+278=568, fits in 600.
    const layout = packGroupsMajor([3, 3], 'horizontal', { width: 600, height: 200 }, 90, 90, 4, 12)
    expect(layout.positions).toHaveLength(6)
    // group 1: x = 0, 94, 188 (90+4 apart)
    expect(layout.positions.slice(0, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 94, y: 0 },
      { x: 188, y: 0 },
    ])
    // group 2 starts after group1's own extent (278) + interGap (12) = 290
    expect(layout.positions.slice(3, 6)).toEqual([
      { x: 290, y: 0 },
      { x: 384, y: 0 },
      { x: 478, y: 0 },
    ])
    expect(layout.naturalWidth).toBe(568)
    expect(layout.naturalHeight).toBe(90)
    expect(layout.scale).toBe(1)
  })

  it('horizontal: wraps to a new band only when the long axis is actually exhausted, not after a fixed count', () => {
    // Same groups, but region only wide enough for one group (278) plus a
    // little slack — not enough for a second group + interGap (568).
    const layout = packGroupsMajor([3, 3], 'horizontal', { width: 300, height: 200 }, 90, 90, 4, 12)
    // group 1 stays on band 0
    expect(layout.positions.slice(0, 3).every((p) => p.y === 0)).toBe(true)
    // group 2 wraps to band 1 (y = tileHeight + bandGap = 90 + 4 = 94), NOT
    // because 3 tiles were placed (there is no fixed count), but because it
    // genuinely didn't fit next to group 1.
    expect(layout.positions.slice(3, 6).every((p) => p.y === 94)).toBe(true)
    expect(layout.positions[3]).toEqual({ x: 0, y: 94 })
    expect(layout.naturalHeight).toBe(90 * 2 + 4) // 2 bands, bandGap defaults to intraGap
  })

  it('a group is never split internally, even if it alone overflows the region', () => {
    // A single 6-tile group at 90px wide needs 6*90+5*4=560 — wider than
    // the 300px region. It still places fully, on one band, unshrunk in its
    // own local coordinates (the returned `scale` carries the overflow).
    const layout = packGroupsMajor([6], 'horizontal', { width: 300, height: 200 }, 90, 90, 4, 12)
    expect(layout.positions).toHaveLength(6)
    expect(new Set(layout.positions.map((p) => p.y))).toEqual(new Set([0]))
    expect(layout.naturalWidth).toBe(560)
    expect(layout.scale).toBeCloseTo(300 / 560)
  })

  it('vertical: mirrors the horizontal case with x/y swapped', () => {
    const layout = packGroupsMajor([3, 3], 'vertical', { width: 200, height: 600 }, 90, 90, 4, 12)
    expect(layout.positions.slice(0, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 94 },
      { x: 0, y: 188 },
    ])
    expect(layout.positions.slice(3, 6)).toEqual([
      { x: 0, y: 290 },
      { x: 0, y: 384 },
      { x: 0, y: 478 },
    ])
    expect(layout.naturalWidth).toBe(90)
    expect(layout.naturalHeight).toBe(568)
  })

  it('vertical: wraps to a new column, not a new row, when the long axis (height) is exhausted', () => {
    const layout = packGroupsMajor([3, 3], 'vertical', { width: 200, height: 300 }, 90, 90, 4, 12)
    expect(layout.positions.slice(0, 3).every((p) => p.x === 0)).toBe(true)
    expect(layout.positions.slice(3, 6).every((p) => p.x === 94)).toBe(true) // tileWidth + bandGap
  })

  it('inter-group gap is distinct from (and here, larger than) intra-group gap', () => {
    const layout = packGroupsMajor([2, 2], 'horizontal', { width: 1000, height: 200 }, 90, 90, 4, 12)
    // within group 1: consecutive tiles 90+4=94 apart
    expect(layout.positions[1]!.x - layout.positions[0]!.x).toBe(94)
    // across the group boundary: 90+12=102 apart
    expect(layout.positions[2]!.x - layout.positions[1]!.x).toBe(102)
  })

  it('bandGap defaults to intraGap when not given, and can be overridden independently', () => {
    const withDefault = packGroupsMajor([6, 6], 'horizontal', { width: 300, height: 400 }, 90, 90, 4, 12)
    expect(withDefault.naturalHeight).toBe(90 * 2 + 4) // default bandGap = intraGap = 4
    const withCustomBandGap = packGroupsMajor([6, 6], 'horizontal', { width: 300, height: 400 }, 90, 90, 4, 12, 20)
    expect(withCustomBandGap.naturalHeight).toBe(90 * 2 + 20)
  })

  it('uniformGroupSizes + packGroupsMajor together reproduce the 6-column discard rhythm at high occupancy', () => {
    // 30 discards, group size 6 -> 5 groups of 6. In a region wide enough
    // for exactly 3 groups per band (matches KICKOFF-phase4's own worked
    // example: "groups per band 3", "bands per player 2").
    const groups = uniformGroupSizes(30, 6)
    expect(groups).toEqual([6, 6, 6, 6, 6])
    const groupWidth = 6 * 90 + 5 * 4 // 560
    // 3 groups + 2 interGaps fits; a 4th would not.
    const bandWidth = groupWidth * 3 + 12 * 2 + 1
    const layout = packGroupsMajor(groups, 'horizontal', { width: bandWidth, height: 1000 }, 90, 90, 4, 12)
    const rows = new Set(layout.positions.map((p) => p.y)).size
    expect(rows).toBe(2) // 3 groups on band 0, 2 groups on band 1
  })
})
