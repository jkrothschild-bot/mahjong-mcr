import type { Hand, Wind } from '@mahjong-mcr/engine'
import { FanTrackerPanel } from '../hand/FanTrackerPanel.js'
import { WaitsPanel } from '../hand/WaitsPanel.js'

export interface HudBarProps {
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
}

// The human player's always-visible fan/waits info, directly below their
// hand. Everything else that used to live here (the Sort control, then a
// "Discard selected" button before that) has since moved onto the board
// itself: Sort now sits in the human row's own reserved slot next to the
// hand (Seat.tsx), and discarding is a double-click/drag directly on a
// tile. Both FanTrackerPanel and WaitsPanel render nothing when there's
// nothing noteworthy yet, so this row is usually near-zero height — letting
// GameStage (which measures its own available height from whatever's left
// in this flex column, GameStage.tsx's ResizeObserver) claim essentially
// all the remaining space, right to the bottom of the screen.
export function HudBar({ hand, prevailingWind, seatWind }: HudBarProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 px-2 pb-1">
      <FanTrackerPanel hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} />
      <WaitsPanel hand={hand} prevailingWind={prevailingWind} seatWind={seatWind} />
    </div>
  )
}
