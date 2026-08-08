import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import { HomeIcon } from './HomeIcon.js'

export function AppHeader() {
  const auth = useAuth()
  const navigate = useNavigate()
  const logout = async () => { navigate('/'); await auth.signOut() }
  return (
    <header className="border-b border-emerald-950/10 bg-[#fbfaf5]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-950/5"><HomeIcon />Home</Link>
          <span aria-hidden="true" className="h-6 w-px bg-emerald-950/15" />
          <Link to="/" aria-label="MCR Mahjong Mentor home" className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-900 text-lg text-white shadow-sm">發</span>
            <span className="hidden truncate font-serif text-lg font-semibold tracking-tight text-emerald-950 sm:inline">MCR Mahjong Mentor</span>
          </Link>
        </div>
        {auth.user ? <nav aria-label="Account navigation" className="flex items-center gap-1 text-sm font-medium sm:gap-2"><Link to="/account" className="min-h-11 rounded-lg px-3 py-3 text-emerald-950 hover:bg-emerald-950/5 sm:px-4">Account</Link><button type="button" onClick={() => void logout()} className="min-h-11 rounded-lg border border-emerald-900/20 px-3 text-emerald-950 hover:bg-emerald-50 sm:px-4">Log out</button></nav> : <nav aria-label="Account navigation" className="flex items-center gap-1 text-sm font-medium sm:gap-2"><Link to="/login" className="min-h-11 rounded-lg px-3 py-3 text-emerald-950 hover:bg-emerald-950/5 sm:px-4">Log In</Link><Link to="/register" className="hidden min-h-11 rounded-lg bg-emerald-900 px-4 py-3 text-white shadow-sm hover:bg-emerald-800 sm:inline-flex">Create Account</Link></nav>}
      </div>
    </header>
  )
}
