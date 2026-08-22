import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, serializeSettings, useSettings } from './useSettings.js'

describe('loadSettings', () => {
  it('returns defaults when there is nothing stored', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults for corrupt JSON, without throwing', () => {
    expect(loadSettings('{not valid json')).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults for a valid JSON value that is not an object', () => {
    expect(loadSettings('42')).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings('null')).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips a fully valid settings object', () => {
    const settings = { botSpeedMs: 3000, tileScale: 'large' as const, soundEffects: false }
    expect(loadSettings(serializeSettings(settings))).toEqual(settings)
  })

  it('falls back field-by-field for a partially valid stored object', () => {
    const raw = JSON.stringify({ botSpeedMs: 'not a number', tileScale: 'large' })
    expect(loadSettings(raw)).toEqual({ ...DEFAULT_SETTINGS, tileScale: 'large' })
  })

  // Four settings have been removed over time (confirmBeforeDiscard,
  // colorBlindPalette, reducedMotion, stepMode). Anyone who used the app
  // before still has them in their stored v1 blob, so loading must ignore
  // them rather than choke — this is what let those removals skip a
  // STORAGE_KEY version bump.
  it('ignores keys from removed settings without disturbing the ones that remain', () => {
    const raw = JSON.stringify({
      botSpeedMs: 3000,
      tileScale: 'large',
      confirmBeforeDiscard: true,
      colorBlindPalette: true,
      reducedMotion: true,
      stepMode: true,
    })
    expect(loadSettings(raw)).toEqual({ botSpeedMs: 3000, tileScale: 'large', soundEffects: true })
  })

  it('normalizes legacy tileScale values to Large', () => {
    expect(loadSettings(JSON.stringify({ tileScale: 'normal' })).tileScale).toBe('large')
    expect(loadSettings(JSON.stringify({ tileScale: 'huge' })).tileScale).toBe('large')
  })

  it('loads and round-trips the sound preference', () => {
    const raw = serializeSettings({ ...DEFAULT_SETTINGS, soundEffects: false })
    expect(loadSettings(raw).soundEffects).toBe(false)
  })
})

describe('useSettings', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts from stored settings and upgrades Normal tiles to Large', () => {
    window.localStorage.setItem('mcr-mahjong:settings:v1', JSON.stringify({ ...DEFAULT_SETTINGS, tileScale: 'normal' }))
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.tileScale).toBe('large')
  })

  it('starts from defaults when nothing is stored', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('update merges a partial patch and persists it', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.update({ botSpeedMs: 500 }))

    expect(result.current.settings).toEqual({ ...DEFAULT_SETTINGS, botSpeedMs: 500 })
    const stored = loadSettings(window.localStorage.getItem('mcr-mahjong:settings:v1'))
    expect(stored).toEqual({ ...DEFAULT_SETTINGS, botSpeedMs: 500 })
  })

  it('persists sound-off across a new hook instance', () => {
    const first = renderHook(() => useSettings())
    act(() => first.result.current.update({ soundEffects: false }))
    first.unmount()

    const second = renderHook(() => useSettings())
    expect(second.result.current.settings.soundEffects).toBe(false)
  })
})
