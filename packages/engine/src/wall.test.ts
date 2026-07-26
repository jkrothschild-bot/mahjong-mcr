import { describe, expect, it } from 'vitest'
import {
  buildWall,
  DEAD_WALL_SIZE,
  drawTile,
  drawWithFlowerReplacement,
  drawableRemaining,
  INITIAL_DEAL_COUNT,
  isWallExhausted,
  type Wall,
} from './wall.js'
import { buildDeck } from './tiles.js'

describe('buildWall', () => {
  it('produces 144 tiles with drawIndex starting at 0 (dealing goes through drawTile too)', () => {
    const wall = buildWall(1)
    expect(wall.tiles.length).toBe(144)
    expect(wall.drawIndex).toBe(0)
  })

  it('is deterministic for a given seed', () => {
    const a = buildWall(42)
    const b = buildWall(42)
    expect(a.tiles).toEqual(b.tiles)
  })

  it('is a permutation of the full 144-tile deck', () => {
    const wall = buildWall(7)
    expect(wall.tiles.slice().sort((x, y) => x - y)).toEqual(buildDeck())
  })
})

describe('drawableRemaining / isWallExhausted', () => {
  it('starts at 144 - DEAD_WALL_SIZE right after buildWall (deal has not consumed anything yet)', () => {
    const wall = buildWall(1)
    expect(drawableRemaining(wall)).toBe(144 - DEAD_WALL_SIZE)
    expect(isWallExhausted(wall)).toBe(false)
  })

  it('after the initial deal (INITIAL_DEAL_COUNT logical draws), matches the classic post-deal remaining count', () => {
    let wall = buildWall(1)
    for (let i = 0; i < INITIAL_DEAL_COUNT; i++) {
      wall = drawTile(wall).wall
    }
    expect(drawableRemaining(wall)).toBe(144 - DEAD_WALL_SIZE - INITIAL_DEAL_COUNT)
  })

  it('is exhausted once drawIndex reaches 144 - DEAD_WALL_SIZE', () => {
    const wall: Wall = { tiles: buildDeck(), drawIndex: 144 - DEAD_WALL_SIZE }
    expect(drawableRemaining(wall)).toBe(0)
    expect(isWallExhausted(wall)).toBe(true)
  })
})

describe('drawTile', () => {
  it('returns tiles in sequence and does not mutate the input wall', () => {
    const wall = buildWall(1)
    const originalDrawIndex = wall.drawIndex
    const { tile, wall: next } = drawTile(wall)
    expect(tile).toBe(wall.tiles[originalDrawIndex])
    expect(wall.drawIndex).toBe(originalDrawIndex) // unmutated
    expect(next.drawIndex).toBe(originalDrawIndex + 1)
  })

  it('throws when the wall is exhausted', () => {
    const wall: Wall = { tiles: buildDeck(), drawIndex: 144 - DEAD_WALL_SIZE }
    expect(() => drawTile(wall)).toThrow()
  })
})

describe('drawWithFlowerReplacement', () => {
  it('returns the first tile directly when it is not a flower/season', () => {
    // Construct a wall where the next tile (index 0) is a standard suit tile.
    const wall: Wall = { tiles: buildDeck(), drawIndex: 0 }
    const result = drawWithFlowerReplacement(wall)
    expect(result.exhausted).toBe(false)
    expect(result.flowersDrawn).toEqual([])
    expect(result.finalTile).toBe(0)
    expect(result.wall.drawIndex).toBe(1)
  })

  it('draws through consecutive flower/season tiles and collects them', () => {
    // Flowers/seasons are ids 136-143. Place two flowers then a standard tile
    // at the front of the draw sequence.
    const tiles = buildDeck()
    const customOrder = [136, 140, 0, ...tiles.filter((t) => ![136, 140, 0].includes(t))]
    const wall: Wall = { tiles: customOrder, drawIndex: 0 }
    const result = drawWithFlowerReplacement(wall)
    expect(result.exhausted).toBe(false)
    expect(result.flowersDrawn).toEqual([136, 140])
    expect(result.finalTile).toBe(0)
    expect(result.wall.drawIndex).toBe(3)
  })

  it('terminates as exhausted if the wall runs out mid flower-replacement chain', () => {
    const tiles = buildDeck()
    // Put a flower tile right at the last drawable index, so drawing it
    // leaves the wall exhausted before a replacement can be drawn.
    const lastDrawable = 144 - DEAD_WALL_SIZE - 1
    const customOrder = tiles.slice()
    const temp = customOrder[lastDrawable]!
    const flowerIdx = customOrder.indexOf(136)
    customOrder[lastDrawable] = 136
    customOrder[flowerIdx] = temp
    const wall: Wall = { tiles: customOrder, drawIndex: lastDrawable }
    const result = drawWithFlowerReplacement(wall)
    expect(result.exhausted).toBe(true)
    expect(result.finalTile).toBeUndefined()
    expect(result.flowersDrawn).toEqual([136])
    expect(isWallExhausted(result.wall)).toBe(true)
  })
})
