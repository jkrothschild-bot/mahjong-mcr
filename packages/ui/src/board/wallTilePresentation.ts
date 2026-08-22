import type { Rect } from '../stage/stageLayout.js'
import type { WallEdge, WallLayer } from './physicalWall.js'

export const WALL_TILE_INSET_RATIO = 0.04
export const WALL_TILE_LAYER_SIZE_RATIO = 0.58
export const WALL_TILE_LAYER_OFFSET_RATIO = 0.42
export const WALL_DRAW_EXTRACTION_PX = 3

export function wallTileLayerOffsetRatio(edge: WallEdge, layer: WallLayer): number {
  const topIsOffset = edge === 'top' || edge === 'left'
  if (layer === 'top') return topIsOffset ? WALL_TILE_LAYER_OFFSET_RATIO : 0
  return topIsOffset ? 0 : WALL_TILE_LAYER_OFFSET_RATIO
}

export function wallDrawExtraction(edge: WallEdge): { x: number; y: number } {
  if (edge === 'top') return { x: 0, y: -WALL_DRAW_EXTRACTION_PX }
  if (edge === 'bottom') return { x: 0, y: WALL_DRAW_EXTRACTION_PX }
  if (edge === 'left') return { x: -WALL_DRAW_EXTRACTION_PX, y: 0 }
  return { x: WALL_DRAW_EXTRACTION_PX, y: 0 }
}

export function wallTileLongSizeFromSideRegion(sideRegion: Rect): number {
  return (sideRegion.height / 18) * (1 - 2 * WALL_TILE_INSET_RATIO)
}

export function physicalWallTileRect(
  edge: WallEdge,
  region: Rect,
  stackIndex: number,
  layer: WallLayer,
  extracted = false,
  horizontalLongSize?: number,
): Rect {
  const horizontal = edge === 'top' || edge === 'bottom'
  const reverse = edge === 'top' || edge === 'right'
  const visualStackIndex = reverse ? 17 - stackIndex : stackIndex
  const slotLength = (horizontal ? region.width : region.height) / 18
  const longInset = slotLength * WALL_TILE_INSET_RATIO
  const layerOffset = (horizontal ? region.height : region.width) * wallTileLayerOffsetRatio(edge, layer)
  const extraction = extracted ? wallDrawExtraction(edge) : { x: 0, y: 0 }

  if (horizontal) {
    const height = region.height * WALL_TILE_LAYER_SIZE_RATIO
    const width = horizontalLongSize ?? slotLength - 2 * longInset
    const wallWidth = width * 18
    return {
      x: region.x + (region.width - wallWidth) / 2 + visualStackIndex * width + extraction.x,
      y: region.y + layerOffset + extraction.y,
      width,
      height,
    }
  }

  const width = region.width * WALL_TILE_LAYER_SIZE_RATIO
  return {
    x: region.x + layerOffset + extraction.x,
    y: region.y + visualStackIndex * slotLength + longInset + extraction.y,
    width,
    height: slotLength - 2 * longInset,
  }
}
