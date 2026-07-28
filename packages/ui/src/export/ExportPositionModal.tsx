import { useState } from 'react'
import type { GameState, Seat } from '@mahjong-mcr/engine'
import { formatPositionText } from './formatPosition.js'

export interface ExportPositionModalProps {
  open: boolean
  state: GameState
  forSeat: Seat
  onClose: () => void
}

// SPEC.md §9's "ask about this position" export: copy/paste text only, no
// live API call. navigator.clipboard.writeText can reject (permission
// denied, insecure context) — guarded so a denial just leaves the "Copy"
// button's label unchanged rather than throwing into the render tree.
export function ExportPositionModal({ open, state, forSeat, onClose }: ExportPositionModalProps) {
  const [copied, setCopied] = useState(false)
  if (!open) return null

  const text = formatPositionText(state, forSeat)

  const onCopy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Export position"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Export position</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
        <textarea
          readOnly
          aria-label="Position text"
          value={text}
          rows={12}
          className="w-full rounded-md border border-neutral-600 bg-neutral-900 p-2 font-mono text-xs text-neutral-100"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={onCopy}
          className="min-h-11 rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
