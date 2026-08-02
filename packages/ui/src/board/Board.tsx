import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import type { GameState, MatchState, Seat as SeatId, TileTypeId } from '@mahjong-mcr/engine'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { DISCARD_ZONE_ID, END_ZONE_ID, resolveDragEndAction } from '../hand/resolveReorderTarget.js'
import { useHandOrder } from '../hand/useHandOrder.js'
import { GameStage } from '../stage/GameStage.js'
import type { SeatRole } from '../stage/stageLayout.js'
import { CallOutToast } from '../game/CallOutToast.js'
import { DiscardField } from './DiscardField.js'
import { HudBar } from './HudBar.js'
import { Seat } from './Seat.js'
import { TableSurface } from './TableSurface.js'
import { TileInspector } from './TileInspector.js'
import { computeUnseenCounts } from './unseenCounts.js'
import { WallCounter } from './WallCounter.js'
import { WallRing } from './WallRing.js'
import { WindIndicator } from './WindIndicator.js'

export interface BoardProps {
  state: GameState
  matchState: MatchState
  matchScores: Record<SeatId, number>
  isHumanTurn: boolean
  selectedTileId: number | null
  onTileClick: (id: number) => void
  // Select-and-submit a specific tile directly — double-click on a hand
  // tile, or dragging one onto DiscardField's own drop zone (the DndContext
  // spanning both lives here, since it's an ancestor of both the human's
  // HandTiles and the shared DiscardField, two separate stage objects).
  // Omitted when it isn't the human's turn. This is now the ONLY way to
  // submit a discard — the old select-then-press-a-button flow (and its
  // HudBar button) is gone.
  onRequestDiscardTile?: (id: number) => void
  // Tile inspector (SPEC.md §5): lifted to App (not owned here) so the Hint
  // panel's Tile Safety tab (M5) can share the exact same selection instead
  // of maintaining an independent one.
  selectedTypeId: TileTypeId | null
  onInspectTile: (id: number) => void
  // KICKOFF-phase4-discard-overlay.md's secondary trigger — tapping any
  // discard also opens the full-viewport overlay, layered on top of (not
  // instead of) that tile's existing tile-inspector behavior. Optional:
  // PracticeView/ReplayView render a Board without a live overlay to open,
  // and tests that don't care about it shouldn't need to stub it.
  onOpenDiscardOverlay?: () => void
  // Shows the one-time "how do I discard?" cue beside the Sort button. Owned
  // by App (session-scoped, latched on the human's first discard) rather than
  // derived here from the current hand's discard pile — a per-hand derivation
  // would make the hint reappear at the start of every one of the 16 hands.
  // Optional: PracticeView/ReplayView don't carry the latch and shouldn't
  // need to stub it.
  showDiscardHint?: boolean
}

// Physical seat position never changes hand-to-hand (unlike wind labels,
// which rotate with the dealer) — the human is always at the bottom, and
// the other 3 seats go counter-clockwise from there (the direction turn
// order actually proceeds: 0 -> 1 -> 2 -> 3 -> 0), matching standard
// 4-player mahjong seating as viewed from above.
//
// Phase 7 (KICKOFF-phase7-board-rebuild.md): the discard pile is no longer
// four independently-reserved per-seat regions — it's ONE shared DiscardField
// covering all four zones, rendered once here rather than per-Seat. Each
// Seat now only owns its own identity header + one combined hand/meld/
// flower line (stageLayout.ts's getBoardRegions).
const OFFSET_ROLE: Record<number, 'human' | SeatRole> = { 0: 'human', 1: 'west', 2: 'north', 3: 'east' }

