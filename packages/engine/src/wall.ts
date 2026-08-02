import { mulberry32, shuffle } from './rng.js'
import { buildDeck, isFlowerOrSeason, type TileInstanceId } from './tiles.js'

// Number of *logical* tiles the initial deal hands out (13 * 4 + the
// dealer's folded-in 14th tile) — used by game-state.ts's deal loop. This is
// NOT the wall's starting pointer state: dealing must go through the same
// drawTile/flower-replacement machinery as any other draw (a flower dealt
// out during the initial deal still needs to be replaced), so the wall
// always starts at frontIndex 0 and the deal consumes it draw-by-draw.
export const INITIAL_DEAL_COUNT = 53

// docs/rules/decisions.md #3: there is no fixed dead-wall reserve in MCR —
// the term never appears in the rulebook. §3.4.30 defines a Draw Game as
// occurring when "the wall has been completely depleted": the entire
// 144-tile wall (minus whatever was dealt) is drawable.
//
// KICKOFF-phase8-addendum-decisions.md, Decision A (A3): kong replacement
// draws (concealed, added, claimed) and EVERY flower replacement (§3.4.20's
// general "Bu Hua" rule, deal-time or in-play — not deal-scoped) come from
// the BACK end of the wall (§3.6.8, §3.4.20), while ordinary turn draws and
// the initial deal's own primary tiles come from the FRONT. Two independent
// pointers model this directly rather than a single monotonic index —
// finding #7 of the Phase 8 investigation was that the single-`drawIndex`
// model was an actual rules deviation (both kinds of draw silently came
// from the front), not merely a rendering gap, so this is a real behavior
// fix, not just a state-shape change for the renderer's benefit.
export interface Wall {
  // Fixed shuffled order for this hand, derived once from a seed.
  tiles: readonly TileInstanceId[]
  frontIndex: number // next index to hand out for an ordinary draw (turn draw, initial deal)
  backIndex: number // next index to hand out for a replacement draw (kong or flower), counting down
}

export function buildWall(seed: number): Wall {
  const rng = mulberry32(seed)
  const tiles = shuffle(buildDeck(), rng)
  return { tiles, frontIndex: 0, backIndex: tiles.length - 1 }
}

// Every draw consumes exactly one tile from exactly one end, so the two
// pointers cannot meet early — "remaining" is simply the (inclusive) gap
// between them. KICKOFF-phase8-addendum-decisions.md: this resolves
// decisions.md's residual gap #3 (whether front/back could meet before 144
// is reached) — meeting *is* exhaustion, not a separate case to guard.
export function drawableRemaining(wall: Wall): number {
  return wall.backIndex - wall.frontIndex + 1
}

export function isWallExhausted(wall: Wall): boolean {
  return drawableRemaining(wall) <= 0
}

export type WallEnd = 'front' | 'back'

export interface DrawResult {
  tile: TileInstanceId
  wall: Wall
}

export function drawTile(wall: Wall, end: WallEnd): DrawResult {
  if (isWallExhausted(wall)) throw new Error('Cannot draw: wall is exhausted')
  if (end === 'front') {
    const tile = wall.tiles[wall.frontIndex]!
    return { tile, wall: { ...wall, frontIndex: wall.frontIndex + 1 } }
  }
  const tile = wall.tiles[wall.backIndex]!
  return { tile, wall: { ...wall, backIndex: wall.backIndex - 1 } }
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
// `end` governs only the FIRST draw of the chain (front for an ordinary turn
// draw or initial-deal tile, back for a kong replacement) — every
// subsequent draw within the same call is a flower's own replacement, which
// §3.4.20 puts at the back end unconditionally, regardless of what end the
// flower itself came from.
export function drawWithFlowerReplacement(wall: Wall, end: WallEnd): FlowerReplacementResult {
  let currentWall = wall
  let currentEnd = end
  const flowersDrawn: TileInstanceId[] = []

  while (true) {
    if (isWallExhausted(currentWall)) {
      return { wall: currentWall, finalTile: undefined, flowersDrawn, exhausted: true }
    }
    const { tile, wall: nextWall } = drawTile(currentWall, currentEnd)
    currentWall = nextWall
    if (!isFlowerOrSeason(tile)) {
      return { wall: currentWall, finalTile: tile, flowersDrawn, exhausted: false }
    }
    flowersDrawn.push(tile)
    currentEnd = 'back'
  }
}
