import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MotionConfig, useReducedMotion } from 'motion/react'
import { typeIdOfInstance, type TileTypeId } from '@mahjong-mcr/engine'
import { Board } from './board/Board.js'
import { ScoreScreen } from './board/ScoreScreen.js'
import { TileCountGrid } from './board/TileCountGrid.js'
import { computeUnseenCounts } from './board/unseenCounts.js'
import { applyDevOccupancy, parseDevOccupancyMode } from './dev/devOccupancy.js'
import { ExportPositionModal } from './export/ExportPositionModal.js'
import { ClaimPrompt } from './game/ClaimPrompt.js'
import { HUMAN_SEAT } from './game/humanSeat.js'
import { RestartConfirmModal } from './game/RestartConfirmModal.js'
import { TurnActionPrompt } from './game/TurnActionPrompt.js'
import { useDiscardFlow } from './game/useDiscardFlow.js'
import { useGameLoop, type HandMoveLog, type LoopState } from './game/useGameLoop.js'
import { HandInfoPanel } from './hand/HandInfoPanel.js'
import { FanEncyclopedia } from './hints/FanEncyclopedia.js'
import { HintPanel } from './hints/HintPanel.js'
import { ReplayView } from './replay/ReplayView.js'
import { SettingsContext } from './settings/SettingsContext.js'
import { SettingsPanel } from './settings/SettingsPanel.js'
import { useSettings } from './settings/useSettings.js'
import { StatsPanel } from './stats/StatsPanel.js'
import { useSessionStats } from './stats/useSessionStats.js'
import { capabilitiesFor, DEFAULT_GAME_CONFIG, type GameConfig } from './app/gameConfig.js'
import { useAnalytics } from './analytics/AnalyticsContext.js'
import { trackSafely } from './analytics/AnalyticsService.js'
import { HomeIcon } from './components/HomeIcon.js'
import { LogoutIcon } from './components/LogoutIcon.js'
import { MAHJONG_ANNOUNCEMENT_MS } from './game/gameEventPresentation.js'
import { buildInitialDealFrames } from './game/initialDealPresentation.js'

export interface AppProps {
  config?: GameConfig
  initialSnapshot?: LoopState
  // Seed for a brand-new match (ignored once initialSnapshot restores a game
  // already in progress). Left undefined in production so every fresh game
  // deals a genuinely random wall — pass a fixed value only to pin the deal
  // for tests.
  matchSeed?: number
  onSnapshotChange?: (snapshot: LoopState) => void
  saveStatus?: 'saved' | 'saving' | 'local-only'
  onRestart?: () => void | Promise<void>
  onHome?: (snapshot: LoopState) => void | Promise<void>
  onLogout?: (snapshot: LoopState) => void | Promise<void>
  // GamePage enables this only for a genuinely new route-level game. A
  // restored snapshot must reconstruct immediately and never replay deal.
  animateInitialDeal?: boolean
}

