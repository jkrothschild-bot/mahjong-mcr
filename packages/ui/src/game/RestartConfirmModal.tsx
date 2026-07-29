export interface RestartConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Restarting abandons the whole in-progress match (all hands played so
// far this match, not just the current hand) — a real "are you sure",
// same posture as DiscardConfirmModal, but red rather than amber since
// it's a bigger loss than one tile. Session stats (Stats panel) are
// explicitly untouched by a restart — see useGameLoop.ts's 'reset' case —
// so this confirmation is purely about losing match progress, not stats.
export function RestartConfirmModal({ open, onConfirm, onCancel }: RestartConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        role="dialog"
        aria-label="Confirm restart"
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-4 rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        <p className="text-sm">
          Restart the game? <b>This abandons the current match</b> and deals a fresh one.
        </p>
        <p className="text-xs text-neutral-400">Your session stats (hands played, wins, etc.) are not affected.</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-md border border-neutral-600 px-4 text-sm hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  )
}
