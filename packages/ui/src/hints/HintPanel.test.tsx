import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Hand, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
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

describe('HintPanel', () => {
  it('opens on the Best move tab by default, with real content', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HintPanel hand={hand} prevailingWind="east" seatWind="east" onClose={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Best move' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to the Hand plan and Tile safety tabs on click', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HintPanel hand={hand} prevailingWind="east" seatWind="east" onClose={() => {}} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Hand plan' }))
    expect(screen.getByRole('tab', { name: 'Hand plan' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Best move' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText(/shanten/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Tile safety' }))
    expect(screen.getByRole('tab', { name: 'Tile safety' })).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HintPanel hand={hand} prevailingWind="east" seatWind="east" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
