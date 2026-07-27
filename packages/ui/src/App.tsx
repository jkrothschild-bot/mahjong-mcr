import { useState } from 'react'
import { Board } from './board/Board.js'
import { CallOutToast } from './game/CallOutToast.js'
import { ClaimPrompt } from './game/ClaimPrompt.js'
import { useGameLoop } from './game/useGameLoop.js'
import { SettingsPanel } from './settings/SettingsPanel.js'
import { useSettings } from './settings/useSettings.js'

const ZERO_SCORES = { 0: 0, 1: 0, 2: 0, 3: 0 } as const

function App() {
  const { settings, update } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { state, matchState, humanPendingClaim, submitHumanMove } = useGameLoop({
    matchSeed: 42,
    botSpeedMs: settings.botSpeedMs,
  })

  return (
    <div className="min-h-svh bg-neutral-900 text-neutral-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
        <h1 className="text-xl font-semibold tracking-tight">MCR Mahjong Trainer</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
        >
          Settings
        </button>
      </header>

      {settingsOpen && (
        <div className="px-4 pt-3">
          <SettingsPanel settings={settings} onUpdate={update} />
        </div>
      )}

      <div className="flex justify-center px-4 pt-3">
        <CallOutToast state={state} />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        {/* Real per-hand match scoring lands in Phase 8 (end-of-hand score
            screen) — PlayerState.score is never updated by the engine
            itself, so until settlement is wired in, every seat shows 0. */}
        <Board state={state} matchState={matchState} matchScores={ZERO_SCORES} />

        <ClaimPrompt
          state={state}
          pendingClaim={humanPendingClaim}
          claimTimerEnabled={settings.claimTimerEnabled}
          claimTimerMs={settings.claimTimerMs}
          onDeclare={submitHumanMove}
        />
      </main>
    </div>
  )
}

export default App
