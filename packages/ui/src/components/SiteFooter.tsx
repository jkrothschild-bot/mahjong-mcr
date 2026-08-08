import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="border-t border-emerald-950/10 bg-[#f1eee3]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} MCR Mahjong Mentor</p>
        <nav aria-label="Legal and support" className="flex gap-5">
          <Link className="underline-offset-4 hover:text-emerald-900 hover:underline" to="/privacy">Privacy</Link>
          <Link className="underline-offset-4 hover:text-emerald-900 hover:underline" to="/terms">Terms</Link>
          <Link className="underline-offset-4 hover:text-emerald-900 hover:underline" to="/feedback">Feedback</Link>
        </nav>
      </div>
    </footer>
  )
}
