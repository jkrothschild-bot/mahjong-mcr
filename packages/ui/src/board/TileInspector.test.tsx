import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TileInspector } from './TileInspector.js'

describe('TileInspector', () => {
  it('renders nothing when nothing is selected', () => {
    const { container } = render(<TileInspector selectedTypeId={null} unseenCounts={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the selected tile\'s name and unseen count', () => {
    render(<TileInspector selectedTypeId="C5" unseenCounts={{ C5: 2 }} />)
    const el = screen.getByTestId('tile-inspector')
    expect(el).toHaveTextContent('5 Characters')
    expect(el).toHaveTextContent('2 unseen of 4')
  })

  it('defaults to 0 unseen if the type is somehow missing from the count map', () => {
    render(<TileInspector selectedTypeId="WE" unseenCounts={{}} />)
    expect(screen.getByTestId('tile-inspector')).toHaveTextContent('0 unseen of 4')
  })
})
