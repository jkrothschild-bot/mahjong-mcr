import { render, screen } from '@testing-library/react'
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
    render(<Seat seat={2} role="north" player={p} isDealer={false} isCurrentTurn={false} isHuman={false} matchScore={0} />)
    expect(screen.queryByText('C1')).not.toBeInTheDocument()
    const backs = screen.getAllByTestId(/seat-2-back-/)
    expect(backs).toHaveLength(13)
    expect(backs[0]!.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/bot-back/))
  })

  it('reveals a bot seat\'s concealed tiles as real faces when revealConcealed is true', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 1)]
    const p = player({ seat: 2, hand: { ...emptyHand(), concealedTiles } })
    render(
      <Seat seat={2} role="north" player={p} isDealer={false} isCurrentTurn={false} isHuman={false} matchScore={0} revealConcealed />,
    )
    expect(screen.queryAllByTestId(/seat-2-back-/)).toHaveLength(0)
    expect(screen.getAllByTestId(/seat-2-revealed-/)).toHaveLength(concealedTiles.length)
  })

  it('shows the human seat as real hand tiles', () => {
    const p = player({ seat: 0, hand: { ...emptyHand(), concealedTiles: idsFor('C1', 1) } })
    render(
      <Seat
        seat={0}
        role="human"
        player={p}
        isDealer={false}
        isCurrentTurn={false}
        isHuman
        matchScore={0}
        handOrder={p.hand.concealedTiles}
      />,
    )
    expect(screen.getByRole('list', { name: 'Your hand' })).toBeInTheDocument()
  })

  it('renders dealer and turn badges only when true, identically regardless of seat', () => {
    const p = player({ seat: 3 })
    render(<Seat seat={3} role="east" player={p} isDealer isCurrentTurn isHuman={false} matchScore={0} />)
    expect(screen.getByTestId('seat-3-dealer')).toBeInTheDocument()
    expect(screen.getByTestId('seat-3-turn')).toHaveTextContent('Turn')
  })

  it('labels the human\'s own turn distinctly ("Your turn") but still via the same badge treatment', () => {
    const p = player({ seat: 0 })
    render(<Seat seat={0} role="human" player={p} isDealer={false} isCurrentTurn isHuman matchScore={0} handOrder={[]} />)
    expect(screen.getByTestId('seat-0-turn')).toHaveTextContent('Your turn')
  })

  it('renders the sort control alongside the human hand, in the board itself, when onSort is provided', () => {
    const p = player({ seat: 0, hand: { ...emptyHand(), concealedTiles: idsFor('C1', 1) } })
    render(
      <Seat
        seat={0}
        role="human"
        player={p}
        isDealer={false}
        isCurrentTurn={false}
        isHuman
        matchScore={0}
        handOrder={p.hand.concealedTiles}
        onSort={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Sort hand' })).toBeInTheDocument()
  })

  it('anchors the sort control immediately to the left of the first human tile', () => {
    const concealedTiles = [...idsFor('C1', 4), ...idsFor('C2', 4), ...idsFor('C3', 4), ...idsFor('C4', 1)]
    const p = player({ seat: 0, hand: { ...emptyHand(), concealedTiles } })
    render(
      <Seat seat={0} role="human" player={p} isDealer={false} isCurrentTurn={false} isHuman matchScore={0} handOrder={p.hand.concealedTiles} onSort={vi.fn()} />,
    )
    const controlBox = screen.getByRole('button', { name: 'Sort hand' }).parentElement as HTMLElement
    const firstTileBox = screen.getByTestId(`hand-tile-${p.hand.concealedTiles[0]}`).parentElement as HTMLElement
    const controlRight = Number.parseFloat(controlBox.style.left) + Number.parseFloat(controlBox.style.marginLeft) + Number.parseFloat(controlBox.style.width)
    const firstTileLeft = Number.parseFloat(firstTileBox.style.left) + Number.parseFloat(firstTileBox.style.marginLeft)
    expect(firstTileLeft - controlRight).toBeCloseTo(8)
  })

  it('omits the sort control when onSort is not provided', () => {
    const p = player({ seat: 0, hand: { ...emptyHand(), concealedTiles: idsFor('C1', 1) } })
    render(
      <Seat
        seat={0}
        role="human"
        player={p}
        isDealer={false}
        isCurrentTurn={false}
        isHuman
        matchScore={0}
        handOrder={p.hand.concealedTiles}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Sort hand' })).not.toBeInTheDocument()
  })

  it('shows the match score', () => {
    const p = player({ seat: 1 })
    render(<Seat seat={1} role="west" player={p} isDealer={false} isCurrentTurn={false} isHuman={false} matchScore={1500} />)
    expect(screen.getByTestId('seat-1-score')).toHaveTextContent('1500')
  })

  describe('discard hint', () => {
    function renderHuman(showDiscardHint: boolean) {
      const p = player({ seat: 0, hand: { ...emptyHand(), concealedTiles: idsFor('C1', 4) } })
      return render(
        <Seat
          seat={0}
          role="human"
          player={p}
          isDealer={false}
          isCurrentTurn={false}
          isHuman
          matchScore={0}
          handOrder={p.hand.concealedTiles}
          onSort={vi.fn()}
          showDiscardHint={showDiscardHint}
        />,
      )
    }

    function tileBoxes(container: HTMLElement): string[] {
      return [...container.querySelectorAll('[data-testid^="hand-tile-"]')].map((el) => {
        // Positioned writes the stage-space box as inline left/top/width/
        // height on its own wrapper, so the wrapper's style IS the layout.
        const box = el.parentElement as HTMLElement
        return `${box.style.left}|${box.style.top}|${box.style.width}|${box.style.height}`
      })
    }

    it('appears beside the Sort button when the player has not discarded yet', () => {
      renderHuman(true)
      const hint = screen.getByTestId('discard-hint')
      expect(hint).toBeInTheDocument()
      expect(hint.closest('.absolute')).toHaveClass('z-30', 'pointer-events-none')
    })

    it('is gone once the player has discarded', () => {
      renderHuman(false)
      expect(screen.queryByTestId('discard-hint')).not.toBeInTheDocument()
    })

    // THE test for this feature. The hint's slot width is reserved out of the
    // hand row unconditionally (Seat.tsx's SORT_CONTROL_WIDTH), precisely so
    // that the hint disappearing after the first discard doesn't re-solve
    // fitRowTileWidth and shift every tile mid-hand — CLAUDE.md's standing
    // "layout never reflows mid-hand" rule. If someone later makes the
    // reservation conditional on visibility, this is what catches it.
    it('does not move or resize a single hand tile when it disappears', () => {
      const withHint = renderHuman(true)
      const before = tileBoxes(withHint.container)
      withHint.unmount()

      const withoutHint = renderHuman(false)
      const after = tileBoxes(withoutHint.container)

      expect(before).toHaveLength(4)
      // Guard against a vacuous pass: if Positioned ever stopped writing the
      // box inline, every entry would be '|||' and the equality below would
      // hold no matter how far the tiles actually moved.
      expect(before[0]).toContain('px')
      expect(after).toEqual(before)
    })

    it('leaves the Sort button in exactly the same place either way', () => {
      const withHint = renderHuman(true)
      const buttonBox = (screen.getByRole('button', { name: 'Sort hand' }).parentElement as HTMLElement).style.cssText
      withHint.unmount()

      renderHuman(false)
      expect((screen.getByRole('button', { name: 'Sort hand' }).parentElement as HTMLElement).style.cssText).toBe(buttonBox)
    })
  })
})
