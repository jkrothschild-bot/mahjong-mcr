// KICKOFF-validation-harness.md Stage 1's TypeScript half: generates a batch
// of verified-winning hands (1a), scores each with this engine's own
// scoreHand (1b), and writes validation/cases/<runSeed>.json for compare.py
// to cross-check against PyMahjongGB.
//
// Scope decision (1d, "decide once, state it in the header, and assert it"):
// every case's flowerCount is fixed at 0. This engine's scoreHand never
// takes a flower count at all — flowers are scored separately as
// `flowerPoints` in settlement.ts (decisions.md #7) — so there is nothing
// for a generated HandContext to vary. Passing flowerCount=0 to
// MahjongFanCalculator too means neither side's total ever includes fan 81
// (Flower Tiles), keeping basicPoints directly comparable without having to
// add/subtract flower points on either side.
//
// Run: `npm run generate --workspace=@mahjong-mcr/validation -- [count] [runSeed]`
import { mulberry32, nextSeed, type Rng } from '@mahjong-mcr/engine'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPmgbInput } from './build-pmgb-input.js'
import type { GeneratedCase } from './case-types.js'
import { generateSevenPairsHand } from './generators/seven-pairs.js'
import { generateStandardHand } from './generators/standard.js'
import { generateThirteenOrphansHand } from './generators/thirteen-orphans.js'
import { runTargetedGenerators } from './generators/targeted.js'
import { scoreWithEngine } from './score-with-engine.js'

const CASES_DIR = fileURLToPath(new URL('../cases/', import.meta.url))

interface WrittenCase {
  seed: number
  label: string
  ours: ReturnType<typeof scoreWithEngine>
  pmgb: ReturnType<typeof buildPmgbInput>
}

function buildRandomCase(masterRng: Rng): WrittenCase {
  const seed = nextSeed(masterRng)
  const rng = mulberry32(seed)
  const r = rng.next()
  let hand: GeneratedCase
  if (r < 0.85) {
    hand = generateStandardHand(seed, rng, { preferHonorSets: r > 0.55 })
  } else if (r < 0.95) {
    hand = generateSevenPairsHand(seed, rng)
  } else {
    hand = generateThirteenOrphansHand(seed, rng)
  }
  return { seed, label: hand.label, ours: scoreWithEngine(hand), pmgb: buildPmgbInput(hand) }
}

function main(): void {
  const args = process.argv.slice(2)
  const count = Number(args[0] ?? 1000)
  const runSeed = Number(args[1] ?? Date.now() % 2 ** 31)

  const masterRng = mulberry32(runSeed)
  const cases: WrittenCase[] = []

  const targeted = runTargetedGenerators(runSeed)
  for (const hand of targeted) {
    cases.push({ seed: hand.seed, label: hand.label, ours: scoreWithEngine(hand), pmgb: buildPmgbInput(hand) })
  }

  const randomCount = Math.max(0, count - cases.length)
  for (let i = 0; i < randomCount; i++) {
    cases.push(buildRandomCase(masterRng))
  }

  mkdirSync(CASES_DIR, { recursive: true })
  const outPath = join(CASES_DIR, `${runSeed}.json`)
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        runSeed,
        generatedAt: new Date().toISOString(),
        targetedCount: targeted.length,
        randomCount,
        cases,
      },
      null,
      2,
    ),
  )
  console.log(`Wrote ${cases.length} cases (${targeted.length} targeted, ${randomCount} random) to ${outPath}`)
}

main()
