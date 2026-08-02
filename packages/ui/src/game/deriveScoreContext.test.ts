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
  type Meld,
  type PlayerState,
  type Seat,
  type TileTypeId,
  type Wall,
} from '@mahjong-mcr/engine'
import { deriveHandOutcome, deriveScoreHandParams } from './deriveScoreContext.js'

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: number[], melds: Meld[] = [], flowers: number[] = []): Hand {
  return { ...emptyHand(), concealedTiles, melds, flowers }
}

// A 13-tile hand that completes into a standard win when C5 is appended:
// chow(C3,C4,+C5) + chow(B7,B8,B9) + pung(DW,DW,DW) + pung(DG,DG,DG) + pair(C9,C9).
// Mirrors moves.test.ts's identical fixture. Two dragon pungs (rather than
// one dragon pung + a plain chow) so this clears moves.ts's 8-point
// win-legality minimum on a discard/self-draw win.
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

// Puts `tiles` at the FRONT of the wall (the next ordinary-draw tiles, in
// order) — for a kong-replacement fixture, use wallWithNextFromBack instead,
// since replacements come from the back end (KICKOFF-phase8-addendum-
// decisions.md's Decision A).
function wallWithNext(tiles: number[]): Wall {
  return { tiles, frontIndex: 0, backIndex: tiles.length - 1 }
}

// Puts `tiles` at the BACK of the wall, in the order they'll be drawn as
// replacements (tiles[0] drawn first, tiles[1] second, ...) — i.e. the array
// itself is built in reverse so backIndex (starting at the end) reads them
// out in the given order.
function wallWithNextFromBack(tiles: number[]): Wall {
  const reversed = tiles.slice().reverse()
  return { tiles: reversed, frontIndex: 0, backIndex: reversed.length - 1 }
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

describe('deriveScoreHandParams', () => {
  it('returns null when the hand has not ended', () => {
    const state = baseState([handWith([]), handWith([]), handWith([]), handWith([])])
    expect(deriveScoreHandParams(state)).toBeNull()
  })

  it('returns null for an exhaustive draw', () => {
    const state = { ...baseState([handWith([]), handWith([]), handWith([]), handWith([])]), phase: 'handEnded' as const, result: { outcome: 'exhaustiveDraw' as const } }
    expect(deriveScoreHandParams(state)).toBeNull()
  })

  it('a normal self-draw win: winning tile already in concealedTiles, not last-tile-of-wall, not a kong replacement', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith(tenpaiWaitingOnC5()), handWith([]), handWith([]), handWith([])], {
      phase: 'awaitingDraw',
      wall: wallWithNext([c5!, ...idsFor('C6', 4)]), // plenty left after this draw
    })
    state = applyMove(state, 0, { kind: 'draw' })
    state = applyMove(state, 0, { kind: 'selfDrawWin' })

    const params = deriveScoreHandParams(state)!
    expect(params.winMethod).toBe('selfDraw')
    expect(params.winningTile).toBe(c5)
    expect(params.concealedTiles).toContain(c5)
    expect(params.isLastTileOfWall).toBe(false)
    expect(params.wonOnKongReplacement).toBe(false)
  })

  it('self-draw win on literally the wall\'s last drawable tile sets isLastTileOfWall', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith(tenpaiWaitingOnC5()), handWith([]), handWith([]), handWith([])], {
      phase: 'awaitingDraw',
      wall: wallWithNext([c5!]), // exactly one tile left
    })
    state = applyMove(state, 0, { kind: 'draw' })
    state = applyMove(state, 0, { kind: 'selfDrawWin' })

    expect(deriveScoreHandParams(state)!.isLastTileOfWall).toBe(true)
  })

  it('self-draw win on a concealed kong\'s replacement tile sets wonOnKongReplacement', () => {
    const c1 = idsFor('C1', 4)
    const c9 = idsFor('C9', 2)
    // Pre-kong 14-tile hand: 4xC1 (about to become a concealed kong) plus a
    // shape that's tenpai on pairing the lone C9 once the kong's
    // replacement draw comes in.
    const preKongHand = [...c1, ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1), ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1), ...idsFor('DW', 3), c9[0]!]
    let state = baseState([handWith(preKongHand), handWith([]), handWith([]), handWith([])], {
      phase: 'awaitingDiscard',
      // Kong replacements come from the BACK end — c9[1] must be the first
      // tile the back pointer reaches, not the front.
      wall: wallWithNextFromBack([c9[1]!, ...idsFor('C2', 4)]),
    })
    state = applyMove(state, 0, { kind: 'concealedKong', tileType: 'C1' })
    expect(state.phase).toBe('awaitingDiscard') // replacement drawn, back to discard
    state = applyMove(state, 0, { kind: 'selfDrawWin' })

    const params = deriveScoreHandParams(state)!
    expect(params.winningTile).toBe(c9[1])
    expect(params.wonOnKongReplacement).toBe(true)
  })

  it('a discard win appends the winning tile to concealedTiles (never added to the winner\'s hand by finalizeWin)', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith([c5!]), handWith([]), handWith([]), handWith(tenpaiWaitingOnC5())], { currentSeat: 0 })
    state = applyMove(state, 0, { kind: 'discard', tile: c5! })
    state = applyMove(state, 3, { kind: 'win' })

    const params = deriveScoreHandParams(state)!
    expect(params.winMethod).toBe('discard')
    expect(state.players[3].hand.concealedTiles).not.toContain(c5)
    expect(params.concealedTiles).toContain(c5)
  })

  it('isLastCopyOfItsKind: true when the other 3 copies of the winning tile are already visible via an exposed meld, excluding the winning tile itself from that count', () => {
    const c5 = idsFor('C5', 4)
    const exposedPung: Meld = { id: '1-0', kind: 'pung', exposure: 'exposed', tiles: [c5[0]!, c5[1]!, c5[2]!], ownerSeat: 1 }
    let state = baseState(
      [handWith([c5[3]!]), handWith([], [exposedPung]), handWith([]), handWith(tenpaiWaitingOnC5())],
      { currentSeat: 0 },
    )
    state = applyMove(state, 0, { kind: 'discard', tile: c5[3]! })
    state = applyMove(state, 3, { kind: 'win' })

    expect(deriveScoreHandParams(state)!.isLastCopyOfItsKind).toBe(true)
  })

  it('isLastCopyOfItsKind: false when fewer than 3 other copies are visible', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith([c5!]), handWith([]), handWith([]), handWith(tenpaiWaitingOnC5())], { currentSeat: 0 })
    state = applyMove(state, 0, { kind: 'discard', tile: c5! })
    state = applyMove(state, 3, { kind: 'win' })

    expect(deriveScoreHandParams(state)!.isLastCopyOfItsKind).toBe(false)
  })
})

