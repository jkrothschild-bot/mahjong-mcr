// Pure layout math for the game stage — no React, no DOM. Every game
// object (hand tiles, concealed backs, flowers, melds, discards, the wall)
// is placed by computed x/y in this fixed 1024x768 design-resolution space;
// GameStage.tsx is the only place that turns this into real pixels via one
// CSS transform.
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TilePosition {
  x: number
  y: number
}

export interface GroupLayout {
  positions: readonly TilePosition[]
  // Uniform scale applied to the whole group (never per-tile, never by
  // reflowing columns) when it doesn't fit `region` — the mechanism that
  // replaces every `overflow-y-auto` cap the old flex-based layout used.
  // Always <= 1.
  scale: number
  naturalWidth: number
  naturalHeight: number
}

export const STAGE_WIDTH = 1024
export const STAGE_HEIGHT = 768

export function fitScale(naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) return 1
  return Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight)
}

const EMPTY_LAYOUT: GroupLayout = { positions: [], scale: 1, naturalWidth: 0, naturalHeight: 0 }

// Lays tiles left-to-right, wrapping to a new row once as many fit `region`'s
// width as will (at natural tile size), then scales the whole block down as
// one unit if it still overflows `region`'s height. `groupBreakAfter` forces
// an early wrap after specific indices — used for meld-tile sequences so
// each meld reads as its own cluster rather than one continuous row.
export function computeRowPositions(
  count: number,
  region: Pick<Rect, 'width' | 'height'>,
  tileWidth: number,
  tileHeight: number,
  gap: number,
  groupBreakAfter?: ReadonlySet<number>,
): GroupLayout {
  if (count === 0) return EMPTY_LAYOUT

  const colsPerRow = Math.max(1, Math.floor((region.width + gap) / (tileWidth + gap)))
  const positions: TilePosition[] = []
  let col = 0
  let row = 0
  for (let i = 0; i < count; i++) {
    positions.push({ x: col * (tileWidth + gap), y: row * (tileHeight + gap) })
    col++
    if (groupBreakAfter?.has(i) || col >= colsPerRow) {
      col = 0
      row++
    }
  }
  const rows = row + (col > 0 ? 1 : 0)
  const widestRowCols = Math.min(count, colsPerRow)
  const naturalWidth = widestRowCols * tileWidth + (widestRowCols - 1) * gap
  const naturalHeight = rows * tileHeight + (rows - 1) * gap
  return { positions, scale: fitScale(naturalWidth, naturalHeight, region.width, region.height), naturalWidth, naturalHeight }
}

// Discards' fixed-column grid — CLAUDE.md/SPEC.md's hard "never overlap,
// fan, or cascade" rule, so unlike computeRowPositions the column count
// never adapts to available width. Only the uniform scale fallback shrinks
// it to fit.
export function computeGridPositions(
  count: number,
  columns: number,
  region: Pick<Rect, 'width' | 'height'>,
  tileWidth: number,
  tileHeight: number,
  gap: number,
): GroupLayout {
  if (count === 0) return EMPTY_LAYOUT

  const positions: TilePosition[] = []
  for (let i = 0; i < count; i++) {
    const col = i % columns
    const row = Math.floor(i / columns)
    positions.push({ x: col * (tileWidth + gap), y: row * (tileHeight + gap) })
  }
  const rows = Math.ceil(count / columns)
  const widestRowCols = Math.min(count, columns)
  const naturalWidth = widestRowCols * tileWidth + (widestRowCols - 1) * gap
  const naturalHeight = rows * tileHeight + (rows - 1) * gap
  return { positions, scale: fitScale(naturalWidth, naturalHeight, region.width, region.height), naturalWidth, naturalHeight }
}

export type SeatOffset = 0 | 1 | 2 | 3

export interface SeatRegions {
  header: Rect
  flowers: Rect
  melds: Rect
  discards: Rect
  // Human only.
  hand?: Rect
  // Bots only.
  backs?: Rect
}

