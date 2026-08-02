import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { typeIdOfInstance, type GameState, type PlayerState, type Seat as SeatId } from '@mahjong-mcr/engine'
import { HUMAN_SEAT } from '../game/humanSeat.js'
import { fitRowTileWidth, packGroupsMajor, uniformGroupSizes, type SeatOffset } from '../stage/stageLayout.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { HAND_TILE_WIDTH_FLOOR, TILE_BOX_PX, TILE_JUST_DRAWN_RING_CLASSES, tileFaceClassName } from '../tiles/tileStyles.js'

export interface DiscardOverlayProps {
  open: boolean
  state: GameState
  onClose: () => void
}

const GROUP_SIZE = 6 // CLAUDE.md's discard-group rhythm — see that rule's own history
const INTRA_GAP = 4
const INTER_GAP = 14 // visibly larger than INTRA_GAP: the group rhythm now lives in this gap, not a hard column count
const BAND_GAP = 10

// "Order them to match table position (across at top, then left and right,
// human at bottom)" (KICKOFF-phase4-discard-overlay.md) — horizontal bands
// lose the table's spatial who-threw-it mapping, so both position and seat
// wind are labelled per band rather than relying on layout alone. The wind
// is read directly off each PlayerState (not seatDisplayName, which special-
// cases the human seat to always say "You" — fine for ScoreScreen/
// CallOutToast's single-label use, but paired with our own "You" position
// label here it would read as "You — You"; showing the human's actual
// current wind alongside "You" is more informative, not less).
const DISPLAY_OFFSETS: readonly SeatOffset[] = [2, 1, 3, 0]
const OFFSET_POSITION_LABEL: Record<SeatOffset, string> = { 0: 'You', 1: 'Left', 2: 'Across', 3: 'Right' }

function seatForOffset(offset: SeatOffset): SeatId {
  return ((offset + HUMAN_SEAT) % 4) as SeatId
}

function windLabel(player: PlayerState): string {
  return player.seatWind.charAt(0).toUpperCase() + player.seatWind.slice(1)
}

// Always targets large's hand-tile size as the nominal starting point,
// regardless of the player's own live tileScale setting — this is a
// dedicated "let me see this clearly" affordance, independent of the
// day-to-day board preference (KICKOFF-phase4-discard-overlay.md test 2:
// "overlay layout is independent of designWidth and tileScale"). Shrinks
// from there via fitRowTileWidth, same floor as everywhere else.
const NOMINAL_TILE = TILE_BOX_PX.large

// A generously tall region — packGroupsMajor should never wrap vertically
// here (bands stack purely because a band's own width ran out, per the
// group-major rule), so height never becomes the binding fitScale term.
// The overlay's own scroll container (not this) is what absorbs a band
// that genuinely grows past a comfortable viewport height.
const UNBOUNDED_HEIGHT = 100_000

// KICKOFF-phase4-discard-overlay.md: all four players' discards at once,
// enlarged to (up to) hand-tile size — reusing the group-major packing
// primitive (stageLayout.ts's packGroupsMajor) built for this. Rendered
// OUTSIDE GameStage's transform (App.tsx mounts this as a sibling of
// <Board>, same as ScoreScreen/TileCountGrid/etc. already are) — critically,
// NOT nested inside it: an ancestor's non-integer CSS transform is the exact
// mechanism that caused this project's earlier tile-blur bug (Tile3DFace's
// rotateX), and staying outside the transform is also what gives this
// overlay the whole viewport instead of DESIGN_HEIGHT's fixed middle band,
// which is the entire reason it can be readable when the table can't.
export function DiscardOverlay({ open, state, onClose }: DiscardOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

  useLayoutEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return
    const apply = (width: number) => setContentWidth(width)
    apply(el.clientWidth)
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) apply(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  // Floor-clamped so at least one 6-tile group fits the measured width
  // without ever rendering below HAND_TILE_WIDTH_FLOOR — the same floor
  // Phase 2.2's hand-fit uses, unchanged, per this doc's own constraint.
  const { width: tileWidth, height: tileHeight } =
    contentWidth > 0
      ? fitRowTileWidth(GROUP_SIZE, contentWidth, NOMINAL_TILE.width, NOMINAL_TILE.height, INTRA_GAP, HAND_TILE_WIDTH_FLOOR)
      : NOMINAL_TILE

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      data-testid="discard-overlay"
    >
      <div
        role="dialog"
        aria-label="All discards"
        ref={containerRef}
        className="flex max-h-full w-full max-w-[1900px] flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-900 p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Discards — all seats</h2>
          <button
            type="button"
            // stopPropagation: without it this bubbles to the backdrop's own
            // onClick={onClose} below (the header row isn't inside any
            // band's own stopPropagation), double-firing onClose. Harmless
            // for a boolean toggle, but not clean, and a real bug if onClose
            // ever gets a side effect beyond idempotent state.
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            data-testid="discard-overlay-close"
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

        {DISPLAY_OFFSETS.map((offset) => {
          const seat = seatForOffset(offset)
          const player = state.players[seat]!
          const label = `${OFFSET_POSITION_LABEL[offset]} — ${windLabel(player)}`
          const groups = uniformGroupSizes(player.discards.length, GROUP_SIZE)
          const layout = packGroupsMajor(
            groups,
            'horizontal',
            { width: contentWidth || NOMINAL_TILE.width * GROUP_SIZE, height: UNBOUNDED_HEIGHT },
            tileWidth,
            tileHeight,
            INTRA_GAP,
            INTER_GAP,
            BAND_GAP,
          )
          const lastIndex = player.discards.length - 1

          return (
            <div
              key={seat}
              // Stops the backdrop's dismiss-on-click from firing for a
              // click that landed on a band itself — "tap anywhere outside
              // a band" (the doc's own dismissal wording) means clicks on
              // the dialog's background/labels still dismiss, but a click
              // meant to land on a tile shouldn't also close the overlay.
              onClick={(e) => e.stopPropagation()}
              role="region"
              aria-label={label}
              data-testid={`discard-overlay-band-${seat}`}
              className="flex flex-col gap-1"
            >
              <div className="text-sm font-semibold text-neutral-300">{label}</div>
              {player.discards.length === 0 ? (
                <div className="text-sm text-neutral-500">No discards yet</div>
              ) : (
                <div className="relative" style={{ width: layout.naturalWidth, height: layout.naturalHeight }}>
                  {player.discards.map((id, index) => {
                    const pos = layout.positions[index]!
                    const isLatest = index === lastIndex
                    return (
                      <div
                        key={id}
                        data-testid={`discard-overlay-tile-${id}`}
                        data-latest={isLatest || undefined}
                        className={tileFaceClassName({
                          // Fixed 'large': only affects tileFaceClassName's
                          // own Tailwind size classes, which the inline
                          // width/height below override anyway — this isn't
                          // a live tileScale dependency, just picking one
                          // consistently rather than leaving it ambiguous.
                          scale: 'large',
                          extra: isLatest ? TILE_JUST_DRAWN_RING_CLASSES : undefined,
                        })}
                        style={{
                          position: 'absolute',
                          left: pos.x,
                          top: pos.y,
                          width: tileWidth,
                          height: tileHeight,
                        }}
                      >
                        <TileFaceContent typeId={typeIdOfInstance(id)} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
