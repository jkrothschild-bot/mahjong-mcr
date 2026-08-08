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
  HAND_TILE_WIDTH_FLOOR,
  MELD_BASELINE_OFFSET_PX,
  MELD_SHELF_CLASSES,
  WINNING_TILE_RING_CLASSES,
  discardFieldTileClassName,
  meldBackTileClassName,
  meldTileFaceClassName,
  tileFaceClassName,
  TILE_BOX_PX,
  TILE_FACE_COMPACT_PX,
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
  // At reveal (hand ended), the tile that completed the human's own win —
  // ring-marked so the player can see which tile did it. For a discard win
  // Board.tsx folds the claimed tile into `order` itself (it isn't in the
  // engine hand), so this component needs no other knowledge of the case.
  winningTileId?: TileInstanceId | null
  // Brief presentation-only settle cue for a newly created/promoted meld.
  // The id comes from the appended Action; it never changes the hand.
  recentMeldId?: string
}

const TILE_GAP = 4
// The "visible gap" KICKOFF-phase7-board-rebuild.md specifies between the
// concealed block and the melds that follow it — bigger than the uniform
// intra-row tile gap, same "rhythm" role INTER_GAP plays elsewhere
// (Discards' 6-tile groups, and the removed all-discards view's bands).
const MELD_GAP = 24
const FLOWER_GAP = 16
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
  selected: boolean
  justDrawn: boolean
  winning: boolean
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
  selected,
  justDrawn,
  winning,
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
        title={winning ? 'Winning tile' : undefined}
        className={tileFaceClassName({
          dimmed: isDragging,
          highlighted,
          selected,
          justDrawn,
          extra: winning ? `cursor-grab ${WINNING_TILE_RING_CLASSES}` : 'cursor-grab',
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
  winningTileId,
  recentMeldId,
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
  // Flowers live on their own compact wooden tray. At the eight-flower
  // stress case this preserves the full 18-slot playing-tile row without
  // forcing it below the hand legibility floor.
  const { width: flowerWidth } = TILE_FACE_COMPACT_PX[tileScale]
  const flowerReserve = flowers.length > 0 ? flowers.length * flowerWidth + (flowers.length - 1) * TILE_GAP + FLOWER_GAP : 0
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
  // each their own — the same group-major primitive the discard piles
  // use, reused here per KICKOFF's own instruction rather than hand-rolling
  // a second gap-aware row layout.
  const groups = [...(order.length > 0 ? [order.length] : []), ...melds.map((meld) => meld.tiles.length)]
  const playingRegion = { ...region, width: region.width - flowerReserve }
  const layout = packGroupsMajor(groups, 'horizontal', playingRegion, tileWidth, tileHeight, TILE_GAP, MELD_GAP, TILE_GAP)
  const placed = placeGroup(layout, playingRegion, tileWidth, tileHeight)
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
    : placeGroup(computeRowPositions(1, playingRegion, tileWidth, tileHeight, TILE_GAP), playingRegion, tileWidth, tileHeight)[0]!

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

  // Flowers follow immediately after the playing block, at compact size.
  // They used to anchor to the full row's far-right edge, where the side
  // bot rack can cover them; the width is already reserved above, so there
  // is no reason to leave that large empty gap.
  const { height: flowerHeight } = TILE_FACE_COMPACT_PX[tileScale]
  // Sit the compact flower tray on the same lower baseline as the full-size
  // hand tiles. Centring both made the shorter flowers float noticeably
  // higher on the table.
  const flowerY = region.y + region.height / 2 + (tileHeight * layout.scale - flowerHeight) / 2
  const playingRight = placed.length > 0
    ? Math.max(...placed.map((p) => p.x + (tileWidth * layout.scale) / 2))
    : playingRegion.x
  const flowerPlaced = flowers.map((_, index) => ({
    x: playingRight + FLOWER_GAP + flowerWidth / 2 + index * (flowerWidth + TILE_GAP),
    y: flowerY,
  }))

  const rackBoxes = [
    ...placed.map((p) => ({
      left: p.x - (tileWidth * layout.scale) / 2,
      right: p.x + (tileWidth * layout.scale) / 2,
      top: p.y - (tileHeight * layout.scale) / 2,
      bottom: p.y + (tileHeight * layout.scale) / 2 + meldBaselineOffset * layout.scale,
    })),
    ...flowerPlaced.map((p) => ({
      left: p.x - flowerWidth / 2,
      right: p.x + flowerWidth / 2,
      top: p.y - flowerHeight / 2,
      bottom: p.y + flowerHeight / 2,
    })),
  ]
  const rackPad = 6
  const rackBounds = rackBoxes.length > 0
    ? {
        left: Math.min(...rackBoxes.map((box) => box.left)) - rackPad,
        right: Math.max(...rackBoxes.map((box) => box.right)) + rackPad,
        top: Math.min(...rackBoxes.map((box) => box.top)) - rackPad,
        bottom: Math.max(...rackBoxes.map((box) => box.bottom)) + rackPad,
      }
    : null

  return (
    <>
      {rackBounds && (
        <Positioned
          x={(rackBounds.left + rackBounds.right) / 2}
          y={(rackBounds.top + rackBounds.bottom) / 2}
          naturalWidth={rackBounds.right - rackBounds.left}
          naturalHeight={rackBounds.bottom - rackBounds.top}
        >
          <div
            aria-hidden
            data-testid="human-wooden-rack"
            className="relative h-full w-full overflow-hidden rounded-xl border border-[#351708] shadow-[inset_0_3px_3px_rgba(255,211,145,0.32),inset_0_-7px_8px_rgba(24,8,2,0.68),0_5px_9px_rgba(0,0,0,0.48)]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(7deg,rgba(255,218,155,0.055) 0 1px,transparent 1px 5px),linear-gradient(180deg,#8b4d25 0%,#6b3518 30%,#54250f 67%,#351508 100%)',
            }}
          >
            <div
              data-testid="human-rack-back-lip"
              className="absolute inset-x-0 top-0 h-[9px] border-b border-[#3c1a0a] bg-[linear-gradient(180deg,#b36f3b,#6e3518_70%,#3b1809)] shadow-[0_3px_4px_rgba(0,0,0,0.38),inset_0_1px_rgba(255,226,177,0.45)]"
            />
            <div
              data-testid="human-rack-groove"
              className="absolute inset-x-[5px] bottom-[7px] h-[5px] rounded-full border-t border-black/60 bg-[#291006]/80 shadow-[0_2px_1px_rgba(255,190,110,0.14)]"
            />
            <div
              data-testid="human-rack-front-lip"
              className="absolute inset-x-0 bottom-0 h-[8px] border-t border-[#2a1006] bg-[linear-gradient(180deg,#7d3d1b,#3a1708)] shadow-[inset_0_2px_1px_rgba(255,193,115,0.2),0_-2px_3px_rgba(0,0,0,0.28)]"
            />
          </div>
        </Positioned>
      )}
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
              selected={selectedTileId === id}
              justDrawn={justDrawnTileId === id}
              winning={winningTileId === id}
              tileScale={tileScale}
              onRequestDiscardTile={onRequestDiscardTile}
              onTileClick={onTileClick}
            />
          ))}
          {/* One recessed inset per meld, rendered before its tiles. Separate
              shelves keep adjacent declared sets visually distinct. */}
          {meldRanges.map(({ meld, startIndex }) => {
            const first = meldPlaced[startIndex]!
            const last = meldPlaced[startIndex + meld.tiles.length - 1]!
            const shelfWidth = last.x - first.x + tileWidth + 2 * MELD_SHELF_PAD_X
            const shelfHeight = tileHeight + 2 * MELD_SHELF_PAD_Y
            return (
              <Positioned
                key={`meld-shelf-${meld.id}`}
                x={(first.x + last.x) / 2}
                y={first.y + meldBaselineOffset * layout.scale}
                naturalWidth={shelfWidth}
                naturalHeight={shelfHeight}
                scale={layout.scale}
              >
                <div
                  aria-hidden
                  data-testid={`meld-shelf-${meld.id}`}
                  data-recent-meld={recentMeldId === meld.id || undefined}
                  className={`h-full w-full ${MELD_SHELF_CLASSES} ${
                    recentMeldId === meld.id ? 'ring-2 ring-amber-200 shadow-[0_0_16px_rgba(253,230,138,0.55)]' : ''
                  }`}
                />
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
              const isClaimedTile = meld.exposure === 'exposed' && meld.claimedFrom?.discardTile === id
              const highlighted = selectedTileId === id || highlightedTypeId === typeId
              const recentMeldClasses = recentMeldId === meld.id
                ? 'ring-2 ring-amber-200 shadow-[0_0_14px_rgba(253,230,138,0.5)] transition-[box-shadow]'
                : ''
              return (
                <Positioned key={id} layoutId={String(id)} x={p.x} y={p.y} naturalWidth={tileWidth} naturalHeight={tileHeight} scale={layout.scale}>
                  <div
                    data-tile-id={id}
                    data-testid={`meld-tile-${meld.id}-${tileIndex}`}
                    data-claimed-tile={isClaimedTile || undefined}
                    data-recent-meld={recentMeldId === meld.id || undefined}
                    role="listitem"
                    onClick={onTileClick ? () => onTileClick(id) : undefined}
                    // Item 1: melds sit on a lower baseline than concealed
                    // tiles (held up toward the player vs. laid flat on the
                    // table) — a CSS transform on the tile's own div, so
                    // packGroupsMajor/placeGroup's own x/y math (and the
                    // shelf above, which adds the same offset to its own y)
                    // stays untouched.
                    style={{
                      transform: isClaimedTile
                        ? `translateY(${meldBaselineOffset}px) rotate(90deg) scale(${tileWidth / tileHeight})`
                        : `translateY(${meldBaselineOffset}px)`,
                    }}
                    className={
                      isConcealedKongBack
                        ? meldBackTileClassName({ highlighted, extra: [onTileClick ? 'cursor-pointer' : '', recentMeldClasses].filter(Boolean).join(' '), scale: tileScale })
                        : meldTileFaceClassName({ highlighted, extra: [onTileClick ? 'cursor-pointer' : '', recentMeldClasses].filter(Boolean).join(' '), scale: tileScale })
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
          {flowerPlaced.length > 0 && (() => {
            const left = flowerPlaced[0]!
            const right = flowerPlaced[flowerPlaced.length - 1]!
            return (
              <Positioned
                x={(left.x + right.x) / 2}
                y={flowerY}
                naturalWidth={right.x - left.x + flowerWidth + 8}
                naturalHeight={flowerHeight + 8}
              >
                <div aria-hidden data-testid="flower-shelf-shared" className={`h-full w-full ${MELD_SHELF_CLASSES}`} />
              </Positioned>
            )
          })()}
          {flowers.map((id, index) => {
            const p = flowerPlaced[index]!
            const typeId = typeIdOfInstance(id)
            // Flowers never move between rendered zones after replacement,
            // so they do not need shared-layout identity. Preview mode
            // reuses the eight physical flower ids across four hands;
            // giving those duplicates one layoutId makes Motion merge them
            // and leaves some trays invisible until another render.
            return (
              <Positioned key={id} x={p.x} y={p.y} naturalWidth={flowerWidth} naturalHeight={flowerHeight}>
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
