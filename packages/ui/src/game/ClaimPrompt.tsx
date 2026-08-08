import { useEffect, useRef } from 'react'
import { legalMoves, typeIdOfInstance, type GameState, type Move, type PendingClaim } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'
import { HUMAN_SEAT } from './humanSeat.js'
import { seatDisplayName } from './seatDisplayName.js'

export interface ClaimPromptProps {
  state: GameState
  // undefined unless HUMAN_SEAT itself must declare right now (see
  // useGameLoop's humanPendingClaim) — the component renders nothing then.
  pendingClaim: PendingClaim | undefined
  onDeclare: (move: Move) => void
}

function moveLabel(move: Move): string {
  switch (move.kind) {
    case 'win':
      return 'Win'
    case 'pung':
      return 'Pung'
    case 'kong':
      return 'Kong'
    case 'pass':
      return 'Pass'
    case 'chow': {
      const [a, b] = move.usingTiles
      return `Chow (${tileDisplayName(typeIdOfInstance(a))}, ${tileDisplayName(typeIdOfInstance(b))})`
    }
    default:
      return move.kind
  }
}

// A claim window's identity: the (fromSeat, tile, kind) triple stays
// constant for the window's whole lifetime, but pendingClaim.declarations
// — and therefore the pendingClaim object reference itself — changes every
// time ANY seat (including bots) declares within that same window.
function windowKey(pendingClaim: PendingClaim | undefined): string | null {
  if (!pendingClaim) return null
  return `${pendingClaim.fromSeat}-${pendingClaim.tile}-${pendingClaim.kind}`
}

// No timer: claims wait indefinitely for the human's own decision (SPEC.md
// §8 lists a claim timer as a settings item, but the owner asked for it to
// be removed entirely — it forced a decision under time pressure rather
// than letting a learner actually think through their options).
export function ClaimPrompt({ state, pendingClaim, onDeclare }: ClaimPromptProps) {
  const declaredRef = useRef(false)
  const key = windowKey(pendingClaim)

  // Guards against a same-tick double-declaration (e.g. a rapid double
  // click before the re-render that clears pendingClaim) — the engine
  // throws if the same seat declares twice against one window.
  useEffect(() => {
    declaredRef.current = false
  }, [key])

  if (!pendingClaim) return null

  function declare(move: Move) {
    if (declaredRef.current) return
    declaredRef.current = true
    onDeclare(move)
  }

  const options = legalMoves(state, HUMAN_SEAT)
  const claimedType = typeIdOfInstance(pendingClaim.tile)
  const claimedName = tileDisplayName(claimedType)
  const discarder = seatDisplayName(pendingClaim.fromSeat, state)

  // Fixed, table-centred card — not an in-flow block. Every other
  // overlay in the app (ScoreScreen, TileCountGrid, etc.) uses fixed
  // positioning and is correctly excluded from document flow; this one used
  // to render as a normal <main> child instead, so its ~70px of real height
  // added directly to the page whenever a claim window opened, which alone
  // was enough to overflow the iPad viewport (found via live play — a claim
  // window appearing just 4 rounds into a fresh hand, no cumulative discard
  // buildup needed, already pushed the page 75px past the viewport).
  // The card is deliberately NOT nested in a full-viewport pointer-events
  // wrapper. That pattern left touch hit-testing dependent on a descendant
  // re-enabling pointer events beneath a disabled ancestor. Giving the card
  // its own fixed box is both more reliable on iPad and leaves the human's
  // hand unobstructed below it. A direct 50%/50% anchor places the decision
  // over the table centre without a screen-sized backdrop or hit target.
  return (
    <div
      className="fixed left-1/2 top-1/2 z-40 w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2"
    >
      <div
        role="dialog"
        aria-label="Claim this discard"
        aria-describedby="claim-prompt-description"
        onPointerDown={(event) => event.stopPropagation()}
        className="w-full touch-manipulation rounded-xl border-2 border-amber-300 bg-neutral-950/97 p-4 shadow-[0_0_30px_rgba(251,191,36,0.34),0_16px_40px_rgba(0,0,0,0.72)] backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            data-testid="claim-prompt-tile"
            className={tileFaceCompactClassName({ extra: 'pointer-events-none ring-2 ring-amber-300 shadow-lg' })}
          >
            <TileFaceContent typeId={claimedType} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Your decision</div>
            <h2 className="mt-1 text-xl font-semibold text-white">Claim this discard?</h2>
            <p id="claim-prompt-description" className="mt-0.5 text-sm text-neutral-300">
              {discarder} discarded <span className="font-semibold text-amber-200">{claimedName}</span>.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((move, index) => (
            <button
              key={index}
              type="button"
              onClick={() => declare(move)}
              className={`min-h-12 touch-manipulation rounded-md border px-5 text-sm font-semibold transition-colors ${
                move.kind === 'pass'
                  ? 'border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  : move.kind === 'win'
                    ? 'border-emerald-300 bg-emerald-700 text-white hover:bg-emerald-600'
                    : 'border-amber-300 bg-amber-500 text-neutral-950 hover:bg-amber-400'
              }`}
            >
              {moveLabel(move)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
