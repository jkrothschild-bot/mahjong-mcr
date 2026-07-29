// Pure layout math for the game stage — no React, no DOM. Every game
// object (hand tiles, concealed backs, flowers, melds, discards, the wall)
// is placed by computed x/y in this fixed 1024x768 design-resolution space;
// GameStage.tsx is the only place that turns this into real pixels via one
// CSS transform.
import type { TileScale } from '../settings/useSettings.js'

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
// layout expressed.
//
// **Scale-dependent, not a single static partition (M8 post-ship fix).**
// The stage is a fixed 1024x768 with no scroll — a static partition meant
// every zone's rendered tile size was entirely at the mercy of `fitScale`
// shrinking a larger natural block into the same fixed box. That produced
// two real bugs: (1) at `large`/`xlarge`, the human hand no longer fits one
// row at its natural tile size (`computeRowPositions`' column math is
// unscaled), so it wraps to 2 rows and got shrunk to a natural-2-row-height
// fraction that was *smaller* than `normal`'s un-shrunk single row —
// `xlarge` literally rendered smaller than `normal`. (2) `melds`/`discards`
// regions (20-40px tall) were shrinking tiles to ~0.2-0.3x regardless of
// `tileScale`, illegible (SPEC.md §5a). Each of these 3 tables is hand-
// derived (not a live formula) against `tiles/tileStyles.ts`'s real
// per-scale pixel sizes (`TILE_BOX_PX` for hand, `TILE_FACE_COMPACT_PX` for
// melds/discards/flowers, `TILE_BACK_COMPACT_PX` for bot backs), verified
// so the *rendered* tile height/width (after `fitScale`) is strictly
// bigger normal -> large -> xlarge for the hand (the literal reported
// bug), and never *shrinks* going normal -> large -> xlarge for melds/
// discards, landing comfortably above their old ~20-30px worst case (see
// stageLayout.test.ts's monotonic-size guard, and the trade-off note
// below for why melds/discards don't also get hand's strict 3-way growth).
//
// **A real, deliberate trade-off, not an oversight:** the fixed 768px
// stage height cannot fit a properly-legible hand *and* fully natural-
// sized bot concealed backs at `large`/`xlarge` — there simply isn't
// enough vertical room for both. Backs are prioritized last: they carry
// zero legibility-relevant content (no numerals/text, just a back
// pattern), unlike hand/melds/discards, which SPEC.md §5a's "answerable
// within ~2 seconds" bar is actually about. Bot backs' region is widened
// horizontally (350px, reaching most of the way toward the wall's own
// region without touching it) specifically to reduce how many *rows* they
// need at a given height budget, but at `xlarge` they still end up more
// compressed than at `normal` — an accepted cosmetic cost, not a bug.
const SEAT_REGIONS_NORMAL: Record<SeatOffset, SeatRegions> = {
  0: {
    // human, bottom, full width
    header: { x: 16, y: 530, width: 992, height: 20 },
    flowers: { x: 16, y: 554, width: 992, height: 20 },
    melds: { x: 16, y: 578, width: 992, height: 36 },
    discards: { x: 16, y: 618, width: 992, height: 36 },
    hand: { x: 16, y: 658, width: 992, height: 104 },
  },
  1: {
    // left — melds/discards widened past the header/flowers column (same
    // reasoning as backs below: a fixed 172px column forces multi-row
    // wrapping at larger tile sizes even for a modest, realistic tile
    // count, which shrinks them far more than the region height alone
    // would suggest).
    header: { x: 8, y: 172, width: 172, height: 16 },
    flowers: { x: 8, y: 192, width: 172, height: 20 },
    melds: { x: 8, y: 216, width: 360, height: 36 },
    discards: { x: 8, y: 256, width: 360, height: 36 },
    backs: { x: 8, y: 296, width: 350, height: 226 },
  },
  2: {
    // across (top)
    header: { x: 200, y: 10, width: 624, height: 16 },
    flowers: { x: 200, y: 30, width: 624, height: 20 },
    melds: { x: 200, y: 54, width: 624, height: 36 },
    discards: { x: 200, y: 94, width: 624, height: 36 },
    backs: { x: 200, y: 134, width: 624, height: 30 },
  },
  3: {
    // right — mirrors offset 1; widened regions grow toward the wall from
    // the right edge instead of the left.
    header: { x: 844, y: 172, width: 172, height: 16 },
    flowers: { x: 844, y: 192, width: 172, height: 20 },
    melds: { x: 664, y: 216, width: 360, height: 36 },
    discards: { x: 664, y: 256, width: 360, height: 36 },
    backs: { x: 666, y: 296, width: 350, height: 226 },
  },
}

