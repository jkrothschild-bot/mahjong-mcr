import type { PlayerState, Seat as SeatId } from '@mahjong-mcr/engine'
import { HandTiles } from '../hand/HandTiles.js'
import { SortToolbar } from '../hand/SortToolbar.js'
import type { SortMode } from '../hand/handOrder.js'
import { tileBackClassName } from '../tiles/tileStyles.js'
import { Discards } from './Discards.js'
import { Melds } from './Melds.js'

const WIND_LETTER: Record<PlayerState['seatWind'], string> = { east: 'E', south: 'S', west: 'W', north: 'N' }

export interface SeatProps {
  seat: SeatId
  player: PlayerState
  isDealer: boolean
  isCurrentTurn: boolean
  isHuman: boolean
  matchScore: number
  selectedTypeId?: string
  // Only used when isHuman — the player's own reorderable hand.
  handOrder?: readonly number[]
  onSortHand?: (mode: SortMode) => void
  onReorderHand?: (draggedId: number, beforeId: number | null) => void
  // Only used when isHuman — the discard flow (Phase 5).
  selectedTileId?: number | null
  onTileClick?: (id: number) => void
  canDiscard?: boolean
  onRequestDiscard?: () => void
}

// A player's full slot: identity (wind/dealer/turn), hand-or-backs, melds,
// discards, score. The turn highlight uses the exact same treatment
// regardless of seat — SPEC.md §5a/§5b's explicit requirement is that a
// bot's turn must be just as unambiguous as the human's, not a lesser
// afterthought, so there is deliberately no separate "human turn glow"
// style anywhere in this component.
export function Seat({
  seat,
  player,
  isDealer,
  isCurrentTurn,
  isHuman,
  matchScore,
  selectedTypeId,
  handOrder,
  onSortHand,
  onReorderHand,
  selectedTileId,
  onTileClick,
  canDiscard,
  onRequestDiscard,
}: SeatProps) {
  return (
    <section
      data-testid={`seat-${seat}`}
      aria-label={`Seat ${seat}${isHuman ? ' (you)' : ''}`}
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        isCurrentTurn ? 'border-emerald-400 bg-emerald-950/40' : 'border-neutral-700 bg-neutral-900'
      }`}
    >
      <header className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span data-testid={`seat-${seat}-wind`} className="font-semibold">
            {WIND_LETTER[player.seatWind]}
          </span>
          {isDealer && (
            <span data-testid={`seat-${seat}-dealer`} className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
              Dealer
            </span>
          )}
          {isCurrentTurn && (
            <span data-testid={`seat-${seat}-turn`} className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              {isHuman ? 'Your turn' : 'Turn'}
            </span>
          )}
        </div>
        <span data-testid={`seat-${seat}-score`} className="font-mono">
          {matchScore}
        </span>
      </header>

      <Melds seat={seat} melds={player.hand.melds} selectedTypeId={selectedTypeId} />
      <Discards seat={seat} tiles={player.discards} selectedTypeId={selectedTypeId} />

      {isHuman ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onSortHand && <SortToolbar onSort={onSortHand} />}
            {onRequestDiscard && (
              <button
                type="button"
                disabled={!canDiscard}
                onClick={onRequestDiscard}
                className="min-h-11 rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-400"
              >
                Discard selected
              </button>
            )}
          </div>
          <HandTiles
            order={handOrder ?? []}
            onReorder={onReorderHand ?? (() => {})}
            onTileClick={onTileClick}
            selectedTileId={selectedTileId}
          />
        </div>
      ) : (
        <div role="list" aria-label={`Seat ${seat} concealed tiles`} className="flex gap-1">
          {player.hand.concealedTiles.map((_, index) => (
            <div key={index} data-testid={`seat-${seat}-back-${index}`} role="listitem" className={tileBackClassName()}>
              {'░'}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
