import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TableSurface } from './TableSurface.js'

describe('TableSurface', () => {
  it('renders a layered timber frame, inset felt, and four mitred corner joints', () => {
    render(<TableSurface />)
    expect(screen.getByTestId('table-surface')).toHaveClass('shadow-[inset_0_3px_2px_rgba(255,218,154,0.42),inset_0_-5px_5px_rgba(35,15,5,0.7),inset_3px_0_3px_rgba(255,205,130,0.18),inset_-3px_0_4px_rgba(35,15,5,0.55),0_5px_12px_rgba(0,0,0,0.55)]')
    const felt = screen.getByTestId('table-felt')
    expect(felt).toHaveClass('inset-[14px]')
    expect(felt.style.backgroundImage).toContain('repeating-linear-gradient')
    expect(felt.style.backgroundSize).toContain('5px 5px')
    expect(screen.getAllByTestId(/table-corner-joint-/)).toHaveLength(4)
  })
})
