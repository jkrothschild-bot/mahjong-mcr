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

function currentShapeSummary() {
  // The route table below repeats shanten numbers per-shape (e.g. a route
  // row can also read "8-shanten"), so a bare screen.getByText(/shanten/)
  // is ambiguous now that Stage 1's route table lives on this tab too —
  // scope to the summary line specifically.
  return screen.getByText(/current shape/i).nextElementSibling!
}

describe('HandPlanTab', () => {
  it('shows the current shanten and shape pre-tenpai, with no fan warning', () => {
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1), ...idsFor('C7', 1)])
    render(<HandPlanTab hand={hand} prevailingWind="east" seatWind="east" />)
    expect(currentShapeSummary()).toHaveTextContent(/shanten/)
    expect(screen.getByRole('list', { name: 'Route table' })).toHaveTextContent('Standard')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lists an already-exposed dragon pung as locked in', () => {
    const dragonPung: Meld = { id: '0-0', kind: 'pung', exposure: 'exposed', tiles: idsFor('DW', 3), ownerSeat: 0 }
    const hand = handWith([...idsFor('C1', 1), ...idsFor('C4', 1)], [dragonPung])
    render(<HandPlanTab hand={hand} prevailingWind="east" seatWind="east" />)
    expect(screen.getByRole('list', { name: 'Locked-in fans' })).toHaveTextContent('Dragon Pung')
  })

  it('does not show the superseded 8-point warning when some current waits fall short', () => {
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
    expect(currentShapeSummary()).toHaveTextContent(/Tenpai/)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/8-point minimum/)).not.toBeInTheDocument()
  })

  // KICKOFF-phase10 gap fix, verbatim example from the task: a hand
  // 4-shanten by Seven Pairs and 5-shanten by Standard (the same live hand
  // hints.test.ts's kickoffLiveHand fixture uses) has only a 1-shanten gap
  // — inside VIABLE_ROUTE_SHANTEN_MARGIN — so BOTH routes must still show,
  // and no single route may be crowned "the plan."
  it('shows both routes and names no primary route when they sit within one shanten of each other', () => {
    const hand = handWith([
      ...idsFor('C1', 1), ...idsFor('C2', 3), ...idsFor('C6', 1), ...idsFor('C9', 1),
      ...idsFor('D4', 1),
      ...idsFor('B3', 1), ...idsFor('B5', 2), ...idsFor('B8', 1),
      ...idsFor('WE', 1), ...idsFor('WS', 1), ...idsFor('WN', 1),
    ])
    render(<HandPlanTab hand={hand} prevailingWind="east" seatWind="north" />)

    expect(currentShapeSummary()).not.toHaveTextContent(/primary route/i)
    const routeTable = screen.getByRole('list', { name: 'Route table' })
    expect(routeTable).toHaveTextContent('5-shanten') // Standard
    expect(routeTable).toHaveTextContent('4-shanten') // Seven Pairs
    const standardRow = screen.getByText('Standard (4 sets + pair)').closest('li')!
    const sevenPairsRow = screen.getByText('Seven Pairs').closest('li')!
    expect(standardRow).toHaveTextContent('●') // both marked viable
    expect(sevenPairsRow).toHaveTextContent('●')
  })

  // The other half of the same fix: when one route genuinely clears the
  // margin, it — and only it — gets named primary. Same tenpai fixture as
  // the engine's computeHandPlan test ("every wait reaches 8+") — Standard
  // is tenpai (0-shanten) here while Seven Pairs sits several shanten back
  // (only 3 of its 8 needed pairs exist), well outside the margin.
  it('names a primary route once it clearly pulls ahead of every other route', () => {
    const hand = handWith([
      ...idsFor('C3', 1),
      ...idsFor('C4', 1),
      ...idsFor('B7', 1),
      ...idsFor('B8', 1),
      ...idsFor('B9', 1),
      ...idsFor('DW', 3),
      ...idsFor('DG', 3),
      ...idsFor('C9', 2),
    ])
    render(<HandPlanTab hand={hand} prevailingWind="east" seatWind="north" />)
    expect(currentShapeSummary()).toHaveTextContent('primary route: Standard')
  })
})
