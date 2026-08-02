import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig, useReducedMotion } from 'motion/react'
import { typeIdOfInstance, type ScenarioPreset, type TileTypeId } from '@mahjong-mcr/engine'
import { Board } from './board/Board.js'
import { DiscardOverlay } from './board/DiscardOverlay.js'
import { ScoreScreen } from './board/ScoreScreen.js'
import { TileCountGrid } from './board/TileCountGrid.js'
import { computeUnseenCounts } from './board/unseenCounts.js'
import { applyDevOccupancy, parseDevOccupancyMode } from './dev/devOccupancy.js'
import { ExportPositionModal } from './export/ExportPositionModal.js'
import { ClaimPrompt } from './game/ClaimPrompt.js'
import { DiscardConfirmModal } from './game/DiscardConfirmModal.js'
import { HUMAN_SEAT } from './game/humanSeat.js'
import { RestartConfirmModal } from './game/RestartConfirmModal.js'
import { useDiscardFlow } from './game/useDiscardFlow.js'
import { useGameLoop, type HandMoveLog } from './game/useGameLoop.js'
import { FanEncyclopedia } from './hints/FanEncyclopedia.js'
import { HintPanel } from './hints/HintPanel.js'
import { PracticePicker } from './practice/PracticePicker.js'
import { PracticeView } from './practice/PracticeView.js'
import { ReplayView } from './replay/ReplayView.js'
import { SettingsContext } from './settings/SettingsContext.js'
import { SettingsPanel } from './settings/SettingsPanel.js'
import { useSettings } from './settings/useSettings.js'
import { StatsPanel } from './stats/StatsPanel.js'
import { useSessionStats } from './stats/useSessionStats.js'

function App() {
  const { settings, update } = useSettings()
  // M8 Step 3: either trigger — the app's own setting, or the OS-level
  // prefers-reduced-motion media query motion/react's useReducedMotion()
  // already watches — is enough to turn off tile-movement animation.
  const osPrefersReducedMotion = useReducedMotion()
  const reducedMotion = settings.reducedMotion || osPrefersReducedMotion
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tileCountGridOpen, setTileCountGridOpen] = useState(false)
  const [discardOverlayOpen, setDiscardOverlayOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [practicePickerOpen, setPracticePickerOpen] = useState(false)
  const [practicePreset, setPracticePreset] = useState<ScenarioPreset | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)
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
    resetMatch,
  } = useGameLoop({
    matchSeed: 42,
    botSpeedMs: settings.botSpeedMs,
    stepMode: settings.stepMode,
    // KICKOFF-phase4-discard-overlay.md: a player must not lose a claim
    // window while looking at the overlay — turns here are strictly
    // timer-driven (see useGameLoop's own effect), so pausing the timer is
    // both necessary and sufficient; there's no other clock to stop.
    paused: discardOverlayOpen,
  })
  // Dev-only worst-case occupancy override (KICKOFF-phase5-melds-backs.md's
  // prerequisite harness) — ?occupancy=worst, DEV builds only, read once at
  // mount (a reload picks up a changed param; this is a screenshot-capture
  // tool, not a live toggle). Overlays synthetic discards/melds on top of
  // whatever the live match is actually doing rather than replacing it, so
  // the rest of the app (turn order, wall, hint system) keeps working normally
  // underneath the visualization.
  const [devOccupancyMode] = useState(() => (import.meta.env.DEV ? parseDevOccupancyMode(window.location.search) : null))
  const displayState = devOccupancyMode ? applyDevOccupancy(state, devOccupancyMode, HUMAN_SEAT) : state

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

  // One-way latch for the discard hint (DiscardHint.tsx): true until the
  // human's first discard, false forever after, for the whole session.
  //
  // Deliberately NOT derived from state.players[HUMAN_SEAT].discards.length —
  // that resets with every deal, so the hint would reappear at the start of
  // all 16 hands. Deliberately not persisted either: it costs one obvious
  // line to relearn and persisting it would mean a storage decision (and a
  // "why won't this come back?" support case) for a one-sentence cue.
  // Survives a Restart on purpose — restarting the match doesn't unteach the
  // player how to discard.
  const [hasHumanDiscarded, setHasHumanDiscarded] = useState(false)
  const onSubmitDiscard = useCallback(
    (tile: number) => {
      setHasHumanDiscarded(true)
      submitHumanMove({ kind: 'discard', tile })
    },
    [submitHumanMove],
  )
  const { selectedTileId, selectTile, pendingConfirmTileId, requestDiscardTile, confirmDiscard, cancelDiscard } =
    useDiscardFlow({
      confirmBeforeDiscard: settings.confirmBeforeDiscard,
      onSubmitDiscard,
    })

  return (
    <SettingsContext.Provider value={settings}>
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
    {/* h-svh (a definite height), not min-h-svh (only a floor) — flex-grow
        children need a definite ancestor size to distribute remaining
        space against; a min-height-only ancestor has no "remaining space"
        to give out, so it was sizing to content instead and pushing the
        whole page past the viewport. overflow-hidden is the hard backstop
        matching CLAUDE.md's no-scroll rule now that GameStage's fit-to-
        available-space logic is the thing actually responsible for making
        content fit, rather than manually-tuned per-component pixel budgets. */}
    <div className="h-svh overflow-hidden bg-neutral-900 text-neutral-100 flex flex-col">
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
            onClick={() => setDiscardOverlayOpen(true)}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            All discards
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
            onClick={() => setSettingsOpen(true)}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setRestartConfirmOpen(true)}
            className="min-h-11 rounded-md border border-red-500 px-3 text-sm text-red-300 hover:bg-red-950"
          >
            Restart
          </button>
        </div>
      </header>

      {/* min-h-0 is load-bearing: flex items default to min-height:auto,
          which lets a child's natural content size push this (and every
          ancestor up to min-h-svh, which is only a floor, not a ceiling)
          taller than the viewport — exactly the page-scroll GameStage's
          fit-to-viewport measurement is supposed to prevent. Without this,
          Board's own flex-1/min-h-0 measures against an already-inflated
          <main>, not the true remaining space. */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-start gap-1 p-1">
        <Board
          state={displayState}
          matchState={matchState}
          matchScores={matchScores}
          isHumanTurn={isHumanTurn}
          selectedTileId={selectedTileId}
          onTileClick={selectTile}
          onRequestDiscardTile={isHumanTurn ? requestDiscardTile : undefined}
          selectedTypeId={selectedTypeId}
          onInspectTile={inspectTile}
          onOpenDiscardOverlay={() => setDiscardOverlayOpen(true)}
          showDiscardHint={!hasHumanDiscarded}
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

      {/* KICKOFF-phase4-discard-overlay.md's THE critical instruction: this
          must render outside GameStage's transform:scale() — a sibling of
          <main>/<Board>, same as every other overlay here, not a descendant
          of Board passed down into GameStage. Nesting it inside would (a)
          inherit the stage's non-integer ~1.077 scale, the exact mechanism
          that caused this project's earlier tile-blur bug, and (b) cap it at
          DESIGN_HEIGHT/the middle band instead of the full viewport, which
          is the entire reason it can be readable when the table can't. */}
      <DiscardOverlay open={discardOverlayOpen} state={displayState} onClose={() => setDiscardOverlayOpen(false)} />

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

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onUpdate={update} />

      <RestartConfirmModal
        open={restartConfirmOpen}
        onConfirm={() => {
          resetMatch()
          setRestartConfirmOpen(false)
        }}
        onCancel={() => setRestartConfirmOpen(false)}
      />
    </div>
    </MotionConfig>
    </SettingsContext.Provider>
  )
}

export default App
