// Pure layout math for the game stage — no React, no DOM. Every game
// object (hand tiles, concealed backs, flowers, melds, discards, the wall)
// is placed by computed x/y in this design-resolution space, height fixed
// at STAGE_HEIGHT, width variable (KICKOFF-phase2-addendum-anchoring.md —
// see MIN_DESIGN_WIDTH/MAX_DESIGN_WIDTH below); GameStage.tsx is the only
// place that turns this into real pixels via one CSS transform.

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

// STAGE_HEIGHT never varies — the design canvas has a fixed height and a
// variable width (computed per-frame in GameStage.tsx from the available
// viewport aspect ratio, see MIN/MAX_DESIGN_WIDTH below), the inverse of the
// original fixed-1024x768 design. MIN_DESIGN_WIDTH was formerly the single
// fixed STAGE_WIDTH — it's now only the floor: below a ~1.33 aspect ratio
// (i.e. any viewport not wider than 4:3), designWidth clamps to this and
// width becomes the binding constraint again (SPEC.md's documented iPad-
// portrait limitation — landscape-only for this phase, see
// KICKOFF-tile-legibility-phase2.md §2.4). MAX_DESIGN_WIDTH caps how wide an
// ultrawide monitor can stretch the canvas, so seat regions don't have to
// hold together at an unbounded aspect ratio.
export const MIN_DESIGN_WIDTH = 1024
export const MAX_DESIGN_WIDTH = 1920
export const STAGE_HEIGHT = 796

// ResizeObserver fires continuously while a window is being dragged;
// quantising the live designWidth to a coarse step before it reaches either
// the stage's own CSS width or getSeatRegions keeps both (a) stable against
// sub-pixel jitter and (b) — critically — in agreement with each other, since
// both must read the exact same quantised number or seat regions will drift
// out of alignment with the rendered stage by a few px. 8 design px is
// imperceptible while dragging; step down to 4 if it ever proves visible
// (KICKOFF-phase2-addendum-anchoring.md's own accepted tradeoff).
const DESIGN_WIDTH_QUANTUM = 8

export function quantizeDesignWidth(designWidth: number): number {
  return Math.round(designWidth / DESIGN_WIDTH_QUANTUM) * DESIGN_WIDTH_QUANTUM
}

// KICKOFF-tile-legibility-phase2.md §2.1's core formula: pick a design
// canvas width that matches the *measured* element's own aspect ratio (so
// STAGE_HEIGHT/availHeight ends up the binding scale term, not width —
// letting the board actually fill the window's width instead of being
// capped at a fixed design width regardless of how wide the window is),
// clamped so the seat-region anchor policy never has to hold together
// outside a sane range. Already quantised on the way out — GameStage.tsx's
// ResizeObserver callback is the sole caller, and both the stage's CSS width
// and every downstream getSeatRegions/getWallSegmentRegion consumer must
// agree on the same number, so quantising once, here, at the source, is what
// guarantees that (see quantizeDesignWidth's own comment on why that matters).
export function computeDesignWidth(availWidth: number, availHeight: number): number {
  if (availHeight <= 0) return MIN_DESIGN_WIDTH
  const raw = STAGE_HEIGHT * (availWidth / availHeight)
  const clamped = Math.min(MAX_DESIGN_WIDTH, Math.max(MIN_DESIGN_WIDTH, raw))
  return quantizeDesignWidth(clamped)
}

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

  // A tiny epsilon before flooring: fitRowTileWidth solves tileWidth so
  // that exactly `count` tiles fill `region.width` — mathematically exact,
  // but the division here can land a hair under the true integer (e.g.
  // 24.999999999999996 instead of 25) purely from floating-point
  // representation, which Math.floor then rounds DOWN a whole column.
  // Caught live: Phase 7's north seat line (25 tiles, gap 4) hit exactly
  // this at designWidth=1312, wrapping to a phantom 2nd row and triggering
  // a height-based shrink to ~0.6x for a tile size that was already an
  // exact fit. 1e-9 is far smaller than any real sub-pixel difference this
  // function's callers care about, so it can't mask a genuine off-by-one.
  const colsPerRow = Math.max(1, Math.floor((region.width + gap) / (tileWidth + gap) + 1e-9))
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
  const widestRowCols = Math.min(count, colsPerRow)
  const naturalWidth = widestRowCols * tileWidth + (widestRowCols - 1) * gap
  // Phase 2.2 step 2: derived from the actual max row index any real
  // position landed in — NOT from the `row`/`col` loop counters above. Those
  // counters can end the loop already advanced onto a row that no real item
  // occupies (concretely: HandTiles used to pass a virtual "end zone"
  // sentinel as one extra item past the real tiles — if that sentinel
  // wrapped to its own row, `naturalHeight` counted that phantom row too,
  // inflating the group's natural size and triggering a uniform shrink that
  // penalized every real tile along with it, even when they all fit on one
  // row on their own). Deriving from `positions` directly is robust against
  // that whole bug class regardless of caller — a future off-by-one in the
  // loop above can't silently reintroduce it.
  const naturalHeight = count === 0 ? 0 : Math.max(...positions.map((p) => p.y)) + tileHeight
  return { positions, scale: fitScale(naturalWidth, naturalHeight, region.width, region.height), naturalWidth, naturalHeight }
}

