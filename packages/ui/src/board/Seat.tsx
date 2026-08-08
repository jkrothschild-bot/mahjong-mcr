import type { PlayerState, Seat as SeatId } from '@mahjong-mcr/engine'
import type { SortMode } from '../hand/handOrder.js'
import { DISCARD_ZONE_ID, END_ZONE_ID } from '../hand/resolveReorderTarget.js'
import { HandTiles } from '../hand/HandTiles.js'
import { DiscardHint } from '../hand/DiscardHint.js'
import { SortToolbar } from '../hand/SortToolbar.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { useStageMetrics } from '../stage/StageMetricsContext.js'
import { Positioned } from '../stage/Positioned.js'
import { fitRowTileWidth, getBoardRegions, type SeatLineRegion, type SeatRole } from '../stage/stageLayout.js'
import { HAND_TILE_WIDTH_FLOOR, SEAT_LINE_MELD_SHIFT_PX, TILE_BOX_PX, TILE_FACE_COMPACT_PX } from '../tiles/tileStyles.js'
import { SeatLine } from './SeatLine.js'

// The sort control's own reserved slot at the left edge of the human row —
// carved out here, in Seat.tsx, rather than in stageLayout.ts's own
// getBoardRegions: that geometry is KICKOFF-phase7-board-rebuild.md's
// literal, doc-anchored golden region set, and human.row's own width is
// asserted against directly by several of its tests (capacity, property,
// golden-snapshot). Subdividing the region AFTER reading it, here, keeps
// that geometry untouched while still guaranteeing the hand+meld block
// (HandTiles' own budget math, unaware of this) never overlaps the control —
// HandTiles is handed the already-narrowed, already-shifted region below,
// the same way it's handed any other region, and centers/reserves within
// whatever it's given.
// Was 130 for the 6-mode dropdown, briefly 88 for the bare "Sort" button,
// now 150 because the slot also hosts the one-time discard hint
// (DiscardHint.tsx) stacked beneath the button.
//
// This width is reserved UNCONDITIONALLY — whether the hint is currently
// showing or not. Sizing it to the visible content would mean the hand row's
// budget changed the moment the player made their first discard and the hint
// disappeared, re-solving fitRowTileWidth and shifting every tile mid-hand.
// CLAUDE.md's standing rule is that layout never reflows mid-hand, so the
// reservation is constant and the hint simply vacates space that stays
// reserved. The cost is ~50px of hand row at every designWidth; at the 1768
// reference the row has ample slack (18 slots at nominal 60px plus gaps is
// well under the remaining width), so this only bites at the narrow end
// where the row is already shrinking.
const SORT_CONTROL_WIDTH = 150
const SORT_CONTROL_HEIGHT = 44
// Fixed offsets within the slot, NOT a flex stack: the button must not move
// when the hint unmounts. Both are measured from the slot's own top edge.
// Which way each bot seat's revealed melds are nudged, perpendicular to that
// seat's own line and always TOWARD THE TABLE CENTRE — the compact echo of
// the human row's own downward meld offset.
//
// Toward the centre, not away from it, for two reasons: it reads as the meld
// having been pushed out onto the table, which is physically what melding is;
// and it moves away from the wood rail, where that seat's identity label
// lives (stageLayout.ts's SIDE HEADER PLACEMENT), rather than into it.
//
// The side seats' lines run vertically (a 3x9 column-major grid), so their
// perpendicular is horizontal; north's line is a single row, so its
// perpendicular is vertical.
const SEAT_MELD_SHIFT: Record<SeatRole, { dx: number; dy: number }> = {
  west: { dx: SEAT_LINE_MELD_SHIFT_PX, dy: 0 }, // left seat, nudged right
  east: { dx: -SEAT_LINE_MELD_SHIFT_PX, dy: 0 }, // right seat, nudged left
  north: { dx: 0, dy: SEAT_LINE_MELD_SHIFT_PX }, // top seat, nudged down
}

const SORT_BUTTON_TOP = 4
const DISCARD_HINT_TOP = SORT_BUTTON_TOP + SORT_CONTROL_HEIGHT + 8
const DISCARD_HINT_HEIGHT = 84

