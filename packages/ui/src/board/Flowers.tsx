import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { computeRowPositions, placeGroup, type Rect } from '../stage/stageLayout.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName, TILE_FACE_COMPACT_PX } from '../tiles/tileStyles.js'

const TILE_GAP = 4

export interface FlowersProps {
  seat: number
  tiles: readonly TileInstanceId[]
  region: Rect
  selectedTypeId?: string
  onTileClick?: (id: TileInstanceId) => void
}

// Flowers are drawn face-up and set aside immediately (never part of hand
// shape or concealment), unlike a meld or discard — but until now they
// were never rendered as tiles at all, only counted numerically on the
// score screen. Compact sizing (matches Discards): they're bonus info, not
// a primary interactive surface.
export function Flowers({ seat, tiles, region, selectedTypeId, onTileClick }: FlowersProps) {
  const { tileScale } = useSettingsContext()
  const { width: tileWidth, height: tileHeight } = TILE_FACE_COMPACT_PX[tileScale]
  if (tiles.length === 0) return null

  const layout = computeRowPositions(tiles.length, region, tileWidth, tileHeight, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)

  return (
    <div role="list" aria-label={`Seat ${seat} flowers`}>
      {tiles.map((id, index) => {
        const typeId = typeIdOfInstance(id)
        return (
          <Positioned
            key={id}
            layoutId={String(id)}
            x={placed[index]!.x}
            y={placed[index]!.y}
            naturalWidth={tileWidth}
            naturalHeight={tileHeight}
            scale={layout.scale}
          >
            <div
              data-tile-id={id}
              data-testid={`flower-tile-${id}`}
              role="listitem"
              onClick={onTileClick ? () => onTileClick(id) : undefined}
              className={tileFaceCompactClassName({
                highlighted: selectedTypeId === typeId,
                extra: onTileClick ? 'cursor-pointer' : undefined,
                scale: tileScale,
              })}
            >
              <TileFaceContent typeId={typeId} />
            </div>
          </Positioned>
        )
      })}
    </div>
  )
}
