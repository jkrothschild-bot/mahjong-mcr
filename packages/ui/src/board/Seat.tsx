import { useEffect, useRef } from 'react'
import type { PlayerState, Seat as SeatId, Wind } from '@mahjong-mcr/engine'
import { FanTrackerPanel } from '../hand/FanTrackerPanel.js'
import { HandTiles } from '../hand/HandTiles.js'
import { SortToolbar } from '../hand/SortToolbar.js'
import { WaitsPanel } from '../hand/WaitsPanel.js'
import type { SortMode } from '../hand/handOrder.js'
import { botBackImageSrc } from '../tiles/tileImages.js'
import { tileBackCompactClassName } from '../tiles/tileStyles.js'
import { Discards } from './Discards.js'
import { Flowers } from './Flowers.js'
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
  // The tile the human just drew this turn (GameState.lastDrawnTile) — only
  // meaningful while it's actually their turn to discard.
  justDrawnTileId?: number | null
  // Tile inspector (Phase 6) — fires for any seat's discard/meld tile, and
  // additionally for the human's own hand tiles (see onTileClick above).
  onInspectTile?: (id: number) => void
  // Only used when isHuman — the ready-hand/waits display (M4).
  prevailingWind?: Wind
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
  justDrawnTileId,
  onInspectTile,
  prevailingWind,
}: SeatProps) {
  // Flowers + melds + discards grow without bound over a hand (a seat can
  // rack up dozens of discards, several melds, before the wall empties) —
  // no fixed tile size makes an unbounded amount of this fit in the fixed
  // board layout SPEC.md §5a's no-scrolling rule requires. Found via real
  // extended play: even a SINGLE extra row appearing (one flower reveal,
  // one meld) was enough to push the whole board past the iPad viewport
  // with zero margin to spare — the original "fits at a fresh deal" tuning
  // had no slack for anything appearing beyond that exact starting state.
  // A bot seat's entire post-header content (flowers/melds/discards/
  // concealed backs together) is capped to one shared, scrollable region so
  // its total footprint can never grow past a fixed budget, regardless of
  // what accumulates inside it — this keeps the six-column/no-overlap
  // discard rule (a hard rule) and the current tile sizes (an explicit user
  // preference) both intact while guaranteeing the page itself never needs
  // to scroll. The human's own interactive hand (toolbar + tiles) is
  // deliberately NOT included in its cap — that must stay fully visible and
  // clickable; only the human's own flowers/melds/discards share this
  // treatment with the bot seats.
  const growingContentRef = useRef<HTMLDivElement>(null)
  const flowerCount = player.hand.flowers.length
  const meldCount = player.hand.melds.length
  const discardCount = player.discards.length
  useEffect(() => {
    const el = growingContentRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [flowerCount, meldCount, discardCount])

  return (
    <section
      data-testid={`seat-${seat}`}
      aria-label={`Seat ${seat}${isHuman ? ' (you)' : ''}`}
      className={`flex min-w-0 flex-col gap-1 rounded-lg border p-2 ${
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

      {isHuman ? (
        <>
          <div ref={growingContentRef} className="flex max-h-24 flex-col gap-1 overflow-y-auto overflow-x-hidden">
            <Flowers seat={seat} tiles={player.hand.flowers} selectedTypeId={selectedTypeId} onTileClick={onInspectTile} />
            <Melds seat={seat} melds={player.hand.melds} selectedTypeId={selectedTypeId} onTileClick={onInspectTile} />
            <Discards seat={seat} tiles={player.discards} selectedTypeId={selectedTypeId} onTileClick={onInspectTile} />
          </div>
          <div className="flex flex-col gap-1">
            {prevailingWind && <FanTrackerPanel hand={player.hand} prevailingWind={prevailingWind} seatWind={player.seatWind} />}
            {prevailingWind && <WaitsPanel hand={player.hand} prevailingWind={prevailingWind} seatWind={player.seatWind} />}
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
              highlightedTypeId={selectedTypeId}
              justDrawnTileId={justDrawnTileId}
            />
          </div>
        </>
      ) : (
        <div ref={growingContentRef} className="flex max-h-32 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          <Flowers seat={seat} tiles={player.hand.flowers} selectedTypeId={selectedTypeId} onTileClick={onInspectTile} />
          <Melds seat={seat} melds={player.hand.melds} selectedTypeId={selectedTypeId} onTileClick={onInspectTile} />
          <Discards seat={seat} tiles={player.discards} selectedTypeId={selectedTypeId} onTileClick={onInspectTile} />
          <div role="list" aria-label={`Seat ${seat} concealed tiles`} className="flex flex-wrap gap-1">
            {player.hand.concealedTiles.map((_, index) => (
              <div key={index} data-testid={`seat-${seat}-back-${index}`} role="listitem" className={tileBackCompactClassName()}>
                <img src={botBackImageSrc()} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
