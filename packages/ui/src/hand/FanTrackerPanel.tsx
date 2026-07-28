import { computeHandPlan, FAN_REGISTRY, type Hand, type Wind } from '@mahjong-mcr/engine'

export interface FanTrackerPanelProps {
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
}

// SPEC.md §5's always-available (not Hint-gated) score panel: "which fans
// are already locked in... current total if the hand were completed now."
// Distinct from the Hint panel's Hand Plan tab (same underlying
// computeHandPlan, but that's on-demand/deeper — this is the always-on
// summary). Renders nothing when there's nothing noteworthy yet (no locked
// -in fans and no fan-value warning) so an early-hand empty box doesn't
// clutter the board.
export function FanTrackerPanel({ hand, prevailingWind, seatWind }: FanTrackerPanelProps) {
  const plan = computeHandPlan(hand, { prevailingWind, seatWind })
  if (plan.lockedInFans.length === 0 && plan.worstCaseReachesMinimum !== false) return null

  return (
    <div
      data-testid="fan-tracker-panel"
      role="region"
      aria-label="Fan tracker"
      className="flex flex-col gap-1 rounded-lg border border-emerald-700 bg-emerald-950/30 p-3 text-sm"
    >
      {plan.lockedInFans.length > 0 && (
        <>
          <h3 className="font-semibold text-emerald-300">Locked in</h3>
          <ul role="list" aria-label="Locked-in fans" className="flex flex-col gap-0.5">
            {plan.lockedInFans.map((fan) => {
              const meta = FAN_REGISTRY[fan.fanId]!
              return (
                <li key={fan.fanId} role="listitem" className="flex justify-between">
                  <span>
                    {meta.name}
                    {fan.count > 1 ? ` x${fan.count}` : ''}
                  </span>
                  <span className="font-mono text-neutral-300">{meta.points * fan.count}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {plan.worstCaseReachesMinimum === false && (
        <p role="alert" className="text-amber-300">
          {plan.bestCaseReachesMinimum
            ? "Some of your waits wouldn't reach the 8-point minimum to declare Hu."
            : "None of your current waits reach the 8-point minimum to declare Hu."}
        </p>
      )}
    </div>
  )
}
