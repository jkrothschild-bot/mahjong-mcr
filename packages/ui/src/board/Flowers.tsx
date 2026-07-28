import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'

export interface FlowersProps {
  seat: number
  tiles: readonly TileInstanceId[]
  selectedTypeId?: string
  onTileClick?: (id: TileInstanceId) => void
}

// Flowers are drawn face-up and set aside immediately (never part of hand
// shape or concealment), unlike a meld or discard — but until now they
// were never rendered as tiles at all, only counted numerically on the
// score screen. Compact sizing (matches Discards): they're bonus info, not
// a primary interactive surface.
export function Flowers({ seat, tiles, selectedTypeId, onTileClick }: FlowersProps) {
  if (tiles.length === 0) return null
  return (
    <div role="list" aria-label={`Seat ${seat} flowers`} className="flex flex-wrap gap-1">
      {tiles.map((id) => {
        const typeId = typeIdOfInstance(id)
        return (
          <div
            key={id}
            data-tile-id={id}
            data-testid={`flower-tile-${id}`}
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
