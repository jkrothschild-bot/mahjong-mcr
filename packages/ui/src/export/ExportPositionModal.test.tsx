import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { startHand } from '@mahjong-mcr/engine'
import { ExportPositionModal } from './ExportPositionModal.js'
import { formatPositionText } from './formatPosition.js'

const state = startHand({ seed: 1, handNumber: 1, prevailingWind: 'east', dealerSeat: 0 })

describe('ExportPositionModal', () => {
  it('renders nothing when closed', () => {
    render(<ExportPositionModal open={false} state={state} forSeat={0} onClose={() => {}} />)
    expect(screen.queryByRole('dialog', { name: 'Export position' })).not.toBeInTheDocument()
  })

  it('shows the formatted position text when open', () => {
    render(<ExportPositionModal open state={state} forSeat={0} onClose={() => {}} />)
    const textarea = screen.getByRole('textbox', { name: 'Position text' }) as HTMLTextAreaElement
    expect(textarea.value).toBe(formatPositionText(state, 0))
  })

  it('copies to the clipboard and shows confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ExportPositionModal open state={state} forSeat={0} onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(formatPositionText(state, 0))
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    render(<ExportPositionModal open state={state} forSeat={0} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
