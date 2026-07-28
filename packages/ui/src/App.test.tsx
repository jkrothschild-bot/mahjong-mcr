import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { typeIdOfInstance } from '@mahjong-mcr/engine'
import App from './App'
import { sortByMode } from './hand/handOrder.js'
import { initLoopState } from './game/useGameLoop.js'

describe('App', () => {
  it('renders the header and all four seats', () => {
    render(<App />)

    expect(screen.getByText('MCR Mahjong Trainer')).toBeInTheDocument()
    expect(screen.getByTestId('board')).toBeInTheDocument()
    for (const seat of [0, 1, 2, 3]) {
      expect(screen.getByTestId(`seat-${seat}`)).toBeInTheDocument()
    }
  })

  it('marks the dealer and current-turn seat identically for every seat (no human-only treatment)', () => {
    render(<App />)
    // Hand 1's dealer is seat 0 (== HUMAN_SEAT), and startHand's first
    // phase is the dealer's discard — so seat 0 opens as both dealer and
    // current turn.
    expect(screen.getByTestId('seat-0-dealer')).toBeInTheDocument()
    expect(screen.getByTestId('seat-0-turn')).toBeInTheDocument()
    for (const seat of [1, 2, 3]) {
      expect(screen.queryByTestId(`seat-${seat}-dealer`)).not.toBeInTheDocument()
      expect(screen.queryByTestId(`seat-${seat}-turn`)).not.toBeInTheDocument()
    }
  })

  it('renders the player\'s real 14-tile hand and lets sorting reorder it without touching engine state', () => {
    render(<App />)

    const hand = screen.getByRole('list', { name: 'Your hand' })
    // Seat 0 is dealerSeat in App.tsx's demo match (matchSeed 42, hand 1),
    // so it holds the dealer's folded-in 14th tile (see game-state.ts's
    // startHand) — 14, not 13.
    expect(hand.querySelectorAll('[role="listitem"]')).toHaveLength(14)

    // Same matchSeed App.tsx uses — the reference hand to compare against.
    const reference = initLoopState(42)
    const referenceTiles = reference.gameState.players[0].hand.concealedTiles

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort hand' }), { target: { value: 'suit' } })

    // Sorting is purely visual (SPEC.md §5) — the engine-shaped reference
    // hand is unaffected by anything the UI does.
    expect(reference.gameState.players[0].hand.concealedTiles).toEqual(referenceTiles)

    const renderedLabels = [...hand.querySelectorAll('[role="listitem"]')].map((el) => el.textContent)
    const expectedLabels = sortByMode(referenceTiles, 'suit').map(typeIdOfInstance)
    expect(renderedLabels).toEqual(expectedLabels)
  })

  it('lets the human select a hand tile and discard it, moving it into their discard pile', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Discard selected' })).toBeDisabled()

    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    const discardedLabel = firstTile!.textContent

    fireEvent.click(firstTile!)
    const discardButton = screen.getByRole('button', { name: 'Discard selected' })
    expect(discardButton).toBeEnabled()
    fireEvent.click(discardButton)

    const discards = screen.getByRole('list', { name: 'Seat 0 discards' })
    expect(discards.querySelectorAll('[role="listitem"]')).toHaveLength(1)
    expect(discards).toHaveTextContent(discardedLabel!)
  })

  it('shows a confirmation modal before discarding when the setting is on, and only commits on confirm', () => {
    window.localStorage.setItem(
      'mcr-mahjong:settings:v1',
      JSON.stringify({ botSpeedMs: 1500, confirmBeforeDiscard: true }),
    )
    render(<App />)

    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    fireEvent.click(firstTile!)
    fireEvent.click(screen.getByRole('button', { name: 'Discard selected' }))

    expect(screen.getByRole('dialog', { name: 'Confirm discard' })).toBeInTheDocument()
    // Not committed yet — the modal intercepted it.
    expect(screen.getByRole('list', { name: 'Seat 0 discards' }).querySelectorAll('[role="listitem"]')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByRole('dialog', { name: 'Confirm discard' })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Seat 0 discards' }).querySelectorAll('[role="listitem"]')).toHaveLength(1)
  })

  it('step mode: shows a "Next" button once a bot has a real decision pending, and clicking it advances the board', () => {
    vi.useFakeTimers()
    window.localStorage.setItem(
      'mcr-mahjong:settings:v1',
      JSON.stringify({ botSpeedMs: 1500, confirmBeforeDiscard: false, stepMode: true }),
    )
    render(<App />)

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()

    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    fireEvent.click(firstTile!)
    fireEvent.click(screen.getByRole('button', { name: 'Discard selected' }))

    // Let any pending (non-decision) draws auto-resolve; the bot's own
    // discard/claim decision should NOT auto-resolve under step mode.
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    const nextButton = screen.getByRole('button', { name: 'Next' })
    const board = screen.getByTestId('board')
    const boardBefore = board.innerHTML

    fireEvent.click(nextButton)

    expect(board.innerHTML).not.toBe(boardBefore)

    vi.useRealTimers()
  })

  it('clicking a tile shows the tile inspector with its name and unseen count', () => {
    render(<App />)

    expect(screen.queryByTestId('tile-inspector')).not.toBeInTheDocument()

    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    fireEvent.click(firstTile!)

    const inspector = screen.getByTestId('tile-inspector')
    expect(inspector).toHaveTextContent('unseen of 4')
    // The clicked tile itself is one of the "visible copies" being inspected.
    expect(firstTile!.className).toContain('ring-2')
  })

  it('opens and closes the tile-count grid, reflecting real counts from the live hand', () => {
    render(<App />)

    expect(screen.queryByRole('dialog', { name: 'Tile-count grid' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tile counts' }))
    const dialog = screen.getByRole('dialog', { name: 'Tile-count grid' })
    expect(dialog).toBeInTheDocument()

    // Seat 0's opening 14-tile hand includes at least one copy of some tile
    // type, so that type's grid cell must read fewer than 4 unseen.
    const reference = initLoopState(42)
    const [firstHandTile] = reference.gameState.players[0].hand.concealedTiles
    const heldTypeId = typeIdOfInstance(firstHandTile!)
    const countEl = screen.getByTestId(`tile-count-${heldTypeId}`).querySelector('.font-semibold')
    expect(Number(countEl!.textContent)).toBeLessThan(4)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Tile-count grid' })).not.toBeInTheDocument()
  })
})