// Spelled out, not the E/S/W/N abbreviation. The seat band sits on the table
// rail with room to spare, and a learner shouldn't have to expand an initial
// to answer "which seat am I?" — SPEC.md §5a wants that at a glance.
//
// This is NOT in tension with the standing rule that wind tiles carry a Latin
// letter baked into their face art (CLAUDE.md; SPEC.md §4). That rule is about
// the tile artwork, which is untouched — the tiles still read E/S/W/N, and this
// band is what tells you which of them is yours.
const WIND_NAME: Record<PlayerState['seatWind'], string> = { east: 'East', south: 'South', west: 'West', north: 'North' }

export interface SeatProps {
  seat: SeatId
  // Which seat line this seat occupies — human is always the bottom row
  // (rendered specially, see isHuman below); west/north/east are the three
  // bot positions (stageLayout.ts's getBoardRegions), going counter-
  // clockwise in turn order from the human.
  role: 'human' | SeatRole
  player: PlayerState
  isDealer: boolean
  isCurrentTurn: boolean
  isHuman: boolean
  matchScore: number
  selectedTypeId?: string
  // Only used when isHuman — the player's own reorderable hand. Reordering
  // itself happens via the lifted DndContext in Board.tsx now (it has to
  // span both this hand and DiscardField's drop target); HandTiles only
  // needs the live drag state to render its own insertion indicator/drag
  // overlay, not a reorder callback.
  handOrder?: readonly number[]
  // Only used when isHuman — the discard flow.
  selectedTileId?: number | null
  onTileClick?: (id: number) => void
  // Double-click / drag-onto-DiscardField discard trigger (see Board.tsx's
  // own comment on why the DndContext lives there). Only used when isHuman.
  onRequestDiscardTile?: (id: number) => void
  activeId?: number | null
  overId?: number | typeof END_ZONE_ID | typeof DISCARD_ZONE_ID | null
  // Only used when isHuman — renders next to the hand, inside the human
  // row's own reserved left-edge slot (see SORT_CONTROL_WIDTH above).
  onSort?: (mode: SortMode) => void
  // Only used when isHuman — the one-time "how do I discard?" cue, stacked
  // under the Sort button in that same slot. Shares onSort's own gate: the
  // slot is only carved out of the hand row when there's a Sort control to
  // put in it, so the hint has nowhere to live without it.
  showDiscardHint?: boolean
  // The tile the human just drew this turn (GameState.lastDrawnTile) — only
  // meaningful while it's actually their turn to discard.
  justDrawnTileId?: number | null
  // Tile inspector — fires for any seat's meld/flower tile, and
  // additionally for the human's own hand tiles (see onTileClick above).
  // Discards are no longer this seat's own concern (Phase 7: DiscardField
  // is one shared board-level component, not per-seat) — Board.tsx wires
  // its own onTileClick directly onto DiscardField.
  onInspectTile?: (id: number) => void
  // Only meaningful for a bot seat (isHuman's own hand is never hidden from
  // itself) — true once the hand has ended (win or exhaustive draw), so
  // every seat's concealed tiles turn face-up for review instead of staying
  // hidden behind their backs. See SeatLine's own prop of the same name.
  revealConcealed?: boolean
  // Display order for this seat's concealed tiles once the hand has ended
  // (revealOrder.ts). Applies to bots via SeatLine and, when isHuman, to the
  // hand row itself — the one moment the player's own arrangement is
  // deliberately overridden, since the hand is over and the tiles are now
  // there to be read rather than played. Their stored order is untouched;
  // this only changes what's drawn.
  revealOrder?: readonly number[]
  // The claimed winning discard, moved into this (winning) seat's revealed
  // display — see SeatLine.extraConcealedTiles. For the human winner it's
  // already folded into revealOrder by Board, so HandTiles needs no extra.
  revealExtraTiles?: readonly number[]
  // The tile that completed this seat's win — ring-marked at reveal.
  revealWinningTileId?: number | null
  recentMeldId?: string
}

