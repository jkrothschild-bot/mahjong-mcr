import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SortToolbar } from './SortToolbar.js'

describe('SortToolbar', () => {
  it('renders a single Sort button, not a mode picker', () => {
    render(<SortToolbar onSort={() => {}} />)
    expect(screen.getByRole('button', { name: 'Sort hand' })).toHaveTextContent('Sort')
    // The 6-mode control this replaced is gone in both its historical shapes
    // (a <select>, and before that 6 buttons) — asserted so a partial revert
    // that leaves both on screen fails here.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    for (const label of ['Number', 'Honors', 'Simples', 'Odds', 'Evens']) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
    }
  })

  it('sorts by suit', () => {
    const onSort = vi.fn()
    render(<SortToolbar onSort={onSort} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sort hand' }))

    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort).toHaveBeenCalledWith('suit')
  })

  it('fires onSort again on a second press (a one-shot action, not a toggled mode)', () => {
    const onSort = vi.fn()
    render(<SortToolbar onSort={onSort} />)
    const button = screen.getByRole('button', { name: 'Sort hand' })

    fireEvent.click(button)
    fireEvent.click(button)

    expect(onSort).toHaveBeenCalledTimes(2)
    expect(onSort).toHaveBeenLastCalledWith('suit')
  })

  it('meets the iPad touch-target floor (SPEC.md §5a)', () => {
    render(<SortToolbar onSort={() => {}} />)
    // min-h-11 is 44px — the control is placed on the scaled stage
    // (Seat.tsx's own SORT_CONTROL_HEIGHT slot), so this asserts the class
    // contract rather than a rendered box jsdom can't measure.
    expect(screen.getByRole('button', { name: 'Sort hand' }).className).toContain('min-h-11')
  })
})
