import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { buildWall, emptyHand, seatWindFor, type Action, type GameState, type Hand, type PlayerState, type Seat } from '@mahjong-mcr/engine'
import { CallOutToast } from './CallOutToast.js'

function stateWithLog(actionLog: Action[], dealerSeat: Seat = 0): GameState {
  const hands: [Hand, Hand, Hand, Hand] = [emptyHand(), emptyHand(), emptyHand(), emptyHand()]
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, dealerSeat), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat,
    wall: buildWall(1),
    players,
    currentSeat: 0,
    phase: 'awaitingDiscard',
    actionLog,
  }
}

describe('CallOutToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders nothing when the log has not grown', () => {
    const state = stateWithLog([{ seq: 0, seat: 0, type: 'discard', tile: 5 }])
    render(<CallOutToast state={state} />)
    expect(screen.queryByTestId('call-out-toast')).not.toBeInTheDocument()
  })

  it('shows a call-out for a new claim action, naming the claimant and discarder by wind', () => {
    // dealerSeat 0 -> seat1 is 'south', seat3 is 'north' (seatWindFor(seat,0)).
    const initial = stateWithLog([])
    const { rerender } = render(<CallOutToast state={initial} />)

    const claimed = stateWithLog([
      { seq: 0, seat: 1, type: 'claim', claimType: 'pung', claimedTile: 5, fromSeat: 3, usedConcealedTiles: [1, 2], meldId: '1-0' },
    ])
    rerender(<CallOutToast state={claimed} />)

    expect(screen.getByTestId('call-out-toast')).toHaveTextContent('South ponged')
    expect(screen.getByTestId('call-out-toast')).toHaveTextContent("North's")
  })

  it('says "your" when the human seat was the discarder', () => {
    const initial = stateWithLog([])
    const { rerender } = render(<CallOutToast state={initial} />)

    const claimed = stateWithLog([
      { seq: 0, seat: 2, type: 'claim', claimType: 'chow', claimedTile: 5, fromSeat: 0, usedConcealedTiles: [1, 2], meldId: '2-0' },
    ])
    rerender(<CallOutToast state={claimed} />)

    expect(screen.getByTestId('call-out-toast')).toHaveTextContent('your')
  })

  it('announces a win', () => {
    const initial = stateWithLog([])
    const { rerender } = render(<CallOutToast state={initial} />)

    const won = stateWithLog([{ seq: 0, seat: 1, type: 'win', winTile: 5, winMethod: 'discard', discardSeat: 0 }])
    rerender(<CallOutToast state={won} />)

    expect(screen.getByTestId('call-out-toast')).toHaveTextContent('won the hand')
  })

  it('auto-dismisses after the configured duration', () => {
    const initial = stateWithLog([])
    const { rerender } = render(<CallOutToast state={initial} dismissAfterMs={1000} />)

    const won = stateWithLog([{ seq: 0, seat: 1, type: 'win', winTile: 5, winMethod: 'discard', discardSeat: 0 }])
    rerender(<CallOutToast state={won} dismissAfterMs={1000} />)
    expect(screen.getByTestId('call-out-toast')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByTestId('call-out-toast')).not.toBeInTheDocument()
  })

  it('does not surface a toast for actions with no call-out (e.g. a plain discard)', () => {
    const initial = stateWithLog([])
    const { rerender } = render(<CallOutToast state={initial} />)

    const discarded = stateWithLog([{ seq: 0, seat: 0, type: 'discard', tile: 5 }])
    rerender(<CallOutToast state={discarded} />)

    expect(screen.queryByTestId('call-out-toast')).not.toBeInTheDocument()
  })
})
