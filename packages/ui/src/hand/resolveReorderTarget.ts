import { arrayMove } from '@dnd-kit/sortable'
import type { TileInstanceId } from '@mahjong-mcr/engine'

// Sentinel id for the trailing drop zone past the last real tile — shared
// between HandTiles' useDroppable wiring and this module so "drop at the
// end" has exactly one meaning across both.
export const END_ZONE_ID = '__end__'

// Translates a dnd-kit drag-end event (active/over ids, index-based) into
// the vocabulary useHandOrder's existing, already-tested `reorder` callback
// expects: "move draggedId to sit immediately before beforeId" (or at the
// end, if beforeId is null). Keeping this translation in one small pure
// function — rather than reaching into handOrder.ts's moveTileBefore
// directly from dnd-kit's callback — means moveTileBefore stays the single
// source of truth for the actual reorder, and this function is trivially
// unit-testable without rendering anything.
//
// Returns undefined when there's nothing to do: dropped on itself, or
// either id isn't present in `order` (shouldn't happen in practice, but a
// stale drag-end firing after the hand changed underneath it is possible).
export function resolveReorderTarget(
  order: readonly TileInstanceId[],
  activeId: TileInstanceId,
  overId: TileInstanceId | typeof END_ZONE_ID,
): TileInstanceId | null | undefined {
  if (overId === activeId) return undefined
  if (overId === END_ZONE_ID) return null

  const oldIndex = order.indexOf(activeId)
  const overIndex = order.indexOf(overId)
  if (oldIndex === -1 || overIndex === -1) return undefined

  const newOrder = arrayMove([...order], oldIndex, overIndex)
  const newIndex = newOrder.indexOf(activeId)
  return newIndex + 1 < newOrder.length ? newOrder[newIndex + 1]! : null
}
