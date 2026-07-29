import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { startHand, type RecordedMove, type StartHandParams } from '@mahjong-mcr/engine'
import type { HandMoveLog } from '../game/useGameLoop.js'
import { ReplayView } from './ReplayView.js'

function handMoveLogFor(startParams: StartHandParams): HandMoveLog {
  const dealt = startHand(startParams)
  const [firstTile] = dealt.players[startParams.dealerSeat].hand.concealedTiles
  const moves: RecordedMove[] = [{ seat: startParams.dealerSeat, move: { kind: 'discard', tile: firstTile! } }]
  return { startParams, moves }
}

describe('ReplayView', () => {
  it('opens on the last hand, at move 0 (the freshly-dealt state)', () => {
    const hand1 = handMoveLogFor({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    const hand2 = handMoveLogFor({ seed: 2, handNumber: 2, prevailingWind: 'east', dealerSeat: 1 })
    render(<ReplayView handMoveLogs={[hand1, hand2]} onClose={() => {}} />)

    expect(screen.getByTestId('replay-hand-indicator')).toHaveTextContent('Hand 2 of 2')
    expect(screen.getByTestId('replay-move-indicator')).toHaveTextContent('Move 0 of 1')
    expect(screen.getByTestId('game-stage')).toBeInTheDocument()
  })

  it('scrubbing to the next move shows the discard actually happening', () => {
    const hand1 = handMoveLogFor({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    render(<ReplayView handMoveLogs={[hand1]} onClose={() => {}} />)

    const discardedTile = hand1.moves[0]!.move.kind === 'discard' ? hand1.moves[0]!.move.tile : undefined
    expect(screen.queryByTestId(`discard-tile-${discardedTile}`)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next move' }))

    expect(screen.getByTestId('replay-move-indicator')).toHaveTextContent('Move 1 of 1')
    expect(screen.getByTestId(`discard-tile-${discardedTile}`)).toBeInTheDocument()
  })

  it('switching hands resets the move scrubber to 0', () => {
    const hand1 = handMoveLogFor({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    const hand2 = handMoveLogFor({ seed: 2, handNumber: 2, prevailingWind: 'east', dealerSeat: 1 })
    render(<ReplayView handMoveLogs={[hand1, hand2]} initialHandIndex={1} onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next move' }))
    expect(screen.getByTestId('replay-move-indicator')).toHaveTextContent('Move 1 of 1')

    fireEvent.click(screen.getByRole('button', { name: 'Prev hand' }))
    expect(screen.getByTestId('replay-hand-indicator')).toHaveTextContent('Hand 1 of 2')
    expect(screen.getByTestId('replay-move-indicator')).toHaveTextContent('Move 0 of 1')
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    const hand1 = handMoveLogFor({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })
    render(<ReplayView handMoveLogs={[hand1]} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
