import { Board } from './board/Board.js'
import { useGameLoop } from './game/useGameLoop.js'

const ZERO_SCORES = { 0: 0, 1: 0, 2: 0, 3: 0 } as const

function App() {
  // Bot speed is hardcoded for now — Phase 3 (settings module) makes this
  // configurable per SPEC.md §7's Instant/Fast/Normal/Relaxed presets.
  const { state, matchState } = useGameLoop({ matchSeed: 42, botSpeedMs: 800 })

  return (
    <div className="min-h-svh bg-neutral-900 text-neutral-100 flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-700">
        <h1 className="text-xl font-semibold tracking-tight">MCR Mahjong Trainer</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        {/* Real per-hand match scoring lands in Phase 8 (end-of-hand score
            screen) — PlayerState.score is never updated by the engine
            itself, so until settlement is wired in, every seat shows 0. */}
        <Board state={state} matchState={matchState} matchScores={ZERO_SCORES} />
      </main>
    </div>
  )
}

export default App
