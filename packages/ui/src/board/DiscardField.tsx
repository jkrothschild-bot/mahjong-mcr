import { useDroppable } from '@dnd-kit/core'
import { typeIdOfInstance, type GameState, type PlayerState, type Seat as SeatId, type TileInstanceId } from '@mahjong-mcr/engine'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { DISCARD_ZONE_ID } from '../hand/resolveReorderTarget.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { Positioned } from '../stage/Positioned.js'
import { useStageMetrics } from '../stage/StageMetricsContext.js'
import { computeGridPositions, fitGridTileWidth, getBoardRegions, placeGroup, splitDiscardZone, DISCARD_ZONE_GRID_COLUMNS } from '../stage/stageLayout.js'
import { discardFieldTileClassName, DISCARD_FIELD_PX, DISCARD_FIELD_WIDTH_FLOOR } from '../tiles/tileStyles.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'

const TILE_GAP = 4

// A zone is sized for its 5x5 (25-tile) worst case, not the rare skewed
// pile past that (table capacity 4x25=100 comfortably covers the 83-tile
// rulebook ceiling; only a single very skewed seat can exceed 25 — KICKOFF-
// phase7-board-rebuild.md's own "open point," resolved in favor of keeping
// 67px over dropping to 61px for a no-overflow 30 capacity). Passing an
// effectively unbounded height means
// that rare 26th+ tile grows the block downward past its nominal 478px grid
// height instead of uniformly shrinking every tile in the zone —
// CLAUDE.md's "overflow is additive, never rescaling" rule, applied here
// exactly as it is everywhere else in this project.
const UNBOUNDED_HEIGHT = 100_000

type ZoneKey = 'west' | 'you' | 'north' | 'east'
const ZONE_OFFSETS: Record<ZoneKey, number> = { west: 1, you: 0, north: 2, east: 3 }
const ZONE_ORDER: readonly ZoneKey[] = ['west', 'you', 'north', 'east']
// "West"/"North"/"East" (this file's own internal zone keys, matching
// stageLayout.ts's screen-position naming) would collide visually with seat
// WIND labels, which are also compass words — "West — South" reads as two
// different compass directions with no cue which is which. Matches
// the position wording the removed "All discards" overlay established
// (Left/Across/Right/You) instead — no longer shown in the on-board label itself (wind
// alone is unambiguous there, see that render below), but kept for the
// discards list's own aria-label, where "who is this" still needs a
// non-compass word.
const ZONE_POSITION_LABEL: Record<ZoneKey, string> = { west: 'Left', you: 'You', north: 'Across', east: 'Right' }

function seatForOffset(offset: number): SeatId {
  return ((offset + HUMAN_SEAT) % 4) as SeatId
}

function windLabel(player: PlayerState): string {
  return player.seatWind.charAt(0).toUpperCase() + player.seatWind.slice(1)
}

export interface DiscardFieldProps {
  state: GameState
  selectedTypeId?: string
  onTileClick?: (id: TileInstanceId) => void
  // At reveal, a hand won off a discard shows the claimed tile WITH the
  // winner's hand (Board.tsx moves it there for display; the engine state is
  // untouched), so this river must not render it too — same id in two places
  // would also collide the two Positioned layoutIds. Safe against the fixed-
  // grid/no-reflow rule because the winning discard is by construction the
  // LAST tile of the discarder's river (the win claim happens on it
  // immediately): omitting the last tile moves no other tile's grid slot.
  omitTileId?: TileInstanceId | null
}

