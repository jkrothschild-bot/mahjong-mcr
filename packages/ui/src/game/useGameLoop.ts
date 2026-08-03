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
  type RecordedMove,
  type Seat,
  type StartHandParams,
} from '@mahjong-mcr/engine'
import { chooseBotMove } from './botAgent.js'
import { deriveHandOutcome } from './deriveScoreContext.js'
import { gameReducer } from './gameReducer.js'
import { HUMAN_SEAT } from './humanSeat.js'
import { pendingSeatsNeedingDecision } from './pendingSeats.js'

const ZERO_MATCH_SCORES: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

// One hand's worth of replay material (M6, SPEC.md §9's "full match replay
// with a scrubber"): the exact params startHand needs to re-deal this hand,
// plus every (seat, Move) applied to it since, in order. Together with
// engine/replay.ts's replayToIndex, this reconstructs the exact GameState
// at any point in the hand — no need to parse the Action log back into
// Moves (see replay.ts's own doc comment for why that's the wrong layer).
export interface HandMoveLog {
  startParams: StartHandParams
  moves: RecordedMove[]
}

interface LoopState {
  gameState: GameState
  matchState: MatchState
  // PlayerState.score is always 0 (the engine never updates it — see
  // game-state.ts) — the UI owns match-total bookkeeping itself, in memory
  // only, by accumulating each hand's settlement payments as it ends.
  matchScores: Record<Seat, number>
  // Every hand played so far this session, in order — in-memory only, not
  // persisted across reloads (matching MatchState's own existing posture).
  matchMoveLogs: HandMoveLog[]
}

type LoopAction = { type: 'apply'; seat: Seat; move: Move } | { type: 'startNextHand' } | { type: 'reset'; matchSeed: number }

interface BegunHand {
  gameState: GameState
  matchState: MatchState
  startParams: StartHandParams
}

function beginHandFrom(matchState: MatchState): BegunHand {
  const { seed, matchState: begun } = beginHand(matchState)
  const startParams: StartHandParams = {
    seed,
    handNumber: begun.matchHandNumber,
    prevailingWind: begun.prevailingWind,
    dealerSeat: begun.dealerSeat,
  }
  return { gameState: startHand(startParams), matchState: begun, startParams }
}

// Exported for direct testing of the match/hand-boundary wiring without a
// full startMatch call.
export function initLoopState(matchSeed: number): LoopState {
  const begun = beginHandFrom(startMatch(matchSeed))
  return {
    gameState: begun.gameState,
    matchState: begun.matchState,
    matchScores: ZERO_MATCH_SCORES,
    matchMoveLogs: [{ startParams: begun.startParams, moves: [] }],
  }
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
    case 'apply': {
      const nextGameState = gameReducer(state.gameState, action)
      // gameReducer is a no-op once the hand has ended (a stale bot timer
      // can fire in the same tick the hand ends from an unrelated
      // dispatch — see gameReducer's own comment) — reference-equal in
      // that case, since applyMove otherwise always returns a new object.
      // Don't log a move that didn't actually happen.
      if (nextGameState === state.gameState) return state
      const logs = state.matchMoveLogs.slice()
      const current = logs[logs.length - 1]!
      logs[logs.length - 1] = { ...current, moves: [...current.moves, { seat: action.seat, move: action.move }] }
      return { ...state, gameState: nextGameState, matchMoveLogs: logs }
    }
    case 'startNextHand': {
      const begun = beginHandFrom(advanceMatch(state.matchState))
      return {
        gameState: begun.gameState,
        matchState: begun.matchState,
        matchScores: applySettlement(state.gameState, state.matchScores),
        matchMoveLogs: [...state.matchMoveLogs, { startParams: begun.startParams, moves: [] }],
      }
    }
    // Discards the current match entirely and begins a brand new one — the
    // "Restart" button's action. Reuses initLoopState wholesale (fresh
    // matchScores, a single fresh move-log entry) rather than reconciling
    // anything from the abandoned match; there's nothing worth keeping.
    // Deliberately does NOT touch session stats (useSessionStats.ts) — that
    // lives entirely outside this reducer (recorded by App.tsx's own effect,
    // keyed off state.phase === 'handEnded', which an abandoned/reset match
    // never reaches), so restarting can never inflate or skew hands-played.
    case 'reset':
      return initLoopState(action.matchSeed)
  }
}

