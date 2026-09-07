import { useEffect, useRef } from 'react'

/**
 * Slow, quiet music, made rather than loaded.
 *
 * Everything here is generated with the Web Audio API - a couple of
 * detuned oscillators holding a chord underneath, and single notes off a
 * pentatonic scale drifting over the top every few seconds. Nothing is
 * ever quite the same twice and there is no file to download, which
 * matters for a game that has to work offline and never blocks on the
 * network.
 *
 * Browsers refuse to start audio until somebody has interacted with the
 * page, so the context is resumed on the first click or key press if it
 * comes up suspended.
 */

/** A major pentatonic, which has no wrong notes in it. */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]
const ROOT = 220

function midiToHz(semitones: number): number {
  return ROOT * Math.pow(2, semitones / 12)
}

export function useAmbientMusic(on: boolean, volume = 0.075) {
  const kit = useRef<{
    ctx: AudioContext
    master: GainNode
    stop: () => void
  } | null>(null)

  useEffect(() => {
    if (!on) return
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return

    let dead = false
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, ctx.currentTime)
    master.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 4)
    master.connect(ctx.destination)

    // A soft bed underneath, two voices a fifth apart and slightly out
    // with each other so it moves on its own.
    const bedGain = ctx.createGain()
    bedGain.gain.value = 0.34
    const warm = ctx.createBiquadFilter()
    warm.type = 'lowpass'
    warm.frequency.value = 620
    bedGain.connect(warm)
    warm.connect(master)

    const drones = [ROOT / 2, (ROOT / 2) * 1.5].map((hz, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = hz
      osc.detune.value = i === 0 ? -5 : 6
      osc.connect(bedGain)
      osc.start()
      return osc
    })

    // A very slow swell, so the bed breathes.
    const breath = ctx.createOscillator()
    const breathDepth = ctx.createGain()
    breath.frequency.value = 0.035
    breathDepth.gain.value = 0.12
    breath.connect(breathDepth)
    breathDepth.connect(bedGain.gain)
    breath.start()

    /** One note, faded in and out so nothing ever starts abruptly. */
    function pluck() {
      if (dead) return
      const step = SCALE[Math.floor(Math.random() * SCALE.length)]
      const octave = Math.random() < 0.3 ? 12 : 0
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const soft = ctx.createBiquadFilter()
      soft.type = 'lowpass'
      soft.frequency.value = 1500

      osc.type = Math.random() < 0.5 ? 'sine' : 'triangle'
      osc.frequency.value = midiToHz(step + octave)

      const t = ctx.currentTime
      const hold = 2.4 + Math.random() * 2.2
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.22, t + 1.1)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + hold)

      osc.connect(soft)
      soft.connect(gain)
      gain.connect(master)
      osc.start(t)
      osc.stop(t + hold + 0.2)

      timer = window.setTimeout(pluck, 2200 + Math.random() * 3600)
    }

    let timer = window.setTimeout(pluck, 1400)

    // Autoplay rules: if we were not allowed to start, wait for a touch.
    const wake = () => {
      if (ctx.state === 'suspended') void ctx.resume()
    }
    if (ctx.state === 'suspended') {
      window.addEventListener('pointerdown', wake, { once: true })
      window.addEventListener('keydown', wake, { once: true })
    }

    kit.current = {
      ctx,
      master,
      stop: () => {
        dead = true
        window.clearTimeout(timer)
        window.removeEventListener('pointerdown', wake)
        window.removeEventListener('keydown', wake)
        const t = ctx.currentTime
        try {
          master.gain.cancelScheduledValues(t)
          master.gain.setValueAtTime(master.gain.value, t)
          master.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
        } catch {
          // A context already closing will refuse the ramp; not a problem.
        }
        window.setTimeout(() => {
          for (const osc of [...drones, breath]) {
            try {
              osc.stop()
            } catch {
              // Already stopped.
            }
          }
          void ctx.close()
        }, 900)
      },
    }

    return () => {
      kit.current?.stop()
      kit.current = null
    }
  }, [on, volume])
}
