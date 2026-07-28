import { useCallback, useEffect, useReducer } from 'react'
import { startScenarioHand, type GameState, type Move, type PendingClaim, type ScenarioPreset } from '@mahjong-mcr/engine'
import { chooseBotMove } from '../game/botAgent.js'
import { gameReducer } from '../game/gameReducer.js'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { pendingSeatsNeedingDecision } from '../game/pendingSeats.js'

// The human is never the dealer for a practice hand — every SCENARIO_LIBRARY
// preset is a 13-tile (non-dealer) hand (see scenarios/library.ts), and
// startScenarioHand throws if concealedTypeIds' length doesn't match what
// forSeat === dealerSeat would require (14).
const PRACTICE_DEALER_SEAT = ((HUMAN_SEAT + 1) % 4) as 0 | 1 | 2 | 3

export interface UsePracticeHandResult {
  state: GameState
  humanPendingClaim: PendingClaim | undefined
  isHumanTurn: boolean
  submitHumanMove: (move: Move) => void
}

// A single practice hand, separate from the live match's useGameLoop: no
// MatchState, no matchScores, no matchMoveLogs — starting or finishing a
// practice hand never touches match progression or session stats (SPEC.md
// §9's practice mode is explicitly a sandbox). Reuses the exact same
// gameReducer/chooseBotMove the live match uses, so bots behave identically.
export function usePracticeHand(preset: ScenarioPreset, seed: number, botSpeedMs: number): UsePracticeHandResult {
  const [gameState, dispatch] = useReducer(
    gameReducer,
    { preset, seed },
    ({ preset, seed }) =>
      startScenarioHand({ preset, seed, forSeat: HUMAN_SEAT, dealerSeat: PRACTICE_DEALER_SEAT }),
  )

  useEffect(() => {
    if (gameState.phase === 'handEnded') return
    const autoSeats = pendingSeatsNeedingDecision(gameState).filter((seat) => gameState.phase === 'awaitingDraw' || seat !== HUMAN_SEAT)
    const timers = autoSeats.map((seat) =>
      setTimeout(
        () => {
          const move = chooseBotMove(gameState, seat)
          dispatch({ type: 'apply', seat, move })
        },
        seat === HUMAN_SEAT ? 0 : botSpeedMs,
      ),
    )
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [gameState, botSpeedMs])

  const pendingSeats = pendingSeatsNeedingDecision(gameState)
  const isHumanTurn = gameState.phase === 'awaitingDiscard' && gameState.currentSeat === HUMAN_SEAT
  const isHumanClaimTurn =
    (gameState.phase === 'awaitingClaims' || gameState.phase === 'awaitingRobKongClaims') && pendingSeats.includes(HUMAN_SEAT)

  const submitHumanMove = useCallback((move: Move) => {
    dispatch({ type: 'apply', seat: HUMAN_SEAT, move })
  }, [])

  return {
    state: gameState,
    humanPendingClaim: isHumanClaimTurn ? gameState.pendingClaim : undefined,
    isHumanTurn,
    submitHumanMove,
  }
}
