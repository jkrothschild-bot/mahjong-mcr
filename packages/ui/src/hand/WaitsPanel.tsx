import { computeWaits, type Hand, type Wind } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'

export interface WaitsPanelProps {
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
}

// SPEC.md §9's ready-hand/waits display: once the hand is exactly one tile
// from complete (shanten 0), show exactly which tile(s) complete it and
// what each would score — the single highest-value addition for a learner
// beyond the original scope ("am I even close, and to what"). Reuses the
// shanten engine directly via computeWaits (M4), which is why this is
// bundled into M4 rather than M5. Renders nothing outside tenpai.
export function WaitsPanel({ hand, prevailingWind, seatWind }: WaitsPanelProps) {
  const waits = computeWaits(hand.concealedTiles, hand.melds, { prevailingWind, seatWind })
  if (waits.length === 0) return null

  return (
    <div
      data-testid="waits-panel"
      role="region"
      aria-label="Ready hand — waits"
      className="flex flex-col gap-2 rounded-lg border border-sky-700 bg-sky-950/30 p-3 text-sm"
    >
      <h3 className="font-semibold text-sky-300">Ready hand — waiting on</h3>
      <div className="flex flex-wrap gap-3">
        {waits.map((wait) => (
          <div key={wait.tileType} data-testid={`wait-${wait.tileType}`} className="flex items-center gap-2">
            <div className={tileFaceCompactClassName()}>
              <TileFaceContent typeId={wait.tileType} />
            </div>
            <div className="flex flex-col text-xs leading-tight text-neutral-300">
              <span className="font-medium text-neutral-100">{tileDisplayName(wait.tileType)}</span>
              <span>{wait.discardScore.basicPoints} pts if claimed</span>
              <span>{wait.selfDrawScore.basicPoints} pts if self-drawn</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
