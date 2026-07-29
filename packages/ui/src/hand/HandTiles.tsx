import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import type { TileScale } from '../settings/useSettings.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { Positioned } from '../stage/Positioned.js'
import { useStageScale } from '../stage/StageScaleContext.js'
import { computeRowPositions, placeGroup, type Rect } from '../stage/stageLayout.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceClassName, TILE_BOX_PX } from '../tiles/tileStyles.js'
import { END_ZONE_ID, resolveReorderTarget } from './resolveReorderTarget.js'

export interface HandTilesProps {
  order: readonly TileInstanceId[]
  onReorder: (draggedId: TileInstanceId, beforeId: TileInstanceId | null) => void
  // The stage region (stageLayout.ts's SEAT_REGIONS[offset].hand) this hand
  // is laid out within — only the human seat renders HandTiles, but the
  // region still comes from Board.tsx/Seat.tsx rather than being hardcoded
  // here, same as every other stage object.
  region: Rect
  // Optional: a plain tap/click (as opposed to a drag past dnd-kit's
  // activation distance) selects a tile — used by the discard flow,
  // independent of reordering.
  onTileClick?: (id: TileInstanceId) => void
  selectedTileId?: TileInstanceId | null
  // Tile inspector (SPEC.md §5): highlights every tile sharing this TYPE,
  // independent of selectedTileId's exact-instance discard selection —
  // clicking a discard/meld tile elsewhere on the board can highlight a
  // matching tile here without it being "selected for discard."
  highlightedTypeId?: string
  // The tile most recently drawn this turn (GameState.lastDrawnTile) — its
  // display position depends on sort/drag state and isn't otherwise
  // distinguishable from the rest of the hand once it lands, so it gets its
  // own marker independent of selection/highlighting.
  justDrawnTileId?: TileInstanceId | null
}

const TILE_GAP = 4

interface SortableHandTileProps {
  id: TileInstanceId
  x: number
  y: number
  naturalWidth: number
  naturalHeight: number
  scale: number
  highlighted: boolean
  justDrawn: boolean
  tileScale: TileScale
  onTileClick?: (id: TileInstanceId) => void
}

// One sortable tile. `useSortable` can only be called from its own
// component (rules of hooks — the parent maps over `order` and can't call
// a hook per iteration itself). `Positioned` keeps sole ownership of stage
// placement and the layoutId-based settle animation (M8 Step 3), untouched;
// dnd-kit's own live drag-preview transform lands on the same inner div the
// old pointer handlers used to sit on — that div has never carried a
// Framer-owned transform (Positioned's motion.div is what owns that), so
// the two systems don't fight over the property.
function SortableHandTile({
  id,
  x,
  y,
  naturalWidth,
  naturalHeight,
  scale,
  highlighted,
  justDrawn,
  tileScale,
  onTileClick,
}: SortableHandTileProps) {
  const { setNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id })

  return (
    <Positioned layoutId={String(id)} x={x} y={y} naturalWidth={naturalWidth} naturalHeight={naturalHeight} scale={scale}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        role="listitem" // after {...attributes}: keeps list/listitem semantics rather than dnd-kit's default role="button"
        data-tile-id={id}
        data-testid={`hand-tile-${id}`}
        onClick={onTileClick ? () => onTileClick(id) : undefined}
        style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'none' }}
        className={tileFaceClassName({
          dimmed: isDragging,
          highlighted,
          justDrawn,
          extra: 'cursor-grab',
          scale: tileScale,
        })}
      >
        <TileFaceContent typeId={typeIdOfInstance(id)} />
      </div>
    </Positioned>
  )
}

export function HandTiles({ order, onReorder, region, onTileClick, selectedTileId, highlightedTypeId, justDrawnTileId }: HandTilesProps) {
  const { tileScale } = useSettingsContext()
  const stageScale = useStageScale()
  const [activeId, setActiveId] = useState<TileInstanceId | null>(null)
  const { width: tileWidth, height: tileHeight } = TILE_BOX_PX[tileScale]
  const sensors = useSensors(
    // 8px of real pointer movement before a drag activates — lets a plain
    // tap still reach onTileClick (discard selection) instead of being
    // swallowed as a drag start, replacing what real-pointer-movement-vs-
    // click gave the old elementFromPoint mechanism for free.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Real keyboard operability, new in this step: Tab to a tile, Space to
    // pick up, arrow keys to move, Space to drop.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const { setNodeRef: setEndZoneRef } = useDroppable({ id: END_ZONE_ID })

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as TileInstanceId)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const overId = over.id === END_ZONE_ID ? END_ZONE_ID : (over.id as TileInstanceId)
    const beforeId = resolveReorderTarget(order, active.id as TileInstanceId, overId)
    if (beforeId !== undefined) onReorder(active.id as TileInstanceId, beforeId)
  }

  // The end-zone sentinel is laid out as one extra "tile" past the real
  // hand — reuses the exact same row-wrapping math so it naturally lands
  // after the last real tile (wrapping to a new row if that's where the
  // last tile landed) instead of needing special-cased positioning.
  const layout = computeRowPositions(order.length + 1, region, tileWidth, tileHeight, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)
  const activeTypeId = activeId !== null ? typeIdOfInstance(activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <SortableContext items={[...order]} strategy={rectSortingStrategy}>
        <div role="list" aria-label="Your hand">
          {order.map((id, index) => (
            <SortableHandTile
              key={id}
              id={id}
              x={placed[index]!.x}
              y={placed[index]!.y}
              naturalWidth={tileWidth}
              naturalHeight={tileHeight}
              scale={layout.scale}
              highlighted={selectedTileId === id || highlightedTypeId === typeIdOfInstance(id)}
              justDrawn={justDrawnTileId === id}
              tileScale={tileScale}
              onTileClick={onTileClick}
            />
          ))}
          <Positioned
            x={placed[order.length]!.x}
            y={placed[order.length]!.y}
            naturalWidth={tileWidth}
            naturalHeight={tileHeight}
            scale={layout.scale}
          >
            <div ref={setEndZoneRef} data-testid="hand-end-zone" className="h-full w-full" aria-hidden />
          </Positioned>
        </div>
      </SortableContext>
      {/* Portals to document.body, outside GameStage's scaled container, so
          a dragged tile can visually escape the stage's overflow-hidden
          clip — counter-scale by the stage's own current zoom (plus the
          hand group's own fit-to-region scale) so it doesn't jump to a
          different apparent size than its on-stage sibling the instant a
          drag starts. */}
      <DragOverlay>
        {activeTypeId !== null ? (
          <div
            style={{ transform: `scale(${stageScale * layout.scale})`, transformOrigin: 'center' }}
            className={tileFaceClassName({ scale: tileScale, extra: 'shadow-xl cursor-grabbing' })}
          >
            <TileFaceContent typeId={activeTypeId} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
