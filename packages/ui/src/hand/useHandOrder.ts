import { useCallback, useEffect, useState } from 'react'
import type { TileInstanceId } from '@mahjong-mcr/engine'
import { moveTileBefore, reconcileOrder, sortByMode, type SortMode } from './handOrder.js'

export interface UseHandOrderResult {
  order: readonly TileInstanceId[]
  sort: (mode: SortMode) => void
  reorder: (draggedId: TileInstanceId, beforeId: TileInstanceId | null) => void
}

// Owns the player-controlled display order for a hand — the engine's own
// concealedTiles array is never treated as authoritative for display order
// (CLAUDE.md: "never auto-sort in game logic"). `engineTiles` reconciles
// into `order` whenever it changes (a no-op today, since there's no live
// turn loop yet and engineTiles never actually changes reference — this is
// the pre-built seam for when draws/discards start flowing through).
export function useHandOrder(engineTiles: readonly TileInstanceId[]): UseHandOrderResult {
  const [order, setOrder] = useState<TileInstanceId[]>(() => [...engineTiles])

  useEffect(() => {
    setOrder((prev) => reconcileOrder(prev, engineTiles))
  }, [engineTiles])

  const sort = useCallback((mode: SortMode) => {
    setOrder((prev) => sortByMode(prev, mode))
  }, [])

  const reorder = useCallback((draggedId: TileInstanceId, beforeId: TileInstanceId | null) => {
    setOrder((prev) => moveTileBefore(prev, draggedId, beforeId))
  }, [])

  return { order, sort, reorder }
}