// Phase 2.2 step 4 (KICKOFF-phase2-2-hand-fit.md): shrinks tile size to keep
// a fixed-count row (the human hand) on one line down to `floor`, rather
// than wrapping and letting computeRowPositions' own group fit-scale shrink
// the whole multi-row block — Phase 2's own finding that wrap-then-shrink is
// "the worst outcome available" (harder to read AND smaller than a
// deliberately narrowed single row). Solves `count*(w+gap)-gap <=
// regionWidth` for `w`. Never upscales past `nominalWidth` (a wider region
// isn't a reason to render bigger tiles than the tileScale setting asked
// for — that's what tileScale is for), never shrinks below `floor`. If even
// `floor` can't fit `count` tiles on one row, returns `floor` unchanged —
// the caller's own computeRowPositions will then wrap naturally at that
// (still-legible) width, and correctly shrink only if that multi-row block
// doesn't fit the region's height (which, since naturalHeight now only
// counts occupied rows, no longer over-shrinks from a phantom row).
// Height scales by the same ratio as width, preserving the tile's aspect
// ratio — shrinking only one dimension would render visibly squished tiles.
export function fitRowTileWidth(
  count: number,
  regionWidth: number,
  nominalWidth: number,
  nominalHeight: number,
  gap: number,
  floor: number,
): { width: number; height: number } {
  if (count <= 0) return { width: nominalWidth, height: nominalHeight }
  const fitWidth = (regionWidth + gap) / count - gap
  // `floor` (HAND_TILE_WIDTH_FLOOR, 64) is only meaningful for tileScales
  // whose own nominal width exceeds it (large, 76) — `normal`'s
  // nominal width (60) is deliberately BELOW the floor (that's the whole
  // point: the floor must stay above normal's width, tileStyles.ts's own
  // comment). Clamping `floor` itself to `nominalWidth` first is what stops
  // `normal` from getting bumped UP to 64 here (a real bug caught during
  // step 5's live re-measurement: normal rendered 68.9px instead of its
  // correct 68.9->64.5px, because `Math.max(64, Math.min(60, fitWidth))`
  // outer-clamps to 64 regardless of the inner min already having correctly
  // settled on 60).
  const effectiveFloor = Math.min(floor, nominalWidth)
  const width = Math.max(effectiveFloor, Math.min(nominalWidth, fitWidth))
  const height = nominalHeight * (width / nominalWidth)
  return { width, height }
}

