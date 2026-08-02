import { describe, expect, it } from 'vitest'
import {
  buildWall,
  drawTile,
  drawWithFlowerReplacement,
  drawableRemaining,
  INITIAL_DEAL_COUNT,
  isWallExhausted,
  type Wall,
} from './wall.js'
import { buildDeck } from './tiles.js'

describe('buildWall', () => {
  it('produces 144 tiles with frontIndex at 0 and backIndex at the last index', () => {
    const wall = buildWall(1)
    expect(wall.tiles.length).toBe(144)
    expect(wall.frontIndex).toBe(0)
    expect(wall.backIndex).toBe(143)
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
  it('starts at 144 right after buildWall (deal has not consumed anything yet)', () => {
    const wall = buildWall(1)
    expect(drawableRemaining(wall)).toBe(144)
    expect(isWallExhausted(wall)).toBe(false)
  })

  it('after the initial deal (INITIAL_DEAL_COUNT logical front draws), matches 144 minus what was dealt', () => {
    let wall = buildWall(1)
    for (let i = 0; i < INITIAL_DEAL_COUNT; i++) {
      wall = drawTile(wall, 'front').wall
    }
    expect(drawableRemaining(wall)).toBe(144 - INITIAL_DEAL_COUNT)
    expect(wall.backIndex).toBe(143) // untouched by front draws
  })

  // KICKOFF-phase8-addendum-decisions.md: the pointers meeting *is*
  // exhaustion — every draw consumes exactly one tile from exactly one end,
  // so they cannot meet early. docs/rules/decisions.md's residual gap #3
  // (whether front/back could meet before 144 is reached) is resolved by
  // this being arithmetically impossible, not merely unlikely.
  it('is exhausted once the pointers cross — the whole wall, no reserved buffer (docs/rules/decisions.md #3)', () => {
    const wall: Wall = { tiles: buildDeck(), frontIndex: 100, backIndex: 99 }
    expect(drawableRemaining(wall)).toBe(0)
    expect(isWallExhausted(wall)).toBe(true)
  })

  it('has exactly one tile left when the pointers meet at the same index', () => {
    const wall: Wall = { tiles: buildDeck(), frontIndex: 71, backIndex: 71 }
    expect(drawableRemaining(wall)).toBe(1)
    expect(isWallExhausted(wall)).toBe(false)
  })
})

describe('drawTile', () => {
  it('front: returns tiles in ascending sequence and does not mutate the input wall', () => {
    const wall = buildWall(1)
    const originalFront = wall.frontIndex
    const { tile, wall: next } = drawTile(wall, 'front')
    expect(tile).toBe(wall.tiles[originalFront])
    expect(wall.frontIndex).toBe(originalFront) // unmutated
    expect(next.frontIndex).toBe(originalFront + 1)
    expect(next.backIndex).toBe(wall.backIndex) // back untouched
  })

  it('back: returns tiles in descending sequence and does not mutate the input wall', () => {
    const wall = buildWall(1)
    const originalBack = wall.backIndex
    const { tile, wall: next } = drawTile(wall, 'back')
    expect(tile).toBe(wall.tiles[originalBack])
    expect(wall.backIndex).toBe(originalBack) // unmutated
    expect(next.backIndex).toBe(originalBack - 1)
    expect(next.frontIndex).toBe(wall.frontIndex) // front untouched
  })

  it('throws when the wall is exhausted, from either end', () => {
    const wall: Wall = { tiles: buildDeck(), frontIndex: 100, backIndex: 99 }
    expect(() => drawTile(wall, 'front')).toThrow()
    expect(() => drawTile(wall, 'back')).toThrow()
  })
})

describe('drawWithFlowerReplacement', () => {
  it('front: returns the first tile directly when it is not a flower/season', () => {
    // Construct a wall where the next front tile (index 0) is a standard suit tile.
    const wall: Wall = { tiles: buildDeck(), frontIndex: 0, backIndex: 143 }
    const result = drawWithFlowerReplacement(wall, 'front')
    expect(result.exhausted).toBe(false)
    expect(result.flowersDrawn).toEqual([])
    expect(result.finalTile).toBe(0)
    expect(result.wall.frontIndex).toBe(1)
    expect(result.wall.backIndex).toBe(143)
  })

  it('back: returns the first tile directly when it is not a flower/season', () => {
    // buildDeck()'s ascending order puts every flower/season (136-143) at
    // the literal tail — exactly where the back pointer starts — so an
    // untouched buildDeck() can't stand in for "back tile isn't a flower"
    // fixtures the way it can for front ones. Explicit filler instead: id 1
    // is a plain standard tile, nowhere near the 136-143 flower range.
    const tiles: number[] = new Array(144).fill(1)
    const wall: Wall = { tiles, frontIndex: 0, backIndex: 143 }
    const result = drawWithFlowerReplacement(wall, 'back')
    expect(result.exhausted).toBe(false)
    expect(result.flowersDrawn).toEqual([])
    expect(result.finalTile).toBe(1)
    expect(result.wall.backIndex).toBe(142)
    expect(result.wall.frontIndex).toBe(0)
  })

  it('front: draws through a flower, whose OWN replacement comes from the back end (§3.4.20) even though the chain started at the front', () => {
    const tiles: number[] = new Array(144).fill(1)
    tiles[0] = 136 // the front tile is a flower
    tiles[143] = 2 // its replacement, read from the back, is a plain standard tile
    const wall: Wall = { tiles, frontIndex: 0, backIndex: 143 }
    const result = drawWithFlowerReplacement(wall, 'front')
    expect(result.exhausted).toBe(false)
    expect(result.flowersDrawn).toEqual([136])
    expect(result.finalTile).toBe(2)
    expect(result.wall.frontIndex).toBe(1) // only the flower itself came from the front
    expect(result.wall.backIndex).toBe(142) // its replacement came from the back
  })

  it('back: a flower drawn as a kong/flower replacement chains its own replacement from the back too (multi-flower chain)', () => {
    const tiles: number[] = new Array(144).fill(1)
    tiles[143] = 136 // first back draw: a flower
    tiles[142] = 140 // its replacement: also a flower
    tiles[141] = 2 // that flower's own replacement: a plain standard tile
    const wall: Wall = { tiles, frontIndex: 0, backIndex: 143 }
    const result = drawWithFlowerReplacement(wall, 'back')
    expect(result.exhausted).toBe(false)
    expect(result.flowersDrawn).toEqual([136, 140])
    expect(result.finalTile).toBe(2)
    expect(result.wall.backIndex).toBe(140)
    expect(result.wall.frontIndex).toBe(0) // never touched — every draw in this chain was from the back
  })

  it('terminates as exhausted if the wall runs out mid flower-replacement chain', () => {
    const tiles = buildDeck()
    // Put a flower tile at the very last drawable index (143, the whole
    // wall — no reserved dead-wall buffer), so drawing it from the front
    // leaves the wall exhausted before a (back-end) replacement can be drawn.
    const customOrder = tiles.slice()
    const temp = customOrder[143]!
    const flowerIdx = customOrder.indexOf(136)
    customOrder[143] = 136
    customOrder[flowerIdx] = temp
    const wall: Wall = { tiles: customOrder, frontIndex: 143, backIndex: 143 }
    const result = drawWithFlowerReplacement(wall, 'front')
    expect(result.exhausted).toBe(true)
    expect(result.finalTile).toBeUndefined()
    expect(result.flowersDrawn).toEqual([136])
    expect(isWallExhausted(result.wall)).toBe(true)
  })
})
