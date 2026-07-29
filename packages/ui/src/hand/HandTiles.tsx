import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
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
  const [overId, setOverId] = useState<TileInstanceId | typeof END_ZONE_ID | null>(null)
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

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? (event.over.id === END_ZONE_ID ? END_ZONE_ID : (event.over.id as TileInstanceId)) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
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

  // Where to draw the drop-preview line: immediately before whatever tile
  // (or the trailing end zone) the pointer/keyboard focus is currently
  // over. `order.length` (the end-zone's own slot in `placed`, reusing the
  // exact same row-wrap slot the sentinel already occupies) means "at the
  // very end." Deliberately independent of resolveReorderTarget's
  // arrayMove-based final-drop-index math — this is a live "here's what
  // you're pointing at" cue, not a prediction of the exact settled order.
  const insertionIndex =
    activeId === null || overId === null || overId === activeId
      ? null
      : overId === END_ZONE_ID
        ? order.length
        : order.indexOf(overId)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setOverId(null)
      }}
    >
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
          {insertionIndex !== null && (
            <div
              aria-hidden
              data-testid="hand-drop-indicator"
              className="pointer-events-none absolute rounded-full bg-sky-400"
              style={{
                left: placed[insertionIndex]!.x - (tileWidth * layout.scale) / 2 - (TILE_GAP * layout.scale) / 2,
                top: placed[insertionIndex]!.y - (tileHeight * layout.scale) / 2,
                width: 3,
                height: tileHeight * layout.scale,
              }}
            />
          )}
        </div>
      </SortableContext>
      {/* DragOverlay renders position:fixed *in place* in the React tree
          (dnd-kit v6 doesn't portal it itself) — left as a direct
          descendant of GameStage's scaled `transform` container, a CSS
          `transform` on an ancestor redefines the containing block for
          `position: fixed` descendants, so the overlay would be
          repositioned AND rescaled by GameStage's own zoom instead of
          tracking the real cursor (confirmed live: the dragged tile
          visibly flew to the wrong place). Portaling here, to
          document.body, gives it a real, untransformed containing block —
          React context (useDndContext) still flows through a portal
          regardless of DOM placement, so DragOverlay keeps working
          correctly. Counter-scale the content by the stage's own current
          zoom (plus the hand group's own fit-to-region scale) so it still
          renders at the same apparent size as its on-stage sibling. */}
      {createPortal(
        <DragOverlay>
          {activeTypeId !== null ? (
            <div
              style={{ transform: `scale(${stageScale * layout.scale})`, transformOrigin: 'center' }}
              className={tileFaceClassName({ scale: tileScale, extra: 'shadow-xl cursor-grabbing' })}
            >
              <TileFaceContent typeId={activeTypeId} />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
