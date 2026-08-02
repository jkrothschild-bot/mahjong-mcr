import { createPortal } from 'react-dom'
import { DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { typeIdOfInstance, type Meld, type TileInstanceId } from '@mahjong-mcr/engine'
import type { TileScale } from '../settings/useSettings.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { Positioned } from '../stage/Positioned.js'
import { useStageMetrics } from '../stage/StageMetricsContext.js'
import { computeRowPositions, fitRowTileWidth, packGroupsMajor, placeGroup, type Rect } from '../stage/stageLayout.js'
import { TileBackContent } from '../tiles/TileBackContent.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import {
  DISCARD_FIELD_PX,
  HAND_TILE_WIDTH_FLOOR,
  MELD_BASELINE_OFFSET_PX,
  MELD_SHELF_CLASSES,
  discardFieldTileClassName,
  meldBackTileClassName,
  meldTileFaceClassName,
  tileFaceClassName,
  TILE_BOX_PX,
} from '../tiles/tileStyles.js'
import { DISCARD_ZONE_ID, END_ZONE_ID } from './resolveReorderTarget.js'

export interface HandTilesProps {
  order: readonly TileInstanceId[]
  // The stage region (stageLayout.ts's getBoardRegions(designWidth).human.row)
  // this hand is laid out within — only the human seat renders HandTiles,
  // but the region still comes from Board.tsx/Seat.tsx rather than being
  // hardcoded here, same as every other stage object.
  region: Rect
  // Live drag state, lifted to Board.tsx: the DndContext has to be an
  // ancestor of BOTH this hand and DiscardField's drop target (a sibling
  // stage object, not a descendant of this component), so it can no longer
  // live here. `useSortable`/`useDroppable` below still work as descendants
  // of that lifted context; only the state/handlers moved.
  activeId: TileInstanceId | null
  overId: TileInstanceId | typeof END_ZONE_ID | typeof DISCARD_ZONE_ID | null
  // Double-click, or drag onto DiscardField's own drop target (wired at the
  // lifted DndContext in Board.tsx) — the only two ways to submit a discard;
  // onTileClick below only ever selects (for the tile inspector/highlight),
  // it never commits one. Omitted when it isn't the human's turn.
  onRequestDiscardTile?: (id: TileInstanceId) => void
  // Phase 7 (KICKOFF-phase7-board-rebuild.md): revealed melds share this
  // same row, at the same full hand-tile size, to the right of the
  // concealed tiles — "melded + concealed is always 13, so melds occupy
  // slots the hand already had." Never draggable/reorderable (a committed
  // meld isn't player-orderable state), so these bypass dnd-kit entirely.
  melds: readonly Meld[]
  // Flowers fill from the row's own right edge at discard size (67px, NOT
  // full hand-tile size — 18 hand/meld slots plus 8 flowers at 92px would
  // need 2,496px against a 1,768px board). Positioned independently of the
  // hand+meld block's own left-anchored fill; KICKOFF's own "practically
  // unreachable" acknowledgment covers the case where they'd meet.
  flowers: readonly TileInstanceId[]
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
// The "visible gap" KICKOFF-phase7-board-rebuild.md specifies between the
// concealed block and the melds that follow it — bigger than the uniform
// intra-row tile gap, same "rhythm" role INTER_GAP plays elsewhere
// (Discards' 6-tile groups, DiscardOverlay's bands).
const MELD_GAP = 16
// Deliberately much narrower than a real tile — see the end-zone placement
// comment below for why a full tile-width drop slot risks overflowing the
// stage's clipped bounds once a row uses 100% of its region's width.
const END_ZONE_WIDTH = 16
// KICKOFF-phase9-human-melds.md item 2's recessed shelf: a small margin
// beyond the meld's own tile footprint, not a spacious panel — "sized to
// that meld's own tiles." Kept modest deliberately: at `large` tileScale the
// baseline offset (tileStyles.ts's MELD_BASELINE_OFFSET_PX) already spends
// most of HUMAN_ROW_H's real vertical slack (see that constant's own
// comment), so the shelf's own padding can't add much more before the
// meld's lowered, padded footprint reaches the human header band directly
// below the row.
const MELD_SHELF_PAD_X = 4
const MELD_SHELF_PAD_Y = 3

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
  onRequestDiscardTile?: (id: TileInstanceId) => void
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
  onRequestDiscardTile,
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
        onDoubleClick={onRequestDiscardTile ? () => onRequestDiscardTile(id) : undefined}
        // width/height override tileFaceClassName's own Tailwind size
        // classes (inline styles win the specificity fight) — Phase 2.2 step
        // 4's shrink-to-fit (KICKOFF-phase2-2-hand-fit.md) needs the tile's
        // actual rendered CSS box to shrink below its tileScale's nominal
        // Tailwind size on a cramped viewport, and Tailwind's JIT can't
        // generate an arbitrary-value class from a runtime number the way it
        // can from the 3 literal presets in tileStyles.ts. `naturalWidth`/
        // `naturalHeight` are already the fitted (possibly-shrunk) values by
        // the time they reach here — see HandTiles' own comment on
        // fitRowTileWidth. Harmless/idempotent when nothing shrank (equal to
        // the Tailwind class's own size then).
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          touchAction: 'none',
          width: naturalWidth,
          height: naturalHeight,
        }}
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

