import { assessTileSafety, type DangerLevel, type GameState, type Seat, type TileTypeId } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { computeUnseenCounts } from '../board/unseenCounts.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'

export interface TileSafetyTabProps {
  state: GameState
  forSeat: Seat
  selectedTypeId: TileTypeId | null
}

const LEVEL_STYLE: Record<DangerLevel, string> = {
  low: 'border-emerald-600 bg-emerald-950/40 text-emerald-300',
  medium: 'border-amber-600 bg-amber-950/40 text-amber-300',
  high: 'border-red-600 bg-red-950/40 text-red-300',
}

const LEVEL_LABEL: Record<DangerLevel, string> = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' }

// SPEC.md §6's Tile Safety tab: "visible-copy evidence and defensive
// reasoning for the selected tile" — reuses the M3 tile inspector's unseen-
// copy count and the M5 defense heuristic (assessTileSafety), doubling as
// the SPEC.md §9 defense/danger indicator rather than a separate feature.
// Selection is the SAME tile-inspector state used everywhere else on the
// board (lifted to App.tsx), so tapping a tile before opening the Hint
// panel already has this tab ready.
export function TileSafetyTab({ state, forSeat, selectedTypeId }: TileSafetyTabProps) {
  if (!selectedTypeId) {
    return <p className="text-sm text-neutral-400">Tap any tile on the board to see its safety here.</p>
  }

  const unseenCounts = computeUnseenCounts(state, forSeat)
  const unseen = unseenCounts[selectedTypeId] ?? 0
  const safety = assessTileSafety(state, forSeat, selectedTypeId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={tileFaceCompactClassName()}>
          <TileFaceContent typeId={selectedTypeId} />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-neutral-100">{tileDisplayName(selectedTypeId)}</p>
          <p className="text-neutral-300">{unseen} unseen of 4</p>
        </div>
      </div>

      <div data-testid="tile-safety-rating" className={`rounded-md border p-2 text-sm ${LEVEL_STYLE[safety.level]}`}>
        <p className="font-semibold uppercase tracking-wide">{LEVEL_LABEL[safety.level]}</p>
        <ul role="list" aria-label="Safety reasons" className="mt-1 flex flex-col gap-0.5 text-neutral-200">
          {safety.reasons.map((reason, i) => (
            <li key={i} role="listitem">
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
