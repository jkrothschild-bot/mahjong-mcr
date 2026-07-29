import { Positioned } from '../stage/Positioned.js'
import { computeRowPositions, placeGroup, type Rect } from '../stage/stageLayout.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { Tile3DFace } from '../tiles/Tile3DFace.js'
import { botBackImageSrc } from '../tiles/tileImages.js'
import { TILE_BACK_COMPACT_PX, tileBackCompactClassName } from '../tiles/tileStyles.js'

const TILE_GAP = 4

export interface ConcealedBacksProps {
  seat: number
  count: number
  region: Rect
}

// A bot's concealed hand — never interactive (nothing to tap, the tiles are
// hidden), so unlike HandTiles this needs no click/drag handling, just
// row-wrapped positions that shrink to fit `region` via the same
// computeRowPositions/placeGroup pipeline every other tile group uses.
export function ConcealedBacks({ seat, count, region }: ConcealedBacksProps) {
  const { tileScale } = useSettingsContext()
  const { width: tileWidth, height: tileHeight } = TILE_BACK_COMPACT_PX[tileScale]
  const layout = computeRowPositions(count, region, tileWidth, tileHeight, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)

  return (
    <div role="list" aria-label={`Seat ${seat} concealed tiles`}>
      {placed.map((p, index) => (
        <Positioned key={index} x={p.x} y={p.y} naturalWidth={tileWidth} naturalHeight={tileHeight} scale={layout.scale}>
          <div data-testid={`seat-${seat}-back-${index}`} role="listitem" className={tileBackCompactClassName(tileScale)}>
            <Tile3DFace tone="back">
              <img src={botBackImageSrc()} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
            </Tile3DFace>
          </div>
        </Positioned>
      ))}
    </div>
  )
}
