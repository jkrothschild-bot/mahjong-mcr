import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Hand, type Meld, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { FanTrackerPanel } from './FanTrackerPanel.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function handWith(concealedTiles: TileInstanceId[], melds: Meld[] = []): Hand {
  return { ...emptyHand(), concealedTiles, melds }
}

describe('FanTrackerPanel', () => {
  it('renders nothing when there are no locked-in fans and no fan-value warning', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    const { container } = render(<FanTrackerPanel hand={hand} prevailingWind="east" seatWind="east" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an already-exposed dragon pung as locked in', () => {
    const dragonPung: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('DW', 3), ownerSeat: 0 }
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1)], [dragonPung])
    render(<FanTrackerPanel hand={hand} prevailingWind="east" seatWind="east" />)
    expect(screen.getByTestId('fan-tracker-panel')).toHaveTextContent('Dragon Pung')
  })

  it('warns when some waits cannot reach the 8-point minimum', () => {
    const hand = handWith([
      ...idsFor('D4', 1),
      ...idsFor('D5', 1),
      ...idsFor('D6', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('C9', 2),
      ...idsFor('DG', 2),
    ])
    render(<FanTrackerPanel hand={hand} prevailingWind="east" seatWind="north" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/8-point minimum/)
  })
})
