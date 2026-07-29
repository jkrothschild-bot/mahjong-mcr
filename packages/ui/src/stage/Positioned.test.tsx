import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Positioned } from './Positioned.js'

function boxStyle(rotation: number, scale = 1) {
  const { container } = render(
    <Positioned x={100} y={200} naturalWidth={30} naturalHeight={50} rotation={rotation} scale={scale}>
      <span>tile</span>
    </Positioned>,
  )
  return (container.firstElementChild as HTMLElement).style
}

describe('Positioned', () => {
  it('sizes the box to the natural (unrotated) dimensions at rotation 0', () => {
    const style = boxStyle(0)
    expect(style.width).toBe('30px')
    expect(style.height).toBe('50px')
  })

  it('sizes the box to the natural dimensions at rotation 180 (no swap — a half-turn keeps the same footprint)', () => {
    const style = boxStyle(180)
    expect(style.width).toBe('30px')
    expect(style.height).toBe('50px')
  })

  it('swaps width/height at a +90 rotation, so the box matches the post-rotation footprint', () => {
    const style = boxStyle(90)
    expect(style.width).toBe('50px')
    expect(style.height).toBe('30px')
  })

  it('swaps width/height at a -90 rotation too', () => {
    const style = boxStyle(-90)
    expect(style.width).toBe('50px')
    expect(style.height).toBe('30px')
  })

  it('applies the group fitScale on top of the (possibly swapped) rotated footprint', () => {
    const style = boxStyle(90, 0.5)
    expect(style.width).toBe('25px')
    expect(style.height).toBe('15px')
  })

  it('centers the box at (x, y) via left/top plus a translate(-50%, -50%)', () => {
    const style = boxStyle(0)
    expect(style.left).toBe('100px')
    expect(style.top).toBe('200px')
    expect(style.transform).toContain('translate(-50%, -50%)')
    expect(style.transform).toContain('rotate(0deg)')
  })
})
