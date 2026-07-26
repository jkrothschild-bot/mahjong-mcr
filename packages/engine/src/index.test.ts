import { describe, expect, it } from 'vitest'
import { engineVersion } from './index.js'

describe('engine', () => {
  it('exposes a version string', () => {
    expect(engineVersion).toBe('0.0.0')
  })
})
