import { useState } from 'react'
import { typeIdOfInstance, type GameState, type MatchState, type Seat as SeatId, type TileTypeId } from '@mahjong-mcr/engine'
import { useHandOrder } from '../hand/useHandOrder.js'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { Seat } from './Seat.js'
import { TileInspector } from './TileInspector.js'
import { computeUnseenCounts } from './unseenCounts.js'
import { WallCounter } from './WallCounter.js'
import { WindIndicator } from './WindIndicator.js'

export interface BoardProps {
  state: GameState
  matchState: MatchState
  matchScores: Record<SeatId, number>
  isHumanTurn: boolean
  selectedTileId: number | null
  onTileClick: (id: number) => void
  onRequestDiscard: () => void
}

// Physical seat position never changes hand-to-hand (unlike wind labels,
// which rotate with the dealer) — the human is always at the bottom, and
// the other 3 seats are placed going counter-clockwise from there (the
// direction turn order actually proceeds: 0 -> 1 -> 2 -> 3 -> 0), matching
// standard 4-player mahjong seating as viewed from above.
//
// The human's own seat spans the full board width rather than sharing a
// single 1/3-width column with the bot seats: a bot's concealed hand only
// ever needs to show compact backs, but the human's real 13-14 face tiles
// (plus the sort toolbar and discard button) genuinely need the room — at
// a single grid column's width (~1/3 of an iPad-landscape board) that row
// either overflows the viewport horizontally or wraps into several tall
// rows, both of which fail SPEC.md §5a's "answer within 2 seconds, no
// scrolling" bar for "what's in my hand" (found via a real Playwright
// screenshot at the SPEC-mandated 1024x768 iPad viewport, not eyeballed).
const GRID_CLASS_BY_OFFSET: Record<number, string> = {
  0: 'row-start-3 col-start-1 col-span-3', // human, bottom, full width
  1: 'row-start-2 col-start-1', // next in turn order, left
  2: 'row-start-1 col-start-2', // across, top
  3: 'row-start-2 col-start-3', // right
}

export function Board({
  state,
  matchState,
  matchScores,
  isHumanTurn,
  selectedTileId,
  onTileClick,
  onRequestDiscard,
}: BoardProps) {
  const { order, sort, reorder } = useHandOrder(state.players[HUMAN_SEAT].hand.concealedTiles, state.handNumber)

  // Tile inspector (SPEC.md §5): clicking any tile, anywhere on the board,
  // highlights every visible tile of the same type and shows how many
  // remain unseen. Owned here (not lifted to App) since it's purely a
  // board-wide display concern, unlike the discard flow (onTileClick/
  // onRequestDiscard), which needs to reach the live game state in App.
  const [selectedTypeId, setSelectedTypeId] = useState<TileTypeId | null>(null)
  const inspectTile = (id: number) => setSelectedTypeId(typeIdOfInstance(id))
  const handleHumanHandTileClick = (id: number) => {
    onTileClick(id)
    inspectTile(id)
  }
  const unseenCounts = computeUnseenCounts(state, HUMAN_SEAT)

  // GameState.lastDrawnTile is only meaningful while its owner is actually
  // sitting on it awaiting a discard — isHumanTurn already encodes exactly
  // that condition for the human seat, so reuse it rather than re-deriving.
  const justDrawnTileId = isHumanTurn ? (state.lastDrawnTile ?? null) : null

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <WindIndicator matchState={matchState} />
        <WallCounter wall={state.wall} />
        <TileInspector selectedTypeId={selectedTypeId} unseenCounts={unseenCounts} />
      </div>

      <div data-testid="board" className="grid w-full grid-cols-3 grid-rows-3 gap-2">
        {state.players.map((player) => {
          const offset = ((player.seat - HUMAN_SEAT + 4) % 4) as 0 | 1 | 2 | 3
          const isHuman = player.seat === HUMAN_SEAT
          return (
            <div key={player.seat} className={`min-w-0 ${GRID_CLASS_BY_OFFSET[offset]}`}>
              <Seat
                seat={player.seat}
                player={player}
                isDealer={player.seat === state.dealerSeat}
                isCurrentTurn={player.seat === state.currentSeat}
                isHuman={isHuman}
                matchScore={matchScores[player.seat]}
                selectedTypeId={selectedTypeId ?? undefined}
                handOrder={isHuman ? order : undefined}
                onSortHand={isHuman ? sort : undefined}
                onReorderHand={isHuman ? reorder : undefined}
                selectedTileId={isHuman ? selectedTileId : undefined}
                onTileClick={isHuman ? handleHumanHandTileClick : undefined}
                canDiscard={isHuman ? isHumanTurn && selectedTileId !== null : undefined}
                onRequestDiscard={isHuman ? onRequestDiscard : undefined}
                justDrawnTileId={isHuman ? justDrawnTileId : undefined}
                onInspectTile={inspectTile}
                prevailingWind={isHuman ? state.prevailingWind : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
