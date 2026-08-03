import type { GameState } from '../game-state.js'
import type { Hand } from '../hand.js'
import type { Seat } from '../meld.js'
import { applyMove, legalMoves, type Move } from '../moves.js'
import { calculateShanten, type ShantenResult } from '../shanten.js'
import { ALL_SHANTEN_SHAPES, evaluateDiscards, type DiscardEvaluation } from '../tile-efficiency.js'
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

// The old (pre-Phase-10) whole ranking rule, kept as the tie-break — and, at
// shanten < EARLY_GAME_MIN_SHANTEN below, the entire rule (see rankDiscards).
// Prefers the most ukeire (keeps the hand most flexible), then a honor/
// terminal over a simple (least flexible tiles go first when otherwise
// tied), then a fixed type order — matching the placeholder bot's own
// "deterministic, snapshot-testable" design philosophy.
function legacyDiscardCompare(a: DiscardEvaluation, b: DiscardEvaluation): number {
  if (a.ukeire.totalCount !== b.ukeire.totalCount) return b.ukeire.totalCount - a.ukeire.totalCount
  const aType = typeIdOfInstance(a.tile)
  const bType = typeIdOfInstance(b.tile)
  const aFlex = isHonorTypeId(aType) || isTerminalTypeId(aType) ? 0 : 1
  const bFlex = isHonorTypeId(bType) || isTerminalTypeId(bType) ? 0 : 1
  if (aFlex !== bFlex) return aFlex - bFlex
  return ORDERED_STANDARD_TYPE_IDS.indexOf(aType) - ORDERED_STANDARD_TYPE_IDS.indexOf(bType)
}

// KICKOFF-phase10-strategy-coach.md §1b's two heuristic constants — hand-
// tuned against the fixture hands in policy.test.ts/hints.test.ts, not
// derived from theory. Both are explicitly Stage-2-replaceable: Stage 2
// (ukeire-2) is meant to let flexibility fall out of the arithmetic instead
// of a penalty constant like VIABLE_ROUTE_SHANTEN_MARGIN below.
//
// EARLY_GAME_MIN_SHANTEN: at or above this many shanten from tenpai, a
// discard decision is "early" — worth spending flexibility on, since there's
// still a real number of draws left to decide between routes. Below it
// ("late"), the ranking collapses to exactly the old greedy rule: near
// tenpai, committing to whichever route is already closest is correct, not
// a bug to fix (doc's own "do not improve it").
const EARLY_GAME_MIN_SHANTEN = 3
// VIABLE_ROUTE_SHANTEN_MARGIN: a shape is "in play" this turn if the best
// any candidate discard can achieve for it is within this many shanten of
// the overall best achievable shanten. 1 is the smallest margin that can
// ever matter (0 would mean "only the single best shape counts," collapsing
// straight back to today's behavior) — chosen and verified against the
// live hand this phase's own KICKOFF doc cites (a 2-Character triplet +
// 5-Bamboo pair hand where Standard sits exactly 1 shanten behind Seven
// Pairs and must stay "in play"). Exported so hints.ts's route table can
// mark the SAME shapes "viable" that this file's own ranking treated that
// way, rather than a second hardcoded copy of the number drifting out of
// sync with it.
export const VIABLE_ROUTE_SHANTEN_MARGIN = 1
// MAX_UKEIRE_SACRIFICE_FOR_FLEXIBILITY: regret only overrides raw ukeire
// when the cost of doing so is this many outs or fewer — above it, the
// sacrifice is judged not worth the flexibility and rankDiscards falls back
// to legacyDiscardCompare (today's ukeire-first rule) for that comparison,
// same as it always did. Added after Stage 1's own self-play validation
// (300 seeded games, new-ranking vs. old) came back a regression (119 wins
// vs. 145) with NO cap in place — a live-diagnostic re-run (150 seeds,
// instrumented) found turns-to-tenpai barely moved (7.88 vs 7.90) and
// divergences from old were rare (4.5% of early decisions), but averaged a
// real, uncapped 4.19-out cost apiece with no ceiling on the worst cases.
// 5 sits just above the doc's own worked-example cost (3 outs, WE/WS/WN vs.
// 2C on the live hand) so that fixture still passes, while capping the
// larger, likely-not-worth-it sacrifices the diagnostic surfaced.
export const MAX_UKEIRE_SACRIFICE_FOR_FLEXIBILITY = 5

