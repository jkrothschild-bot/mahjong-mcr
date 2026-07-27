import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildWall, drawTile } from '@mahjong-mcr/engine'
import { WallCounter } from './WallCounter.js'

describe('WallCounter', () => {
  it('shows how many tiles remain drawable', () => {
    let wall = buildWall(1)
    const before = wall.tiles.length - wall.drawIndex
    const { rerender } = render(<WallCounter wall={wall} />)
    expect(screen.getByTestId('wall-count')).toHaveTextContent(String(before))

    wall = drawTile(wall).wall
    rerender(<WallCounter wall={wall} />)
    expect(screen.getByTestId('wall-count')).toHaveTextContent(String(before - 1))
  })
})
