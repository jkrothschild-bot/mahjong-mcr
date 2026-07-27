import { describe, expect, it } from 'vitest'
import {
  buildWall,
  emptyHand,
  seatWindFor,
  TILE_TYPE_BY_ID,
  typeIdOfInstance,
  type GameState,
  type Hand,
  type PlayerState,
  type Seat,
  type TileInstanceId,
  type TileTypeId,
} from '@mahjong-mcr/engine'
import { gameReducer } from './gameReducer.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[]): Hand {
  return { ...emptyHand(), concealedTiles }
}

function freshState(): GameState {
  // Every seat holds an unrelated, mutually-unclaimable jumble, so a
  // discard never opens a claim window — keeps this test about the
  // reducer's plumbing, not claim resolution (already covered elsewhere).
  const hands: [Hand, Hand, Hand, Hand] = [
    handWith([...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C4', 1)]),
    handWith([...idsFor('B1', 1)]),
    handWith([...idsFor('B3', 1)]),
    handWith([...idsFor('B5', 1)]),
  ]
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: buildWall(1),
    players,
    currentSeat: 0,
    phase: 'awaitingDiscard',
    actionLog: [],
  }
}

describe('gameReducer', () => {
  it('applies a legal move and advances the phase', () => {
    const state = freshState()
    const [tile] = state.players[0].hand.concealedTiles
    const next = gameReducer(state, { type: 'apply', seat: 0, move: { kind: 'discard', tile: tile! } })
    expect(next.phase).toBe('awaitingDraw')
    expect(next.currentSeat).toBe(1)
  })

  it('drives a full draw -> discard -> draw sequence', () => {
    let state = freshState()
    const [tile] = state.players[0].hand.concealedTiles
    state = gameReducer(state, { type: 'apply', seat: 0, move: { kind: 'discard', tile: tile! } })
    expect(state.phase).toBe('awaitingDraw')

    state = gameReducer(state, { type: 'apply', seat: 1, move: { kind: 'draw' } })
    expect(state.phase).toBe('awaitingDiscard')
    expect(state.currentSeat).toBe(1)
  })

  it('is a no-op once the hand has ended, rather than throwing', () => {
    const state = freshState()
    const ended: GameState = { ...state, phase: 'handEnded', result: { outcome: 'exhaustiveDraw' } }
    const next = gameReducer(ended, { type: 'apply', seat: 0, move: { kind: 'draw' } })
    expect(next).toBe(ended)
  })
})
