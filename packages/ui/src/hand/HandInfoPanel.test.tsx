import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyHand } from '@mahjong-mcr/engine'
import { HandInfoPanel } from './HandInfoPanel.js'

function renderPanel(open: boolean, onClose = vi.fn()) {
  render(
    <HandInfoPanel open={open} hand={emptyHand()} prevailingWind="east" seatWind="east" onClose={onClose} />,
  )
  return onClose
}

describe('HandInfoPanel', () => {
  it('renders nothing at all when closed — this is the whole point of the change', () => {
    const { container } = render(
      <HandInfoPanel open={false} hand={emptyHand()} prevailingWind="east" seatWind="east" onClose={() => {}} />,
    )
    // Not "hidden", not zero-height: absent. A closed panel that still
    // occupied a box in flow would reintroduce the board-resize bug this
    // component exists to fix (see its own doc comment).
    expect(container).toBeEmptyDOMElement()
  })

  it('opens as a dialog', () => {
    renderPanel(true)
    expect(screen.getByRole('dialog', { name: 'Hand info' })).toBeInTheDocument()
  })

  it('explains itself when there is nothing to report yet', () => {
    // FanTrackerPanel and WaitsPanel both self-suppress on an empty hand.
    // In HudBar that emptiness was invisible; in a panel the user chose to
    // open it would look broken, so the placeholder has to be there.
    renderPanel(true)
    expect(screen.getByText(/locked in appear here/i)).toBeInTheDocument()
  })

  it('closes from the Close button and from the backdrop', () => {
    const onClose = renderPanel(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when the dialog body itself is clicked', () => {
    const onClose = renderPanel(true)
    fireEvent.click(screen.getByRole('dialog', { name: 'Hand info' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})
