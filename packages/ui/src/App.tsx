import { useCallback, useState } from 'react'
import { Board } from './board/Board.js'
import { ScoreScreen } from './board/ScoreScreen.js'
import { TileCountGrid } from './board/TileCountGrid.js'
import { computeUnseenCounts } from './board/unseenCounts.js'
import { CallOutToast } from './game/CallOutToast.js'
import { ClaimPrompt } from './game/ClaimPrompt.js'
import { DiscardConfirmModal } from './game/DiscardConfirmModal.js'
import { HUMAN_SEAT } from './game/humanSeat.js'
import { useDiscardFlow } from './game/useDiscardFlow.js'
import { useGameLoop } from './game/useGameLoop.js'
import { HintPanel } from './hints/HintPanel.js'
import { SettingsPanel } from './settings/SettingsPanel.js'
import { useSettings } from './settings/useSettings.js'

function App() {
  const { settings, update } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tileCountGridOpen, setTileCountGridOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const {
    state,
    matchState,
    matchScores,
    isHumanTurn,
    humanPendingClaim,
    submitHumanMove,
    startNextHand,
    hasPendingBotMove,
    advanceOneBotMove,
  } = useGameLoop({
    matchSeed: 42,
    botSpeedMs: settings.botSpeedMs,
    stepMode: settings.stepMode,
  })

  const onSubmitDiscard = useCallback(
    (tile: number) => submitHumanMove({ kind: 'discard', tile }),
    [submitHumanMove],
  )
  const { selectedTileId, selectTile, pendingConfirmTileId, requestDiscard, confirmDiscard, cancelDiscard } = useDiscardFlow({
    confirmBeforeDiscard: settings.confirmBeforeDiscard,
    onSubmitDiscard,
  })

  return (
    <div className="min-h-svh bg-neutral-900 text-neutral-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
        <h1 className="text-xl font-semibold tracking-tight">MCR Mahjong Trainer</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTileCountGridOpen(true)}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Tile counts
          </button>
          <button
            type="button"
            onClick={() => setHintOpen((open) => !open)}
            className="min-h-11 min-w-11 rounded-md border border-indigo-500 px-3 text-sm text-indigo-300 hover:bg-indigo-950"
          >
            Hint
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Settings
          </button>
        </div>
      </header>

      {settingsOpen && (
        <div className="px-4 pt-3">
          <SettingsPanel settings={settings} onUpdate={update} />
        </div>
      )}

      <div className="flex justify-center px-4 pt-3">
        <CallOutToast state={state} />
      </div>

      <main className="flex-1 flex flex-col items-center justify-start gap-2 p-2">
        <Board
          state={state}
          matchState={matchState}
          matchScores={matchScores}
          isHumanTurn={isHumanTurn}
          selectedTileId={selectedTileId}
          onTileClick={selectTile}
          onRequestDiscard={requestDiscard}
        />

        <ClaimPrompt state={state} pendingClaim={humanPendingClaim} onDeclare={submitHumanMove} />

        {hintOpen && (
          <HintPanel
            hand={state.players[HUMAN_SEAT].hand}
            prevailingWind={state.prevailingWind}
            seatWind={state.players[HUMAN_SEAT].seatWind}
            onClose={() => setHintOpen(false)}
          />
        )}

        {settings.stepMode && hasPendingBotMove && (
          <button
            type="button"
            onClick={advanceOneBotMove}
            className="min-h-11 rounded-md border border-sky-400 bg-sky-500 px-6 text-sm font-semibold text-neutral-900 hover:bg-sky-400"
          >
            Next
          </button>
        )}
      </main>

      <DiscardConfirmModal tileId={pendingConfirmTileId} onConfirm={confirmDiscard} onCancel={cancelDiscard} />

      <TileCountGrid
        open={tileCountGridOpen}
        unseenCounts={computeUnseenCounts(state, HUMAN_SEAT)}
        onClose={() => setTileCountGridOpen(false)}
      />

      <ScoreScreen state={state} matchScores={matchScores} onNextHand={startNextHand} />
    </div>
  )
}

export default App
