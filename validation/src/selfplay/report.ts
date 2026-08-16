// Phase 10 Strategy Coach calibration report — reads
// selfplay-samples/{samples,outcomes}.jsonl (written by sample.ts) and
// answers two questions:
//
// 1. BASELINE: how well does today's minimumPointsStatus == 'reachable'
//    predict that the hand it's evaluating actually goes on to finish
//    (seat 0 declares a legal win — always >=8 points, by construction of
//    the win-legality gate), bucketed by shanten?
// 2. GATED (after): the same question, but recomputing a hypothetical
//    "credible" total that only admits the three worst-offending families
//    (Seven Pairs 19, Half/Full Flush 22/50, All Simples/No Honors 68/76 —
//    see docs/rules/decisions.md for which entry cites this) once they're
//    within a caller-supplied distance of their own shape, reusing the
//    REAL compatibility/exclusion logic (areExclusive, isRouteCompatible,
//    STAGE3_FAN_IDS) so this never drifts from computeRouteToPoints' own
//    selection rule — only the admission bar changes.
//
// Run (from repo root), after sample.ts has built up a dataset:
//   npm run selfplay:report --workspace=@mahjong-mcr/validation -- [sevenPairsShantenMax] [flushTilesNeededMax] [simplesHonorsTilesNeededMax]
// e.g.
//   npm run selfplay:report --workspace=@mahjong-mcr/validation -- 2 2 2
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { areExclusive, isRouteCompatible, STAGE3_FAN_IDS, type MinimumPointsStatus } from '@mahjong-mcr/engine'

const OUT_DIR = fileURLToPath(new URL('../../selfplay-samples/', import.meta.url))

interface CandidateRecord {
  fanId: number
  points: number
  probabilityBasis: 'shanten' | 'heuristic'
  completionProbability: number
  tilesNeededCount: number
  status: 'locked' | 'inProgress'
}

interface Sample {
  seed: number
  turnIndex: number
  shanten: number
  meldCount: number
  sevenPairsShanten: number
  concealedCounts: Record<string, number>
  melds: { kind: string; exposure: string; typeId: string }[]
  candidates: CandidateRecord[]
  lockedInFans: { fanId: number; count: number }[]
  lockedInPoints: number
  bestCaseTotal: number
  minimumPointsStatus: MinimumPointsStatus
  bestCaseReachesMinimum: boolean | null
}

interface Outcome {
  seed: number
  outcome: 'win' | 'exhaustiveDraw' | 'capped' | 'errored'
  seat0Won: boolean
  seat0FinalScore: number | null
  winnerSeat: number | null
}

function loadJsonl<T>(path: string): T[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T)
}

const samples = loadJsonl<Sample>(OUT_DIR + 'samples.jsonl')
const outcomes = loadJsonl<Outcome>(OUT_DIR + 'outcomes.jsonl')
const outcomeBySeed = new Map(outcomes.map((o) => [o.seed, o]))

console.log(`hands=${outcomes.length} samples=${samples.length}`)
const winCount = outcomes.filter((o) => o.seat0Won).length
console.log(`seat0 win rate: ${winCount}/${outcomes.length} (${((100 * winCount) / outcomes.length).toFixed(1)}%)`)
const badScore = outcomes.filter((o) => o.seat0Won && (o.seat0FinalScore === null || o.seat0FinalScore < 8))
if (badScore.length > 0) console.log(`SANITY CHECK FAILED: ${badScore.length} seat0 wins scored <8 or null — investigate before trusting this report`)

// -----------------------------------------------------------------------
// Gate thresholds for the 3 targeted families (fan 19, 22/50, 68/76).
// -----------------------------------------------------------------------
const args = process.argv.slice(2)
const GATES = {
  sevenPairsShantenMax: Number(args[0] ?? 2),
  flushTilesNeededMax: Number(args[1] ?? 2),
  simplesHonorsTilesNeededMax: Number(args[2] ?? 2),
}
console.log(`\ngates: sevenPairsShantenMax=${GATES.sevenPairsShantenMax} flushTilesNeededMax=${GATES.flushTilesNeededMax} simplesHonorsTilesNeededMax=${GATES.simplesHonorsTilesNeededMax}`)

