// The one-time "how do I discard?" cue, shown beside the Sort button until
// the player has discarded for the first time.
//
// Why it lives inside the stage rather than in Board.tsx's chrome: GameStage
// measures whatever height is left over in Board's flex column, and
// computeDesignWidth derives designWidth from THAT element's aspect ratio.
// Anything added above or below the stage therefore changes designWidth,
// which changes getBoardRegions, which genuinely re-lays-out the discard
// field and every seat line — not merely scales them. A Positioned sibling
// inside the stage participates in no layout at all, so it cannot move a
// tile. (Same reason the seat identity bands live where they do.)
//
// It occupies Seat.tsx's own SORT_CONTROL slot, whose width is reserved from
// the hand row's budget UNCONDITIONALLY — reserved whether this hint is
// showing or not. That is the point: the reservation can't be conditional on
// visibility, or the hand row would re-solve and every tile would shift the
// moment the player made their first discard. CLAUDE.md's standing rule is
// that layout never reflows mid-hand.
export interface DiscardHintProps {
  // False once the player has discarded at least once this session — see
  // App.tsx's hasHumanDiscarded latch for why it's session-scoped and not
  // derived from the current hand's discard pile.
  visible: boolean
}

export function DiscardHint({ visible }: DiscardHintProps) {
  if (!visible) return null
  return (
    <div
      data-testid="discard-hint"
      // Not interactive and not a focus stop — it's a label, and it sits over
      // the felt where a stray pointer capture would be surprising.
      aria-hidden="true"
      className="pointer-events-none flex h-full w-full flex-col justify-center rounded-md border border-sky-400/40 bg-neutral-950/80 px-2 py-1 text-[10px] leading-tight text-sky-200"
    >
      <span>Double-click a tile to discard, or drag it to the discard area.</span>
      <span className="mt-1 text-sky-100">Tiles can be moved around your hand, using drag and drop.</span>
    </div>
  )
}