export interface UseGameLoopResult {
  state: GameState
  matchState: MatchState
  matchScores: Record<Seat, number>
  // Every hand played so far this session — M6's replay scrubber reads
  // this directly (see HandMoveLog's own doc comment).
  matchMoveLogs: HandMoveLog[]
  // Set only when HUMAN_SEAT itself must declare against a pending claim —
  // undefined the rest of the time, including while bots are still
  // declaring in the same window.
  humanPendingClaim: PendingClaim | undefined
  isHumanTurn: boolean
  submitHumanMove: (move: Move) => void
  startNextHand: () => void
  // Abandons the current match and begins a brand new one with a fresh
  // random seed — the "Restart" button. Never touches session stats (see
  // loopReducer's 'reset' case).
  resetMatch: () => void
}

export interface UseGameLoopParams {
  matchSeed: number
  // Delay before a bot's move is dispatched, per SPEC §7's speed presets
  // (Instant/Fast/Normal/Relaxed) — owned by the settings module (Phase 3).
  botSpeedMs: number
  // Step mode (bots advancing one decision per explicit tap instead of on
  // this timer) lived here and was removed on the owner's call — the speed
  // presets already cover pacing, and "Relaxed" gives thinking time without
  // a second mechanism or a "Next" button appearing mid-board. It took
  // `hasPendingBotMove` / `advanceOneBotMove` with it.
  //
  // KICKOFF-phase4-discard-overlay.md: while true, no timer is scheduled at
  // all — every seat's turn (bot AND the human's own auto-draw) sits still
  // until this goes false. Set by the discard overlay so a player can't lose
  // a claim window while looking at it. Un-pausing restarts the delay from
  // scratch (does not resume a partially-elapsed timer) — bots have no
  // stateful "thinking in progress" to preserve, so this is simplest and
  // correct. Defaults to false via the `?? false` below so existing callers
  // (tests, ReplayView) that never pass it behave exactly as before.
  paused?: boolean
}

// Owns one live match's worth of state and drives it forward: bots act on
// their own via a scheduled timer, the human seat only ever advances via
// submitHumanMove. Sorting/hand-tile-order (packages/ui/src/hand/) is a
// separate, purely client-side concern layered on top of whatever this
// hook exposes as the human's hand.
export function useGameLoop(params: UseGameLoopParams): UseGameLoopResult {
  const [{ gameState, matchState, matchScores, matchMoveLogs }, dispatch] = useReducer(
    loopReducer,
    params.matchSeed,
    initLoopState,
  )

  useEffect(() => {
    if (gameState.phase === 'handEnded') return
    if (params.paused) return
    // A draw is never a real decision (legalMoves' 'awaitingDraw' case is
    // always exactly [{kind:'draw'}], for every seat including the human) —
    // it's auto-dispatched immediately, same as a bot's move, just with no
    // artificial delay. The human's genuine decisions (discard, claim
    // declarations) always wait for explicit input via submitHumanMove;
    // every bot decision runs on the botSpeedMs timer.
    const autoSeats = pendingSeatsNeedingDecision(gameState).filter(
      (seat) => gameState.phase === 'awaitingDraw' || seat !== HUMAN_SEAT,
    )
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
  }, [gameState, params.botSpeedMs, params.paused])

  const pendingSeats = pendingSeatsNeedingDecision(gameState)
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

  // A fresh random seed each time — restarting is meant to hand the player
  // a genuinely new match, not silently replay the same one over again
  // (see loopReducer's 'reset' case for what it does and doesn't touch).
  // Range matches engine/rng.ts's own nextSeed (a uint32) — mulberry32
  // coerces any number via `>>> 0` regardless, but staying in-range keeps
  // this obviously equivalent to how the engine derives its own seeds.
  const resetMatch = useCallback(() => {
    dispatch({ type: 'reset', matchSeed: Math.floor(Math.random() * 4294967296) })
  }, [])

  return {
    state: gameState,
    matchState,
    matchScores,
    matchMoveLogs,
    humanPendingClaim: isHumanClaimTurn ? gameState.pendingClaim : undefined,
    isHumanTurn,
    submitHumanMove,
    startNextHand,
    resetMatch,
  }
}
