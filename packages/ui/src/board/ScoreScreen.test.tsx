import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
import { ScoreScreen } from './ScoreScreen.js'

const ZERO_SCORES: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

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

// Same tenpai fixture as deriveScoreContext.test.ts and moves.test.ts:
// chow(C3,C4,+C5) + chow(B7,B8,B9) + pung(DW,DW,DW) + pung(DG,DG,DG) + pair(C9,C9).
// Two dragon pungs (rather than one dragon pung + a plain chow) so this
// clears moves.ts's 8-point win-legality minimum on a self-draw win.
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

function baseState(hands: [Hand, Hand, Hand, Hand], opts: { currentSeat?: Seat; phase?: GamePhase; wall?: Wall } = {}): GameState {
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: opts.wall ?? { tiles: idsFor('C1', 1), drawIndex: 0 },
    players,
    currentSeat: opts.currentSeat ?? 0,
    phase: opts.phase ?? 'awaitingDiscard',
    actionLog: [],
  }
}

function selfDrawWinState(): GameState {
  const [c5] = idsFor('C5', 1)
  let state = baseState([handWith(tenpaiWaitingOnC5()), handWith([]), handWith([]), handWith([])], {
    phase: 'awaitingDraw',
    wall: { tiles: [c5!, ...idsFor('C6', 4)], drawIndex: 0 },
  })
  state = applyMove(state, 0, { kind: 'draw' })
  state = applyMove(state, 0, { kind: 'selfDrawWin' })
  return state
}

describe('ScoreScreen', () => {
  it('renders nothing while the hand is still in progress', () => {
    const state = baseState([handWith([]), handWith([]), handWith([]), handWith([])])
    const { container } = render(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a no-winner panel for an exhaustive draw', () => {
    const state: GameState = {
      ...baseState([handWith([]), handWith([]), handWith([]), handWith([])]),
      phase: 'handEnded',
      result: { outcome: 'exhaustiveDraw' },
    }
    render(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={() => {}} />)
    expect(screen.getByTestId('score-screen-draw')).toBeInTheDocument()
    expect(screen.queryByTestId('score-screen-win')).not.toBeInTheDocument()
  })

  it('shows the winner, a non-empty fan breakdown, and a balanced settlement for a self-draw win', () => {
    const state = selfDrawWinState()
    render(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={() => {}} />)

    expect(screen.getByTestId('score-screen-win')).toHaveTextContent('You won')
    const fanItems = screen.getByRole('list', { name: 'Fan breakdown' }).querySelectorAll('[role="listitem"]')
    expect(fanItems.length).toBeGreaterThan(0)

    const total = ([0, 1, 2, 3] as const)
      .map((seat) => {
        const el = screen.getByTestId(`score-screen-settlement-${seat}`)
        const amountText = el.querySelector('span:last-child')!.textContent!
        return Number(amountText)
      })
      .reduce((sum, amount) => sum + amount, 0)
    expect(total).toBe(0)
  })

  it('renders per-seat match scores', () => {
    const state = selfDrawWinState()
    render(<ScoreScreen state={state} matchScores={{ 0: 16, 1: -8, 2: -4, 3: -4 }} onNextHand={() => {}} />)
    expect(screen.getByTestId('score-screen-match-score-0')).toHaveTextContent('+16')
    expect(screen.getByTestId('score-screen-match-score-1')).toHaveTextContent('-8')
  })

  it('calls onFanClick with the fan id when a fan name is clicked (only when the prop is provided)', () => {
    const state = selfDrawWinState()
    const { rerender } = render(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={() => {}} />)
    // Without onFanClick, fan names render as plain text, not buttons.
    expect(screen.getByRole('list', { name: 'Fan breakdown' }).querySelector('button')).not.toBeInTheDocument()

    const onFanClick = vi.fn()
    rerender(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={() => {}} onFanClick={onFanClick} />)
    const firstFanButton = screen.getByRole('list', { name: 'Fan breakdown' }).querySelector('button')!
    fireEvent.click(firstFanButton)
    expect(onFanClick).toHaveBeenCalledWith(expect.any(Number))
  })

  it('only shows "Review this hand" when onReviewHand is provided, and calls it when clicked', () => {
    const state = selfDrawWinState()
    const { rerender } = render(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Review this hand' })).not.toBeInTheDocument()

    const onReviewHand = vi.fn()
    rerender(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={() => {}} onReviewHand={onReviewHand} />)
    fireEvent.click(screen.getByRole('button', { name: 'Review this hand' }))
    expect(onReviewHand).toHaveBeenCalledTimes(1)
  })

  it('calls onNextHand when the button is clicked', () => {
    const onNextHand = vi.fn()
    const state = selfDrawWinState()
    render(<ScoreScreen state={state} matchScores={ZERO_SCORES} onNextHand={onNextHand} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next hand' }))
    expect(onNextHand).toHaveBeenCalledTimes(1)
  })
})
