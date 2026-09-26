import { useEffect } from 'react'

/**
 * Music, made rather than loaded.
 *
 * The old version was a drone and some pentatonic plinks - no chords
 * moving, no pulse, no tune. It sounded like chimes and humming because
 * that is exactly what it was. This one is written like music: a chord
 * progression that comes round, a bass that plays the root of whatever
 * chord is up, an arpeggio off those same chord tones, and a melody that
 * only ever picks notes that belong to the chord underneath it. That is
 * the whole trick - if the parts agree about which chord it is, almost
 * anything they play together sounds intentional.
 *
 * Two moods:
 *
 *  - `calm` for the quiet games. Slow, major, soft attacks, a lot of
 *    reverb, and long gaps.
 *  - `drive` for the ones where something is chasing you. Twice the
 *    tempo, a minor progression, a plucked off-beat bass, a kick and a
 *    hat, and a sixteenth-note lead.
 *
 * Notes are scheduled ahead of the clock rather than fired from a timer,
 * which is the only way to get steady rhythm out of the Web Audio API -
 * `setInterval` drifts, and at 132bpm the drift is audible within a bar.
 */

export type Mood = 'calm' | 'drive'

/** Semitone offsets from the root, per chord, in the order they come round. */
const PROGRESSIONS: Record<Mood, number[][]> = {
  // Cmaj9 - Amin9 - Fmaj7 - G6/9. Nothing clashes, nothing resolves hard.
  calm: [
    [0, 4, 7, 11, 14],
    [-3, 0, 4, 7, 11],
    [5, 9, 12, 16],
    [7, 11, 14, 16],
  ],
  // Am - F - C - G. The oldest driving loop there is.
  drive: [
    [9, 12, 16, 21],
    [5, 9, 12, 17],
    [0, 4, 7, 12],
    [7, 11, 14, 19],
  ],
}

const TEMPO: Record<Mood, number> = { calm: 64, drive: 138 }
/** Beats each chord is held for. */
const CHORD_BEATS: Record<Mood, number> = { calm: 8, drive: 4 }
const ROOT_HZ = 130.81 // C3

function hz(semitones: number): number {
  return ROOT_HZ * Math.pow(2, semitones / 12)
}

/** A short noise burst, used as an impulse response for cheap reverb. */
function makeReverb(ctx: AudioContext, seconds: number, decay: number): ConvolverNode {
  const rate = ctx.sampleRate
  const len = Math.max(1, Math.floor(rate * seconds))
  const buf = ctx.createBuffer(2, len, rate)
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  const node = ctx.createConvolver()
  node.buffer = buf
  return node
}

