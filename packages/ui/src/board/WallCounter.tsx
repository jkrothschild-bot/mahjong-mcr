import { drawableRemaining, type Wall } from '@mahjong-mcr/engine'

export interface WallCounterProps {
  wall: Wall
}

// Single-line (not stacked) to keep this chrome row compact — see
// WindIndicator's identical note on why (found via live play: two-line
// chrome pills here were part of what pushed the board past the iPad
// viewport's height budget, SPEC.md §5a's hard no-scroll rule).
//
// Plain text again as of M8 Step 1 — the decorative tile-back strip a
// previous pass added here moved into the stage itself (WallSegment.tsx),
// now that a real stage exists to give the wall an actual position rather
// than squeezing a stand-in into this header pill.
export function WallCounter({ wall }: WallCounterProps) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm">
      <span className="text-neutral-400">Wall</span>
      <span data-testid="wall-count" className="font-mono font-semibold">
        {drawableRemaining(wall)}
      </span>
    </div>
  )
}
