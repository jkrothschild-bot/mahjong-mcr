import {
  computeHandPlan,
  computeRouteToPoints,
  FAN_REGISTRY,
  type FanProgress,
  type FanTargetEstimate,
  type Hand,
  type MinimumPointsStatus,
  type RouteToPointsResult,
  type Wind,
} from '@mahjong-mcr/engine'
import { tileDisplayName } from '../board/tileNames.js'

export interface RouteToPointsTabProps {
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
  onFanClick?: (fanId: number) => void
}

interface RouteToPointsPanelProps {
  result: RouteToPointsResult
  lockedInFans: readonly FanProgress[]
  onFanClick?: (fanId: number) => void
}

const STATUS_COPY: Record<MinimumPointsStatus, { headline: string; detail: string; className: string; icon: string }> = {
  reachable: {
    headline: 'A route to 8 points is open',
    detail: "There's a way to the 8-point minimum from here — it still has to come together.",
    className: 'border-emerald-600 bg-emerald-950/50 text-emerald-100',
    icon: '✓',
  },
  currentWaitsFallShort: {
    headline: 'Your current waits fall short',
    detail:
      "Finishing this exact hand won't reach 8 points on any of its current waits. Breaking tenpai and rebuilding toward a different hand could still get you there.",
    className: 'border-rose-600 bg-rose-950/50 text-rose-100',
    icon: '!',
  },
  unknown: {
    headline: 'No clear route yet',
    detail: "Too early to tell — this hand hasn't shown a credible route to 8 points yet, but it's not ruled out either.",
    className: 'border-amber-700 bg-amber-950/35 text-amber-100',
    icon: '?',
  },
}

function routeRole(candidate: FanTargetEstimate, result: RouteToPointsResult): string {
  if (candidate.status === 'locked') return 'Locked into this shape'
  if (result.credibleSelected.includes(candidate)) return 'Current route'
  if (result.selected.includes(candidate)) return 'Ceiling only'
  return 'Alternative'
}

function FanName({ fanId, name, onFanClick }: { fanId: number; name: string; onFanClick?: (fanId: number) => void }) {
  return onFanClick ? (
    <button
      type="button"
      onClick={() => onFanClick(fanId)}
      className="text-left underline decoration-dotted underline-offset-2 hover:text-amber-300"
    >
      {name}
    </button>
  ) : (
    <span>{name}</span>
  )
}

