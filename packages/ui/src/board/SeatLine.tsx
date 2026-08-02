import { typeIdOfInstance, type Hand, type TileInstanceId } from '@mahjong-mcr/engine'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { Positioned } from '../stage/Positioned.js'
import { computeColumnMajorGridPositions, computeRowPositions, fitGridTileWidth, fitRowTileWidth, placeGroup, type Rect } from '../stage/stageLayout.js'
import { seatLineBackClassName, seatLineFaceClassName, SEAT_LINE_PX, SEAT_LINE_WIDTH_FLOOR } from '../tiles/tileStyles.js'
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
export function SeatLine({ seat, hand, region, grid, revealConcealed, selectedTypeId, onTileClick }: SeatLineProps) {
  const { tileScale } = useSettingsContext()
  const nominal = SEAT_LINE_PX[tileScale]
  // West/east's own region.width (SIDE_WIDTH) happens to be a true
  // constant regardless of designWidth, but solving it the same way north
  // does keeps every seat line on one code path rather than two, and
  // stays correct even if that ever changes.
  const { width: tileWidth, height: tileHeight } = grid
    ? fitGridTileWidth(grid.columns, region.width, nominal.width, nominal.height, TILE_GAP, SEAT_LINE_WIDTH_FLOOR)
    : fitRowTileWidth(NORTH_WORST_CASE_COUNT, region.width, nominal.width, nominal.height, TILE_GAP, SEAT_LINE_WIDTH_FLOOR)

  const flat: FlatTile[] = [
    ...hand.concealedTiles.map((id): FlatTile =>
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
      })),
    ),
    ...hand.flowers.map((id): FlatTile => ({ id, kind: 'face', testId: `flower-tile-${id}` })),
  ]
  if (flat.length === 0) return null

  const layout = grid
    ? computeColumnMajorGridPositions(flat.length, grid.rows, region, tileWidth, tileHeight, TILE_GAP)
    : computeRowPositions(flat.length, region, tileWidth, tileHeight, TILE_GAP)
  const placed = placeGroup(layout, region, tileWidth, tileHeight)

  return (
    <div role="list" aria-label={`Seat ${seat} hand`}>
      {flat.map((tile, index) => {
        const p = placed[index]!
        const typeId = tile.kind !== 'back' ? typeIdOfInstance(tile.id) : undefined
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
                style={{ width: tileWidth, height: tileHeight }}
                className={
                  tile.kind === 'kongBack'
                    ? seatLineBackClassName({
                        highlighted: selectedTypeId === typeId,
                        extra: onTileClick ? 'cursor-pointer' : undefined,
                        scale: tileScale,
                      })
                    : seatLineFaceClassName({
                        highlighted: selectedTypeId === typeId,
                        extra: onTileClick ? 'cursor-pointer' : undefined,
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
