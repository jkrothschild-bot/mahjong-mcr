import { drawableRemaining, type Wall } from '@mahjong-mcr/engine'

export interface WallCounterProps {
  wall: Wall
}

export function WallCounter({ wall }: WallCounterProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2">
      <span className="text-sm text-neutral-400">Wall</span>
      <span data-testid="wall-count" className="font-mono text-2xl">
        {drawableRemaining(wall)}
      </span>
    </div>
  )
}
