import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { HandTiles } from './HandTiles.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

// jsdom has no real layout engine, so document.elementFromPoint always
// returns null and Element.prototype.setPointerCapture doesn't exist.
// Stubbing both is the documented approach for testing pointer-based drag
// (see the hand-rearrangement plan) — real browsers (including iPad
// Safari) implement both natively.
function mockDropTarget(element: Element | null) {
  document.elementFromPoint = vi.fn().mockReturnValue(element)
}

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
})

describe('HandTiles', () => {
  it('renders one tile per order entry, in order', () => {
    const [c1] = idsFor('C1', 1)
    const [we] = idsFor('WE', 1)
    const order = [c1!, we!]
    render(<HandTiles order={order} onReorder={() => {}} />)

    const list = screen.getByRole('list', { name: 'Your hand' })
    const items = list.querySelectorAll('[role="listitem"]')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('C1')
    expect(items[1]).toHaveTextContent('WE')
  })

  it('renders real tile-face art, not just the text label', () => {
    const [c1] = idsFor('C1', 1)
    render(<HandTiles order={[c1!]} onReorder={() => {}} />)

    const img = screen.getByTestId(`hand-tile-${c1}`).querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringMatching(/m1/))
  })

  it('calls onReorder with the dragged tile and the tile dropped onto', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const [c3] = idsFor('C3', 1)
    const order = [c1!, c2!, c3!]
    const onReorder = vi.fn()
    render(<HandTiles order={order} onReorder={onReorder} />)

    const dragged = screen.getByTestId(`hand-tile-${c3}`)
    const target = screen.getByTestId(`hand-tile-${c1}`)
    mockDropTarget(target)

    fireEvent.pointerDown(dragged, { pointerId: 1 })
    fireEvent.pointerUp(dragged, { pointerId: 1, clientX: 5, clientY: 5 })

    expect(onReorder).toHaveBeenCalledWith(c3, c1)
  })

  it('calls onReorder with beforeId null when dropped on the trailing end zone', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const order = [c1!, c2!]
    const onReorder = vi.fn()
    render(<HandTiles order={order} onReorder={onReorder} />)

    const dragged = screen.getByTestId(`hand-tile-${c1}`)
    const endZone = screen.getByTestId('hand-end-zone')
    mockDropTarget(endZone)

    fireEvent.pointerDown(dragged, { pointerId: 1 })
    fireEvent.pointerUp(dragged, { pointerId: 1, clientX: 99, clientY: 5 })

    expect(onReorder).toHaveBeenCalledWith(c1, null)
  })

  it('does not call onReorder when dropped outside any valid target', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const order = [c1!, c2!]
    const onReorder = vi.fn()
    render(<HandTiles order={order} onReorder={onReorder} />)

    const dragged = screen.getByTestId(`hand-tile-${c1}`)
    mockDropTarget(null)

    fireEvent.pointerDown(dragged, { pointerId: 1 })
    fireEvent.pointerUp(dragged, { pointerId: 1, clientX: -1, clientY: -1 })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does not call onReorder when a drag is cancelled', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const order = [c1!, c2!]
    const onReorder = vi.fn()
    render(<HandTiles order={order} onReorder={onReorder} />)

    const dragged = screen.getByTestId(`hand-tile-${c1}`)
    const target = screen.getByTestId(`hand-tile-${c2}`)
    mockDropTarget(target)

    fireEvent.pointerDown(dragged, { pointerId: 1 })
    fireEvent.pointerCancel(dragged, { pointerId: 1 })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does not call onReorder when dropped on itself', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const order = [c1!, c2!]
    const onReorder = vi.fn()
    render(<HandTiles order={order} onReorder={onReorder} />)

    const dragged = screen.getByTestId(`hand-tile-${c1}`)
    mockDropTarget(dragged)

    fireEvent.pointerDown(dragged, { pointerId: 1 })
    fireEvent.pointerUp(dragged, { pointerId: 1, clientX: 5, clientY: 5 })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('calls onTileClick with the clicked tile id', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const onTileClick = vi.fn()
    render(<HandTiles order={[c1!, c2!]} onReorder={() => {}} onTileClick={onTileClick} />)

    fireEvent.click(screen.getByTestId(`hand-tile-${c2}`))

    expect(onTileClick).toHaveBeenCalledWith(c2)
  })

  it('highlights the selected tile', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} onReorder={() => {}} selectedTileId={c2} />)

    expect(screen.getByTestId(`hand-tile-${c2}`).className).toContain('ring-2')
    expect(screen.getByTestId(`hand-tile-${c1}`).className).not.toContain('ring-2')
  })

  it('marks the just-drawn tile distinctly from an explicit selection, so it is identifiable without clicking', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} onReorder={() => {}} justDrawnTileId={c2} />)

    expect(screen.getByTestId(`hand-tile-${c2}`).className).toContain('ring-sky-400')
    expect(screen.getByTestId(`hand-tile-${c2}`).className).not.toContain('ring-amber-400')
    expect(screen.getByTestId(`hand-tile-${c1}`).className).not.toContain('ring-sky-400')
  })

  it('lets an explicit selection\'s amber ring take precedence over the just-drawn ring on the same tile', () => {
    const [c1] = idsFor('C1', 1)
    render(<HandTiles order={[c1!]} onReorder={() => {}} selectedTileId={c1} justDrawnTileId={c1} />)

    const el = screen.getByTestId(`hand-tile-${c1}`)
    expect(el.className).toContain('ring-amber-400')
    expect(el.className).not.toContain('ring-sky-400')
  })
})
