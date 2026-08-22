import { describe, expect, it } from 'vitest'
import { getBoardRegions } from '../stage/stageLayout.js'
import { physicalWallTileRect, wallTileLongSizeFromSideRegion } from './wallTilePresentation.js'

describe('physical wall tile proportions', () => {
  it('gives top/bottom tiles the same long-axis width as left/right tiles', () => {
    const wall = getBoardRegions(1768).wall
    const horizontalLongSize = wallTileLongSizeFromSideRegion(wall.left)
    const top = physicalWallTileRect('top', wall.top, 4, 'top', false, horizontalLongSize)
    const left = physicalWallTileRect('left', wall.left, 4, 'top')

    expect(top.width).toBeCloseTo(left.height)
  })

  it('packs the horizontal stacks next to each other and centers the complete wall', () => {
    const wall = getBoardRegions(1768).wall
    const horizontalLongSize = wallTileLongSizeFromSideRegion(wall.left)
    const first = physicalWallTileRect('bottom', wall.bottom, 0, 'top', false, horizontalLongSize)
    const second = physicalWallTileRect('bottom', wall.bottom, 1, 'top', false, horizontalLongSize)
    const last = physicalWallTileRect('bottom', wall.bottom, 17, 'top', false, horizontalLongSize)

    expect(second.x).toBeCloseTo(first.x + first.width)
    expect(first.x - wall.bottom.x).toBeCloseTo(wall.bottom.x + wall.bottom.width - (last.x + last.width))
  })
})
