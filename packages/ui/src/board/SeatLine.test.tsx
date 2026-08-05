import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Meld, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import type { Rect } from '../stage/stageLayout.js'
import { SEAT_LINE_PX } from '../tiles/tileStyles.js'
import { SeatLine } from './SeatLine.js'

const TEST_REGION: Rect = { x: 0, y: 0, width: 400, height: 200 }

// The REAL west/east seat line geometry (stageLayout.ts's SIDE_WIDTH 176 and
// SIDE_LINE_H 600). The generous TEST_REGION above is fine for tests that
// only care about which tiles render, but anything asserting column packing
// or worst-case fit has to use the actual budget — that budget is the whole
// question.
const SIDE_REGION: Rect = { x: 4, y: 5, width: 161, height: 613 }
const SIDE_FLOWER_REGION: Rect = { x: 4, y: 572, width: 161, height: 188 }

// Positioned writes the placed box inline on its own wrapper, so the
// wrapper's style IS the layout.
function boxOf(container: HTMLElement, testId: string): { left: string; top: string; width: number; height: number } {
  const el = container.querySelector(`[data-testid="${testId}"]`)!.parentElement as HTMLElement
  return { left: el.style.left, top: el.style.top, width: parseFloat(el.style.width), height: parseFloat(el.style.height) }
}

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

// KICKOFF-phase9-human-melds.md item 4, applied to bot seats too (the doc's
// own instruction: "the same information is missing there").
describe('SeatLine concealed kongs', () => {
  it("renders a concealed kong's outer two tiles face-down and its middle two face-up, keeping every tile's original id", () => {
    const [t0, t1, t2, t3] = idsFor('C1', 4)
    const kong: Meld = { id: 'k-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: [t0!, t1!, t2!, t3!], ownerSeat: 1 }
    const hand = { ...emptyHand(), melds: [kong] }
    render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} />)

    const tiles = [0, 1, 2, 3].map((i) => screen.getByTestId(`meld-tile-k-0-${i}`))
    expect(tiles.map((el) => el.getAttribute('data-tile-id'))).toEqual([t0, t1, t2, t3].map(String))

    expect(tiles[0]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/bot-back/))
    expect(tiles[3]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/bot-back/))
    expect(tiles[1]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/m1/))
    expect(tiles[2]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/m1/))
  })

  it('leaves an exposed kong entirely face-up', () => {
    const [t0, t1, t2, t3] = idsFor('C1', 4)
    const kong: Meld = { id: 'k-0', kind: 'kong', exposure: 'exposed', kongSource: 'exposedFromDiscard', tiles: [t0!, t1!, t2!, t3!], ownerSeat: 1 }
    const hand = { ...emptyHand(), melds: [kong] }
    render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} />)

    for (const i of [0, 1, 2, 3]) {
      expect(screen.getByTestId(`meld-tile-k-0-${i}`).querySelector('img')).toHaveAttribute('src', expect.stringMatching(/m1/))
    }
  })

  it(
    "keeps the tile inspector working on a concealed kong's face-down tiles — clicking one calls onTileClick and " +
      'highlighting responds to its type, same as any face-up tile (a kong is always 4 identical tiles, so the ' +
      "meld's own other 2, always face-up, already reveal the type — nothing is actually hidden by turning these two)",
    () => {
      const [t0, t1, t2, t3] = idsFor('C1', 4)
      const kong: Meld = { id: 'k-0', kind: 'kong', exposure: 'concealed', kongSource: 'concealed', tiles: [t0!, t1!, t2!, t3!], ownerSeat: 1 }
      const hand = { ...emptyHand(), melds: [kong] }
      const onTileClick = vi.fn()
      render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} onTileClick={onTileClick} selectedTypeId="C1" />)

      const backTile = screen.getByTestId('meld-tile-k-0-0')
      expect(backTile.className).toContain('ring-2')
      fireEvent.click(backTile)
      expect(onTileClick).toHaveBeenCalledWith(t0)
    },
  )

  it("a genuinely concealed hand tile (not a kong) stays a plain, non-interactive back — item 4 doesn't touch it", () => {
    const [t0] = idsFor('C1', 1)
    const hand = { ...emptyHand(), concealedTiles: [t0!] }
    const onTileClick = vi.fn()
    render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} onTileClick={onTileClick} />)

    const backTile = screen.getByTestId(`seat-1-back-${t0}`)
    fireEvent.click(backTile)
    expect(onTileClick).not.toHaveBeenCalled()
  })
})

