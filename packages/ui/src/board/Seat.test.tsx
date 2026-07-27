import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyHand, TILE_TYPE_BY_ID, typeIdOfInstance, type PlayerState, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'
import { Seat } from './Seat.js'

function idsFor(typeId: TileTypeId, count: number): TileInstanceId[] {
  const ids: TileInstanceId[] = []
  for (let i = 0; i < TILE_TYPE_BY_ID.length && ids.length < count; i++) {
    if (typeIdOfInstance(i) === typeId) ids.push(i)
  }
  if (ids.length < count) throw new Error(`Not enough tiles of type ${typeId} (wanted ${count})`)
  return ids
}

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return { seat: 1, seatWind: 'south', hand: emptyHand(), discards: [], score: 0, ...overrides }
}

describe('Seat', () => {
  it('shows a bot seat as tile backs, not real labels', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 1)]
    const p = player({ seat: 2, hand: { ...emptyHand(), concealedTiles } })
    render(<Seat seat={2} player={p} isDealer={false} isCurrentTurn={false} isHuman={false} matchScore={0} />)
    expect(screen.queryByText('C1')).not.toBeInTheDocument()
    expect(screen.getAllByTestId(/seat-2-back-/)).toHaveLength(13)
  })

  it('shows the human seat as real, sortable hand tiles', () => {
    const p = player({ seat: 0, hand: { ...emptyHand(), concealedTiles: idsFor('C1', 1) } })
    render(
      <Seat
        seat={0}
        player={p}
        isDealer={false}
        isCurrentTurn={false}
        isHuman
        matchScore={0}
        handOrder={p.hand.concealedTiles}
        onSortHand={vi.fn()}
        onReorderHand={vi.fn()}
      />,
    )
    expect(screen.getByRole('list', { name: 'Your hand' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Sort hand' })).toBeInTheDocument()
  })

  it('renders dealer and turn badges only when true, identically regardless of seat', () => {
    const p = player({ seat: 3 })
    render(<Seat seat={3} player={p} isDealer isCurrentTurn isHuman={false} matchScore={0} />)
    expect(screen.getByTestId('seat-3-dealer')).toBeInTheDocument()
    expect(screen.getByTestId('seat-3-turn')).toHaveTextContent('Turn')
  })

  it('labels the human\'s own turn distinctly ("Your turn") but still via the same badge treatment', () => {
    const p = player({ seat: 0 })
    render(<Seat seat={0} player={p} isDealer={false} isCurrentTurn isHuman matchScore={0} handOrder={[]} onSortHand={vi.fn()} onReorderHand={vi.fn()} />)
    expect(screen.getByTestId('seat-0-turn')).toHaveTextContent('Your turn')
  })

  it('shows the match score', () => {
    const p = player({ seat: 1 })
    render(<Seat seat={1} player={p} isDealer={false} isCurrentTurn={false} isHuman={false} matchScore={1500} />)
    expect(screen.getByTestId('seat-1-score')).toHaveTextContent('1500')
  })

  it('disables "Discard selected" until canDiscard is true, and wires it to onRequestDiscard', () => {
    const p = player({ seat: 0, hand: { ...emptyHand(), concealedTiles: idsFor('C1', 1) } })
    const onRequestDiscard = vi.fn()
    const { rerender } = render(
      <Seat
        seat={0}
        player={p}
        isDealer={false}
        isCurrentTurn
        isHuman
        matchScore={0}
        handOrder={p.hand.concealedTiles}
        onSortHand={vi.fn()}
        onReorderHand={vi.fn()}
        canDiscard={false}
        onRequestDiscard={onRequestDiscard}
      />,
    )
    expect(screen.getByRole('button', { name: 'Discard selected' })).toBeDisabled()

    rerender(
      <Seat
        seat={0}
        player={p}
        isDealer={false}
        isCurrentTurn
        isHuman
        matchScore={0}
        handOrder={p.hand.concealedTiles}
        onSortHand={vi.fn()}
        onReorderHand={vi.fn()}
        canDiscard
        onRequestDiscard={onRequestDiscard}
      />,
    )
    const button = screen.getByRole('button', { name: 'Discard selected' })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(onRequestDiscard).toHaveBeenCalled()
  })
})
