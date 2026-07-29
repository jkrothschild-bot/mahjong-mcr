import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { Flowers } from './Flowers.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('Flowers', () => {
  it('renders nothing when the seat has no flowers', () => {
    const { container } = render(<Flowers seat={0} tiles={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders every flower tile, with real art, not just text', () => {
    const [f1] = idsFor('F1', 1)
    render(<Flowers seat={0} tiles={[f1!]} />)
    const el = screen.getByTestId(`flower-tile-${f1}`)
    expect(el).toHaveTextContent('F1')
    expect(el.querySelector('img')).toBeInTheDocument()
  })

  it('highlights a flower tile matching the selected type', () => {
    const [f1] = idsFor('F1', 1)
    render(<Flowers seat={0} tiles={[f1!]} selectedTypeId="F1" />)
    expect(screen.getByTestId(`flower-tile-${f1}`).className).toContain('ring-2')
  })

  it('calls onTileClick with the clicked tile id', () => {
    const [f1] = idsFor('F1', 1)
    const onTileClick = vi.fn()
    render(<Flowers seat={0} tiles={[f1!]} onTileClick={onTileClick} />)
    fireEvent.click(screen.getByTestId(`flower-tile-${f1}`))
    expect(onTileClick).toHaveBeenCalledWith(f1)
  })
})
