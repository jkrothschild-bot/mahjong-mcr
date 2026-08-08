import { FAN_REGISTRY, type GameState, type Seat } from '@mahjong-mcr/engine'
import { deriveHandOutcome } from '../game/deriveScoreContext.js'
import { seatDisplayName } from '../game/seatDisplayName.js'

export interface ScoreScreenProps {
  state: GameState
  matchScores: Record<Seat, number>
  onNextHand: () => void
  // SPEC.md §6: "linked from... the end-of-hand screen (tap a fan name →
  // see its definition)." Optional so ScoreScreen still works standalone
  // (e.g. in tests) without wiring up the encyclopedia.
  onFanClick?: (fanId: number) => void
  // SPEC.md §9's replay scrubber: "after a hand (or match) ends, step back
  // through it move by move." Optional for the same standalone-testing
  // reason as onFanClick above.
  onReviewHand?: () => void
  matchCompleted?: boolean
  onMatchComplete?: () => void
}

const ALL_SEATS: readonly Seat[] = [0, 1, 2, 3]

const WIN_METHOD_LABEL: Record<'selfDraw' | 'discard' | 'robKong', string> = {
  selfDraw: 'self-drawn',
  discard: 'won off a discard',
  robKong: 'won by robbing a kong',
}

function formatSigned(amount: number): string {
  return amount > 0 ? `+${amount}` : String(amount)
}

// SPEC.md §9's end-of-hand screen: shown whenever the hand has ended,
// either an exhaustive draw (no winner) or a win (fan breakdown +
// settlement). Fan names/points come straight from FAN_REGISTRY, and
// flower points are winner.hand.flowers.length * FAN_REGISTRY[81].points —
// both derived, not hardcoded — so this can never drift from the scoring
// engine as new fans/rulings land.
export function ScoreScreen({ state, matchScores, onNextHand, onFanClick, onReviewHand, matchCompleted = false, onMatchComplete }: ScoreScreenProps) {
  if (state.phase !== 'handEnded' || !state.result) return null
  const { result } = state

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <div
        role="dialog"
        aria-label="Hand result"
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        {result.outcome === 'exhaustiveDraw' ? (
          <div data-testid="score-screen-draw">
            <h2 className="text-lg font-semibold">No winner</h2>
            <p className="text-sm text-neutral-400">The wall ran out — this hand is a draw.</p>
          </div>
        ) : (
          <WinDetails state={state} onFanClick={onFanClick} />
        )}

        <div className="flex flex-col gap-1 border-t border-neutral-700 pt-3">
          <h3 className="text-sm font-semibold text-neutral-300">Match scores</h3>
          {ALL_SEATS.map((seat) => (
            <div key={seat} data-testid={`score-screen-match-score-${seat}`} className="flex justify-between text-sm font-mono">
              <span>{seatDisplayName(seat, state)}</span>
              <span>{formatSigned(matchScores[seat])}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {onReviewHand && (
            <button
              type="button"
              onClick={onReviewHand}
              className="min-h-11 flex-1 rounded-md border border-neutral-600 px-4 text-sm font-semibold hover:bg-neutral-700"
            >
              Review this hand
            </button>
          )}
          <button
            type="button"
            onClick={matchCompleted ? onMatchComplete ?? onNextHand : onNextHand}
            className="min-h-11 flex-1 rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
          >
            {matchCompleted ? 'Finish match' : 'Next hand'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WinDetails({ state, onFanClick }: { state: GameState; onFanClick?: (fanId: number) => void }) {
  const result = state.result!
  const winnerSeat = result.winnerSeats![0]!
  const outcome = deriveHandOutcome(state)
  if (!outcome) return null // shouldn't happen for outcome === 'win', but keeps this a pure function of state

  const { scoreResult, settlement } = outcome

  return (
    <div data-testid="score-screen-win">
      <h2 className="text-lg font-semibold">
        {seatDisplayName(winnerSeat, state)} won ({WIN_METHOD_LABEL[result.winMethod!]})
      </h2>

      <ul role="list" aria-label="Fan breakdown" className="mt-2 flex flex-col gap-1 text-sm">
        {scoreResult.fanMatches.map((match) => {
          const meta = FAN_REGISTRY[match.fanId]!
          return (
            <li key={match.fanId} role="listitem" className="flex justify-between">
              {onFanClick ? (
                <button type="button" onClick={() => onFanClick(match.fanId)} className="text-left underline decoration-dotted hover:text-amber-300">
                  {meta.name}
                  {match.count > 1 ? ` x${match.count}` : ''}
                </button>
              ) : (
                <span>
                  {meta.name}
                  {match.count > 1 ? ` x${match.count}` : ''}
                </span>
              )}
              <span className="font-mono">{meta.points * match.count}</span>
            </li>
          )
        })}
        {settlement.flowerPoints > 0 && (
          <li className="flex justify-between">
            <span>Flower Tiles x{state.players[winnerSeat].hand.flowers.length}</span>
            <span className="font-mono">{settlement.flowerPoints}</span>
          </li>
        )}
      </ul>

      <p className="mt-2 text-sm font-semibold">Total: {settlement.basicPoints + settlement.flowerPoints} points</p>

      <div className="mt-3 flex flex-col gap-1 border-t border-neutral-700 pt-2">
        <h3 className="text-sm font-semibold text-neutral-300">Settlement</h3>
        {ALL_SEATS.map((seat) => (
          <div key={seat} data-testid={`score-screen-settlement-${seat}`} className="flex justify-between text-sm font-mono">
            <span>{seatDisplayName(seat, state)}</span>
            <span>{formatSigned(settlement.payments[seat])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
