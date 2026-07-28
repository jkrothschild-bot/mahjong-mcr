import { computeHandPlan, FAN_REGISTRY, type Hand, type Wind } from '@mahjong-mcr/engine'

export interface HandPlanTabProps {
  hand: Hand
  prevailingWind: Wind
  seatWind: Wind
}

const SHAPE_LABEL: Record<'standard' | 'sevenPairs' | 'thirteenOrphans', string> = {
  standard: 'Standard (4 sets + pair)',
  sevenPairs: 'Seven Pairs',
  thirteenOrphans: 'Thirteen Orphans',
}

function shantenLabel(shanten: number): string {
  if (shanten <= -1) return 'Complete'
  if (shanten === 0) return 'Tenpai (ready to win)'
  return `${shanten}-shanten`
}

// SPEC.md §6's Hand Plan tab ≈ Tutor: current hand shape, primary route,
// and — the critical MCR-specific trap for learners — whether the hand can
// even reach the 8-point minimum required to declare Hu. Reuses
// computeHandPlan directly (M5 engine core), which is itself built on the
// M4 shanten/waits machinery, so this can never disagree with the rest of
// the game about shanten or scoring.
export function HandPlanTab({ hand, prevailingWind, seatWind }: HandPlanTabProps) {
  const plan = computeHandPlan(hand, { prevailingWind, seatWind })

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Current shape</span>
        <p className="text-sm text-neutral-100">
          {shantenLabel(plan.shanten.shanten)} — {SHAPE_LABEL[plan.shanten.shape]}
        </p>
      </div>

      {plan.lockedInFans.length > 0 && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Locked in</span>
          <ul role="list" aria-label="Locked-in fans" className="flex flex-col gap-0.5 text-sm">
            {plan.lockedInFans.map((fan) => {
              const meta = FAN_REGISTRY[fan.fanId]!
              return (
                <li key={fan.fanId} role="listitem" className="flex justify-between text-neutral-100">
                  <span>
                    {meta.name}
                    {fan.count > 1 ? ` x${fan.count}` : ''}
                  </span>
                  <span className="font-mono text-neutral-300">{meta.points * fan.count}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {plan.worstCaseReachesMinimum === false && (
        <p role="alert" className="rounded-md border border-amber-600 bg-amber-950/40 p-2 text-sm text-amber-300">
          {plan.bestCaseReachesMinimum
            ? "Careful — some of your waits wouldn't reach the 8-point minimum to declare Hu."
            : "None of your current waits reach the 8-point minimum to declare Hu."}
        </p>
      )}
    </div>
  )
}
