import type { GameState, MatchState, Seat as SeatId, TileTypeId } from '@mahjong-mcr/engine'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { FanTrackerPanel } from '../hand/FanTrackerPanel.js'
import { SortToolbar } from '../hand/SortToolbar.js'
import { useHandOrder } from '../hand/useHandOrder.js'
import { WaitsPanel } from '../hand/WaitsPanel.js'
import { GameStage } from '../stage/GameStage.js'
import type { SeatOffset } from '../stage/stageLayout.js'
import { Seat } from './Seat.js'
import { TileInspector } from './TileInspector.js'
import { computeUnseenCounts } from './unseenCounts.js'
import { WallCounter } from './WallCounter.js'
import { WallSegment } from './WallSegment.js'
import { WindIndicator } from './WindIndicator.js'

export interface BoardProps {
  state: GameState
  matchState: MatchState
  matchScores: Record<SeatId, number>
  isHumanTurn: boolean
  selectedTileId: number | null
  onTileClick: (id: number) => void
  onRequestDiscard: () => void
  // Tile inspector (SPEC.md §5): lifted to App (not owned here) so the Hint
  // panel's Tile Safety tab (M5) can share the exact same selection instead
  // of maintaining an independent one.
  selectedTypeId: TileTypeId | null
  onInspectTile: (id: number) => void
}

// Physical seat position never changes hand-to-hand (unlike wind labels,
// which rotate with the dealer) — the human is always at the bottom
// (SeatOffset 0), and the other 3 seats go counter-clockwise from there
// (the direction turn order actually proceeds: 0 -> 1 -> 2 -> 3 -> 0),
// matching standard 4-player mahjong seating as viewed from above. As of
// M8 Step 1 this spatial intent lives in stageLayout.ts's SEAT_REGIONS
// (stage coordinates) rather than a CSS grid — Seat.tsx no longer renders
// a bordered per-seat card, so there's nothing left for a grid to arrange.
export function Board({
  state,
  matchState,
  matchScores,
  isHumanTurn,
  selectedTileId,
  onTileClick,
  onRequestDiscard,
  selectedTypeId,
  onInspectTile,
}: BoardProps) {
  const { order, sort, reorder } = useHandOrder(state.players[HUMAN_SEAT].hand.concealedTiles, state.handNumber)

  const handleHumanHandTileClick = (id: number) => {
    onTileClick(id)
    onInspectTile(id)
  }
  const unseenCounts = computeUnseenCounts(state, HUMAN_SEAT)

  // GameState.lastDrawnTile is only meaningful while its owner is actually
  // sitting on it awaiting a discard — isHumanTurn already encodes exactly
  // that condition for the human seat, so reuse it rather than re-deriving.
  const justDrawnTileId = isHumanTurn ? (state.lastDrawnTile ?? null) : null
  const humanPlayer = state.players[HUMAN_SEAT]
  const canDiscard = isHumanTurn && selectedTileId !== null

  return (
    <div className="flex w-full max-w-5xl min-h-0 flex-1 flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <WindIndicator matchState={matchState} />
        <WallCounter wall={state.wall} />
        <TileInspector selectedTypeId={selectedTypeId} unseenCounts={unseenCounts} />
      </div>

      <GameStage>
        <WallSegment />
        {state.players.map((player) => {
          const offset = ((player.seat - HUMAN_SEAT + 4) % 4) as SeatOffset
          const isHuman = player.seat === HUMAN_SEAT
          return (
            <Seat
              key={player.seat}
              seat={player.seat}
              offset={offset}
              player={player}
              isDealer={player.seat === state.dealerSeat}
              isCurrentTurn={player.seat === state.currentSeat}
              isHuman={isHuman}
              matchScore={matchScores[player.seat]}
              selectedTypeId={selectedTypeId ?? undefined}
              handOrder={isHuman ? order : undefined}
              onReorderHand={isHuman ? reorder : undefined}
              selectedTileId={isHuman ? selectedTileId : undefined}
              onTileClick={isHuman ? handleHumanHandTileClick : undefined}
              justDrawnTileId={isHuman ? justDrawnTileId : undefined}
              onInspectTile={onInspectTile}
            />
          )
        })}
      </GameStage>

      {/* Temporary plain control row: Step 1 only needed Sort/Discard/
          FanTracker/Waits relocated out of the now-removed per-seat panel.
          Step 2 is explicitly where this becomes a real styled HUD bar
          (and SortToolbar's native <select> gets replaced) — deliberately
          not attempted here. */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2 px-2 pb-1">
        <FanTrackerPanel hand={humanPlayer.hand} prevailingWind={state.prevailingWind} seatWind={humanPlayer.seatWind} />
        <WaitsPanel hand={humanPlayer.hand} prevailingWind={state.prevailingWind} seatWind={humanPlayer.seatWind} />
        <SortToolbar onSort={sort} />
        <button
          type="button"
          disabled={!canDiscard}
          onClick={onRequestDiscard}
          className="min-h-11 rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          Discard selected
        </button>
      </div>
    </div>
  )
}
