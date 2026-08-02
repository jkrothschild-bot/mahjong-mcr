import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Meld, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import type { Rect } from '../stage/stageLayout.js'
import { SeatLine } from './SeatLine.js'

const TEST_REGION: Rect = { x: 0, y: 0, width: 400, height: 200 }

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
