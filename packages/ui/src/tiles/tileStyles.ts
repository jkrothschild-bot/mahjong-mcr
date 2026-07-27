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

export function tileFaceClassName(opts: { highlighted?: boolean; dimmed?: boolean; extra?: string } = {}): string {
  return [
    TILE_BOX_BASE,
    TILE_FACE_CLASSES,
    opts.highlighted ? TILE_HIGHLIGHT_CLASSES : '',
    opts.dimmed ? 'opacity-40' : '',
    opts.extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function tileBackClassName(): string {
  return [TILE_BOX_BASE, TILE_BACK_CLASSES].join(' ')
}
