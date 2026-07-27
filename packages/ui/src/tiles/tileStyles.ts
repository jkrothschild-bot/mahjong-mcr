// Shared tile-box presentation, used by every place a tile (or a tile back)
// renders: the hand, discard rivers, melds, and the tile inspector's
// highlight state. Centralized so all these renderers read as the "same
// game," not a patchwork of independently-styled boxes.
export const TILE_BOX_BASE =
  'flex min-h-11 min-w-11 select-none items-center justify-center rounded-md border px-2 py-3 text-sm font-semibold'

export const TILE_FACE_CLASSES = 'border-neutral-500 bg-neutral-100 text-neutral-900'

// Concealed bot tile back — deliberately distinct from both the wall's own
// back styling (Phase 2 doesn't render a physical wall stack, only a count)
// and the face styling, per SPEC.md §5's "clear physical separation, never
// similar enough to require guessing."
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
  opts: { highlighted?: boolean; dimmed?: boolean; justDrawn?: boolean; extra?: string } = {},
): string {
  return [
    TILE_BOX_BASE,
    TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : opts.justDrawn ? TILE_JUST_DRAWN_RING_CLASSES : '',
    opts.justDrawn ? TILE_JUST_DRAWN_LIFT_CLASSES : '',
    opts.dimmed ? 'opacity-40' : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function tileBackClassName(): string {
  return [TILE_BOX_BASE, TILE_BACK_CLASSES].join(' ')
}

// A bot's concealed hand is never interactive (nothing to tap — the tiles
// are hidden), so it's exempt from the ≥44px touch-target rule that
// tileBackClassName's shared TILE_BOX_BASE enforces for real controls. A
// compact, wrapping back keeps 13-14 tiles from forcing the whole board
// wider than an iPad viewport (SPEC.md §5a/§5b) the way one un-wrapped row
// of full-size boxes did.
export function tileBackCompactClassName(): string {
  return 'flex h-8 w-6 shrink-0 select-none items-center justify-center rounded border text-xs font-semibold border-indigo-900 bg-indigo-950 text-indigo-200'
}

// A discard river's job is to show what's already been played, not to
// invite interaction the way a hand tile does — its click-to-inspect
// (SPEC.md §5's tile inspector) is a secondary bonus on top of that, not
// the reason it exists. That earns it the same compact-and-exempt-from-
// 44px treatment as tileBackCompactClassName above, sized a touch wider to
// keep 2-character labels (WE, DR, C5) legible. A discard river that grows
// to 10+ tiles at full hand-tile size was consuming a lot of vertical
// space across every seat's panel.
export function tileFaceCompactClassName(opts: { highlighted?: boolean; extra?: string } = {}): string {
  return [
    'flex h-8 w-7 shrink-0 select-none items-center justify-center rounded border text-xs font-semibold',
    TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}
