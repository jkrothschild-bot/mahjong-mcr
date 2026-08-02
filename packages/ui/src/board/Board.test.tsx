import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startHand, startMatch, typeIdOfInstance, type GameState } from '@mahjong-mcr/engine'
import { sortByMode } from '../hand/handOrder.js'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { Board } from './Board.js'

const ZERO_SCORES = { 0: 0, 1: 0, 2: 0, 3: 0 } as const

function stateWithLastDrawnTile(): { state: GameState; drawnTile: number } {
  const state = startHand({ seed: 42, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
  const [drawnTile] = state.players[HUMAN_SEAT].hand.concealedTiles
  return { state: { ...state, lastDrawnTile: drawnTile }, drawnTile: drawnTile! }
}

describe('Board', () => {
  it("marks GameState.lastDrawnTile in the human's hand while it is their discard turn", () => {
    const { state, drawnTile } = stateWithLastDrawnTile()

    render(
      <Board
        state={state}
        matchState={startMatch(1)}
        matchScores={ZERO_SCORES}
        isHumanTurn={true}
        selectedTileId={null}
        onTileClick={() => {}}
        selectedTypeId={null}
        onInspectTile={() => {}}
      />,
    )

    expect(screen.getByTestId(`hand-tile-${drawnTile}`).className).toContain('ring-sky-400')
  })

  it("does not mark any tile as just-drawn when it isn't the human's turn to discard", () => {
    const { state, drawnTile } = stateWithLastDrawnTile()

    render(
      <Board
        state={state}
        matchState={startMatch(1)}
        matchScores={ZERO_SCORES}
        isHumanTurn={false}
        selectedTileId={null}
        onTileClick={() => {}}
        selectedTypeId={null}
        onInspectTile={() => {}}
      />,
    )

    expect(screen.getByTestId(`hand-tile-${drawnTile}`).className).not.toContain('ring-sky-400')
  })

  it("reveals every bot seat's concealed tiles once the hand has ended, instead of leaving them as backs", () => {
    const state = startHand({ seed: 42, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    const endedState: GameState = { ...state, phase: 'handEnded' }

    render(
      <Board
        state={endedState}
        matchState={startMatch(1)}
        matchScores={ZERO_SCORES}
        isHumanTurn={false}
        selectedTileId={null}
        onTileClick={() => {}}
        selectedTypeId={null}
        onInspectTile={() => {}}
      />,
    )

    for (const seat of [1, 2, 3] as const) {
      expect(screen.queryAllByTestId(new RegExp(`^seat-${seat}-back-`))).toHaveLength(0)
      const revealed = screen.getAllByTestId(new RegExp(`^seat-${seat}-revealed-`))
      expect(revealed.length).toBe(endedState.players[seat]!.hand.concealedTiles.length)
    }
  })

  it("defaults the human hand back to suit-sorted after a Restart lands on hand 1 again, not a reconcile against the abandoned match's hand 1", () => {
    // Both hands are GameState.handNumber 1 — matching a real Restart, which
    // always begins a new match back at hand 1 (see useHandOrder's own
    // comment on why it must key off GameState.seed, not handNumber, to
    // tell these apart). Different seeds give genuinely unrelated deals.
    const stateA = startHand({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    const stateB = startHand({ seed: 2, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })

    const props = {
      matchState: startMatch(1),
      matchScores: ZERO_SCORES,
      isHumanTurn: false,
      selectedTileId: null,
      onTileClick: () => {},
      selectedTypeId: null,
      onInspectTile: () => {},
    } as const

    const { rerender } = render(<Board state={stateA} {...props} />)
    rerender(<Board state={stateB} {...props} />)

    const renderedOrder = screen.getAllByTestId(/^hand-tile-/).map((el) => Number(el.getAttribute('data-tile-id')))
    const expectedOrder = sortByMode(stateB.players[HUMAN_SEAT].hand.concealedTiles, 'suit')
    expect(renderedOrder.map(typeIdOfInstance)).toEqual(expectedOrder.map(typeIdOfInstance))
  })
})