// Once every tile turns face-up at hand end, a bot's melds become
// indistinguishable from its concealed tiles — the seat line has no MELD_GAP,
// just one uniform TILE_GAP. These give a revealed meld the human row's own
// treatment: a recessed shelf behind it and a nudge perpendicular to the line.
describe('SeatLine revealed melds', () => {
  it('renders a dimensional wooden holder with a back lip, groove, and front ledge', () => {
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 3) }
    render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} />)
    expect(screen.getByTestId('seat-1-wooden-rack')).toBeInTheDocument()
    expect(screen.getByTestId('seat-1-rack-back-lip')).toBeInTheDocument()
    expect(screen.getByTestId('seat-1-rack-groove')).toBeInTheDocument()
    expect(screen.getByTestId('seat-1-rack-front-lip')).toBeInTheDocument()
  })

  it('splits a side holder into two differently grained columns with a light recessed seam', () => {
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 4) }
    render(<SeatLine seat={1} hand={hand} region={SIDE_REGION} grid={{ columns: 2, rows: 9, rotation: 90 }} />)
    expect(screen.getByTestId('seat-1-rack-column-one')).toBeInTheDocument()
    expect(screen.getByTestId('seat-1-rack-column-two')).toBeInTheDocument()
    expect(screen.getByTestId('seat-1-rack-column-indent')).toHaveClass('left-1/2')
  })

  function pung(id: string, typeId: TileTypeId): Meld {
    return { id, kind: 'pung', exposure: 'exposed', tiles: idsFor(typeId, 3), ownerSeat: 1 }
  }

  it('shows no meld shelf while the hand is still in play', () => {
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 2), melds: [pung('m-0', 'D5')] }
    render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} />)
    expect(screen.queryByTestId(/seat-1-meld-shelf-/)).not.toBeInTheDocument()
  })

  it('gives each revealed meld a shelf', () => {
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 2), melds: [pung('m-0', 'D5'), pung('m-1', 'B7')] }
    render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} revealConcealed />)

    expect(screen.getByTestId('seat-1-meld-shelf-m-0')).toBeInTheDocument()
    expect(screen.getByTestId('seat-1-meld-shelf-m-1')).toBeInTheDocument()
  })

  it('turns the claimed discard sideways in a bot exposed meld', () => {
    const tiles = idsFor('D5', 3)
    const claimed: Meld = {
      id: 'm-0',
      kind: 'pung',
      exposure: 'exposed',
      tiles,
      ownerSeat: 2,
      claimedFrom: { seat: 1, discardTile: tiles[2]! },
    }
    const { container } = render(
      <SeatLine seat={2} hand={{ ...emptyHand(), melds: [claimed] }} region={TEST_REGION} grid={{ columns: 18, rows: 1, axis: 'horizontal' }} />,
    )

    const ordinary = boxOf(container, 'meld-tile-m-0-0')
    const sideways = boxOf(container, 'meld-tile-m-0-2')
    expect(screen.getByTestId('meld-tile-m-0-2')).toHaveAttribute('data-claimed-tile', 'true')
    expect(sideways.width).toBe(ordinary.height)
    expect(sideways.height).toBe(ordinary.width)
  })

  it('runs a revealed right-side winning hand down the outer column by whole sets, then the inner column and pair', () => {
    const order = [
      ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('B4', 1),
      ...idsFor('D3', 1), ...idsFor('D4', 1), ...idsFor('D5', 1),
      ...idsFor('C4', 1), ...idsFor('C5', 1), ...idsFor('C6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('C2', 2),
    ]
    const hand = { ...emptyHand(), concealedTiles: [...order] }
    const { container } = render(
      <SeatLine
        seat={3}
        hand={hand}
        region={SIDE_REGION}
        grid={{ columns: 2, rows: 9, rotation: -90 }}
        revealConcealed
        concealedOrder={order}
      />,
    )

    const boxes = order.map((id) => boxOf(container, `seat-3-revealed-${id}`))
    const outerColumn = new Set(boxes.slice(0, 6).map((box) => box.left))
    const innerColumn = new Set(boxes.slice(6).map((box) => box.left))
    expect(outerColumn.size).toBe(1)
    expect(innerColumn.size).toBe(1)
    expect(Number.parseFloat([...outerColumn][0]!)).toBeGreaterThan(Number.parseFloat([...innerColumn][0]!))
    expect(boxes.slice(0, 6).map((box) => Number.parseFloat(box.top))).toEqual(
      boxes.slice(0, 6).map((box) => Number.parseFloat(box.top)).sort((a, b) => a - b),
    )
    expect(boxes.slice(6).map((box) => Number.parseFloat(box.top))).toEqual(
      boxes.slice(6).map((box) => Number.parseFloat(box.top)).sort((a, b) => a - b),
    )
  })

  it('mirrors the grouped reveal on the left side, filling the outer column before the inner column and pair', () => {
    const order = [
      ...idsFor('B2', 1), ...idsFor('B3', 1), ...idsFor('B4', 1),
      ...idsFor('D3', 1), ...idsFor('D4', 1), ...idsFor('D5', 1),
      ...idsFor('C4', 1), ...idsFor('C5', 1), ...idsFor('C6', 1),
      ...idsFor('B7', 1), ...idsFor('B8', 1), ...idsFor('B9', 1),
      ...idsFor('C2', 2),
    ]
    const { container } = render(
      <SeatLine
        seat={1}
        hand={{ ...emptyHand(), concealedTiles: [...order] }}
        region={SIDE_REGION}
        grid={{ columns: 2, rows: 9, rotation: 90 }}
        revealConcealed
        concealedOrder={order}
      />,
    )

    const boxes = order.map((id) => boxOf(container, `seat-1-revealed-${id}`))
    const outerColumn = new Set(boxes.slice(0, 6).map((box) => box.left))
    const innerColumn = new Set(boxes.slice(6).map((box) => box.left))
    expect(outerColumn.size).toBe(1)
    expect(innerColumn.size).toBe(1)
    expect(Number.parseFloat([...outerColumn][0]!)).toBeLessThan(Number.parseFloat([...innerColumn][0]!))
    expect(boxes.slice(0, 6).map((box) => Number.parseFloat(box.top))).toEqual(
      boxes.slice(0, 6).map((box) => Number.parseFloat(box.top)).sort((a, b) => a - b),
    )
    expect(boxes.slice(6).map((box) => Number.parseFloat(box.top))).toEqual(
      boxes.slice(6).map((box) => Number.parseFloat(box.top)).sort((a, b) => a - b),
    )
  })

  it('never puts a shelf behind concealed tiles or flowers', () => {
    // 136 is the first flower (tiles.ts's fixed construction order: 136-139
    // flowers, 140-143 seasons) — taken by id rather than by type string so
    // this doesn't depend on how flower type ids happen to be spelled.
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 3), flowers: [136] }
    render(<SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} revealConcealed />)
    expect(screen.queryByTestId(/seat-1-meld-shelf-/)).not.toBeInTheDocument()
  })

  // THE test for the column-splitting fix. Previously the side seats placed
  // tile i at (col = floor(i/9), row = i % 9) with no concept of groups, so
  // this exact hand — 8 concealed tiles, then a 3-tile meld — put one meld
  // tile at the bottom of column 1 and the other two at the top of column 2,
  // forcing the player to read the meld around a corner. packGroupsMajor's
  // atomicity means the meld now moves to the next column whole.
  it('never splits a meld across a column boundary', () => {
    const hand = {
      ...emptyHand(),
      concealedTiles: [...idsFor('C1', 4), ...idsFor('C2', 4)],
      melds: [pung('m-0', 'D5')],
    }
    const { container } = render(
      <SeatLine seat={1} hand={hand} region={SIDE_REGION} flowerRegion={SIDE_FLOWER_REGION} flowerAxis="vertical" grid={{ columns: 2, rows: 9, rotation: 90 }} revealConcealed />,
    )

    const columns = new Set([0, 1, 2].map((i) => boxOf(container, `meld-tile-m-0-${i}`).left))
    expect(columns.size).toBe(1)
    // And therefore exactly one shelf, not one per run.
    expect(screen.getAllByTestId(/seat-1-meld-shelf-m-0/)).toHaveLength(1)
  })

  it('keeps every meld whole at worst-case occupancy, with 18 main tiles and 8 compact flowers unshrunk', () => {
    // Transient maximum: 4 kongs (16 melded) + 2 concealed/drawn = 18 main
    // tiles, plus all 8 flowers in their independent compact tray.
    const kongs: Meld[] = (['D1', 'D2', 'D3', 'D4'] as TileTypeId[]).map((typeId, i) => ({
      id: `k-${i}`,
      kind: 'kong' as const,
      exposure: 'exposed' as const,
      kongSource: 'exposedFromDiscard' as const,
      tiles: idsFor(typeId, 4),
      ownerSeat: 1,
    }))
    const hand = {
      ...emptyHand(),
      concealedTiles: idsFor('C1', 2),
      melds: kongs,
      flowers: [136, 137, 138, 139, 140, 141, 142, 143],
    }
    const { container } = render(
      <SeatLine seat={1} hand={hand} region={SIDE_REGION} flowerRegion={SIDE_FLOWER_REGION} flowerAxis="vertical" grid={{ columns: 2, rows: 9, rotation: 90 }} revealConcealed />,
    )

    for (const kong of kongs) {
      const columns = new Set([0, 1, 2, 3].map((i) => boxOf(container, `meld-tile-${kong.id}-${i}`).left))
      expect(columns.size, `${kong.id} straddles a column`).toBe(1)
    }
    // No tile shrank: every rendered tile is still at the nominal seat-line
    // size, i.e. packGroupsMajor's fit-scale stayed at 1.
    const tile = boxOf(container, 'meld-tile-k-0-0')
    expect(tile.width).toBe(SEAT_LINE_PX.normal.height)
    expect(tile.height).toBe(SEAT_LINE_PX.normal.width)
    const flower = boxOf(container, 'flower-tile-136')
    expect(flower.width).toBe(59.4)
    expect(flower.height).toBe(48.4)
    const flowerWrapper = container.querySelector('[data-testid="flower-tile-136"]')!.closest('.absolute') as HTMLElement
    // A 90-degree Positioned swaps this portrait tile's outer footprint.
    expect(Number.parseFloat(flowerWrapper.style.width)).toBeGreaterThan(Number.parseFloat(flowerWrapper.style.height))
    expect(Number.parseFloat(flowerWrapper.style.width)).toBeCloseTo(59.4)
    expect(Number.parseFloat(flowerWrapper.style.height)).toBeCloseTo(48.4)
  })

  it('lets concealed tiles flow across a column break — only melds are atomic', () => {
    // 13 backs can't fit one 9-row column, and treating the concealed block
    // as one atomic group would make it an oversized group that fit-scale
    // shrinks. They're size-1 groups precisely so they wrap freely.
    const hand = { ...emptyHand(), concealedTiles: [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 1)] }
    const { container } = render(<SeatLine seat={1} hand={hand} region={SIDE_REGION} flowerRegion={SIDE_FLOWER_REGION} flowerAxis="vertical" grid={{ columns: 2, rows: 9, rotation: 90 }} />)

    const backs = screen.getAllByTestId(/seat-1-back-/)
    expect(backs).toHaveLength(13)
    const columns = new Set(backs.map((el) => (el.parentElement as HTMLElement).style.left))
    expect(columns.size).toBeGreaterThan(1)
    expect(boxOf(container, backs[0]!.getAttribute('data-testid')!).width).toBe(SEAT_LINE_PX.normal.height)
  })

  it('nudges revealed meld tiles perpendicular to the line, and leaves concealed tiles alone', () => {
    const [c0] = idsFor('C1', 1)
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 2), melds: [pung('m-0', 'D5')] }
    render(
      <SeatLine
        seat={1}
        hand={hand}
        region={TEST_REGION}
        grid={{ columns: 3, rows: 9 }}
        revealConcealed
        meldShiftDirection={{ dx: 4, dy: 0 }}
      />,
    )

    expect(screen.getByTestId('meld-tile-m-0-0').style.transform).toBe('translate(4px, 0px)')
    expect(screen.getByTestId(`seat-1-revealed-${c0}`).style.transform).toBe('')
  })

  // The claimed winning discard is drawn WITH the winner's revealed hand
  // (Board.tsx moves it out of the river for display), completing the group
  // it finished — the live bug: a Pure Shifted Chows win rendering "6,7"
  // where 5-6-7 should be, because the 5 sat across the table in the river.
  it('renders an extra (claimed) tile with the revealed hand, ring-marked as the winning tile', () => {
    const concealed = idsFor('C1', 2)
    const [claimed] = idsFor('D5', 1)
    const hand = { ...emptyHand(), concealedTiles: concealed }
    render(
      <SeatLine
        seat={1}
        hand={hand}
        region={TEST_REGION}
        grid={{ columns: 3, rows: 9 }}
        revealConcealed
        extraConcealedTiles={[claimed!]}
        winningTileId={claimed}
      />,
    )

    const tile = screen.getByTestId(`seat-1-revealed-${claimed}`)
    expect(tile).toBeInTheDocument()
    expect(tile.className).toContain('ring-emerald-400')
    expect(tile).toHaveAttribute('title', 'Winning tile')
    // The ordinary revealed tiles carry no ring.
    expect(screen.getByTestId(`seat-1-revealed-${concealed[0]}`).className).not.toContain('ring-emerald-400')
  })

  it('never renders the extra tile mid-hand (it is still in the river then)', () => {
    const [claimed] = idsFor('D5', 1)
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 2) }
    render(
      <SeatLine seat={1} hand={hand} region={TEST_REGION} grid={{ columns: 3, rows: 9 }} extraConcealedTiles={[claimed!]} />,
    )
    expect(screen.queryByTestId(`seat-1-revealed-${claimed}`)).not.toBeInTheDocument()
    expect(screen.queryByTestId(`seat-1-back-${claimed}`)).not.toBeInTheDocument()
  })

  it('applies no nudge while the hand is in play, even if a direction is supplied', () => {
    const hand = { ...emptyHand(), concealedTiles: idsFor('C1', 2), melds: [pung('m-0', 'D5')] }
    render(
      <SeatLine
        seat={1}
        hand={hand}
        region={TEST_REGION}
        grid={{ columns: 3, rows: 9 }}
        meldShiftDirection={{ dx: 4, dy: 0 }}
      />,
    )
    expect(screen.getByTestId('meld-tile-m-0-0').style.transform).toBe('')
  })
})

