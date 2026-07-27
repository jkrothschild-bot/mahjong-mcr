import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { Discards } from './Discards.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

describe('Discards', () => {
  it('uses a fixed 6-column grid — a hard rule, never overlap/fan/cascade', () => {
    const tiles = [...idsFor('C1', 1), ...idsFor('C2', 1)]
    render(<Discards seat={0} tiles={tiles} />)
    const list = screen.getByRole('list', { name: 'Seat 0 discards' })
    expect(list.className).toContain('grid-cols-6')
  })

  it('renders every discard in order, labeled by tile type', () => {
    const tiles = [...idsFor('C1', 1), ...idsFor('WE', 1), ...idsFor('B9', 1)]
    render(<Discards seat={1} tiles={tiles} />)
    const items = screen.getByRole('list', { name: 'Seat 1 discards' }).querySelectorAll('[role="listitem"]')
    expect([...items].map((el) => el.textContent)).toEqual(['C1', 'WE', 'B9'])
  })

  it('highlights tiles matching the selected type id', () => {
    const tiles = [...idsFor('C1', 1), ...idsFor('C2', 1)]
    render(<Discards seat={0} tiles={tiles} selectedTypeId="C2" />)
    const items = [...screen.getByRole('list', { name: 'Seat 0 discards' }).querySelectorAll('[role="listitem"]')]
    const highlighted = items.find((el) => el.textContent === 'C2')!
    const notHighlighted = items.find((el) => el.textContent === 'C1')!
    expect(highlighted.className).toContain('ring-2')
    expect(notHighlighted.className).not.toContain('ring-2')
  })
})
