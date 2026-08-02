import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDiscardFlow } from './useDiscardFlow.js'

describe('useDiscardFlow', () => {
  it('selectTile tracks a selection without submitting a discard', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: false, onSubmitDiscard }))

    act(() => result.current.selectTile(7))

    expect(result.current.selectedTileId).toBe(7)
    expect(onSubmitDiscard).not.toHaveBeenCalled()
  })

  // requestDiscardTile — double-click / drag-onto-the-discard-zone's single-
  // step trigger: it doesn't need selectTile called first, since the caller
  // already knows exactly which tile it means. It's the only way to commit a
  // discard now (the old select-then-press-a-button flow is gone).
  it('requestDiscardTile submits immediately when confirmBeforeDiscard is off, without a prior selectTile call', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: false, onSubmitDiscard }))

    act(() => result.current.requestDiscardTile(9))

    expect(onSubmitDiscard).toHaveBeenCalledWith(9)
    expect(result.current.selectedTileId).toBeNull()
  })

  it('requestDiscardTile opens the confirm step instead of submitting when confirmBeforeDiscard is on', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: true, onSubmitDiscard }))

    act(() => result.current.requestDiscardTile(9))

    expect(onSubmitDiscard).not.toHaveBeenCalled()
    expect(result.current.pendingConfirmTileId).toBe(9)
    // The tile also shows as selected, so DiscardConfirmModal/the highlighted
    // hand tile agree with each other while the modal is up.
    expect(result.current.selectedTileId).toBe(9)
  })

  it('requestDiscardTile overrides whatever was previously selected', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: false, onSubmitDiscard }))

    act(() => result.current.selectTile(3))
    act(() => result.current.requestDiscardTile(9))

    expect(onSubmitDiscard).toHaveBeenCalledWith(9)
    expect(onSubmitDiscard).not.toHaveBeenCalledWith(3)
  })

  it('confirmDiscard submits the pending tile and clears both selection states', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: true, onSubmitDiscard }))

    act(() => result.current.requestDiscardTile(7))
    act(() => result.current.confirmDiscard())

    expect(onSubmitDiscard).toHaveBeenCalledWith(7)
    expect(result.current.selectedTileId).toBeNull()
    expect(result.current.pendingConfirmTileId).toBeNull()
  })

  it('cancelDiscard closes the confirm step without submitting, keeping the tile selected', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: true, onSubmitDiscard }))

    act(() => result.current.requestDiscardTile(7))
    act(() => result.current.cancelDiscard())

    expect(onSubmitDiscard).not.toHaveBeenCalled()
    expect(result.current.pendingConfirmTileId).toBeNull()
    expect(result.current.selectedTileId).toBe(7)
  })
})
