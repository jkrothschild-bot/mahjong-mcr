// Loads fan-map.json (the single source of truth shared with compare.py —
// see that file's own header) and asserts it is TOTAL against this engine's
// own FAN_REGISTRY: every one of the 81 ids must appear exactly once, with a
// name/points pair matching registry.ts exactly. An unmapped or
// out-of-sync entry fails loudly at import time (KICKOFF-validation-harness.md
// 1c: "assert it is total... any PyMahjongGB name the map doesn't cover must
// fail loudly rather than be dropped").
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FAN_REGISTRY } from '@mahjong-mcr/engine'

export interface FanMapEntry {
  id: number
  ourName: string
  ourPoints: number
  pymahjonggbName: string
}

const FAN_MAP_PATH = fileURLToPath(new URL('../fan-map.json', import.meta.url))

function loadFanMap(): FanMapEntry[] {
  const raw = JSON.parse(readFileSync(FAN_MAP_PATH, 'utf8')) as { entries: FanMapEntry[] }
  return raw.entries
}

export const FAN_MAP: readonly FanMapEntry[] = loadFanMap()

export const OUR_ID_TO_PYMAHJONGGB_NAME: ReadonlyMap<number, string> = new Map(FAN_MAP.map((e) => [e.id, e.pymahjonggbName]))
export const PYMAHJONGGB_NAME_TO_OUR_ID: ReadonlyMap<string, number> = new Map(FAN_MAP.map((e) => [e.pymahjonggbName, e.id]))

function assertFanMapTotal(): void {
  const registryIds = Object.keys(FAN_REGISTRY).map(Number).sort((a, b) => a - b)
  const mapIds = FAN_MAP.map((e) => e.id).sort((a, b) => a - b)
  if (registryIds.length !== mapIds.length || registryIds.some((id, i) => id !== mapIds[i])) {
    throw new Error(
      `fan-map.json id set does not match FAN_REGISTRY exactly. Registry: [${registryIds.join(',')}], map: [${mapIds.join(',')}]`,
    )
  }

  for (const entry of FAN_MAP) {
    const registered = FAN_REGISTRY[entry.id]
    if (!registered) throw new Error(`fan-map.json has unknown fan id ${entry.id}`)
    if (registered.name !== entry.ourName) {
      throw new Error(
        `fan-map.json entry ${entry.id} name "${entry.ourName}" does not match FAN_REGISTRY name "${registered.name}" — registry.ts was edited without updating fan-map.json`,
      )
    }
    if (registered.points !== entry.ourPoints) {
      throw new Error(
        `fan-map.json entry ${entry.id} ("${entry.ourName}") records ${entry.ourPoints} points but FAN_REGISTRY says ${registered.points} — registry.ts was edited without updating fan-map.json`,
      )
    }
  }

  const pymahjonggbNames = FAN_MAP.map((e) => e.pymahjonggbName)
  if (new Set(pymahjonggbNames).size !== pymahjonggbNames.length) {
    throw new Error('fan-map.json has duplicate pymahjonggbName values — the join would be ambiguous')
  }
  if (FAN_MAP.length !== 81) {
    throw new Error(`fan-map.json must have exactly 81 entries, has ${FAN_MAP.length}`)
  }
}

assertFanMapTotal()

// Translates a PyMahjongGB English fan name to this engine's fan id. Throws
// loudly on an unrecognized name — per 1c, "any PyMahjongGB name the map
// doesn't cover must fail loudly rather than be dropped" (a silent drop
// would degrade fan-level comparison to points-only without anyone noticing).
export function pymahjonggbNameToOurId(name: string): number {
  const id = PYMAHJONGGB_NAME_TO_OUR_ID.get(name)
  if (id === undefined) {
    throw new Error(`Unmapped PyMahjongGB fan name "${name}" — add it to validation/fan-map.json (see 1c in KICKOFF-validation-harness.md)`)
  }
  return id
}
