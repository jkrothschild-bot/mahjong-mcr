import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SortToolbar } from './SortToolbar.js'
import type { SortMode } from './handOrder.js'

describe('SortToolbar', () => {
  it('renders a button for all 6 sort modes, grouped under one label', () => {
    render(<SortToolbar onSort={() => {}} />)
    const group = screen.getByRole('group', { name: 'Sort hand' })
    for (const label of ['Suit', 'Number', 'Honors', 'Simples', 'Odds', 'Evens']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(group).toBeInTheDocument()
  })

  it('calls onSort with the right mode for each button', () => {
    const onSort = vi.fn()
    render(<SortToolbar onSort={onSort} />)

    const cases: [string, SortMode][] = [
      ['Suit', 'suit'],
      ['Number', 'number'],
      ['Honors', 'honors'],
      ['Simples', 'simples'],
      ['Odds', 'odds'],
      ['Evens', 'evens'],
    ]
    for (const [label, mode] of cases) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(onSort).toHaveBeenLastCalledWith(mode)
    }
    expect(onSort).toHaveBeenCalledTimes(6)
  })

  it('fires onSort again when the same mode is picked twice in a row (no persistent selected state to dedupe against)', () => {
    const onSort = vi.fn()
    render(<SortToolbar onSort={onSort} />)

    fireEvent.click(screen.getByRole('button', { name: 'Suit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suit' }))

    expect(onSort).toHaveBeenCalledTimes(2)
    expect(onSort).toHaveBeenLastCalledWith('suit')
  })
})
