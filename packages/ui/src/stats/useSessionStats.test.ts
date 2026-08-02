import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyMove } from '@mahjong-mcr/engine'
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
  type Wall,
} from '@mahjong-mcr/engine'
import { EMPTY_STATS, SESSION_STATS_STORAGE_KEY } from './sessionStats.js'
import { useSessionStats } from './useSessionStats.js'

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

function wallWithNext(tiles: number[]): Wall {
  return { tiles, frontIndex: 0, backIndex: tiles.length - 1 }
}

function selfDrawWinState(): GameState {
  const [c5] = idsFor('C5', 1)
  const players = [handWith(tenpaiWaitingOnC5()), handWith([]), handWith([]), handWith([])].map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]
  let state: GameState = {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: wallWithNext([c5!, ...idsFor('C6', 4)]),
    players,
    currentSeat: 0,
    phase: 'awaitingDraw',
    actionLog: [],
  }
  state = applyMove(state, 0, { kind: 'draw' })
  state = applyMove(state, 0, { kind: 'selfDrawWin' })
  return state
}

describe('useSessionStats', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts from EMPTY_STATS when nothing is stored', () => {
    const { result } = renderHook(() => useSessionStats())
    expect(result.current.stats).toEqual(EMPTY_STATS)
  })

  it('recordHandResult folds a finished hand in and persists it to localStorage', () => {
    const { result } = renderHook(() => useSessionStats())

    act(() => {
      result.current.recordHandResult(selfDrawWinState(), 0)
    })

    expect(result.current.stats.handsPlayed).toBe(1)
    expect(result.current.stats.wins).toBe(1)

    const stored = JSON.parse(window.localStorage.getItem(SESSION_STATS_STORAGE_KEY)!)
    expect(stored.handsPlayed).toBe(1)
    expect(stored.wins).toBe(1)
  })

  it('a fresh hook picks up stats persisted by an earlier one', () => {
    const first = renderHook(() => useSessionStats())
    act(() => {
      first.result.current.recordHandResult(selfDrawWinState(), 0)
    })

    const second = renderHook(() => useSessionStats())
    expect(second.result.current.stats.handsPlayed).toBe(1)
    expect(second.result.current.stats.wins).toBe(1)
  })
})
