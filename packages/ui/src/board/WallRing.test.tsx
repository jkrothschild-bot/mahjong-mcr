import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WallRing } from './WallRing.js'

describe('WallRing', () => {
  it('renders one decorative tile course on each edge', () => {
    render(<WallRing />)

    for (const edge of ['top', 'bottom', 'left', 'right']) {
      expect(screen.getByTestId(`wall-course-${edge}`)).toBeInTheDocument()
      expect(screen.getByTestId(`wall-segment-${edge}`).children).toHaveLength(1)
    }
  })
})
