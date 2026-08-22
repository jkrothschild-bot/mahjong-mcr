import { typeIdOfInstance, type Hand, type TileInstanceId } from '@mahjong-mcr/engine'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { Positioned } from '../stage/Positioned.js'
import { computeGridPositions, fitGridTileWidth, packGroupsMajor, placeGroup, type GroupLayout, type Rect } from '../stage/stageLayout.js'
import {
  MELD_SHELF_CLASSES,
  SEAT_LINE_MELD_SHELF_PAD_PX,
  SEAT_LINE_PX,
  SEAT_LINE_WIDTH_FLOOR,
  TILE_FACE_COMPACT_PX,
  WINNING_TILE_RING_CLASSES,
  seatLineBackClassName,
  seatLineFaceClassName,
  seatLineMeldFaceClassName,
  tileFaceCompactClassName,
} from '../tiles/tileStyles.js'
import { TileBackContent } from '../tiles/TileBackContent.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'

const TILE_GAP = 4
const RACK_PAD = 2

// A side rack has two fixed columns of nine tile slots. Sequential
// group-major packing can waste a whole column in the legal transient
// maximum [1 concealed, 1 drawn, 4, 4, 4, 4]: the two singles at the start
// leave neither column with room for two intact kongs. Assigning each
// concealed/meld group to the currently shorter column instead yields the
// exact legal split 1+4+4 / 1+4+4, keeps every meld whole, and never needs a
// third column. North remains ordinary left-to-right group-major packing.
function packBalancedSideColumns(
  groupSizes: readonly number[],
  columns: number,
  region: Rect,
  tileWidth: number,
  tileHeight: number,
  gap: number,
): GroupLayout {
  if (groupSizes.length === 0) return { positions: [], scale: 1, naturalWidth: 0, naturalHeight: 0 }

  const usedHeights = Array.from({ length: columns }, () => 0)
  const positions: { x: number; y: number }[] = []
  let highestColumn = 0

  for (const size of groupSizes) {
    const groupHeight = size * tileHeight + (size - 1) * gap
    let column = 0
    for (let candidate = 1; candidate < columns; candidate++) {
      if (usedHeights[candidate]! < usedHeights[column]!) column = candidate
    }
    const startY = usedHeights[column]! > 0 ? usedHeights[column]! + gap : 0
    for (let i = 0; i < size; i++) {
      positions.push({ x: column * (tileWidth + gap), y: startY + i * (tileHeight + gap) })
    }
    usedHeights[column] = startY + groupHeight
    highestColumn = Math.max(highestColumn, column)
  }

  const naturalWidth = (highestColumn + 1) * tileWidth + highestColumn * gap
  const naturalHeight = Math.max(...usedHeights)
  const scale = Math.min(1, region.width / naturalWidth, region.height / naturalHeight)
  return { positions, scale, naturalWidth, naturalHeight }
}

// At reveal, the concealed order is already four readable sets followed by
// the pair. Keep those groups contiguous and split only BETWEEN groups, with
// the first run placed in the physical outer column. This avoids the normal
// live-hand balancer interleaving 2-3-4 / 3-4-5 / etc. across both columns.
function packRevealedSideColumns(
  groupSizes: readonly number[],
  outerColumn: number,
  region: Rect,
  tileWidth: number,
  tileHeight: number,
  gap: number,
): GroupLayout {
  if (groupSizes.length === 0) return { positions: [], scale: 1, naturalWidth: 0, naturalHeight: 0 }
  let split = 1
  let bestDifference = Number.POSITIVE_INFINITY
  for (let candidate = 1; candidate < groupSizes.length; candidate++) {
    const first = groupSizes.slice(0, candidate).reduce((sum, size) => sum + size, 0)
    const second = groupSizes.slice(candidate).reduce((sum, size) => sum + size, 0)
    const difference = Math.abs(first - second)
    if (difference < bestDifference) {
      bestDifference = difference
      split = candidate
    }
  }

  const columns = [groupSizes.slice(0, split), groupSizes.slice(split)]
  const positions: { x: number; y: number }[] = []
  const usedHeights: number[] = []
  for (let logicalColumn = 0; logicalColumn < columns.length; logicalColumn++) {
    const physicalColumn = logicalColumn === 0 ? outerColumn : 1 - outerColumn
    let cursor = 0
    for (const size of columns[logicalColumn]!) {
      for (let i = 0; i < size; i++) {
        positions.push({ x: physicalColumn * (tileWidth + gap), y: cursor + i * (tileHeight + gap) })
      }
      cursor += size * tileHeight + size * gap
    }
    usedHeights.push(Math.max(0, cursor - gap))
  }
  const naturalWidth = 2 * tileWidth + gap
  const naturalHeight = Math.max(...usedHeights)
  const scale = Math.min(1, region.width / naturalWidth, region.height / naturalHeight)
  return { positions, scale, naturalWidth, naturalHeight }
}

