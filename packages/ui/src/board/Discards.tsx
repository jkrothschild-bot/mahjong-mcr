import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { computeGridPositions, placeGroup, type Rect } from '../stage/stageLayout.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName, TILE_FACE_COMPACT_PX } from '../tiles/tileStyles.js'

const DISCARD_COLUMNS = 6
const TILE_GAP = 4

export interface DiscardsProps {
  seat: number
  tiles: readonly TileInstanceId[]
  region: Rect
  selectedTypeId?: string
  onTileClick?: (id: TileInstanceId) => void
}

// Fixed 6-column grid, new row after 6 — a hard rule (CLAUDE.md/SPEC.md §5),
// not a style choice: discards must never overlap, fan, or cascade. A long
// hand's discard river still grows without bound (a seat can rack up dozens
// of discards before the wall empties) — computeGridPositions' uniform
// group-scale fallback (never fewer columns, never per-tile shrinking) is
// what keeps that growth from ever needing to scroll or clip past its
// stage region, replacing the old capped/scrollable div (see
// stageLayout.ts's own comment on why that scrolling had to go).
export function Discards({ seat, tiles, region, selectedTypeId, onTileClick }: DiscardsProps) {
  const { tileScale } = useSettingsContext()
  const { width: tileWidth, height: tileHeight } = TILE_FACE_COMPACT_PX[tileScale]
  const layout = computeGridPositions(tiles.length, DISCARD_COLUMNS, region, tileWidth, tileHeight, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)

  return (
    <div role="list" aria-label={`Seat ${seat} discards`}>
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
              data-testid={`discard-tile-${id}`}
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