const SEAT_REGIONS_LARGE: Record<SeatOffset, SeatRegions> = {
  0: {
    header: { x: 16, y: 428, width: 992, height: 20 },
    flowers: { x: 16, y: 452, width: 992, height: 20 },
    melds: { x: 16, y: 476, width: 992, height: 44 },
    discards: { x: 16, y: 524, width: 992, height: 44 },
    hand: { x: 16, y: 572, width: 992, height: 190 },
  },
  1: {
    header: { x: 8, y: 192, width: 172, height: 16 },
    flowers: { x: 8, y: 212, width: 172, height: 20 },
    melds: { x: 8, y: 236, width: 360, height: 44 },
    discards: { x: 8, y: 284, width: 360, height: 44 },
    backs: { x: 8, y: 332, width: 350, height: 88 },
  },
  2: {
    header: { x: 200, y: 10, width: 624, height: 16 },
    flowers: { x: 200, y: 30, width: 624, height: 20 },
    melds: { x: 200, y: 54, width: 624, height: 44 },
    discards: { x: 200, y: 102, width: 624, height: 44 },
    backs: { x: 200, y: 150, width: 624, height: 34 },
  },
  3: {
    header: { x: 844, y: 192, width: 172, height: 16 },
    flowers: { x: 844, y: 212, width: 172, height: 20 },
    melds: { x: 664, y: 236, width: 360, height: 44 },
    discards: { x: 664, y: 284, width: 360, height: 44 },
    backs: { x: 666, y: 332, width: 350, height: 88 },
  },
}

const SEAT_REGIONS_XLARGE: Record<SeatOffset, SeatRegions> = {
  0: {
    header: { x: 16, y: 423, width: 992, height: 20 },
    flowers: { x: 16, y: 447, width: 992, height: 20 },
    melds: { x: 16, y: 471, width: 992, height: 44 },
    discards: { x: 16, y: 519, width: 992, height: 44 },
    hand: { x: 16, y: 567, width: 992, height: 195 },
  },
  1: {
    header: { x: 8, y: 196, width: 172, height: 16 },
    flowers: { x: 8, y: 216, width: 172, height: 20 },
    melds: { x: 8, y: 240, width: 360, height: 44 },
    discards: { x: 8, y: 288, width: 360, height: 44 },
    backs: { x: 8, y: 336, width: 350, height: 79 },
  },
  2: {
    header: { x: 200, y: 10, width: 624, height: 16 },
    flowers: { x: 200, y: 30, width: 624, height: 20 },
    melds: { x: 200, y: 54, width: 624, height: 44 },
    discards: { x: 200, y: 102, width: 624, height: 44 },
    backs: { x: 200, y: 150, width: 624, height: 38 },
  },
  3: {
    header: { x: 844, y: 196, width: 172, height: 16 },
    flowers: { x: 844, y: 216, width: 172, height: 20 },
    melds: { x: 664, y: 240, width: 360, height: 44 },
    discards: { x: 664, y: 288, width: 360, height: 44 },
    backs: { x: 666, y: 336, width: 350, height: 79 },
  },
}

const SEAT_REGIONS_BY_SCALE: Record<TileScale, Record<SeatOffset, SeatRegions>> = {
  normal: SEAT_REGIONS_NORMAL,
  large: SEAT_REGIONS_LARGE,
  xlarge: SEAT_REGIONS_XLARGE,
}

export function getSeatRegions(tileScale: TileScale): Record<SeatOffset, SeatRegions> {
  return SEAT_REGIONS_BY_SCALE[tileScale]
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
