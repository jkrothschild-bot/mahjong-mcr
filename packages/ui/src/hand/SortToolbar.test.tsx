import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SortToolbar } from './SortToolbar.js'
import type { SortMode } from './handOrder.js'

describe('SortToolbar', () => {
  it('renders a single dropdown offering all 6 sort modes', () => {
    render(<SortToolbar onSort={() => {}} />)
    const select = screen.getByRole('combobox', { name: 'Sort hand' })
    for (const label of ['Suit', 'Number', 'Honors', 'Simples', 'Odds', 'Evens']) {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument()
    }
    expect(select).toBeInTheDocument()
  })

  it('calls onSort with the right mode for each selection', () => {
    const onSort = vi.fn()
    render(<SortToolbar onSort={onSort} />)
    const select = screen.getByRole('combobox', { name: 'Sort hand' })

    const cases: [string, SortMode][] = [
      ['suit', 'suit'],
      ['number', 'number'],
      ['honors', 'honors'],
      ['simples', 'simples'],
      ['odds', 'odds'],
      ['evens', 'evens'],
    ]
    for (const [value, mode] of cases) {
      fireEvent.change(select, { target: { value } })
      expect(onSort).toHaveBeenLastCalledWith(mode)
    }
    expect(onSort).toHaveBeenCalledTimes(6)
  })

  it('resets to the placeholder after each selection, so picking the same mode twice still fires onSort', () => {
    const onSort = vi.fn()
    render(<SortToolbar onSort={onSort} />)
    const select = screen.getByRole('combobox', { name: 'Sort hand' }) as HTMLSelectElement

    fireEvent.change(select, { target: { value: 'suit' } })
    expect(select.value).toBe('')

    fireEvent.change(select, { target: { value: 'suit' } })
    expect(onSort).toHaveBeenCalledTimes(2)
    expect(onSort).toHaveBeenLastCalledWith('suit')
  })
})
