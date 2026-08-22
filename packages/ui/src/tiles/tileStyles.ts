// Shared tile-box presentation, used by every place a tile (or a tile back)
// renders: the hand, discard rivers, melds, and the tile inspector's
// highlight state. Centralized so all these renderers read as the "same
// game," not a patchwork of independently-styled boxes.
import type { TileScale } from '../settings/useSettings.js'

// Fixed-size + overflow-hidden (rather than the old min-size/padding box)
// so real tile-face art (TileFaceContent) renders as a clean, contained
// image; text-sm/font-semibold still matter for the text fallback
// (flowers/seasons — no art yet).
//
// Three literal size variants (not a computed/interpolated value) per
// SPEC.md §8's tile-size setting — Tailwind's JIT scanner needs each full
// class string present in source, so these can't be built from a numeric
// scale factor at runtime.
//
// These are the tile's NOMINAL per-tileScale size — the biggest a tile is
// ever allowed to render at that setting. HandTiles.tsx (Phase 2.2's
// shrink-to-fit, KICKOFF-phase2-2-hand-fit.md) can render hand tiles
// *smaller* than this on a cramped viewport, via an inline width/height
// style that overrides these classes (Tailwind's JIT can't generate an
// arbitrary-value class from a runtime number, so the override has to be
// inline, not a class swap) — down to HAND_TILE_WIDTH_FLOOR below, never
// upscaled past the values here. Melds/discards/flowers/backs never
// override these; only the human hand row does.
const TILE_BOX_SIZE: Record<TileScale, string> = {
  normal: 'h-[5.75rem] w-[3.75rem]',
  large: 'h-[7.25rem] w-[4.75rem]',
}

// Numeric px twins of the class maps above (16px root em) — the game stage
// (packages/ui/src/stage/stageLayout.ts) needs real numbers to compute tile
// positions, but Tailwind's JIT scanner needs literal class strings, so
// these can't be derived from one another. Keep both in sync by hand; a
// mismatch only shows up visually (positions computed slightly off from the
// actual rendered box), not as a type error, so double-check both when
// touching either.
export const TILE_BOX_PX: Record<TileScale, { width: number; height: number }> = {
  normal: { width: 60, height: 92 },
  large: { width: 76, height: 116 },
}

// Phase 2.2 step 4's (KICKOFF-phase2-2-hand-fit.md) shrink-to-fit floor for
// the human hand row (stageLayout.ts's fitRowTileWidth) — how narrow a
// `large` tile is allowed to get on a cramped viewport before
// HandTiles falls back to wrapping instead of continuing to shrink. Must
// stay above TILE_BOX_PX.normal.width (60): every tileScale setting is
// rendered under the SAME shared stage `scale` (StageMetricsContext), so as
// long as this floor's design-space width exceeds normal's, raising
// tileScale from normal can never render smaller tiles than normal at any
// viewport — the bug Phase 2 found ("raising tileScale currently makes
// tiles smaller"). 64 is a deliberate, modest 4px/6.7% floor above that
// 60px baseline: real headroom for the invariant, not tuned to any one
// viewport's projected outcome.
export const HAND_TILE_WIDTH_FLOOR = 64

// `relative` + `perspective` give every tile box a positioning/3D context
// for Tile3DFace's internal object/front/bottom-edge layers (see that file);
// the directional shadow grounds it on the table. Both are purely additive
// — the box's own h/w footprint is unchanged, so this can't affect the
// already-razor-thin iPad viewport budget documented below.
const TILE_3D_CONTEXT = 'relative [perspective:500px] shadow-[2px_3px_4px_rgba(0,0,0,0.35)]'

function tileBoxBase(scale: TileScale): string {
  return `flex ${TILE_BOX_SIZE[scale]} shrink-0 select-none items-center justify-center overflow-hidden rounded-md border text-sm font-semibold ${TILE_3D_CONTEXT}`
}

