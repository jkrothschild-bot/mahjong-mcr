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
  // M8 Step 2: rotates each back's own tile content in place to "face
  // inward" toward the table center — the row/wrap arrangement itself
  // (which cell each back sits in) is unaffected, only what's drawn inside
  // each cell spins. Defaults to 0 (Step 1's behavior).
  rotation?: number
}

// A bot's concealed hand — never interactive (nothing to tap, the tiles are
// hidden), so unlike HandTiles this needs no click/drag handling, just
// row-wrapped positions that shrink to fit `region` via the same
// computeRowPositions/placeGroup pipeline every other tile group uses.
export function ConcealedBacks({ seat, count, region, rotation = 0 }: ConcealedBacksProps) {
  const { tileScale } = useSettingsContext()
  const { width: tileWidth, height: tileHeight } = TILE_BACK_COMPACT_PX[tileScale]
  // Every back in this group shares one rotation, so — unlike Positioned's
  // own per-tile box-sizing swap, which handles rendering — the grid
  // spacing itself needs to reserve room for the *rotated* footprint, not
  // the unrotated one, or adjacent cells end up too close together for
  // what actually gets drawn in them.
  const rotatedQuarterTurn = (((rotation % 180) + 180) % 180) === 90
  const cellWidth = rotatedQuarterTurn ? tileHeight : tileWidth
  const cellHeight = rotatedQuarterTurn ? tileWidth : tileHeight
  const layout = computeRowPositions(count, region, cellWidth, cellHeight, TILE_GAP)
  const placed = placeGroup(layout, region, cellWidth, cellHeight)

  return (
    <div role="list" aria-label={`Seat ${seat} concealed tiles`}>
      {placed.map((p, index) => (
        <Positioned
          key={index}
          x={p.x}
          y={p.y}
          naturalWidth={tileWidth}
          naturalHeight={tileHeight}
          scale={layout.scale}
          rotation={rotation}
        >
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
