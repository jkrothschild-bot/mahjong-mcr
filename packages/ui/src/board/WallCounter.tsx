import { drawableRemaining, type Wall } from '@mahjong-mcr/engine'

export interface WallCounterProps {
  wall: Wall
}

// Single-line (not stacked) to keep this chrome row compact — see
// WindIndicator's identical note on why (found via live play: two-line
// chrome pills here were part of what pushed the board past the iPad
// viewport's height budget, SPEC.md §5a's hard no-scroll rule).
//
// The precise number complements the physical, state-backed WallRing in the
// stage: the ring teaches depletion spatially while this stays instantly
// readable at every responsive scale.
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
