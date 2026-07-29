import { drawableRemaining, type Wall } from '@mahjong-mcr/engine'

export interface WallCounterProps {
  wall: Wall
}

const WALL_STACK_TILE_COUNT = 7

// A small decorative row of tile-back rectangles, tilted via CSS 3D
// (perspective + preserve-3d + rotateX) so the strip reads as a wall
// segment lying on the table rather than a flat 2D bar chart — the "genuine
// 3D depth" ask, scoped down to fit this pill's existing ~32px height
// budget (a literal table-wide wall, like the reference screenshot, would
// blow the iPad viewport's well-documented zero-slack budget). Purely
// decorative (aria-hidden) — it doesn't attempt to depict the exact count;
// the text next to it does that job.
function WallStack() {
  return (
    <div aria-hidden="true" className="flex items-end [perspective:220px]">
      <div className="flex gap-0.5 [transform-style:preserve-3d] [transform-origin:bottom] [transform:rotateX(15deg)]">
        {Array.from({ length: WALL_STACK_TILE_COUNT }, (_, i) => (
          <div
            key={i}
            className="h-5 w-2.5 shrink-0 rounded-[2px] border border-amber-950/60 bg-gradient-to-b from-[#d8b378] to-[#a8763f] shadow-[1px_1.5px_2px_rgba(0,0,0,0.4)]"
          />
        ))}
      </div>
    </div>
  )
}

// Single-line (not stacked) to keep this chrome row compact — see
// WindIndicator's identical note on why (found via live play: two-line
// chrome pills here were part of what pushed the board past the iPad
// viewport's height budget, SPEC.md §5a's hard no-scroll rule).
export function WallCounter({ wall }: WallCounterProps) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm">
      <WallStack />
      <span className="text-neutral-400">Wall</span>
      <span data-testid="wall-count" className="font-mono font-semibold">
        {drawableRemaining(wall)}
      </span>
    </div>
  )
}
