import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { startHand, type GameState, type PlayerState, type Seat, type TileInstanceId } from '@mahjong-mcr/engine'
import { SettingsContext } from '../settings/SettingsContext.js'
import { DEFAULT_SETTINGS } from '../settings/useSettings.js'
import { DiscardOverlay } from './DiscardOverlay.js'

// Real instance IDs (0-143 are all valid regardless of hand/wall membership
// elsewhere — TileFaceContent only ever derives a tile TYPE from the id,
// never cross-checks it against any other zone) — arbitrary but distinct
// per player, so no two players' discard piles accidentally share an id.
function idsStartingAt(start: number, count: number): TileInstanceId[] {
  return Array.from({ length: count }, (_, i) => start + i)
}

function stateWithDiscards(counts: Partial<Record<Seat, number>>): GameState {
  const base = startHand({ seed: 42, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
  let cursor = 0
  const withDiscards = (player: PlayerState): PlayerState => {
    const count = counts[player.seat] ?? 0
    const discards = idsStartingAt(cursor, count)
    cursor += count
    return { ...player, discards }
  }
  const players: GameState['players'] = [
    withDiscards(base.players[0]),
    withDiscards(base.players[1]),
    withDiscards(base.players[2]),
    withDiscards(base.players[3]),
  ]
  return { ...base, players }
}

describe('DiscardOverlay', () => {
  it('renders nothing when closed', () => {
    const state = stateWithDiscards({ 0: 1 })
    render(<DiscardOverlay open={false} state={state} onClose={() => {}} />)
    expect(screen.queryByTestId('discard-overlay')).not.toBeInTheDocument()
  })

  it('renders all four bands, ordered across/left/right/you, each labelled with position and seat wind', () => {
    const state = stateWithDiscards({ 0: 1, 1: 1, 2: 1, 3: 1 })
    render(<DiscardOverlay open={true} state={state} onClose={() => {}} />)

    const regions = screen.getAllByRole('region')
    expect(regions).toHaveLength(4)
    // seat 2 is "across" from the human (seat 0) in this project's offset
    // convention — table-position order, not seat-number order.
    expect(regions[0]).toHaveAccessibleName(/^Across/)
    expect(regions[1]).toHaveAccessibleName(/^Left/)
    expect(regions[2]).toHaveAccessibleName(/^Right/)
    expect(regions[3]).toHaveAccessibleName(/^You/)
  })

  it("renders each player's discards in throw order, left to right", () => {
    const state = stateWithDiscards({ 0: 3 })
    render(<DiscardOverlay open={true} state={state} onClose={() => {}} />)
    const band = screen.getByTestId('discard-overlay-band-0')
    const tiles = state.players[0]!.discards.map((id) => within(band).getByTestId(`discard-overlay-tile-${id}`))
    const lefts = tiles.map((el) => Number.parseFloat(el.style.left))
    expect(lefts[0]).toBeLessThan(lefts[1]!)
    expect(lefts[1]).toBeLessThan(lefts[2]!)
  })

  it('marks only the most recent discard in each band, not any other', () => {
    const state = stateWithDiscards({ 0: 4 })
    render(<DiscardOverlay open={true} state={state} onClose={() => {}} />)
    const discards = state.players[0]!.discards
    discards.forEach((id, index) => {
      const tile = screen.getByTestId(`discard-overlay-tile-${id}`)
      if (index === discards.length - 1) {
        expect(tile).toHaveAttribute('data-latest', 'true')
      } else {
        expect(tile).not.toHaveAttribute('data-latest')
      }
    })
  })

  it('shows a placeholder, not an empty/broken band, for a seat with no discards yet', () => {
    const state = stateWithDiscards({ 0: 2 }) // seats 1-3 stay at 0
    render(<DiscardOverlay open={true} state={state} onClose={() => {}} />)
    const emptyBand = screen.getByTestId('discard-overlay-band-1')
    expect(within(emptyBand).getByText('No discards yet')).toBeInTheDocument()
  })

  it('renders correctly at worst-case occupancy: 83 shared across seats, and a 30-in-one-seat skew', () => {
    // 83 table-wide (KICKOFF-phase4-discard-overlay.md's occupancy target),
    // distributed unevenly (skewed toward seat 0) rather than split evenly —
    // exercises both the table-wide total and the single-band soft limit.
    const shared = stateWithDiscards({ 0: 30, 1: 30, 2: 15, 3: 8 })
    expect(() => render(<DiscardOverlay open={true} state={shared} onClose={() => {}} />)).not.toThrow()
    expect(screen.getByTestId('discard-overlay-band-0').querySelectorAll('[data-testid^="discard-overlay-tile-"]')).toHaveLength(30)
    expect(screen.getByTestId('discard-overlay-band-1').querySelectorAll('[data-testid^="discard-overlay-tile-"]')).toHaveLength(30)

    const skewed = stateWithDiscards({ 0: 30, 1: 0, 2: 0, 3: 0 })
    expect(() => render(<DiscardOverlay open={true} state={skewed} onClose={() => {}} />)).not.toThrow()
  })

  it('closes on Escape, the toolbar-equivalent close button, and a backdrop click — but not a click on a band', () => {
    const state = stateWithDiscards({ 0: 1 })

    const onCloseEscape = vi.fn()
    const { unmount: unmount1 } = render(<DiscardOverlay open={true} state={state} onClose={onCloseEscape} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCloseEscape).toHaveBeenCalledTimes(1)
    unmount1()

    const onCloseButton = vi.fn()
    const { unmount: unmount2 } = render(<DiscardOverlay open={true} state={state} onClose={onCloseButton} />)
    fireEvent.click(screen.getByTestId('discard-overlay-close'))
    expect(onCloseButton).toHaveBeenCalledTimes(1)
    unmount2()

    const onCloseBackdrop = vi.fn()
    const { unmount: unmount3 } = render(<DiscardOverlay open={true} state={state} onClose={onCloseBackdrop} />)
    fireEvent.click(screen.getByTestId('discard-overlay'))
    expect(onCloseBackdrop).toHaveBeenCalledTimes(1)
    unmount3()

    const onCloseBand = vi.fn()
    render(<DiscardOverlay open={true} state={state} onClose={onCloseBand} />)
    fireEvent.click(screen.getByTestId('discard-overlay-band-0'))
    expect(onCloseBand).not.toHaveBeenCalled()
  })

  it('does not react to Escape while closed', () => {
    const state = stateWithDiscards({ 0: 1 })
    const onClose = vi.fn()
    render(<DiscardOverlay open={false} state={state} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('tile geometry is independent of the live tileScale setting (KICKOFF-phase4 test 2)', () => {
    const state = stateWithDiscards({ 0: 1 })
    const { unmount } = render(
      <SettingsContext.Provider value={{ ...DEFAULT_SETTINGS, tileScale: 'normal' }}>
        <DiscardOverlay open={true} state={state} onClose={() => {}} />
      </SettingsContext.Provider>,
    )
    const id = state.players[0]!.discards[0]!
    const normalStyle = screen.getByTestId(`discard-overlay-tile-${id}`).style
    const normalWidth = normalStyle.width
    const normalHeight = normalStyle.height
    unmount()

    render(
      <SettingsContext.Provider value={{ ...DEFAULT_SETTINGS, tileScale: 'large' }}>
        <DiscardOverlay open={true} state={state} onClose={() => {}} />
      </SettingsContext.Provider>,
    )
    const largeStyle = screen.getByTestId(`discard-overlay-tile-${id}`).style
    expect(largeStyle.width).toBe(normalWidth)
    expect(largeStyle.height).toBe(normalHeight)
  })
})