// Phase 7 (KICKOFF-phase7-board-rebuild.md): the discard pile stops being
// four independently-reserved per-seat regions (Phase 3-6's frame/
// concentric arrangements, both of which left dead space no seat could use)
// and becomes ONE shared field, four zones that tile it completely. Zone
// assignment is fixed screen position (west/you/north/east), not tied to
// which physical seat currently holds which wind — a zone's label is what
// tells you whose pile it is (KICKOFF: "labels are the attribution
// mechanism — seat colour-coding was evaluated and rejected").
//
// No fixed group size here (KICKOFF's explicit instruction) — a plain 5-
// column grid via computeGridPositions, the same primitive Phase 1's
// original discard grid used, not Phase 4's group-major packing (that
// primitive exists for content with real grouping semantics — melds,
// discard "rhythm" — which this field deliberately doesn't have anymore).
//
// Reads designWidth via useStageMetrics() itself rather than taking
// `regions` as a prop — see WallRing.tsx's comment for why: this component
// is rendered inside <GameStage>'s children (inside the
// StageMetricsContext Provider boundary), but Board.tsx (which renders
// GameStage) is not, so a parent-computed prop would have silently read
// the context's MIN_DESIGN_WIDTH default at every viewport.
export function DiscardField({ state, selectedTypeId, onTileClick, omitTileId }: DiscardFieldProps) {
  const { tileScale } = useSettingsContext()
  const { designWidth } = useStageMetrics()
  const regions = getBoardRegions(designWidth).discards
  const nominal = DISCARD_FIELD_PX[tileScale]
  // The discard drag target is the WHOLE shared field (all four zones —
  // west/you/north/east tile it completely, left to right, per
  // getBoardRegions), not just the "you" sub-zone: a hand tile dropped
  // anywhere within the wall ring's own boundary counts as a discard, not
  // only when dropped precisely on your own pile. Registers with whichever
  // DndContext is the nearest ancestor — Board.tsx's lifted one, since this
  // component is rendered as a <GameStage> sibling of the human's own
  // HandTiles, not a descendant of it.
  const { setNodeRef: setDiscardZoneRef, isOver: isDiscardZoneOver } = useDroppable({ id: DISCARD_ZONE_ID })
  const fieldRect = {
    x: regions.west.x,
    y: regions.west.y,
    width: regions.east.x + regions.east.width - regions.west.x,
    height: regions.west.height,
  }
  // All 4 zones are exactly fieldWidth/4 wide (splitDiscardZone only cuts
  // off the label band, not the width) — solved once, from whichever zone,
  // rather than per-zone. Column count (5), not tile count, drives this —
  // see fitGridTileWidth's own comment for why that's what keeps a growing
  // discard pile from ever re-triggering this solve mid-hand.
  const { width: tileWidth, height: tileHeight } = fitGridTileWidth(
    DISCARD_ZONE_GRID_COLUMNS,
    splitDiscardZone(regions.west).grid.width,
    nominal.width,
    nominal.height,
    TILE_GAP,
    DISCARD_FIELD_WIDTH_FLOOR,
  )

  return (
    <div aria-label="Discard field">
      {/* A drop target needs a real bounding box for dnd-kit's collision
          detection — sized to the FULL field (every zone's label band +
          grid combined), not just "your" own zone, so dropping anywhere in
          the shared discard area counts. Rendered once, first in DOM (i.e.
          behind every zone's own labels/tiles, which are absolutely
          positioned siblings with no z-index) so it never intercepts a
          click meant for an actual discard tile — those still paint on top
          and keep their own onClick. */}
      <Positioned
        x={fieldRect.x + fieldRect.width / 2}
        y={fieldRect.y + fieldRect.height / 2}
        naturalWidth={fieldRect.width}
        naturalHeight={fieldRect.height}
      >
        <div
          ref={setDiscardZoneRef}
          data-testid="discard-zone-drop-target"
          aria-hidden
          className={`h-full w-full rounded-md transition-colors ${isDiscardZoneOver ? 'bg-sky-400/15 ring-2 ring-sky-400' : ''}`}
        />
      </Positioned>
      {ZONE_ORDER.map((zoneKey) => {
        const seat = seatForOffset(ZONE_OFFSETS[zoneKey])
        const player = state.players[seat]!
        const discards = omitTileId != null ? player.discards.filter((id) => id !== omitTileId) : player.discards
        const { label, grid } = splitDiscardZone(regions[zoneKey])
        const layout = computeGridPositions(
          discards.length,
          DISCARD_ZONE_GRID_COLUMNS,
          { width: grid.width, height: UNBOUNDED_HEIGHT },
          tileWidth,
          tileHeight,
          TILE_GAP,
        )
        const placed = placeGroup(layout, grid, tileWidth, tileHeight)

        return (
          <div key={zoneKey} data-testid={`discard-zone-${zoneKey}`}>
            <Positioned
              x={label.x + label.width / 2}
              y={label.y + label.height / 2}
              naturalWidth={label.width}
              naturalHeight={label.height}
            >
              <div
                data-testid={`discard-zone-label-${zoneKey}`}
                className="w-full truncate text-center text-xs font-semibold text-neutral-300"
              >
                {/* Wind alone identifies a pile unambiguously (no two seats
                    share a wind) — the "Left"/"Across"/"Right" position word
                    was redundant noise once you already know the wind.
                    "You" stays, but as a trailing qualifier on your own real
                    wind ("East (You)") rather than replacing it outright, so
                    every other zone's "just the wind" reads consistently. */}
                {windLabel(player)}
                {zoneKey === 'you' && ' (You)'}
              </div>
            </Positioned>
            <div role="list" aria-label={`${ZONE_POSITION_LABEL[zoneKey]} discards`}>
              {discards.map((id, index) => {
                const typeId = typeIdOfInstance(id)
                const p = placed[index]!
                return (
                  <Positioned
                    key={id}
                    layoutId={String(id)}
                    x={p.x}
                    y={p.y}
                    naturalWidth={tileWidth}
                    naturalHeight={tileHeight}
                    scale={layout.scale}
                  >
                    <div
                      data-tile-id={id}
                      data-testid={`discard-tile-${id}`}
                      role="listitem"
                      onClick={onTileClick ? () => onTileClick(id) : undefined}
                      // width/height override discardFieldTileClassName's own
                      // Tailwind size class — same reasoning as HandTiles.tsx's
                      // shrink-to-fit override (Tailwind's JIT can't generate
                      // an arbitrary-value class from a runtime number).
                      style={{ width: tileWidth, height: tileHeight }}
                      className={discardFieldTileClassName({
                        highlighted: selectedTypeId === typeId,
                        extra: onTileClick ? 'cursor-pointer' : undefined,
                        scale: tileScale,
                      })}
                    >
                      <TileFaceContent typeId={typeId} />
                    </div>
                  </Positioned>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
