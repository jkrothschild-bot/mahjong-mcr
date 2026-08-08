import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import App from '../App.js'
import { isGameConfig, type GameConfig } from '../app/gameConfig.js'
import { storeCurrentGameConfig } from '../app/gameConfigStorage.js'
import type { LoopState } from '../game/useGameLoop.js'
import { createSessionId, isMatchComplete, type SavedGame } from '../persistence/savedGameTypes.js'
import { useAuth } from '../auth/AuthContext.js'
import { gamePersistenceForUser } from '../persistence/persistenceCoordinator.js'
import { useAnalytics } from '../analytics/AnalyticsContext.js'
import { trackSafely } from '../analytics/AnalyticsService.js'

interface GameLocationState { config?: GameConfig }

export function GamePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const analytics = useAnalytics()
  const routeConfig = (location.state as GameLocationState | null)?.config
  const freshConfigRef = useRef<GameConfig | null>(isGameConfig(routeConfig) ? routeConfig : null)
  const freshConfig = freshConfigRef.current
  const persistence = useMemo(() => gamePersistenceForUser(auth.user?.id ?? null), [auth.user?.id])
  const [restored, setRestored] = useState<SavedGame | null | undefined>(freshConfig ? null : undefined)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'local-only'>('saved')
  const sessionRef = useRef<{ id: string; startedAt: string } | null>(null)
  const journeyTracked = useRef(false)
  const currentHandKey = useRef<string | null>(null)
  const completedHands = useRef(new Set<string>())

  useEffect(() => {
    // React Router history state survives a browser refresh. Clear the
    // one-shot "new game" payload after capturing it in freshConfigRef so a
    // later refresh restores the autosave instead of dealing a new match.
    if (isGameConfig(routeConfig)) navigate('/game', { replace: true })
  }, [navigate, routeConfig])

  useEffect(() => {
    if (freshConfig || auth.loading) return
    void persistence.loadActiveGame().then(setRestored)
  }, [freshConfig, auth.loading, persistence])

  const config = freshConfig ?? restored?.config ?? null
  useEffect(() => {
    if (!config || restored === undefined || journeyTracked.current) return
    journeyTracked.current = true
    trackSafely(analytics, restored ? 'saved_game_resumed' : 'game_started', { assistance: config.assistance })
  }, [analytics, config, restored])
  const saveSnapshot = useCallback(async (snapshot: LoopState) => {
    if (!config) return
    const handKey = `${snapshot.gameState.seed}-${snapshot.gameState.handNumber}`
    if (currentHandKey.current === null) {
      currentHandKey.current = handKey
      if (!restored) trackSafely(analytics, 'hand_started', { handNumber: snapshot.gameState.handNumber })
    } else if (currentHandKey.current !== handKey) {
      currentHandKey.current = handKey
      trackSafely(analytics, 'hand_started', { handNumber: snapshot.gameState.handNumber })
    }
    if (snapshot.gameState.phase === 'handEnded' && !completedHands.current.has(handKey)) {
      completedHands.current.add(handKey)
      trackSafely(analytics, 'hand_completed', { handNumber: snapshot.gameState.handNumber, outcome: snapshot.gameState.result?.outcome ?? null })
      if (isMatchComplete(snapshot)) trackSafely(analytics, 'game_completed')
    }
    const session = sessionRef.current!
    setSaveStatus('saving')
    const savedAt = new Date().toISOString()
    const game: SavedGame = {
      schemaVersion: 1,
      id: session.id,
      ...(auth.user ? { ownerId: auth.user.id } : {}),
      status: isMatchComplete(snapshot) ? 'completed' : 'active',
      startedAt: session.startedAt,
      savedAt,
      config,
      game: snapshot,
    }
    const write = game.status === 'completed' ? persistence.completeGame(game) : persistence.saveActiveGame(game)
    try {
      await write
      setSaveStatus('saved')
    } catch {
      setSaveStatus('local-only')
    }
  }, [analytics, auth.user, config, persistence, restored])
  const onSnapshotChange = useCallback((snapshot: LoopState) => { void saveSnapshot(snapshot) }, [saveSnapshot])
  const onHome = useCallback(async (snapshot: LoopState) => { await saveSnapshot(snapshot); navigate('/') }, [navigate, saveSnapshot])
  const onLogout = useCallback(async (snapshot: LoopState) => {
    await saveSnapshot(snapshot)
    navigate('/')
    await auth.signOut()
  }, [auth, navigate, saveSnapshot])

  const onRestart = useCallback(async () => {
    await persistence.clearActiveGame().catch(() => {})
    sessionRef.current = { id: createSessionId(), startedAt: new Date().toISOString() }
    currentHandKey.current = null
    completedHands.current.clear()
  }, [persistence])

  if (restored === undefined) return <div className="grid min-h-svh place-items-center bg-neutral-900 text-neutral-200">Restoring your game…</div>
  if (!config) return <Navigate to="/play" replace />
  storeCurrentGameConfig(config)
  sessionRef.current ??= restored ? { id: restored.id, startedAt: restored.startedAt } : { id: createSessionId(), startedAt: new Date().toISOString() }

  return <App config={config} initialSnapshot={restored?.game} onSnapshotChange={onSnapshotChange} saveStatus={saveStatus} onRestart={onRestart} onHome={onHome} onLogout={auth.user ? onLogout : undefined} />
}