export function Board({
  state,
  matchState,
  matchScores,
  isHumanTurn,
  selectedTileId,
  onTileClick,
  onRequestDiscardTile,
  selectedTypeId,
  onInspectTile,
  onOpenDiscardOverlay,
  showDiscardHint,
}: BoardProps) {
  // state.seed, not state.handNumber — see useHandOrder's own comment on
  // why handNumber alone can't detect a fresh deal across a Restart (it
  // resets to 1 on every new match, so restarting while still on hand 1
  // wouldn't change it).
  const { order, sort, reorder } = useHandOrder(state.players[HUMAN_SEAT].hand.concealedTiles, state.seed)

  const handleHumanHandTileClick = (id: number) => {
    onTileClick(id)
    onInspectTile(id)
  }
  const handleDiscardTileClick = (id: number) => {
    onInspectTile(id)
    onOpenDiscardOverlay?.()
  }
  const unseenCounts = computeUnseenCounts(state, HUMAN_SEAT)
  // Once a hand ends (win or exhaustive draw), every seat's concealed tiles
  // turn face-up on the board itself so bots' (and, for a draw, everyone's)
  // hands are visible for review, not just the winner's fan breakdown text
  // in ScoreScreen.
  const revealConcealed = state.phase === 'handEnded'

  // GameState.lastDrawnTile is only meaningful while its owner is actually
  // sitting on it awaiting a discard — isHumanTurn already encodes exactly
  // that condition for the human seat, so reuse it rather than re-deriving.
  const justDrawnTileId = isHumanTurn ? (state.lastDrawnTile ?? null) : null
  const humanPlayer = state.players[HUMAN_SEAT]

  // Drag-and-drop, lifted from HandTiles.tsx (Phase 7): the human's hand and
  // DiscardField's own drop target (its "you" zone) are separate stage
  // objects — siblings under <GameStage>, not nested inside one another —
  // so the single DndContext they both need to share has to live at their
  // nearest common ancestor, here, not inside either of them.
  const [activeId, setActiveId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | typeof END_ZONE_ID | typeof DISCARD_ZONE_ID | null>(null)
  const sensors = useSensors(
    // 8px of real pointer movement before a drag activates — lets a plain
    // tap still reach onTileClick (discard selection) instead of being
    // swallowed as a drag start.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Real keyboard operability: Tab to a tile, Space to pick up, arrow keys
    // to move, Space to drop.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over) {
      setOverId(null)
      return
    }
    const id = event.over.id
    setOverId(id === END_ZONE_ID || id === DISCARD_ZONE_ID ? id : (id as number))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    const { active, over } = event
    if (!over) return
    const overId = over.id === END_ZONE_ID || over.id === DISCARD_ZONE_ID ? over.id : (over.id as number)
    const action = resolveDragEndAction(order, active.id as number, overId)
    if (action.type === 'discard') onRequestDiscardTile?.(action.id)
    else if (action.type === 'reorder') reorder(action.draggedId, action.beforeId)
  }

  return (
    // Phase 2.2 step 3: no CSS max-width here at all — GameStage.tsx's own
    // MAX_DESIGN_WIDTH (1920) is the only ceiling now (KICKOFF-phase2-2-hand-
    // fit.md). The earlier 1536px cap was itself binding availWidth at wide
    // viewports (measured designWidth 1424 at 1910px was exactly
    // 768*(1536/827), the cap, not the window) — removing it lets
    // computeDesignWidth read the real available width.
    <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <WindIndicator matchState={matchState} />
        <WallCounter wall={state.wall} />
        <TileInspector selectedTypeId={selectedTypeId} unseenCounts={unseenCounts} />
        {/* Moved down here (was its own full-width row above <main> in
            App.tsx) to reclaim a whole row of page height for GameStage's
            own measured available space — freeing up real screen room the
            board (including the bot seat lines' tile size) renders into,
            rather than costing a dedicated row of its own. */}
        <CallOutToast state={state} />
      </div>

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
        <GameStage>
          <TableSurface />
          <WallRing />
          <DiscardField state={state} selectedTypeId={selectedTypeId ?? undefined} onTileClick={handleDiscardTileClick} />
          {state.players.map((player) => {
            const offset = (player.seat - HUMAN_SEAT + 4) % 4
            const role = OFFSET_ROLE[offset]!
            const isHuman = player.seat === HUMAN_SEAT
            return (
              <Seat
                key={player.seat}
                seat={player.seat}
                role={role}
                player={player}
                isDealer={player.seat === state.dealerSeat}
                isCurrentTurn={player.seat === state.currentSeat}
                isHuman={isHuman}
                matchScore={matchScores[player.seat]}
                selectedTypeId={selectedTypeId ?? undefined}
                handOrder={isHuman ? order : undefined}
                selectedTileId={isHuman ? selectedTileId : undefined}
                onTileClick={isHuman ? handleHumanHandTileClick : undefined}
                onRequestDiscardTile={isHuman ? onRequestDiscardTile : undefined}
                activeId={isHuman ? activeId : undefined}
                overId={isHuman ? overId : undefined}
                onSort={isHuman ? sort : undefined}
                showDiscardHint={isHuman ? showDiscardHint : undefined}
                justDrawnTileId={isHuman ? justDrawnTileId : undefined}
                onInspectTile={onInspectTile}
                revealConcealed={revealConcealed}
              />
            )
          })}
        </GameStage>
      </DndContext>

      <HudBar hand={humanPlayer.hand} prevailingWind={state.prevailingWind} seatWind={humanPlayer.seatWind} />
    </div>
  )
}