export const TILE_FACE_CLASSES = 'border-neutral-500 bg-neutral-100 text-neutral-900'

// Concealed bot tile back — deliberately distinct from both the wall
// stack's own back styling (WallCounter.tsx) and the face styling, per
// SPEC.md §5's "clear physical separation, never similar enough to require
// guessing."
export const TILE_BACK_CLASSES =
  'border-[#d6c28e] bg-[#0b4b50] text-teal-100 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.22),inset_-1px_-2px_2px_rgba(0,18,20,0.5),2px_3px_4px_rgba(0,0,0,0.4)]'

export const TILE_HIGHLIGHT_CLASSES = 'ring-4 ring-amber-300 shadow-[0_0_18px_rgba(253,230,138,0.72)]'
export const TILE_SELECTED_LIFT_CLASSES = '-translate-y-2 shadow-[2px_8px_10px_rgba(0,0,0,0.48)] transition-[transform,box-shadow]'

// The tile the player just drew sits physically apart from the rest of a
// real hand until they decide what to do with it — a distinct ring color
// (never amber, so it can't be confused with an explicit selection/tile-
// inspector match) plus a slight lift communicates "this one's new" without
// requiring a click to find out, per SPEC.md §5a item 4 ("what's in my
// hand" answerable at a glance) and §5c's tactile-lift precedent for
// selection. A static transform, not an animation (CLAUDE.md/PLAN.md defer
// tile-movement animation).
export const TILE_JUST_DRAWN_RING_CLASSES = 'ring-2 ring-sky-400'
export const TILE_JUST_DRAWN_LIFT_CLASSES = '-translate-y-1'

// The tile that actually completed the winning hand, marked at reveal —
// without it, a hand won off a discard looks broken (the claimed tile lives
// in the discarder's river, so one of the winner's groups renders a tile
// short; the live case: a Pure Shifted Chows win showing "6,7" where 5-6-7
// should be). At reveal the tile is drawn WITH the winner's hand (as on a
// real table, where the claimed discard is laid with the hand) and carries
// this ring. Emerald: amber already means inspector-highlight and sky means
// just-drawn, and this must read as neither.
export const WINNING_TILE_RING_CLASSES = 'ring-2 ring-emerald-400'

