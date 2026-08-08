import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startHand, type GameState } from '@mahjong-mcr/engine'
import { getBoardRegions, MIN_DESIGN_WIDTH } from '../stage/stageLayout.js'
import { applyDevOccupancy } from '../dev/devOccupancy.js'
import { DiscardField } from './DiscardField.js'

function freshState(): GameState {
  return startHand({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
}

// A discard used to only register as a drop when dragged precisely onto
// DiscardField's own "you" sub-zone — the player had to aim at one specific
// quadrant of the shared field rather than anywhere within it. Now the whole
// field (every zone combined, the area bounded by the wall ring) is one
// drop target.
describe('DiscardField drop target', () => {
  it('spans the entire shared discard field (all four zones), not just the "you" sub-zone', () => {
    render(<DiscardField state={freshState()} />)

    // Positioned's own outer wrapper carries the actual rendered box size —
    // the div under test (data-testid) is its child, sized via h-full/w-full.
    const wrapper = screen.getByTestId('discard-zone-drop-target').parentElement!

    const regions = getBoardRegions(MIN_DESIGN_WIDTH).discards
    const expectedWidth = regions.east.x + regions.east.width - regions.west.x
    const expectedHeight = regions.west.height

    expect(wrapper.style.width).toBe(`${expectedWidth}px`)
    expect(wrapper.style.height).toBe(`${expectedHeight}px`)
    // Sanity: strictly wider than a single zone — proves this isn't still
    // just the old "you"-only target under a renamed testid.
    expect(expectedWidth).toBeGreaterThan(regions.you.width)
  })

  it('renders exactly one drop target for the whole field, not one per zone', () => {
    render(<DiscardField state={freshState()} />)
    expect(screen.getAllByTestId('discard-zone-drop-target')).toHaveLength(1)
  })
})

describe('seat-oriented discard attribution', () => {
  it('renders no wind labels and leaves a visible gap between north and human rivers', () => {
    render(<DiscardField state={applyDevOccupancy(freshState(), 'preview', 0)} />)
    expect(screen.queryByTestId(/discard-zone-label-/)).not.toBeInTheDocument()

    const bounds = (zone: HTMLElement) => [...zone.querySelectorAll('[data-testid^="discard-tile-"]')].map((tile) => {
      const box = tile.parentElement as HTMLElement
      const top = Number.parseFloat(box.style.top) + Number.parseFloat(box.style.marginTop)
      return { top, bottom: top + Number.parseFloat(box.style.height) }
    })
    const north = bounds(screen.getByTestId('discard-zone-north'))
    const human = bounds(screen.getByTestId('discard-zone-you'))
    expect(Math.min(...human.map((box) => box.top)) - Math.max(...north.map((box) => box.bottom))).toBeGreaterThan(0)
  })
})

// At reveal, a hand won off a discard renders the claimed tile with the
// winner's hand instead (Board.tsx) — so the river must not draw it too.
describe('DiscardField omitTileId', () => {
  function stateWithDiscards(): { state: GameState; discarded: number } {
    const state = freshState()
    const discarded = state.players[0].hand.concealedTiles[0]!
    const withDiscard: GameState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0
          ? { ...p, discards: [...p.discards, discarded], hand: { ...p.hand, concealedTiles: p.hand.concealedTiles.slice(1) } }
          : p,
      ) as GameState['players'],
    }
    return { state: withDiscard, discarded }
  }

  it('omits exactly the given tile from its river', () => {
    const { state, discarded } = stateWithDiscards()
    render(<DiscardField state={state} omitTileId={discarded} />)
    expect(screen.queryByTestId(`discard-tile-${discarded}`)).not.toBeInTheDocument()
  })

  it('renders the tile normally when omitTileId is null', () => {
    const { state, discarded } = stateWithDiscards()
    render(<DiscardField state={state} omitTileId={null} />)
    expect(screen.getByTestId(`discard-tile-${discarded}`)).toBeInTheDocument()
  })

  it('gives only the latest discard a temporary physical emphasis', () => {
    const { state, discarded } = stateWithDiscards()
    render(<DiscardField state={state} latestDiscardId={discarded} />)

    const tile = screen.getByTestId(`discard-tile-${discarded}`)
    expect(tile).toHaveAttribute('data-latest-discard', 'true')
    expect(tile.className).toContain('ring-sky-300')
    expect(tile).toHaveAttribute('title', 'Latest discard')
  })
})
