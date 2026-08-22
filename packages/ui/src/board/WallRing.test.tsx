import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildWall, drawTile } from '@mahjong-mcr/engine'
import { WallRing } from './WallRing.js'

describe('WallRing', () => {
  it('renders four sides, eighteen stacks per side, and all 144 physical tiles for a fresh wall', () => {
    const { container } = render(<WallRing wall={buildWall(42)} dealerSeat={0} />)

    for (const edge of ['top', 'bottom', 'left', 'right']) {
      expect(screen.getByTestId(`wall-side-${edge}`).children).toHaveLength(18)
    }
    for (const edge of ['top', 'bottom']) {
      const horizontalSide = screen.getByTestId(`wall-side-${edge}`)
      expect(horizontalSide.style.width).not.toBe('100%')
      expect(horizontalSide.style.marginInline).toBe('auto')
    }
    expect(screen.getAllByTestId('wall-stack')).toHaveLength(72)
    expect(container.querySelectorAll('[data-wall-layer]')).toHaveLength(144)
    expect(container.querySelectorAll('[data-wall-layer="top"]')).toHaveLength(72)
    expect(container.querySelectorAll('[data-wall-layer="bottom"]')).toHaveLength(72)
    expect(container.querySelectorAll('[data-compact-tile-body]')).toHaveLength(144)
    expect(container.querySelectorAll('[data-compact-tile-back]')).toHaveLength(144)
    expect(container.querySelectorAll('[data-draw-source]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-wall-draw-overlay]')).toHaveLength(0)
    expect(new Set([...container.querySelectorAll('[data-wall-position]')].map((tile) => tile.getAttribute('data-wall-position'))).size).toBe(144)
  })

  it('removes exactly the physical tiles consumed from either wall end', () => {
    let wall = buildWall(7)
    wall = drawTile(wall, 'front').wall
    wall = drawTile(wall, 'back').wall
    const { container } = render(<WallRing wall={wall} dealerSeat={0} />)
    expect(container.querySelectorAll('[data-wall-layer]')).toHaveLength(142)
    expect(container.querySelectorAll('[data-draw-source]')).toHaveLength(0)
    expect(screen.getAllByTestId('wall-stack').some((stack) => stack.querySelectorAll('[data-wall-layer]').length === 1)).toBe(true)
  })
})
