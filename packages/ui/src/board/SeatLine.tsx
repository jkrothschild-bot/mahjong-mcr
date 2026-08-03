import { typeIdOfInstance, type Hand, type TileInstanceId } from '@mahjong-mcr/engine'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { Positioned } from '../stage/Positioned.js'
import { computeRowPositions, fitGridTileWidth, fitRowTileWidth, packGroupsMajor, placeGroup, type Rect } from '../stage/stageLayout.js'
import {
  MELD_SHELF_CLASSES,
  SEAT_LINE_MELD_SHELF_PAD_PX,
  SEAT_LINE_PX,
  SEAT_LINE_WIDTH_FLOOR,
  WINNING_TILE_RING_CLASSES,
  seatLineBackClassName,
  seatLineFaceClassName,
  seatLineMeldFaceClassName,
} from '../tiles/tileStyles.js'
import { TileBackContent } from '../tiles/TileBackContent.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'

const TILE_GAP = 4
// North's own worst case (KICKOFF-phase7-board-rebuild.md: "23-25 tiles" —
// 16 melded + 1 concealed + up to 8 flowers). Solved against THIS constant,
// never the live `flat.length`, so a seat's line is pre-sized for its
// worst case up front and never reflows as melds/flowers actually
// accumulate (CLAUDE.md's "overflow is additive, never rescaling").
const NORTH_WORST_CASE_COUNT = 25

export interface SeatLineProps {
  seat: number
  hand: Hand
  region: Rect
  // {columns:3, rows:9} for west/east (KICKOFF-phase7-board-rebuild.md's
  // "3 columns x 9 rows", filled column-major — down one column, then the
  // next, matching how a physically-stacked hand actually grows); omitted
  // for north (a single row — "north seat: one row").
  grid?: { columns: number; rows: number }
  // Once a hand ends (win or exhaustive draw), every seat's concealed tiles
  // turn face-up for review — real tile faces instead of backs, same as an
  // already-revealed meld. Defaults to false (normal mid-hand concealment).
  revealConcealed?: boolean
  // Display order for the concealed block, used ONLY while revealConcealed
  // is true (revealOrder.ts): suit-sorted for a losing seat, laid out in its
  // real winning groups for the winner. Ignored otherwise — mid-hand the
  // tiles are backs and their order carries no information, so reordering
  // them then would be a gratuitous animation of identical rectangles.
  // Falls back to the hand's own order if absent or if it doesn't cover the
  // hand exactly (see the reconciliation in the body).
  concealedOrder?: readonly TileInstanceId[]
  // Which way this seat's revealed melds are nudged, perpendicular to its own
  // line — always toward the table centre, so Seat.tsx derives the sign from
  // the seat's role rather than SeatLine guessing from `grid`. Ignored unless
  // revealConcealed.
  meldShiftDirection?: { dx: number; dy: number }
  // A tile drawn with this seat's revealed hand that is NOT in
  // hand.concealedTiles — the claimed winning discard, moved here for
  // display at reveal (Board.tsx removes it from DiscardField's river in the
  // same render, so it exists exactly once on screen and its layoutId
  // animates the move). Engine state untouched. Only used at reveal.
  extraConcealedTiles?: readonly TileInstanceId[]
  // The tile that completed the win — gets WINNING_TILE_RING_CLASSES so the
  // player can see exactly which tile did it. Only meaningful at reveal.
  winningTileId?: TileInstanceId | null
  selectedTypeId?: string
  onTileClick?: (id: TileInstanceId) => void
}

interface FlatTile {
  id: TileInstanceId
  // 'back' — a genuinely concealed hand tile, identity hidden from the
  // player entirely. 'face' — an ordinary exposed tile (meld, flower, or a
  // concealedTiles entry once revealConcealed reveals the whole hand).
  // 'kongBack' — one of a concealed kong's own two face-down outer tiles
  // (KICKOFF-phase9-human-melds.md item 4): rendered back-side purely for
  // physical authenticity, not to hide information — a kong is always 4
  // identical tiles, so the meld's other 2 (always face-up) already reveal
  // the type. The tile inspector/highlighting treat it exactly like 'face'
  // below (typeId is derived for it, onClick stays wired) — that's the
  // recorded ruling on KICKOFF's own open question about whether this leaks
  // information: it can't, the type is already known from its face-up
  // siblings in the same meld.
  kind: 'back' | 'face' | 'kongBack'
  testId: string
  // Set for meld tiles only — drives the revealed-meld treatment (shelf,
  // flattened tile, perpendicular nudge). Undefined for concealed tiles and
  // flowers, which get none of it.
  meldId?: string
}

