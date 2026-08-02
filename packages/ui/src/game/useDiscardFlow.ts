import { useCallback, useState } from 'react'
import type { TileInstanceId } from '@mahjong-mcr/engine'

export interface UseDiscardFlowParams {
  confirmBeforeDiscard: boolean
  onSubmitDiscard: (tile: TileInstanceId) => void
}

export interface UseDiscardFlowResult {
  // Still tracks a single-click selection — used for the tile-inspector/
  // highlight ring, not for committing a discard (that's requestDiscardTile
  // below; there's no separate select-then-press-a-button step anymore).
  selectedTileId: TileInstanceId | null
  selectTile: (id: TileInstanceId) => void
  // Set only while the confirm modal should be showing.
  pendingConfirmTileId: TileInstanceId | null
  // Select-and-request in one step — the only way to submit a discard now:
  // double-click on a hand tile, or dragging one onto the discard field.
  // Goes through the same confirmBeforeDiscard branch either trigger needs.
  requestDiscardTile: (id: TileInstanceId) => void
  confirmDiscard: () => void
  cancelDiscard: () => void
}

// Selecting a hand tile (for the inspector/highlight) and committing a
// discard are two separate pieces of state so that confirm-before-discard
// can intercept the commit step without changing how tile selection itself
// works.
export function useDiscardFlow({ confirmBeforeDiscard, onSubmitDiscard }: UseDiscardFlowParams): UseDiscardFlowResult {
  const [selectedTileId, setSelectedTileId] = useState<TileInstanceId | null>(null)
  const [pendingConfirmTileId, setPendingConfirmTileId] = useState<TileInstanceId | null>(null)

  const selectTile = useCallback((id: TileInstanceId) => setSelectedTileId(id), [])

  const requestDiscardTile = useCallback(
    (id: TileInstanceId) => {
      setSelectedTileId(id)
      if (confirmBeforeDiscard) {
        setPendingConfirmTileId(id)
        return
      }
      onSubmitDiscard(id)
      setSelectedTileId(null)
    },
    [confirmBeforeDiscard, onSubmitDiscard],
  )

  const confirmDiscard = useCallback(() => {
    if (pendingConfirmTileId === null) return
    onSubmitDiscard(pendingConfirmTileId)
    setPendingConfirmTileId(null)
    setSelectedTileId(null)
  }, [pendingConfirmTileId, onSubmitDiscard])

  const cancelDiscard = useCallback(() => {
    setPendingConfirmTileId(null)
  }, [])

  return { selectedTileId, selectTile, pendingConfirmTileId, requestDiscardTile, confirmDiscard, cancelDiscard }
}