export interface SeatLineProps {
  seat: number
  hand: Hand
  region: Rect
  flowerRegion?: Rect
  flowerAxis?: 'horizontal' | 'vertical'
  // 2 columns x 9 rows for west/east; one 18-tile row for north. Flowers
  // have their own compact region and do not participate in this solve.
  grid: { columns: number; rows: number; axis?: 'horizontal' | 'vertical'; rotation?: 90 | -90 }
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
  recentMeldId?: string
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
  // The discard physically turned sideways within an exposed meld.
  claimed?: boolean
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
  flowerRegion = region,
  flowerAxis = 'horizontal',
  grid,
  revealConcealed,
  concealedOrder,
  meldShiftDirection,
  extraConcealedTiles,
  winningTileId,
  selectedTypeId,
  onTileClick,
  recentMeldId,
}: SeatLineProps) {
  const { tileScale } = useSettingsContext()
  const packAxis = grid.axis ?? 'vertical'
  const tileRotation = grid.rotation ?? 0
  const rotated = Math.abs(tileRotation) === 90
  const layoutGap = rotated ? 1 : TILE_GAP
  const nominal = SEAT_LINE_PX[tileScale]
  // West/east's own region.width (SIDE_WIDTH) happens to be a true
  // constant regardless of designWidth, but solving it the same way north
  // does keeps every seat line on one code path rather than two, and
  // stays correct even if that ever changes.
  const nominalLayoutWidth = rotated ? nominal.height : nominal.width
  const nominalLayoutHeight = rotated ? nominal.width : nominal.height
  const fittedLayout = fitGridTileWidth(
    grid.columns,
    region.width,
    nominalLayoutWidth,
    nominalLayoutHeight,
    layoutGap,
    SEAT_LINE_WIDTH_FLOOR,
  )
  const tileWidth = rotated ? fittedLayout.height : fittedLayout.width
  const tileHeight = rotated ? fittedLayout.width : fittedLayout.height
  const layoutTileWidth = fittedLayout.width
  const layoutTileHeight = fittedLayout.height

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
        claimed: meld.exposure === 'exposed' && meld.claimedFrom?.discardTile === id,
      })),
    ),
  ]
  if (flat.length === 0 && hand.flowers.length === 0) return null

  // Group sizes matching `flat` exactly, in the same order — each meld is
  // atomic and every concealed tile is its own size-1 group. Flowers have
  // an independent compact layout below.
  const regularConcealedSetCount = Math.max(0, 4 - hand.melds.length)
  const looksLikeRegularWinningShape =
    revealConcealed && hand.melds.length === 0 && concealed.length === regularConcealedSetCount * 3 + 2
  const concealedGroups = looksLikeRegularWinningShape
    ? [...Array.from({ length: regularConcealedSetCount }, () => 3), 2]
    : concealed.map(() => 1)
  const groups: number[] = [
    ...concealedGroups,
    ...hand.melds.map((meld) => meld.tiles.length),
  ]

  // West/east pack GROUP-major down each column, so a meld is never split
  // across a column break.
  //
  // A fixed item-by-item grid could split a meld around a column boundary.
  // The side-specific balanced packer keeps each group whole while sharing
  // the 18-tile maximum evenly across two columns. North uses the existing
  // group-major primitive and cannot split because it has one row.
  //
  // Three deliberate details:
  //
  // 1. Concealed tiles are size-1 groups, NOT one atomic block.
  //    A 13-back concealed hand as a single group of 13 could never fit a
  //    9-row column, and packGroupsMajor places an oversized group in full
  //    and lets fitScale shrink it — which would shrink every tile in the
  //    seat, exactly the regression SEAT_LINE_PX's >=10% bump exists to
  //    prevent. Concealed tiles flowing across a column break is fine: they
  //    are identical backs mid-hand and a sorted run at reveal.
  // 2. The rotated side rack uses a 1px gap to keep nine enlarged tiles in
  //    its fixed height; the meld shelf carries the grouping cue.
  // 3. Tile SIZE still comes from fitGridTileWidth's column count, never the
  //    tile count, so it can't move as melds are claimed mid-hand
  //    (CLAUDE.md: layout never reflows mid-hand).
  const layout = rotated
    ? revealConcealed && looksLikeRegularWinningShape
      ? packRevealedSideColumns(groups, tileRotation === -90 ? 1 : 0, region, layoutTileWidth, layoutTileHeight, layoutGap)
      : packBalancedSideColumns(groups, grid.columns, region, layoutTileWidth, layoutTileHeight, layoutGap)
    : packGroupsMajor(groups, packAxis, region, layoutTileWidth, layoutTileHeight, layoutGap, layoutGap, layoutGap)
  let placed = placeGroup(layout, region, layoutTileWidth, layoutTileHeight)

  const tileVisualWidth = (rotated ? tileHeight : tileWidth) * layout.scale
  const tileVisualHeight = (rotated ? tileWidth : tileHeight) * layout.scale
  // North's flowers belong to the same physical row as its playing tiles.
  // Derive their tray from the actual right edge of the centered main block
  // instead of stageLayout's old below-hand overlay. A fixed-column grid
  // keeps every flower on this one row; only the compact flower tiles scale
  // if the rare high-flower case exhausts the remaining side space.
  const northInlineFlowers = !rotated && packAxis === 'horizontal'
  const flowerSize = TILE_FACE_COMPACT_PX[tileScale]
  const mainLeft = placed.length > 0 ? Math.min(...placed.map((p) => p.x - tileVisualWidth / 2)) : region.x + region.width / 2
  const unshiftedMainRight = placed.length > 0 ? Math.max(...placed.map((p) => p.x + tileVisualWidth / 2)) : mainLeft
  const mainWidth = unshiftedMainRight - mainLeft
  const flowerNaturalWidth =
    hand.flowers.length > 0 ? hand.flowers.length * flowerSize.width + (hand.flowers.length - 1) * TILE_GAP : 0
  const flowerAvailableWidth = Math.max(1, region.width - mainWidth - (placed.length > 0 && hand.flowers.length > 0 ? TILE_GAP : 0))
  const inlineFlowerScale = Math.min(1, flowerAvailableWidth / Math.max(1, flowerNaturalWidth), region.height / flowerSize.height)
  const inlineFlowerWidth = flowerNaturalWidth * inlineFlowerScale
  if (northInlineFlowers && hand.flowers.length > 0) {
    // Centre the complete north rack, not the playing tiles alone. Flowers
    // are appended on the right, so centring only `placed` made the whole
    // hand look right-heavy.
    const combinedWidth = mainWidth + (placed.length > 0 ? TILE_GAP : 0) + inlineFlowerWidth
    const combinedLeft = region.x + (region.width - combinedWidth) / 2
    const shiftX = combinedLeft - mainLeft
    placed = placed.map((p) => ({ ...p, x: p.x + shiftX }))
  }
  const mainRight = placed.length > 0 ? Math.max(...placed.map((p) => p.x + tileVisualWidth / 2)) : region.x
  const effectiveFlowerRegion = northInlineFlowers
    ? {
        x: mainRight + TILE_GAP,
        y: region.y,
        width: Math.max(1, inlineFlowerWidth),
        height: region.height,
      }
    : flowerRegion
  const flowerLayout = northInlineFlowers
    ? computeGridPositions(hand.flowers.length, Math.max(1, hand.flowers.length), effectiveFlowerRegion, flowerSize.width, flowerSize.height, TILE_GAP)
    : packGroupsMajor(
        hand.flowers.map(() => 1),
        flowerAxis,
        effectiveFlowerRegion,
        flowerSize.width,
        flowerSize.height,
        TILE_GAP,
        TILE_GAP,
        TILE_GAP,
      )
  const flowerPlaced = placeGroup(flowerLayout, effectiveFlowerRegion, flowerSize.width, flowerSize.height)

  const occupied = [
    ...placed.map((p) => ({
      left: p.x - tileVisualWidth / 2,
      right: p.x + tileVisualWidth / 2,
      top: p.y - tileVisualHeight / 2,
      bottom: p.y + tileVisualHeight / 2,
    })),
    ...flowerPlaced.map((p) => ({
      left: p.x - (flowerSize.width * flowerLayout.scale) / 2,
      right: p.x + (flowerSize.width * flowerLayout.scale) / 2,
      top: p.y - (flowerSize.height * flowerLayout.scale) / 2,
      bottom: p.y + (flowerSize.height * flowerLayout.scale) / 2,
    })),
  ]
  const rackBounds = {
    left: Math.min(...occupied.map((box) => box.left)) - RACK_PAD,
    right: Math.max(...occupied.map((box) => box.right)) + RACK_PAD,
    top: Math.min(...occupied.map((box) => box.top)) - RACK_PAD,
    bottom: Math.max(...occupied.map((box) => box.bottom)) + RACK_PAD,
  }

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
        const along = indices.length * (packAxis === 'vertical' ? layoutTileHeight : layoutTileWidth) + (indices.length - 1) * layoutGap
        return [
          {
            meldId: meld.id,
            x: (first.x + last.x) / 2 + meldShift.dx * layout.scale,
            y: (first.y + last.y) / 2 + meldShift.dy * layout.scale,
            width: (packAxis === 'vertical' ? layoutTileWidth : along) + 2 * pad,
            height: (packAxis === 'vertical' ? along : layoutTileHeight) + 2 * pad,
          },
        ]
      })
    : []

  return (
    <div role="list" aria-label={`Seat ${seat} hand`}>
      <Positioned
        x={(rackBounds.left + rackBounds.right) / 2}
        y={(rackBounds.top + rackBounds.bottom) / 2}
        naturalWidth={rackBounds.right - rackBounds.left}
        naturalHeight={rackBounds.bottom - rackBounds.top}
      >
        <div
          aria-hidden
          data-testid={`seat-${seat}-wooden-rack`}
          className="relative h-full w-full overflow-hidden rounded-xl border border-[#351708] shadow-[inset_0_3px_3px_rgba(255,211,145,0.32),inset_0_-7px_8px_rgba(24,8,2,0.68),0_5px_9px_rgba(0,0,0,0.48)]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(7deg,rgba(255,218,155,0.055) 0 1px,transparent 1px 5px),linear-gradient(180deg,#8b4d25 0%,#6b3518 30%,#54250f 67%,#351508 100%)',
          }}
        >
          {rotated && (
            <>
              <div
                data-testid={`seat-${seat}-rack-column-one`}
                className="absolute inset-y-0 left-0 w-1/2 bg-[repeating-linear-gradient(12deg,rgba(255,224,169,0.08)_0_1px,transparent_1px_6px),linear-gradient(90deg,rgba(151,83,39,0.2),transparent)]"
              />
              <div
                data-testid={`seat-${seat}-rack-column-two`}
                className="absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(-8deg,rgba(35,12,4,0.09)_0_1px,transparent_1px_7px),linear-gradient(270deg,rgba(53,21,7,0.18),transparent)]"
              />
              <div
                data-testid={`seat-${seat}-rack-column-indent`}
                className="absolute bottom-[8px] left-1/2 top-[9px] w-[3px] -translate-x-1/2 bg-[linear-gradient(90deg,rgba(35,13,4,0.72),rgba(255,211,142,0.55)_50%,rgba(48,18,6,0.62))] shadow-[0_0_3px_rgba(0,0,0,0.42)]"
              />
            </>
          )}
          {/* A raised back stop and rounded front ledge give the holder a
              real sloped-rack profile instead of a flat brown rectangle. */}
          <div
            data-testid={`seat-${seat}-rack-back-lip`}
            className="absolute inset-x-0 top-0 h-[9px] border-b border-[#3c1a0a] bg-[linear-gradient(180deg,#b36f3b,#6e3518_70%,#3b1809)] shadow-[0_3px_4px_rgba(0,0,0,0.38),inset_0_1px_rgba(255,226,177,0.45)]"
          />
          <div
            data-testid={`seat-${seat}-rack-groove`}
            className="absolute inset-x-[5px] bottom-[7px] h-[5px] rounded-full border-t border-black/60 bg-[#291006]/80 shadow-[0_2px_1px_rgba(255,190,110,0.14)]"
          />
          <div
            data-testid={`seat-${seat}-rack-front-lip`}
            className="absolute inset-x-0 bottom-0 h-[8px] border-t border-[#2a1006] bg-[linear-gradient(180deg,#7d3d1b,#3a1708)] shadow-[inset_0_2px_1px_rgba(255,193,115,0.2),0_-2px_3px_rgba(0,0,0,0.28)]"
          />
        </div>
      </Positioned>
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
        // Side-seat tiles are already quarter-turned to face the table. A
        // claimed discard still needs to lie across its meld, but adding a
        // second +90° made the left seat's artwork end up at 180° (upside
        // down), while the right seat happened to land at 0°. Normalize the
        // claimed tile to 0° for either side so its face reads upright.
        const displayRotation = tile.claimed && rotated ? 0 : tileRotation + (tile.claimed ? 90 : 0)
        const recentMeldClasses = tile.meldId === recentMeldId
          ? 'ring-2 ring-amber-200 shadow-[0_0_14px_rgba(253,230,138,0.5)] transition-[box-shadow]'
          : ''
        return (
          <Positioned
            key={tile.id}
            layoutId={String(tile.id)}
            x={p.x}
            y={p.y}
            naturalWidth={tileWidth}
            naturalHeight={tileHeight}
            scale={layout.scale}
            rotation={displayRotation}
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
                data-claimed-tile={tile.claimed || undefined}
                data-recent-meld={tile.meldId === recentMeldId || undefined}
                role="listitem"
                onClick={onTileClick ? () => onTileClick(tile.id) : undefined}
                title={revealConcealed && tile.id === winningTileId ? 'Winning tile' : undefined}
                style={{ width: tileWidth, height: tileHeight, ...meldTransform }}
                className={
                  tile.kind === 'kongBack'
                    ? seatLineBackClassName({
                        highlighted: selectedTypeId === typeId,
                        extra: [onTileClick ? 'cursor-pointer' : '', recentMeldClasses].filter(Boolean).join(' '),
                        scale: tileScale,
                      })
                    : tile.meldId && revealConcealed
                      ? seatLineMeldFaceClassName({
                          highlighted: selectedTypeId === typeId,
                          extra: `${onTileClick ? 'cursor-pointer' : ''} ${recentMeldClasses}${revealConcealed && tile.id === winningTileId ? winningRing : ''}`,
                          scale: tileScale,
                        })
                      : seatLineFaceClassName({
                          highlighted: selectedTypeId === typeId,
                          extra: `${onTileClick ? 'cursor-pointer' : ''} ${recentMeldClasses}${revealConcealed && tile.id === winningTileId ? winningRing : ''}`,
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
      {hand.flowers.map((id, index) => {
        const p = flowerPlaced[index]!
        const typeId = typeIdOfInstance(id)
        return (
          <Positioned
            key={id}
            // Connect a live Flower's back-wall draw to this tray. Synthetic
            // preview mode disables shared layout for its tree, so repeated
            // preview ids cannot collide.
            layoutId={String(id)}
            x={p.x}
            y={p.y}
            naturalWidth={flowerSize.width}
            naturalHeight={flowerSize.height}
            scale={flowerLayout.scale}
            rotation={tileRotation}
          >
            <div
              data-tile-id={id}
              data-testid={`flower-tile-${id}`}
              role="listitem"
              onClick={onTileClick ? () => onTileClick(id) : undefined}
              className={tileFaceCompactClassName({
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
  )
}