// Phase 7's sibling to fitRowTileWidth above, for a FIXED-COLUMN grid
// (computeGridPositions) rather than a fixed-count row: the discard field's
// 4 zones and the west/east seat-line columns all live in a region whose
// width is a function of `designWidth` (getBoardRegions' anchor policy —
// only the center field grows/shrinks; west/east happen to be constant, but
// this doesn't assume that), while their row/column COUNT is fixed (5 for a
// discard zone, 3 for a seat line) regardless of how many tiles are
// actually present. Solving from `columns` alone — not `count` — is what
// keeps this stable as tiles accumulate within a hand (CLAUDE.md's
// "overflow is additive, never rescaling": more discards add ROWS, at the
// same per-tile width, never shrinking every tile already placed) while
// still adapting the ONE thing that's actually viewport-dependent: how much
// width `columns` of them have to share. Mirrors fitRowTileWidth's own
// floor/clamp logic exactly (see that function's comment for why the floor
// needs clamping to nominal first).
export function fitGridTileWidth(
  columns: number,
  regionWidth: number,
  nominalWidth: number,
  nominalHeight: number,
  gap: number,
  floor: number,
): { width: number; height: number } {
  const fitWidth = (regionWidth + gap) / columns - gap
  const effectiveFloor = Math.min(floor, nominalWidth)
  const width = Math.max(effectiveFloor, Math.min(nominalWidth, fitWidth))
  const height = nominalHeight * (width / nominalWidth)
  return { width, height }
}

// Splits `count` into groups of `groupSize` tiles, last group taking
// whatever remainder is left (never 0, never > groupSize) — the "N discards,
// fixed 6-per-group" case of the group-major primitive below. Melds build
// their own groupSizes array directly instead (real per-meld sizes, 3 or 4),
// since there's no uniform size to derive it from.
export function uniformGroupSizes(count: number, groupSize: number): number[] {
  if (count <= 0) return []
  const groups: number[] = []
  let remaining = count
  while (remaining > 0) {
    const size = Math.min(groupSize, remaining)
    groups.push(size)
    remaining -= size
  }
  return groups
}

export type PackAxis = 'horizontal' | 'vertical'