// Direct translation of the old GRID_CLASS_BY_OFFSET's spatial intent (0 =
// human/bottom/full-width, 1 = left, 2 = top, 3 = right, going counter-
// clockwise in turn order) into stage coordinates. The human's hand region
// is sized generously first (it's the primary, always-fully-visible
// interactive surface — see Board.tsx's original comment on why); bot
// regions get whatever's left, same priority the old capped/scrollable
// layout expressed. Not pixel-final — Step 2 is where this gets real visual
// refinement; Step 1 just needs a non-overlapping partition every group's
// fitScale fallback can work within.
export const SEAT_REGIONS: Record<SeatOffset, SeatRegions> = {
  0: {
    // human, bottom, full width
    header: { x: 16, y: 526, width: 992, height: 20 },
    flowers: { x: 16, y: 550, width: 992, height: 22 },
    melds: { x: 16, y: 576, width: 992, height: 30 },
    discards: { x: 16, y: 610, width: 992, height: 40 },
    hand: { x: 16, y: 654, width: 992, height: 104 },
  },
  1: {
    // left
    header: { x: 8, y: 154, width: 172, height: 16 },
    flowers: { x: 8, y: 174, width: 172, height: 18 },
    melds: { x: 8, y: 196, width: 172, height: 24 },
    discards: { x: 8, y: 224, width: 172, height: 36 },
    backs: { x: 8, y: 264, width: 172, height: 240 },
  },
  2: {
    // across (top)
    header: { x: 200, y: 14, width: 624, height: 16 },
    flowers: { x: 200, y: 34, width: 624, height: 16 },
    melds: { x: 200, y: 54, width: 624, height: 20 },
    discards: { x: 200, y: 78, width: 624, height: 20 },
    backs: { x: 200, y: 102, width: 624, height: 26 },
  },
  3: {
    // right
    header: { x: 844, y: 154, width: 172, height: 16 },
    flowers: { x: 844, y: 174, width: 172, height: 18 },
    melds: { x: 844, y: 196, width: 172, height: 24 },
    discards: { x: 844, y: 224, width: 172, height: 36 },
    backs: { x: 844, y: 264, width: 172, height: 240 },
  },
}

// Only the concealed tile-back art rotates to "face inward" (M8 Step 2) —
// identity labels, discards, and melds deliberately stay upright for every
// seat, since they carry legibility-critical content (numerals, wind/
// dealer/turn/score text) SPEC.md §5a requires be answerable within ~2
// seconds; sideways/upside-down text or tile faces work against that. Backs
// carry no such content (just an indigo pattern), so rotating them is a
// pure visual win with no readability cost. Human (offset 0) never has
// backs. Left/top/right rotate so each seat's own "up" points toward the
// table center.
export const SEAT_BACK_ROTATION: Record<SeatOffset, number> = { 0: 0, 1: 90, 2: 180, 3: -90 }

export interface PlacedTile {
  x: number // absolute stage-space center x, already accounting for the group's fitScale
  y: number // absolute stage-space center y
}

// Converts a GroupLayout's local, unscaled per-tile offsets into final,
// centered, absolute stage-space center points — the one place the "scale
// the whole block, center it in the region" math happens, so every caller
// (HandTiles, Discards, Melds, Flowers, bot backs, the wall) gets identical
// centering behavior. Pair with `Positioned`'s `scale` prop (pass
// `layout.scale` there too) rather than pre-multiplying tile size here —
// `Positioned` needs the tile's natural size to keep using its own
// intrinsic Tailwind sizing (tileFaceClassName etc.) unmodified.
export function placeGroup(layout: GroupLayout, region: Rect, tileWidth: number, tileHeight: number): PlacedTile[] {
  const offsetX = region.x + (region.width - layout.naturalWidth * layout.scale) / 2
  const offsetY = region.y + (region.height - layout.naturalHeight * layout.scale) / 2
  return layout.positions.map((p) => ({
    x: offsetX + (p.x + tileWidth / 2) * layout.scale,
    y: offsetY + (p.y + tileHeight / 2) * layout.scale,
  }))
}

// The wall's stage home for Step 1 — deliberately one modest strip in the
// stage's empty center, not the full multi-side treatment (that's Step 2's
// "make it look like a table" job). Centered in the gap left by the seat
// regions above.
export const WALL_SEGMENT_REGION: Rect = { x: 412, y: 310, width: 200, height: 56 }
