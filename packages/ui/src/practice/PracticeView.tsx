import { useState } from 'react'
import { typeIdOfInstance, type GameState, type MatchState, type ScenarioPreset, type Seat, type TileTypeId } from '@mahjong-mcr/engine'
import { Board } from '../board/Board.js'
import { deriveHandOutcome } from '../game/deriveScoreContext.js'
import { ClaimPrompt } from '../game/ClaimPrompt.js'
import { DiscardConfirmModal } from '../game/DiscardConfirmModal.js'
import { useDiscardFlow } from '../game/useDiscardFlow.js'
import { usePracticeHand } from './usePracticeHand.js'

export interface PracticeViewProps {
  preset: ScenarioPreset
  botSpeedMs: number
  confirmBeforeDiscard: boolean
  onExit: () => void
}

const ZERO_SCORES: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

// Board needs a MatchState for its wind indicator, but a practice hand has no
// real match to derive one from — a fixed placeholder is fine here, unlike
// ReplayView's displayMatchState which reconstructs the ACTUAL hand number
// from real match history.
function practiceMatchState(state: GameState): MatchState {
  return {
    matchSeed: state.seed,
    prevailingWind: state.prevailingWind,
    roundHandIndex: 1,
    dealerSeat: state.dealerSeat,
    matchHandNumber: state.handNumber,
    completed: false,
    handSeeds: [],
  }
}

// SPEC.md §9's practice mode: play a single curated scenario hand to
// completion, independent of the live match (usePracticeHand owns that
// separation). "Try again" reseeds the same preset; "Exit practice" goes
// back to the live match untouched.
export function PracticeView({ preset, botSpeedMs, confirmBeforeDiscard, onExit }: PracticeViewProps) {
  const [seed, setSeed] = useState(() => Date.now())
  const { state, humanPendingClaim, isHumanTurn, submitHumanMove } = usePracticeHand(preset, seed, botSpeedMs)
  const [selectedTypeId, setSelectedTypeId] = useState<TileTypeId | null>(null)
  const inspectTile = (id: number) => setSelectedTypeId(typeIdOfInstance(id))

  const { selectedTileId, selectTile, pendingConfirmTileId, requestDiscard, confirmDiscard, cancelDiscard } = useDiscardFlow({
    confirmBeforeDiscard,
    onSubmitDiscard: (tile) => submitHumanMove({ kind: 'discard', tile }),
  })

  const outcome = state.phase === 'handEnded' ? deriveHandOutcome(state) : null

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center gap-2 overflow-y-auto bg-neutral-950 p-2">
      <div className="flex w-full max-w-5xl items-center justify-between text-sm text-neutral-100">
        <h2 className="font-semibold">Practice — {preset.label}</h2>
        <button
          type="button"
          onClick={onExit}
          className="min-h-11 rounded-md border border-neutral-600 px-3 hover:bg-neutral-800"
        >
          Exit practice
        </button>
      </div>

      <Board
        state={state}
        matchState={practiceMatchState(state)}
        matchScores={ZERO_SCORES}
        isHumanTurn={isHumanTurn}
        selectedTileId={selectedTileId}
        onTileClick={(id) => {
          selectTile(id)
          inspectTile(id)
        }}
        onRequestDiscard={requestDiscard}
        selectedTypeId={selectedTypeId}
        onInspectTile={inspectTile}
      />

      <ClaimPrompt state={state} pendingClaim={humanPendingClaim} onDeclare={submitHumanMove} />

      <DiscardConfirmModal tileId={pendingConfirmTileId} onConfirm={confirmDiscard} onCancel={cancelDiscard} />

      {state.phase === 'handEnded' && (
        <div role="dialog" aria-label="Practice hand result" className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-neutral-600 bg-neutral-800 p-5 text-sm text-neutral-100">
          {state.result?.outcome === 'exhaustiveDraw' ? (
            <p>The wall ran out — no winner this time.</p>
          ) : outcome ? (
            <p>
              Seat {state.result?.winnerSeats?.[0]} won for {outcome.settlement.basicPoints + outcome.settlement.flowerPoints} points.
            </p>
          ) : (
            <p>Hand ended.</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSeed(Date.now())}
              className="min-h-11 flex-1 rounded-md border border-neutral-600 px-4 font-semibold hover:bg-neutral-700"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="min-h-11 flex-1 rounded-md border border-amber-400 bg-amber-500 px-4 font-semibold text-neutral-900 hover:bg-amber-400"
            >
              Exit practice
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
