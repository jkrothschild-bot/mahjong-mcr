import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FlowerTileFace } from './FlowerTileFace.js'

describe('FlowerTileFace', () => {
  it('renders a numbered flower face', () => {
    const { container } = render(<FlowerTileFace typeId="F3" />)
    expect(container).toHaveTextContent('3')
    expect(container).toHaveTextContent('Flower')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders a numbered season face', () => {
    const { container } = render(<FlowerTileFace typeId="S2" />)
    expect(container).toHaveTextContent('2')
    expect(container).toHaveTextContent('Season')
  })

  it('uses different accent colors for flowers vs seasons, so they read as distinct', () => {
    const flower = render(<FlowerTileFace typeId="F1" />)
    const season = render(<FlowerTileFace typeId="S1" />)
    const flowerFill = flower.container.querySelector('text')!.getAttribute('fill')
    const seasonFill = season.container.querySelector('text')!.getAttribute('fill')
    expect(flowerFill).not.toBe(seasonFill)
  })
})