// Phase 7 (KICKOFF-phase7-board-rebuild.md): a player's identity header plus
// ONE combined line — hand (backs for a bot) + melds + flowers together,
// stageLayout.ts's getBoardRegions(designWidth)[role].line. Discards moved
// out entirely: Board.tsx renders one shared DiscardField covering all four
// zones, since a seat's own discards no longer live in a per-seat region.
// Only concealed-back art rotates in earlier phases' table look; this phase
// keeps tile content upright everywhere (KICKOFF: "rotation... costs glyph
// readability"), so a seat's line never rotates either.
export function Seat({
  seat,
  role,
  player,
  isDealer,
  isCurrentTurn,
  isHuman,
  matchScore,
  selectedTypeId,
  handOrder,
  selectedTileId,
  onTileClick,
  onRequestDiscardTile,
  activeId,
  overId,
  onSort,
  showDiscardHint,
  justDrawnTileId,
  onInspectTile,
  revealConcealed,
  revealOrder,
  revealExtraTiles,
  revealWinningTileId,
  recentMeldId,
}: SeatProps) {
  const { designWidth } = useStageMetrics()
  const { tileScale } = useSettingsContext()
  const board = getBoardRegions(designWidth)
  const seatLine: SeatLineRegion = role === 'human' ? board.north /* unused for human, see below */ : board[role]
  const headerRegion = role === 'human' ? board.human.header : seatLine.header
  // The human's band spans the full board width beneath their own tiles and
  // is never rotated; the three bot roles carry their own (see
  // SeatLineRegion.headerRotation).
  const headerRotation = role === 'human' ? 0 : seatLine.headerRotation
  const sortRegion = { x: board.human.row.x, y: board.human.row.y, width: SORT_CONTROL_WIDTH, height: board.human.row.height }
  const handRegion = {
    x: board.human.row.x + SORT_CONTROL_WIDTH,
    y: board.human.row.y,
    width: board.human.row.width - SORT_CONTROL_WIDTH,
    height: board.human.row.height,
  }
  // HandTiles centers the playing block inside `handRegion`. Anchor the
  // controls to that block's computed left edge instead of the stage edge,
  // so the Sort button and discard instructions stay beside the first tile
  // on wide boards rather than being stranded in the far-left corner.
  const handTileCount = (handOrder?.length ?? player.hand.concealedTiles.length) + player.hand.melds.reduce((sum, meld) => sum + meld.tiles.length, 0)
  const flowerWidth = TILE_FACE_COMPACT_PX[tileScale].width
  const flowerReserve = player.hand.flowers.length > 0 ? player.hand.flowers.length * flowerWidth + (player.hand.flowers.length - 1) * 4 + 16 : 0
  const meldReserve = player.hand.melds.length > 0 ? 12 : 0
  const nominal = TILE_BOX_PX[tileScale]
  const fitted = fitRowTileWidth(handTileCount, handRegion.width - flowerReserve - meldReserve, nominal.width, nominal.height, 4, HAND_TILE_WIDTH_FLOOR)
  const groupCount = (handOrder?.length ?? player.hand.concealedTiles.length) > 0 ? 1 + player.hand.melds.length : player.hand.melds.length
  const naturalHandWidth = handTileCount > 0 ? handTileCount * fitted.width + Math.max(0, handTileCount - groupCount) * 4 + Math.max(0, groupCount - 1) * 16 : 0
  const playingWidth = handRegion.width - flowerReserve
  const firstTileLeft = handRegion.x + Math.max(0, (playingWidth - naturalHandWidth) / 2)
  const controlCenterX = Math.max(SORT_CONTROL_WIDTH / 2, firstTileLeft - 8 - SORT_CONTROL_WIDTH / 2)

  // One centered group per table edge — wind letter, badges and match score
  // together. This was previously justify-between across a full-width band,
  // which stranded the letter and the score in opposite corners with no
  // visual link between them and no obvious tie to the seat they describe.
  // Centering the whole group on the seat's own rail is what makes it read
  // as that seat's label.
  //
  // Declared here and rendered LAST (below) rather than inline at the top of
  // the tree: the side rails are the one place a band can be reached by its
  // own seat's tiles at worst-case occupancy (see stageLayout.ts's SIDE
  // HEADER PLACEMENT), and these are all absolutely positioned siblings with
  // no z-index, so DOM order is what keeps the label on top when that
  // happens.
  const identityBand = (
    <Positioned
      x={headerRegion.x + headerRegion.width / 2}
      y={headerRegion.y + headerRegion.height / 2}
      naturalWidth={headerRegion.width}
      naturalHeight={headerRegion.height}
      rotation={headerRotation}
    >
      <div className="flex h-full w-full items-center justify-center">
        {/* The chip is sized to its own content rather than to the band, so
            the band can stay full-edge-length (which is what centers it)
            while the visible label stays compact. The backdrop keeps it
            legible against the wood rail, and against a tile back in the
            worst-case overlap above. */}
        <div
          data-active-turn={isCurrentTurn || undefined}
          aria-current={isCurrentTurn ? 'true' : undefined}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-xs leading-none transition-[border-color,box-shadow,background-color] ${
            isCurrentTurn
              ? isHuman
                ? 'border-emerald-200 bg-emerald-950/95 text-emerald-200 shadow-[0_0_14px_rgba(110,231,183,0.52)]'
                : 'border-emerald-400 bg-neutral-950/90 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.34)]'
              : 'border-transparent bg-neutral-950/75 text-neutral-300'
          }`}
        >
          <span data-testid={`seat-${seat}-wind`} className="font-semibold">
            {WIND_NAME[player.seatWind]}
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
          {/* Labelled rather than a bare number: the score used to be the
              only unlabelled figure on the board, and "35" next to a wind
              letter reads just as easily as this hand's points, the seat's
              fan, or a tile count. Kept as a separate span from the number so
              the number stays independently addressable (seat-N-score) and
              can carry its own mono/tabular treatment. */}
          <span className="text-neutral-400">Overall Score:</span>
          <span data-testid={`seat-${seat}-score`} className="font-mono" title="Cumulative match score across every hand this session">
            {matchScore}
          </span>
        </div>
      </div>
    </Positioned>
  )

  return (
    <div data-testid={`seat-${seat}`} aria-label={`Seat ${seat}${isHuman ? ' (you)' : ''}`}>
      {isHuman ? (
        <>
          {onSort && (
            <>
              <Positioned
                x={controlCenterX}
                y={sortRegion.y + SORT_BUTTON_TOP + SORT_CONTROL_HEIGHT / 2}
                naturalWidth={SORT_CONTROL_WIDTH}
                naturalHeight={SORT_CONTROL_HEIGHT}
              >
                <SortToolbar onSort={onSort} />
              </Positioned>
              {showDiscardHint && (
                <Positioned
                  x={controlCenterX}
                  y={sortRegion.y + DISCARD_HINT_TOP + DISCARD_HINT_HEIGHT / 2}
                  naturalWidth={SORT_CONTROL_WIDTH}
                  naturalHeight={DISCARD_HINT_HEIGHT}
                  className="pointer-events-none z-30"
                >
                  <DiscardHint visible />
                </Positioned>
              )}
            </>
          )}
          <HandTiles
            // At reveal the player's own arrangement is replaced by the
            // read-oriented one (suit-sorted, or the winning groups if they
            // won). This is a render-time substitution only — handOrder,
            // which is the player's actual stored order, is not written to,
            // so nothing about CLAUDE.md's "never auto-sort" rule is
            // violated: the engine and the stored order both stay untouched
            // and the next deal starts clean either way.
            order={(revealConcealed ? revealOrder : undefined) ?? handOrder ?? []}
            region={onSort ? handRegion : board.human.row}
            melds={player.hand.melds}
            flowers={player.hand.flowers}
            activeId={activeId ?? null}
            overId={overId ?? null}
            onTileClick={onTileClick}
            onRequestDiscardTile={onRequestDiscardTile}
            selectedTileId={selectedTileId}
            highlightedTypeId={selectedTypeId}
            justDrawnTileId={justDrawnTileId}
            winningTileId={revealConcealed ? revealWinningTileId : undefined}
            recentMeldId={recentMeldId}
          />
        </>
      ) : (
        <SeatLine
          seat={seat}
          hand={player.hand}
          region={seatLine.line}
          flowerRegion={seatLine.flowers}
          flowerAxis="horizontal"
          grid={
            role === 'north'
              ? { columns: 18, rows: 1, axis: 'horizontal' }
              : { columns: 2, rows: 9, axis: 'vertical', rotation: role === 'west' ? 90 : -90 }
          }
          revealConcealed={revealConcealed}
          concealedOrder={revealOrder}
          extraConcealedTiles={revealExtraTiles}
          winningTileId={revealWinningTileId}
          meldShiftDirection={SEAT_MELD_SHIFT[role as SeatRole]}
          selectedTypeId={selectedTypeId}
          onTileClick={onInspectTile}
          recentMeldId={recentMeldId}
        />
      )}

      {identityBand}
    </div>
  )
}
