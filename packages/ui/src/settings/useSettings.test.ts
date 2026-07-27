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
    const settings = { botSpeedMs: 3000, confirmBeforeDiscard: true }
    expect(loadSettings(serializeSettings(settings))).toEqual(settings)
  })

  it('falls back field-by-field for a partially valid stored object', () => {
    const raw = JSON.stringify({ botSpeedMs: 'not a number', confirmBeforeDiscard: true })
    expect(loadSettings(raw)).toEqual({
      ...DEFAULT_SETTINGS,
      confirmBeforeDiscard: true,
    })
  })
})

describe('useSettings', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts from stored settings if present', () => {
    window.localStorage.setItem('mcr-mahjong:settings:v1', serializeSettings({ ...DEFAULT_SETTINGS, confirmBeforeDiscard: true }))
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.confirmBeforeDiscard).toBe(true)
  })

  it('starts from defaults when nothing is stored', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('update merges a partial patch and persists it', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.update({ confirmBeforeDiscard: true }))

    expect(result.current.settings).toEqual({ ...DEFAULT_SETTINGS, confirmBeforeDiscard: true })
    const stored = loadSettings(window.localStorage.getItem('mcr-mahjong:settings:v1'))
    expect(stored).toEqual({ ...DEFAULT_SETTINGS, confirmBeforeDiscard: true })
  })
})
