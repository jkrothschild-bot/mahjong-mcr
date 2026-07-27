import { isHonorTypeId, parseSuited, typeIdOfInstance, type TileInstanceId, type TileTypeId } from '@mahjong-mcr/engine'

export type SortMode = 'suit' | 'number' | 'honors' | 'simples' | 'odds' | 'evens'

// Reconciles a player-controlled display order against the engine's current
// concealed-tile set: survivors keep their existing relative display order
// untouched; tiles newly present in engineTiles (a future draw) are appended
// in engineTiles' own order; tiles no longer present (a future discard) are
// dropped. A plain set-diff is safe here — TileInstanceId is a unique
// physical tile (0-143), never duplicated within one hand — so no multiset
// bookkeeping is needed. Idempotent, and this is the one seam a future
// draw/discard animation would key off (per CLAUDE.md's "keep zone-to-zone
// movement in one place").
export function reconcileOrder(
  displayOrder: readonly TileInstanceId[],
  engineTiles: readonly TileInstanceId[],
): TileInstanceId[] {
  const engineSet = new Set(engineTiles)
  const survivors = displayOrder.filter((id) => engineSet.has(id))
  const displaySet = new Set(displayOrder)
  const appended = engineTiles.filter((id) => !displaySet.has(id))
  return [...survivors, ...appended]
}

const SUIT_INDEX: Record<'C' | 'D' | 'B', number> = { C: 0, D: 1, B: 2 }

// Winds before dragons, matching the order already used in the approved
// docs/Mockups/mahjong-seated-table-prototype-v8.html sort-toolbar prototype.
const HONOR_RANK: Record<string, number> = { WE: 1, WS: 2, WW: 3, WN: 4, DR: 5, DG: 6, DW: 7 }

interface KeyInfo {
  isHonor: boolean
  suitIndex: number
  rank: number
}

function keyInfo(typeId: TileTypeId): KeyInfo {
  const parsed = parseSuited(typeId)
  if (parsed) {
    return { isHonor: false, suitIndex: SUIT_INDEX[parsed.suit], rank: parsed.rank }
  }
  if (!isHonorTypeId(typeId)) {
    throw new Error(`Unrecognized tile type id: ${typeId}`)
  }
  return { isHonor: true, suitIndex: 3, rank: HONOR_RANK[typeId] ?? 9 }
}

// Exposed directly so the 6 comparator definitions are testable without
// going through a full sort. Returns a tuple compared lexicographically.
export function sortKey(mode: SortMode, typeId: TileTypeId): readonly number[] {
  const { isHonor, suitIndex, rank } = keyInfo(typeId)
  switch (mode) {
    case 'suit':
      return [suitIndex, rank]
    case 'number':
      return [isHonor ? rank + 9 : rank, suitIndex]
    case 'honors':
      return [isHonor ? 0 : 1, suitIndex, rank]
    case 'simples':
      return [isHonor ? 2 : rank >= 2 && rank <= 8 ? 0 : 1, suitIndex, rank]
    case 'odds':
      return [isHonor ? 2 : rank % 2 === 1 ? 0 : 1, suitIndex, rank]
    case 'evens':
      return [isHonor ? 2 : rank % 2 === 0 ? 0 : 1, suitIndex, rank]
  }
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!
    if (diff !== 0) return diff
  }
  return 0
}

// Pure — returns a new array, never mutates `order`. Array.prototype.sort's
// stability (guaranteed since ES2019) means duplicate tile types keep their
// prior relative order for free: no manual tiebreak needed, and re-sorting
// by the same mode twice in a row is a no-op.
export function sortByMode(order: readonly TileInstanceId[], mode: SortMode): TileInstanceId[] {
  return order
    .slice()
    .sort((a, b) => compareKeys(sortKey(mode, typeIdOfInstance(a)), sortKey(mode, typeIdOfInstance(b))))
}

// Removes draggedId and reinserts it immediately before beforeId (or at the
// end if beforeId is null). No-op (returns the same values, a new array
// preserving order) if draggedId === beforeId or draggedId isn't present.
export function moveTileBefore(
  order: readonly TileInstanceId[],
  draggedId: TileInstanceId,
  beforeId: TileInstanceId | null,
): TileInstanceId[] {
  if (draggedId === beforeId) return order.slice()
  if (!order.includes(draggedId)) return order.slice()
  const withoutDragged = order.filter((id) => id !== draggedId)
  if (beforeId === null) return [...withoutDragged, draggedId]
  const insertAt = withoutDragged.indexOf(beforeId)
  if (insertAt === -1) return order.slice()
  return [...withoutDragged.slice(0, insertAt), draggedId, ...withoutDragged.slice(insertAt)]
}
