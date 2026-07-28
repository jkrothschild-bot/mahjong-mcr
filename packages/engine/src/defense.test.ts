import { describe, expect, it } from 'vitest'
import { assessTileSafety } from './defense.js'
import { seatWindFor, type GameState, type PlayerState } from './game-state.js'
import { emptyHand, type Hand } from './hand.js'
import type { Meld, Seat } from './meld.js'
import { buildWall } from './wall.js'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileTypeId } from './tiles.js'

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: number[] = [], melds: Meld[] = []): Hand {
  return { ...emptyHand(), concealedTiles, melds }
}

function baseState(
  hands: [Hand, Hand, Hand, Hand],
  discards: [number[], number[], number[], number[]] = [[], [], [], []],
): GameState {
  const players = hands.map(
    (hand, seat): PlayerState => ({
      seat: seat as Seat,
      seatWind: seatWindFor(seat as Seat, 0),
      hand,
      discards: discards[seat]!,
      score: 0,
    }),
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

describe('assessTileSafety', () => {
  it('rates a tile low risk once every opponent has already discarded it', () => {
    const [c5] = idsFor('C5', 1)
    const state = baseState([handWith(), handWith(), handWith(), handWith()], [[], [c5!], [c5!], [c5!]])
    const safety = assessTileSafety(state, 0, 'C5')
    expect(safety.level).toBe('low')
    expect(safety.reasons[0]).toMatch(/already discarded/)
  })

  it('rates a tile high risk against a seat with 2+ same-suit exposed melds that hasn\'t discarded it', () => {
    const dotsPung: Meld = { id: '1-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('D2', 3), ownerSeat: 1 }
    const dotsChow: Meld = { id: '1-1', kind: 'chow', exposure: 'exposed', tiles: idsFor('D6', 1).concat(idsFor('D7', 1), idsFor('D8', 1)), ownerSeat: 1 }
    const state = baseState([handWith(), handWith([], [dotsPung, dotsChow]), handWith(), handWith()])
    const safety = assessTileSafety(state, 0, 'D5')
    expect(safety.level).toBe('high')
    expect(safety.reasons[0]).toMatch(/Seat 1/)
    expect(safety.reasons[0]).toMatch(/suit/)
  })

  it('does not flag suit-concentration danger for honor tiles (no suit to concentrate in)', () => {
    const windPung: Meld = { id: '1-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('WE', 3), ownerSeat: 1 }
    const dragonPung: Meld = { id: '1-1', kind: 'pung', exposure: 'exposed', tiles: idsFor('DW', 3), ownerSeat: 1 }
    const state = baseState([handWith(), handWith([], [windPung, dragonPung]), handWith(), handWith()])
    const safety = assessTileSafety(state, 0, 'DG')
    expect(safety.level).not.toBe('high')
  })

  it('flags a tile nobody has discarded, deep in the hand, as medium (untested) risk', () => {
    const filler = [...idsFor('B1', 1), ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('B4', 1), ...idsFor('B5', 1), ...idsFor('B6', 1)]
    const state = baseState([handWith(), handWith(), handWith(), handWith()], [[], filler, [], []])
    const safety = assessTileSafety(state, 0, 'C5')
    expect(safety.level).toBe('medium')
    expect(safety.reasons[0]).toMatch(/No one has discarded/)
  })

  it('defaults to medium for a neutral tile with no strong signal either way', () => {
    const safety = assessTileSafety(baseState([handWith(), handWith(), handWith(), handWith()]), 0, 'C5')
    expect(safety.level).toBe('medium')
  })
})