// KICKOFF-phase10-strategy-coach.md §1b: for each candidate at the best
// achievable resultingShanten, how much worse it makes its own worst VIABLE
// route, relative to the best any candidate could do for that same route —
// "worst-case regret across viable routes." A candidate that keeps every
// viable route exactly at its own best-achievable shanten scores 0 regret;
// one that lets a still-viable route slip scores > 0, in shanten units.
//
// Exported (not just inlined into rankDiscards) so hints.ts's Stage 1c
// confidence/alternative scoring can derive its numbers from the SAME
// regret this function used to rank candidates, rather than an independently
// re-derived approximation that could quietly drift out of sync with the
// actual ranking rationale.
//
// Candidates below the best resultingShanten (never returned by rankDiscards
// at all) get Infinity — they were never really in contention, so "regret"
// isn't a meaningful number for them; callers should never rank by this
// value without also filtering to resultingShanten === the best.
export function computeRouteRegret(evaluations: readonly DiscardEvaluation[]): Map<TileInstanceId, number> {
  const minShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
  const regret = new Map<TileInstanceId, number>()

  if (minShanten < EARLY_GAME_MIN_SHANTEN) {
    for (const e of evaluations) regret.set(e.tile, e.resultingShanten === minShanten ? 0 : Infinity)
    return regret
  }

  const atMin = evaluations.filter((e) => e.resultingShanten === minShanten)
  const routeShanten = (e: DiscardEvaluation, shape: ShantenResult['shape']): number =>
    e.routes.find((r) => r.shape === shape)!.shanten

  const bestForShape = new Map<ShantenResult['shape'], number>(
    ALL_SHANTEN_SHAPES.map((shape) => [shape, Math.min(...atMin.map((e) => routeShanten(e, shape)))]),
  )
  const viableShapes = ALL_SHANTEN_SHAPES.filter((shape) => bestForShape.get(shape)! <= minShanten + VIABLE_ROUTE_SHANTEN_MARGIN)

  for (const e of evaluations) {
    if (e.resultingShanten !== minShanten) {
      regret.set(e.tile, Infinity)
      continue
    }
    regret.set(e.tile, Math.max(...viableShapes.map((shape) => routeShanten(e, shape) - bestForShape.get(shape)!)))
  }
  return regret
}

// Deterministic discard ranking, keyed to distance from tenpai
// (KICKOFF-phase10-strategy-coach.md §1b):
//
// - shanten >= EARLY_GAME_MIN_SHANTEN ("early"): among the tiles achieving
//   the lowest resultingShanten, primarily minimize worst-case regret across
//   viable routes (computeRouteRegret above) — a candidate that quietly
//   kills a route another candidate would have kept alive loses to that
//   other candidate even if it has more raw ukeire, UNLESS the ukeire it
//   would cost to prefer the lower-regret candidate exceeds
//   MAX_UKEIRE_SACRIFICE_FOR_FLEXIBILITY, in which case the sacrifice isn't
//   worth it and ukeire decides instead (see that constant's own comment —
//   added after self-play validation showed uncapped regret-preference is a
//   real regression). Ties (including every hand where regret is 0 for all
//   of atMin, the common case) fall through to legacyDiscardCompare.
// - shanten < EARLY_GAME_MIN_SHANTEN ("late"): collapses to exactly the old
//   greedy rule — committing to whichever route is already closest is
//   correct this close to tenpai, not something to spend flexibility
//   avoiding.
//
// Shared by chooseDiscard (bots, below) and computeBestMoveHint (hints.ts)
// so the hint's "recommended discard" and "other reasonable choices" can
// never disagree with what a bot would actually do with the same hand — this
// change upgrades bot play too, and self-play is Stage 1's own validation
// gate for it (policy.test.ts).
export function rankDiscards(evaluations: DiscardEvaluation[]): DiscardEvaluation[] {
  const minShanten = Math.min(...evaluations.map((e) => e.resultingShanten))
  const atMin = evaluations.filter((e) => e.resultingShanten === minShanten)

  if (minShanten >= EARLY_GAME_MIN_SHANTEN) {
    const regret = computeRouteRegret(evaluations)
    atMin.sort((a, b) => {
      const regretA = regret.get(a.tile)!
      const regretB = regret.get(b.tile)!
      if (regretA !== regretB) {
        const lowerRegretIsA = regretA < regretB
        const lower = lowerRegretIsA ? a : b
        const higher = lowerRegretIsA ? b : a
        const sacrifice = higher.ukeire.totalCount - lower.ukeire.totalCount
        if (sacrifice <= MAX_UKEIRE_SACRIFICE_FOR_FLEXIBILITY) return lowerRegretIsA ? -1 : 1
        // Sacrifice too big — fall through to the ordinary ukeire-first
        // comparison below instead of letting regret decide.
      }
      return legacyDiscardCompare(a, b)
    })
    return atMin
  }

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
