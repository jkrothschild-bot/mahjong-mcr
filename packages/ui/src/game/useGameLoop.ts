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
import { gameReducer } from './gameReducer.js'
import { HUMAN_SEAT } from './humanSeat.js'
import { pendingSeatsNeedingDecision } from './pendingSeats.js'

interface LoopState {
  gameState: GameState
  matchState: MatchState
}

type LoopAction = { type: 'apply'; seat: Seat; move: Move } | { type: 'startNextHand' }

function beginHandFrom(matchState: MatchState): LoopState {
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
  return beginHandFrom(startMatch(matchSeed))
}

function loopReducer(state: LoopState, action: LoopAction): LoopState {
  switch (action.type) {
    case 'apply':
      return { ...state, gameState: gameReducer(state.gameState, action) }
    case 'startNextHand':
      return beginHandFrom(advanceMatch(state.matchState))
  }
}

export interface UseGameLoopResult {
  state: GameState
  matchState: MatchState
  // Set only when HUMAN_SEAT itself must declare against a pending claim —
  // undefined the rest of the time, including while bots are still
  // declaring in the same window.
  humanPendingClaim: PendingClaim | undefined
  isHumanTurn: boolean
  submitHumanMove: (move: Move) => void
  startNextHand: () => void
}

export interface UseGameLoopParams {
  matchSeed: number
  // Delay before a bot's move is dispatched, per SPEC §7's speed presets
  // (Instant/Fast/Normal/Relaxed) — owned by the settings module (Phase 3).
  botSpeedMs: number
}

// Owns one live match's worth of state and drives it forward: bots act on
// their own via a scheduled timer, the human seat only ever advances via
// submitHumanMove. Sorting/hand-tile-order (packages/ui/src/hand/) is a
// separate, purely client-side concern layered on top of whatever this
// hook exposes as the human's hand.
export function useGameLoop(params: UseGameLoopParams): UseGameLoopResult {
  const [{ gameState, matchState }, dispatch] = useReducer(
    loopReducer,
    params.matchSeed,
    initLoopState,
  )

  useEffect(() => {
    if (gameState.phase === 'handEnded') return
    const botSeats = pendingSeatsNeedingDecision(gameState).filter((seat) => seat !== HUMAN_SEAT)
    const timers = botSeats.map((seat) =>
      setTimeout(() => {
        const move = chooseBotMove(gameState, seat)
        dispatch({ type: 'apply', seat, move })
      }, params.botSpeedMs),
    )
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [gameState, params.botSpeedMs])

  const pendingSeats = pendingSeatsNeedingDecision(gameState)
  const isHumanTurn =
    (gameState.phase === 'awaitingDraw' || gameState.phase === 'awaitingDiscard') && gameState.currentSeat === HUMAN_SEAT
  const isHumanClaimTurn =
    (gameState.phase === 'awaitingClaims' || gameState.phase === 'awaitingRobKongClaims') &&
    pendingSeats.includes(HUMAN_SEAT)

  const submitHumanMove = useCallback((move: Move) => {
    dispatch({ type: 'apply', seat: HUMAN_SEAT, move })
  }, [])

  const startNextHand = useCallback(() => {
    dispatch({ type: 'startNextHand' })
  }, [])

  return {
    state: gameState,
    matchState,
    humanPendingClaim: isHumanClaimTurn ? gameState.pendingClaim : undefined,
    isHumanTurn,
    submitHumanMove,
    startNextHand,
  }
}
