import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import type { Rect } from '../stage/stageLayout.js'
import { HandTiles } from './HandTiles.js'

const TEST_REGION: Rect = { x: 0, y: 0, width: 1000, height: 200 }

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

// The actual drag *gesture* (M8 Step 4's @dnd-kit/core + @dnd-kit/sortable)
// depends on real measured getBoundingClientRect() values for collision
// detection, which jsdom always reports as zero-size — a full simulated
// drag isn't meaningfully testable here the way the old
// document.elementFromPoint mechanism was. That mechanism's own reorder
// logic is covered directly and cheaply in resolveReorderTarget.test.ts
// (pure function, no DOM); the real drag gesture, the sibling-shift gap
// preview, and the DragOverlay lift are verified against the running app
// with Playwright instead (see the M8 Step 4 plan's verification section).
describe('HandTiles', () => {
  it('renders one tile per order entry, in order', () => {
    const [c1] = idsFor('C1', 1)
    const [we] = idsFor('WE', 1)
    const order = [c1!, we!]
    render(<HandTiles order={order} onReorder={() => {}} region={TEST_REGION} />)

    const list = screen.getByRole('list', { name: 'Your hand' })
    const items = list.querySelectorAll('[role="listitem"]')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('C1')
    expect(items[1]).toHaveTextContent('WE')
  })

  it('renders real tile-face art, not just the text label', () => {
    const [c1] = idsFor('C1', 1)
    render(<HandTiles order={[c1!]} onReorder={() => {}} region={TEST_REGION} />)

    const img = screen.getByTestId(`hand-tile-${c1}`).querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringMatching(/m1/))
  })

  it('calls onTileClick with the clicked tile id', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const onTileClick = vi.fn()
    render(<HandTiles order={[c1!, c2!]} onReorder={() => {}} region={TEST_REGION} onTileClick={onTileClick} />)

    fireEvent.click(screen.getByTestId(`hand-tile-${c2}`))

    expect(onTileClick).toHaveBeenCalledWith(c2)
  })

  it('highlights the selected tile', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} onReorder={() => {}} region={TEST_REGION} selectedTileId={c2} />)

    expect(screen.getByTestId(`hand-tile-${c2}`).className).toContain('ring-2')
    expect(screen.getByTestId(`hand-tile-${c1}`).className).not.toContain('ring-2')
  })

  it('marks the just-drawn tile distinctly from an explicit selection, so it is identifiable without clicking', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} onReorder={() => {}} region={TEST_REGION} justDrawnTileId={c2} />)

    expect(screen.getByTestId(`hand-tile-${c2}`).className).toContain('ring-sky-400')
    expect(screen.getByTestId(`hand-tile-${c2}`).className).not.toContain('ring-amber-400')
    expect(screen.getByTestId(`hand-tile-${c1}`).className).not.toContain('ring-sky-400')
  })

  it('lets an explicit selection\'s amber ring take precedence over the just-drawn ring on the same tile', () => {
    const [c1] = idsFor('C1', 1)
    render(<HandTiles order={[c1!]} onReorder={() => {}} region={TEST_REGION} selectedTileId={c1} justDrawnTileId={c1} />)

    const el = screen.getByTestId(`hand-tile-${c1}`)
    expect(el.className).toContain('ring-amber-400')
    expect(el.className).not.toContain('ring-sky-400')
  })

  it('makes every hand tile keyboard-focusable, in logical (order-array) sequence — dnd-kit\'s sortable attributes, new in M8 Step 4', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} onReorder={() => {}} region={TEST_REGION} />)

    const list = screen.getByRole('list', { name: 'Your hand' })
    const items = list.querySelectorAll('[role="listitem"]')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveAttribute('tabindex', '0')
    expect(items[1]).toHaveAttribute('tabindex', '0')
    // DOM order (which tab order follows) matches the logical `order` array
    // passed in, not some independently-DOM-sorted sequence.
    expect(items[0]).toHaveAttribute('data-tile-id', String(c1))
    expect(items[1]).toHaveAttribute('data-tile-id', String(c2))
  })
})
