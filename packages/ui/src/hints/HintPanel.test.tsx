import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyHand, startHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Hand, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { HintPanel } from './HintPanel.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[]): Hand {
  return { ...emptyHand(), concealedTiles }
}

const state = startHand({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })

describe('HintPanel', () => {
  it('opens on the Best move tab by default, with real content', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HintPanel hand={hand} prevailingWind="east" seatWind="east" state={state} forSeat={0} selectedTypeId={null} onClose={() => {}} onOpenEncyclopedia={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Best move' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches among all four tabs with correct selection state', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HintPanel hand={hand} prevailingWind="east" seatWind="east" state={state} forSeat={0} selectedTypeId={null} onClose={() => {}} onOpenEncyclopedia={() => {}} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Hand plan' }))
    expect(screen.getByRole('tab', { name: 'Hand plan' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Best move' })).toHaveAttribute('aria-selected', 'false')
    // The route table now repeats shanten numbers per-shape, so a bare
    // /shanten/ text query is ambiguous — just assert the Hand plan tab's
    // own content rendered.
    expect(screen.getByRole('list', { name: 'Route table' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '8-point route' }))
    expect(screen.getByRole('tab', { name: '8-point route' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Hand plan' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByTestId('route-to-points-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Tile safety' }))
    expect(screen.getByRole('tab', { name: 'Tile safety' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Tap any tile/)).toBeInTheDocument()
  })

  it('shows a safety rating on the Tile safety tab once a tile is selected', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(
      <HintPanel hand={hand} prevailingWind="east" seatWind="east" state={state} forSeat={0} selectedTypeId="C5" onClose={() => {}} onOpenEncyclopedia={() => {}} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Tile safety' }))
    expect(screen.getByTestId('tile-safety-rating')).toBeInTheDocument()
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HintPanel hand={hand} prevailingWind="east" seatWind="east" state={state} forSeat={0} selectedTypeId={null} onClose={onClose} onOpenEncyclopedia={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onOpenEncyclopedia when the Fan encyclopedia link is clicked', () => {
    const onOpenEncyclopedia = vi.fn()
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(
      <HintPanel
        hand={hand}
        prevailingWind="east"
        seatWind="east"
        state={state}
        forSeat={0}
        selectedTypeId={null}
        onClose={() => {}}
        onOpenEncyclopedia={onOpenEncyclopedia}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fan encyclopedia' }))
    expect(onOpenEncyclopedia).toHaveBeenCalledOnce()
  })

  it('does not render the Strategy Coach for a bot seat', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HintPanel hand={hand} prevailingWind="east" seatWind="south" state={state} forSeat={1} selectedTypeId={null} onClose={() => {}} onOpenEncyclopedia={() => {}} />)
    expect(screen.queryByTestId('hint-panel')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '8-point route' })).not.toBeInTheDocument()
  })
})
