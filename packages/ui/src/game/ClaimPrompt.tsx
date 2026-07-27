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

  return (
    <div
      role="group"
      aria-label="Claim this discard"
      className="flex flex-col gap-2 rounded-lg border border-amber-500 bg-neutral-900 p-3"
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
  )
}
