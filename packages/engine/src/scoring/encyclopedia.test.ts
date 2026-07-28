import { describe, expect, it } from 'vitest'
import { FAN_REGISTRY } from './registry.js'
import { ALL_FANS, FAN_RULE_TEXT } from './encyclopedia.js'

describe('encyclopedia', () => {
  it('has rule text for all 81 fans', () => {
    expect(Object.keys(FAN_RULE_TEXT)).toHaveLength(81)
    for (let id = 1; id <= 81; id++) {
      expect(FAN_RULE_TEXT[id], `fan ${id} rule text`).toBeTruthy()
      expect(FAN_RULE_TEXT[id]!.length).toBeGreaterThan(10)
    }
  })

  it('ALL_FANS merges every FAN_REGISTRY entry with its rule text, sorted by id', () => {
    expect(ALL_FANS).toHaveLength(81)
    for (let i = 0; i < ALL_FANS.length; i++) {
      expect(ALL_FANS[i]!.id).toBe(i + 1)
    }
    for (const entry of ALL_FANS) {
      const meta = FAN_REGISTRY[entry.id]!
      expect(entry.name).toBe(meta.name)
      expect(entry.points).toBe(meta.points)
      expect(entry.ruleText).toBe(FAN_RULE_TEXT[entry.id])
    }
  })

  it('does not fabricate example hands in v1 — only id/name/points/ruleText fields', () => {
    for (const entry of ALL_FANS) {
      expect(Object.keys(entry).sort()).toEqual(['id', 'name', 'points', 'ruleText'])
    }
  })
})
