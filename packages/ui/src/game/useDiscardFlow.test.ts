import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDiscardFlow } from './useDiscardFlow.js'

// The confirm-before-discard branch (pendingConfirmTileId / confirmDiscard /
// cancelDiscard, and DiscardConfirmModal) was removed with its setting. What
// remains is the part that always mattered: selection and commitment are
// separate, and requestDiscardTile is the single commit path both triggers
// (double-click, drag-to-river) go through.
describe('useDiscardFlow', () => {
  it('selectTile tracks a selection without submitting a discard', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ onSubmitDiscard }))

    act(() => result.current.selectTile(7))

    expect(result.current.selectedTileId).toBe(7)
    expect(onSubmitDiscard).not.toHaveBeenCalled()
  })

  // requestDiscardTile doesn't need selectTile called first — the caller
  // already knows exactly which tile it means.
  it('requestDiscardTile submits immediately, without a prior selectTile call', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ onSubmitDiscard }))

    act(() => result.current.requestDiscardTile(9))

    expect(onSubmitDiscard).toHaveBeenCalledWith(9)
    expect(result.current.selectedTileId).toBeNull()
  })

  it('requestDiscardTile overrides whatever was previously selected', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ onSubmitDiscard }))

    act(() => result.current.selectTile(3))
    act(() => result.current.requestDiscardTile(9))

    expect(onSubmitDiscard).toHaveBeenCalledWith(9)
    expect(onSubmitDiscard).not.toHaveBeenCalledWith(3)
  })

  it('submits every time — a repeated request is never swallowed as a duplicate', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ onSubmitDiscard }))

    act(() => result.current.requestDiscardTile(9))
    act(() => result.current.requestDiscardTile(9))

    expect(onSubmitDiscard).toHaveBeenCalledTimes(2)
  })
})
