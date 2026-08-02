import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TileCountGrid } from './TileCountGrid.js'

describe('TileCountGrid', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<TileCountGrid open={false} unseenCounts={{}} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows all 34 tile types with their unseen counts', () => {
    render(<TileCountGrid open unseenCounts={{ C1: 2, WE: 0 }} onClose={() => {}} />)
    expect(screen.getAllByTestId(/^tile-count-(?!value-)/)).toHaveLength(34)
    expect(screen.getByTestId('tile-count-C1')).toHaveTextContent('2')
    expect(screen.getByTestId('tile-count-WE')).toHaveTextContent('0')
  })

  it('defensively shows 0 for a type missing from the count map (computeUnseenCounts always provides all 34 in practice)', () => {
    render(<TileCountGrid open unseenCounts={{}} onClose={() => {}} />)
    expect(screen.getByTestId('tile-count-value-B9')).toHaveTextContent('0')
  })

  it('renders real tile-face art for each type, not just a letter/color swatch', () => {
    render(<TileCountGrid open unseenCounts={{ C1: 2 }} onClose={() => {}} />)
    const img = screen.getByTestId('tile-count-C1').querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringMatching(/m1/))
  })

  it('calls onClose when the Close button is clicked or the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<TileCountGrid open unseenCounts={{}} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking inside the dialog itself', () => {
    const onClose = vi.fn()
    render(<TileCountGrid open unseenCounts={{}} onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog', { name: 'Tile-count grid' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})
