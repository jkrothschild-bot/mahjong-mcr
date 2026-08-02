import { describe, expect, it } from 'vitest'
import { applyMove } from '@mahjong-mcr/engine'
import {
  TILE_TYPE_BY_ID,
  emptyHand,
  seatWindFor,
  typeIdOfInstance,
  type GamePhase,
  type GameState,
  type Hand,
  type PlayerState,
  type Seat,
  type TileTypeId,
  type Wall,
} from '@mahjong-mcr/engine'
import { EMPTY_STATS, applyHandResult, loadStats, serializeStats } from './sessionStats.js'

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

// Same fixture as deriveScoreContext.test.ts / useGameLoop.test.ts: two
// dragon pungs (not one dragon pung + a plain chow) clears moves.ts's
// 8-point win-legality minimum.
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

function baseState(hands: [Hand, Hand, Hand, Hand], opts: { currentSeat?: Seat; phase?: GamePhase; wall?: Wall } = {}): GameState {
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: opts.wall ?? wallWithNext(idsFor('C1', 1)),
    players,
    currentSeat: opts.currentSeat ?? 0,
    phase: opts.phase ?? 'awaitingDiscard',
    actionLog: [],
  }
}

function selfDrawWinState(humanSeat: Seat): GameState {
  const [c5] = idsFor('C5', 1)
  const hands: [Hand, Hand, Hand, Hand] = [handWith([]), handWith([]), handWith([]), handWith([])]
  hands[humanSeat] = handWith(tenpaiWaitingOnC5())
  let state = baseState(hands, { phase: 'awaitingDraw', wall: wallWithNext([c5!, ...idsFor('C6', 4)]), currentSeat: humanSeat })
  state = applyMove(state, humanSeat, { kind: 'draw' })
  state = applyMove(state, humanSeat, { kind: 'selfDrawWin' })
  return state
}

function exhaustiveDrawState(): GameState {
  return { ...baseState([handWith([]), handWith([]), handWith([]), handWith([])]), phase: 'handEnded', result: { outcome: 'exhaustiveDraw' } }
}

describe('applyHandResult', () => {
  it('a hand that has not ended leaves stats unchanged', () => {
    const state = baseState([handWith([]), handWith([]), handWith([]), handWith([])])
    expect(applyHandResult(EMPTY_STATS, state, 0)).toEqual(EMPTY_STATS)
  })

  it('an exhaustive draw only bumps handsPlayed', () => {
    const next = applyHandResult(EMPTY_STATS, exhaustiveDrawState(), 0)
    expect(next).toEqual({ ...EMPTY_STATS, handsPlayed: 1 })
  })

  it('a self-draw win by the human increments wins, points, and winsByFan', () => {
    const state = selfDrawWinState(0)
    const next = applyHandResult(EMPTY_STATS, state, 0)
    expect(next.handsPlayed).toBe(1)
    expect(next.wins).toBe(1)
    expect(next.totalPointsWon).toBeGreaterThan(0)
    expect(Object.values(next.winsByFan).reduce((sum, n) => sum + n, 0)).toBeGreaterThan(0)
    expect(next.dealIns).toBe(0)
  })

  it('a bot winning (not the human) only bumps handsPlayed, not wins', () => {
    const state = selfDrawWinState(1) // seat 1 wins, humanSeat is 0
    const next = applyHandResult(EMPTY_STATS, state, 0)
    expect(next.handsPlayed).toBe(1)
    expect(next.wins).toBe(0)
    expect(next.totalPointsWon).toBe(0)
    expect(next.dealIns).toBe(0)
  })

  it('the human discarding the winning tile for someone else counts as a deal-in', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith([c5!]), handWith([]), handWith([]), handWith(tenpaiWaitingOnC5())], { currentSeat: 0 })
    state = applyMove(state, 0, { kind: 'discard', tile: c5! })
    state = applyMove(state, 3, { kind: 'win' })

    const next = applyHandResult(EMPTY_STATS, state, 0)
    expect(next.handsPlayed).toBe(1)
    expect(next.wins).toBe(0)
    expect(next.dealIns).toBe(1)
  })

  it('accumulates across multiple hands rather than replacing', () => {
    const afterOne = applyHandResult(EMPTY_STATS, selfDrawWinState(0), 0)
    const afterTwo = applyHandResult(afterOne, selfDrawWinState(0), 0)
    expect(afterTwo.handsPlayed).toBe(2)
    expect(afterTwo.wins).toBe(2)
    expect(afterTwo.totalPointsWon).toBe(afterOne.totalPointsWon * 2)
  })
})

describe('loadStats/serializeStats', () => {
  it('returns EMPTY_STATS for null (nothing stored yet)', () => {
    expect(loadStats(null)).toEqual(EMPTY_STATS)
  })

  it('returns EMPTY_STATS for corrupt JSON', () => {
    expect(loadStats('{not json')).toEqual(EMPTY_STATS)
  })

  it('falls back per-field for a partial/malformed object, not the whole thing', () => {
    const loaded = loadStats(JSON.stringify({ handsPlayed: 5, wins: 'not a number', winsByFan: { 12: 2 } }))
    expect(loaded).toEqual({ ...EMPTY_STATS, handsPlayed: 5, winsByFan: { 12: 2 } })
  })

  it('round-trips through serializeStats/loadStats', () => {
    const stats = { handsPlayed: 3, wins: 1, totalPointsWon: 24, dealIns: 1, winsByFan: { 6: 1 } }
    expect(loadStats(serializeStats(stats))).toEqual(stats)
  })
})
