import type { ScenarioPreset } from '../scenario.js'

// SPEC.md §9's scenario/practice mode: "start from a specific preset hand
// instead of always a random deal." A small curated set, not one per fan —
// same "no exhaustive coverage in v1, that's a separate larger task"
// scoping call as the M5 fan encyclopedia's "no example hands yet" note.
// Every preset here is a non-dealer (13-tile) hand. Each preset's intended
// shanten/waits is verified directly by library.test.ts against the real
// engine (calculateShanten/computeWaits), not just asserted from the
// description below — several initial hand-built candidates for this list
// turned out to have different (still correct) waits than first assumed
// once actually computed, so the description text below was written to
// match the VERIFIED behavior, not the other way around.
export const SCENARIO_LIBRARY: readonly ScenarioPreset[] = [
  {
    id: 'tenpai-two-sided',
    label: 'Tenpai — two-sided wait',
    description: 'A textbook ryanmen wait: C3-C4 completes with either C2 or C5.',
    concealedTypeIds: ['D4', 'D5', 'D6', 'B7', 'B8', 'B9', 'DW', 'DW', 'DW', 'C9', 'C9', 'C3', 'C4'],
  },
  {
    id: 'tenpai-edge-wait',
    label: 'Tenpai — edge wait',
    description: 'Holding C1-C2 waiting on C3 — an edge wait, since there is no tile below C1 to wait on instead.',
    concealedTypeIds: ['D4', 'D5', 'D6', 'B7', 'B8', 'B9', 'DW', 'DW', 'DW', 'C9', 'C9', 'C1', 'C2'],
  },
  {
    id: 'tenpai-closed-wait',
    label: 'Tenpai — closed (kanchan) wait',
    description: 'Holding C4-C6 waiting only on the middle tile, C5.',
    concealedTypeIds: ['D4', 'D5', 'D6', 'B7', 'B8', 'B9', 'DW', 'DW', 'DW', 'C9', 'C9', 'C4', 'C6'],
  },
  {
    id: 'tenpai-shanpon',
    label: 'Tenpai — shanpon (dual-pair) wait',
    description: 'Two pairs, C9-C9 and WE-WE — either one completing into a pung wins.',
    concealedTypeIds: ['D4', 'D5', 'D6', 'B7', 'B8', 'B9', 'DW', 'DW', 'DW', 'C9', 'C9', 'WE', 'WE'],
  },
  {
    id: 'one-away-seven-pairs',
    label: 'Tenpai for Seven Pairs',
    description: 'Six solid pairs plus a single WE — draw or claim the second WE to complete Seven Pairs (24 pts).',
    concealedTypeIds: ['C1', 'C1', 'C4', 'C4', 'C7', 'C7', 'D2', 'D2', 'D5', 'D5', 'B3', 'B3', 'WE'],
  },
  {
    id: 'shanten-1-mixed-triple-chow',
    label: 'One shanten from Mixed Triple Chow',
    description:
      'C2-C3-C4 is already a complete chow; D2-D3 and B2-B3 each need their own 4 to match it in all three suits — Mixed Triple Chow (8 pts) needs exactly those two tiles, in either order.',
    concealedTypeIds: ['C2', 'C3', 'C4', 'D2', 'D3', 'B2', 'B3', 'WE', 'WE', 'WE', 'C9', 'C9', 'DG'],
  },
  {
    id: 'tenpai-wide-wait-all-simples',
    label: 'Tenpai — wide wait, watch the fan',
    description:
      'A five-tile Dots run (D2-D6) supports three different completions: D1, D4, or D7. D4 and D7 keep the hand All Simples (2 pts); D1 still wins, just without that fan — a real example of "which wait scores more."',
    concealedTypeIds: ['D4', 'D5', 'D6', 'B4', 'B5', 'B6', 'C4', 'C5', 'C6', 'C8', 'C8', 'D2', 'D3'],
  },
]

if (new Set(SCENARIO_LIBRARY.map((s) => s.id)).size !== SCENARIO_LIBRARY.length) {
  throw new Error('Duplicate scenario id in SCENARIO_LIBRARY')
}