// Phase 7 (KICKOFF-phase7-board-rebuild.md): a bot seat's concealed hand,
// revealed melds, and flowers all share ONE line — replacing Phase 5's
// separate melds+backs region (and its own now-superseded backs-only
// ConcealedBacks.tsx before that) with a single flat sequence laid into a
// fixed grid. Unlike the human row (HandTiles.tsx), nothing here is
// draggable or reorderable — a bot's own tile order is never player state
// — so a plain computeGridPositions/computeRowPositions pass is enough; no
// dnd-kit, no sortable context. Melds keep their per-meld test id (not
// visually separated from backs/flowers in this compact context — the
// human row is where a visible gap actually matters, per KICKOFF).
// Guards the reveal order against ever losing or duplicating a tile: a
// display order is only used if it's exactly the hand's own tile set. Any
// mismatch (a stale order from the previous hand arriving one render before
// the new hand's tiles, say) falls back to the engine's order rather than
// rendering a hand that's missing a tile — CLAUDE.md's stable-ID rule means
// a dropped ID is a dropped tile, not just a cosmetic glitch.
function safeOrder(
  concealedTiles: readonly TileInstanceId[],
  order: readonly TileInstanceId[] | undefined,
): readonly TileInstanceId[] {
  if (!order || order.length !== concealedTiles.length) return concealedTiles
  const actual = new Set(concealedTiles)
  return order.every((id) => actual.has(id)) ? order : concealedTiles
}