export function HandTiles({
  order,
  region,
  melds,
  flowers,
  activeId,
  overId,
  onRequestDiscardTile,
  onTileClick,
  selectedTileId,
  highlightedTypeId,
  justDrawnTileId,
}: HandTilesProps) {
  const { tileScale } = useSettingsContext()
  const { scale: stageScale } = useStageMetrics()
  const { width: nominalTileWidth, height: nominalTileHeight } = TILE_BOX_PX[tileScale]
  const meldTileCount = melds.reduce((sum, meld) => sum + meld.tiles.length, 0)
  // Flowers fill from the right at a fixed discard size (see below) — their
  // block width is reserved out of the hand+meld solve's own budget so the
  // two blocks shrink gracefully around each other instead of visually
  // overlapping (KICKOFF-phase7-board-rebuild.md's own "practically
  // unreachable case... handled by floor" only makes sense read this way —
  // the floor is what's supposed to engage, not literal pixel overlap).
  // Deliberately keyed off the ACTUAL current flower count, not the 8-tile
  // worst case: reserving for 8 up front would sink 18 hand/meld slots
  // below HAND_TILE_WIDTH_FLOOR even with zero flowers drawn, which is a
  // strictly worse outcome than the alternative — a small re-shrink of the
  // hand row on the rare turn a 4th+ flower is drawn. Unlike a discard/meld
  // pile (CLAUDE.md's "never reflow" target), flowers are a low-stakes,
  // peripheral count the player isn't tracking shape against.
  const { width: flowerWidth } = DISCARD_FIELD_PX[tileScale]
  const flowerReserve = flowers.length > 0 ? flowers.length * flowerWidth + (flowers.length - 1) * TILE_GAP + MELD_GAP : 0
  // Phase 2.2 step 4: shrink to keep the row on one line down to
  // HAND_TILE_WIDTH_FLOOR, rather than wrapping and letting the group
  // fit-scale shrink the whole multi-row block (Phase 2's "worst outcome
  // available" finding). Deliberately computed from `region.width` directly
  // — see fitRowTileWidth's own comment. Phase 7: the concealed count alone
  // is no longer enough — melds now share this same row and need room too,
  // separated by MELD_GAP rather than the uniform intra-row gap, so that
  // extra width comes off the budget fitRowTileWidth solves against.
  const meldReserve = meldTileCount > 0 ? MELD_GAP - TILE_GAP : 0
  const { width: tileWidth, height: tileHeight } = fitRowTileWidth(
    order.length + meldTileCount,
    region.width - meldReserve - flowerReserve,
    nominalTileWidth,
    nominalTileHeight,
    TILE_GAP,
    HAND_TILE_WIDTH_FLOOR,
  )
  const { setNodeRef: setEndZoneRef } = useDroppable({ id: END_ZONE_ID })

  // Phase 2.2 step 1: the row solver only ever sees real tiles now — the
  // end-zone sentinel used to be laid out as one extra "tile" past the real
  // hand (`order.length + 1`), reusing the row-wrap math so it naturally
  // landed after the last tile. That meant an invisible, purely-virtual
  // slot could force its own phantom row (whenever the real tiles exactly
  // filled every column of a row), inflating computeRowPositions'
  // naturalHeight and shrinking every real tile via the group fit-scale —
  // confirmed live: 14 real tiles fit one row on their own, yet still
  // rendered shrunk because the 15th, invisible sentinel wrapped to a row
  // of its own. Excluding it here is the fix; computeRowPositions' own
  // naturalHeight derivation was also hardened (see that function's own
  // comment) so this bug class can't recur from a future off-by-one.
  // Phase 7: concealed tiles are one atomic group (dnd-kit owns their
  // internal order; packGroupsMajor never reorders within a group), melds
  // each their own — the same group-major primitive Discards/DiscardOverlay
  // use, reused here per KICKOFF's own instruction rather than hand-rolling
  // a second gap-aware row layout.
  const groups = [...(order.length > 0 ? [order.length] : []), ...melds.map((meld) => meld.tiles.length)]
  const layout = packGroupsMajor(groups, 'horizontal', region, tileWidth, tileHeight, TILE_GAP, MELD_GAP, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)
  const concealedPlaced = placed.slice(0, order.length)
  const meldPlaced = placed.slice(order.length)
  const activeTypeId = activeId !== null ? typeIdOfInstance(activeId) : null
  // Each meld's own slice of meldPlaced, computed once and shared by both
  // the shelf block (item 2) and the tile-rendering block below — same
  // startIndex derivation either would otherwise duplicate.
  const meldRanges = melds.map((meld, meldIndex) => ({
    meld,
    startIndex: melds.slice(0, meldIndex).reduce((sum, m) => sum + m.tiles.length, 0),
  }))
  const meldBaselineOffset = MELD_BASELINE_OFFSET_PX[tileScale]

  // The end zone's own rect is derived directly from the last real tile's
  // already-placed position (or, with an empty hand, from where a first
  // tile would land) — not from participating in the row solver at all, per
  // the comment above. It deliberately gets a narrow fixed width
  // (END_ZONE_WIDTH), not a full tile-width slot: a real tile-sized zone
  // sitting immediately after a row that's using 100% of its region's width
  // (the common case once step 4's shrink-to-fit makes the row exactly
  // fill the region) would overflow past the stage's own clipped bounds,
  // making the drop target both invisible and unhittable. A narrow strip
  // stays reachable without needing spare row width reserved for it.
  const lastPlacedTile = order.length > 0 ? concealedPlaced[order.length - 1] : undefined
  const endZonePlaced = lastPlacedTile
    ? { x: lastPlacedTile.x + (tileWidth / 2 + TILE_GAP + END_ZONE_WIDTH / 2) * layout.scale, y: lastPlacedTile.y }
    : placeGroup(computeRowPositions(1, region, tileWidth, tileHeight, TILE_GAP), region, tileWidth, tileHeight)[0]!

  // Where to draw the drop-preview line: immediately before whatever tile
  // (or the trailing end zone) the pointer/keyboard focus is currently
  // over. Deliberately independent of resolveReorderTarget's arrayMove-
  // based final-drop-index math — this is a live "here's what you're
  // pointing at" cue, not a prediction of the exact settled order. Hovering
  // DiscardField's own drop target isn't a reorder at all, so it gets no
  // insertion line — that zone shows its own highlight instead (see
  // DiscardField.tsx).
  const insertionIndex =
    activeId === null || overId === null || overId === activeId || overId === DISCARD_ZONE_ID
      ? null
      : overId === END_ZONE_ID
        ? order.length
        : order.indexOf(overId)
  const insertionPos = insertionIndex === null ? null : insertionIndex === order.length ? endZonePlaced : concealedPlaced[insertionIndex]!

  // Flowers fill from the row's own right edge, at discard size (67px, not
  // the full hand-tile size) — reserved out of the hand+meld block's own
  // budget above (flowerReserve), positioned here at their real edge-
  // anchored spot.
  const { height: flowerHeight } = DISCARD_FIELD_PX[tileScale]
  const flowerY = region.y + region.height / 2
  const flowerPlaced = flowers.map((_, index) => ({
    x: region.x + region.width - flowerWidth / 2 - index * (flowerWidth + TILE_GAP),
    y: flowerY,
  }))

  return (
    <>
      <SortableContext items={[...order]} strategy={rectSortingStrategy}>
        <div role="list" aria-label="Your hand">
          {order.map((id, index) => (
            <SortableHandTile
              key={id}
              id={id}
              x={concealedPlaced[index]!.x}
              y={concealedPlaced[index]!.y}
              naturalWidth={tileWidth}
              naturalHeight={tileHeight}
              scale={layout.scale}
              highlighted={selectedTileId === id || highlightedTypeId === typeIdOfInstance(id)}
              justDrawn={justDrawnTileId === id}
              tileScale={tileScale}
              onRequestDiscardTile={onRequestDiscardTile}
              onTileClick={onTileClick}
            />
          ))}
          {/* KICKOFF-phase9-human-melds.md item 2: one recessed shelf per
              meld, rendered BEFORE (i.e. behind, in DOM order — these are
              absolutely positioned siblings with no z-index) that meld's own
              tiles below. Background only: naturalWidth/naturalHeight are
              derived from tileWidth/tileHeight/TILE_GAP (the row solve's own
              numbers) plus a small fixed pad, never fed back into the solve
              itself. */}
          {meldRanges.map(({ meld, startIndex }) => {
            const first = meldPlaced[startIndex]!
            const last = meldPlaced[startIndex + meld.tiles.length - 1]!
            const shelfWidth = meld.tiles.length * tileWidth + (meld.tiles.length - 1) * TILE_GAP + 2 * MELD_SHELF_PAD_X
            const shelfHeight = tileHeight + 2 * MELD_SHELF_PAD_Y
            return (
              <Positioned
                key={`${meld.id}-shelf`}
                x={(first.x + last.x) / 2}
                y={first.y + meldBaselineOffset * layout.scale}
                naturalWidth={shelfWidth}
                naturalHeight={shelfHeight}
                scale={layout.scale}
              >
                <div aria-hidden data-testid={`meld-shelf-${meld.id}`} className={`h-full w-full ${MELD_SHELF_CLASSES}`} />
              </Positioned>
            )
          })}
          {meldRanges.flatMap(({ meld, startIndex }) =>
            meld.tiles.map((id, tileIndex) => {
              const p = meldPlaced[startIndex + tileIndex]!
              const typeId = typeIdOfInstance(id)
              // Item 4: a concealed kong's outer two tiles (index 0 and 3;
              // 1 and 2 are the original pung, always face-up) render
              // back-side — the SAME tile object/id, just different
              // content, per CLAUDE.md's stable-id rule. Not an information
              // leak: a kong is always 4 identical tiles, so the meld's own
              // other 2 (always face-up) already reveal the type — the tile
              // inspector/highlighting below stay fully wired regardless.
              const isConcealedKongBack = meld.kongSource === 'concealed' && (tileIndex === 0 || tileIndex === 3)
              const highlighted = selectedTileId === id || highlightedTypeId === typeId
              return (
                <Positioned key={id} layoutId={String(id)} x={p.x} y={p.y} naturalWidth={tileWidth} naturalHeight={tileHeight} scale={layout.scale}>
                  <div
                    data-tile-id={id}
                    data-testid={`meld-tile-${meld.id}-${tileIndex}`}
                    role="listitem"
                    onClick={onTileClick ? () => onTileClick(id) : undefined}
                    // Item 1: melds sit on a lower baseline than concealed
                    // tiles (held up toward the player vs. laid flat on the
                    // table) — a CSS transform on the tile's own div, so
                    // packGroupsMajor/placeGroup's own x/y math (and the
                    // shelf above, which adds the same offset to its own y)
                    // stays untouched.
                    style={{ transform: `translateY(${meldBaselineOffset}px)` }}
                    className={
                      isConcealedKongBack
                        ? meldBackTileClassName({ highlighted, extra: onTileClick ? 'cursor-pointer' : undefined, scale: tileScale })
                        : meldTileFaceClassName({ highlighted, extra: onTileClick ? 'cursor-pointer' : undefined, scale: tileScale })
                    }
                  >
                    {isConcealedKongBack ? <TileBackContent /> : <TileFaceContent typeId={typeId} />}
                  </div>
                </Positioned>
              )
            }),
          )}
          <Positioned
            x={endZonePlaced.x}
            y={endZonePlaced.y}
            naturalWidth={END_ZONE_WIDTH}
            naturalHeight={tileHeight}
            scale={layout.scale}
          >
            <div ref={setEndZoneRef} data-testid="hand-end-zone" className="h-full w-full" aria-hidden />
          </Positioned>
          {insertionPos !== null && (
            <div
              aria-hidden
              data-testid="hand-drop-indicator"
              className="pointer-events-none absolute rounded-full bg-sky-400"
              style={{
                // Always offset by a full tile-width, even when the target
                // is the end zone — the indicator represents "a new
                // tile-sized slot starts here," not the end zone's own
                // (deliberately much narrower) hit-target width.
                left: insertionPos.x - (tileWidth * layout.scale) / 2 - (TILE_GAP * layout.scale) / 2,
                top: insertionPos.y - (tileHeight * layout.scale) / 2,
                width: 3,
                height: tileHeight * layout.scale,
              }}
            />
          )}
          {flowers.map((id, index) => {
            const p = flowerPlaced[index]!
            const typeId = typeIdOfInstance(id)
            return (
              <Positioned key={id} layoutId={String(id)} x={p.x} y={p.y} naturalWidth={flowerWidth} naturalHeight={flowerHeight}>
                <div
                  data-tile-id={id}
                  data-testid={`flower-tile-${id}`}
                  role="listitem"
                  onClick={onTileClick ? () => onTileClick(id) : undefined}
                  className={discardFieldTileClassName({
                    highlighted: highlightedTypeId === typeId,
                    extra: onTileClick ? 'cursor-pointer' : undefined,
                    scale: tileScale,
                  })}
                >
                  <TileFaceContent typeId={typeId} />
                </div>
              </Positioned>
            )
          })}
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
          renders at the same apparent size as its on-stage sibling — now
          also folding in the hand's own shrink-to-fit ratio (tileWidth /
          nominalTileWidth, step 4): the overlay renders at
          tileFaceClassName's NOMINAL Tailwind size (it has no access to a
          per-tile inline override the way the real on-stage tile does), so
          without this factor a shrunk hand would drag a bigger-than-real
          ghost tile. */}
      {createPortal(
        <DragOverlay>
          {activeTypeId !== null ? (
            <div
              style={{
                transform: `scale(${stageScale * layout.scale * (tileWidth / nominalTileWidth)})`,
                transformOrigin: 'center',
              }}
              className={tileFaceClassName({ scale: tileScale, extra: 'shadow-xl cursor-grabbing' })}
            >
              <TileFaceContent typeId={activeTypeId} />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </>
  )
}
