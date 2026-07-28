import { useEffect, useRef, useState } from 'react'
import { typeIdOfInstance, type Action, type GameState } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { HUMAN_SEAT } from './humanSeat.js'
import { seatDisplayName } from './seatDisplayName.js'

export interface CallOutToastProps {
  state: GameState
  dismissAfterMs?: number
}

function verbFor(claimType: 'chow' | 'pung' | 'kong'): string {
  return claimType === 'chow' ? 'chowed' : claimType === 'pung' ? 'ponged' : 'konged'
}

// Only claim/win events get a call-out — draws, discards, and passes are
// already visible on the board itself and don't need a toast. Deliberately
// text, not sound: no audio assets exist, per the established no-sound-
// infra-yet precedent.
function describeAction(action: Action, state: GameState): string | null {
  switch (action.type) {
    case 'claim': {
      const claimant = seatDisplayName(action.seat, state)
      const fromWhom = action.fromSeat === HUMAN_SEAT ? 'your' : `${seatDisplayName(action.fromSeat, state)}'s`
      return `${claimant} ${verbFor(action.claimType)} ${fromWhom} ${tileDisplayName(typeIdOfInstance(action.claimedTile))}`
    }
    case 'win':
      return `${seatDisplayName(action.seat, state)} won the hand!`
    case 'robKongWin':
      return `${seatDisplayName(action.seat, state)} robbed the kong to win!`
    default:
      return null
  }
}

export function CallOutToast({ state, dismissAfterMs = 2000 }: CallOutToastProps) {
  const seenLengthRef = useRef(state.actionLog.length)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const newActions = state.actionLog.slice(seenLengthRef.current)
    seenLengthRef.current = state.actionLog.length

    const text = newActions.map((action) => describeAction(action, state)).find((t) => t !== null)
    if (text === undefined) return

    setMessage(text)
    const timeout = setTimeout(() => setMessage(null), dismissAfterMs)
    return () => clearTimeout(timeout)
    // Only re-derive when the log actually grows — re-running on every
    // state change (e.g. hand reorders) would re-scan for nothing new.
  }, [state, dismissAfterMs])

  if (!message) return null

  return (
    <div role="status" data-testid="call-out-toast" className="rounded-full border border-neutral-600 bg-neutral-800 px-3 py-1 text-sm">
      {message}
    </div>
  )
}