// Phase 4 (KICKOFF-phase4-discard-overlay.md), identified as a needed
// primitive back in the Phase 3 modelling arc (Step 1b item 6): packs
// `groupSizes` along a specified long axis, wrapping to a new band
// (horizontal) or column (vertical) only when that axis is actually
// exhausted — never after a fixed column/row count the way
// computeGridPositions' discard grid does. A group is atomic: its tiles are
// never split across a wrap (if a single group's own long-axis extent
// exceeds `region`'s long extent entirely, it still gets placed in full,
// same as computeRowPositions' existing behaviour for an oversized item —
// the returned `scale` accounts for the overflow via naturalWidth/Height).
//
// `intraGap` separates tiles within one group; `interGap` (typically
// larger) separates consecutive groups, which is what preserves a visible
// "6-tile rhythm" without a hard column count (CLAUDE.md's discard-grid rule
// was reworded for exactly this — see that entry's own history).
// `bandGap` (defaults to `intraGap`) separates wrapped bands/columns from
// each other. This is THE primitive discards' group-major packing and
// melds' horizontal-cluster/transpose need both reduce to (Step 1b's
// finding) — one function, reused by both, parameterised by axis and group
// sizes rather than rebuilt per consumer.
export function packGroupsMajor(
  groupSizes: readonly number[],
  axis: PackAxis,
  region: Pick<Rect, 'width' | 'height'>,
  tileWidth: number,
  tileHeight: number,
  intraGap: number,
  interGap: number,
  bandGap: number = intraGap,
): GroupLayout {
  if (groupSizes.length === 0) return EMPTY_LAYOUT

  const longExtent = axis === 'horizontal' ? region.width : region.height
  const tileLong = axis === 'horizontal' ? tileWidth : tileHeight
  const tileCross = axis === 'horizontal' ? tileHeight : tileWidth
  const groupLongExtent = (size: number) => size * tileLong + (size - 1) * intraGap

  const positions: TilePosition[] = []
  let cursor = 0 // position along the long axis, within the current band/column
  let bandIndex = 0 // which band (horizontal) / column (vertical) we're in
  let maxLongUsed = 0 // widest (horizontal) / tallest (vertical) band's long-axis usage

  for (const size of groupSizes) {
    const groupLong = groupLongExtent(size)
    if (cursor > 0 && cursor + interGap + groupLong > longExtent) {
      maxLongUsed = Math.max(maxLongUsed, cursor)
      bandIndex++
      cursor = 0
    }
    if (cursor > 0) cursor += interGap
    for (let i = 0; i < size; i++) {
      const along = cursor + i * (tileLong + intraGap)
      const cross = bandIndex * (tileCross + bandGap)
      positions.push(axis === 'horizontal' ? { x: along, y: cross } : { x: cross, y: along })
    }
    cursor += groupLong
  }
  maxLongUsed = Math.max(maxLongUsed, cursor)
  const bandsUsed = bandIndex + 1

  const naturalCross = bandsUsed * tileCross + (bandsUsed - 1) * bandGap
  const naturalWidth = axis === 'horizontal' ? maxLongUsed : naturalCross
  const naturalHeight = axis === 'horizontal' ? naturalCross : maxLongUsed

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

// NO CURRENT CONSUMER. The west/east seat lines used this and moved to
// packGroupsMajor's vertical axis: this function places tile i at
// (col = floor(i/rows), row = i % rows) with no concept of groups, so a meld
// straddled a column break whenever it started fewer than 3-4 rows from the
// bottom and had to be read around a corner. packGroupsMajor guarantees a
// group is never split across a wrap, which is what the seat lines need.
//
// Kept because the "fill down, then over" reading order it documents below
// is still the right model for a stacked hand, and because a future
// group-free column layout would want exactly this. Delete freely if that
// never materialises — it is fully tested, so removal is cheap either way.
//
// Column-major counterpart to computeGridPositions above — fills DOWN one
// column before starting the next, rather than across a row before
// wrapping. Phase 7's west/east seat lines (KICKOFF-phase7-board-
// rebuild.md: "3 columns x 9 rows") needed this specifically: a bot's own
// tile count grows one at a time through a hand (draw, claim, flower), and
// reading "down, then over" matches how a real stacked hand of tiles
// physically fills — computeGridPositions' row-major fill would instead
// spread even a small hand across all 3 columns immediately (a live
// screenshot caught this: 13 concealed tiles spread 5/4/4 across all three
// columns instead of filling the first). `rows` is fixed (the region's own
// row budget, e.g. 9), unlike `columns` above which is fixed and rows
// derived — this is the same primitive with the wrapping axis swapped, not
// a transpose of computeGridPositions' own output (keeping the two
// independent avoids a transpose bug silently flipping tile identity).
export function computeColumnMajorGridPositions(
  count: number,
  rows: number,
  region: Pick<Rect, 'width' | 'height'>,
  tileWidth: number,
  tileHeight: number,
  gap: number,
): GroupLayout {
  if (count === 0) return EMPTY_LAYOUT

  const positions: TilePosition[] = []
  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / rows)
    const row = i % rows
    positions.push({ x: col * (tileWidth + gap), y: row * (tileHeight + gap) })
  }
  const columns = Math.ceil(count / rows)
  const tallestColRows = Math.min(count, rows)
  const naturalWidth = columns * tileWidth + (columns - 1) * gap
  const naturalHeight = tallestColRows * tileHeight + (tallestColRows - 1) * gap
  return { positions, scale: fitScale(naturalWidth, naturalHeight, region.width, region.height), naturalWidth, naturalHeight }
}

// The 4 seat positions relative to the human, counter-clockwise: 0 = human,
// 1 = left/west, 2 = across/north, 3 = right/east.
//
// Its only consumer was DiscardOverlay.tsx (Phase 4's full-viewport "All
// discards" view), removed once the on-board discard field became readable
// in place. Kept because DiscardField.tsx still works in exactly this
// offset space (its own ZONE_OFFSETS) and would otherwise re-declare the
// concept locally — but nothing imports the type today, so it's fair game
// to delete alongside ZONE_OFFSETS if that ever gets tidied.
export type SeatOffset = 0 | 1 | 2 | 3

export interface PlacedTile {
  x: number // absolute stage-space center x, already accounting for the group's fitScale
  y: number // absolute stage-space center y
}

