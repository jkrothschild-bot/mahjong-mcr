import { useCallback, useEffect, useRef, useState } from 'react'
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
// into `order` whenever it changes within a hand (a draw/discard): survivors
// keep their existing position, new tiles are appended.
//
// `handNumber` (GameState.handNumber) marks a hand boundary specifically —
// when it changes, this is a fresh deal, not a draw/discard, so the display
// order resets to a fresh suit-sort rather than reconciling against the
// previous hand's (unrelated) tile set. Suit is the sensible one-time
// default for a freshly dealt hand; the player's own sort/drag choices
// still take over from there and survive every subsequent draw/discard.
export function useHandOrder(engineTiles: readonly TileInstanceId[], handNumber: number): UseHandOrderResult {
  const [order, setOrder] = useState<TileInstanceId[]>(() => sortByMode(engineTiles, 'suit'))
  const lastHandNumber = useRef(handNumber)

  useEffect(() => {
    if (handNumber !== lastHandNumber.current) {
      lastHandNumber.current = handNumber
      setOrder(sortByMode(engineTiles, 'suit'))
      return
    }
    setOrder((prev) => reconcileOrder(prev, engineTiles))
  }, [engineTiles, handNumber])

  const sort = useCallback((mode: SortMode) => {
    setOrder((prev) => sortByMode(prev, mode))
  }, [])

  const reorder = useCallback((draggedId: TileInstanceId, beforeId: TileInstanceId | null) => {
    setOrder((prev) => moveTileBefore(prev, draggedId, beforeId))
  }, [])

  return { order, sort, reorder }
}