describe('deriveHandOutcome', () => {
  it('returns null for an exhaustive draw', () => {
    const state = { ...baseState([handWith([]), handWith([]), handWith([]), handWith([])]), phase: 'handEnded' as const, result: { outcome: 'exhaustiveDraw' as const } }
    expect(deriveHandOutcome(state)).toBeNull()
  })

  it('a self-draw win: settlement payments sum to zero and the winner is credited', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith(tenpaiWaitingOnC5()), handWith([]), handWith([]), handWith([])], {
      phase: 'awaitingDraw',
      wall: wallWithNext([c5!, ...idsFor('C6', 4)]),
    })
    state = applyMove(state, 0, { kind: 'draw' })
    state = applyMove(state, 0, { kind: 'selfDrawWin' })

    const outcome = deriveHandOutcome(state)!
    expect(outcome.scoreResult.basicPoints).toBeGreaterThan(0)
    const total = Object.values(outcome.settlement.payments).reduce((sum, amount) => sum + amount, 0)
    expect(total).toBe(0)
    expect(outcome.settlement.payments[0]).toBeGreaterThan(0)
  })

  it('a discard win charges the discarder extra, matching computeSettlement\'s discard formula', () => {
    const [c5] = idsFor('C5', 1)
    let state = baseState([handWith([c5!]), handWith([]), handWith([]), handWith(tenpaiWaitingOnC5())], { currentSeat: 0 })
    state = applyMove(state, 0, { kind: 'discard', tile: c5! })
    state = applyMove(state, 3, { kind: 'win' })

    const outcome = deriveHandOutcome(state)!
    expect(outcome.settlement.payments[3]).toBeGreaterThan(0)
    expect(outcome.settlement.payments[0]).toBeLessThanOrEqual(outcome.settlement.payments[1])
  })

  it('includes flower points via FAN_REGISTRY, not a hardcoded constant', () => {
    const [c5] = idsFor('C5', 1)
    const [flower] = idsFor('F1', 1)
    let state = baseState([handWith(tenpaiWaitingOnC5(), [], [flower!]), handWith([]), handWith([]), handWith([])], {
      phase: 'awaitingDraw',
      wall: wallWithNext([c5!, ...idsFor('C6', 4)]),
    })
    state = applyMove(state, 0, { kind: 'draw' })
    state = applyMove(state, 0, { kind: 'selfDrawWin' })

    const withFlower = deriveHandOutcome(state)!
    const noFlowerState = { ...state, players: [{ ...state.players[0], hand: { ...state.players[0].hand, flowers: [] } }, state.players[1], state.players[2], state.players[3]] as GameState['players'] }
    const withoutFlower = deriveHandOutcome(noFlowerState)!
    expect(withFlower.settlement.payments[0]).toBeGreaterThan(withoutFlower.settlement.payments[0])
  })
})
