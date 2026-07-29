import { Positioned } from '../stage/Positioned.js'
import { computeRowPositions, placeGroup, WALL_SEGMENT_REGION } from '../stage/stageLayout.js'
import { Tile3DFace } from '../tiles/Tile3DFace.js'

const WALL_TILE_COUNT = 7
const WALL_TILE_WIDTH = 24
const WALL_TILE_HEIGHT = 34
const WALL_TILE_GAP = 3

// A modest stage-positioned wall representation for Step 1 — one strip of
// tile-backs, proving "the wall is a real stage object" rather than the
// old text-only WallCounter pill. Step 2 is where this gets the full
// multi-side table treatment (see stageLayout.ts's WALL_SEGMENT_REGION
// comment) — deliberately not attempted here. Purely decorative
// (aria-hidden); WallCounter's text still carries the exact remaining
// count, which this strip doesn't attempt to depict 1:1.
export function WallSegment() {
  const layout = computeRowPositions(WALL_TILE_COUNT, WALL_SEGMENT_REGION, WALL_TILE_WIDTH, WALL_TILE_HEIGHT, WALL_TILE_GAP)
  const placed = placeGroup(layout, WALL_SEGMENT_REGION, WALL_TILE_WIDTH, WALL_TILE_HEIGHT)

  return (
    <div aria-hidden="true" data-testid="wall-segment">
      {placed.map((p, i) => (
        <Positioned key={i} x={p.x} y={p.y} naturalWidth={WALL_TILE_WIDTH} naturalHeight={WALL_TILE_HEIGHT} scale={layout.scale}>
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
