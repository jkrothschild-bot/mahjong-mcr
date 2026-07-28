import { computeBestMoveHint, typeIdOfInstance, type Hand } from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'
import { TileFaceContent } from '../tiles/TileFaceContent.js'
import { tileFaceCompactClassName } from '../tiles/tileStyles.js'

export interface BestMoveTabProps {
  hand: Hand
}

// SPEC.md §6's Best Move tab ≈ Nudge + Options: the recommended discard +
// one-line reason is the shallow read; the alternatives list below it is
// the deeper "other reasonable choices" detail, both visible as soon as the
// tab opens (no extra click to go from nudge to reasoning).
export function BestMoveTab({ hand }: BestMoveTabProps) {
  const hint = computeBestMoveHint(hand)
  if (!hint) return <p className="text-sm text-neutral-400">No discard decision to make right now.</p>

  const recommendedType = typeIdOfInstance(hint.recommendedDiscard)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={tileFaceCompactClassName()}>
          <TileFaceContent typeId={recommendedType} />
        </div>
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-neutral-100">Discard {tileDisplayName(recommendedType)}</span>
          <span className="text-neutral-300">{hint.reason}</span>
        </div>
      </div>

      {hint.alternatives.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Other reasonable choices</h4>
          <ul role="list" aria-label="Other reasonable discards" className="flex flex-wrap gap-2">
            {hint.alternatives.map((alt) => {
              const typeId = typeIdOfInstance(alt.tile)
              return (
                <li key={alt.tile} role="listitem" className="flex items-center gap-1.5">
                  <div className={tileFaceCompactClassName()}>
                    <TileFaceContent typeId={typeId} />
                  </div>
                  <span className="text-xs text-neutral-300">{tileDisplayName(typeId)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
