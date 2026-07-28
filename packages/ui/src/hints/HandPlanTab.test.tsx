import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type Hand, type Meld, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { HandPlanTab } from './HandPlanTab.js'

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

describe('HandPlanTab', () => {
  it('shows the current shanten and shape pre-tenpai, with no fan warning', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HandPlanTab hand={hand} prevailingWind="east" seatWind="east" />)
    expect(screen.getByText(/shanten/)).toBeInTheDocument()
    expect(screen.getByText(/Standard/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lists an already-exposed dragon pung as locked in', () => {
    const dragonPung: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('DW', 3), ownerSeat: 0 }
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1)], [dragonPung])
    render(<HandPlanTab hand={hand} prevailingWind="east" seatWind="east" />)
    expect(screen.getByRole('list', { name: 'Locked-in fans' })).toHaveTextContent('Dragon Pung')
  })

  it('shows tenpai and a fan-value warning when some waits cannot reach the 8-point minimum', () => {
    // Same mixed-value shanpon fixture (C9/DG) verified computationally in
    // the engine's hints.test.ts: C9-discard scores 7, everything else 8+.
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
    render(<HandPlanTab hand={hand} prevailingWind="east" seatWind="north" />)
    expect(screen.getByText(/Tenpai/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/8-point minimum/)
  })
})
