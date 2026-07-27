import type { GameState, MatchState, Seat as SeatId } from '@mahjong-mcr/engine'
import { useHandOrder } from '../hand/useHandOrder.js'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { Seat } from './Seat.js'
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
const GRID_CLASS_BY_OFFSET: Record<number, string> = {
  0: 'row-start-3 col-start-2', // human, bottom
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
  const { order, sort, reorder } = useHandOrder(state.players[HUMAN_SEAT].hand.concealedTiles)

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-4">
      <div className="flex gap-4">
        <WindIndicator matchState={matchState} />
        <WallCounter wall={state.wall} />
      </div>

      <div data-testid="board" className="grid w-full grid-cols-3 grid-rows-3 gap-3">
        {state.players.map((player) => {
          const offset = ((player.seat - HUMAN_SEAT + 4) % 4) as 0 | 1 | 2 | 3
          const isHuman = player.seat === HUMAN_SEAT
          return (
            <div key={player.seat} className={GRID_CLASS_BY_OFFSET[offset]}>
              <Seat
                seat={player.seat}
                player={player}
                isDealer={player.seat === state.dealerSeat}
                isCurrentTurn={player.seat === state.currentSeat}
                isHuman={isHuman}
                matchScore={matchScores[player.seat]}
                handOrder={isHuman ? order : undefined}
                onSortHand={isHuman ? sort : undefined}
                onReorderHand={isHuman ? reorder : undefined}
                selectedTileId={isHuman ? selectedTileId : undefined}
                onTileClick={isHuman ? onTileClick : undefined}
                canDiscard={isHuman ? isHumanTurn && selectedTileId !== null : undefined}
                onRequestDiscard={isHuman ? onRequestDiscard : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
