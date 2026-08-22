import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WallDrawMotionContext } from '../board/WallDrawMotion.js'
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

  it('centers the box at (x, y) via left/top plus negative margins (not a transform:translate string, which would fight Framer Motion for ownership of `transform`)', () => {
    const style = boxStyle(0)
    expect(style.left).toBe('100px')
    expect(style.top).toBe('200px')
    expect(style.marginLeft).toBe('-15px') // -boxWidth/2
    expect(style.marginTop).toBe('-25px') // -boxHeight/2
  })

  it('re-centers via margins using the post-rotation (swapped) box size', () => {
    const style = boxStyle(90)
    expect(style.marginLeft).toBe('-25px') // -boxWidth/2, boxWidth now 50 (swapped)
    expect(style.marginTop).toBe('-15px') // -boxHeight/2, boxHeight now 30 (swapped)
  })

  it('expresses rotation via the rotate style shorthand (Framer Motion compiles it into transform itself, not a hand-authored transform string)', () => {
    const { container } = render(
      <Positioned x={0} y={0} naturalWidth={30} naturalHeight={50} rotation={90}>
        <span>tile</span>
      </Positioned>,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.transform).toBe('rotate(90deg)')
  })

  it('registers and temporarily hides a wall-draw destination without rendering a proxy itself', () => {
    const registerDestination = vi.fn(() => () => {})
    const { container } = render(
      <WallDrawMotionContext.Provider value={{
        transitions: new Map([['tile-1', {
          id: 'draw:1:1',
          tileId: 1,
          source: { x: 10, y: 20, width: 12, height: 18 },
        }]]),
        registerDestination,
      }}>
        <Positioned layoutId="tile-1" x={100} y={200} naturalWidth={30} naturalHeight={50}>
          <span>tile</span>
        </Positioned>
      </WallDrawMotionContext.Provider>,
    )

    expect(container.firstElementChild).toHaveStyle({ visibility: 'hidden' })
    expect(registerDestination).toHaveBeenCalledWith('tile-1', {
      x: 100,
      y: 200,
      width: 30,
      height: 50,
      rotation: 0,
    })
    expect(container.querySelector('[data-wall-draw-overlay]')).not.toBeInTheDocument()
  })
})