describe('north flower placement', () => {
  it('keeps flowers on the same row, immediately to the right of the playing tiles', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 1)]
    const hand = { ...emptyHand(), concealedTiles, flowers: [136, 137] }
    const region = { x: 193, y: 14, width: 1382, height: 80 }
    const { container } = render(
      <SeatLine seat={2} hand={hand} region={region} flowerRegion={region} flowerAxis="horizontal" grid={{ columns: 18, rows: 1, axis: 'horizontal' }} />,
    )
    const lastTile = boxOf(container, `seat-2-back-${concealedTiles.at(-1)}`)
    const firstFlower = boxOf(container, 'flower-tile-136')
    const firstTile = boxOf(container, `seat-2-back-${concealedTiles[0]}`)
    const lastFlower = boxOf(container, 'flower-tile-137')
    expect(firstFlower.top).toBe(lastTile.top)
    expect(Number.parseFloat(firstFlower.left)).toBeGreaterThan(Number.parseFloat(lastTile.left))
    const rackLeft = Number.parseFloat(firstTile.left) - firstTile.width / 2
    const rackRight = Number.parseFloat(lastFlower.left) + lastFlower.width / 2
    const rackCenter = (rackLeft + rackRight) / 2
    expect(rackCenter).toBeCloseTo(region.x + region.width / 2)
  })
})
