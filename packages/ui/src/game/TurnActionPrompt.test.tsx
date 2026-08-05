import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  TILE_TYPE_BY_ID,
  emptyHand,
  seatWindFor,
  typeIdOfInstance,
  type GameState,
  type Hand,
  type PlayerState,
  type Seat,
  type TileTypeId,
} from '@mahjong-mcr/engine'
import { TurnActionPrompt } from './TurnActionPrompt.js'

function idsFor(typeId: TileTypeId, count: number): number[] {
  const ids: number[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function stateWith(humanHand: Hand, lastDrawnTile: number | undefined): GameState {
  const hands: Hand[] = [humanHand, emptyHand(), emptyHand(), emptyHand()]
  const players = hands.map(
    (hand, seat): PlayerState => ({ seat: seat as Seat, seatWind: seatWindFor(seat as Seat, 0), hand, discards: [], score: 0 }),
  ) as [PlayerState, PlayerState, PlayerState, PlayerState]

  return {
    seed: 1,
    handNumber: 1,
    prevailingWind: 'east',
    dealerSeat: 0,
    wall: { tiles: idsFor('C1', 1), frontIndex: 0, backIndex: 0 },
    players,
    currentSeat: 0,
    phase: 'awaitingDiscard',
    actionLog: [],
    lastDrawnTile,
  }
}

// The live hand this component exists for: 2C/8B/5B/9C pungs plus a White
// Dragon pair, fourteen tiles, entirely concealed — Four Concealed Pungs, 64
// points. The engine computed { kind: 'selfDrawWin' } as legal; the UI had no
// control that could submit it, so the player simply couldn't win.
function fourConcealedPungsHand(): Hand {
  return {
    ...emptyHand(),
    concealedTiles: [...idsFor('C2', 3), ...idsFor('B8', 3), ...idsFor('B5', 3), ...idsFor('C9', 3), ...idsFor('DW', 2)],
  }
}

// Knitted Straight (fan 35, 12 pts, App.1 p.34-35): 9 knitted tiles (1-4-7
// Dots, 2-5-8 Characters, 3-6-9 Bamboo) + a pung of East + a pair of
// Characters-1. Before docs/rules/decisions.md #20's fix, isWinningHand
// returned false for this exact shape — the player could never even declare
// it, the same class of bug fourConcealedPungsHand's own comment describes
// (a legal win the UI simply had no way to reach), except this one was in
// the engine's own win-detection, not the UI layer.
function knittedStraightHand(): Hand {
  return {
    ...emptyHand(),
    concealedTiles: [
      ...idsFor('D1', 1), ...idsFor('D4', 1), ...idsFor('D7', 1),
      ...idsFor('C2', 1), ...idsFor('C5', 1), ...idsFor('C8', 1),
      ...idsFor('B3', 1), ...idsFor('B6', 1), ...idsFor('B9', 1),
      ...idsFor('WE', 3),
      ...idsFor('C1', 2),
    ],
  }
}

describe('TurnActionPrompt', () => {
  it('offers a self-drawn win on a complete, legal hand', () => {
    const hand = fourConcealedPungsHand()
    const state = stateWith(hand, hand.concealedTiles[hand.concealedTiles.length - 1]!)

    render(<TurnActionPrompt state={state} isHumanTurn onDeclare={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Declare win' })).toBeInTheDocument()
  })

  it('submits selfDrawWin when the win button is pressed', () => {
    const hand = fourConcealedPungsHand()
    const state = stateWith(hand, hand.concealedTiles[hand.concealedTiles.length - 1]!)
    const onDeclare = vi.fn()

    render(<TurnActionPrompt state={state} isHumanTurn onDeclare={onDeclare} />)
    fireEvent.click(screen.getByRole('button', { name: 'Declare win' }))

    expect(onDeclare).toHaveBeenCalledWith({ kind: 'selfDrawWin' })
  })

  // Not auto-declared: MCR's 8-point minimum makes "can I win?" and "should
  // I win?" different questions, and declining to declare is a real choice.
  it('never declares on its own — it only offers', () => {
    const hand = fourConcealedPungsHand()
    const state = stateWith(hand, hand.concealedTiles[hand.concealedTiles.length - 1]!)
    const onDeclare = vi.fn()

    render(<TurnActionPrompt state={state} isHumanTurn onDeclare={onDeclare} />)

    expect(onDeclare).not.toHaveBeenCalled()
    expect(screen.getByText(/discard as usual to keep playing/i)).toBeInTheDocument()
  })

  // docs/rules/decisions.md #19/#20: decomposeHand had no notion of a
  // "knitted" set, so this hand was unwinnable in the live game (not just
  // unscoreable) — legalDiscardPhaseMoves never offered selfDrawWin because
  // isWinningHand itself returned false. This proves the fix reaches the
  // player, not just scoreHand.
  it('offers a self-drawn win on a Knitted Straight hand', () => {
    const hand = knittedStraightHand()
    const state = stateWith(hand, hand.concealedTiles[hand.concealedTiles.length - 1]!)

    render(<TurnActionPrompt state={state} isHumanTurn onDeclare={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Declare win' })).toBeInTheDocument()
  })

  it('offers a concealed kong when four of a type are held', () => {
    const hand = { ...emptyHand(), concealedTiles: [...idsFor('C2', 4), ...idsFor('B5', 3)] }
    const state = stateWith(hand, idsFor('C2', 4)[3]!)
    const onDeclare = vi.fn()

    render(<TurnActionPrompt state={state} isHumanTurn onDeclare={onDeclare} />)
    fireEvent.click(screen.getByRole('button', { name: /Concealed kong/ }))

    expect(onDeclare).toHaveBeenCalledWith({ kind: 'concealedKong', tileType: 'C2' })
  })

  it('renders nothing when it is not the human\'s turn, even with a winning hand', () => {
    const hand = fourConcealedPungsHand()
    const state = stateWith(hand, hand.concealedTiles[hand.concealedTiles.length - 1]!)
    const { container } = render(<TurnActionPrompt state={state} isHumanTurn={false} onDeclare={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing on an ordinary hand with no declaration available', () => {
    const hand = { ...emptyHand(), concealedTiles: [...idsFor('C1', 1), ...idsFor('D5', 1), ...idsFor('B9', 1)] }
    const { container } = render(
      <TurnActionPrompt state={stateWith(hand, idsFor('C1', 1)[0]!)} isHumanTurn onDeclare={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  // A complete hand that scores under 8 points can't legally declare Hu
  // (moves.ts's win-legality gate). The prompt must not offer a win the
  // engine would reject — that would be worse than the bug it fixes.
  it('does not offer a win the 8-point minimum would reject', () => {
    // All Chows, no honors, mixed suits — a structurally complete hand that
    // falls short of the minimum.
    const hand = {
      ...emptyHand(),
      concealedTiles: [
        ...idsFor('C1', 1), ...idsFor('C2', 1), ...idsFor('C3', 1),
        ...idsFor('D4', 1), ...idsFor('D5', 1), ...idsFor('D6', 1),
        ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('B4', 1),
        ...idsFor('B6', 1), ...idsFor('B7', 1), ...idsFor('B8', 1),
        ...idsFor('D8', 2),
      ],
    }
    const state = stateWith(hand, idsFor('D8', 2)[1]!)
    render(<TurnActionPrompt state={state} isHumanTurn onDeclare={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Declare win' })).not.toBeInTheDocument()
  })
})
