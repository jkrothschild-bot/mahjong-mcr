import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyMove, replayToIndex } from '@mahjong-mcr/engine'
import {
  TILE_TYPE_BY_ID,
  emptyHand,
  seatWindFor,
  typeIdOfInstance,
  type GameState,
  type Hand,
  type PlayerState,
  type Seat,
  type TileTypeId,
} from '@mahjong-mcr/engine'
import { applySettlement, initLoopState, useGameLoop } from './useGameLoop.js'
import { HUMAN_SEAT } from './humanSeat.js'

const ZERO_SCORES: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: number[]): Hand {
  return { ...emptyHand(), concealedTiles }
}

// Two dragon pungs (rather than one dragon pung + a plain chow) so this
// clears moves.ts's 8-point win-legality minimum on a self-draw win.
function tenpaiWaitingOnC5(): number[] {
  return [
    ...idsFor('C3', 1),
    ...idsFor('C4', 1),
    ...idsFor('B7', 1),
    ...idsFor('B8', 1),
    ...idsFor('B9', 1),
    ...idsFor('DW', 3),
    ...idsFor('DG', 3),
    ...idsFor('C9', 2),
  ]
}

function baseState(hands: [Hand, Hand, Hand, Hand]): GameState {
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: { tiles: idsFor('C1', 1), drawIndex: 0 },
    players,
    currentSeat: 0,
    phase: 'awaitingDraw',
    actionLog: [],
  }
}

