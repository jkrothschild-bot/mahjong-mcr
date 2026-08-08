import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useState } from 'react'
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
import { gameReducer } from './gameReducer.js'

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

    expect(screen.getByRole('dialog', { name: 'Claim this discard' })).toHaveClass('border-2', 'border-amber-300')
    const positioner = screen.getByRole('dialog', { name: 'Claim this discard' }).parentElement!
    expect(positioner.className).toContain('left-3')
    expect(positioner.className).not.toContain('inset-0')
    expect(positioner.className).toContain('bottom-[clamp(10rem,24vh,14rem)]')
    expect(screen.getByRole('heading', { name: 'Claim this discard?' })).toBeInTheDocument()
    expect(screen.getByText(/discarded/)).toHaveTextContent('North discarded 5 Characters')
    expect(screen.getByRole('button', { name: 'Win' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pass' })).toBeInTheDocument()
  })

  // docs/rules/decisions.md #19/#20: before the fix, isWinningHand returned
  // false for a completed Knitted Straight hand no matter how it was
  // reached, so a discard/rob-kong win off this exact shape was just as
  // unreachable as the self-drawn case (TurnActionPrompt.test.tsx).
  it('offers a win when a discard completes a Knitted Straight hand', () => {
    // 9 knitted tiles (1-4-7 Dots, 2-5-8 Characters, 3-6-9 Bamboo) + a pung
    // of East, waiting on the 2nd Characters-1 to complete the pair.
    const hand = handWith([
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('C1', 1),
    ])
    const [c1ForDiscard] = idsFor('C1', 2).slice(1)
    const pendingClaim: PendingClaim = { tile: c1ForDiscard!, fromSeat: 3, kind: 'discard', eligibleSeats: [0], declarations: {} }
    const state = stateWithPendingClaim(hand, pendingClaim)

    render(<ClaimPrompt state={state} pendingClaim={pendingClaim} onDeclare={() => {}} />)

    expect(screen.getByRole('button', { name: 'Win' })).toBeInTheDocument()
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

  it('accepts a touch-style Pung action through the real reducer and closes the prompt', () => {
    const [humanC5a, humanC5b, discardedC5] = idsFor('C5', 3)
    const pendingClaim: PendingClaim = {
      tile: discardedC5!,
      fromSeat: 3,
      kind: 'discard',
      eligibleSeats: [0],
      declarations: {},
    }
    const initial = stateWithPendingClaim(handWith([humanC5a!, humanC5b!]), pendingClaim)
    initial.players[3] = { ...initial.players[3], discards: [discardedC5!] }

    function Harness() {
      const [state, setState] = useState(initial)
      const pending = state.phase === 'awaitingClaims' ? state.pendingClaim : undefined
      return (
        <>
          <ClaimPrompt
            state={state}
            pendingClaim={pending}
            onDeclare={(move) => setState((current) => gameReducer(current, { type: 'apply', seat: 0, move }))}
          />
          <output data-testid="claim-result">{state.phase}:{state.players[0].hand.melds[0]?.kind ?? 'none'}</output>
        </>
      )
    }

    render(<Harness />)
    const pung = screen.getByRole('button', { name: 'Pung' })
    fireEvent.pointerDown(pung, { pointerType: 'touch' })
    fireEvent.click(pung)

    expect(screen.queryByRole('dialog', { name: 'Claim this discard' })).not.toBeInTheDocument()
    expect(screen.getByTestId('claim-result')).toHaveTextContent('awaitingDiscard:pung')
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
