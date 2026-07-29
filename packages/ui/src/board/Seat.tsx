import type { PlayerState, Seat as SeatId } from '@mahjong-mcr/engine'
import { HandTiles } from '../hand/HandTiles.js'
import { Positioned } from '../stage/Positioned.js'
import { SEAT_REGIONS, type SeatOffset } from '../stage/stageLayout.js'
import { ConcealedBacks } from './ConcealedBacks.js'
import { Discards } from './Discards.js'
import { Flowers } from './Flowers.js'
import { Melds } from './Melds.js'

const WIND_LETTER: Record<PlayerState['seatWind'], string> = { east: 'E', south: 'S', west: 'W', north: 'N' }

export interface SeatProps {
  seat: SeatId
  // Which of the 4 stage regions (stageLayout.ts's SEAT_REGIONS) this seat
  // occupies — human is always 0 (bottom); the other 3 go counter-clockwise
  // from there in turn order, same spatial intent as the old
  // GRID_CLASS_BY_OFFSET.
  offset: SeatOffset
  player: PlayerState
  isDealer: boolean
  isCurrentTurn: boolean
  isHuman: boolean
  matchScore: number
  selectedTypeId?: string
  // Only used when isHuman — the player's own reorderable hand.
  handOrder?: readonly number[]
  onReorderHand?: (draggedId: number, beforeId: number | null) => void
  // Only used when isHuman — the discard flow (Phase 5).
  selectedTileId?: number | null
  onTileClick?: (id: number) => void
  // The tile the human just drew this turn (GameState.lastDrawnTile) — only
  // meaningful while it's actually their turn to discard.
  justDrawnTileId?: number | null
  // Tile inspector (Phase 6) — fires for any seat's discard/meld/flower
  // tile, and additionally for the human's own hand tiles (see onTileClick
  // above).
  onInspectTile?: (id: number) => void
}

// A player's stage presence: identity (wind/dealer/turn/score), hand-or-
// backs, melds, discards, flowers — each independently positioned within
// this seat's stage region (stageLayout.ts's SEAT_REGIONS) rather than
// stacked inside a bordered flow-layout card (M8 Step 1 removed that card
// entirely — see stageLayout.ts's own comment on the region partition that
// replaced it). Sort/discard controls and the fan-tracker/waits panels
// moved up to Board.tsx's temporary control row; they're page-level HUD
// now, not part of a seat's own stage presence. The turn highlight uses the
// exact same treatment regardless of seat — SPEC.md §5a/§5b's explicit
// requirement is that a bot's turn must be just as unambiguous as the
// human's, not a lesser afterthought.
export function Seat({
  seat,
  offset,
  player,
  isDealer,
  isCurrentTurn,
  isHuman,
  matchScore,
  selectedTypeId,
  handOrder,
  onReorderHand,
  selectedTileId,
  onTileClick,
  justDrawnTileId,
  onInspectTile,
}: SeatProps) {
  const regions = SEAT_REGIONS[offset]

  return (
    <div data-testid={`seat-${seat}`} aria-label={`Seat ${seat}${isHuman ? ' (you)' : ''}`}>
      <Positioned
        x={regions.header.x + regions.header.width / 2}
        y={regions.header.y + regions.header.height / 2}
        naturalWidth={regions.header.width}
        naturalHeight={regions.header.height}
      >
        <div
          className={`flex h-full w-full items-center justify-between rounded px-1.5 text-xs ${
            isCurrentTurn ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-300'
          }`}
        >
          <div className="flex items-center gap-1">
            <span data-testid={`seat-${seat}-wind`} className="font-semibold">
              {WIND_LETTER[player.seatWind]}
            </span>
            {isDealer && (
              <span data-testid={`seat-${seat}-dealer`} className="rounded-full bg-amber-500/20 px-1.5 text-amber-300">
                Dealer
              </span>
            )}
            {isCurrentTurn && (
              <span data-testid={`seat-${seat}-turn`} className="rounded-full bg-emerald-500/20 px-1.5 text-emerald-300">
                {isHuman ? 'Your turn' : 'Turn'}
              </span>
            )}
          </div>
          <span data-testid={`seat-${seat}-score`} className="font-mono">
            {matchScore}
          </span>
        </div>
      </Positioned>

      <Flowers
        seat={seat}
        tiles={player.hand.flowers}
        region={regions.flowers}
        selectedTypeId={selectedTypeId}
        onTileClick={onInspectTile}
      />
      <Melds seat={seat} melds={player.hand.melds} region={regions.melds} selectedTypeId={selectedTypeId} onTileClick={onInspectTile} />
      <Discards
        seat={seat}
        tiles={player.discards}
        region={regions.discards}
        selectedTypeId={selectedTypeId}
        onTileClick={onInspectTile}
      />

      {isHuman ? (
        <HandTiles
          order={handOrder ?? []}
          onReorder={onReorderHand ?? (() => {})}
          region={regions.hand!}
          onTileClick={onTileClick}
          selectedTileId={selectedTileId}
          highlightedTypeId={selectedTypeId}
          justDrawnTileId={justDrawnTileId}
        />
      ) : (
        <ConcealedBacks seat={seat} count={player.hand.concealedTiles.length} region={regions.backs!} />
      )}
    </div>
  )
}
