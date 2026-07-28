import { useEffect, useRef } from 'react'
import { legalMoves, typeIdOfInstance, type GameState, type Move, type PendingClaim } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { HUMAN_SEAT } from './humanSeat.js'

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

  // Fixed, bottom-anchored overlay — not an in-flow block. Every other
  // overlay in the app (ScoreScreen, TileCountGrid, etc.) uses fixed
  // positioning and is correctly excluded from document flow; this one used
  // to render as a normal <main> child instead, so its ~70px of real height
  // added directly to the page whenever a claim window opened, which alone
  // was enough to overflow the iPad viewport (found via live play — a claim
  // window appearing just 4 rounds into a fresh hand, no cumulative discard
  // buildup needed, already pushed the page 75px past the viewport). The
  // outer wrapper is pointer-events-none so it doesn't swallow clicks on the
  // rest of the page when no claim is pending... but since this component
  // returns null entirely in that case, that's already moot — kept anyway
  // as the pattern's own defense-in-depth against covering unrelated UI.
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center p-2">
      <div
        role="group"
        aria-label="Claim this discard"
        className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-amber-500 bg-neutral-900 p-3 shadow-lg"
      >
        <div className="flex flex-wrap gap-2">
          {options.map((move, index) => (
            <button
              key={index}
              type="button"
              onClick={() => declare(move)}
              className="min-h-11 rounded-md border border-neutral-600 bg-neutral-800 px-4 text-sm font-medium hover:bg-neutral-700"
            >
              {moveLabel(move)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