describe('applySettlement', () => {
  it('leaves scores unchanged after an exhaustive draw', () => {
    const state: GameState = { ...baseState([handWith([]), handWith([]), handWith([]), handWith([])]), phase: 'handEnded', result: { outcome: 'exhaustiveDraw' } }
    expect(applySettlement(state, ZERO_SCORES)).toEqual(ZERO_SCORES)
  })

  it('accumulates a self-draw win\'s settlement into the running totals', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith(tenpaiWaitingOnC5()), handWith([]), handWith([]), handWith([])])
    state.wall = { tiles: [c5!, ...idsFor('C6', 4)], drawIndex: 0 }
    state = applyMove(state, 0, { kind: 'draw' })
    state = applyMove(state, 0, { kind: 'selfDrawWin' })

    const scores = applySettlement(state, ZERO_SCORES)
    expect(scores[0]).toBeGreaterThan(0)
    expect(Object.values(scores).reduce((sum, v) => sum + v, 0)).toBe(0)

    // A second hand's settlement adds onto the first, rather than replacing it.
    const scoresAfterTwoHands = applySettlement(state, scores)
    expect(scoresAfterTwoHands[0]).toBe(scores[0] * 2)
  })
})

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

  it('starts with exactly one empty move log entry for hand 1', () => {
    const { matchMoveLogs, gameState } = initLoopState(42)
    expect(matchMoveLogs).toHaveLength(1)
    expect(matchMoveLogs[0]!.moves).toEqual([])
    expect(matchMoveLogs[0]!.startParams).toEqual({
      seed: gameState.seed,
      handNumber: gameState.handNumber,
      prevailingWind: gameState.prevailingWind,
      dealerSeat: gameState.dealerSeat,
    })
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
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 50, stepMode: false }))
    // Hand 1's dealer is seat 0 === HUMAN_SEAT, so it opens on the human's turn.
    expect(result.current.isHumanTurn).toBe(true)
    const stateBefore = result.current.state

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(result.current.state).toBe(stateBefore)
  })

  it('keeps advancing via bots until the human must act again or the hand ends', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: false }))
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

  it('auto-draws for the human on their second turn, so a second discard does not throw', () => {
    // Regression test: legalMoves' 'awaitingDraw' phase has exactly one
    // move ({kind:'draw'}) for whichever seat is currentSeat, including the
    // human — but the bot-scheduling effect used to filter HUMAN_SEAT out
    // of every phase, so nobody ever drew for the human on their second+
    // turn. The UI still reported isHumanTurn === true (a stale bug) and
    // let a tile be selected and discarded, which threw
    // "Illegal move discard in awaitingDraw phase" in moves.ts.
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: false }))

    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })

    for (let i = 0; i < 60 && result.current.state.phase !== 'handEnded' && !result.current.isHumanTurn; i++) {
      act(() => {
        vi.advanceTimersByTime(20)
      })
    }

    if (result.current.state.phase === 'handEnded') return // rare: hand ended before the human's next turn

    expect(result.current.isHumanTurn).toBe(true)
    expect(result.current.state.phase).toBe('awaitingDiscard')
    expect(result.current.state.currentSeat).toBe(HUMAN_SEAT)

    const [nextTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    expect(() => {
      act(() => {
        result.current.submitHumanMove({ kind: 'discard', tile: nextTile! })
      })
    }).not.toThrow()
  })

  it("records every applied move into the current hand's move log, replayable back to the exact live state", () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: false }))

    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })
    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.advanceTimersByTime(20)
      })
    }

    expect(result.current.matchMoveLogs).toHaveLength(1)
    const log = result.current.matchMoveLogs[0]!
    expect(log.moves.length).toBeGreaterThan(0)
    expect(replayToIndex(log.startParams, log.moves, log.moves.length)).toEqual(result.current.state)
  })

  it('startNextHand pushes a fresh, empty move-log entry for the new hand', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: false }))

    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    const movesInHand1 = result.current.matchMoveLogs[0]!.moves.length
    expect(movesInHand1).toBeGreaterThan(0)

    act(() => {
      result.current.startNextHand()
    })

    expect(result.current.matchMoveLogs).toHaveLength(2)
    expect(result.current.matchMoveLogs[0]!.moves).toHaveLength(movesInHand1) // hand 1's log is untouched
    expect(result.current.matchMoveLogs[1]!.moves).toEqual([])
    expect(result.current.matchMoveLogs[1]!.startParams).toEqual({
      seed: result.current.state.seed,
      handNumber: result.current.state.handNumber,
      prevailingWind: result.current.state.prevailingWind,
      dealerSeat: result.current.state.dealerSeat,
    })
  })

  it('startNextHand rotates the dealer per MCR (unconditional rotation)', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: false }))
    expect(result.current.matchState.dealerSeat).toBe(0)

    act(() => {
      result.current.startNextHand()
    })

    expect(result.current.matchState.matchHandNumber).toBe(2)
    expect(result.current.matchState.dealerSeat).toBe(1)
    expect(result.current.state.handNumber).toBe(2)
  })

  it('step mode: a bot\'s real decision does not auto-dispatch even after a long wait', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: true }))

    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })
    // It's now a bot's turn (draw auto-resolves regardless of step mode,
    // but the following discard/claim should NOT auto-dispatch).
    const stateAfterHumanDiscard = result.current.state

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    // A draw is not a real decision, so it may have auto-advanced past
    // 'awaitingDraw' — but the bot should now be stuck waiting on its own
    // genuine decision (discard/claim), never auto-resolving it.
    expect(result.current.hasPendingBotMove).toBe(true)
    expect(result.current.state).not.toBe(stateAfterHumanDiscard) // the draw did happen
  })

  it('step mode: advanceOneBotMove dispatches exactly one pending bot decision', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: true }))

    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })
    act(() => {
      vi.advanceTimersByTime(10_000) // let the bot's own draw resolve, if any
    })
    expect(result.current.hasPendingBotMove).toBe(true)
    const before = result.current.state

    act(() => {
      result.current.advanceOneBotMove()
    })

    expect(result.current.state).not.toBe(before)
    expect(result.current.state.actionLog.length).toBeGreaterThan(before.actionLog.length)
  })

  it('step mode still auto-resolves the human\'s own mandatory draw', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: true }))
    expect(result.current.isHumanTurn).toBe(true)

    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })
    // Drive the bots (one advanceOneBotMove call per pending decision) until
    // it's the human's turn again or the hand ends.
    for (let i = 0; i < 60 && result.current.state.phase !== 'handEnded' && !result.current.isHumanTurn; i++) {
      act(() => {
        vi.advanceTimersByTime(20) // draws still auto-resolve
      })
      if (result.current.hasPendingBotMove) {
        act(() => {
          result.current.advanceOneBotMove()
        })
      }
    }

    if (result.current.state.phase === 'handEnded') return
    expect(result.current.isHumanTurn).toBe(true)
    expect(result.current.state.phase).toBe('awaitingDiscard') // not stuck on 'awaitingDraw'
  })

  it('resetMatch abandons the in-progress match and deals a brand new hand 1, wiping matchScores and move logs', () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: false }))

    // Play into the match a bit and advance to hand 2, so there's real
    // progress (a non-empty move log, a non-hand-1 state, nonzero scores)
    // for resetMatch to actually discard.
    const [firstTile] = result.current.state.players[HUMAN_SEAT].hand.concealedTiles
    act(() => {
      result.current.submitHumanMove({ kind: 'discard', tile: firstTile! })
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.startNextHand()
    })
    expect(result.current.matchState.matchHandNumber).toBe(2)

    act(() => {
      result.current.resetMatch()
    })

    expect(result.current.matchState.matchHandNumber).toBe(1)
    expect(result.current.matchState.dealerSeat).toBe(0)
    expect(result.current.matchScores).toEqual(ZERO_SCORES)
    expect(result.current.matchMoveLogs).toHaveLength(1)
    expect(result.current.matchMoveLogs[0]!.moves).toEqual([])
    expect(result.current.state.phase).toBe('awaitingDiscard') // a fresh deal, not mid-hand
  })

  it("resetMatch picks a different seed each time, so it's a genuinely new match rather than a replay of the same one", () => {
    const { result } = renderHook(() => useGameLoop({ matchSeed: 42, botSpeedMs: 20, stepMode: false }))
    const seedBefore = result.current.state.seed

    act(() => {
      result.current.resetMatch()
    })

    // Astronomically unlikely to collide by chance (a uint32 seed space) —
    // a collision here would mean resetMatch stopped randomizing.
    expect(result.current.state.seed).not.toBe(seedBefore)
  })
})
