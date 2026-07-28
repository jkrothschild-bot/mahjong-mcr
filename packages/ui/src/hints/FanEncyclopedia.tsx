import { useState } from 'react'
import { ALL_FANS } from '@mahjong-mcr/engine'

export interface FanEncyclopediaProps {
  onClose: () => void
  // When set (e.g. tapping a fan name in the score screen), the search box
  // opens pre-filled with this fan's exact name so it's the only (or first)
  // result — the "tap a fan → see its definition" link SPEC.md §6 asks for.
  // Only seeds the search box on MOUNT (a lazy useState initializer) — the
  // caller conditionally renders this component (same pattern as
  // HintPanel), so it fully mounts fresh every time it opens.
  initialFanId?: number
}

// SPEC.md §6's fan encyclopedia: a searchable, browsable reference of all
// 81 fans, linked from the Hint panel and the end-of-hand score screen. No
// example hands in v1 (see scoring/encyclopedia.ts's own doc comment) —
// just id/name/points/rule text, all sourced directly from ALL_FANS.
export function FanEncyclopedia({ onClose, initialFanId }: FanEncyclopediaProps) {
  const [search, setSearch] = useState(() => (initialFanId !== undefined ? ALL_FANS.find((f) => f.id === initialFanId)?.name ?? '' : ''))

  const filtered = ALL_FANS.filter((fan) => fan.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Fan encyclopedia"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fan encyclopedia</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md border border-neutral-600 px-3 text-sm hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

        <input
          type="text"
          aria-label="Search fans"
          placeholder="Search fans by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-11 rounded-md border border-neutral-600 bg-neutral-900 px-3 text-sm text-neutral-100"
        />

        <ul role="list" aria-label="Fans" className="flex flex-col gap-2">
          {filtered.map((fan) => (
            <li
              key={fan.id}
              data-testid={`encyclopedia-fan-${fan.id}`}
              role="listitem"
              className="rounded-md border border-neutral-700 p-2"
            >
              <div className="flex justify-between text-sm font-semibold text-neutral-100">
                <span>{fan.name}</span>
                <span className="font-mono">{fan.points}</span>
              </div>
              <p className="text-sm text-neutral-300">{fan.ruleText}</p>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-sm text-neutral-400">No fans match "{search}".</li>}
        </ul>
      </div>
    </div>
  )
}
