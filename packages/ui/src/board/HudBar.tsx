import type { Hand, Wind } from '@mahjong-mcr/engine'
import { FanTrackerPanel } from '../hand/FanTrackerPanel.js'
import type { SortMode } from '../hand/handOrder.js'
import { SortToolbar } from '../hand/SortToolbar.js'
import { WaitsPanel } from '../hand/WaitsPanel.js'

export interface HudBarProps {
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
  onSort: (mode: SortMode) => void
  canDiscard: boolean
  onRequestDiscard: () => void
}

// The human player's always-visible controls + info, below the stage.
// M8 Step 1 relocated these out of the removed per-seat panel into a bare
// row; Step 2 gives Sort/Discard the same chrome-pill treatment the header
// (WindIndicator/WallCounter/TileInspector) already uses, so the whole app
// reads as one consistent HUD language rather than a patchwork. FanTracker/
// WaitsPanel already have their own distinct card styling (colored borders
// carry meaning there) and keep it unchanged.
export function HudBar({ hand, prevailingWind, seatWind, onSort, canDiscard, onRequestDiscard }: HudBarProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 px-2 pb-1">
      <FanTrackerPanel hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} />
      <WaitsPanel hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} />
      <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 p-2">
        <SortToolbar onSort={onSort} />
        <button
          type="button"
          disabled={!canDiscard}
          onClick={onRequestDiscard}
          className="min-h-11 rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          Discard selected
        </button>
      </div>
    </div>
  )
}