function App({ config = DEFAULT_GAME_CONFIG, initialSnapshot, matchSeed, onSnapshotChange, saveStatus = 'saved', onRestart, onHome, onLogout, animateInitialDeal = false }: AppProps) {
  const capabilities = capabilitiesFor(config)
  const analytics = useAnalytics()
  const { settings, update } = useSettings()
  // M8 Step 3: tile-movement animation follows the OS-level
  // prefers-reduced-motion media query, which motion/react's
  // useReducedMotion() watches. There used to be an app-level toggle OR'd
  // with this; it was removed while cutting the settings count, and removing
  // it costs nobody the behaviour precisely because the OS query was always
  // sufficient on its own.
  const reducedMotion = useReducedMotion()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tileCountGridOpen, setTileCountGridOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [handInfoOpen, setHandInfoOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)
  const [boardPreviewOpen, setBoardPreviewOpen] = useState(false)
  const [homePending, setHomePending] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const [dealAnimationActive, setDealAnimationActive] = useState(animateInitialDeal && initialSnapshot === undefined)
  const [dealFrameIndex, setDealFrameIndex] = useState(0)
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
    trackSafely(analytics, 'scoring_explanation_viewed')
    setEncyclopediaFanId(fanId)
    setEncyclopediaOpen(true)
  }
  // Tile inspector (SPEC.md §5): lifted here (not owned inside Board) so the
  // Hint panel's Tile Safety tab (M5) can share the exact same selection.
  const [selectedTypeId, setSelectedTypeId] = useState<TileTypeId | null>(null)
  const inspectTile = (id: number) => setSelectedTypeId(typeIdOfInstance(id))
  // A fresh random seed per mount, used only when the caller doesn't pin one
  // (tests) and there's no initialSnapshot to restore from — see
  // useGameLoop's resetMatch for why this range matches nextSeed's uint32.
  const [randomMatchSeed] = useState(() => Math.floor(Math.random() * 4294967296))
  const {
    state,
    matchState,
    matchScores,
    matchMoveLogs,
    isHumanTurn,
    humanPendingClaim,
    submitHumanMove,
    startNextHand,
    resetMatch,
  } = useGameLoop({
    matchSeed: matchSeed ?? randomMatchSeed,
    botSpeedMs: settings.botSpeedMs,
    initialSnapshot,
    onSnapshotChange,
    paused: dealAnimationActive,
    // No `paused` any more: the "All discards" overlay was its only caller,
    // and it's gone (the discard field is readable in place now, so a
    // separate full-viewport view of the same tiles wasn't earning its
    // button). useGameLoop keeps the capability — it's tested and defaults
    // to false — because the underlying concern is still live: turns are
    // strictly timer-driven, so ANY modal a player sits on can cost them a
    // claim window. Hint / Hand info / Tile counts have always had that
    // problem and have never paused; if that's worth fixing, this is the
    // hook to fix it with.
  })
  const dealFrames = useMemo(
    () => buildInitialDealFrames(state.seed, state.dealerSeat),
    [state.seed, state.dealerSeat],
  )
  useEffect(() => {
    if (!dealAnimationActive) return
    if (reducedMotion) {
      setDealAnimationActive(false)
      setDealFrameIndex(0)
      return
    }
    const atLastFrame = dealFrameIndex >= dealFrames.length - 1
    const delay = atLastFrame
      ? 220
      : dealFrameIndex === 0
        ? 650
        : dealFrames[dealFrameIndex + 1]?.phase === 'flower-replacement'
          ? 180
          : 130
    const timeout = window.setTimeout(() => {
      if (atLastFrame) {
        setDealAnimationActive(false)
        setDealFrameIndex(0)
      } else {
        setDealFrameIndex((index) => index + 1)
      }
    }, delay)
    return () => window.clearTimeout(timeout)
  }, [dealAnimationActive, dealFrameIndex, dealFrames, reducedMotion])
  const initialDealFrame = dealAnimationActive ? dealFrames[Math.min(dealFrameIndex, dealFrames.length - 1)] : undefined

  const beginNextHand = () => {
    if (animateInitialDeal) {
      setDealFrameIndex(0)
      setDealAnimationActive(true)
    }
    startNextHand()
  }
  // Dev-only worst-case occupancy override (KICKOFF-phase5-melds-backs.md's
  // prerequisite harness) — ?occupancy=worst, DEV builds only, read once at
  // mount (a reload picks up a changed param; this is a screenshot-capture
  // tool, not a live toggle). Overlays synthetic discards/melds on top of
  // whatever the live match is actually doing rather than replacing it, so
  // the rest of the app (turn order, wall, hint system) keeps working normally
  // underneath the visualization.
  const [devOccupancyMode] = useState(() => (import.meta.env.DEV ? parseDevOccupancyMode(window.location.search) : null))
  const displayState = boardPreviewOpen
    ? applyDevOccupancy(state, 'preview', HUMAN_SEAT)
    : devOccupancyMode
      ? applyDevOccupancy(state, devOccupancyMode, HUMAN_SEAT)
      : state

  // The engine has already completed and persisted the win at this point;
  // this only lets the revealed table and MAHJONG announcement breathe
  // before the existing result dialog covers them. Exhaustive draws remain
  // immediate, and no game action depends on this timer.
  const winPresentationKey = state.phase === 'handEnded' && state.result?.outcome === 'win'
    ? `${state.seed}-${state.handNumber}`
    : null
  const [presentedWinKey, setPresentedWinKey] = useState<string | null>(null)
  useEffect(() => {
    if (!winPresentationKey || presentedWinKey === winPresentationKey) return
    const timeout = window.setTimeout(() => setPresentedWinKey(winPresentationKey), MAHJONG_ANNOUNCEMENT_MS)
    return () => window.clearTimeout(timeout)
  }, [presentedWinKey, winPresentationKey])
  const resultPresentationReady = winPresentationKey === null || presentedWinKey === winPresentationKey

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

  // Match-scoped latch for the discard hint (DiscardHint.tsx): true until
  // the human's first discard, then restored when Restart begins a fresh
  // match.
  //
  // Deliberately NOT derived from state.players[HUMAN_SEAT].discards.length —
  // that resets with every deal, so the hint would reappear at the start of
  // all 16 hands. Deliberately not persisted either: it costs one obvious
  // line to relearn and persisting it would mean a storage decision (and a
  // "why won't this come back?" support case) for a one-sentence cue.
  const [hasHumanDiscarded, setHasHumanDiscarded] = useState(false)
  const onSubmitDiscard = useCallback(
    (tile: number) => {
      setHasHumanDiscarded(true)
      submitHumanMove({ kind: 'discard', tile })
    },
    [submitHumanMove],
  )
  const { selectedTileId, selectTile, requestDiscardTile } = useDiscardFlow({ onSubmitDiscard })
  const leaveToHome = async () => {
    if (!onHome) { window.location.assign(import.meta.env.BASE_URL); return }
    setHomePending(true)
    try {
      await onHome({ gameState: state, matchState, matchScores, matchMoveLogs })
    } finally {
      setHomePending(false)
    }
  }
  const logout = async () => {
    if (!onLogout) return
    setLogoutPending(true)
    try {
      await onLogout({ gameState: state, matchState, matchScores, matchMoveLogs })
    } finally {
      setLogoutPending(false)
    }
  }

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
      <header className="flex items-center overflow-hidden border-b border-neutral-700 px-4 py-1">
        <div className="relative z-10 flex shrink-0 items-center gap-2 bg-neutral-900 pr-2">
          <button type="button" aria-label={homePending ? 'Saving and returning home' : 'Home'} title="Home" disabled={homePending || logoutPending} onClick={() => void leaveToHome()} className="inline-grid size-11 shrink-0 place-items-center rounded-md border border-neutral-600 hover:bg-neutral-800 disabled:opacity-60"><HomeIcon className="size-5" /></button>
          {onLogout && <button type="button" aria-label={logoutPending ? 'Saving and logging out' : 'Log out'} title="Log out" disabled={homePending || logoutPending} onClick={() => void logout()} className="inline-grid size-11 shrink-0 place-items-center rounded-md border border-neutral-600 text-neutral-200 hover:bg-neutral-800 disabled:opacity-60"><LogoutIcon className="size-5" /></button>}
          <span aria-hidden="true" className="h-6 w-px bg-neutral-700" />
          <button type="button" disabled={homePending || logoutPending} onClick={() => void leaveToHome()} className="hidden text-lg font-semibold tracking-tight hover:text-amber-300 disabled:opacity-60 lg:inline">MCR Mahjong Mentor</button>
          <span className="hidden text-xs text-neutral-400 2xl:inline">Learn while you play</span>
          <span className="hidden rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300 lg:inline-flex">
            {config.assistance === 'learning' ? 'Learning Mode' : 'Without Help'}
          </span>
          <span aria-live="polite" className="hidden text-xs text-neutral-400 xl:inline">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'local-only' ? 'Saved locally — reconnecting…' : 'Saved'}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pl-2">
          <button
            type="button"
            aria-pressed={boardPreviewOpen}
            onClick={() => setBoardPreviewOpen((open) => !open)}
            className={`min-h-11 rounded-md border px-3 text-sm ${
              boardPreviewOpen
                ? 'border-amber-400 bg-amber-950 text-amber-200'
                : 'border-amber-600 text-amber-300 hover:bg-amber-950'
            }`}
          >
            {boardPreviewOpen ? 'Exit full board' : 'Preview full board'}
          </button>
          {capabilities.showTileCounts && <button
            type="button"
            onClick={() => setTileCountGridOpen(true)}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Tile counts
          </button>}
          {capabilities.showStrategyCoach && <button
            type="button"
            onClick={() => setHintOpen((open) => { if (!open) trackSafely(analytics, 'hint_viewed'); return !open })}
            className="min-h-11 min-w-11 rounded-md border border-indigo-500 px-3 text-sm text-indigo-300 hover:bg-indigo-950"
          >
            Hint
          </button>}
          {/* The fan tracker + waits, which used to sit in flow under the
              board and resize it whenever they had something to say. See
              HandInfoPanel.tsx / the HudBar.tsx tombstone. */}
          {capabilities.showHandInformation && <button
            type="button"
            onClick={() => setHandInfoOpen(true)}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Hand info
          </button>}
          {capabilities.showScoringHelp && <button
            type="button"
            onClick={() => openEncyclopedia()}
            className="min-h-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-800"
          >
            Fan encyclopedia
          </button>}
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
          // Preview replaces nearly every rendered tile with a synthetic
          // state that deliberately reuses physical tile ids. Remount at
          // the mode boundary so Board's hand-order cache and Motion's
          // shared-layout registry cannot carry the live board into the
          // preview; previously the missing flowers appeared only after
          // Sort forced a second update.
          key={boardPreviewOpen ? 'full-board-preview' : 'live-board'}
          state={displayState}
          // Initial dealing already advances in explicit, readable groups.
          // Measuring every existing stage object for FLIP on each of those
          // 16+ frames is disproportionately expensive on iPad; disable the
          // board-wide registry only for this short sequence. It returns for
          // live front/back draws, where one tile's travel is informative.
          enableSharedLayout={!boardPreviewOpen && devOccupancyMode === null && !dealAnimationActive}
          matchState={matchState}
          matchScores={matchScores}
          isHumanTurn={boardPreviewOpen || dealAnimationActive ? false : isHumanTurn}
          selectedTileId={selectedTileId}
          onTileClick={selectTile}
          onRequestDiscardTile={!boardPreviewOpen && !dealAnimationActive && isHumanTurn ? requestDiscardTile : undefined}
          selectedTypeId={selectedTypeId}
          onInspectTile={inspectTile}
          showDiscardHint={capabilities.showStrategyCoach && !hasHumanDiscarded}
          initialDealFrame={boardPreviewOpen ? undefined : initialDealFrame}
        />

        <ClaimPrompt
          state={state}
          pendingClaim={humanPendingClaim}
          obscured={hintOpen}
          onDeclare={submitHumanMove}
        />

        {/* The human's own-turn declarations (self-drawn win, concealed and
            added kongs). Without this they are computed as legal by the
            engine and usable by every bot, but unreachable for the player —
            see TurnActionPrompt.tsx. */}
        <TurnActionPrompt state={state} isHumanTurn={!dealAnimationActive && isHumanTurn} onDeclare={submitHumanMove} />

        {capabilities.showStrategyCoach && hintOpen && (
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

      </main>

      {capabilities.showTileCounts && <TileCountGrid
        open={tileCountGridOpen}
        unseenCounts={computeUnseenCounts(state, HUMAN_SEAT)}
        onClose={() => setTileCountGridOpen(false)}
      />}

      {resultPresentationReady && <ScoreScreen
        state={state}
        matchScores={matchScores}
        onNextHand={beginNextHand}
        onFanClick={capabilities.showScoringHelp ? openEncyclopedia : undefined}
        onReviewHand={openReplay}
        matchCompleted={matchState.completed}
        onMatchComplete={() => window.location.assign(import.meta.env.BASE_URL)}
      />}

      {capabilities.showScoringHelp && encyclopediaOpen && <FanEncyclopedia initialFanId={encyclopediaFanId} onClose={() => setEncyclopediaOpen(false)} />}

      {replaySnapshot && <ReplayView handMoveLogs={replaySnapshot} onClose={() => setReplaySnapshot(null)} />}

      <ExportPositionModal open={exportOpen} state={state} forSeat={HUMAN_SEAT} onClose={() => setExportOpen(false)} />

      {capabilities.showHandInformation && <HandInfoPanel
        open={handInfoOpen}
        hand={state.players[HUMAN_SEAT].hand}
        prevailingWind={state.prevailingWind}
        seatWind={state.players[HUMAN_SEAT].seatWind}
        onClose={() => setHandInfoOpen(false)}
      />}

      <StatsPanel open={statsOpen} stats={stats} onClose={() => setStatsOpen(false)} />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onUpdate={update} />

      <RestartConfirmModal
        open={restartConfirmOpen}
        onConfirm={() => {
          setRestartConfirmOpen(false)
          const restartWithDeal = () => {
            if (animateInitialDeal) {
              setDealFrameIndex(0)
              setDealAnimationActive(true)
            }
            resetMatch()
            setHasHumanDiscarded(false)
          }
          if (!onRestart) { restartWithDeal(); return }
          void Promise.resolve(onRestart()).catch(() => {}).finally(restartWithDeal)
        }}
        onCancel={() => setRestartConfirmOpen(false)}
      />
    </div>
    </MotionConfig>
    </SettingsContext.Provider>
  )
}

export default App