export function SeatLine({
  seat,
  hand,
  region,
  grid,
  revealConcealed,
  concealedOrder,
  meldShiftDirection,
  extraConcealedTiles,
  winningTileId,
  selectedTypeId,
  onTileClick,
}: SeatLineProps) {
  const { tileScale } = useSettingsContext()
  const nominal = SEAT_LINE_PX[tileScale]
  // West/east's own region.width (SIDE_WIDTH) happens to be a true
  // constant regardless of designWidth, but solving it the same way north
  // does keeps every seat line on one code path rather than two, and
  // stays correct even if that ever changes.
  const { width: tileWidth, height: tileHeight } = grid
    ? fitGridTileWidth(grid.columns, region.width, nominal.width, nominal.height, TILE_GAP, SEAT_LINE_WIDTH_FLOOR)
    : fitRowTileWidth(NORTH_WORST_CASE_COUNT, region.width, nominal.width, nominal.height, TILE_GAP, SEAT_LINE_WIDTH_FLOOR)

  // The claimed winning discard joins the concealed block for display at
  // reveal — appended BEFORE the safeOrder guard so a concealedOrder that
  // includes it (Board.tsx's revealOrder does) passes the exact-set check.
  const baseConcealed =
    revealConcealed && extraConcealedTiles?.length ? [...hand.concealedTiles, ...extraConcealedTiles] : hand.concealedTiles
  const concealed = revealConcealed ? safeOrder(baseConcealed, concealedOrder) : baseConcealed

  const winningRing = ` ${WINNING_TILE_RING_CLASSES}`

  const flat: FlatTile[] = [
    ...concealed.map((id): FlatTile =>
      revealConcealed
        ? { id, kind: 'face', testId: `seat-${seat}-revealed-${id}` }
        : { id, kind: 'back', testId: `seat-${seat}-back-${id}` },
    ),
    ...hand.melds.flatMap((meld) =>
      meld.tiles.map((id, i): FlatTile => ({
        id,
        // KICKOFF-phase9-human-melds.md item 4: a concealed kong's outer two
        // tiles (index 0 and 3 of the 4; 1 and 2 are the original pung and
        // stay face-up) render back-side.
        kind: meld.kongSource === 'concealed' && (i === 0 || i === 3) ? 'kongBack' : 'face',
        testId: `meld-tile-${meld.id}-${i}`,
        meldId: meld.id,
      })),
    ),
    ...hand.flowers.map((id): FlatTile => ({ id, kind: 'face', testId: `flower-tile-${id}` })),
  ]
  if (flat.length === 0) return null

  // Group sizes matching `flat` exactly, in the same order — each meld one
  // atomic group, every concealed tile and flower its own size-1 group (see
  // the packing comment below for why they must NOT be one block). Mirrors
  // how HandTiles.tsx builds its own `groups` for the human row.
  const groups: number[] = [
    ...concealed.map(() => 1),
    ...hand.melds.map((meld) => meld.tiles.length),
    ...hand.flowers.map(() => 1),
  ]

  // West/east pack GROUP-major down each column, so a meld is never split
  // across a column break.
  //
  // This replaced computeColumnMajorGridPositions, which placed tile i at
  // (col = floor(i/rows), row = i % rows) with no concept of groups at all —
  // so a meld straddled a column whenever it happened to start fewer than 3
  // (or 4, for a kong) rows from the bottom, and had to be read down one
  // column and continued at the top of the next. packGroupsMajor's whole
  // contract is that "a group is atomic: its tiles are never split across a
  // wrap", and it already supported the vertical axis; this is a swap to an
  // existing primitive, not new packing logic. North is untouched: it's a
  // single row, so nothing can straddle there.
  //
  // Three deliberate details:
  //
  // 1. Concealed tiles and flowers are size-1 groups, NOT one atomic block.
  //    A 13-back concealed hand as a single group of 13 could never fit a
  //    9-row column, and packGroupsMajor places an oversized group in full
  //    and lets fitScale shrink it — which would shrink every tile in the
  //    seat, exactly the regression SEAT_LINE_PX's >=10% bump exists to
  //    prevent. Concealed tiles flowing across a column break is fine: they
  //    are identical backs mid-hand and a sorted run at reveal.
  // 2. interGap === intraGap (both TILE_GAP). The human row uses a larger
  //    inter-group gap for rhythm, but here it would cost real height: the
  //    worst-case column (1 concealed + 2 kongs) is 572px of a 600px
  //    budget at a uniform 4px gap, and only 596px at 16px. The meld shelf
  //    now carries that visual separation instead.
  // 3. Tile SIZE still comes from fitGridTileWidth's column count, never the
  //    tile count, so it can't move as melds are claimed mid-hand
  //    (CLAUDE.md: layout never reflows mid-hand).
  const layout = grid
    ? packGroupsMajor(groups, 'vertical', region, tileWidth, tileHeight, TILE_GAP, TILE_GAP, TILE_GAP)
    : computeRowPositions(flat.length, region, tileWidth, tileHeight, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)

  // Revealed-meld treatment, the bot-seat counterpart of the human row's own
  // (KICKOFF-phase9-human-melds.md items 1-3). Only once the hand is revealed:
  // mid-hand, indigo backs vs. neutral faces already tell melds apart, and it
  // is exactly at reveal — when every tile turns face-up — that a bot's melds
  // become indistinguishable from its concealed tiles. The seat line has no
  // MELD_GAP either (one uniform TILE_GAP throughout), so without this there
  // is no cue at all.
  const meldShift = revealConcealed ? (meldShiftDirection ?? { dx: 0, dy: 0 }) : { dx: 0, dy: 0 }

  // One shelf per meld, spanning that meld's own tiles.
  //
  // This was previously one shelf per contiguous RUN, because a meld could
  // straddle a column and a single rectangle would then have enclosed
  // unrelated tiles from the column in between. packGroupsMajor's atomicity
  // removes that case entirely — a meld's tiles are always contiguous along
  // one column (grid) or one row (north) — so the run bookkeeping is gone
  // and the rect derives straight from the meld's first and last placed
  // tile. If a future layout change reintroduces splitting, this rect goes
  // wrong visibly rather than silently, and the test named for it fails.
  const shelves = revealConcealed
    ? hand.melds.flatMap((meld) => {
        const indices = flat.flatMap((tile, index) => (tile.meldId === meld.id ? [index] : []))
        if (indices.length === 0) return []
        const first = placed[indices[0]!]!
        const last = placed[indices[indices.length - 1]!]!
        const pad = SEAT_LINE_MELD_SHELF_PAD_PX
        // Along the fill axis the meld spans its own tile count; across it,
        // exactly one tile.
        const along = indices.length * (grid ? tileHeight : tileWidth) + (indices.length - 1) * TILE_GAP
        return [
          {
            meldId: meld.id,
            x: (first.x + last.x) / 2 + meldShift.dx * layout.scale,
            y: (first.y + last.y) / 2 + meldShift.dy * layout.scale,
            width: (grid ? tileWidth : along) + 2 * pad,
            height: (grid ? along : tileHeight) + 2 * pad,
          },
        ]
      })
    : []

  return (
    <div role="list" aria-label={`Seat ${seat} hand`}>
      {/* Rendered before the tiles so it sits behind them — absolutely
          positioned siblings with no z-index, same as HandTiles' own shelf.
          Background only: its size is derived from the already-solved
          tileWidth/tileHeight and never fed back into the fit solve. */}
      {shelves.map((shelf) => (
        <Positioned
          key={shelf.meldId}
          x={shelf.x}
          y={shelf.y}
          naturalWidth={shelf.width}
          naturalHeight={shelf.height}
          scale={layout.scale}
        >
          <div aria-hidden data-testid={`seat-${seat}-meld-shelf-${shelf.meldId}`} className={`h-full w-full ${MELD_SHELF_CLASSES}`} />
        </Positioned>
      ))}
      {flat.map((tile, index) => {
        const p = placed[index]!
        const typeId = tile.kind !== 'back' ? typeIdOfInstance(tile.id) : undefined
        const shift = tile.meldId ? meldShift : { dx: 0, dy: 0 }
        // A CSS transform on the tile's own div, never a change to the
        // placed x/y — the packer's and placeGroup's math (and therefore the
        // fit solve and the golden geometry tests) stays untouched, exactly
        // as the human row does it.
        const meldTransform =
          shift.dx || shift.dy ? { transform: `translate(${shift.dx}px, ${shift.dy}px)` } : undefined
        return (
          <Positioned
            key={tile.id}
            layoutId={String(tile.id)}
            x={p.x}
            y={p.y}
            naturalWidth={tileWidth}
            naturalHeight={tileHeight}
            scale={layout.scale}
          >
            {tile.kind === 'back' ? (
              <div
                data-testid={tile.testId}
                role="listitem"
                style={{ width: tileWidth, height: tileHeight }}
                className={seatLineBackClassName({ scale: tileScale })}
              >
                <TileBackContent />
              </div>
            ) : (
              <div
                data-tile-id={tile.id}
                data-testid={tile.testId}
                role="listitem"
                onClick={onTileClick ? () => onTileClick(tile.id) : undefined}
                title={revealConcealed && tile.id === winningTileId ? 'Winning tile' : undefined}
                style={{ width: tileWidth, height: tileHeight, ...meldTransform }}
                className={
                  tile.kind === 'kongBack'
                    ? seatLineBackClassName({
                        highlighted: selectedTypeId === typeId,
                        extra: onTileClick ? 'cursor-pointer' : undefined,
                        scale: tileScale,
                      })
                    : tile.meldId && revealConcealed
                      ? seatLineMeldFaceClassName({
                          highlighted: selectedTypeId === typeId,
                          extra: `${onTileClick ? 'cursor-pointer' : ''}${revealConcealed && tile.id === winningTileId ? winningRing : ''}`,
                          scale: tileScale,
                        })
                      : seatLineFaceClassName({
                          highlighted: selectedTypeId === typeId,
                          extra: `${onTileClick ? 'cursor-pointer' : ''}${revealConcealed && tile.id === winningTileId ? winningRing : ''}`,
                          scale: tileScale,
                        })
                }
              >
                {tile.kind === 'kongBack' ? <TileBackContent /> : <TileFaceContent typeId={typeId!} />}
              </div>
            )}
          </Positioned>
        )
      })}
    </div>
  )
}
