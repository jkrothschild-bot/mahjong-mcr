import { useCallback, useEffect, useReducer } from 'react'
import {
  advanceMatch,
  beginHand,
  startHand,
  startMatch,
  type GameState,
  type MatchState,
  type Move,
  type PendingClaim,
  type Seat,
} from '@mahjong-mcr/engine'
import { chooseBotMove } from './botAgent.js'
import { deriveHandOutcome } from './deriveScoreContext.js'
import { gameReducer } from './gameReducer.js'
import { HUMAN_SEAT } from './humanSeat.js'
import { pendingSeatsNeedingDecision } from './pendingSeats.js'

const ZERO_MATCH_SCORES: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

interface LoopState {
  gameState: GameState
  matchState: MatchState
  // PlayerState.score is always 0 (the engine never updates it — see
  // game-state.ts) — the UI owns match-total bookkeeping itself, in memory
  // only, by accumulating each hand's settlement payments as it ends.
  matchScores: Record<Seat, number>
}

type LoopAction = { type: 'apply'; seat: Seat; move: Move } | { type: 'startNextHand' }

function beginHandFrom(matchState: MatchState): Pick<LoopState, 'gameState' | 'matchState'> {
  const { seed, matchState: begun } = beginHand(matchState)
  const gameState = startHand({
    seed,
    handNumber: begun.matchHandNumber,
    prevailingWind: begun.prevailingWind,
    dealerSeat: begun.dealerSeat,
  })
  return { gameState, matchState: begun }
}

// Exported for direct testing of the match/hand-boundary wiring without a
// full startMatch call.
export function initLoopState(matchSeed: number): LoopState {
  return { ...beginHandFrom(startMatch(matchSeed)), matchScores: ZERO_MATCH_SCORES }
}

// Folds the ending hand's settlement (if any — an exhaustive draw pays out
// nothing) into the running match totals, before the next hand begins.
// Exported for direct unit testing of the match-score bookkeeping, without
// needing to play a live hand through to a real win via the timer-driven
// hook (see useGameLoop.test.ts).
export function applySettlement(endedGameState: GameState, scores: Record<Seat, number>): Record<Seat, number> {
  const outcome = deriveHandOutcome(endedGameState)
  if (!outcome) return scores
  const next = { ...scores }
  for (const seat of [0, 1, 2, 3] as const) next[seat] += outcome.settlement.payments[seat]
  return next
}

function loopReducer(state: LoopState, action: LoopAction): LoopState {
  switch (action.type) {
    case 'apply':
      return { ...state, gameState: gameReducer(state.gameState, action) }
    case 'startNextHand':
      return {
        ...beginHandFrom(advanceMatch(state.matchState)),
        matchScores: applySettlement(state.gameState, state.matchScores),
      }
  }
}

export interface UseGameLoopResult {
  state: GameState
  matchState: MatchState
  matchScores: Record<Seat, number>
  // Set only when HUMAN_SEAT itself must declare against a pending claim —
  // undefined the rest of the time, including while bots are still
  // declaring in the same window.
  humanPendingClaim: PendingClaim | undefined
  isHumanTurn: boolean
  submitHumanMove: (move: Move) => void
  startNextHand: () => void
  // True whenever a non-human seat has a real decision pending (a draw
  // never counts — it isn't a real decision and always auto-resolves
  // regardless of step mode). Only meaningful for gating the "Next" button;
  // advanceOneBotMove is a no-op if nothing is actually pending.
  hasPendingBotMove: boolean
  advanceOneBotMove: () => void
}

export interface UseGameLoopParams {
  matchSeed: number
  // Delay before a bot's move is dispatched, per SPEC §7's speed presets
  // (Instant/Fast/Normal/Relaxed) — owned by the settings module (Phase 3).
  botSpeedMs: number
  // When true, a bot's real decisions (discard, claim declarations) wait
  // for an explicit advanceOneBotMove() call instead of the botSpeedMs
  // timer — one bot decision per call, for studying them one at a time.
  // Draws still auto-resolve immediately regardless (see the effect below).
  stepMode: boolean
}

// Owns one live match's worth of state and drives it forward: bots act on
// their own via a scheduled timer, the human seat only ever advances via
// submitHumanMove. Sorting/hand-tile-order (packages/ui/src/hand/) is a
// separate, purely client-side concern layered on top of whatever this
// hook exposes as the human's hand.
export function useGameLoop(params: UseGameLoopParams): UseGameLoopResult {
  const [{ gameState, matchState, matchScores }, dispatch] = useReducer(
    loopReducer,
    params.matchSeed,
    initLoopState,
  )

  useEffect(() => {
    if (gameState.phase === 'handEnded') return
    // A draw is never a real decision (legalMoves' 'awaitingDraw' case is
    // always exactly [{kind:'draw'}], for every seat including the human) —
    // it's auto-dispatched immediately, same as a bot's move, just with no
    // artificial delay, regardless of step mode. The human's genuine
    // decisions (discard, claim declarations) always wait for explicit
    // input via submitHumanMove. A bot's genuine decisions wait for
    // advanceOneBotMove instead of this timer when step mode is on.
    const autoSeats = pendingSeatsNeedingDecision(gameState).filter((seat) => {
      if (gameState.phase === 'awaitingDraw') return true
      if (seat === HUMAN_SEAT) return false
      return !params.stepMode
    })
    const timers = autoSeats.map((seat) =>
      setTimeout(
        () => {
          const move = chooseBotMove(gameState, seat)
          dispatch({ type: 'apply', seat, move })
        },
        seat === HUMAN_SEAT ? 0 : params.botSpeedMs,
      ),
    )
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [gameState, params.botSpeedMs, params.stepMode])

  const pendingSeats = pendingSeatsNeedingDecision(gameState)
  const pendingBotSeat = gameState.phase !== 'awaitingDraw' ? pendingSeats.find((seat) => seat !== HUMAN_SEAT) : undefined
  // 'awaitingDraw' is deliberately excluded here even though it's the
  // human's currentSeat — there's no decision to make in that phase (see
  // the auto-draw effect above), so treating it as "your turn" let the
  // discard button render active before the mandatory draw had happened,
  // throwing when submitted (moves.ts rejects 'discard' during
  // 'awaitingDraw').
  const isHumanTurn = gameState.phase === 'awaitingDiscard' && gameState.currentSeat === HUMAN_SEAT
  const isHumanClaimTurn =
    (gameState.phase === 'awaitingClaims' || gameState.phase === 'awaitingRobKongClaims') &&
    pendingSeats.includes(HUMAN_SEAT)

  const submitHumanMove = useCallback((move: Move) => {
    dispatch({ type: 'apply', seat: HUMAN_SEAT, move })
  }, [])

  const startNextHand = useCallback(() => {
    dispatch({ type: 'startNextHand' })
  }, [])

  // Dispatches exactly one pending bot seat's move immediately — the
  // step-mode "Next" button's action. A no-op if nothing is actually
  // pending (e.g. the button was somehow clicked mid-transition).
  const advanceOneBotMove = useCallback(() => {
    if (pendingBotSeat === undefined) return
    const move = chooseBotMove(gameState, pendingBotSeat)
    dispatch({ type: 'apply', seat: pendingBotSeat, move })
  }, [gameState, pendingBotSeat])

  return {
    state: gameState,
    matchState,
    matchScores,
    humanPendingClaim: isHumanClaimTurn ? gameState.pendingClaim : undefined,
    hasPendingBotMove: pendingBotSeat !== undefined,
    advanceOneBotMove,
    isHumanTurn,
    submitHumanMove,
    startNextHand,
  }
}
