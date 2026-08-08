export type SoundEffect = 'tileClink' | 'discard' | 'chow' | 'pung' | 'kong' | 'mahjong'
export type SpokenCall = 'chow' | 'pung' | 'kong' | 'mahjong'

export interface SoundEffectsPlayer {
  unlock: () => void
  play: (effect: SoundEffect) => void
  speakCall: (call: SpokenCall) => void
}

interface Impact {
  start: number
  intensity: number
  pitch: number
}

const IMPACTS: Record<SoundEffect, readonly Impact[]> = {
  // All table sounds use the same ceramic impact, varied only by weight and
  // spacing. Drag clinks are intentionally much quieter than a placed tile.
  tileClink: [{ start: 0, intensity: 0.28, pitch: 1.08 }],
  discard: [{ start: 0, intensity: 0.72, pitch: 0.96 }],
  chow: [{ start: 0, intensity: 0.68, pitch: 1.04 }],
  pung: [{ start: 0, intensity: 0.78, pitch: 0.98 }],
  kong: [
    { start: 0, intensity: 0.78, pitch: 0.9 },
    { start: 0.055, intensity: 0.52, pitch: 1.02 },
  ],
  mahjong: [
    { start: 0, intensity: 0.82, pitch: 0.94 },
    { start: 0.075, intensity: 0.66, pitch: 1.07 },
  ],
}

const CALL_WORD: Record<SpokenCall, string> = { chow: 'Chow', pung: 'Pung', kong: 'Kong', mahjong: 'Mahjong' }

type AudioContextConstructor = new () => AudioContext

function audioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
}

// Original, generated-at-runtime audio: a very short filtered impact plus
// three inharmonic resonances approximates two hard ceramic tiles touching.
// There are no downloaded assets, licence concerns, network requests, or
// decoding delays.
export function createSoundEffectsPlayer(): SoundEffectsPlayer {
  let context: AudioContext | null = null

  function getContext(): AudioContext | null {
    if (context) return context
    const Context = audioContextConstructor()
    if (!Context) return null
    try {
      context = new Context()
      return context
    } catch {
      return null
    }
  }

  function unlock() {
    const audioContext = getContext()
    if (audioContext?.state === 'suspended') void audioContext.resume().catch(() => {})
  }

  function scheduleImpact(audioContext: AudioContext, impact: Impact) {
    const start = audioContext.currentTime + impact.start

    // A sharp broadband contact transient gives the sound its physical
    // attack instead of the electronic beep produced by an oscillator alone.
    const sampleCount = Math.max(1, Math.floor(audioContext.sampleRate * 0.022))
    const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < sampleCount; i++) {
      const envelope = Math.exp(-i / (audioContext.sampleRate * 0.0035))
      samples[i] = (Math.random() * 2 - 1) * envelope
    }
    const contact = audioContext.createBufferSource()
    const contactFilter = audioContext.createBiquadFilter()
    const contactGain = audioContext.createGain()
    contact.buffer = buffer
    contactFilter.type = 'bandpass'
    contactFilter.frequency.setValueAtTime(2300 * impact.pitch, start)
    contactFilter.Q.setValueAtTime(0.8, start)
    contactGain.gain.setValueAtTime(0.032 * impact.intensity, start)
    contactGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.022)
    contact.connect(contactFilter)
    contactFilter.connect(contactGain)
    contactGain.connect(audioContext.destination)
    contact.start(start)
    contact.stop(start + 0.024)

    // Hard tiles ring at several non-harmonic frequencies. Keeping these
    // simultaneous and under 70ms reads as a clink rather than a melody.
    const resonances = [1380, 2110, 3170]
    resonances.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const duration = 0.038 + index * 0.012
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency * impact.pitch, start)
      gain.gain.setValueAtTime((0.018 - index * 0.0035) * impact.intensity, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.005)
    })
  }

  function schedule(effect: SoundEffect, audioContext: AudioContext) {
    for (const impact of IMPACTS[effect]) scheduleImpact(audioContext, impact)
  }

  function play(effect: SoundEffect) {
    const audioContext = getContext()
    if (!audioContext) return
    if (audioContext.state === 'suspended') {
      void audioContext.resume().then(() => schedule(effect, audioContext)).catch(() => {})
      return
    }
    try {
      schedule(effect, audioContext)
    } catch {
      // Audio is supplementary. A closed/interrupted context must never
      // affect an action already accepted by the game.
    }
  }

  function speakCall(call: SpokenCall) {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return
    try {
      const utterance = new SpeechSynthesisUtterance(CALL_WORD[call])
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      utterance.pitch = 0.88
      // Kept deliberately below the ceramic impacts so a spoken call adds
      // character without jumping out of the device speakers.
      utterance.volume = 0.48
      window.speechSynthesis.speak(utterance)
    } catch {
      // Voice availability varies by browser/device and is never required
      // to understand the visual claim announcement.
    }
  }

  return { unlock, play, speakCall }
}

export const soundEffectsPlayer = createSoundEffectsPlayer()
