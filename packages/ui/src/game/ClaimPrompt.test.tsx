import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    const { container } = render(
      <ClaimPrompt state={state} pendingClaim={undefined} claimTimerEnabled={false} claimTimerMs={8000} onDeclare={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a button for every legal option, including pass', () => {
    // Seat 0 holds 2 C5s — can pung (or win) the discarded 3rd.
    const hand = handWith([
      ...idsFor('C5', 2),
      ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('DW', 3), ...idsFor('C9', 2),
    ])
    const [c5ForDiscard] = idsFor('C5', 3).slice(2)
    const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} claimTimerEnabled={false} claimTimerMs={8000} onDeclare={() => {}} />)

    expect(screen.getByRole('button', { name: 'Win' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeInTheDocument()
  })

  it('calls onDeclare with the clicked move', () => {
    const hand = handWith([...idsFor('B1', 1)])
    const [c5ForDiscard] = idsFor('C5', 1)
    const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)
    const onDeclare = vi.fn()

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} claimTimerEnabled={false} claimTimerMs={8000} onDeclare={onDeclare} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))

    expect(onDeclare).toHaveBeenCalledWith({ kind: 'pass' })
  })

  describe('with the claim timer enabled', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('auto-declares pass once the timer expires', () => {
      const hand = handWith([...idsFor('B1', 1)])
      const [c5ForDiscard] = idsFor('C5', 1)
      const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
      const state = stateWithPendingClaim(hand, pendingClaim)
      const onDeclare = vi.fn()

      render(<ClaimPrompt state={state} pendingClaim={pendingClaim} claimTimerEnabled claimTimerMs={5000} onDeclare={onDeclare} />)
      vi.advanceTimersByTime(5000)

      expect(onDeclare).toHaveBeenCalledWith({ kind: 'pass' })
      expect(onDeclare).toHaveBeenCalledTimes(1)
    })

    it('does not auto-pass a second time after the human already declared', () => {
      const hand = handWith([...idsFor('B1', 1)])
      const [c5ForDiscard] = idsFor('C5', 1)
      const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
      const state = stateWithPendingClaim(hand, pendingClaim)
      const onDeclare = vi.fn()

      render(<ClaimPrompt state={state} pendingClaim={pendingClaim} claimTimerEnabled claimTimerMs={5000} onDeclare={onDeclare} />)
      fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
      vi.advanceTimersByTime(5000)

      expect(onDeclare).toHaveBeenCalledTimes(1)
    })
  })

  it('does not auto-pass when the timer is disabled', () => {
    vi.useFakeTimers()
    const hand = handWith([...idsFor('B1', 1)])
    const [c5ForDiscard] = idsFor('C5', 1)
    const pendingClaim: PendingClaim = { tile: c5ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)
    const onDeclare = vi.fn()

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} claimTimerEnabled={false} claimTimerMs={5000} onDeclare={onDeclare} />)
    vi.advanceTimersByTime(60_000)

    expect(onDeclare).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
