import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  buildWall,
  emptyHand,
  seatWindFor,
  TILE_TYPE_BY_ID,
  typeIdOfInstance,
  type GameState,
  type Hand,
  type Meld,
  type PendingClaim,
  type PlayerState,
  type Seat,
  type TileInstanceId,
  type TileTypeId,
} from '@mahjong-mcr/engine'
import { ClaimPrompt } from './ClaimPrompt.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[], melds: Meld[] = []): Hand {
  return { ...emptyHand(), concealedTiles, melds }
}

function stateWithPendingClaim(humanHand: Hand, pendingClaim: PendingClaim): GameState {
  const hands: [Hand, Hand, Hand, Hand] = [humanHand, emptyHand(), emptyHand(), emptyHand()]
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
    currentSeat: 3,
    phase: 'awaitingClaims',
    pendingClaim,
    actionLog: [],
  }
}

describe('ClaimPrompt', () => {
  it('renders nothing when there is no pending claim', () => {
    const state = stateWithPendingClaim(emptyHand(), {
      tile: 0,
      fromSeat: 3,
      kind: 'discard',
      eligibleSeats: [],
      declarations: {},
    })
    const { container } = render(<ClaimPrompt state={state} pendingClaim={undefined} onDeclare={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a button for every legal option, including pass', () => {
    // Seat 0 holds 2 C5s — can pung (or win) the discarded 3rd. Two dragon
    // pungs (rather than one dragon pung + a plain chow) so this clears
    // moves.ts's 8-point win-legality minimum on a discard win.
    const hand = handWith([
      ...idsFor('C5', 2),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3), ...idsFor('DG', 3), ...idsFor('C9', 2),
    ])
    const [c5ForDiscard] = idsFor('C5', 3).slice(2)
    const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} onDeclare={() => {}} />)

    expect(screen.getByRole('button', { name: 'Win' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeInTheDocument()
  })

  it('calls onDeclare with the clicked move', () => {
    const hand = handWith([...idsFor('B1', 1)])
    const [c5ForDiscard] = idsFor('C5', 1)
    const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)
    const onDeclare = vi.fn()

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} onDeclare={onDeclare} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))

    expect(onDeclare).toHaveBeenCalledWith({ kind: 'pass' })
  })

  it('does not double-declare on a rapid double click', () => {
    const hand = handWith([...idsFor('B1', 1)])
    const [c5ForDiscard] = idsFor('C5', 1)
    const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)
    const onDeclare = vi.fn()

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} onDeclare={onDeclare} />)
    const passButton = screen.getByRole('button', { name: 'Pass' })
    fireEvent.click(passButton)
    fireEvent.click(passButton)

    expect(onDeclare).toHaveBeenCalledTimes(1)
  })

  it('never auto-declares — waits indefinitely for the human (no claim timer)', () => {
    vi.useFakeTimers()
    const hand = handWith([...idsFor('B1', 1)])
    const [c5ForDiscard] = idsFor('C5', 1)
    const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)
    const onDeclare = vi.fn()

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} onDeclare={onDeclare} />)
    vi.advanceTimersByTime(60_000)

    expect(onDeclare).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
