// Headless "pick a uniformly random legal move" harness — used by the
// property tests to exercise the full turn/claim state machine across many
// seeded games. Not part of the public engine API (see the note in
// index.ts about why this stays out of the barrel export): it's test
// support, reusable later by M4's bot-simulation test harness via a direct
// path import.
import { applyMove, legalMoves, type Move } from '../moves.js'
import { startHand, type GameState } from '../game-state.js'
import { advanceMatch, beginHand, startMatch, type MatchState } from '../match.js'
import type { Seat } from '../meld.js'
import { mulberry32, type Rng } from '../rng.js'
import type { Wind } from '../tiles.js'

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

function pickRandom<T>(items: readonly T[], rng: Rng): T {
  const index = Math.min(Math.floor(rng.next() * items.length), items.length - 1)
  return items[index]!
}

export interface RandomHandParams {
  seed: number
  handNumber: number
  prevailingWind: Wind
  dealerSeat: Seat
  agentRng: Rng
  // Fired after every applied move (not the initial deal) — the property
  // tests use this to assert invariants at every step and/or to record the
  // exact (seat, move) history for independent replay.
  onMove?: (seat: Seat, move: Move, state: GameState) => void
  maxActions?: number
}

export function playRandomHand(params: RandomHandParams): GameState {
  let state = startHand({
    seed: params.seed,
    handNumber: params.handNumber,
    prevailingWind: params.prevailingWind,
    dealerSeat: params.dealerSeat,
  })
  let actions = 0
  const cap = params.maxActions ?? 20_000

  while (state.phase !== 'handEnded') {
    if (actions++ > cap) {
      throw new Error(`Exceeded ${cap} actions for a single hand — possible infinite loop (seed ${params.seed})`)
    }
    const candidateSeats = pendingSeatsNeedingDecision(state)
    const seat = pickRandom(candidateSeats, params.agentRng)
    const moves = legalMoves(state, seat)
    if (moves.length === 0) {
      throw new Error(`No legal moves for seat ${seat} in phase ${state.phase} — engine bug (seed ${params.seed})`)
    }
    // A uniformly-random agent that sometimes declines a free win makes
    // hands (and matches, via the resulting exhaustive-draw-heavy dealer
    // repeats) take unrealistically long to terminate. Always take a win
    // when it's on offer — the only sensible behavior for termination
    // testing — otherwise pick uniformly among the rest.
    const winMoves = moves.filter((m) => m.kind === 'win' || m.kind === 'selfDrawWin')
    const move = winMoves.length > 0 ? pickRandom(winMoves, params.agentRng) : pickRandom(moves, params.agentRng)
    state = applyMove(state, seat, move)
    params.onMove?.(seat, move, state)
  }

  return state
}

export interface RandomMatchParams {
  matchSeed: number
  agentSeed: number
  maxActionsPerHand?: number
  maxHandsPerMatch?: number
  onHandEnd?: (finalState: GameState, matchState: MatchState) => void
}

export interface RandomMatchResult {
  matchState: MatchState
  handsPlayed: number
}

export function playRandomMatch(params: RandomMatchParams): RandomMatchResult {
  const agentRng = mulberry32(params.agentSeed)
  let matchState = startMatch(params.matchSeed)
  const maxHands = params.maxHandsPerMatch ?? 200
  let handsPlayed = 0

  while (!matchState.completed) {
    if (handsPlayed++ > maxHands) {
      throw new Error(`Exceeded ${maxHands} hands in a single match — possible non-terminating rotation (matchSeed ${params.matchSeed})`)
    }
    const { seed, matchState: begun } = beginHand(matchState)
    matchState = begun
    const finalState = playRandomHand({
      seed,
      handNumber: matchState.matchHandNumber,
      prevailingWind: matchState.prevailingWind,
      dealerSeat: matchState.dealerSeat,
      agentRng,
      maxActions: params.maxActionsPerHand,
    })
    params.onHandEnd?.(finalState, matchState)
    matchState = advanceMatch(matchState, finalState.result!)
  }

  return { matchState, handsPlayed }
}
