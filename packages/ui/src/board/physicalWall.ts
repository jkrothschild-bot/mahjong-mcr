import type { Seat, TileInstanceId, Wall } from '@mahjong-mcr/engine'

export const WALL_SIDE_COUNT = 4
export const STACKS_PER_SIDE = 18
export const TILES_PER_STACK = 2
export const TILES_PER_SIDE = STACKS_PER_SIDE * TILES_PER_STACK
export const PHYSICAL_WALL_TILE_COUNT = WALL_SIDE_COUNT * TILES_PER_SIDE

export type WallEdge = 'top' | 'right' | 'bottom' | 'left'
export type WallLayer = 'top' | 'bottom'

export interface PhysicalWallTile {
  tileId: TileInstanceId
  wallIndex: number
  layer: WallLayer
}

export interface PhysicalWallStack {
  stackIndex: number
  top?: PhysicalWallTile
  bottom?: PhysicalWallTile
}

export interface PhysicalWallSide {
  edge: WallEdge
  ownerSeat: Seat
  stacks: readonly PhysicalWallStack[]
}

const EDGE_FOR_SEAT: Record<Seat, WallEdge> = {
  0: 'bottom',
  1: 'left',
  2: 'top',
  3: 'right',
}

// The engine's shuffled array is draw order, while §3.5.7.5's final deal is
// physical position order: East takes the TOP of the first and third stacks,
// then South/West/North take bottom-first/top-second/bottom-second. These six
// entries are therefore the only place where linear draw order differs from
// the ordinary top-then-bottom physical stack order:
//
// wall index:      48  49  50  51  52  53
// physical slot:   48  52  49  50  51  53
//
// This is a render mapping only. It neither reorders wall.tiles nor changes
// which tile the authoritative front pointer returns.
const FINAL_DEAL_PHYSICAL_SLOTS: Readonly<Record<number, number>> = {
  48: 48,
  49: 52,
  50: 49,
  51: 50,
  52: 51,
  53: 53,
}

export function wallIndexToPhysicalSlot(wallIndex: number): number {
  if (!Number.isInteger(wallIndex) || wallIndex < 0 || wallIndex >= PHYSICAL_WALL_TILE_COUNT) {
    throw new Error(`Wall index must be an integer from 0 to ${PHYSICAL_WALL_TILE_COUNT - 1}`)
  }
  return FINAL_DEAL_PHYSICAL_SLOTS[wallIndex] ?? wallIndex
}

export function buildPhysicalWall(wall: Wall, dealerSeat: Seat): readonly PhysicalWallSide[] {
  const sides = Array.from({ length: WALL_SIDE_COUNT }, (_, relativeSide) => {
    const ownerSeat = ((dealerSeat + relativeSide) % WALL_SIDE_COUNT) as Seat
    return {
      edge: EDGE_FOR_SEAT[ownerSeat],
      ownerSeat,
      stacks: Array.from({ length: STACKS_PER_SIDE }, (_, stackIndex) => ({ stackIndex } as PhysicalWallStack)),
    }
  })

  for (let wallIndex = wall.frontIndex; wallIndex <= wall.backIndex; wallIndex++) {
    const physicalSlot = wallIndexToPhysicalSlot(wallIndex)
    const relativeSide = Math.floor(physicalSlot / TILES_PER_SIDE)
    const withinSide = physicalSlot % TILES_PER_SIDE
    const stackIndex = Math.floor(withinSide / TILES_PER_STACK)
    const layer: WallLayer = withinSide % TILES_PER_STACK === 0 ? 'top' : 'bottom'
    const tile: PhysicalWallTile = { tileId: wall.tiles[wallIndex]!, wallIndex, layer }
    sides[relativeSide]!.stacks[stackIndex]![layer] = tile
  }

  return sides
}
