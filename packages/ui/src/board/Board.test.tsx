import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startHand, startMatch, type GameState } from '@mahjong-mcr/engine'
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
        onRequestDiscard={() => {}}
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
        onRequestDiscard={() => {}}
      />,
    )

    expect(screen.getByTestId(`hand-tile-${drawnTile}`).className).not.toContain('ring-sky-400')
  })
})