function CandidateRow({ candidate, result, onFanClick }: { candidate: FanTargetEstimate; result: RouteToPointsResult; onFanClick?: (fanId: number) => void }) {
  const meta = FAN_REGISTRY[candidate.fanId]!
  const locked = candidate.status === 'locked'
  const measured = !locked && candidate.probabilityBasis === 'shanten'
  const treatment = locked
    ? 'border-emerald-700 bg-emerald-950/30'
    : measured
      ? 'border-sky-700 bg-sky-950/30'
      : 'border-dashed border-amber-800 bg-amber-950/20'
  const testId = locked ? 'route-candidate-locked' : measured ? 'route-candidate-shanten' : 'route-candidate-heuristic'
  const tierLabel = locked ? '✓ Locked' : measured ? '◆ Measured shape' : '◇ Developing pattern'
  const tierClass = locked ? 'text-emerald-300' : measured ? 'text-sky-300' : 'text-amber-300'

  return (
    <li data-testid={testId} className={`rounded-lg border p-3 shadow-sm ${treatment}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-100">
            <FanName fanId={candidate.fanId} name={meta.name} onFanClick={onFanClick} />
          </p>
          <p className={`text-xs font-semibold uppercase tracking-wide ${tierClass}`}>{tierLabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono font-semibold text-neutral-100">{candidate.points} pts</p>
          <p className="text-xs text-neutral-400">{routeRole(candidate, result)}</p>
        </div>
      </div>
      {!locked && candidate.tilesNeeded.length > 0 && (
        <p className="mt-2 text-sm text-neutral-300">
          Helpful tiles: {candidate.tilesNeeded.map(tileDisplayName).join(', ')}
        </p>
      )}
    </li>
  )
}

// Presentational seam kept separate from the live engine calls so the panel's
// three status states and mixed-basis rows can be tested against the brief's
// reference-identity-preserving fixtures.
export function RouteToPointsPanel({ result, lockedInFans, onFanClick }: RouteToPointsPanelProps) {
  const status = STATUS_COPY[result.minimumPointsStatus]
  const confirmedFanIds = new Set(lockedInFans.map((fan) => fan.fanId))
  const candidates = result.candidates
    .filter((candidate) => !confirmedFanIds.has(candidate.fanId))
    .sort((a, b) => {
      const tier = (candidate: FanTargetEstimate) => (candidate.status === 'locked' ? 0 : candidate.probabilityBasis === 'shanten' ? 1 : 2)
      return tier(a) - tier(b)
    })

  return (
    <div className="flex flex-col gap-4" data-testid="route-to-points-panel">
      <section role="status" data-testid={`minimum-status-${result.minimumPointsStatus}`} className={`rounded-lg border p-3 shadow-md ${status.className}`}>
        <div className="flex gap-3">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current font-bold">
            {status.icon}
          </span>
          <div>
            <h4 className="font-semibold">{status.headline}</h4>
            <p className="mt-1 text-sm opacity-90">{status.detail}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-lg border border-neutral-700 bg-neutral-800/80 p-3 shadow-md">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Current best route</h4>
          <p className="text-xs text-neutral-400">Fans this coach can credibly name now; exact waits can add others</p>
        </div>
        <p className="row-span-2 self-center font-mono text-xl font-bold text-indigo-200">{result.crediblePointsTotal} pts</p>
        <p className="col-span-2 mt-1 text-xs text-neutral-400">
          {result.lockedInPoints} pts confirmed · Absolute ceiling if everything breaks your way: {result.bestCaseTotal} pts
        </p>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Locked in</h4>
        {lockedInFans.length > 0 ? (
          <ul role="list" aria-label="Route locked-in fans" className="mt-1 flex flex-col gap-1">
            {lockedInFans.map((fan) => {
              const meta = FAN_REGISTRY[fan.fanId]!
              return (
                <li key={fan.fanId} className="flex items-center justify-between rounded-md border border-emerald-800 bg-emerald-950/25 px-3 py-2 text-sm shadow-sm">
                  <span className="text-emerald-100">
                    ✓ <FanName fanId={fan.fanId} name={meta.name} onFanClick={onFanClick} />
                    {fan.count > 1 ? ` x${fan.count}` : ''}
                  </span>
                  <span className="font-mono text-emerald-300">{meta.points * fan.count} pts</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-1 rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-400">No fan points are locked in yet.</p>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Ways the hand could develop</h4>
        {candidates.length > 0 ? (
          <ul role="list" aria-label="Route candidates" className="mt-1 flex flex-col gap-2">
            {candidates.map((candidate) => <CandidateRow key={candidate.fanId} candidate={candidate} result={result} onFanClick={onFanClick} />)}
          </ul>
        ) : (
          <div data-testid="route-candidates-empty" className="mt-1 rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 text-sm text-neutral-300 shadow-sm">
            <p className="font-medium text-neutral-200">No fan target stands out from this shape yet.</p>
            <p className="mt-1 text-neutral-400">Improve the hand's basic structure; a route can emerge as it develops.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export function RouteToPointsTab({ hand, prevailingWind, seatWind, onFanClick }: RouteToPointsTabProps) {
  const context = { prevailingWind, seatWind }
  const result = computeRouteToPoints(hand, context)
  const { lockedInFans } = computeHandPlan(hand, context)

  return <RouteToPointsPanel result={result} lockedInFans={lockedInFans} onFanClick={onFanClick} />
}
