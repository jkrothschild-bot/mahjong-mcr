import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DiscardConfirmModal } from './DiscardConfirmModal.js'

describe('DiscardConfirmModal', () => {
  it('renders nothing when there is no tile pending confirmation', () => {
    const { container } = render(<DiscardConfirmModal tileId={null} onConfirm={() => {}} onCancel={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the tile\'s display name and calls onConfirm/onCancel', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<DiscardConfirmModal tileId={0} onConfirm={onConfirm} onCancel={onCancel} />)

    expect(screen.getByRole('dialog', { name: 'Confirm discard' })).toHaveTextContent('1 Characters')

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onConfirm).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