export function tileFaceClassName(
  opts: { highlighted?: boolean; selected?: boolean; dimmed?: boolean; justDrawn?: boolean; extra?: string; scale?: TileScale } = {},
): string {
  return [
    tileBoxBase(opts.scale ?? 'normal'),
    TILE_FACE_CLASSES,
    opts.selected || opts.highlighted ? TILE_HIGHLIGHT_CLASSES : opts.justDrawn ? TILE_JUST_DRAWN_RING_CLASSES : '',
    opts.selected ? TILE_SELECTED_LIFT_CLASSES : opts.justDrawn ? TILE_JUST_DRAWN_LIFT_CLASSES : '',
    opts.dimmed ? 'opacity-40' : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

// ---------------------------------------------------------------------------
// KICKOFF-phase9-human-melds.md — the human hand's own melds were rendering
// through tileFaceClassName, identical in every way to concealed tiles
// except a 12px gap. Items 1-3 give a meld its own look: laid flat on the
// table (lower baseline, flatter shadow) with a recessed shelf underneath —
// human seat only (bot seats already read fine: indigo backs vs. neutral
// faces already carries the concealed/exposed distinction there).
//
// Same box footprint as tileFaceClassName/TILE_BOX_SIZE (this must NOT
// change the row's width solve — fitRowTileWidth/packGroupsMajor only ever
// see `tileWidth`/`tileHeight`, computed once and shared by concealed AND
// meld tiles alike). Only the 3D-context shadow and border differ.
const MELD_TILE_3D_CONTEXT = 'relative [perspective:500px] shadow-[1px_1px_2px_rgba(0,0,0,0.3)]'
const MELD_TILE_FACE_CLASSES = 'border-neutral-600 bg-neutral-100 text-neutral-900'

function meldTileBoxBase(scale: TileScale): string {
  return `flex ${TILE_BOX_SIZE[scale]} shrink-0 select-none items-center justify-center overflow-hidden rounded-md border text-sm font-semibold ${MELD_TILE_3D_CONTEXT}`
}

export function meldTileFaceClassName(opts: { highlighted?: boolean; extra?: string; scale?: TileScale } = {}): string {
  return [meldTileBoxBase(opts.scale ?? 'normal'), MELD_TILE_FACE_CLASSES, opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '', opts.extra ?? '']
    .filter(Boolean)
    .join(' ')
}

// Item 4's concealed-kong outer two tiles, at full human-hand size (unlike
// seatLineBackClassName's compact bot-seat size) — same flattened meld
// shadow/border as meldTileFaceClassName above, TILE_BACK_CLASSES fill.
export function meldBackTileClassName(opts: { highlighted?: boolean; extra?: string; scale?: TileScale } = {}): string {
  return [meldTileBoxBase(opts.scale ?? 'normal'), TILE_BACK_CLASSES, opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '', opts.extra ?? '']
    .filter(Boolean)
    .join(' ')
}

// Item 1: melds sit on a lower baseline than concealed tiles — held up
// toward the player vs. laid flat on the table. Applied as a CSS transform
// on the meld tile's own div (HandTiles.tsx), never by touching
// packGroupsMajor/placeGroup's own math (stageLayout.ts's geometry is
// covered by golden tests, and the row's width solve must stay untouched).
//
// Solved separately per tileScale against HUMAN_ROW_H's (140px) real
// vertical slack, not one number for both: `normal`'s 92px-tall tile leaves
// 48px total (24 above/below center); `large`'s 116px-tall tile leaves only
// 24px (12 above/below) — reusing normal's 10px at large would leave just
// 6px before the tile's bottom edge reaches the human header band
// immediately below the row. Deliberately a different magnitude than
// TILE_JUST_DRAWN_LIFT_CLASSES's -translate-y-1 (4px) so the two cues (just
// drawn vs. melded) can't be confused for each other.
export const MELD_BASELINE_OFFSET_PX: Record<TileScale, number> = {
  normal: 10,
  large: 6,
}

// Item 2: a recessed shelf behind each meld — darker fill, inner shadow,
// sized to that meld's own tiles by the caller (HandTiles.tsx derives the
// rect from meldPlaced, not from anything here). Background only, rendered
// as its own Positioned sibling BEFORE the meld's tiles in DOM order (these
// are absolutely-positioned siblings with no z-index) — adds zero width
// demand of its own.
export const MELD_SHELF_CLASSES =
  'rounded-md border border-[#351708] bg-[repeating-linear-gradient(7deg,rgba(255,218,155,0.05)_0_1px,transparent_1px_5px),linear-gradient(180deg,#8b4d25,#54250f_68%,#351508)] shadow-[inset_0_3px_2px_rgba(255,211,145,0.3),inset_0_-5px_6px_rgba(24,8,2,0.66),0_4px_7px_rgba(0,0,0,0.42)]'

// Small-icon compact size — still used by the hint tabs (BestMoveTab,
// TileSafetyTab, WaitsPanel), which render a handful of tiles inline in
// prose/panel UI, not on the stage. Board rendering (discard field, seat
// lines) moved to its own Phase 7 sizing below — this one predates that
// split and is unrelated to it now.
const TILE_FACE_COMPACT_SIZE: Record<TileScale, string> = {
  normal: 'h-[59.4px] w-[48.4px]',
  large: 'h-[59.4px] w-[48.4px]',
}

// Numeric px twin of TILE_FACE_COMPACT_SIZE — see TILE_BOX_PX's comment.
export const TILE_FACE_COMPACT_PX: Record<TileScale, { width: number; height: number }> = {
  normal: { width: 48.4, height: 59.4 },
  large: { width: 48.4, height: 59.4 },
}

export function tileFaceCompactClassName(
  opts: { highlighted?: boolean; extra?: string; scale?: TileScale } = {},
): string {
  return [
    `flex ${TILE_FACE_COMPACT_SIZE[opts.scale ?? 'normal']} shrink-0 select-none items-center justify-center overflow-hidden rounded border text-xs font-semibold`,
    TILE_3D_CONTEXT,
    TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

// ---------------------------------------------------------------------------
// Phase 7 (KICKOFF-phase7-board-rebuild.md) board tile sizes — the shared
// discard field's 5x5-per-zone grid, and every seat line's hand(backs)/
// meld/flower content. Neither varies by tileScale: the geometry they sit
// in (stageLayout.ts's getBoardRegions) is a fixed design-px constant, and
// there isn't slack in it for a larger tileScale to buy anything (the west/
// east seat column is width-bound with only a few px of margin — see
// stageLayout.test.ts's slack assertion). Kept as Record<TileScale, ...>
// for API consistency with TILE_BOX_PX/TILE_FACE_COMPACT_PX above (and so
// the "monotonic non-decreasing across tileScale" test has something real
// to assert, even though every entry here is currently equal) rather than
// a bare constant.
// These are NOMINAL (ceiling) sizes, not the literal render size — Phase 7's
// discard field width is a function of designWidth (getBoardRegions' anchor
// policy grows/shrinks the center field; only the reference designWidth,
// 1768, actually achieves this nominal). stageLayout.ts's fitGridTileWidth
// solves the real per-designWidth size against these as the cap; callers
// pass its result as an inline style, same pattern HandTiles.tsx already
// uses for the human hand row's own shrink-to-fit.
export const DISCARD_FIELD_PX: Record<TileScale, { width: number; height: number }> = {
  normal: { width: 65, height: 75.2 },
  large: { width: 65, height: 75.2 },
}
// Below this, a discard/seat-line tile is no longer worth calling
// "compact" — a floor of last resort for extreme narrow designWidths, not
// a value normally reached (see stageLayout.test.ts's own designWidth-range
// property test for the actual achieved range).
export const DISCARD_FIELD_WIDTH_FLOOR = 28

const DISCARD_FIELD_SIZE: Record<TileScale, string> = {
  normal: 'h-[75.2px] w-[65px]',
  large: 'h-[75.2px] w-[65px]',
}

export function discardFieldTileClassName(
  opts: { highlighted?: boolean; extra?: string; scale?: TileScale } = {},
): string {
  return [
    `flex ${DISCARD_FIELD_SIZE[opts.scale ?? 'normal']} shrink-0 select-none items-center justify-center overflow-hidden rounded border text-sm font-semibold`,
    TILE_3D_CONTEXT,
    TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

// Nominal (ceiling) size — north's seat line shares the field's own
// designWidth-dependent width (west/east's own width happens to be a true
// constant, SIDE_WIDTH, so theirs is safe as a fixed value regardless, but
// solving it through the same fitGridTileWidth call keeps every seat line
// on one code path rather than two). See DISCARD_FIELD_PX's own comment.
//
// Bumped >=10% over the original 44x54 (49/44 = +11.4%, 60/54 = +11.1%) so
// bot hands/melds read more clearly — stageLayout.ts's compact bot regions
// hold the real 18-tile playing maximum in a west/east 2x9 grid or one
// north row. Flowers use their own compact tray and therefore do not force
// these full-size tiles back down to the old size.
export const SEAT_LINE_PX: Record<TileScale, { width: number; height: number }> = {
  normal: { width: 65, height: 80 },
  large: { width: 65, height: 80 },
}
export const SEAT_LINE_WIDTH_FLOOR = 28

const SEAT_LINE_SIZE: Record<TileScale, string> = {
  normal: 'h-[80px] w-[65px]',
  large: 'h-[80px] w-[65px]',
}

export function seatLineFaceClassName(
  opts: { highlighted?: boolean; extra?: string; scale?: TileScale } = {},
): string {
  return [
    `flex ${SEAT_LINE_SIZE[opts.scale ?? 'normal']} shrink-0 select-none items-center justify-center overflow-hidden rounded border text-xs font-semibold`,
    TILE_3D_CONTEXT,
    TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

// Bot-seat counterpart of meldTileFaceClassName. Only needed once a hand is
// REVEALED: mid-hand a bot's concealed tiles are indigo backs, so face vs.
// back already carries the melded/concealed distinction on its own. At reveal
// every tile turns face-up and that distinction disappears — which is exactly
// when a bot's melds stop being identifiable, since (unlike the human row)
// the seat line has no MELD_GAP either; it's one uniform TILE_GAP throughout.
//
// Same footprint as seatLineFaceClassName (SEAT_LINE_SIZE): the seat line's
// own fit solve sizes every tile identically and must not see a difference.
// Only the shadow and border change.
const SEAT_LINE_MELD_3D_CONTEXT = 'relative [perspective:500px] shadow-[1px_1px_2px_rgba(0,0,0,0.3)]'

export function seatLineMeldFaceClassName(
  opts: { highlighted?: boolean; extra?: string; scale?: TileScale } = {},
): string {
  return [
    `flex ${SEAT_LINE_SIZE[opts.scale ?? 'normal']} shrink-0 select-none items-center justify-center overflow-hidden rounded border text-xs font-semibold`,
    SEAT_LINE_MELD_3D_CONTEXT,
    MELD_TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

// The seat-line shelf's own padding, deliberately 2 and not HandTiles'
// 4/3: 2px on each side consumes EXACTLY the 4px inter-tile gap, so a shelf
// meets its neighbour's edge without overlapping the adjacent tile. The seat
// line has no room for more — the west/east column is width-bound (156px
// against a 155px worst-case 3-column line) and north's band is exactly one
// tile tall.
export const SEAT_LINE_MELD_SHELF_PAD_PX = 2

// How far a revealed bot meld is nudged perpendicular to its own seat line,
// the compact counterpart of MELD_BASELINE_OFFSET_PX.
//
// Small (4px) because neither bot region has real slack: north's band is
// 60px for a 60px tile, and the side column's 3-column worst case leaves
// ~1px. Direction is always TOWARD THE TABLE CENTRE (Seat.tsx derives the
// sign from the seat's role), for two reasons: it reads as the meld being
// pushed out onto the table, which is what melding physically is; and it
// moves away from the wood rail, where that seat's own identity label sits.
//
// At the usual occupancy the side column uses 2 of its 3 columns and has
// ~27px spare, so this is invisible-cost in practice. In the documented 19+
// tile worst case it can graze the decorative wall ring — the same trade
// already recorded for the rail labels in SPEC.md §5b.
export const SEAT_LINE_MELD_SHIFT_PX = 4

// `highlighted`/`extra` (both unused before KICKOFF-phase9-human-melds.md
// item 4) let a concealed kong's face-down outer tiles stay interactive —
// the tile inspector must keep working on them: a kong is always 4 identical
// tiles, so the meld's other 2 (always face-up) already reveal the type,
// meaning treating the back tiles as inert would just be an inconsistent
// gap, not an actual information-hiding measure. A genuinely concealed hand
// tile (this function's other caller) never passes either option — it has
// no onClick to begin with.
export function seatLineBackClassName(opts: { highlighted?: boolean; extra?: string; scale?: TileScale } = {}): string {
  return [
    `flex ${SEAT_LINE_SIZE[opts.scale ?? 'normal']} shrink-0 select-none items-center justify-center overflow-hidden rounded border text-xs font-semibold`,
    TILE_3D_CONTEXT,
    TILE_BACK_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}