// Converts a GroupLayout's local, unscaled per-tile offsets into final,
// centered, absolute stage-space center points — the one place the "scale
// the whole block, center it in the region" math happens, so every caller
// gets identical centering behavior. Pair with `Positioned`'s `scale` prop
// (pass `layout.scale` there too) rather than pre-multiplying tile size
// here — `Positioned` needs the tile's natural size to keep using its own
// intrinsic Tailwind sizing (tileFaceClassName etc.) unmodified.
export function placeGroup(layout: GroupLayout, region: Rect, tileWidth: number, tileHeight: number): PlacedTile[] {
  const offsetX = region.x + (region.width - layout.naturalWidth * layout.scale) / 2
  const offsetY = region.y + (region.height - layout.naturalHeight * layout.scale) / 2
  return layout.positions.map((p) => ({
    x: offsetX + (p.x + tileWidth / 2) * layout.scale,
    y: offsetY + (p.y + tileHeight / 2) * layout.scale,
  }))
}

// ---------------------------------------------------------------------------
// Phase 7 board layout (KICKOFF-phase7-board-rebuild.md) — supersedes the
// Phase 5 melds+backs merge and the Phase 6 concentric-ring sketch (measured
// and rejected: <50px). Seat lines carry hand + melds + flowers together
// (no separate meld region anywhere); the discard pile becomes ONE shared
// central field, four zones tiling it completely (no dead center, no fixed
// 6-tile grouping) rather than four independently-reserved per-seat
// regions. See that doc for the full attribution/measurement writeup — the
// constants below are its literal verified geometry, not re-derived here.
//
// Unlike getSeatRegions' old per-tileScale tables, this geometry does NOT
// vary by tileScale — every band below is a fixed design-px constant (only
// designWidth moves anything, via the same anchor-policy shape Phase 2
// established: fixed-width side regions, only the center grows). The
// content tile sizes placed inside these bands (tileStyles.ts's Phase 7
// constants) are correspondingly the same at every tileScale — there simply
// isn't slack in this geometry for tileScale to buy anything (the side
// seat column is width-bound with only a few px of margin; see
// stageLayout.test.ts's slack assertion).
export type SeatRole = 'west' | 'north' | 'east'

export interface SeatLineRegion {
  // The seat's identity band (wind letter + dealer/turn badge + match
  // score), centered on that seat's own wood rail (RAIL_PX). For west/east
  // this is the full-height side rail and is drawn ROTATED — see
  // headerRotation, and SIDE HEADER PLACEMENT below.
  header: Rect
  // Degrees to rotate the header's content by. `header` is always the
  // POST-rotation on-screen footprint, so a consumer passes it to
  // Positioned verbatim (Positioned swaps the box's own axes itself when
  // the rotation is an odd multiple of 90°, so the text still lays out
  // along the band's long axis before being spun onto it).
  //
  // -90 on the left edge / +90 on the right edge is the usual outward
  // convention: the left label reads bottom-to-top, the right one
  // top-to-bottom, so neither ends up upside down.
  headerRotation: 0 | 90 | -90
  // Hand (backs for a bot) + melds + flowers together, one continuous
  // line — a fixed 3-column grid for west/east, a single row for north.
  line: Rect
}

export interface DiscardZoneRegions {
  // Ordered west -> you -> north -> east (KICKOFF's own deliberate choice:
  // "west and east zones sit on their own side; the middle two are the
  // seats without a side"), NOT necessarily left-to-right screen order for
  // every seat's own throws — labels are the attribution mechanism.
  west: Rect
  you: Rect
  north: Rect
  east: Rect
}

export interface WallRingRegions {
  top: Rect
  bottom: Rect
  left: Rect
  right: Rect
}

export interface BoardRegions {
  human: { header: Rect; row: Rect }
  north: SeatLineRegion
  west: SeatLineRegion
  east: SeatLineRegion
  discards: DiscardZoneRegions
  wall: WallRingRegions
}

