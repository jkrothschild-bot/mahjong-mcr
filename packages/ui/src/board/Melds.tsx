import { typeIdOfInstance, type Meld } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { computeRowPositions, placeGroup, type Rect } from '../stage/stageLayout.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceClassName, TILE_BOX_PX } from '../tiles/tileStyles.js'

const TILE_GAP = 4

export interface MeldsProps {
  seat: number
  melds: readonly Meld[]
  region: Rect
  selectedTypeId?: string
  onTileClick?: (id: number) => void
}

// Renders every meld tile face-up, including concealed kongs. Real-table
// convention hides 2 of a concealed kong's 4 tiles from *other physical
// players* — that doesn't map onto a single-player trainer, where
// concealment already only matters for scoring (conveyed via fan names on
// the score screen), not table secrecy. Documented simplification, not a bug.
//
// All melds' tiles are flattened into one sequence for layout purposes —
// computeRowPositions' groupBreakAfter forces a wrap after each meld so
// they still read as distinct clusters — while each meld keeps its own
// semantic grouping div (role/aria-label/testid) for accessibility, same as
// before this just isn't also a *visual* flex container anymore.
export function Melds({ seat, melds, region, selectedTypeId, onTileClick }: MeldsProps) {
  const { tileScale } = useSettingsContext()
  const { width: tileWidth, height: tileHeight } = TILE_BOX_PX[tileScale]
  if (melds.length === 0) return null

  const totalTiles = melds.reduce((sum, meld) => sum + meld.tiles.length, 0)
  const breakAfter = new Set<number>()
  let running = 0
  for (const meld of melds.slice(0, -1)) {
    running += meld.tiles.length
    breakAfter.add(running - 1)
  }
  const layout = computeRowPositions(totalTiles, region, tileWidth, tileHeight, TILE_GAP, breakAfter)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)

  let flatIndex = 0
  return (
    <div aria-label={`Seat ${seat} melds`}>
      {melds.map((meld) => (
        <div key={meld.id} data-testid={`meld-${meld.id}`} role="list" aria-label={`${meld.kind} meld`}>
          {meld.tiles.map((id, index) => {
            const typeId = typeIdOfInstance(id)
            const p = placed[flatIndex]!
            flatIndex++
            return (
              <Positioned key={id} x={p.x} y={p.y} naturalWidth={tileWidth} naturalHeight={tileHeight} scale={layout.scale}>
                <div
                  data-tile-id={id}
                  data-testid={`meld-tile-${meld.id}-${index}`}
                  role="listitem"
                  onClick={onTileClick ? () => onTileClick(id) : undefined}
                  className={tileFaceClassName({
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
      ))}
    </div>
  )
}
