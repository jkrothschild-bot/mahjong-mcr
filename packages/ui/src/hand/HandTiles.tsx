import { useState, type PointerEvent } from 'react'
import { typeIdOfInstance, type TileInstanceId } from '@mahjong-mcr/engine'
import { Positioned } from '../stage/Positioned.js'
import { computeRowPositions, placeGroup, type Rect } from '../stage/stageLayout.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceClassName, TILE_BOX_PX } from '../tiles/tileStyles.js'

export interface HandTilesProps {
  order: readonly TileInstanceId[]
  onReorder: (draggedId: TileInstanceId, beforeId: TileInstanceId | null) => void
  // The stage region (stageLayout.ts's SEAT_REGIONS[offset].hand) this hand
  // is laid out within — only the human seat renders HandTiles, but the
  // region still comes from Board.tsx/Seat.tsx rather than being hardcoded
  // here, same as every other stage object.
  region: Rect
  // Optional: a plain tap/click (as opposed to a drag with real pointer
  // movement, which browsers don't synthesize a click event for) selects a
  // tile — used by the discard flow, independent of reordering.
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

const END_ZONE_ID = '__end__'
const TILE_GAP = 4

function resolveDropTarget(clientX: number, clientY: number): TileInstanceId | null | undefined {
  const el = document.elementFromPoint(clientX, clientY)
  const tileEl = el instanceof Element ? el.closest('[data-tile-id]') : null
  if (!tileEl) return undefined // not over a valid drop target at all
  const raw = tileEl.getAttribute('data-tile-id')
  if (raw === END_ZONE_ID) return null
  return raw === null ? undefined : Number(raw)
}

// Pointer-events-based drag, deliberately not native HTML5 drag-and-drop:
// native DnD has unreliable/absent touch support on iOS Safari, and
// SPEC.md §2 requires this to work on iPad. Pointer events + pointer
// capture work correctly for mouse and touch alike. No live drag animation
// (out of scope for this pass, see CLAUDE.md/PLAN.md) — the tile snaps into
// its new position on release; sorting and drag both funnel through the
// same onReorder/order state (useHandOrder), so there's one place hand
// position changes happen, matching CLAUDE.md's zone-movement rule.
//
// This mechanism is screen-coordinate-based (document.elementFromPoint),
// so it survives M8 Step 1's move to stage-absolute positioning unchanged —
// elementFromPoint resolves in real viewport space regardless of the
// stage's CSS scale transform. Step 4 (dnd-kit) is what eventually replaces
// this whole approach with a sensor + collision-detection model.
export function HandTiles({ order, onReorder, region, onTileClick, selectedTileId, highlightedTypeId, justDrawnTileId }: HandTilesProps) {
  const { tileScale } = useSettingsContext()
  const [draggingId, setDraggingId] = useState<TileInstanceId | null>(null)
  const { width: tileWidth, height: tileHeight } = TILE_BOX_PX[tileScale]

  function handlePointerDown(e: PointerEvent<HTMLDivElement>, id: TileInstanceId) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDraggingId(id)
  }

  function endDrag(e: PointerEvent<HTMLDivElement>, draggedId: TileInstanceId, commit: boolean) {
    if (commit) {
      const target = resolveDropTarget(e.clientX, e.clientY)
      if (target !== undefined && target !== draggedId) {
        onReorder(draggedId, target)
      }
    }
    setDraggingId(null)
  }

  // The end-zone sentinel is laid out as one extra "tile" past the real
  // hand — reuses the exact same row-wrapping math so it naturally lands
  // after the last real tile (wrapping to a new row if that's where the
  // last tile landed) instead of needing special-cased positioning.
  const layout = computeRowPositions(order.length + 1, region, tileWidth, tileHeight, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)

  return (
    <div role="list" aria-label="Your hand">
      {order.map((id, index) => (
        <Positioned
          key={id}
          x={placed[index]!.x}
          y={placed[index]!.y}
          naturalWidth={tileWidth}
          naturalHeight={tileHeight}
          scale={layout.scale}
        >
          <div
            data-tile-id={id}
            data-testid={`hand-tile-${id}`}
            role="listitem"
            onPointerDown={(e) => handlePointerDown(e, id)}
            onPointerUp={(e) => endDrag(e, id, true)}
            onPointerCancel={(e) => endDrag(e, id, false)}
            onClick={onTileClick ? () => onTileClick(id) : undefined}
            style={{ touchAction: 'none' }}
            className={tileFaceClassName({
              dimmed: draggingId === id,
              highlighted: selectedTileId === id || highlightedTypeId === typeIdOfInstance(id),
              justDrawn: justDrawnTileId === id,
              extra: 'cursor-grab',
              scale: tileScale,
            })}
          >
            <TileFaceContent typeId={typeIdOfInstance(id)} />
          </div>
        </Positioned>
      ))}
      <Positioned
        x={placed[order.length]!.x}
        y={placed[order.length]!.y}
        naturalWidth={tileWidth}
        naturalHeight={tileHeight}
        scale={layout.scale}
      >
        <div data-tile-id={END_ZONE_ID} data-testid="hand-end-zone" className="h-full w-full" aria-hidden />
      </Positioned>
    </div>
  )
}
