import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type Meld, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { Melds } from './Melds.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('Melds', () => {
  it('renders nothing when there are no melds', () => {
    const { container } = render(<Melds seat={0} melds={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders every tile in a meld face-up, including a concealed kong', () => {
    const meld: Meld = { id: '0-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: idsFor('WE', 4), ownerSeat: 0 }
    render(<Melds seat={0} melds={[meld]} />)
    expect(screen.getAllByText('WE')).toHaveLength(4)
  })

  it('highlights meld tiles matching the selected type', () => {
    const meld: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('B5', 3), ownerSeat: 0 }
    render(<Melds seat={0} melds={[meld]} selectedTypeId="B5" />)
    expect(screen.getByTestId('meld-tile-0-0-0').className).toContain('ring-2')
  })

  it('calls onTileClick with the clicked tile id', () => {
    const [c5] = idsFor('C5', 3)
    const meld: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('C5', 3), ownerSeat: 0 }
    const onTileClick = vi.fn()
    render(<Melds seat={0} melds={[meld]} onTileClick={onTileClick} />)
    fireEvent.click(screen.getByTestId('meld-tile-0-0-0'))
    expect(onTileClick).toHaveBeenCalledWith(c5)
  })

  it('renders real tile-face art, not just the text label', () => {
    const meld: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('C5', 3), ownerSeat: 0 }
    render(<Melds seat={0} melds={[meld]} />)
    const img = screen.getByTestId('meld-tile-0-0-0').querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringMatching(/m5/))
  })
})
