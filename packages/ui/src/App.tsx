import { useCallback, useEffect, useRef, useState } from 'react'
import { typeIdOfInstance, type ScenarioPreset, type TileTypeId } from '@mahjong-mcr/engine'
import { Board } from './board/Board.js'
import { ScoreScreen } from './board/ScoreScreen.js'
import { TileCountGrid } from './board/TileCountGrid.js'
import { computeUnseenCounts } from './board/unseenCounts.js'
import { ExportPositionModal } from './export/ExportPositionModal.js'
import { CallOutToast } from './game/CallOutToast.js'
import { ClaimPrompt } from './game/ClaimPrompt.js'
import { DiscardConfirmModal } from './game/DiscardConfirmModal.js'
import { HUMAN_SEAT } from './game/humanSeat.js'
import { useDiscardFlow } from './game/useDiscardFlow.js'
import { useGameLoop, type HandMoveLog } from './game/useGameLoop.js'
import { FanEncyclopedia } from './hints/FanEncyclopedia.js'
import { HintPanel } from './hints/HintPanel.js'
import { PracticePicker } from './practice/PracticePicker.js'
import { PracticeView } from './practice/PracticeView.js'
import { ReplayView } from './replay/ReplayView.js'
import { SettingsPanel } from './settings/SettingsPanel.js'
import { useSettings } from './settings/useSettings.js'
import { StatsPanel } from './stats/StatsPanel.js'
import { useSessionStats } from './stats/useSessionStats.js'

function App() {
  const { settings, update } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tileCountGridOpen, setTileCountGridOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [practicePickerOpen, setPracticePickerOpen] = useState(false)
  const [practicePreset, setPracticePreset] = useState<ScenarioPreset | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const { stats, recordHandResult } = useSessionStats()
  // A snapshot taken at the moment Replay opens (not the live matchMoveLogs
  // reference) — the live match keeps advancing in the background while
  // Replay is open (nothing pauses useGameLoop's bot timers), so scrubbing
  // against the live array would show the "of N" move total shifting under
  // the user as bots keep playing. Freezing it at open-time keeps the
  // scrubber stable for whatever hand(s) existed at that moment.
  const [replaySnapshot, setReplaySnapshot] = useState<HandMoveLog[] | null>(null)
  const [encyclopediaFanId, setEncyclopediaFanId] = useState<number | undefined>(undefined)
  const [encyclopediaOpen, setEncyclopediaOpen] = useState(false)
  const openEncyclopedia = (fanId?: number) => {
    setEncyclopediaFanId(fanId)
    setEncyclopediaOpen(true)
  }
  // Tile inspector (SPEC.md §5): lifted here (not owned inside Board) so the
  // Hint panel's Tile Safety tab (M5) can share the exact same selection.
  const [selectedTypeId, setSelectedTypeId] = useState<TileTypeId | null>(null)
  const inspectTile = (id: number) => setSelectedTypeId(typeIdOfInstance(id))
  const {
    state,
    matchState,
    matchScores,
    matchMoveLogs,
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
  const openReplay = () => setReplaySnapshot(matchMoveLogs)

  // Folds a finished hand's result into session stats exactly once: a ref
  // (not state) tracking the last (seed, handNumber) recorded, since this is
  // a persistence side effect and must live outside loopReducer — reducers
  // stay pure (see useGameLoop.ts's own such comment about applySettlement).
  const lastRecordedHandRef = useRef<string | null>(null)
  useEffect(() => {
    if (state.phase !== 'handEnded') return
    const key = `${state.seed}-${state.handNumber}`
    if (lastRecordedHandRef.current === key) return
    lastRecordedHandRef.current = key
    recordHandResult(state, HUMAN_SEAT)
  }, [state, recordHandResult])

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
      <header className="flex items-center justify-between px-4 py-1 border-b border-neutral-700">
        <h1 className="text-lg font-semibold tracking-tight">MCR Mahjong Trainer</h1>
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
            onClick={() => openEncyclopedia()}
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Fan encyclopedia
          </button>
          <button
            type="button"
            onClick={openReplay}
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setPracticePickerOpen(true)}
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Practice
          </button>
          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Stats
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

      <div className="flex justify-center px-4 pt-1">
        <CallOutToast state={state} />
      </div>

      <main className="flex-1 flex flex-col items-center justify-start gap-1 p-1">
        <Board
          state={state}
          matchState={matchState}
          matchScores={matchScores}
          isHumanTurn={isHumanTurn}
          selectedTileId={selectedTileId}
          onTileClick={selectTile}
          onRequestDiscard={requestDiscard}
          selectedTypeId={selectedTypeId}
          onInspectTile={inspectTile}
        />

        <ClaimPrompt state={state} pendingClaim={humanPendingClaim} onDeclare={submitHumanMove} />

        {hintOpen && (
          <HintPanel
            hand={state.players[HUMAN_SEAT].hand}
            prevailingWind={state.prevailingWind}
            seatWind={state.players[HUMAN_SEAT].seatWind}
            state={state}
            forSeat={HUMAN_SEAT}
            selectedTypeId={selectedTypeId}
            onClose={() => setHintOpen(false)}
            onOpenEncyclopedia={() => openEncyclopedia()}
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

      <ScoreScreen
        state={state}
        matchScores={matchScores}
        onNextHand={startNextHand}
        onFanClick={openEncyclopedia}
        onReviewHand={openReplay}
      />

      {encyclopediaOpen && <FanEncyclopedia initialFanId={encyclopediaFanId} onClose={() => setEncyclopediaOpen(false)} />}

      {replaySnapshot && <ReplayView handMoveLogs={replaySnapshot} onClose={() => setReplaySnapshot(null)} />}

      <ExportPositionModal open={exportOpen} state={state} forSeat={HUMAN_SEAT} onClose={() => setExportOpen(false)} />

      {practicePickerOpen && (
        <PracticePicker
          onSelect={(preset) => {
            setPracticePreset(preset)
            setPracticePickerOpen(false)
          }}
          onClose={() => setPracticePickerOpen(false)}
        />
      )}

      {practicePreset && (
        <PracticeView
          preset={practicePreset}
          botSpeedMs={settings.botSpeedMs}
          confirmBeforeDiscard={settings.confirmBeforeDiscard}
          onExit={() => setPracticePreset(null)}
        />
      )}

      <StatsPanel open={statsOpen} stats={stats} onClose={() => setStatsOpen(false)} />
    </div>
  )
}

export default App
