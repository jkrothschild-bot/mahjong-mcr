import { Link } from 'react-router-dom'
import { assistanceLabel } from '../app/gameConfig.js'
import type { SavedGame } from '../persistence/savedGameTypes.js'

export function ResumeGameCard({ game, guest, onStartNewGame }: { game: SavedGame; guest: boolean; onStartNewGame: () => void }) {
  const saved = new Date(game.savedAt)
  return (
    <aside className="mt-7 rounded-2xl border border-emerald-800/20 bg-white/80 p-5 shadow-sm" aria-label="Unfinished game">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">Continue your game?</p>
      <p className="mt-2 text-stone-600">{assistanceLabel(game.config.assistance)} · saved {Number.isNaN(saved.valueOf()) ? 'on this device' : saved.toLocaleString()}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/game" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-900 px-5 font-bold text-white hover:bg-emerald-800">Resume Game</Link>
        <button type="button" onClick={onStartNewGame} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-900/20 px-5 font-semibold text-emerald-950 hover:bg-emerald-50">Start New Game</button>
      </div>
      {guest && <p className="mt-4 text-sm text-stone-500"><Link to="/register" className="font-semibold text-emerald-800 underline-offset-4 hover:underline">Create an account to keep your progress across devices</Link></p>}
    </aside>
  )
}
