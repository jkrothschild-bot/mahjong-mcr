import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSoundEffectsPlayer } from './soundEffects.js'

describe('soundEffectsPlayer voice', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('speaks the requested claim word using the browser voice', () => {
    const speak = vi.fn()
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      constructor(text: string) { this.text = text }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', { speak })

    createSoundEffectsPlayer().speakCall('pung')

    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0]![0]).toMatchObject({ text: 'Pung', lang: 'en-US', rate: 0.9, volume: 0.48 })
  })
})
