import { computeBestMoveHint, typeIdOfInstance, type Hand, type TileTypeId } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { useSettingsContext } from '../settings/SettingsContext.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'

export interface BestMoveTabProps {
  hand: Hand
}

const SHAPE_LABEL: Record<'standard' | 'sevenPairs' | 'thirteenOrphans', string> = {
  standard: 'Standard',
  sevenPairs: 'Seven Pairs',
  thirteenOrphans: 'Thirteen Orphans',
}

function shantenLabel(shanten: number): string {
  if (shanten === Infinity) return 'Not possible'
  if (shanten <= -1) return 'Complete'
  if (shanten === 0) return 'Tenpai'
  return `${shanten}-shanten`
}

function outsWord(n: number): string {
  return `${n} out${n === 1 ? '' : 's'}`
}

// ux-reviewer finding (Stage 1f verification): a raw "0% confidence" chip
// sitting directly under a well-reasoned numbered feature list reads as the
// coach contradicting itself — 0% is mathematically correct (confidence is
// the score margin over the top TWO candidates, and tied candidates have
// zero margin by construction) but a bare percentage doesn't communicate
// "these are genuinely tied," it reads as "this recommendation might be
// wrong." Below this threshold, show a qualitative label instead of the
// number; the number stays honest and unrounded-away above it.
const LOW_CONFIDENCE_THRESHOLD = 0.15

function confidenceLabel(confidence: number): string {
  if (confidence < LOW_CONFIDENCE_THRESHOLD) return 'Close call among ties'
  return `${Math.round(confidence * 100)}% confidence`
}

// ux-reviewer finding: hint.alternatives is per PHYSICAL tile instance
// (rankDiscards' own natural granularity — bots/hints share it), so a hand
// with 3 concealed copies of the same tied type rendered 3 visually
// identical cards in a row, reading as a rendering bug rather than 3
// intentional choices. Tiles of the same type always evaluate identically
// (tile-efficiency.ts's own doc comment), and rankDiscards' comparator
// treats them as fully tied, so equal-type entries are always contiguous in
// `alternatives` — collapsing consecutive same-type runs into one card (with
// a ×N count) is lossless, not an approximation.
interface DedupedAlternative {
  typeId: TileTypeId
  relativeScore: number
  count: number
}

export function dedupeAlternatives(alternatives: readonly { tile: number; relativeScore: number }[]): DedupedAlternative[] {
  const result: DedupedAlternative[] = []
  for (const alt of alternatives) {
    const typeId = typeIdOfInstance(alt.tile)
    const last = result[result.length - 1]
    if (last && last.typeId === typeId) {
      last.count += 1
    } else {
      result.push({ typeId, relativeScore: alt.relativeScore, count: 1 })
    }
  }
  return result
}

// Also from the ux-review: an uncapped alternatives list (10 tied candidates
// isn't rare early-game) pushed the dialog past its own 85vh/iPad-1024x768
// budget with no scroll affordance. "Other reasonable choices" is meant as
// lightweight supplementary color, not an exhaustive ranked list, so cap it
// and say how many more there were.
const MAX_ALTERNATIVES_SHOWN = 6

// SPEC.md §6's Best Move tab ≈ Nudge + Options: the recommended tile +
// headline is the shallow read; the numbered features and route table below
// are the deeper "why this is the strongest move" detail, both visible as
// soon as the tab opens (no extra click to go from nudge to reasoning).
//
// KICKOFF-phase10-strategy-coach.md Stage 1f: rebuilt for computeBestMoveHint's
// structured output (headline/features/routeTable/confidence/alternatives)
// — follows the owner's mockup's information design (numbered reasons, a
// route table, alternatives with relative weight, a confidence chip), but
// its visual styling is aspirational per that doc; this keeps the current
// app's own panel look (matches HandPlanTab/TileSafetyTab) where they'd
// conflict.
export function BestMoveTab({ hand }: BestMoveTabProps) {
  const { tileScale } = useSettingsContext()
  const hint = computeBestMoveHint(hand)
  if (!hint) return <p className="text-sm text-neutral-400">No discard decision to make right now.</p>

  const recommendedType = typeIdOfInstance(hint.recommendedDiscard)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={tileFaceCompactClassName({ scale: tileScale })}>
            <TileFaceContent typeId={recommendedType} />
          </div>
          <div className="flex flex-col text-sm">
            <span className="font-semibold text-neutral-100">Discard {tileDisplayName(recommendedType)}</span>
            <span className="text-neutral-300">{hint.headline}</span>
          </div>
        </div>
        <span
          data-testid="best-move-confidence"
          className="shrink-0 rounded-full border border-indigo-700 bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-300"
        >
          {confidenceLabel(hint.confidence)}
        </span>
      </div>

      {hint.features.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Why this is the strongest move</h4>
          <ol className="flex flex-col gap-1.5">
            {hint.features.map((feature, index) => (
              <li key={feature.title} className="flex gap-2 text-sm">
                <span
                  aria-hidden
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold text-neutral-200"
                >
                  {index + 1}
                </span>
                <span>
                  <span className="font-semibold text-neutral-100">{feature.title}</span>{' '}
                  <span className="text-neutral-300">{feature.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Routes</h4>
        <ul role="list" aria-label="Route table" className="flex flex-col gap-0.5 text-sm">
          {hint.routeTable.map((route) => (
            <li
              key={route.shape}
              role="listitem"
              className={`flex justify-between ${route.viable ? 'text-neutral-100' : 'text-neutral-500'}`}
            >
              <span>
                {SHAPE_LABEL[route.shape]}
                {route.viable && <span className="ml-1 text-emerald-400">●</span>}
              </span>
              <span className="font-mono">
                {shantenLabel(route.shanten)}
                {route.shanten > -1 && route.shanten !== Infinity ? ` · ${outsWord(route.ukeireCount)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {hint.alternatives.length > 0 &&
        (() => {
          const deduped = dedupeAlternatives(hint.alternatives)
          const shown = deduped.slice(0, MAX_ALTERNATIVES_SHOWN)
          const hiddenCount = deduped.length - shown.length
          return (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Other reasonable choices</h4>
              <ul role="list" aria-label="Other reasonable discards" className="flex flex-wrap gap-2">
                {shown.map((alt) => (
                  <li key={alt.typeId} role="listitem" className="flex items-center gap-1.5">
                    <div className={tileFaceCompactClassName({ scale: tileScale })}>
                      <TileFaceContent typeId={alt.typeId} />
                    </div>
                    <span className="flex flex-col text-xs text-neutral-300">
                      <span>
                        {tileDisplayName(alt.typeId)}
                        {alt.count > 1 ? ` ×${alt.count}` : ''}
                      </span>
                      <span className="font-mono text-neutral-500">{Math.round(alt.relativeScore * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 && <span className="text-xs text-neutral-500">+{hiddenCount} more</span>}
            </div>
          )
        })()}
    </div>
  )
}
