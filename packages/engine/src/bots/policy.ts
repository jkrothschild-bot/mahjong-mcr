import type { GameState } from '../game-state.js'
import type { Hand } from '../hand.js'
import type { Seat } from '../meld.js'
import { applyMove, legalMoves, type Move } from '../moves.js'
import { calculateShanten } from '../shanten.js'
import { evaluateDiscards, type DiscardEvaluation } from '../tile-efficiency.js'
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

// The whole ranking rule (reverted to this, 2026-08-06, after three
// same-direction self-play runs never showed the Stage 1 regret-aware
// ranking helping — see docs/rules/decisions.md #18 and
// KICKOFF-phase10-strategy-coach.md's own decision tree, which named this
// exact revert as the negative-result branch). Prefers the most ukeire
// (keeps the hand most flexible), then a honor/terminal over a simple
// (least flexible tiles go first when otherwise tied), then a fixed type
// order — matching the placeholder bot's own "deterministic,
// snapshot-testable" design philosophy. `computeRouteRegret` and its two
// Stage-1b constants moved to hints.ts, which still needs them for the
// Best Move tab's confidence/alternatives/route-viability display — that
// part of Stage 1 is kept per the KICKOFF doc's own reasoning: the coach
// now SHOWS a player which routes stay alive and their real cost, so the
// bot doesn't need to auto-commit to the flexible choice for the fix to
// have worked.
function legacyDiscardCompare(a: DiscardEvaluation, b: DiscardEvaluation): number {
  if (a.ukeire.totalCount !== b.ukeire.totalCount) return b.ukeire.totalCount - a.ukeire.totalCount
  const aType = typeIdOfInstance(a.tile)
  const bType = typeIdOfInstance(b.tile)
  const aFlex = isHonorTypeId(aType) || isTerminalTypeId(aType) ? 0 : 1
  const bFlex = isHonorTypeId(bType) || isTerminalTypeId(bType) ? 0 : 1
  if (aFlex !== bFlex) return aFlex - bFlex
  return ORDERED_STANDARD_TYPE_IDS.indexOf(aType) - ORDERED_STANDARD_TYPE_IDS.indexOf(bType)
}

// Shared by chooseDiscard (bots, below) and computeBestMoveHint (hints.ts)
// so the hint's "recommended discard" and "other reasonable choices" can
// never disagree with what a bot would actually do with the same hand.
export function rankDiscards(evaluations: DiscardEvaluation[]): DiscardEvaluation[] {
  const minShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
  const atMin = evaluations.filter((e) => e.resultingShanten === minShanten)
  atMin.sort(legacyDiscardCompare)
  return atMin
}

export function chooseDiscard(hand: Hand): TileInstanceId {
  return rankDiscards(evaluateDiscards(hand))[0]!.tile
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
