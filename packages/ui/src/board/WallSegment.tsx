import { drawableRemaining, type Wall } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { computeRowPositions, placeGroup, WALL_SEGMENT_REGION } from '../stage/stageLayout.js'
import { Tile3DFace } from '../tiles/Tile3DFace.js'

const MAX_WALL_TILES_SHOWN = 7
const WALL_TILE_WIDTH = 24
const WALL_TILE_HEIGHT = 34
const WALL_TILE_GAP = 3

export interface WallSegmentProps {
  wall: Wall
}

// A modest stage-positioned wall representation — one strip of tile-backs,
// deliberately not the full multi-side table wall a real 144-tile pile
// would need (WALL_SEGMENT_REGION's own comment covers the space
// trade-off). WallCounter's text still carries the exact remaining count,
// which this strip was never meant to depict 1:1.
//
// M8 Step 3: backed by the *real* next-to-draw tiles (`wall.tiles.slice`,
// not a fixed decorative count) — each back's layoutId is its real
// TileInstanceId, so when it's actually drawn, Framer Motion recognizes
// the same tile continuing on as a hand tile and animates the wall→hand
// path instead of the hand tile just appearing. This never reveals a
// tile's face (still just a back), only lets the animation system
// recognize continuity. Naturally shrinks as the wall nears exhaustion. A
// side effect worth expecting, not a bug: as drawIndex advances, the
// tiles that were already shown keep their identity but shift forward in
// the strip — the wall visibly "advances" as it depletes.
export function WallSegment({ wall }: WallSegmentProps) {
  const count = Math.min(MAX_WALL_TILES_SHOWN, drawableRemaining(wall))
  const tileIds = wall.tiles.slice(wall.drawIndex, wall.drawIndex + count)
  const layout = computeRowPositions(tileIds.length, WALL_SEGMENT_REGION, WALL_TILE_WIDTH, WALL_TILE_HEIGHT, WALL_TILE_GAP)
  const placed = placeGroup(layout, WALL_SEGMENT_REGION, WALL_TILE_WIDTH, WALL_TILE_HEIGHT)

  return (
    <div aria-hidden="true" data-testid="wall-segment">
      {tileIds.map((id, i) => (
        <Positioned
          key={id}
          layoutId={String(id)}
          x={placed[i]!.x}
          y={placed[i]!.y}
          naturalWidth={WALL_TILE_WIDTH}
          naturalHeight={WALL_TILE_HEIGHT}
          scale={layout.scale}
        >
          <div className="relative h-full w-full [perspective:300px] rounded-[2px] border border-amber-950/60 bg-gradient-to-b from-[#d8b378] to-[#a8763f] shadow-[1px_1.5px_2px_rgba(0,0,0,0.4)]">
            <Tile3DFace tone="wood">
              <div className="h-full w-full" />
            </Tile3DFace>
          </div>
        </Positioned>
      ))}
    </div>
  )
}
