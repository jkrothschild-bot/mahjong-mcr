import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDiscardFlow } from './useDiscardFlow.js'

describe('useDiscardFlow', () => {
  it('submits immediately when confirmBeforeDiscard is off', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: false, onSubmitDiscard }))

    act(() => result.current.selectTile(7))
    act(() => result.current.requestDiscard())

    expect(onSubmitDiscard).toHaveBeenCalledWith(7)
    expect(result.current.selectedTileId).toBeNull()
    expect(result.current.pendingConfirmTileId).toBeNull()
  })

  it('opens the confirm step instead of submitting when confirmBeforeDiscard is on', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: true, onSubmitDiscard }))

    act(() => result.current.selectTile(7))
    act(() => result.current.requestDiscard())

    expect(onSubmitDiscard).not.toHaveBeenCalled()
    expect(result.current.pendingConfirmTileId).toBe(7)
  })

  it('confirmDiscard submits the pending tile and clears both selection states', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: true, onSubmitDiscard }))

    act(() => result.current.selectTile(7))
    act(() => result.current.requestDiscard())
    act(() => result.current.confirmDiscard())

    expect(onSubmitDiscard).toHaveBeenCalledWith(7)
    expect(result.current.selectedTileId).toBeNull()
    expect(result.current.pendingConfirmTileId).toBeNull()
  })

  it('cancelDiscard closes the confirm step without submitting, keeping the tile selected', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: true, onSubmitDiscard }))

    act(() => result.current.selectTile(7))
    act(() => result.current.requestDiscard())
    act(() => result.current.cancelDiscard())

    expect(onSubmitDiscard).not.toHaveBeenCalled()
    expect(result.current.pendingConfirmTileId).toBeNull()
    expect(result.current.selectedTileId).toBe(7)
  })

  it('requestDiscard is a no-op when nothing is selected', () => {
    const onSubmitDiscard = vi.fn()
    const { result } = renderHook(() => useDiscardFlow({ confirmBeforeDiscard: false, onSubmitDiscard }))

    act(() => result.current.requestDiscard())

    expect(onSubmitDiscard).not.toHaveBeenCalled()
  })
})