export function useAmbientMusic(on: boolean, mood: Mood = 'calm', volume = 0.5) {
  useEffect(() => {
    if (!on) return
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return

    let ctx: AudioContext
    try {
      ctx = new Ctor()
    } catch {
      return
    }

    /* --- the mixer ------------------------------------------------- */
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.5)

    const wet = ctx.createGain()
    wet.gain.value = mood === 'calm' ? 0.42 : 0.2
    const verb = makeReverb(ctx, mood === 'calm' ? 3.4 : 1.5, mood === 'calm' ? 2.4 : 3.2)
    wet.connect(verb)
    verb.connect(master)

    const dry = ctx.createGain()
    dry.gain.value = 0.9
    dry.connect(master)

    const send = (node: AudioNode) => {
      node.connect(dry)
      node.connect(wet)
    }

    /* --- voices ----------------------------------------------------- */

    /** One note, with its own envelope, from an oscillator. */
    function note(
      at: number,
      freq: number,
      length: number,
      opts: {
        type?: OscillatorType
        peak?: number
        attack?: number
        release?: number
        cutoff?: number
        sweep?: number
        detune?: number
      } = {}
    ) {
      const osc = ctx.createOscillator()
      osc.type = opts.type ?? 'triangle'
      osc.frequency.setValueAtTime(freq, at)
      if (opts.detune) osc.detune.setValueAtTime(opts.detune, at)

      const gain = ctx.createGain()
      const peak = opts.peak ?? 0.2
      const attack = opts.attack ?? 0.02
      const release = opts.release ?? Math.max(0.12, length * 0.7)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.linearRampToValueAtTime(peak, at + attack)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + length + release)

      if (opts.cutoff) {
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.Q.value = mood === 'drive' ? 7 : 1
        filter.frequency.setValueAtTime(opts.cutoff, at)
        if (opts.sweep) {
          filter.frequency.exponentialRampToValueAtTime(
            Math.max(120, opts.sweep),
            at + attack + length
          )
        }
        osc.connect(filter)
        filter.connect(gain)
      } else {
        osc.connect(gain)
      }
      send(gain)
      osc.start(at)
      osc.stop(at + attack + length + release + 0.05)
    }

    /** A kick: a sine whose pitch falls off a cliff. */
    function kick(at: number) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(140, at)
      osc.frequency.exponentialRampToValueAtTime(42, at + 0.11)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.linearRampToValueAtTime(0.5, at + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.26)
      osc.connect(gain)
      gain.connect(dry)
      osc.start(at)
      osc.stop(at + 0.3)
    }

    /** A hat: filtered noise, very short. */
    function hat(at: number, loud = 0.1) {
      const len = Math.floor(ctx.sampleRate * 0.05)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
      const src = ctx.createBufferSource()
      src.buffer = buf
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 7000
      const gain = ctx.createGain()
      gain.gain.value = loud
      src.connect(hp)
      hp.connect(gain)
      send(gain)
      src.start(at)
    }

    /* --- the arrangement -------------------------------------------- */

    const beat = 60 / TEMPO[mood]
    const chords = PROGRESSIONS[mood]
    const hold = CHORD_BEATS[mood]
    let step = 0 // in eighth notes
    let next = ctx.currentTime + 0.15

    function eighth(at: number, i: number) {
      const bar = Math.floor(i / 2 / hold)
      const chord = chords[bar % chords.length]
      const inChord = i % 2 === 0
      const beatInChord = Math.floor(i / 2) % hold

      if (mood === 'calm') {
        // Pad: the whole chord, once, held for its full length.
        if (beatInChord === 0 && inChord) {
          for (const semi of chord) {
            note(at, hz(semi), beat * hold * 0.7, {
              type: 'sine',
              peak: 0.055,
              attack: 1.1,
              release: 1.8,
              detune: (Math.random() - 0.5) * 9,
            })
          }
          note(at, hz(chord[0] - 12), beat * hold * 0.5, {
            type: 'sine',
            peak: 0.11,
            attack: 0.5,
            release: 1.4,
          })
        }
        // Arpeggio, gently, on alternate beats.
        if (inChord && beatInChord % 2 === 0) {
          const semi = chord[(beatInChord / 2 + bar) % chord.length] + 12
          note(at, hz(semi), 0.5, { type: 'triangle', peak: 0.075, attack: 0.02, release: 1.6 })
        }
        // A melody note now and then, always a chord tone, so it cannot
        // be wrong however it lands.
        if (inChord && beatInChord === 4 && Math.random() > 0.35) {
          const semi = chord[Math.floor(Math.random() * chord.length)] + 12
          note(at, hz(semi), 1.2, { type: 'sine', peak: 0.085, attack: 0.16, release: 2.2 })
        }
        return
      }

      /* drive */
      const eighthInChord = i % (hold * 2)

      // Kick on every beat, hat on every off-beat: that is the jump.
      if (i % 2 === 0) kick(at)
      if (i % 2 === 1) hat(at, 0.085)
      if (i % 8 === 6) hat(at, 0.13)

      // Bass on eighths, root and fifth, with a filter sweep per note.
      const bassSemi = chord[0] - 24 + (i % 4 === 3 ? 7 : 0)
      note(at, hz(bassSemi), 0.13, {
        type: 'sawtooth',
        peak: 0.19,
        attack: 0.004,
        release: 0.09,
        cutoff: 1400,
        sweep: 300,
      })

      // Chord stabs off the beat.
      if (eighthInChord % 4 === 3) {
        for (const semi of chord) {
          note(at, hz(semi), 0.1, {
            type: 'square',
            peak: 0.04,
            attack: 0.005,
            release: 0.16,
            cutoff: 2600,
          })
        }
      }

      // Sixteenth-note lead, running up and down the chord.
      const runUp = Math.floor(i / (hold * 2)) % 2 === 0
      for (const half of [0, 1]) {
        const k = i * 2 + half
        const idx = runUp ? k % chord.length : chord.length - 1 - (k % chord.length)
        note(at + half * beat * 0.25, hz(chord[idx] + 12), 0.06, {
          type: 'sawtooth',
          peak: 0.045,
          attack: 0.004,
          release: 0.1,
          cutoff: 3200,
          sweep: 1400,
        })
      }
    }

    // Look ahead and schedule. The timer only has to be roughly on time;
    // the notes themselves are pinned to the audio clock.
    const tick = () => {
      const horizon = ctx.currentTime + 0.25
      while (next < horizon) {
        eighth(next, step)
        step++
        next += beat / 2
      }
    }
    tick()
    const timer = window.setInterval(tick, 40)

    // Browsers will not start audio until the page has been touched.
    const wake = () => {
      if (ctx.state === 'suspended') void ctx.resume()
    }
    wake()
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
      try {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
        master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
      } catch {
        /* the context may already be closing */
      }
      window.setTimeout(() => void ctx.close().catch(() => {}), 700)
    }
  }, [on, mood, volume])
}