const GATED_FAN_IDS = new Set([19, 22, 50, 68, 76])

function passesGate(c: CandidateRecord, sample: Sample): boolean {
  if (c.fanId === 19) return sample.sevenPairsShanten <= GATES.sevenPairsShantenMax
  if (c.fanId === 22 || c.fanId === 50) return c.tilesNeededCount <= GATES.flushTilesNeededMax
  if (c.fanId === 68 || c.fanId === 76) return c.tilesNeededCount <= GATES.simplesHonorsTilesNeededMax
  return true
}

// Mirrors computeRouteToPoints' own greedy/compatibility walk exactly (same
// areExclusive/isRouteCompatible/STAGE3_FAN_IDS calls) — the ONLY change is
// an extra admission predicate. `excludeFamilies`, when given, additionally
// drops any candidate whose fanId is in that set before the walk — used
// only for the "do the other 7 families matter" sensitivity check below.
function selectTotal(sample: Sample, gate: (c: CandidateRecord, s: Sample) => boolean, excludeFamilies?: ReadonlySet<number>): number {
  const chosenFanIds: number[] = sample.lockedInFans.map((f) => f.fanId)
  let total = sample.lockedInPoints
  for (const c of sample.candidates) {
    if (c.completionProbability <= 0) continue
    if (excludeFamilies?.has(c.fanId)) continue
    if (!gate(c, sample)) continue
    if (chosenFanIds.includes(c.fanId)) continue
    if (chosenFanIds.some((id) => areExclusive(id, c.fanId) || (STAGE3_FAN_IDS.includes(id) && !isRouteCompatible(id, c.fanId)))) continue
    total += c.points
    chosenFanIds.push(c.fanId)
  }
  return total
}

function statusFor(sample: Sample, total: number): MinimumPointsStatus {
  if (sample.bestCaseReachesMinimum !== null) return sample.bestCaseReachesMinimum ? 'reachable' : 'currentWaitsFallShort'
  return total >= 8 ? 'reachable' : 'unknown'
}

// Sanity check: recomputing selectTotal with NO gate (always-true predicate,
// no exclusions) must reproduce today's real bestCaseTotal/minimumPointsStatus
// exactly, or this script's re-implementation has drifted from
// computeRouteToPoints' own logic.
let mismatches = 0
for (const s of samples) {
  const recomputed = selectTotal(s, () => true)
  if (recomputed !== s.bestCaseTotal || statusFor(s, recomputed) !== s.minimumPointsStatus) mismatches++
}
console.log(`\nsanity check (ungated recompute reproduces real bestCaseTotal/minimumPointsStatus): ${samples.length - mismatches}/${samples.length} match` + (mismatches > 0 ? ` — ${mismatches} MISMATCHES, DO NOT TRUST THE GATED NUMBERS BELOW` : ''))

// -----------------------------------------------------------------------
// Calibration table: P(seat0 eventually wins | prediction), by shanten,
// for a given per-sample status function. Every win is >=8 by construction
// (win-legality gate), so "eventually wins" IS "finishes at >=8."
// -----------------------------------------------------------------------
function calibrationTable(label: string, statusOf: (s: Sample) => MinimumPointsStatus) {
  console.log(`\n=== Calibration: ${label} ===`)
  console.log('shanten | n     | reachable-rate | P(win|reachable) | P(win|not-reachable) | base P(win)')
  const shantenKeys = [...new Set(samples.map((s) => s.shanten))].sort((a, b) => a - b)
  for (const k of shantenKeys) {
    const atK = samples.filter((s) => s.shanten === k)
    const reachable = atK.filter((s) => statusOf(s) === 'reachable')
    const notReachable = atK.filter((s) => statusOf(s) !== 'reachable')
    const winsAt = (arr: Sample[]) => arr.filter((s) => outcomeBySeed.get(s.seed)?.seat0Won).length
    const baseWinRate = atK.length ? winsAt(atK) / atK.length : NaN
    const ppv = reachable.length ? winsAt(reachable) / reachable.length : NaN
    const npv = notReachable.length ? winsAt(notReachable) / notReachable.length : NaN
    console.log(
      `${String(k).padStart(7)} | ${String(atK.length).padStart(5)} | ${((100 * reachable.length) / atK.length).toFixed(1).padStart(13)}% | ` +
        `${isNaN(ppv) ? '  n/a' : (100 * ppv).toFixed(1).padStart(4)}%            | ${isNaN(npv) ? '  n/a' : (100 * npv).toFixed(1).padStart(4)}%               | ${(100 * baseWinRate).toFixed(1)}%`,
    )
  }
}

