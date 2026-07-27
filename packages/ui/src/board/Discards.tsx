import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'

export interface DiscardsProps {
  seat: number
  tiles: readonly TileInstanceId[]
  selectedTypeId?: string
  onTileClick?: (id: TileInstanceId) => void
}

// Fixed 6-column grid, new row after 6 — a hard rule (CLAUDE.md/SPEC.md §5),
// not a style choice: discards must never overlap, fan, or cascade.
export function Discards({ seat, tiles, selectedTypeId, onTileClick }: DiscardsProps) {
  return (
    <div
      role="list"
      aria-label={`Seat ${seat} discards`}
      className="grid grid-cols-6 gap-1"
    >
      {tiles.map((id) => {
        const typeId = typeIdOfInstance(id)
        return (
          <div
            key={id}
            data-tile-id={id}
            data-testid={`discard-tile-${id}`}
            role="listitem"
            onClick={onTileClick ? () => onTileClick(id) : undefined}
            className={tileFaceCompactClassName({
              highlighted: selectedTypeId === typeId,
              extra: onTileClick ? 'cursor-pointer' : undefined,
            })}
          >
            <TileFaceContent typeId={typeId} />
          </div>
        )
      })}
    </div>
  )
}
