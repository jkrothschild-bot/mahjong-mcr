import { useEffect, useRef, useState } from 'react'
import { legalMoves, typeIdOfInstance, type GameState, type Move, type PendingClaim } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { HUMAN_SEAT } from './humanSeat.js'

export interface ClaimPromptProps {
  state: GameState
  // undefined unless HUMAN_SEAT itself must declare right now (see
  // useGameLoop's humanPendingClaim) — the component renders nothing then.
  pendingClaim: PendingClaim | undefined
  claimTimerEnabled: boolean
  claimTimerMs: number
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

// A claim window's identity for timer-restart purposes: the (fromSeat,
// tile, kind) triple stays constant for the window's whole lifetime, but
// pendingClaim.declarations — and therefore the pendingClaim object
// reference itself — changes every time ANY seat (including bots) declares
// within that same window. Keying the timer effect on this instead of the
// object reference is what stops another seat's declaration from resetting
// the human's own countdown.
function windowKey(pendingClaim: PendingClaim | undefined): string | null {
  if (!pendingClaim) return null
  return `${pendingClaim.fromSeat}-${pendingClaim.tile}-${pendingClaim.kind}`
}

export function ClaimPrompt({ state, pendingClaim, claimTimerEnabled, claimTimerMs, onDeclare }: ClaimPromptProps) {
  const [timeLeftMs, setTimeLeftMs] = useState(claimTimerMs)
  const declaredRef = useRef(false)
  const key = windowKey(pendingClaim)

  useEffect(() => {
    declaredRef.current = false
    if (key === null || !claimTimerEnabled) return
    setTimeLeftMs(claimTimerMs)
    const start = Date.now()
    const interval = setInterval(() => setTimeLeftMs(Math.max(0, claimTimerMs - (Date.now() - start))), 100)
    const timeout = setTimeout(() => {
      if (declaredRef.current) return
      declaredRef.current = true
      onDeclare({ kind: 'pass' })
    }, claimTimerMs)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [key, claimTimerEnabled, claimTimerMs, onDeclare])

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
      {claimTimerEnabled && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-700">
          <div
            data-testid="claim-timer-bar"
            className="h-full bg-amber-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${(timeLeftMs / claimTimerMs) * 100}%` }}
          />
        </div>
      )}
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
