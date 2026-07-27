import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startHand, typeIdOfInstance } from '@mahjong-mcr/engine'
import App from './App'
import { sortByMode } from './hand/handOrder.js'

describe('App', () => {
  it('renders the placeholder board with all four seat winds', () => {
    render(<App />)

    expect(screen.getByText('MCR Mahjong Trainer')).toBeInTheDocument()
    expect(screen.getByTestId('board')).toBeInTheDocument()
    for (const wind of ['E', 'S', 'W', 'N']) {
      expect(screen.getByText(wind)).toBeInTheDocument()
    }
  })

  it('renders the player\'s real 13-tile hand and lets sorting reorder it without touching engine state', () => {
    render(<App />)

    const hand = screen.getByRole('list', { name: 'Your hand' })
    // Seat 0 is dealerSeat in App.tsx's demo deal, so it holds the dealer's
    // folded-in 14th tile (see game-state.ts's startHand) — 14, not 13.
    expect(hand.querySelectorAll('[role="listitem"]')).toHaveLength(14)

    // Same seed/params App.tsx uses — the reference hand to compare against.
    const reference = startHand({ seed: 42, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    const referenceTiles = reference.players[0].hand.concealedTiles

    fireEvent.click(screen.getByRole('button', { name: 'Suit' }))

    // Sorting is purely visual (SPEC.md §5) — the engine-shaped reference
    // hand for these params is unaffected by anything the UI does.
    expect(reference.players[0].hand.concealedTiles).toEqual(referenceTiles)

    const renderedLabels = [...hand.querySelectorAll('[role="listitem"]')].map((el) => el.textContent)
    const expectedLabels = sortByMode(referenceTiles, 'suit').map(typeIdOfInstance)
    expect(renderedLabels).toEqual(expectedLabels)
  })
})
