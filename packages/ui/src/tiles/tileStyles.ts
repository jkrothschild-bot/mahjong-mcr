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
// The 'normal' size already fits a fresh 13-tile hand in one row with zero
// spare height at the 1024x768 iPad viewport (see Seat.tsx's comment on
// that). 'large'/'xlarge' don't preserve that — verified via Playwright
// that the human hand wraps to a second row and the page grows past one
// screenful. That's treated as an acceptable trade-off for an opt-in
// larger-tile accessibility mode (WCAG reflow: content growing and
// scrolling, not being clipped, is the expected behavior for scaled-up
// text/targets) rather than a bug to eliminate — SPEC.md §5a's "answerable
// at a glance, no scrolling" bar is written for the default size.
const TILE_BOX_SIZE: Record<TileScale, string> = {
  normal: 'h-[5.75rem] w-[3.75rem]',
  large: 'h-[7.25rem] w-[4.75rem]',
  xlarge: 'h-[8.75rem] w-[5.75rem]',
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
  xlarge: { width: 92, height: 140 },
}

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
export const TILE_BACK_CLASSES = 'border-indigo-900 bg-indigo-950 text-indigo-200'

export const TILE_HIGHLIGHT_CLASSES = 'ring-2 ring-amber-400'

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

export function tileFaceClassName(
  opts: { highlighted?: boolean; dimmed?: boolean; justDrawn?: boolean; extra?: string; scale?: TileScale } = {},
): string {
  return [
    tileBoxBase(opts.scale ?? 'normal'),
    TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : opts.justDrawn ? TILE_JUST_DRAWN_RING_CLASSES : '',
    opts.justDrawn ? TILE_JUST_DRAWN_LIFT_CLASSES : '',
    opts.dimmed ? 'opacity-40' : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

// A bot's concealed hand is never interactive (nothing to tap — the tiles
// are hidden), so it's exempt from the ≥44px touch-target rule that
// tileBoxBase enforces for real controls. A compact, wrapping back keeps
// 13-14 tiles from forcing the whole board wider than an iPad viewport
// (SPEC.md §5a/§5b) the way one un-wrapped row of full-size boxes did.
const TILE_BACK_COMPACT_SIZE: Record<TileScale, string> = {
  normal: 'h-11 w-8',
  large: 'h-14 w-10',
  xlarge: 'h-16 w-12',
}

// Numeric px twin of TILE_BACK_COMPACT_SIZE — see TILE_BOX_PX's comment.
export const TILE_BACK_COMPACT_PX: Record<TileScale, { width: number; height: number }> = {
  normal: { width: 32, height: 44 },
  large: { width: 40, height: 56 },
  xlarge: { width: 48, height: 64 },
}

export function tileBackCompactClassName(scale: TileScale = 'normal'): string {
  return [
    `flex ${TILE_BACK_COMPACT_SIZE[scale]} shrink-0 select-none items-center justify-center overflow-hidden rounded border text-xs font-semibold`,
    TILE_3D_CONTEXT,
    TILE_BACK_CLASSES,
  ].join(' ')
}

// A discard river's job is to show what's already been played, not to
// invite interaction the way a hand tile does — its click-to-inspect
// (SPEC.md §5's tile inspector) is a secondary bonus on top of that, not
// the reason it exists. That earns it the same compact-and-exempt-from-
// 44px treatment as tileBackCompactClassName above, sized a touch wider to
// keep 2-character labels (WE, DR, C5) legible. A discard river that grows
// to 10+ tiles at full hand-tile size was consuming a lot of vertical
// space across every seat's panel.
const TILE_FACE_COMPACT_SIZE: Record<TileScale, string> = {
  normal: 'h-11 w-9',
  large: 'h-14 w-11',
  xlarge: 'h-16 w-14',
}

// Numeric px twin of TILE_FACE_COMPACT_SIZE — see TILE_BOX_PX's comment.
export const TILE_FACE_COMPACT_PX: Record<TileScale, { width: number; height: number }> = {
  normal: { width: 36, height: 44 },
  large: { width: 44, height: 56 },
  xlarge: { width: 56, height: 64 },
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
