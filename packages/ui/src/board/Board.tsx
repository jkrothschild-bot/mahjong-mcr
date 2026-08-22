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
import { useMemo, useRef, useState } from 'react'
import type { Action, GameState, MatchState, Seat as SeatId, TileTypeId } from '@mahjong-mcr/engine'
import { deriveHandOutcome } from '../game/deriveScoreContext.js'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { DISCARD_ZONE_ID, END_ZONE_ID, resolveDragEndAction } from '../hand/resolveReorderTarget.js'
import { revealOrder } from '../hand/revealOrder.js'
import { useHandOrder } from '../hand/useHandOrder.js'
import { isNewDragClinkTarget } from '../hand/dragClink.js'
import { soundEffectsPlayer } from '../audio/soundEffects.js'
import { GameStage } from '../stage/GameStage.js'
import { SharedLayoutEnabledContext } from '../stage/Positioned.js'
import type { SeatRole } from '../stage/stageLayout.js'
import { GameEventAnnouncement } from '../game/GameEventAnnouncement.js'
import { useGameEventPresentation } from '../game/useGameEventPresentation.js'
import type { InitialDealFrame } from '../game/initialDealPresentation.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { DiscardField } from './DiscardField.js'
import { Seat } from './Seat.js'
import { TableSurface } from './TableSurface.js'
import { TileInspector } from './TileInspector.js'
import { computeUnseenCounts } from './unseenCounts.js'
import { WallCounter } from './WallCounter.js'
import { WallRing } from './WallRing.js'
import { WindIndicator } from './WindIndicator.js'
import { InitialDealHands } from './InitialDealHands.js'
import { WallDrawMotionProvider } from './WallDrawMotion.js'

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
  // Shows the one-time "how do I discard?" cue beside the Sort button. Owned
  // by App (session-scoped, latched on the human's first discard) rather than
  // derived here from the current hand's discard pile — a per-hand derivation
  // would make the hint reappear at the start of every one of the 16 hands.
  // Optional: ReplayView doesn't carry the latch and shouldn't
  // need to stub it.
  showDiscardHint?: boolean
  // Synthetic occupancy previews reuse tile ids, so their tile positions
  // cannot safely participate in Motion's shared-layout registry.
  enableSharedLayout?: boolean
  // Present only during a fresh-hand deal. Its wall/hands are deterministic
  // projections of performInitialDeal; authoritative GameState remains
  // untouched and resumed games omit this prop entirely.
  initialDealFrame?: InitialDealFrame
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
  showDiscardHint,
  enableSharedLayout = true,
  initialDealFrame,
}: BoardProps) {
  const { soundEffects } = useSettingsContext()
  const { announcement, recentMeldId } = useGameEventPresentation(state, soundEffects)
  // state.seed, not state.handNumber — see useHandOrder's own comment on
  // why handNumber alone can't detect a fresh deal across a Restart (it
  // resets to 1 on every new match, so restarting while still on hand 1
  // wouldn't change it).
  const { order, sort, reorder } = useHandOrder(state.players[HUMAN_SEAT].hand.concealedTiles, state.seed)

  const handleHumanHandTileClick = (id: number) => {
    onTileClick(id)
    onInspectTile(id)
  }
  const unseenCounts = computeUnseenCounts(state, HUMAN_SEAT)
  // Once a hand ends (win or exhaustive draw), every seat's concealed tiles
  // turn face-up on the board itself so bots' (and, for a draw, everyone's)
  // hands are visible for review, not just the winner's fan breakdown text
  // in ScoreScreen.
  const revealConcealed = state.phase === 'handEnded'

  // The winning tile's display move at reveal. On a real table a discard win
  // ends with the claimed tile laid WITH the winner's hand — in engine state
  // it stays in the discarder's river (finalizeWin never moves it), which
  // left the winner's revealed hand a tile short and made a correct win look
  // broken (the live case: Pure Shifted Chows showing "6,7" where 5-6-7
  // should be, the 5 sitting across the table in the river).
  //
  // So, display only: for a discard win the tile is appended to the winner's
  // reveal order, DiscardField omits it (it is by construction the LAST tile
  // of the discarder's river, so nothing else moves), and its shared
  // layoutId animates it across the table. Self-draw needs no move — the
  // tile is already in the winner's hand — and a robbed-kong win gets NO
  // treatment at all: its tile sits inside the robbed player's meld, and
  // plucking a tile out of a rendered meld would misrepresent that meld.
  // Engine state is untouched in every case.
  const winInfo =
    revealConcealed && state.result?.outcome === 'win'
      ? {
          winnerSeat: state.result.winnerSeats![0]!,
          winningTile: state.result.winningTile!,
          winMethod: state.result.winMethod!,
        }
      : null
  const claimedWinningTile = winInfo?.winMethod === 'discard' ? winInfo.winningTile : null
  // Marked for discard and self-draw wins (both render the tile in the
  // winner's hand); never for robKong (its tile isn't rendered there).
  const markedWinningTile = winInfo && winInfo.winMethod !== 'robKong' ? winInfo.winningTile : null

  // Reveal-time display order per seat (revealOrder.ts): the winner's hand in
  // the groups it was actually won with, everyone else suit-sorted so 13
  // face-up tiles can be read rather than scanned one at a time.
  //
  // Memoised on `state` because deriving the winning shape means running the
  // full scorer (every decomposition x every fan detector). That's cheap
  // once, wasteful on every render of a hand-ended board — and this component
  // re-renders on hover, selection, and drag. Returns an empty map while a
  // hand is in progress, so the cost is only ever paid at hand end.
  const revealOrders = useMemo<Record<number, readonly number[]>>(() => {
    if (state.phase !== 'handEnded') return {}
    // Null for an exhaustive draw — nobody won, so nobody gets grouped and
    // all four seats fall through to the plain suit sort below.
    const outcome = deriveHandOutcome(state)
    const orders: Record<number, readonly number[]> = {}
    const result = state.result
    const claimed =
      result?.outcome === 'win' && result.winMethod === 'discard' ? result.winningTile! : null
    for (const player of state.players) {
      const isWinner = outcome !== null && player.seat === outcome.winnerSeat
      const shape = isWinner ? outcome.winningShape : null
      // The claimed winning tile joins the winner's ordered display — this is
      // the tile the scorer already counted (deriveScoreHandParams appends
      // it), so with it present the winning group finally renders complete.
      const tiles =
        isWinner && claimed !== null ? [...player.hand.concealedTiles, claimed] : player.hand.concealedTiles
      orders[player.seat] = revealOrder(tiles, shape)
    }
    return orders
  }, [state])

  // GameState.lastDrawnTile is only meaningful while its owner is actually
  // sitting on it awaiting a discard — isHumanTurn already encodes exactly
  // that condition for the human seat, so reuse it rather than re-deriving.
  const justDrawnTileId = isHumanTurn ? (state.lastDrawnTile ?? null) : null
  const latestAction: Action | undefined = state.actionLog[state.actionLog.length - 1]
  // Pass declarations can append actions while a discard is still live.
  // Prefer the pending claim's tile until that window resolves; otherwise
  // only the immediately preceding discard receives the emphasis.
  const latestDiscardId =
    state.phase === 'awaitingClaims' && state.pendingClaim?.kind === 'discard'
      ? state.pendingClaim.tile
      : latestAction?.type === 'discard'
        ? latestAction.tile
        : null

  // Drag-and-drop, lifted from HandTiles.tsx (Phase 7): the human's hand and
  // DiscardField's own drop target (its "you" zone) are separate stage
  // objects — siblings under <GameStage>, not nested inside one another —
  // so the single DndContext they both need to share has to live at their
  // nearest common ancestor, here, not inside either of them.
  const [activeId, setActiveId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | typeof END_ZONE_ID | typeof DISCARD_ZONE_ID | null>(null)
  const lastDragClinkTargetRef = useRef<number | null>(null)
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
    const id = event.active.id as number
    lastDragClinkTargetRef.current = null
    setActiveId(id)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over) {
      setOverId(null)
      return
    }
    const id = event.over.id
    const draggedId = event.active.id as number
    if (isNewDragClinkTarget(lastDragClinkTargetRef.current, draggedId, id)) {
      lastDragClinkTargetRef.current = id
      if (soundEffects) soundEffectsPlayer.play('tileClink')
    }
    setOverId(id === END_ZONE_ID || id === DISCARD_ZONE_ID ? id : (id as number))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    lastDragClinkTargetRef.current = null
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
    <SharedLayoutEnabledContext.Provider value={enableSharedLayout}>
    <div
      data-testid="game-board"
      data-shared-layout={enableSharedLayout ? 'enabled' : 'disabled'}
      data-initial-deal={initialDealFrame ? initialDealFrame.phase : undefined}
      aria-busy={initialDealFrame ? 'true' : undefined}
      className="flex w-full min-h-0 flex-1 flex-col items-center gap-1"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <WindIndicator matchState={matchState} />
        <WallCounter wall={initialDealFrame?.wall ?? state.wall} />
        <TileInspector selectedTypeId={selectedTypeId} unseenCounts={unseenCounts} />
        {/* Moved down here (was its own full-width row above <main> in
            App.tsx) to reclaim a whole row of page height for GameStage's
            own measured available space — freeing up real screen room the
            board (including the bot seat lines' tile size) renders into,
            rather than costing a dedicated row of its own. */}
      </div>

      <GameEventAnnouncement announcement={announcement} />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setOverId(null)
          lastDragClinkTargetRef.current = null
        }}
      >
        <GameStage>
          <WallDrawMotionProvider
            actions={state.actionLog}
            wall={state.wall}
            dealerSeat={state.dealerSeat}
            handKey={`${state.seed}:${state.handNumber}`}
            enabled={enableSharedLayout && !initialDealFrame}
          >
            <TableSurface />
            <WallRing wall={initialDealFrame?.wall ?? state.wall} dealerSeat={state.dealerSeat} />
            {initialDealFrame ? <InitialDealHands frame={initialDealFrame} /> : <>
            <DiscardField
              state={state}
              selectedTypeId={selectedTypeId ?? undefined}
              onTileClick={onInspectTile}
              omitTileId={claimedWinningTile}
              latestDiscardId={latestDiscardId}
            />
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
                  revealOrder={revealOrders[player.seat]}
                  revealExtraTiles={
                    winInfo && player.seat === winInfo.winnerSeat && claimedWinningTile !== null
                      ? [claimedWinningTile]
                      : undefined
                  }
                  revealWinningTileId={winInfo && player.seat === winInfo.winnerSeat ? markedWinningTile : undefined}
                  recentMeldId={recentMeldId ?? undefined}
                />
              )
            })}
            </>}
          </WallDrawMotionProvider>
        </GameStage>
      </DndContext>

      {/* Nothing else goes in this flex column. HudBar (the fan tracker +
          waits panels) used to live here and was removed deliberately: both
          panels render nothing until they have something to report and then
          appear at ~150px, which changed GameStage's own leftover height,
          which changed designWidth, which resized the whole board mid-hand.
          They're now on demand in HandInfoPanel (App.tsx's "Hand info"
          button). Anything added below the stage reintroduces that bug —
          put it in a modal instead. */}
    </div>
    </SharedLayoutEnabledContext.Provider>
  )
}
