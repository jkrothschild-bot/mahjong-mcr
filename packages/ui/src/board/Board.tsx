import type { GameState, MatchState, Seat as SeatId, TileTypeId } from '@mahjong-mcr/engine'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { useHandOrder } from '../hand/useHandOrder.js'
import { GameStage } from '../stage/GameStage.js'
import type { SeatOffset } from '../stage/stageLayout.js'
import { HudBar } from './HudBar.js'
import { Seat } from './Seat.js'
import { TableSurface } from './TableSurface.js'
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
// M8 Step 1 this spatial intent lives in stageLayout.ts's getSeatRegions
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
        <TableSurface />
        <WallSegment wall={state.wall} />
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

      <HudBar
        hand={humanPlayer.hand}
        prevailingWind={state.prevailingWind}
        seatWind={humanPlayer.seatWind}
        onSort={sort}
        canDiscard={canDiscard}
        onRequestDiscard={onRequestDiscard}
      />
    </div>
  )
}
