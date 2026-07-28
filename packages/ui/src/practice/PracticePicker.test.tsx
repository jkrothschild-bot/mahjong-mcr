import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SCENARIO_LIBRARY } from '@mahjong-mcr/engine'
import { PracticePicker } from './PracticePicker.js'

describe('PracticePicker', () => {
  it('lists every curated scenario with a Start button', () => {
    render(<PracticePicker onSelect={() => {}} onClose={() => {}} />)
    for (const preset of SCENARIO_LIBRARY) {
      expect(screen.getByText(preset.label)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button', { name: 'Start' })).toHaveLength(SCENARIO_LIBRARY.length)
  })

  it('calls onSelect with the chosen preset', () => {
    const onSelect = vi.fn()
    render(<PracticePicker onSelect={onSelect} onClose={() => {}} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Start' })[0]!)
    expect(onSelect).toHaveBeenCalledWith(SCENARIO_LIBRARY[0])
  })

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn()
    render(<PracticePicker onSelect={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
