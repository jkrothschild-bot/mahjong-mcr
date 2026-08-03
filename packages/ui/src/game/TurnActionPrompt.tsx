import { legalMoves, typeIdOfInstance, type GameState, type Move } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { HUMAN_SEAT } from './humanSeat.js'

export interface TurnActionPromptProps {
  state: GameState
  // False whenever it isn't the human's own discard decision — the component
  // renders nothing then.
  isHumanTurn: boolean
  onDeclare: (move: Move) => void
}

// Every legal discard-phase move EXCEPT the discard itself. The discard has
// its own direct affordance (double-click a tile, or drag it to the river),
// so surfacing 14 discard buttons here would be noise.
type PromptMove = Extract<Move, { kind: 'selfDrawWin' | 'concealedKong' | 'addedKong' }>

function isPromptMove(move: Move): move is PromptMove {
  return move.kind === 'selfDrawWin' || move.kind === 'concealedKong' || move.kind === 'addedKong'
}

function moveLabel(move: PromptMove): string {
  switch (move.kind) {
    case 'selfDrawWin':
      return 'Declare win'
    case 'concealedKong':
      return `Concealed kong (${tileDisplayName(move.tileType)})`
    case 'addedKong':
      return `Add to kong (${tileDisplayName(typeIdOfInstance(move.tile))})`
  }
}

// THE fix for a real, severe gap found in live play: a player drew the tile
// completing Four Concealed Pungs and nothing happened, because the UI had
// no way to declare it.
//
// moves.ts's legalDiscardPhaseMoves has always computed three moves besides
// the discard — selfDrawWin, concealedKong, addedKong — and bots have always
// been able to use them, since chooseBotMove reads legalMoves directly. But
// the only submitHumanMove call outside the claim flow sent
// `{ kind: 'discard' }` and nothing else, and ClaimPrompt only renders
// against ANOTHER seat's discard. So on your own turn the sole move you could
// physically make was a discard: self-drawn wins and kong declarations were
// unreachable for the human alone.
//
// Deliberately NOT auto-submitted. A winning hand is only offered, never
// declared for the player: MCR lets you decline and keep building (the
// 8-point minimum makes "can I win?" and "should I win?" genuinely different
// questions, which is exactly what this app is for teaching). Kongs are more
// clearly optional still — declaring one can cost a concealed-hand fan or
// expose you to Robbing the Kong.
//
// Fixed overlay, like ClaimPrompt: zero layout cost, so it cannot change
// GameStage's available height and resize the board (see HudBar.tsx's
// tombstone for what happens when something in flow does).
export function TurnActionPrompt({ state, isHumanTurn, onDeclare }: TurnActionPromptProps) {
  if (!isHumanTurn) return null

  const options = legalMoves(state, HUMAN_SEAT).filter(isPromptMove)
  if (options.length === 0) return null

  const canWin = options.some((move) => move.kind === 'selfDrawWin')

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center p-2">
      <div
        role="group"
        aria-label="Declare a move"
        className={`pointer-events-auto flex flex-col gap-2 rounded-lg border bg-neutral-900 p-3 shadow-lg ${
          canWin ? 'border-emerald-400' : 'border-neutral-600'
        }`}
      >
        {canWin && (
          <p className="text-sm font-semibold text-emerald-300">
            Your hand is complete and worth at least 8 points — you can declare a win.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {options.map((move, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onDeclare(move)}
              className={
                move.kind === 'selfDrawWin'
                  ? 'min-h-11 rounded-md border border-emerald-400 bg-emerald-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-emerald-400'
                  : 'min-h-11 rounded-md border border-neutral-600 bg-neutral-800 px-4 text-sm font-medium hover:bg-neutral-700'
              }
            >
              {moveLabel(move)}
            </button>
          ))}
        </div>
        {/* No dismiss button: discarding is the dismissal, and it's always
            available underneath (this overlay is bottom-anchored and the hand
            row sits above it). An explicit "Keep playing" would just be a
            second way to do nothing. */}
        <p className="text-xs text-neutral-400">Or discard as usual to keep playing.</p>
      </div>
    </div>
  )
}
