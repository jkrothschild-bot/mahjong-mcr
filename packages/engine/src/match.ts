import type { HandResult } from './game-state.js'
import type { Seat } from './meld.js'
import { mulberry32, nextSeed } from './rng.js'
import type { Wind } from './tiles.js'

const WIND_ROUND_ORDER: readonly Wind[] = ['east', 'south', 'west', 'north']

export interface MatchState {
  matchSeed: number
  prevailingWind: Wind
  roundHandIndex: 1 | 2 | 3 | 4 // dealer-hand slot within the current wind round
  dealerSeat: Seat
  repeatCount: number // times the current dealer has repeated this exact slot
  matchHandNumber: number // total hands played so far, including repeats (monotonic)
  completed: boolean
  handSeeds: number[] // per-hand seeds already consumed, for match-level replay
}

export function startMatch(matchSeed: number): MatchState {
  return {
    matchSeed,
    prevailingWind: 'east',
    roundHandIndex: 1,
    dealerSeat: 0,
    repeatCount: 0,
    matchHandNumber: 1,
    completed: false,
    handSeeds: [],
  }
}

// Derives the seed for hand `handIndex` (0-based) purely from matchSeed, by
// re-running a fresh mulberry32(matchSeed) stream handIndex+1 draws deep.
// Deterministic regardless of what else has happened in the match — no live
// RNG closure is ever stored in MatchState, matching the wall's design.
function deriveHandSeed(matchSeed: number, handIndex: number): number {
  const rng = mulberry32(matchSeed)
  let seed = 0
  for (let i = 0; i <= handIndex; i++) seed = nextSeed(rng)
  return seed
}

export interface BeginHandResult {
  seed: number
  matchState: MatchState
}

// Derives the next hand's seed and records it into handSeeds. Call this
// once per hand, immediately before startHand(). handSeeds is what a match
// replay reads to reproduce every hand's deal without needing to touch
// matchSeed's RNG stream directly.
export function beginHand(state: MatchState): BeginHandResult {
  const seed = deriveHandSeed(state.matchSeed, state.handSeeds.length)
  return { seed, matchState: { ...state, handSeeds: [...state.handSeeds, seed] } }
}

// Dealer repeats (same seat, same prevailing wind, repeatCount++) on dealer
// win or exhaustive draw (docs/rules/decisions.md #4 — generic-mahjong
// default, not yet confirmed against MCR). Otherwise the dealer rotates,
// roundHandIndex advances (wrapping 4->1 and advancing prevailingWind
// east->south->west->north), and the match completes once north round's
// 4th hand resolves without a repeat.
export function advanceMatch(state: MatchState, result: HandResult): MatchState {
  if (state.completed) return state

  const dealerWon = result.outcome === 'win' && (result.winnerSeats ?? []).includes(state.dealerSeat)
  const dealerRepeats = result.outcome === 'exhaustiveDraw' || dealerWon

  if (dealerRepeats) {
    return { ...state, repeatCount: state.repeatCount + 1, matchHandNumber: state.matchHandNumber + 1 }
  }

  const wasLastHandOfMatch = state.roundHandIndex === 4 && state.prevailingWind === 'north'
  if (wasLastHandOfMatch) {
    return { ...state, completed: true, repeatCount: 0, matchHandNumber: state.matchHandNumber + 1 }
  }

  const isLastHandOfRound = state.roundHandIndex === 4
  const nextDealerSeat = ((state.dealerSeat + 1) % 4) as Seat
  const nextRoundHandIndex = (isLastHandOfRound ? 1 : state.roundHandIndex + 1) as 1 | 2 | 3 | 4
  const nextPrevailingWind = isLastHandOfRound
    ? WIND_ROUND_ORDER[(WIND_ROUND_ORDER.indexOf(state.prevailingWind) + 1) % 4]!
    : state.prevailingWind

  return {
    ...state,
    dealerSeat: nextDealerSeat,
    roundHandIndex: nextRoundHandIndex,
    prevailingWind: nextPrevailingWind,
    repeatCount: 0,
    matchHandNumber: state.matchHandNumber + 1,
  }
}