// Vertical bands (top to bottom), fixed regardless of designWidth — sum to
// STAGE_HEIGHT exactly: 14 + 60 + 24 + 520 + 24 + 140 + 14 = 796.
// NORTH_LINE_H and FIELD_H were both grown (from 54/498) to make room for
// SEAT_LINE_PX's own >=10% bump (tileStyles.ts) without re-clamping bot
// tiles back down to their old rendered size — see that constant's comment.
// The wood table rail — TableSurface.tsx insets its green felt by exactly
// this much on all four sides, so the outermost RAIL_PX of the stage is
// visible rail on every edge. Every seat's identity band rides that rail
// (see SIDE HEADER PLACEMENT below): the top and bottom bands already did,
// by way of HEADER_H happening to equal it, and this constant makes that
// relationship explicit rather than a coincidence two files apart. Do NOT
// change one without the other — the labels are placed against this value
// but the rail is actually drawn by TableSurface's Tailwind class.
export const RAIL_PX = 14

const HEADER_H = RAIL_PX
const NORTH_LINE_H = 60
const WALL_H = 24
const FIELD_H = 520
const HUMAN_ROW_H = 140
const RING_GAP = 4

const NORTH_HEADER_Y = 0
const NORTH_LINE_Y = NORTH_HEADER_Y + HEADER_H
const WALL_TOP_Y = NORTH_LINE_Y + NORTH_LINE_H
const FIELD_Y = WALL_TOP_Y + WALL_H
const WALL_BOTTOM_Y = FIELD_Y + FIELD_H
const HUMAN_ROW_Y = WALL_BOTTOM_Y + WALL_H
const HUMAN_HEADER_Y = HUMAN_ROW_Y + HUMAN_ROW_H

// West/east seat lines run independently of the header/north/wall/field/
// human vertical stack above — they own the full left/right edge from just
// under their own header down to the wall ring's own top edge (WALL_BOTTOM_Y),
// and stop there deliberately (KICKOFF: "must not run into the human row" —
// this is what lets the human row claim the full board width beneath them
// without a corner conflict).
//
// Widened from 144 (just enough over SEAT_LINE_PX's new 3-column worst-case
// width, 3*49+2*4=155, to keep real slack) — capped just below 158, the
// point past which the center field's own worst-case discard-zone width
// (designWidth=1768, 5*67+4*4=351) would no longer fit its own quarter of
// the shrunk field (stageLayout.test.ts's own worst-case-occupancy test).
const SIDE_WIDTH = 156
// Was the side seats' own header band (a 156x14 rect in the top corner,
// which is why E/W used to read as floating in the corners rather than
// belonging to their seat). The header moved onto the rail (see SIDE HEADER
// PLACEMENT); what's left here is just the top inset that kept the side line
// clear of it, retained so the side line's own geometry — asserted directly
// by the golden/capacity tests — doesn't move.
const SIDE_LINE_TOP_INSET = HEADER_H + RING_GAP
const SIDE_LINE_Y = SIDE_LINE_TOP_INSET
const SIDE_LINE_H = WALL_BOTTOM_Y - SIDE_LINE_Y

// SIDE HEADER PLACEMENT (referenced from SIDE_LINE_TOP_INSET above and from
// getBoardRegions' west/east entries below).
//
// All four seat bands ride the wood table rail (RAIL_PX), so they read as
// markings on the table edge rather than as floating chrome. Top and bottom
// get that for free — north.header is the stage's first 14px band and
// human.header its last, which ARE the top and bottom rail. The sides need
// an explicit rect: the outermost RAIL_PX of each side, full stage height,
// rotated so the label runs along the edge.
//
// KNOWN COLLISION, not silently dropped (tracked by the
// 'side rail label vs. side seat tiles' test below). The side seat line
// starts at x=0 — it always overlapped the left rail — and is width-bound:
// SIDE_WIDTH=156 against a worst-case 3-column line of 3*49+2*4=155, i.e.
// ~1px of slack. So the fix is NOT available in this geometry:
//   - carving a 14px label strip out of the column drops the line to 142px,
//     which shrinks bot tiles from 49px to ~44px and undoes SEAT_LINE_PX's
//     own deliberate >=10% legibility bump;
//   - widening SIDE_WIDTH by 14 to 170 pushes the field's own worst-case
//     discard zone from 352px to 345px, below the 351px it needs.
// The side line is column-major over 9 rows, so it only reaches 3 columns
// (and therefore the rail) at 19+ tiles — 4 kongs, or heavy flowers. Below
// that it centers at 2 columns and leaves 27px of clear rail. Seat.tsx
// renders the band AFTER the line so the label stays legible on top when a
// 19+ tile hand does reach it.

