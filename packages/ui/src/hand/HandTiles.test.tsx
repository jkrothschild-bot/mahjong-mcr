import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TILE_TYPE_BY_ID, typeIdOfInstance, type Meld, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { fitRowTileWidth, type Rect } from '../stage/stageLayout.js'
import { HAND_TILE_WIDTH_FLOOR, HUMAN_MELD_GAP_PX, TILE_BOX_PX } from '../tiles/tileStyles.js'
import { HandTiles } from './HandTiles.js'

const TEST_REGION: Rect = { x: 0, y: 0, width: 1000, height: 200 }

function positionedRect(element: HTMLElement) {
  const width = Number.parseFloat(element.style.width)
  const height = Number.parseFloat(element.style.height)
  const left = Number.parseFloat(element.style.left) + Number.parseFloat(element.style.marginLeft)
  const top = Number.parseFloat(element.style.top) + Number.parseFloat(element.style.marginTop)
  return { left, right: left + width, top, bottom: top + height }
}

function positionedWrapper(element: HTMLElement): HTMLElement {
  let current = element.parentElement
  while (current && !current.classList.contains('absolute')) current = current.parentElement
  if (!current) throw new Error(`No Positioned wrapper found for ${element.dataset.testid ?? element.tagName}`)
  return current
}

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
    render(<HandTiles order={order} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} />)

    const list = screen.getByRole('list', { name: 'Your hand' })
    const items = list.querySelectorAll('[role="listitem"]')
    expect(items).toHaveLength(2)
    expect(screen.getByTestId('human-wooden-rack')).toBeInTheDocument()
    expect(screen.getByTestId('human-rack-back-lip')).toBeInTheDocument()
    expect(screen.getByTestId('human-rack-groove')).toBeInTheDocument()
    expect(screen.getByTestId('human-rack-front-lip')).toBeInTheDocument()
    expect(screen.queryByTestId(/human-meld-bay-/)).not.toBeInTheDocument()
    expect(items[0]).toHaveTextContent('C1')
    expect(items[1]).toHaveTextContent('WE')
  })

  it('renders real tile-face art, not just the text label', () => {
    const [c1] = idsFor('C1', 1)
    render(<HandTiles order={[c1!]} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} />)

    const img = screen.getByTestId(`hand-tile-${c1}`).querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringMatching(/m1/))
  })

  it('calls onTileClick with the clicked tile id', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const onTileClick = vi.fn()
    render(<HandTiles order={[c1!, c2!]} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} onTileClick={onTileClick} />)

    fireEvent.click(screen.getByTestId(`hand-tile-${c2}`))

    expect(onTileClick).toHaveBeenCalledWith(c2)
  })

  it('highlights the selected tile with a much more visible amber match glow', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} selectedTileId={c2} />)

    const selected = screen.getByTestId(`hand-tile-${c2}`)
    expect(selected.className).toContain('ring-4')
    expect(selected.className).toContain('ring-amber-300')
    expect(selected.className).toContain('shadow-[0_0_18px_rgba(253,230,138,0.72)]')
    expect(screen.getByTestId(`hand-tile-${c1}`).className).not.toContain('ring-amber-300')
  })

  it('marks the just-drawn tile distinctly from an explicit selection, so it is identifiable without clicking', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} justDrawnTileId={c2} />)

    expect(screen.getByTestId(`hand-tile-${c2}`).className).toContain('ring-sky-400')
    expect(screen.getByTestId(`hand-tile-${c2}`).className).not.toContain('ring-amber-400')
    expect(screen.getByTestId(`hand-tile-${c1}`).className).not.toContain('ring-sky-400')
  })

  it('lets an explicit selection\'s amber glow take precedence over the just-drawn ring on the same tile', () => {
    const [c1] = idsFor('C1', 1)
    render(<HandTiles order={[c1!]} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} selectedTileId={c1} justDrawnTileId={c1} />)

    const el = screen.getByTestId(`hand-tile-${c1}`)
    expect(el.className).toContain('ring-amber-300')
    expect(el.className).not.toContain('ring-sky-400')
  })

  it('makes every hand tile keyboard-focusable, in logical (order-array) sequence — dnd-kit\'s sortable attributes, new in M8 Step 4', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    render(<HandTiles order={[c1!, c2!]} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} />)

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

  it('double-clicking a hand tile calls onRequestDiscardTile with that tile, not onTileClick\'s single-click id', () => {
    const [c1] = idsFor('C1', 1)
    const [c2] = idsFor('C2', 1)
    const onTileClick = vi.fn()
    const onRequestDiscardTile = vi.fn()
    render(
      <HandTiles
        order={[c1!, c2!]}
        activeId={null}
        overId={null}
        region={TEST_REGION}
        melds={[]}
        flowers={[]}
        onTileClick={onTileClick}
        onRequestDiscardTile={onRequestDiscardTile}
      />,
    )

    fireEvent.doubleClick(screen.getByTestId(`hand-tile-${c2}`))

    expect(onRequestDiscardTile).toHaveBeenCalledWith(c2)
    expect(onRequestDiscardTile).not.toHaveBeenCalledWith(c1)
  })

  it('omits the double-click handler entirely when onRequestDiscardTile is not provided (not the human\'s turn)', () => {
    const [c1] = idsFor('C1', 1)
    render(<HandTiles order={[c1!]} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={[]} />)

    // No onDoubleClick handler bound at all — asserting this doesn't throw
    // is the actual guarantee (nothing to call).
    expect(() => fireEvent.doubleClick(screen.getByTestId(`hand-tile-${c1}`))).not.toThrow()
  })

  // KICKOFF-phase9-human-melds.md item 4.
  describe('concealed kongs', () => {
    it("renders a concealed kong's outer two tiles face-down and its middle two face-up, keeping every tile's original id", () => {
      const [t0, t1, t2, t3] = idsFor('C1', 4)
      const kong: Meld = { id: 'k-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: [t0!, t1!, t2!, t3!], ownerSeat: 0 }
      render(<HandTiles order={[]} activeId={null} overId={null} region={TEST_REGION} melds={[kong]} flowers={[]} />)

      const tiles = [0, 1, 2, 3].map((i) => screen.getByTestId(`meld-tile-k-0-${i}`))
      expect(tiles.map((el) => el.getAttribute('data-tile-id'))).toEqual([t0, t1, t2, t3].map(String))

      // Outer two (index 0, 3): the bot-back image, not the real face.
      expect(tiles[0]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/bot-back/))
      expect(tiles[3]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/bot-back/))
      // Middle two (index 1, 2): the real C1 ("m1") face art.
      expect(tiles[1]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/m1/))
      expect(tiles[2]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/m1/))
    })

    it('leaves an exposed kong entirely face-up (kongSource !== concealed only turns the concealed case)', () => {
      const [t0, t1, t2, t3] = idsFor('C1', 4)
      const kong: Meld = { id: 'k-0', kind: 'kong', exposure: 'exposed', kongSource: 'exposedFromDiscard', tiles: [t0!, t1!, t2!, t3!], ownerSeat: 0 }
      render(<HandTiles order={[]} activeId={null} overId={null} region={TEST_REGION} melds={[kong]} flowers={[]} />)

      for (const i of [0, 1, 2, 3]) {
        expect(screen.getByTestId(`meld-tile-k-0-${i}`).querySelector('img')).toHaveAttribute('src', expect.stringMatching(/m1/))
      }
    })

    it('keeps the tile inspector working on a concealed kong\'s face-down tiles — clicking one highlights it, same as any face-up tile', () => {
      const [t0, t1, t2, t3] = idsFor('C1', 4)
      const kong: Meld = { id: 'k-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: [t0!, t1!, t2!, t3!], ownerSeat: 0 }
      const onTileClick = vi.fn()
      render(<HandTiles order={[]} activeId={null} overId={null} region={TEST_REGION} melds={[kong]} flowers={[]} onTileClick={onTileClick} />)

      fireEvent.click(screen.getByTestId('meld-tile-k-0-0'))
      expect(onTileClick).toHaveBeenCalledWith(t0)
    })
  })

  // KICKOFF-phase9-human-melds.md item 2.
  it('renders one recessed shelf per meld, before its tiles in DOM order', () => {
    const pung: Meld = { id: 'p-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('C2', 3), ownerSeat: 0 }
    const chow: Meld = { id: 'c-0', kind: 'chow', exposure: 'exposed', tiles: [idsFor('C3', 1)[0]!, idsFor('C4', 1)[0]!, idsFor('C5', 1)[0]!], ownerSeat: 0 }
    render(<HandTiles order={[]} activeId={null} overId={null} region={TEST_REGION} melds={[pung, chow]} flowers={[]} />)

    const shelf = screen.getByTestId('meld-shelf-p-0')
    expect(screen.getByTestId('meld-shelf-c-0')).toBeInTheDocument()
    const tile0 = screen.getByTestId('meld-tile-p-0-0')
    // DOCUMENT_POSITION_FOLLOWING on tile0 (from shelf's perspective) means
    // shelf comes first in the DOM — behind the tile, since neither carries
    // a z-index.
    // eslint-disable-next-line no-bitwise
    expect(shelf.compareDocumentPosition(tile0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('places a darker wooden meld bay and divider behind the human meld area', () => {
    const order = idsFor('C1', 4)
    const pung: Meld = { id: 'p-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('C2', 3), ownerSeat: 0 }
    render(<HandTiles order={order} activeId={null} overId={null} region={TEST_REGION} melds={[pung]} flowers={[]} />)

    const bay = screen.getByTestId('human-meld-bay-0')
    const divider = screen.getByTestId('human-meld-divider-0')
    expect(bay.className).toContain('linear-gradient(180deg,#4a2616_0%,#31160d_52%,#1d0b06_100%)')
    expect(bay.className).toContain('inset_0_4px_7px')
    expect(divider).toHaveClass('w-full', 'bg-[#2a1209]')

    const lastConcealed = screen.getByTestId(`hand-tile-${order.at(-1)}`).parentElement!
    const firstMeld = screen.getByTestId('meld-tile-p-0-0').parentElement!
    const concealedRight = Number.parseFloat(lastConcealed.style.left) + Number.parseFloat(lastConcealed.style.marginLeft) + Number.parseFloat(lastConcealed.style.width)
    const meldLeft = Number.parseFloat(firstMeld.style.left) + Number.parseFloat(firstMeld.style.marginLeft)
    expect(meldLeft - concealedRight).toBeCloseTo(HUMAN_MELD_GAP_PX)
  })

  it.each([1, 2, 3, 4])('renders the shared meld bay with %i melds', (meldCount) => {
    const meldTypes = ['C1', 'C2', 'C3', 'C4'] as const
    const melds = meldTypes.slice(0, meldCount).map((typeId, index): Meld => ({
      id: `k-${index}`,
      kind: 'kong',
      exposure: 'exposed',
      kongSource: 'exposedFromDiscard',
      tiles: idsFor(typeId, 4),
      ownerSeat: 0,
    }))
    const occupied = new Set(melds.flatMap((meld) => meld.tiles))
    const order = Array.from({ length: TILE_TYPE_BY_ID.length }, (_, id) => id as TileInstanceId)
      .filter((id) => !occupied.has(id))
      .slice(0, Math.max(1, 13 - 3 * meldCount))
    const { unmount } = render(
      <HandTiles order={order} activeId={null} overId={null} region={{ ...TEST_REGION, width: 1800 }} melds={melds} flowers={[]} />,
    )

    expect(screen.getAllByTestId(/human-meld-bay-/)).toHaveLength(1)
    expect(screen.getAllByTestId(/human-meld-divider-/)).toHaveLength(1)
    unmount()
  })

  it.each([
    ['desktop', 1618],
    ['narrow desktop', 1216],
    ['iPad landscape', 874],
  ] as const)('keeps a four-meld bay contained and clear of concealed tiles at %s width', (_label, width) => {
    const meldTypes = ['C1', 'C2', 'C3', 'C4'] as const
    const melds = meldTypes.map((typeId, index): Meld => ({
      id: `k-${index}`,
      kind: 'kong',
      exposure: 'exposed',
      kongSource: 'exposedFromDiscard',
      tiles: idsFor(typeId, 4),
      ownerSeat: 0,
    }))
    const occupied = new Set(melds.flatMap((meld) => meld.tiles))
    const order = Array.from({ length: TILE_TYPE_BY_ID.length }, (_, id) => id as TileInstanceId)
      .filter((id) => !occupied.has(id))
      .slice(0, 1)
    render(<HandTiles order={order} activeId={null} overId={null} region={{ x: 0, y: 0, width, height: 140 }} melds={melds} flowers={[]} />)

    const rack = positionedRect(positionedWrapper(screen.getByTestId('human-wooden-rack')))
    const concealed = positionedRect(positionedWrapper(screen.getByTestId(`hand-tile-${order[0]}`)))
    for (const bayElement of screen.getAllByTestId(/human-meld-bay-/)) {
      const bay = positionedRect(positionedWrapper(bayElement))
      expect(bay.left).toBeGreaterThanOrEqual(rack.left)
      expect(bay.right).toBeLessThanOrEqual(rack.right)
      expect(bay.top).toBeGreaterThanOrEqual(rack.top)
      expect(bay.bottom).toBeLessThanOrEqual(rack.bottom)
      expect(
        bay.right <= concealed.left || bay.left >= concealed.right || bay.bottom <= concealed.top || bay.top >= concealed.bottom,
        JSON.stringify({ bay, concealed, width }),
      ).toBe(true)
    }
  })

  it('turns the claimed tile sideways in an exposed meld', () => {
    const tiles = idsFor('C2', 3)
    const pung: Meld = {
      id: 'p-0',
      kind: 'pung',
      exposure: 'exposed',
      tiles,
      ownerSeat: 0,
      claimedFrom: { seat: 3, discardTile: tiles[2]! },
    }
    render(<HandTiles order={[]} activeId={null} overId={null} region={TEST_REGION} melds={[pung]} flowers={[]} />)

    expect(screen.getByTestId('meld-tile-p-0-2')).toHaveAttribute('data-claimed-tile', 'true')
    expect(screen.getByTestId('meld-tile-p-0-2').style.transform).toContain('rotate(90deg)')
    expect(screen.getByTestId('meld-tile-p-0-0').style.transform).not.toContain('rotate')
  })

  it('places human flowers immediately after the playing tiles instead of at the far-right stage edge', () => {
    const order = [...idsFor('C1', 4), ...idsFor('C2', 4)]
    const flowers = [136, 137, 138, 139, 140]
    render(<HandTiles order={order} activeId={null} overId={null} region={TEST_REGION} melds={[]} flowers={flowers} />)

    const lastTile = screen.getByTestId(`hand-tile-${order.at(-1)}`).parentElement as HTMLElement
    const firstFlower = screen.getByTestId('flower-tile-136').parentElement as HTMLElement
    const tileRight = Number.parseFloat(lastTile.style.left) + Number.parseFloat(lastTile.style.marginLeft) + Number.parseFloat(lastTile.style.width)
    const flowerLeft = Number.parseFloat(firstFlower.style.left) + Number.parseFloat(firstFlower.style.marginLeft)
    expect(flowerLeft - tileRight).toBe(16)

    const tileBottom = Number.parseFloat(lastTile.style.top) + Number.parseFloat(lastTile.style.marginTop) + Number.parseFloat(lastTile.style.height)
    const flowerBottom = Number.parseFloat(firstFlower.style.top) + Number.parseFloat(firstFlower.style.marginTop) + Number.parseFloat(firstFlower.style.height)
    expect(flowerBottom).toBeCloseTo(tileBottom)
  })

  // Computes the expected width/height directly from fitRowTileWidth (the
  // same pure function HandTiles.tsx itself calls), including the human-only
  // meld-bay gap while keeping the tile dimensions on the existing scale.
  it('reserves the human meld-bay gap without changing the tile size model', () => {
    const order = idsFor('C1', 3)
    const kong: Meld = { id: 'k-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: idsFor('C2', 4), ownerSeat: 0 }
    render(<HandTiles order={order} activeId={null} overId={null} region={TEST_REGION} melds={[kong]} flowers={[]} />)

    const TILE_GAP = 4
    const meldReserve = HUMAN_MELD_GAP_PX - TILE_GAP
    const { width: nominalWidth, height: nominalHeight } = TILE_BOX_PX.large
    const expected = fitRowTileWidth(
      order.length + kong.tiles.length,
      TEST_REGION.width - meldReserve,
      nominalWidth,
      nominalHeight,
      TILE_GAP,
      HAND_TILE_WIDTH_FLOOR,
    )

    // Concealed tiles get an inline width/height override (Phase 2.2's
    // shrink-to-fit) — the direct, load-bearing check that tileWidth/
    // tileHeight itself wasn't touched.
    const concealedEl = screen.getByTestId(`hand-tile-${order[0]}`)
    expect(concealedEl.style.width).toBe(`${expected.width}px`)
    expect(concealedEl.style.height).toBe(`${expected.height}px`)

    // Melds share that SAME tileWidth/tileHeight (not a separately-drifted
    // value) — Positioned's own wrapper is what carries the actual
    // post-scale box size for a meld tile.
    const meldWrapper = screen.getByTestId('meld-tile-k-0-0').parentElement!
    expect(meldWrapper.style.width).toBe(`${expected.width}px`)
    expect(meldWrapper.style.height).toBe(`${expected.height}px`)
  })
})
