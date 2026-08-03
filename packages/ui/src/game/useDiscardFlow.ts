import { useCallback, useState } from 'react'
import type { TileInstanceId } from '@mahjong-mcr/engine'

export interface UseDiscardFlowParams {
  onSubmitDiscard: (tile: TileInstanceId) => void
}

export interface UseDiscardFlowResult {
  // Tracks a single-click selection — used for the tile-inspector/highlight
  // ring, not for committing a discard (that's requestDiscardTile below;
  // there's no separate select-then-press-a-button step).
  selectedTileId: TileInstanceId | null
  selectTile: (id: TileInstanceId) => void
  // Select-and-submit in one step — the only way to discard: double-click a
  // hand tile, or drag one onto the discard field.
  requestDiscardTile: (id: TileInstanceId) => void
}

// Selecting a hand tile (for the inspector/highlight) and committing a
// discard stay two separate concerns, even though nothing intercepts the
// commit any more.
//
// The confirm-before-discard setting and its modal were removed on the
// owner's call while cutting the settings count — discarding already
// requires a deliberate double-click or a drag to the river, so a
// confirmation step was belt-and-braces. What went with it: this hook's
// pendingConfirmTileId / confirmDiscard / cancelDiscard, and
// DiscardConfirmModal. If a confirm step is ever wanted again, this is the
// seam it belongs on — both discard triggers already funnel through
// requestDiscardTile.
export function useDiscardFlow({ onSubmitDiscard }: UseDiscardFlowParams): UseDiscardFlowResult {
  const [selectedTileId, setSelectedTileId] = useState<TileInstanceId | null>(null)

  const selectTile = useCallback((id: TileInstanceId) => setSelectedTileId(id), [])

  const requestDiscardTile = useCallback(
    (id: TileInstanceId) => {
      setSelectedTileId(id)
      onSubmitDiscard(id)
      setSelectedTileId(null)
    },
    [onSubmitDiscard],
  )

  return { selectedTileId, selectTile, requestDiscardTile }
}
