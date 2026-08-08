import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.js'
import { SiteFooter } from '../components/SiteFooter.js'
import { loadPreferredAssistance, storeCurrentGameConfig } from '../app/gameConfigStorage.js'
import type { GameConfig } from '../app/gameConfig.js'
import { useAuth } from '../auth/AuthContext.js'
import { profileService } from '../auth/supabaseProfileService.js'
import { useAnalytics } from '../analytics/AnalyticsContext.js'
import { trackSafely } from '../analytics/AnalyticsService.js'
import { gamePersistenceForUser } from '../persistence/persistenceCoordinator.js'
import { StartNewGameDialog } from '../components/StartNewGameDialog.js'

export function PlayPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const analytics = useAnalytics()
  const [assistance, setAssistance] = useState<GameConfig['assistance']>(loadPreferredAssistance)
  const [confirmNewGame, setConfirmNewGame] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const launch = () => {
    const config: GameConfig = { variant: 'mcr', mode: 'solo', assistance }
    trackSafely(analytics, assistance === 'learning' ? 'learning_mode_selected' : 'without_help_selected')
    storeCurrentGameConfig(config)
    if (auth.user) void profileService.savePreferredAssistance(auth.user.id, assistance).catch(() => {})
    navigate('/game', { state: { config } })
  }
  const start = async () => {
    const persistence = gamePersistenceForUser(auth.user?.id ?? null)
    const active = await persistence.loadActiveGame()
    if (active) { setStartError(null); setConfirmNewGame(true); return }
    launch()
  }
  const replaceAndStart = async () => {
    setStarting(true)
    setStartError(null)
    try {
      await gamePersistenceForUser(auth.user?.id ?? null).clearActiveGame()
      setConfirmNewGame(false)
      launch()
    } catch {
      setStartError('Unable to replace the saved game right now. Please try again.')
    } finally {
      setStarting(false)
    }
  }
  return (
    <div className="flex min-h-svh flex-col bg-[#fbfaf5] text-stone-900"><AppHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-emerald-800">Solo · Chinese Official Mahjong</p>
        <h1 className="mt-3 text-center font-serif text-4xl font-semibold text-emerald-950 sm:text-5xl">How would you like to play?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-center leading-7 text-stone-600">Both choices use the same complete MCR game. You can change your preference before starting a new match.</p>
        <fieldset className="mt-10 grid gap-4 md:grid-cols-2"><legend className="sr-only">Assistance mode</legend>
          <ModeCard checked={assistance === 'learning'} onChange={() => setAssistance('learning')} title="Learning Mode" badge="Recommended" description="Get strategy, hand-development and scoring guidance when you ask for it." />
          <ModeCard checked={assistance === 'none'} onChange={() => setAssistance('none')} title="Play Without Help" description="Play the same MCR game without hints, recommendations or fan-progress advice." />
        </fieldset>
        <button type="button" onClick={() => void start()} className="mx-auto mt-8 min-h-12 min-w-48 rounded-xl bg-amber-400 px-7 py-3 font-bold text-emerald-950 shadow-lg shadow-amber-700/15 hover:bg-amber-300">Start Game</button>
      </main><SiteFooter /><StartNewGameDialog open={confirmNewGame} busy={starting} error={startError} onConfirm={() => void replaceAndStart()} onCancel={() => { setConfirmNewGame(false); setStartError(null) }} /></div>
  )
}

function ModeCard({ checked, onChange, title, badge, description }: { checked: boolean; onChange: () => void; title: string; badge?: string; description: string }) {
  return (
    <label className={`relative flex min-h-52 cursor-pointer flex-col rounded-2xl border-2 p-6 shadow-sm transition ${checked ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/10' : 'border-stone-200 bg-white hover:border-emerald-500/60'}`}>
      <input type="radio" aria-label={title} name="assistance" value={title} checked={checked} onChange={onChange} className="absolute right-5 top-5 size-5 accent-emerald-800" />
      {badge && <span className="w-fit rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">{badge}</span>}
      <h2 className="mt-5 font-serif text-2xl font-semibold text-emerald-950">{title}</h2>
      <p className="mt-3 max-w-sm leading-7 text-stone-600">{description}</p>
    </label>
  )
}
