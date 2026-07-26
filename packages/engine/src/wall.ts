import { mulberry32, shuffle } from './rng.js'
import { buildDeck, isFlowerOrSeason, type TileInstanceId } from './tiles.js'

// Number of *logical* tiles the initial deal hands out (13 * 4 + the
// dealer's folded-in 14th tile) — used by game-state.ts's deal loop. This is
// NOT the wall's starting drawIndex: dealing must go through the same
// drawTile/flower-replacement machinery as any other draw (a flower dealt
// out during the initial deal still needs to be replaced), so the wall
// always starts at drawIndex 0 and the deal consumes it draw-by-draw.
export const INITIAL_DEAL_COUNT = 53

// docs/rules/decisions.md #3: there is no fixed dead-wall reserve in MCR —
// the term never appears in the rulebook. §3.4.30 defines a Draw Game as
// occurring when "the wall has been completely depleted": the entire
// 144-tile wall (minus whatever was dealt) is drawable, with kong/flower
// replacements simply coming from the opposite ("back") end of the same
// single pool rather than a separate reserved buffer.
export interface Wall {
  // Fixed shuffled order for this hand, derived once from a seed.
  tiles: readonly TileInstanceId[]
  drawIndex: number // next index to hand out, for ANY draw (deal, normal, or replacement)
}

export function buildWall(seed: number): Wall {
  const rng = mulberry32(seed)
  return { tiles: shuffle(buildDeck(), rng), drawIndex: 0 }
}

export function drawableRemaining(wall: Wall): number {
  return wall.tiles.length - wall.drawIndex
}

export function isWallExhausted(wall: Wall): boolean {
  return drawableRemaining(wall) <= 0
}

export interface DrawResult {
  tile: TileInstanceId
  wall: Wall
}

export function drawTile(wall: Wall): DrawResult {
  if (isWallExhausted(wall)) throw new Error('Cannot draw: wall is exhausted')
  const tile = wall.tiles[wall.drawIndex]!
  return { tile, wall: { tiles: wall.tiles, drawIndex: wall.drawIndex + 1 } }
}

export interface FlowerReplacementResult {
  wall: Wall
  finalTile: TileInstanceId | undefined // undefined iff the wall exhausted mid-chain
  flowersDrawn: TileInstanceId[]
  exhausted: boolean
}

// Draws repeatedly while the result is a flower/season tile, collecting each
// one, until a non-flower tile is drawn or the wall runs out mid-chain (a
// rare edge case: the hand terminates as an exhaustive draw at that point).
export function drawWithFlowerReplacement(wall: Wall): FlowerReplacementResult {
  let currentWall = wall
  const flowersDrawn: TileInstanceId[] = []

  while (true) {
    if (isWallExhausted(currentWall)) {
      return { wall: currentWall, finalTile: undefined, flowersDrawn, exhausted: true }
    }
    const { tile, wall: nextWall } = drawTile(currentWall)
    currentWall = nextWall
    if (!isFlowerOrSeason(tile)) {
      return { wall: currentWall, finalTile: tile, flowersDrawn, exhausted: false }
    }
    flowersDrawn.push(tile)
  }
}
