import { describe, expect, it } from 'vitest'
import { applyMove, legalMoves, type Move } from '../moves.js'
import { startHand, type GameState } from '../game-state.js'
import type { Hand } from '../hand.js'
import type { Seat } from '../meld.js'
import { evaluateDiscards, type DiscardEvaluation } from '../tile-efficiency.js'
import { typeIdOfInstance } from '../tiles.js'
import { isHonorTypeId, isTerminalTypeId } from '../scoring/set-helpers.js'
import { ORDERED_STANDARD_TYPE_IDS } from '../win-detection.js'
import { BOT_PRESETS, chooseClaimMove, rankDiscards, type BotPolicyConfig } from './policy.js'
import type { WinCircumstanceContext } from '../waits.js'

// packages/engine's tsconfig deliberately has no "node"/"dom" lib (the
// package stays pure, environment-agnostic TS) — this file is test-only
// tooling that needs the two Node globals below, so they're declared
// locally here rather than widening the whole package's ambient types.
declare const process: { env: Record<string, string | undefined> }
declare const console: { log: (...args: unknown[]) => void }

// KICKOFF-phase10-strategy-coach.md §1e's merge gate #2: "bots with the new
// [regret-aware] ranking vs bots with the old [greedy] ranking, several
// hundred seeded headless games... the new ranking should win or draw
// overall — report the number honestly; a regression blocks the merge."
//
// Not part of the default `npm test` run — several hundred full hands with
// real shanten/route computation (see tile-efficiency.ts's own measured
// ~13-43ms per discard decision) would take minutes, which has no place in
// the fast feedback loop every commit runs. Gated behind an env var instead
// of `.skip`, so it stays runnable with zero source edits:
//
//   SELFPLAY_COMPARE=1 npx vitest run src/bots/selfplay-compare.test.ts
//
// (run from packages/engine). Report the printed win/draw/loss tally in the
// Stage 1 merge writeup, per the doc's own "report the number honestly."
const RUN = process.env.SELFPLAY_COMPARE === '1'
// SELFPLAY_SEEDS overrides the default 300 ("several hundred" per the doc)
// — useful for a quick smoke run while iterating on the ranking itself.
const SEED_COUNT = RUN ? Number(process.env.SELFPLAY_SEEDS ?? 300) : 0

// The pre-Stage-1 ranking, frozen verbatim (not re-exported from policy.ts,
// which now only has the regret-aware version) — this is deliberately an
// independent copy, not a call into today's code, so the comparison is
// actually "new vs. old," not "new vs. itself under a different name."
// `hand`/`context` are accepted only to match today's real rankDiscards
// signature (decisions.md #39's route-aware tie-break) — this frozen
// historical copy never used them and still doesn't.
function oldRankDiscards(evaluations: DiscardEvaluation[], _hand: Hand, _context?: WinCircumstanceContext): DiscardEvaluation[] {
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
  return atMin
}

type RankFn = (evaluations: DiscardEvaluation[], hand: Hand, context?: WinCircumstanceContext) => DiscardEvaluation[]

function chooseDiscardWith(rank: RankFn, hand: Hand, context: WinCircumstanceContext) {
  return rank(evaluateDiscards(hand), hand, context)[0]!.tile
}

// Mirrors policy.ts's own chooseMove exactly, parameterized on which
// rankDiscards implementation makes the discard decision — claim behavior
// (chooseClaimMove) is untouched by Stage 1 and shared identically by both
// sides, so only the discard choice differs between "new" and "old" bots.
function chooseMoveWith(rank: RankFn, state: GameState, seat: Seat, config: BotPolicyConfig): Move {
  const moves = legalMoves(state, seat)
  const winMove = moves.find((m) => m.kind === 'win' || m.kind === 'selfDrawWin')
  if (winMove) return winMove

  switch (state.phase) {
    case 'awaitingDraw':
      return moves[0]!
    case 'awaitingDiscard': {
      const context: WinCircumstanceContext = { prevailingWind: state.prevailingWind, seatWind: state.players[seat].seatWind }
      return { kind: 'discard', tile: chooseDiscardWith(rank, state.players[seat].hand, context) }
    }
    case 'awaitingClaims':
    case 'awaitingRobKongClaims':
      return chooseClaimMove(state, seat, config)
    case 'handEnded':
      throw new Error(`chooseMoveWith called with no legal moves — hand has ended (seat ${seat})`)
  }
}

function pendingSeatsNeedingDecision(state: GameState): Seat[] {
  switch (state.phase) {
    case 'awaitingDraw':
    case 'awaitingDiscard':
      return [state.currentSeat]
    case 'awaitingClaims':
    case 'awaitingRobKongClaims': {
      const pendingClaim = state.pendingClaim
      if (!pendingClaim) return []
      return pendingClaim.eligibleSeats.filter((seat) => pendingClaim.declarations[seat] === undefined)
    }
    case 'handEnded':
      return []
  }
}

// Alternates which physical seats (0&2 vs 1&3) play the "new" ranking each
// seed, canceling out any positional/dealer bias a fixed assignment would
// bake in — seat 0 is always dealerSeat for these single-hand fixtures
// (matches policy.test.ts's own baseState convention), so without
// alternation "new" would always also mean "dealer," confounding the result.
function playOneHand(seed: number, newRankSeats: ReadonlySet<Seat>): GameState {
  let state = startHand({ seed, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
  let actions = 0
  const cap = 2000
  while (state.phase !== 'handEnded') {
    if (actions++ > cap) throw new Error(`Exceeded ${cap} actions for seed ${seed} — possible infinite loop`)
    const seat = pendingSeatsNeedingDecision(state)[0]!
    const rank = newRankSeats.has(seat) ? rankDiscards : oldRankDiscards
    const move = chooseMoveWith(rank, state, seat, BOT_PRESETS.balanced)
    state = applyMove(state, seat, move)
  }
  return state
}

describe.skipIf(!RUN)('self-play: new (regret-aware) ranking vs. old (greedy) ranking', () => {
  it(
    `plays ${SEED_COUNT} seeded hands, "new" seats (0&2 on even seeds, 1&3 on odd) vs. "old," and reports the tally`,
    () => {
      let newWins = 0
      let oldWins = 0
      let draws = 0
      let mixedWins = 0 // shouldn't happen (winnerSeats.length is always <=1 per M1), but counted honestly if it did

      for (let seed = 0; seed < SEED_COUNT; seed++) {
        const newRankSeats: ReadonlySet<Seat> = seed % 2 === 0 ? new Set([0, 2]) : new Set([1, 3])
        const finalState = playOneHand(seed, newRankSeats)
        const result = finalState.result!

        if (result.outcome === 'exhaustiveDraw') {
          draws++
          continue
        }
        const winners = result.winnerSeats ?? []
        if (winners.length !== 1) {
          mixedWins++
          continue
        }
        const winnerIsNew = newRankSeats.has(winners[0]!)
        if (winnerIsNew) newWins++
        else oldWins++
      }

      // eslint-disable-next-line no-console
      console.log(
        `[selfplay-compare] seeds=${SEED_COUNT} newWins=${newWins} oldWins=${oldWins} draws=${draws} mixedWins=${mixedWins}`,
      )

      expect(mixedWins).toBe(0)
      // The merge gate: new must win or draw overall against old, not
      // regress. "Win" here means newWins >= oldWins across the sweep.
      expect(newWins).toBeGreaterThanOrEqual(oldWins)
    },
    RUN ? 20 * 60_000 : 0,
  )
})
