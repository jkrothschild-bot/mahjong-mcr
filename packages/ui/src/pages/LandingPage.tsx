import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.js'
import { GamePreview } from '../components/GamePreview.js'
import { SiteFooter } from '../components/SiteFooter.js'
import { ResumeGameCard } from '../components/ResumeGameCard.js'
import type { SavedGame } from '../persistence/savedGameTypes.js'
import { useAuth } from '../auth/AuthContext.js'
import { gamePersistenceForUser } from '../persistence/persistenceCoordinator.js'
import { useAnalytics } from '../analytics/AnalyticsContext.js'
import { trackSafely } from '../analytics/AnalyticsService.js'
import { SAVE_MIGRATED_EVENT } from '../components/GuestSaveMigration.js'
import { StartNewGameDialog } from '../components/StartNewGameDialog.js'

const VISITED_KEY = 'mcr-mahjong:has-visited:v1'

const BENEFITS = [
  ['Learn as you play', 'Ask for explanations in the situations that actually arise at the table.'],
  ['Understand MCR scoring', 'See how scoring combinations contribute toward the eight-point minimum.'],
  ['Play at your own level', 'Choose Learning Mode guidance or the same game without strategic help.'],
  ['Continue later', 'Create an account to save an unfinished match and resume on another device.'],
] as const

export function LandingPage() {
  const [activeGame, setActiveGame] = useState<SavedGame | null | undefined>(undefined)
  const [confirmNewGame, setConfirmNewGame] = useState(false)
  const [replacingGame, setReplacingGame] = useState(false)
  const [replaceError, setReplaceError] = useState<string | null>(null)
  const auth = useAuth()
  const analytics = useAnalytics()
  const navigate = useNavigate()
  const persistence = useMemo(() => gamePersistenceForUser(auth.user?.id ?? null), [auth.user?.id])
  useEffect(() => {
    trackSafely(analytics, 'landing_page_viewed')
    try {
      if (window.localStorage.getItem(VISITED_KEY)) trackSafely(analytics, 'return_visit')
      else window.localStorage.setItem(VISITED_KEY, 'true')
    } catch { /* Analytics identity storage is optional. */ }
  }, [analytics])
  useEffect(() => {
    if (auth.loading) return
    let current = true
    const refresh = () => {
      setActiveGame(undefined)
      void persistence.loadActiveGame().then(
        game => { if (current) setActiveGame(game) },
        () => { if (current) setActiveGame(null) },
      )
    }
    refresh()
    window.addEventListener(SAVE_MIGRATED_EVENT, refresh)
    return () => { current = false; window.removeEventListener(SAVE_MIGRATED_EVENT, refresh) }
  }, [auth.loading, persistence])

  const startNewGame = async () => {
    setReplacingGame(true)
    setReplaceError(null)
    try {
      await persistence.clearActiveGame()
      setActiveGame(null)
      setConfirmNewGame(false)
      navigate('/play')
    } catch {
      setReplaceError('Unable to replace the saved game right now. Please try again.')
    } finally {
      setReplacingGame(false)
    }
  }

  const stateLoaded = !auth.loading && activeGame !== undefined
  const isGuest = !auth.user
  return (
    <div className="min-h-svh bg-[#fbfaf5] text-stone-900">
      <AppHeader />
      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="absolute -top-40 right-[-12rem] size-[34rem] rounded-full bg-amber-200/35 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-800">Chinese Official Mahjong · MCR</p>
              <h1 className="max-w-xl font-serif text-5xl leading-[1.02] font-semibold tracking-tight text-emerald-950 sm:text-6xl">Learn Mahjong by actually playing it</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">Play Chinese Official Mahjong (MCR) against computer opponents, with strategy and scoring explained while you play.</p>
              {!stateLoaded && <button type="button" disabled className="mt-8 min-h-12 rounded-xl bg-amber-300/60 px-6 py-3 font-bold text-emerald-950/70">Checking saved game…</button>}
              {stateLoaded && activeGame && <ResumeGameCard game={activeGame} guest={isGuest} onStartNewGame={() => { setReplaceError(null); setConfirmNewGame(true) }} />}
              {stateLoaded && !activeGame && auth.user && <div className="mt-8"><Link to="/play" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-bold text-emerald-950 shadow-lg shadow-amber-700/15 hover:bg-amber-300">Start New Game</Link></div>}
              {stateLoaded && !activeGame && isGuest && <><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/play" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-bold text-emerald-950 shadow-lg shadow-amber-700/15 hover:bg-amber-300">Start Playing Free</Link><Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-900/25 bg-white px-6 py-3 font-semibold text-emerald-950 hover:bg-emerald-50">Create Account</Link></div><p className="mt-4 text-sm text-stone-500">No download required · No account needed to try it</p></>}
            </div>
            <GamePreview />
          </div>
        </section>
        <section aria-labelledby="benefits-heading" className="bg-emerald-950 py-16 text-white">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">A Mahjong game that teaches you why</p>
            <h2 id="benefits-heading" className="mt-3 max-w-2xl font-serif text-3xl font-semibold sm:text-4xl">Build confidence one real hand at a time</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(([title, body]) => <article key={title} className="bg-emerald-950 p-6"><h3 className="font-serif text-xl font-semibold text-amber-200">{title}</h3><p className="mt-3 text-sm leading-6 text-emerald-50/75">{body}</p></article>)}
            </div>
          </div>
        </section>
        <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 id="how-heading" className="font-serif text-3xl font-semibold text-emerald-950 sm:text-4xl">How it works</h2>
          <ol className="mt-9 grid gap-8 md:grid-cols-3">
            {([
              ['1', 'Choose how you want to play', 'Use Learning Mode or play without strategic assistance.'],
              ['2', 'Play against computer opponents', 'Start a solo MCR match immediately—no waiting room required.'],
              ['3', 'Learn from real situations', 'Ask for guidance as scoring and strategy decisions occur naturally.'],
            ] as const).map(([number, title, body]) => <li key={number} className="border-t border-emerald-900/20 pt-5"><span className="text-sm font-bold text-amber-700">{number.padStart(2, '0')}</span><h3 className="mt-2 font-serif text-xl font-semibold text-emerald-950">{title}</h3><p className="mt-2 leading-7 text-stone-600">{body}</p></li>)}
          </ol>
          <div className="mt-12 rounded-2xl bg-amber-100 px-6 py-7 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><h2 className="font-serif text-2xl font-semibold text-emerald-950">Ready to take a seat?</h2><p className="mt-1 text-stone-600">{activeGame ? 'Your unfinished match is ready when you are.' : auth.user ? 'Start a new MCR match whenever you are ready.' : 'Try a complete MCR match without creating an account.'}</p></div>{!stateLoaded ? <button type="button" disabled className="mt-5 min-h-12 rounded-xl bg-emerald-900/60 px-6 py-3 font-bold text-white sm:mt-0">Checking…</button> : activeGame ? <Link to="/game" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-800 sm:mt-0">Resume Game</Link> : <Link to="/play" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-800 sm:mt-0">{auth.user ? 'Start New Game' : 'Start Playing Free'}</Link>}</div>
        </section>
      </main>
      <SiteFooter />
      <StartNewGameDialog open={confirmNewGame} busy={replacingGame} error={replaceError} onConfirm={() => void startNewGame()} onCancel={() => { setConfirmNewGame(false); setReplaceError(null) }} />
    </div>
  )
}
