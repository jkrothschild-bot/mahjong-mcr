import { describe, expect, it } from 'vitest'
import { applyMove, legalMoves } from './moves.js'
import { seatWindFor, type GamePhase, type GameState, type PlayerState } from './game-state.js'
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

function handWith(concealedTiles: number[], melds: Meld[] = []): Hand {
  return { ...emptyHand(), concealedTiles, melds }
}

function baseState(hands: [Hand, Hand, Hand, Hand], opts: { currentSeat?: Seat; phase?: GamePhase } = {}): GameState {
  const players = hands.map(
    (hand, seat): PlayerState => ({
      seat: seat as Seat,
      seatWind: seatWindFor(seat as Seat, 0),
      hand,
      discards: [],
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
    currentSeat: opts.currentSeat ?? 0,
    phase: opts.phase ?? 'awaitingDiscard',
    actionLog: [],
  }
}

// A 13-tile hand that completes into a standard win when C5 is appended:
// chow(C3,C4,+C5) + chow(D4,D5,D6) + chow(B7,B8,B9) + pung(DW,DW,DW) + pair(C9,C9).
function tenpaiWaitingOnC5(): number[] {
  return [
    ...idsFor('C3', 1),
    ...idsFor('C4', 1),
    ...idsFor('D4', 1),
    ...idsFor('D5', 1),
    ...idsFor('D6', 1),
    ...idsFor('B7', 1),
    ...idsFor('B8', 1),
    ...idsFor('B9', 1),
    ...idsFor('DW', 3),
    ...idsFor('C9', 2),
  ]
}

describe('claim priority: win beats pung beats chow', () => {
  it('resolves to the win declaration even when pung and chow are also declared', () => {
    const c5 = idsFor('C5', 4)
    const hands: [Hand, Hand, Hand, Hand] = [
      handWith([c5[0]!]), // seat 0: discarder — holds the tile it's about to discard
      handWith([...idsFor('C6', 1), ...idsFor('C7', 1)]), // seat 1 (next): chow-eligible
      handWith([c5[1]!, c5[2]!]), // seat 2: pung-eligible (2 concealed C5)
      handWith(tenpaiWaitingOnC5()), // seat 3: win-eligible
    ]
    let state = baseState(hands, { currentSeat: 0 })

    state = applyMove(state, 0, { kind: 'discard', tile: c5[0]! })
    expect(state.phase).toBe('awaitingClaims')
    expect(state.pendingClaim?.eligibleSeats.sort()).toEqual([1, 2, 3])

    // seat 1 could chow, but declares pass; order of declaration shouldn't matter.
    state = applyMove(state, 1, { kind: 'pass' })
    expect(state.phase).toBe('awaitingClaims') // still waiting on 2 and 3

    state = applyMove(state, 2, { kind: 'pung' })
    expect(state.phase).toBe('awaitingClaims') // still waiting on 3

    state = applyMove(state, 3, { kind: 'win' })
    expect(state.phase).toBe('handEnded')
    expect(state.result).toEqual({
      outcome: 'win',
      winnerSeats: [3],
      winMethod: 'discard',
      winningTile: c5[0],
      loserSeat: 0,
    })
  })
})

describe('chow is restricted to the discarder\'s immediate next seat', () => {
  it('does not offer chow to a non-adjacent seat holding the right tiles', () => {
    const c5 = idsFor('C5', 1)
    const c6c7 = [...idsFor('C6', 1), ...idsFor('C7', 1)]
    const hands: [Hand, Hand, Hand, Hand] = [
      handWith([c5[0]!]), // seat 0: discarder — holds the tile it's about to discard
      handWith([]), // seat 1 (next seat): nothing
      handWith(c6c7), // seat 2 (NOT next): holds C6,C7 but shouldn't be offered chow
      handWith([]),
    ]
    let state = baseState(hands, { currentSeat: 0 })
    state = applyMove(state, 0, { kind: 'discard', tile: c5[0]! })

    // Nobody has any legal claim (seat 2's chow-shaped tiles don't count since it's not the next seat).
    expect(state.pendingClaim).toBeUndefined()
    expect(state.phase).toBe('awaitingDraw')
    expect(state.currentSeat).toBe(1)
    expect(legalMoves(state, 2)).toEqual([])
  })
})

describe('robbing the kong', () => {
  it('lets another seat win off a promoted (added) kong, and blocks the kong from finalizing', () => {
    // All 4 physical B2 tiles belong to seat 0 (3 in the existing pung, 1
    // held concealed to promote it) — so seat 1 can't be waiting on a B2
    // *pair*, but it can be waiting on a B2 *chow* (using its own B1 + B3),
    // which only needs the single hypothetical added tile, not a physical
    // B2 of its own.
    const b2 = idsFor('B2', 4)
    const existingPung: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: [b2[0]!, b2[1]!, b2[2]!], ownerSeat: 0 }
    const winningOnB2 = [
      ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
      ...idsFor('B1', 1), ...idsFor('B3', 1),
    ]

    const hands: [Hand, Hand, Hand, Hand] = [
      handWith([b2[3]!], [existingPung]), // seat 0: promoter, holds the 4th B2 concealed
      handWith(winningOnB2),
      handWith([]),
      handWith([]),
    ]
    let state = baseState(hands, { currentSeat: 0 })
    state = applyMove(state, 0, { kind: 'addedKong', meldId: '0-0', tile: b2[3]! })

    expect(state.phase).toBe('awaitingRobKongClaims')
    expect(state.pendingClaim?.eligibleSeats).toEqual([1])
    expect(legalMoves(state, 1).map((m) => m.kind).sort()).toEqual(['pass', 'win'])

    state = applyMove(state, 1, { kind: 'win' })
    expect(state.phase).toBe('handEnded')
    expect(state.result?.outcome).toBe('win')
    expect(state.result?.winnerSeats).toEqual([1])
    expect(state.result?.winMethod).toBe('robKong')
    expect(state.result?.loserSeat).toBe(0)
    expect(state.actionLog.some((a) => a.type === 'robKongWin')).toBe(true)
    // The kong never finalizes into a replacement draw for seat 0.
    expect(state.actionLog.some((a) => a.type === 'draw' && a.seat === 0)).toBe(false)
  })

  it('concealed kong never opens a rob window, even if another seat could hypothetically use the tile', () => {
    const d3 = idsFor('D3', 4)
    const hands: [Hand, Hand, Hand, Hand] = [
      handWith(d3), // seat 0: 4 concealed D3 -> concealedKong available
      handWith([]),
      handWith([]),
      handWith([]),
    ]
    let state = baseState(hands, { currentSeat: 0 })
    state = applyMove(state, 0, { kind: 'concealedKong', tileType: 'D3' })

    // Straight to a replacement draw (or exhaustiveDraw) — never a claims window.
    expect(state.phase === 'awaitingDiscard' || state.phase === 'handEnded').toBe(true)
    expect(state.pendingClaim).toBeUndefined()
    expect(state.players[0]!.hand.melds[0]!.kind).toBe('kong')
    expect(state.players[0]!.hand.melds[0]!.kongSource).toBe('concealed')
  })
})
