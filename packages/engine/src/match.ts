import type { Seat } from './meld.js'
import { mulberry32, nextSeed } from './rng.js'
import type { Wind } from './tiles.js'

const WIND_ROUND_ORDER: readonly Wind[] = ['east', 'south', 'west', 'north']

export interface MatchState {
  matchSeed: number
  prevailingWind: Wind
  roundHandIndex: 1 | 2 | 3 | 4 // dealer-hand slot within the current wind round
  dealerSeat: Seat
  matchHandNumber: number // 1..16, monotonic — see docs/rules/decisions.md #4: the
  // dealer rotates unconditionally every hand (no repeat on win or draw), so a
  // complete match is always exactly 4 rounds x 4 hands = 16, no more, no fewer.
  completed: boolean
  handSeeds: number[] // per-hand seeds already consumed, for match-level replay
}

export function startMatch(matchSeed: number): MatchState {
  return {
    matchSeed,
    prevailingWind: 'east',
    roundHandIndex: 1,
    dealerSeat: 0,
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

// The dealer rotates to the next seat unconditionally after every hand —
// docs/rules/decisions.md #4, §3.4.8 & §3.6.2: "the dealer should pass the
// dice to the right, regardless of whether he wins the hand or not." There
// is no repeat-on-win or repeat-on-draw mechanic in MCR (unlike most other
// mahjong variants) — a complete match is always exactly 16 hands. The hand
// outcome (win vs. exhaustive draw) plays no role in this transition at
// all, hence no HandResult parameter.
export function advanceMatch(state: MatchState): MatchState {
  if (state.completed) return state

  const isLastHandOfRound = state.roundHandIndex === 4
  const wasLastHandOfMatch = isLastHandOfRound && state.prevailingWind === 'north'

  // The match is over after hand 16 (north round's 4th hand) — nothing to
  // rotate into, so matchHandNumber stays at 16 rather than advancing to a
  // nonexistent 17th hand.
  if (wasLastHandOfMatch) return { ...state, completed: true }

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
    matchHandNumber: state.matchHandNumber + 1,
  }
}
