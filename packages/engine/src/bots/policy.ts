import type { GameState } from '../game-state.js'
import type { Hand } from '../hand.js'
import type { Seat } from '../meld.js'
import { applyMove, legalMoves, type Move } from '../moves.js'
import { calculateShanten } from '../shanten.js'
import { evaluateDiscards } from '../tile-efficiency.js'
import { typeIdOfInstance, type TileInstanceId } from '../tiles.js'
import { isHonorTypeId, isTerminalTypeId } from '../scoring/set-helpers.js'
import { ORDERED_STANDARD_TYPE_IDS } from '../win-detection.js'

// One well-understood, implementable axis real MCR players differ along —
// claim eagerness. Deliberately does NOT touch defense/danger-tile
// reasoning (which visible-tile an opponent might be waiting on) — that's
// M5's hint/defense work, not this baseline.
export interface BotPolicyConfig {
  // Whether a claim must strictly reduce shanten ('onlyImproving') or is
  // also taken when merely shanten-neutral ('improvingOrNeutral').
  claimThreshold: 'onlyImproving' | 'improvingOrNeutral'
  // If true, a chow claim is only ever taken when it strictly reduces
  // shanten — chows are the cheapest/most reproducible claim and the most
  // costly to concealed-hand value, so a more conservative bot declines a
  // merely-neutral chow that a pung of equal shanten-value would still take.
  declineMarginalChows: boolean
}

export const BOT_PRESETS: Record<'efficient' | 'balanced' | 'conservative', BotPolicyConfig> = {
  efficient: { claimThreshold: 'improvingOrNeutral', declineMarginalChows: false },
  balanced: { claimThreshold: 'improvingOrNeutral', declineMarginalChows: true },
  conservative: { claimThreshold: 'onlyImproving', declineMarginalChows: true },
}

// Deterministic min-shanten discard: among the tiles achieving the lowest
// resultingShanten, prefer the one with the most ukeire (keeps the hand
// most flexible), then prefer discarding a honor/terminal over a simple
// (least flexible tiles go first when otherwise tied), then a fixed type
// order — matching the placeholder bot's own "deterministic, snapshot-
// testable" design philosophy, just no longer dumb about which tile.
export function chooseDiscard(hand: Hand): TileInstanceId {
  const evaluations = evaluateDiscards(hand)
  const minShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
  const atMin = evaluations.filter((e) => e.resultingShanten === minShanten)

  atMin.sort((a, b) => {
    if (a.ukeire.totalCount !== b.ukeire.totalCount) return b.ukeire.totalCount - a.ukeire.totalCount
    const aType = typeIdOfInstance(a.tile)
    const bType = typeIdOfInstance(b.tile)
    const aFlex = isHonorTypeId(aType) || isTerminalTypeId(aType) ? 0 : 1
    const bFlex = isHonorTypeId(bType) || isTerminalTypeId(bType) ? 0 : 1
    if (aFlex !== bFlex) return aFlex - bFlex
    return ORDERED_STANDARD_TYPE_IDS.indexOf(aType) - ORDERED_STANDARD_TYPE_IDS.indexOf(bType)
  })

  return atMin[0]!.tile
}

// Evaluates every non-pass claim option (never a kong — see below) by
// actually applying it (pure, no mutation) and comparing the resulting
// hand's shanten to the current one. A 14-tile-equivalent (mid-discard)
// hand's shanten, computed directly, already equals the best achievable
// discard's resultingShanten (the search is free to leave any one tile
// unconsumed/floating) — so this reuses calculateShanten directly rather
// than re-running the full discard evaluator.
export function chooseClaimMove(state: GameState, seat: Seat, config: BotPolicyConfig): Move {
  const moves = legalMoves(state, seat)
  const winMove = moves.find((move) => move.kind === 'win')
  if (winMove) return winMove

  const hand = state.players[seat].hand
  const cache = new Map<string, number>()
  const currentShanten = calculateShanten(hand.concealedTiles, hand.melds, cache).shanten

  let best: { move: Move; shanten: number } | null = null
  for (const move of moves) {
    // Never claims a kong from a discard: completing one draws a real
    // replacement tile from the wall to evaluate against, which the bot
    // doesn't get to see before committing — and kong-timing strategy is
    // judgment-heavy and deferred to M5 regardless (matches the discard-
    // phase policy below, which never voluntarily declares one either).
    if (move.kind !== 'pung' && move.kind !== 'chow') continue

    const nextState = applyMove(state, seat, move)
    const nextHand = nextState.players[seat].hand
    const nextShanten = calculateShanten(nextHand.concealedTiles, nextHand.melds, cache).shanten

    const meetsThreshold = config.claimThreshold === 'onlyImproving' ? nextShanten < currentShanten : nextShanten <= currentShanten
    if (!meetsThreshold) continue
    if (move.kind === 'chow' && config.declineMarginalChows && nextShanten >= currentShanten) continue

    const better = !best || nextShanten < best.shanten || (nextShanten === best.shanten && move.kind === 'pung' && best.move.kind === 'chow')
    if (better) best = { move, shanten: nextShanten }
  }

  return best?.move ?? { kind: 'pass' }
}

// The single entry point a bot plugs into the turn/claim loop with:
// always takes a free win; otherwise discards via chooseDiscard (never
// voluntarily declaring a concealed/added kong — same M5-deferred
// reasoning as chooseClaimMove); otherwise evaluates claims via
// chooseClaimMove; a draw is never a real decision (exactly one legal
// move exists in that phase).
export function chooseMove(state: GameState, seat: Seat, config: BotPolicyConfig): Move {
  const moves = legalMoves(state, seat)
  const winMove = moves.find((move) => move.kind === 'win' || move.kind === 'selfDrawWin')
  if (winMove) return winMove

  switch (state.phase) {
    case 'awaitingDraw':
      return moves[0]!
    case 'awaitingDiscard':
      return { kind: 'discard', tile: chooseDiscard(state.players[seat].hand) }
    case 'awaitingClaims':
    case 'awaitingRobKongClaims':
      return chooseClaimMove(state, seat, config)
    case 'handEnded':
      throw new Error(`chooseMove called with no legal moves — hand has ended (seat ${seat})`)
  }
}
