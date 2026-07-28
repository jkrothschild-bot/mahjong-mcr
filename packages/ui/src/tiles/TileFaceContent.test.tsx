import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TileFaceContent } from './TileFaceContent.js'

describe('TileFaceContent', () => {
  it('renders the real PNG art for a standard tile type, with an sr-only accessible name', () => {
    const { container } = render(<TileFaceContent typeId="C5" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', expect.stringMatching(/m5/))
    expect(img).toHaveAttribute('alt', '')
    expect(container).toHaveTextContent('C5') // via the sr-only span
  })

  it('falls back to a coded FlowerTileFace for flowers/seasons (no PNG art exists)', () => {
    const { container } = render(<TileFaceContent typeId="F2" />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container).toHaveTextContent('F2') // via the sr-only span
  })
})
