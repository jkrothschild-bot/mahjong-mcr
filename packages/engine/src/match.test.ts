import { describe, expect, it } from 'vitest'
import { advanceMatch, beginHand, startMatch } from './match.js'
import type { HandResult } from './game-state.js'

describe('beginHand / hand seed derivation', () => {
  it('is deterministic and produces a distinct seed per hand regardless of prior match state', () => {
    let state = startMatch(123)
    const seeds: number[] = []
    for (let i = 0; i < 5; i++) {
      const { seed, matchState } = beginHand(state)
      seeds.push(seed)
      state = matchState
    }
    expect(new Set(seeds).size).toBe(5) // all distinct
    expect(state.handSeeds).toEqual(seeds)

    // Replaying from scratch with the same matchSeed reproduces the same sequence.
    let replay = startMatch(123)
    const replaySeeds: number[] = []
    for (let i = 0; i < 5; i++) {
      const { seed, matchState } = beginHand(replay)
      replaySeeds.push(seed)
      replay = matchState
    }
    expect(replaySeeds).toEqual(seeds)
  })
})

describe('advanceMatch', () => {
  const dealerWin: HandResult = { outcome: 'win', winnerSeats: [0], winMethod: 'discard' }
  const nonDealerWin: HandResult = { outcome: 'win', winnerSeats: [1], winMethod: 'discard' }
  const exhaustiveDraw: HandResult = { outcome: 'exhaustiveDraw' }

  it('repeats the dealer seat on a dealer win', () => {
    const state = startMatch(1)
    const next = advanceMatch(state, dealerWin)
    expect(next.dealerSeat).toBe(0)
    expect(next.roundHandIndex).toBe(1)
    expect(next.prevailingWind).toBe('east')
    expect(next.repeatCount).toBe(1)
    expect(next.matchHandNumber).toBe(2)
  })

  it('repeats the dealer seat on an exhaustive draw', () => {
    const state = startMatch(1)
    const next = advanceMatch(state, exhaustiveDraw)
    expect(next.dealerSeat).toBe(0)
    expect(next.repeatCount).toBe(1)
  })

  it('rotates the dealer and advances roundHandIndex on a non-dealer win', () => {
    const state = startMatch(1)
    const next = advanceMatch(state, nonDealerWin)
    expect(next.dealerSeat).toBe(1)
    expect(next.roundHandIndex).toBe(2)
    expect(next.prevailingWind).toBe('east') // unchanged until round wraps
    expect(next.repeatCount).toBe(0)
    expect(next.matchHandNumber).toBe(2)
  })

  it('advances the prevailing wind when a round wraps (roundHandIndex 4 -> 1)', () => {
    let state = startMatch(1)
    // Force to the last hand of the east round without any repeats.
    state = { ...state, roundHandIndex: 4, dealerSeat: 3 }
    const next = advanceMatch(state, nonDealerWin)
    expect(next.roundHandIndex).toBe(1)
    expect(next.prevailingWind).toBe('south')
    expect(next.dealerSeat).toBe(0)
  })

  it('completes the match after the north round\'s 4th hand resolves without a repeat', () => {
    let state = startMatch(1)
    state = { ...state, prevailingWind: 'north', roundHandIndex: 4, dealerSeat: 3 }
    const next = advanceMatch(state, nonDealerWin)
    expect(next.completed).toBe(true)
  })

  it('does not complete the match if the north round\'s 4th hand is a dealer repeat', () => {
    let state = startMatch(1)
    state = { ...state, prevailingWind: 'north', roundHandIndex: 4, dealerSeat: 0 }
    const next = advanceMatch(state, dealerWin)
    expect(next.completed).toBe(false)
    expect(next.repeatCount).toBe(1)
  })

  it('is a no-op once the match is completed', () => {
    let state = startMatch(1)
    state = { ...state, completed: true }
    const next = advanceMatch(state, nonDealerWin)
    expect(next).toEqual(state)
  })
})
