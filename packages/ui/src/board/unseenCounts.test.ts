import { describe, expect, it } from 'vitest'
import {
  buildWall,
  emptyHand,
  seatWindFor,
  TILE_TYPE_BY_ID,
  typeIdOfInstance,
  type GameState,
  type Meld,
  type PlayerState,
  type Seat,
  type TileInstanceId,
  type TileTypeId,
} from '@mahjong-mcr/engine'
import { computeUnseenCounts } from './unseenCounts.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function stateWith(players: Partial<Record<Seat, { concealed?: TileInstanceId[]; discards?: TileInstanceId[]; melds?: Meld[] }>>): GameState {
  const seats: Seat[] = [0, 1, 2, 3]
  const playerStates = seats.map((seat): PlayerState => {
    const p = players[seat] ?? {}
    return {
      seat,
      seatWind: seatWindFor(seat, 0),
      hand: { ...emptyHand(), concealedTiles: p.concealed ?? [], melds: p.melds ?? [] },
      discards: p.discards ?? [],
      score: 0,
    }
  }) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: buildWall(1),
    players: playerStates,
    currentSeat: 0,
    phase: 'awaitingDiscard',
    actionLog: [],
  }
}

describe('computeUnseenCounts', () => {
  it('defaults every type to 4 unseen when nothing is visible', () => {
    const state = stateWith({})
    const counts = computeUnseenCounts(state, 0)
    expect(counts['C1']).toBe(4)
    expect(counts['WE']).toBe(4)
    expect(Object.keys(counts)).toHaveLength(34)
  })

  it('counts the human\'s own concealed tiles', () => {
    const state = stateWith({ 0: { concealed: idsFor('C1', 2) } })
    expect(computeUnseenCounts(state, 0)['C1']).toBe(2)
  })

  it('never counts a bot\'s hidden concealed tiles', () => {
    const state = stateWith({ 1: { concealed: idsFor('C1', 3) } })
    expect(computeUnseenCounts(state, 0)['C1']).toBe(4)
  })

  it('counts every seat\'s discards', () => {
    const state = stateWith({ 2: { discards: idsFor('D5', 1) }, 3: { discards: idsFor('D5', 1) } })
    expect(computeUnseenCounts(state, 0)['D5']).toBe(2)
  })

  it('counts every seat\'s exposed meld tiles', () => {
    const meld: Meld = { id: '1-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('B7', 3), ownerSeat: 1 }
    const state = stateWith({ 1: { melds: [meld] } })
    expect(computeUnseenCounts(state, 0)['B7']).toBe(1)
  })

  it('combines all visible sources and floors at 0', () => {
    const meld: Meld = { id: '1-0', kind: 'kong', exposure: 'exposed', tiles: idsFor('WE', 4), ownerSeat: 1 }
    const state = stateWith({ 1: { melds: [meld] } })
    expect(computeUnseenCounts(state, 0)['WE']).toBe(0)
  })
})
