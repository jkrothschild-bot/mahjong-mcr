import type { GameState, MatchState, Seat as SeatId, TileTypeId } from '@mahjong-mcr/engine'
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
  // Tile inspector (SPEC.md §5): lifted to App (not owned here) so the Hint
  // panel's Tile Safety tab (M5) can share the exact same selection instead
  // of maintaining an independent one.
  selectedTypeId: TileTypeId | null
  onInspectTile: (id: number) => void
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

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <WindIndicator matchState={matchState} />
        <WallCounter wall={state.wall} />
        <TileInspector selectedTypeId={selectedTypeId} unseenCounts={unseenCounts} />
      </div>

      {/* grid-rows-[auto_auto_auto], not Tailwind's grid-rows-3 (equal 1fr
          tracks) — with 1fr rows, the instant one seat's content (e.g. the
          human's own hand row) needs more height than the others, ALL THREE
          rows stretch to match it, multiplying the wasted space by 3 and
          alone accounting for the majority of a real page-overflow bug
          found via extended live play (see Seat.tsx's own comment on the
          rest of that investigation). auto sizes each row to its own
          content instead. */}
      <div data-testid="board" className="grid w-full grid-cols-3 grid-rows-[auto_auto_auto] gap-2">
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
                onInspectTile={onInspectTile}
                prevailingWind={isHuman ? state.prevailingWind : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
