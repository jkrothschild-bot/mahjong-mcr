import { useCallback, useState } from 'react'
import type { TileInstanceId } from '@mahjong-mcr/engine'

export interface UseDiscardFlowParams {
  confirmBeforeDiscard: boolean
  onSubmitDiscard: (tile: TileInstanceId) => void
}

export interface UseDiscardFlowResult {
  selectedTileId: TileInstanceId | null
  selectTile: (id: TileInstanceId) => void
  // Set only while the confirm modal should be showing.
  pendingConfirmTileId: TileInstanceId | null
  requestDiscard: () => void
  confirmDiscard: () => void
  cancelDiscard: () => void
}

// Selecting a hand tile and committing a discard are two separate steps
// (mirrors the already-approved docs/Mockups/...v8.html mockup's
// requestDiscard/openConfirmModal/performDiscard split) so that
// confirm-before-discard can intercept the second step without changing
// how tile selection itself works.
export function useDiscardFlow({ confirmBeforeDiscard, onSubmitDiscard }: UseDiscardFlowParams): UseDiscardFlowResult {
  const [selectedTileId, setSelectedTileId] = useState<TileInstanceId | null>(null)
  const [pendingConfirmTileId, setPendingConfirmTileId] = useState<TileInstanceId | null>(null)

  const selectTile = useCallback((id: TileInstanceId) => setSelectedTileId(id), [])

  const requestDiscard = useCallback(() => {
    if (selectedTileId === null) return
    if (confirmBeforeDiscard) {
      setPendingConfirmTileId(selectedTileId)
      return
    }
    onSubmitDiscard(selectedTileId)
    setSelectedTileId(null)
  }, [selectedTileId, confirmBeforeDiscard, onSubmitDiscard])

  const confirmDiscard = useCallback(() => {
    if (pendingConfirmTileId === null) return
    onSubmitDiscard(pendingConfirmTileId)
    setPendingConfirmTileId(null)
    setSelectedTileId(null)
  }, [pendingConfirmTileId, onSubmitDiscard])

  const cancelDiscard = useCallback(() => {
    setPendingConfirmTileId(null)
  }, [])

  return { selectedTileId, selectTile, pendingConfirmTileId, requestDiscard, confirmDiscard, cancelDiscard }
}
