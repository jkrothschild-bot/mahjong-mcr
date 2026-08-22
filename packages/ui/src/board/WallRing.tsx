import type { CSSProperties } from 'react'
import type { Seat, Wall } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { useStageMetrics } from '../stage/StageMetricsContext.js'
import { getBoardRegions, type Rect } from '../stage/stageLayout.js'
import { CompactTileBack, COMPACT_TILE_BODY_STYLE } from '../tiles/CompactTileBack.js'
import { buildPhysicalWall, type PhysicalWallSide, type PhysicalWallTile, type WallEdge } from './physicalWall.js'
import { wallTileLayerOffsetRatio, wallTileLongSizeFromSideRegion, WALL_TILE_LAYER_SIZE_RATIO } from './wallTilePresentation.js'

export interface WallRingProps {
  wall: Wall
  dealerSeat: Seat
}

function WallTile({
  tile,
  edge,
  stackIndex,
  horizontalLongSize,
}: {
  tile: PhysicalWallTile
  edge: WallEdge
  stackIndex: number
  horizontalLongSize: number
}) {
  const horizontal = edge === 'top' || edge === 'bottom'
  const layerOffset = wallTileLayerOffsetRatio(edge, tile.layer) * 100
  const style: CSSProperties = {
    ...(horizontal
      ? {
          left: '50%',
          width: horizontalLongSize,
          marginLeft: -horizontalLongSize / 2,
          height: `${WALL_TILE_LAYER_SIZE_RATIO * 100}%`,
          top: `${layerOffset}%`,
        }
      : { insetBlock: '4%', width: `${WALL_TILE_LAYER_SIZE_RATIO * 100}%`, left: `${layerOffset}%` }),
    zIndex: tile.layer === 'top' ? 2 : 1,
  }
  return (
    <div
      data-wall-layer={tile.layer}
      data-wall-position={`${edge}:${stackIndex}:${tile.layer}`}
      data-wall-tile-id={tile.tileId}
      className="absolute"
      style={style}
    >
      <CompactTileBack
        className="absolute inset-0 overflow-hidden rounded-[3px]"
        style={{ boxShadow: COMPACT_TILE_BODY_STYLE.boxShadow }}
      />
    </div>
  )
}

function WallSide({
  side,
  region,
  horizontalLongSize,
}: {
  side: PhysicalWallSide
  region: Rect
  horizontalLongSize: number
}) {
  const horizontal = side.edge === 'top' || side.edge === 'bottom'
  const reverse = side.edge === 'top' || side.edge === 'right'
  return (
    <Positioned
      x={region.x + region.width / 2}
      y={region.y + region.height / 2}
      naturalWidth={region.width}
      naturalHeight={region.height}
    >
      <div
        data-testid={`wall-side-${side.edge}`}
        className={`flex h-full w-full ${horizontal ? 'flex-row' : 'flex-col'}`}
        style={{
          ...(horizontal ? { width: horizontalLongSize * 18, marginInline: 'auto' } : undefined),
          ...(reverse ? { flexDirection: horizontal ? 'row-reverse' : 'column-reverse' } : undefined),
        }}
      >
        {side.stacks.map((stack) => (
          <div key={stack.stackIndex} data-testid="wall-stack" className="relative min-h-0 min-w-0 flex-1">
            {stack.bottom && (
              <WallTile
                tile={stack.bottom}
                edge={side.edge}
                stackIndex={stack.stackIndex}
                horizontalLongSize={horizontalLongSize}
              />
            )}
            {stack.top && (
              <WallTile
                tile={stack.top}
                edge={side.edge}
                stackIndex={stack.stackIndex}
                horizontalLongSize={horizontalLongSize}
              />
            )}
          </div>
        ))}
      </div>
    </Positioned>
  )
}

// A state-backed physical wall: four dealer-anchored sides, each retaining
// all 18 two-high stack positions. Missing front/back tiles are omitted from
// their exact slots, so partial stacks and corner crossings follow the same
// authoritative pointers used by the engine. The dealer anchor is the
// documented Phase 8 rendering convention, not a simulated dice break.
export function WallRing({ wall, dealerSeat }: WallRingProps) {
  const { designWidth } = useStageMetrics()
  const regions = getBoardRegions(designWidth).wall
  const regionForEdge: Record<WallEdge, Rect> = {
    top: regions.top,
    right: regions.right,
    bottom: regions.bottom,
    left: regions.left,
  }
  const sides = buildPhysicalWall(wall, dealerSeat)
  const horizontalLongSize = wallTileLongSizeFromSideRegion(regions.left)
  return (
    <div aria-hidden="true" data-testid="wall-ring">
      {sides.map((side) => (
        <WallSide
          key={side.edge}
          side={side}
          region={regionForEdge[side.edge]}
          horizontalLongSize={horizontalLongSize}
        />
      ))}
    </div>
  )
}
