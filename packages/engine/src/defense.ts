import type { GameState } from './game-state.js'
import type { Seat } from './meld.js'
import { parseSuited } from './scoring/set-helpers.js'
import { typeIdOfInstance, type TileTypeId } from './tiles.js'

// SPEC.md §9's defense/danger indicator: "a subtle per-tile risk rating in
// hand based on what's visible." Explicitly a TEACHING HEURISTIC, not a
// rulebook mechanic — unlike every fan/shanten module in this package, none
// of this is cited to mcr_EN.pdf, and it isn't meant to be: it's a rough,
// honest approximation of the kind of reasoning experienced players use,
// not a claim about what the rules require. Doubles as the Tile Safety tab
// in the Hint panel (SPEC.md §6).
export type DangerLevel = 'low' | 'medium' | 'high'

export interface TileSafety {
  level: DangerLevel
  reasons: string[]
}

// Heuristic threshold for "deep in the hand" — not a rulebook value, just a
// rough point past which "nobody's discarded this yet" starts to mean
// something (early on, everyone's still holding tiles for a reason unrelated
// to this one).
const LATE_GAME_DISCARD_THRESHOLD = 6

function discardedBy(state: GameState, seat: Seat, tileType: TileTypeId): boolean {
  return state.players[seat]!.discards.some((tile) => typeIdOfInstance(tile) === tileType)
}

function suitOf(tileType: TileTypeId): 'C' | 'D' | 'B' | null {
  return parseSuited(tileType)?.suit ?? null
}

export function assessTileSafety(state: GameState, forSeat: Seat, tileType: TileTypeId): TileSafety {
  const otherSeats = state.players.map((p) => p.seat).filter((seat) => seat !== forSeat)

  // (a) Every opponent has already discarded this exact type — none of them
  // can still be waiting on it (the classic "genbutsu" safety signal used
  // across most mahjong variants, kept honest here as a heuristic since
  // MCR's own furiten status is unconfirmed — see docs/rules/decisions.md).
  if (otherSeats.every((seat) => discardedBy(state, seat, tileType))) {
    return {
      level: 'low',
      reasons: ['Every other player has already discarded this tile — none of them can still be waiting on it.'],
    }
  }

  // (b) An opponent who hasn't discarded this tile has 2+ exposed melds
  // concentrated in its suit — plausibly building a flush toward it.
  // Doesn't apply to honor tiles (no suit to concentrate in).
  const tileSuit = suitOf(tileType)
  if (tileSuit) {
    for (const seat of otherSeats) {
      if (discardedBy(state, seat, tileType)) continue
      const sameSuitExposedMelds = state.players[seat]!.hand.melds.filter(
        (meld) => meld.exposure === 'exposed' && suitOf(typeIdOfInstance(meld.tiles[0]!)) === tileSuit,
      )
      if (sameSuitExposedMelds.length >= 2) {
        return {
          level: 'high',
          reasons: [`Seat ${seat} has 2+ exposed melds in this tile's suit and hasn't discarded it — could be building a flush.`],
        }
      }
    }
  }

  // (c) Nobody at the table has discarded this type at all, this deep into
  // the hand — less evidence either way, flagged as untested rather than
  // assumed safe.
  const discardedByAnyone = state.players.some((p) => discardedBy(state, p.seat, tileType))
  const deepInHand = state.players.some((p) => p.discards.length >= LATE_GAME_DISCARD_THRESHOLD)
  if (!discardedByAnyone && deepInHand) {
    return {
      level: 'medium',
      reasons: ['No one has discarded this tile yet this late in the hand — less evidence about its safety.'],
    }
  }

  return { level: 'medium', reasons: ['No strong safety signal either way yet.'] }
}
