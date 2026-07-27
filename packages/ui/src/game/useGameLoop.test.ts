import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initLoopState, useGameLoop } from './useGameLoop.js'
import { HUMAN_SEAT } from './humanSeat.js'

describe('initLoopState', () => {
  it('starts hand 1 of the match with the dealer at seat 0', () => {
    const { gameState, matchState } = initLoopState(42)
    expect(matchState.matchHandNumber).toBe(1)
    expect(matchState.roundHandIndex).toBe(1)
    expect(matchState.dealerSeat).toBe(0)
    // The dealer's 14th tile is folded into the deal — first phase is a
    // discard, not a draw (see game-state.ts's startHand doc comment).
    expect(gameState.phase).toBe('awaitingDiscard')
    expect(gameState.currentSeat).toBe(0)
  })

  it('is deterministic for a given seed', () => {
    const a = initLoopState(42)
    const b = initLoopState(42)
    expect(a.gameState.players[0].hand.concealedTiles).toEqual(b.gameState.players[0].hand.concealedTiles)
  })
})

describe('useGameLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not auto-play the human seat\'s own pending decision', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 50 }))
    // Hand 1's dealer is seat 0 === HUMAN_SEAT, so it opens on the human's turn.
    expect(result.current.isHumanTurn).toBe(true)
    const stateBefore = result.current.state

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(result.current.state).toBe(stateBefore)
  })

  it('keeps advancing via bots until the human must act again or the hand ends', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20 }))
    expect(result.current.state.currentSeat).toBe(HUMAN_SEAT)

    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })

    // Drain up to a generous number of bot-speed ticks — enough for several
    // seats' worth of turns/claim declarations to resolve.
    for (let i = 0; i < 40; i++) {
      act(() => {
        vi.advanceTimersByTime(20)
      })
    }

    const settled = result.current
    const stoppedForHuman = settled.isHumanTurn || settled.humanPendingClaim !== undefined
    const handOver = settled.state.phase === 'handEnded'
    expect(stoppedForHuman || handOver).toBe(true)
  })

  it('startNextHand rotates the dealer per MCR (unconditional rotation)', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20 }))
    expect(result.current.matchState.dealerSeat).toBe(0)

    act(() => {
      result.current.startNextHand()
    })

    expect(result.current.matchState.matchHandNumber).toBe(2)
    expect(result.current.matchState.dealerSeat).toBe(1)
    expect(result.current.state.handNumber).toBe(2)
  })
})
