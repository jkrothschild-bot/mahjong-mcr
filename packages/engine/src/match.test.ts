import { describe, expect, it } from 'vitest'
import { advanceMatch, beginHand, startMatch } from './match.js'

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

// The dealer rotates to the next seat unconditionally after every hand —
// docs/rules/decisions.md #4 (§3.4.8, §3.6.2): "the dealer should pass the
// dice to the right, regardless of whether he wins the hand or not." There
// is no repeat-on-win or repeat-on-draw mechanic in MCR, so advanceMatch
// doesn't even take a HandResult — the outcome plays no role.
describe('advanceMatch', () => {
  it('rotates the dealer and advances roundHandIndex, regardless of hand outcome', () => {
    const state = startMatch(1)
    const next = advanceMatch(state)
    expect(next.dealerSeat).toBe(1)
    expect(next.roundHandIndex).toBe(2)
    expect(next.prevailingWind).toBe('east')
    expect(next.matchHandNumber).toBe(2)
    expect(next.completed).toBe(false)
  })

  it('advances the prevailing wind when a round wraps (roundHandIndex 4 -> 1)', () => {
    let state = startMatch(1)
    state = { ...state, roundHandIndex: 4, dealerSeat: 3 }
    const next = advanceMatch(state)
    expect(next.roundHandIndex).toBe(1)
    expect(next.prevailingWind).toBe('south')
    expect(next.dealerSeat).toBe(0)
  })

  it('completes the match after the north round\'s 4th hand', () => {
    let state = startMatch(1)
    state = { ...state, prevailingWind: 'north', roundHandIndex: 4, dealerSeat: 3 }
    const next = advanceMatch(state)
    expect(next.completed).toBe(true)
  })

  it('is a no-op once the match is completed', () => {
    let state = startMatch(1)
    state = { ...state, completed: true }
    const next = advanceMatch(state)
    expect(next).toEqual(state)
  })

  it('reaches exactly 16 hands (4 rounds x 4) when advanced unconditionally from the start', () => {
    let state = startMatch(1)
    let advances = 0
    while (!state.completed) {
      state = advanceMatch(state)
      advances++
    }
    expect(state.matchHandNumber).toBe(16)
    expect(advances).toBe(16) // hand 1 -> ... -> hand 16, then the 16th call flips completed
  })
})
