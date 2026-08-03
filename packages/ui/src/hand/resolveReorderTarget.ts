import { arrayMove } from '@dnd-kit/sortable'
import type { TileInstanceId } from '@mahjong-mcr/engine'

// Sentinel id for the trailing drop zone past the last real tile — shared
// between HandTiles' useDroppable wiring and this module so "drop at the
// end" has exactly one meaning across both.
export const END_ZONE_ID = '__end__'

// Sentinel id for the discard drop target — DiscardField's own full shared
// field (every zone combined, not just "your" own pile: dropping a hand
// tile anywhere within the wall ring's boundary submits a discard instead
// of reordering the hand). Lives alongside END_ZONE_ID rather than in
// board/DiscardField.tsx because both are "what does dnd-kit's `over.id`
// mean" vocabulary the lifted DndContext (Board.tsx) needs to distinguish,
// the same role END_ZONE_ID already plays for the reorder case.
export const DISCARD_ZONE_ID = '__discard__'

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

export type DragEndAction =
  | { type: 'discard'; id: TileInstanceId }
  | { type: 'reorder'; draggedId: TileInstanceId; beforeId: TileInstanceId | null }
  | { type: 'none' }

// Board.tsx's own dnd-kit onDragEnd, reduced to a pure decision — a hand
// tile dropped on DiscardField's own zone discards it; dropped on a
// reorder target, it reorders (via resolveReorderTarget above); anything
// else is a no-op (dropped on itself, or off any droppable). Board.tsx's
// job is then only to route this result to the right callback
// (onRequestDiscardTile / reorder), not to make the decision itself — kept
// here, not inline in Board.tsx, for the same reason resolveReorderTarget
// is: trivially unit-testable without a real drag gesture, which jsdom
// can't produce meaningful bounding boxes for anyway.
export function resolveDragEndAction(
  order: readonly TileInstanceId[],
  activeId: TileInstanceId,
  overId: TileInstanceId | typeof END_ZONE_ID | typeof DISCARD_ZONE_ID,
): DragEndAction {
  if (overId === DISCARD_ZONE_ID) return { type: 'discard', id: activeId }
  const beforeId = resolveReorderTarget(order, activeId, overId)
  return beforeId === undefined ? { type: 'none' } : { type: 'reorder', draggedId: activeId, beforeId }
}
