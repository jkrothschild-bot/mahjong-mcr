import { describe, expect, it } from 'vitest'
import { buildWall, drawTile, type Wall } from '@mahjong-mcr/engine'
import {
  buildPhysicalWall,
  PHYSICAL_WALL_TILE_COUNT,
  STACKS_PER_SIDE,
  wallIndexToPhysicalSlot,
} from './physicalWall.js'

function occupiedPositions(wall: Wall): ReadonlySet<string> {
  return new Set(buildPhysicalWall(wall, 0)
    .flatMap((side) => side.stacks.flatMap((stack) => [stack.top, stack.bottom]
      .filter((tile) => tile !== undefined)
      .map((tile) => `${side.edge}:${stack.stackIndex}:${tile.layer}`))))
}

describe('physical MCR wall mapping', () => {
  it('maps a complete 144-tile wall to four sides of 18 two-high stacks', () => {
    const sides = buildPhysicalWall(buildWall(42), 0)
    expect(sides).toHaveLength(4)
    expect(sides.map((side) => side.stacks.length)).toEqual([18, 18, 18, 18])
    expect(sides.flatMap((side) => side.stacks).filter((stack) => stack.top && stack.bottom)).toHaveLength(72)
    expect(sides.flatMap((side) => side.stacks).flatMap((stack) => [stack.top, stack.bottom]).filter(Boolean)).toHaveLength(PHYSICAL_WALL_TILE_COUNT)
  })

  it('anchors the first side to the dealer and crosses each 36-tile side boundary deterministically', () => {
    const sides = buildPhysicalWall(buildWall(1), 2)
    expect(sides.map((side) => [side.ownerSeat, side.edge])).toEqual([
      [2, 'top'], [3, 'right'], [0, 'bottom'], [1, 'left'],
    ])
    expect(wallIndexToPhysicalSlot(35)).toBe(35)
    expect(wallIndexToPhysicalSlot(36)).toBe(36)
    expect(wallIndexToPhysicalSlot(71)).toBe(71)
    expect(wallIndexToPhysicalSlot(72)).toBe(72)
  })

  it("maps East's final one-and-three tiles to separated stack tops", () => {
    expect([48, 49, 50, 51, 52, 53].map(wallIndexToPhysicalSlot)).toEqual([48, 52, 49, 50, 51, 53])
  })

  it('represents a partial stack after the first one-and-three top is removed', () => {
    const wall = buildWall(1)
    const partial: Wall = { ...wall, frontIndex: 49 }
    const side = buildPhysicalWall(partial, 0)[1]!
    const firstFinalStack = side.stacks[6]!
    expect(firstFinalStack.top).toBeUndefined()
    expect(firstFinalStack.bottom?.wallIndex).toBe(50)
  })

  it('keeps front and back depletion continuous across wall corners', () => {
    const wall = buildWall(1)
    const frontAcrossCorner = buildPhysicalWall({ ...wall, frontIndex: 36 }, 0)
    expect(frontAcrossCorner[0]!.stacks.flatMap((stack) => [stack.top, stack.bottom]).filter(Boolean)).toHaveLength(0)
    expect(frontAcrossCorner[1]!.stacks.flatMap((stack) => [stack.top, stack.bottom]).filter(Boolean)).toHaveLength(36)

    const backAcrossCorner = buildPhysicalWall({ ...wall, backIndex: 107 }, 0)
    expect(backAcrossCorner[3]!.stacks.flatMap((stack) => [stack.top, stack.bottom]).filter(Boolean)).toHaveLength(0)
    expect(backAcrossCorner[2]!.stacks.flatMap((stack) => [stack.top, stack.bottom]).filter(Boolean)).toHaveLength(36)
  })

  it('depletes from both ends with no fixed fourteen-tile reserve', () => {
    let wall = buildWall(1)
    for (let i = 0; i < PHYSICAL_WALL_TILE_COUNT; i++) {
      wall = drawTile(wall, i % 2 === 0 ? 'front' : 'back').wall
    }
    const remaining = buildPhysicalWall(wall, 0)
      .flatMap((side) => side.stacks)
      .flatMap((stack) => [stack.top, stack.bottom])
      .filter(Boolean)
    expect(remaining).toHaveLength(0)
  })

  it('is deterministic for an unchanged authoritative wall state', () => {
    const initial = buildWall(23)
    const state = drawTile(drawTile(initial, 'front').wall, 'back').wall

    expect(occupiedPositions(state)).toEqual(occupiedPositions(state))
  })

  it('decreases monotonically by exactly one physical position for every front or replacement draw', () => {
    let wall = buildWall(31)
    let previous = occupiedPositions(wall)

    for (let drawNumber = 0; drawNumber < 80; drawNumber++) {
      const end = drawNumber % 3 === 0 ? 'back' : 'front'
      wall = drawTile(wall, end).wall
      const next = occupiedPositions(wall)

      expect(next.size).toBe(previous.size - 1)
      for (const position of next) expect(previous.has(position)).toBe(true)
      previous = next
    }
  })

  it('keeps every stack index within the eighteen-stack side', () => {
    for (const side of buildPhysicalWall(buildWall(9), 3)) {
      expect(side.stacks[0]?.stackIndex).toBe(0)
      expect(side.stacks.at(-1)?.stackIndex).toBe(STACKS_PER_SIDE - 1)
    }
  })
})
