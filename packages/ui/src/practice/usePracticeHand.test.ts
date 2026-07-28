import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCENARIO_LIBRARY, typeIdOfInstance } from '@mahjong-mcr/engine'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { usePracticeHand } from './usePracticeHand.js'

const PRESET = SCENARIO_LIBRARY.find((p) => p.id === 'tenpai-two-sided')!

describe('usePracticeHand', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('deals the human seat exactly the preset\'s requested tile types', () => {
    const { result } = renderHook(() => usePracticeHand(PRESET, 1, 20))
    const dealtTypeIds = result.current.state.players[HUMAN_SEAT].hand.concealedTiles.map(typeIdOfInstance).sort()
    expect(dealtTypeIds).toEqual([...PRESET.concealedTypeIds].sort())
  })

  it('is deterministic for a given seed', () => {
    const a = renderHook(() => usePracticeHand(PRESET, 7, 20))
    const b = renderHook(() => usePracticeHand(PRESET, 7, 20))
    expect(a.result.current.state.players[1].hand.concealedTiles).toEqual(b.result.current.state.players[1].hand.concealedTiles)
  })

  it('never puts the human in the dealer seat (every library preset is 13 tiles)', () => {
    const { result } = renderHook(() => usePracticeHand(PRESET, 1, 20))
    expect(result.current.state.dealerSeat).not.toBe(HUMAN_SEAT)
  })

  it('lets the human submit a move and keeps the bots advancing on their own', () => {
    const { result } = renderHook(() => usePracticeHand(PRESET, 1, 20))

    for (let i = 0; i < 60 && !result.current.isHumanTurn && result.current.state.phase !== 'handEnded'; i++) {
      act(() => {
        vi.advanceTimersByTime(20)
      })
    }

    if (result.current.state.phase === 'handEnded') return

    expect(result.current.isHumanTurn).toBe(true)
    const [tile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    expect(() => {
      act(() => {
        result.current.submitHumanMove({ kind: 'discard', tile: tile! })
      })
    }).not.toThrow()
  })
})
