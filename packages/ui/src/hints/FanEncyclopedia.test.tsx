import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FanEncyclopedia } from './FanEncyclopedia.js'

describe('FanEncyclopedia', () => {
  it('lists all 81 fans by default', () => {
    render(<FanEncyclopedia onClose={() => {}} />)
    for (let id = 1; id <= 81; id++) {
      expect(screen.getByTestId(`encyclopedia-fan-${id}`)).toBeInTheDocument()
    }
  })

  it('filters by search text', () => {
    render(<FanEncyclopedia onClose={() => {}} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Search fans' }), { target: { value: 'Dragon Pung' } })
    expect(screen.getByTestId('encyclopedia-fan-59')).toBeInTheDocument()
    expect(screen.queryByTestId('encyclopedia-fan-1')).not.toBeInTheDocument()
  })

  it('pre-fills the search box to a specific fan when initialFanId is given', () => {
    render(<FanEncyclopedia onClose={() => {}} initialFanId={59} />)
    expect(screen.getByRole('textbox', { name: 'Search fans' })).toHaveValue('Dragon Pung')
    expect(screen.getByTestId('encyclopedia-fan-59')).toBeInTheDocument()
  })

  it('calls onClose when the Close button or backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<FanEncyclopedia onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