calibrationTable('BEFORE (today’s real bestCaseTotal / minimumPointsStatus)', (s) => s.minimumPointsStatus)

const gatedStatusOf = (s: Sample): MinimumPointsStatus => statusFor(s, selectTotal(s, (c, smp) => passesGate(c, smp)))
calibrationTable('AFTER (gated: 19/22/50/68/76 admitted only within threshold)', gatedStatusOf)

// -----------------------------------------------------------------------
// Pre-tenpai-only summary (the actually-actionable fallback branch).
// -----------------------------------------------------------------------
function preTenpaiReachableRate(statusOf: (s: Sample) => MinimumPointsStatus): number {
  const preTenpai = samples.filter((s) => s.shanten > 0)
  return preTenpai.filter((s) => statusOf(s) === 'reachable').length / preTenpai.length
}
console.log(`\npre-tenpai reachable-rate BEFORE: ${(100 * preTenpaiReachableRate((s) => s.minimumPointsStatus)).toFixed(1)}%`)
console.log(`pre-tenpai reachable-rate AFTER:  ${(100 * preTenpaiReachableRate(gatedStatusOf)).toFixed(1)}%`)

// -----------------------------------------------------------------------
// Do the other 7 (ungated) families matter, once the 3 worst offenders are
// gated? Compare crediblePointsTotal (3 gated + 7 ungated-as-is) against a
// version that ALSO excludes the other 7 entirely.
// -----------------------------------------------------------------------
const preTenpai = samples.filter((s) => s.shanten > 0)
const gatedReachable = preTenpai.filter((s) => gatedStatusOf(s) === 'reachable')
const OTHER_SEVEN = new Set([49, 59, 2, 60, 61])
let wouldFlipWithoutOtherSeven = 0
for (const s of gatedReachable) {
  const withoutOtherSeven = selectTotal(s, (c, smp) => passesGate(c, smp), OTHER_SEVEN)
  if (statusFor(s, withoutOtherSeven) !== 'reachable') wouldFlipWithoutOtherSeven++
}
console.log(
  `\nof pre-tenpai samples gated-'reachable' (n=${gatedReachable.length}), would flip to non-reachable if the ` +
    `other 7 families (49,59,2,60,61) were ALSO excluded entirely: ${wouldFlipWithoutOtherSeven} (${gatedReachable.length ? ((100 * wouldFlipWithoutOtherSeven) / gatedReachable.length).toFixed(2) : '0.00'}%)`,
)

// -----------------------------------------------------------------------
// shanten=-1 investigation: what are these samples, concretely?
// -----------------------------------------------------------------------
const complete = samples.filter((s) => s.shanten === -1)
console.log(`\n=== shanten=-1 samples (n=${complete.length}) ===`)
const completeUnknown = complete.filter((s) => s.minimumPointsStatus === 'unknown')
console.log(`unknown: ${completeUnknown.length}/${complete.length}`)
console.log('first 5 unknown shanten=-1 samples, raw:')
for (const s of completeUnknown.slice(0, 5)) {
  console.log(
    JSON.stringify({
      seed: s.seed,
      turnIndex: s.turnIndex,
      meldCount: s.meldCount,
      concealedCounts: s.concealedCounts,
      melds: s.melds,
      bestCaseReachesMinimum: s.bestCaseReachesMinimum,
      outcome: outcomeBySeed.get(s.seed),
    }),
  )
}
