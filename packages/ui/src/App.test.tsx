import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { typeIdOfInstance } from '@mahjong-mcr/engine'
import App from './App'
import { sortByMode } from './hand/handOrder.js'
import { initLoopState, type LoopState } from './game/useGameLoop.js'

describe('App', () => {
  it('temporarily toggles a full-board occupancy preview', () => {
    render(<App matchSeed={42} />)
    const preview = screen.getByRole('button', { name: 'Preview full board' })
    fireEvent.click(preview)
    expect(screen.getByRole('button', { name: 'Exit full board' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('game-board')).toHaveAttribute('data-shared-layout', 'disabled')
    for (const [seat, flowerCount] of [
      [0, 5],
      [1, 8],
      [2, 5],
      [3, 5],
    ] as const) {
      expect(screen.getByTestId(`seat-${seat}`).querySelectorAll('[data-testid^="flower-tile-"]')).toHaveLength(flowerCount)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Exit full board' }))
    expect(screen.getByRole('button', { name: 'Preview full board' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('game-board')).toHaveAttribute('data-shared-layout', 'enabled')
  })
  it('renders the header and all four seats', () => {
    render(<App matchSeed={42} />)

    expect(screen.getByText('MCR Mahjong Mentor')).toBeInTheDocument()
    expect(screen.getByText('Learn while you play')).toBeInTheDocument()
    expect(screen.getByTestId('game-stage')).toBeInTheDocument()
    for (const seat of [0, 1, 2, 3]) {
      expect(screen.getByTestId(`seat-${seat}`)).toBeInTheDocument()
    }
  })

  it('sends the current match snapshot through the explicit Home control', async () => {
    const onHome = vi.fn(async (_snapshot: LoopState) => {})
    render(<App matchSeed={42} onHome={onHome} />)

    const home = screen.getByRole('button', { name: 'Home' })
    expect(home).toHaveAttribute('title', 'Home')
    expect(home).not.toHaveTextContent('Home')
    fireEvent.click(home)
    await waitFor(() => expect(onHome).toHaveBeenCalledOnce())
    expect(onHome.mock.calls[0]![0]).toMatchObject({
      gameState: { handNumber: 1 },
      matchState: { matchSeed: 42, matchHandNumber: 1 },
    })
  })

  it('shows an icon-only Logout control when authenticated navigation is provided', async () => {
    const onLogout = vi.fn(async (_snapshot: LoopState) => {})
    render(<App matchSeed={42} onLogout={onLogout} />)

    const logout = screen.getByRole('button', { name: 'Log out' })
    expect(logout).toHaveAttribute('title', 'Log out')
    expect(logout).not.toHaveTextContent('Log out')
    fireEvent.click(logout)
    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce())
    expect(onLogout.mock.calls[0]![0]).toMatchObject({ matchState: { matchSeed: 42, matchHandNumber: 1 } })
  })

  // The fan tracker and waits used to render in flow beneath the board, and
  // appeared the moment they had something to report — which changed
  // GameStage's leftover height, changed designWidth, and resized the whole
  // board mid-hand. They are now behind the "Hand info" button. This asserts
  // nothing puts them back in flow.
  it('keeps the fan tracker and waits out of the page flow until Hand info is opened', () => {
    render(<App matchSeed={42} />)

    expect(screen.queryByRole('dialog', { name: 'Hand info' })).not.toBeInTheDocument()
    expect(screen.queryByText('Locked in')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Ready hand — waits')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hand info' }))
    expect(screen.getByRole('dialog', { name: 'Hand info' })).toBeInTheDocument()
  })

  // Found in live play: a player drew the tile completing Four Concealed
  // Pungs (64 pts) and nothing happened. The engine had the move; App only
  // ever submitted { kind: 'discard' }, and ClaimPrompt only covers another
  // seat's discard — so on your own turn a discard was the only move you
  // could make. Bots were unaffected (chooseBotMove reads legalMoves), which
  // is why it went unnoticed. This asserts the prompt is wired up at all.
  it('mounts the own-turn declaration prompt so self-drawn wins and kongs are reachable', () => {
    render(<App matchSeed={42} />)
    // Hand 1 opens on the human's own discard decision. The prompt renders
    // nothing for an ordinary hand, so this asserts the wiring rather than a
    // visible button — TurnActionPrompt.test.tsx covers the offers
    // themselves against real winning/kong-able hands.
    expect(screen.queryByRole('group', { name: 'Declare a move' })).not.toBeInTheDocument()
    expect(screen.getByTestId('game-stage')).toBeInTheDocument()
  })

  it('marks the dealer and current-turn seat identically for every seat (no human-only treatment)', () => {
    render(<App matchSeed={42} />)
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
    render(<App matchSeed={42} />)

    const hand = screen.getByRole('list', { name: 'Your hand' })
    // Seat 0 is dealerSeat in App.tsx's demo match (matchSeed 42, hand 1),
    // so it holds the dealer's folded-in 14th tile (see game-state.ts's
    // startHand) — 14, not 13.
    expect(hand.querySelectorAll('[data-testid^="hand-tile-"]')).toHaveLength(14)

    // Same matchSeed App.tsx uses — the reference hand to compare against.
    const reference = initLoopState(42)
    const referenceTiles = reference.gameState.players[0].hand.concealedTiles

    fireEvent.click(screen.getByRole('button', { name: 'Sort hand' }))

    // Sorting is purely visual (SPEC.md §5) — the engine-shaped reference
    // hand is unaffected by anything the UI does.
    expect(reference.gameState.players[0].hand.concealedTiles).toEqual(referenceTiles)

    const renderedLabels = [...hand.querySelectorAll('[data-testid^="hand-tile-"]')].map((el) => el.textContent)
    const expectedLabels = sortByMode(referenceTiles, 'suit').map(typeIdOfInstance)
    expect(renderedLabels).toEqual(expectedLabels)
  })

  it('double-clicking a hand tile discards it, moving it into the discard pile', () => {
    render(<App matchSeed={42} />)

    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    const discardedLabel = firstTile!.textContent

    expect(screen.getByRole('list', { name: 'You discards' }).querySelectorAll('[role="listitem"]')).toHaveLength(0)
    fireEvent.doubleClick(firstTile!)

    const discards = screen.getByRole('list', { name: 'You discards' })
    expect(discards.querySelectorAll('[role="listitem"]')).toHaveLength(1)
    expect(discards).toHaveTextContent(discardedLabel!)
  })

  it('Restart asks for confirmation, and canceling leaves the current match untouched', () => {
    render(<App matchSeed={42} />)

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm restart' })
    expect(dialog).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Confirm restart' })).not.toBeInTheDocument()

    // Still the same deterministic matchSeed-42 opening deal — nothing reset.
    const hand = screen.getByRole('list', { name: 'Your hand' })
    expect(hand.querySelectorAll('[data-testid^="hand-tile-"]')).toHaveLength(14)
  })

  it('confirming Restart abandons the current match — a discard made before restarting is gone afterward', () => {
    render(<App matchSeed={42} />)

    expect(screen.getByTestId('discard-hint')).toBeInTheDocument()
    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    fireEvent.doubleClick(firstTile!)
    expect(screen.getByRole('list', { name: 'You discards' }).querySelectorAll('[role="listitem"]')).toHaveLength(1)
    expect(screen.queryByTestId('discard-hint')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm restart' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restart' }))

    expect(screen.queryByRole('dialog', { name: 'Confirm restart' })).not.toBeInTheDocument()
    // A brand new match: the discard from the abandoned one is gone, and
    // the human's hand is a fresh 14-tile deal again.
    expect(screen.getByRole('list', { name: 'You discards' }).querySelectorAll('[role="listitem"]')).toHaveLength(0)
    expect(screen.getByRole('list', { name: 'Your hand' }).querySelectorAll('[data-testid^="hand-tile-"]')).toHaveLength(14)
    expect(screen.getByTestId('discard-hint')).toBeInTheDocument()
  })

  // Both confirm-before-discard and step mode were removed. Their tests are
  // replaced by one asserting the simplified behaviour: a double-click
  // commits immediately, with no modal in the way and no "Next" button ever
  // appearing on the board. A stored settings blob still carrying the old
  // keys must not resurrect either.
  it('discards immediately on double-click, with no confirm modal and no step-mode Next button', () => {
    window.localStorage.setItem(
      'mcr-mahjong:settings:v1',
      JSON.stringify({ botSpeedMs: 1500, confirmBeforeDiscard: true, stepMode: true }),
    )
    render(<App matchSeed={42} />)

    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    fireEvent.doubleClick(firstTile!)

    expect(screen.queryByRole('dialog', { name: 'Confirm discard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'You discards' }).querySelectorAll('[role="listitem"]')).toHaveLength(1)
  })

  it('clicking a tile shows the tile inspector with its name and unseen count', () => {
    render(<App matchSeed={42} />)

    expect(screen.queryByTestId('tile-inspector')).not.toBeInTheDocument()

    const hand = screen.getByRole('list', { name: 'Your hand' })
    const [firstTile] = hand.querySelectorAll('[role="listitem"]')
    fireEvent.click(firstTile!)

    const inspector = screen.getByTestId('tile-inspector')
    expect(inspector).toHaveTextContent('unseen of 4')
    // The clicked tile itself is one of the "visible copies" being inspected.
    expect(firstTile!.className).toContain('ring-4')
  })

  it('opens and closes the tile-count grid, reflecting real counts from the live hand', () => {
    render(<App matchSeed={42} />)

    expect(screen.queryByRole('dialog', { name: 'Tile-count grid' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tile counts' }))
    const dialog = screen.getByRole('dialog', { name: 'Tile-count grid' })
    expect(dialog).toBeInTheDocument()

    // Seat 0's opening 14-tile hand includes at least one copy of some tile
    // type, so that type's grid cell must read fewer than 4 unseen.
    const reference = initLoopState(42)
    const [firstHandTile] = reference.gameState.players[0].hand.concealedTiles
    const heldTypeId = typeIdOfInstance(firstHandTile!)
    const countEl = screen.getByTestId(`tile-count-value-${heldTypeId}`)
    expect(Number(countEl.textContent)).toBeLessThan(4)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Tile-count grid' })).not.toBeInTheDocument()
  })

  it('opens and closes the Strategy Coach hint panel, on the Best move tab by default', () => {
    render(<App matchSeed={42} />)

    expect(screen.queryByTestId('hint-panel')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByTestId('hint-panel')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Best move' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByTestId('hint-panel')).not.toBeInTheDocument()
  })

  it('hides strategic assistance in Play Without Help while keeping legal discards playable', () => {
    render(<App matchSeed={42} config={{ variant: 'mcr', mode: 'solo', assistance: 'none' }} />)
    expect(screen.queryByRole('button', { name: 'Hint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hand info' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tile counts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fan encyclopedia' })).not.toBeInTheDocument()
    const hand = screen.getByRole('list', { name: 'Your hand' })
    fireEvent.doubleClick(hand.querySelector('[role="listitem"]')!)
    expect(screen.getByRole('list', { name: 'You discards' }).querySelectorAll('[role="listitem"]')).toHaveLength(1)
  })

  it('opens and closes the replay view, showing hand 1 with the initial deal at move 0', () => {
    render(<App matchSeed={42} />)

    expect(screen.queryByTestId('replay-view')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))
    expect(screen.getByTestId('replay-view')).toBeInTheDocument()
    expect(screen.getByTestId('replay-hand-indicator')).toHaveTextContent('Hand 1 of 1')
    expect(screen.getByTestId('replay-move-indicator')).toHaveTextContent('Move 0 of 0')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByTestId('replay-view')).not.toBeInTheDocument()
  })

  // The "All discards" full-viewport overlay (Phase 4) is gone — the discard
  // field became readable in place, so a second view of the same tiles wasn't
  // earning its toolbar button. What has to survive its removal: clicking a
  // discard still inspects that tile, and it no longer opens anything.
  describe('discard interaction after the All-discards overlay was removed', () => {
    it('offers no All discards button', () => {
      render(<App matchSeed={42} />)
      expect(screen.queryByRole('button', { name: 'All discards' })).not.toBeInTheDocument()
    })

    it('clicking a discard inspects its type and opens no overlay', () => {
      render(<App matchSeed={42} />)

      const hand = screen.getByRole('list', { name: 'Your hand' })
      const [firstTile] = hand.querySelectorAll('[role="listitem"]')
      fireEvent.doubleClick(firstTile!)

      const discardTile = screen.getByRole('list', { name: 'You discards' }).querySelector('[role="listitem"]')!
      fireEvent.click(discardTile)

      expect(screen.queryByTestId('discard-overlay')).not.toBeInTheDocument()
      // The tile inspector picked it up — its own chip names the clicked type.
      expect(screen.getByTestId('tile-inspector')).toBeInTheDocument()
    })
  })
})