const ZONE_LABEL_H = 20
export const DISCARD_ZONE_GRID_COLUMNS = 5

function centerFieldGeometry(designWidth: number) {
  const x = SIDE_WIDTH + WALL_H
  const width = designWidth - 2 * (SIDE_WIDTH + WALL_H)
  return { x, width }
}

const boardRegionsCache = new Map<number, BoardRegions>()

// Pure function of designWidth alone (see the module comment above for why
// tileScale doesn't enter into it). Memoised the same way getSeatRegions
// used to be — GameStage's ResizeObserver fires continuously while a window
// is being dragged, and this is called every render of every seat-line
// consumer.
export function getBoardRegions(designWidth: number): BoardRegions {
  const cached = boardRegionsCache.get(designWidth)
  if (cached) return cached

  const { x: fieldX, width: fieldWidth } = centerFieldGeometry(designWidth)
  const zoneWidth = fieldWidth / 4

  const zoneRect = (index: number): Rect => ({ x: fieldX + index * zoneWidth, y: FIELD_Y, width: zoneWidth, height: FIELD_H })

  const result: BoardRegions = {
    human: {
      row: { x: 0, y: HUMAN_ROW_Y, width: designWidth, height: HUMAN_ROW_H },
      header: { x: 0, y: HUMAN_HEADER_Y, width: designWidth, height: HEADER_H },
    },
    north: {
      header: { x: fieldX, y: NORTH_HEADER_Y, width: fieldWidth, height: HEADER_H },
      headerRotation: 0,
      line: { x: fieldX, y: NORTH_LINE_Y, width: fieldWidth, height: NORTH_LINE_H },
    },
    west: {
      header: { x: 0, y: 0, width: RAIL_PX, height: STAGE_HEIGHT },
      headerRotation: -90,
      line: { x: 0, y: SIDE_LINE_Y, width: SIDE_WIDTH, height: SIDE_LINE_H },
    },
    east: {
      header: { x: designWidth - RAIL_PX, y: 0, width: RAIL_PX, height: STAGE_HEIGHT },
      headerRotation: 90,
      line: { x: designWidth - SIDE_WIDTH, y: SIDE_LINE_Y, width: SIDE_WIDTH, height: SIDE_LINE_H },
    },
    discards: {
      west: zoneRect(0),
      you: zoneRect(1),
      north: zoneRect(2),
      east: zoneRect(3),
    },
    wall: {
      top: { x: fieldX, y: WALL_TOP_Y, width: fieldWidth, height: WALL_H },
      bottom: { x: fieldX, y: WALL_BOTTOM_Y, width: fieldWidth, height: WALL_H },
      left: { x: SIDE_WIDTH, y: FIELD_Y, width: WALL_H, height: FIELD_H },
      right: { x: designWidth - SIDE_WIDTH - WALL_H, y: FIELD_Y, width: WALL_H, height: FIELD_H },
    },
  }
  boardRegionsCache.set(designWidth, result)
  return result
}

// Splits a discard zone's full rect (KICKOFF: "20px label band, then a
// grid") into the two sub-rects DiscardField.tsx actually renders into.
export function splitDiscardZone(zone: Rect): { label: Rect; grid: Rect } {
  return {
    label: { x: zone.x, y: zone.y, width: zone.width, height: ZONE_LABEL_H },
    grid: { x: zone.x, y: zone.y + ZONE_LABEL_H, width: zone.width, height: zone.height - ZONE_LABEL_H },
  }
}
