import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import type { Rect } from '../stage/stageLayout.js'
import { Discards } from './Discards.js'

const TEST_REGION: Rect = { x: 0, y: 0, width: 1000, height: 400 }

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('Discards', () => {
  it('uses a fixed 6-column grid — a hard rule, never overlap/fan/cascade — wrapping to a new row on the 7th tile', () => {
    const tiles = (['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'] as const).map((typeId) => idsFor(typeId, 1)[0]!)
    render(<Discards seat={0} tiles={tiles} region={TEST_REGION} />)

    const first = screen.getByTestId(`discard-tile-${tiles[0]}`).parentElement!.style
    const sixth = screen.getByTestId(`discard-tile-${tiles[5]}`).parentElement!.style
    const seventh = screen.getByTestId(`discard-tile-${tiles[6]}`).parentElement!.style

    // 6th tile stays on the same row as the 1st (same top, further right)...
    expect(sixth.top).toBe(first.top)
    expect(sixth.left).not.toBe(first.left)
    // ...but the 7th wraps to a new row starting back at column 0.
    expect(seventh.top).not.toBe(first.top)
    expect(seventh.left).toBe(first.left)
  })

  it('renders every discard in order, labeled by tile type', () => {
    const tiles = [...idsFor('C1', 1), ...idsFor('WE', 1), ...idsFor('B9', 1)]
    render(<Discards seat={1} tiles={tiles} region={TEST_REGION} />)
    const items = screen.getByRole('list', { name: 'Seat 1 discards' }).querySelectorAll('[role="listitem"]')
    expect([...items].map((el) => el.textContent)).toEqual(['C1', 'WE', 'B9'])
  })

  it('highlights tiles matching the selected type id', () => {
    const tiles = [...idsFor('C1', 1), ...idsFor('C2', 1)]
    render(<Discards seat={0} tiles={tiles} region={TEST_REGION} selectedTypeId="C2" />)
    const items = [...screen.getByRole('list', { name: 'Seat 0 discards' }).querySelectorAll('[role="listitem"]')]
    const highlighted = items.find((el) => el.textContent === 'C2')!
    const notHighlighted = items.find((el) => el.textContent === 'C1')!
    expect(highlighted.className).toContain('ring-2')
    expect(notHighlighted.className).not.toContain('ring-2')
  })

  it('calls onTileClick with the clicked tile id', () => {
    const [c1] = idsFor('C1', 1)
    const onTileClick = vi.fn()
    render(<Discards seat={0} tiles={[c1!]} region={TEST_REGION} onTileClick={onTileClick} />)
    fireEvent.click(screen.getByTestId(`discard-tile-${c1}`))
    expect(onTileClick).toHaveBeenCalledWith(c1)
  })

  it('renders real tile-face art, not just the text label', () => {
    const [c1] = idsFor('C1', 1)
    render(<Discards seat={0} tiles={[c1!]} region={TEST_REGION} />)
    const img = screen.getByTestId(`discard-tile-${c1}`).querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringMatching(/m1/))
  })
})
