import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSoundEffectsPlayer } from './soundEffects.js'

describe('soundEffectsPlayer voice', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not queue the iPad primer ahead of a desktop claim call', () => {
    const speak = vi.fn()
    const resume = vi.fn()
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      constructor(text: string) { this.text = text }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', { speak, resume, getVoices: vi.fn(() => []), paused: false })
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140 Safari/537.36')

    const player = createSoundEffectsPlayer()
    player.unlock()
    player.speakCall('pung')

    // A silent primer here can stall Chromium's queue, so the real word must
    // be the first and only utterance queued on desktop.
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0]![0]).toMatchObject({ text: 'Pung', lang: 'en-US', rate: 0.9, volume: 0.48 })
    expect(resume).not.toHaveBeenCalled()
  })

  it('primes iPad speech silently once during user activation', () => {
    const speak = vi.fn()
    const resume = vi.fn()
    const getVoices = vi.fn(() => [])
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) { this.text = text }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', { speak, resume, getVoices, paused: false })
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15')
    const player = createSoundEffectsPlayer()

    player.unlock()
    player.unlock()

    expect(getVoices).toHaveBeenCalledTimes(1)
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0]![0]).toMatchObject({ text: '\u00a0', volume: 0, rate: 10 })
    expect(resume).not.toHaveBeenCalled()
  })

  it('recognises an iPad requesting the desktop website and resumes a paused speech engine', () => {
    const speak = vi.fn()
    const resume = vi.fn()
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) { this.text = text }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', { speak, resume, getVoices: vi.fn(() => []), paused: true })
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })

    createSoundEffectsPlayer().unlock()

    expect(speak).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })
})
