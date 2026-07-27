import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SortToolbar } from './SortToolbar.js'
import type { SortMode } from './handOrder.js'

describe('SortToolbar', () => {
  it('renders all 6 sort buttons with the expected labels', () => {
    render(<SortToolbar onSort={() => {}} />)
    for (const label of ['Suit', 'Number', 'Honors', 'Simples', 'Odds', 'Evens']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
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
})
