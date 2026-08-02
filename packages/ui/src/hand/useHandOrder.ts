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
// `dealKey` marks a hand boundary specifically — when it changes, this is a
// fresh deal, not a draw/discard, so the display order resets to a fresh
// suit-sort rather than reconciling against the previous hand's (unrelated)
// tile set. Suit is the sensible one-time default for a freshly dealt hand;
// the player's own sort/drag choices still take over from there and survive
// every subsequent draw/discard.
//
// Callers must pass GameState.seed here, NOT GameState.handNumber:
// handNumber resets to 1 at the start of every match, including a match
// begun via the Restart button — restarting while still on hand 1 would
// leave lastHandNumber unchanged (1 === 1), so the fresh deal would
// silently take the reconcile path instead of resetting, appending its
// tiles in raw deal order rather than defaulting to suit-sorted (caught
// live: this exact bug). seed is derived fresh per hand from the match's
// own (also freshly randomized on Restart) matchSeed, so it never repeats
// across a reset the way handNumber can.
export function useHandOrder(engineTiles: readonly TileInstanceId[], dealKey: number): UseHandOrderResult {
  const [order, setOrder] = useState<TileInstanceId[]>(() => sortByMode(engineTiles, 'suit'))
  const lastDealKey = useRef(dealKey)

  useEffect(() => {
    if (dealKey !== lastDealKey.current) {
      lastDealKey.current = dealKey
      setOrder(sortByMode(engineTiles, 'suit'))
      return
    }
    setOrder((prev) => reconcileOrder(prev, engineTiles))
  }, [engineTiles, dealKey])

  const sort = useCallback((mode: SortMode) => {
    setOrder((prev) => sortByMode(prev, mode))
  }, [])

  const reorder = useCallback((draggedId: TileInstanceId, beforeId: TileInstanceId | null) => {
    setOrder((prev) => moveTileBefore(prev, draggedId, beforeId))
  }, [])

  return { order, sort, reorder }
}
