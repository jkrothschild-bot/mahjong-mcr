import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Hand, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { WaitsPanel } from './WaitsPanel.js'

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

describe('WaitsPanel', () => {
  it('renders nothing when the hand is not tenpai', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    const { container } = render(<WaitsPanel hand={hand} prevailingWind="east" seatWind="east" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows both sides of the C3-C4 two-sided wait, with positive points', () => {
    const hand = handWith([
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
    ])
    render(<WaitsPanel hand={hand} prevailingWind="east" seatWind="east" />)

    const panel = screen.getByTestId('waits-panel')
    expect(panel).toBeInTheDocument()
    expect(screen.getByTestId('wait-C2')).toBeInTheDocument()
    expect(screen.getByTestId('wait-C5')).toBeInTheDocument()
    expect(panel).toHaveTextContent(/pts if claimed/)
    expect(panel).toHaveTextContent(/pts if self-drawn/)
  })
})
