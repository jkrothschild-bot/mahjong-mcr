import { describe, expect, it } from 'vitest'
import { isNewDragClinkTarget } from './dragClink.js'

describe('isNewDragClinkTarget', () => {
  it('clinks once when a dragged tile crosses a different hand tile', () => {
    expect(isNewDragClinkTarget(null, 10, 11)).toBe(true)
    expect(isNewDragClinkTarget(11, 10, 11)).toBe(false)
    expect(isNewDragClinkTarget(11, 10, 12)).toBe(true)
  })

  it('does not clink over the dragged tile, gaps, or drop-zone sentinels', () => {
    expect(isNewDragClinkTarget(null, 10, 10)).toBe(false)
    expect(isNewDragClinkTarget(null, 10, null)).toBe(false)
    expect(isNewDragClinkTarget(null, 10, '__discard__')).toBe(false)
  })
})
