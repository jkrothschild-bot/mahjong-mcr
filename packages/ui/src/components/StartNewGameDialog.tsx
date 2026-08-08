export function StartNewGameDialog({ open, busy = false, error, onConfirm, onCancel }: { open: boolean; busy?: boolean; error?: string | null; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/45 p-5" onClick={busy ? undefined : onCancel}>
    <div role="dialog" aria-modal="true" aria-labelledby="start-new-game-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
      <h2 id="start-new-game-title" className="font-serif text-2xl font-semibold text-emerald-950">Start a new game?</h2>
      <p className="mt-3 text-stone-600">Your current game will be replaced.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-lg border border-stone-300 px-5 font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">Cancel</button>
        <button type="button" disabled={busy} onClick={onConfirm} className="min-h-11 rounded-lg bg-emerald-900 px-5 font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{busy ? 'Starting…' : 'Start New Game'}</button>
      </div>
    </div>
  </div>
}
