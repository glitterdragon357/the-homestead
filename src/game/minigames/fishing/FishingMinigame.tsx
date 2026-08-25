import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { useHomesteadStore } from '../../state/store'
import { FishArt } from './FishArt'
import {
  FISH,
  RODS,
  fightFor,
  pickFish,
  type FishDef,
} from './fishData'

/**
 * Fishing minigame: cast a line, react to the bite within a short window
 * to hook the fish, then time clicks on a moving marker to reel it in.
 * While reeling you only know how the fish *feels* - the species is
 * revealed at the moment you land it.
 *
 * Landed fish go straight into the shared crate rather than paying out
 * coins here; selling them is the market's job. Rod upgrades are bought
 * there too, so the pond is purely about the fight.
 *
 * THE ROD IS A DIFFICULTY MODIFIER, NOT A GATE. Any rod can land any
 * fish - a marlin on a twig rod is a genuine feat rather than an error
 * message. Bigger fish fight faster, need more pulls, and give less
 * slack, so a poor rod makes them punishing without ever making them
 * impossible.
 *
 * Species, tiers and rods all live in fishData.ts so the market can price
 * a catch and sell tackle without importing this component.
 */

type Phase = 'idle' | 'waiting' | 'biting' | 'reeling' | 'caught' | 'escaped'

/** Why the fish isn't on the line any more - drives the failure message. */
type EscapeReason = 'missedHook' | 'shookOff'

function randomBetween([min, max]: [number, number]): number {
  return min + Math.random() * (max - min)
}

function randomTargetStart(width: number): number {
  return randomBetween([8, 92 - width])
}

/**
 * What the pond remembers. `rodLevel` lives here but is bought at the
 * market, which writes it through the store.
 */
interface FishingSave {
  rodLevel: number
  /** Times each species has been landed, for the record book. */
  caught: Record<string, number>
}

export function FishingMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<FishingSave>('fishing', () => ({
    rodLevel: 0,
    caught: {},
  }))
  const coins = useHomesteadStore((s) => s.coins)
  const addItem = useHomesteadStore((s) => s.addItem)
  const rodLevel = save.rodLevel ?? 0
  const caught = save.caught ?? {}

  const [phase, setPhase] = useState<Phase>('idle')
  const [hooked, setHooked] = useState<FishDef | null>(null)
  const [reelsDone, setReelsDone] = useState(0)
  const [missesLeft, setMissesLeft] = useState(0)
  const [escapeReason, setEscapeReason] = useState<EscapeReason>('missedHook')
  const [markerPos, setMarkerPos] = useState(0)
  const [targetStart, setTargetStart] = useState(38)
  const [toast, setToast] = useState<string | null>(null)
  const [showBook, setShowBook] = useState(false)

  const biteTimeout = useRef<number | undefined>(undefined)
  const hookTimeout = useRef<number | undefined>(undefined)
  const reelInterval = useRef<number | undefined>(undefined)
  const toastTimeout = useRef<number | undefined>(undefined)
  const reelDirection = useRef(1)

  const rod = RODS[rodLevel]
  const nextRod = RODS[rodLevel + 1]
  const fight = hooked ? fightFor(hooked, rod) : null

  useEffect(() => {
    return () => {
      window.clearTimeout(biteTimeout.current)
      window.clearTimeout(hookTimeout.current)
      window.clearTimeout(toastTimeout.current)
      window.clearInterval(reelInterval.current)
    }
  }, [])

  function showToast(message: string) {
    setToast(message)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1000)
  }

  function castLine() {
    setHooked(null)
    setPhase('waiting')
    const delay = randomBetween(rod.biteDelay)
    biteTimeout.current = window.setTimeout(() => {
      setPhase('biting')
      hookTimeout.current = window.setTimeout(() => {
        setEscapeReason('missedHook')
        setPhase('escaped')
      }, rod.hookWindowMs)
    }, delay)
  }

  function hookFish() {
    if (phase !== 'biting') return
    window.clearTimeout(hookTimeout.current)

    const fish = pickFish(rod.depthBonus)
    const f = fightFor(fish, rod)
    setHooked(fish)
    setReelsDone(0)
    setMissesLeft(f.slack)
    setTargetStart(randomTargetStart(f.targetWidth))
    setMarkerPos(0)
    reelDirection.current = 1
    setPhase('reeling')

    reelInterval.current = window.setInterval(() => {
      setMarkerPos((prev) => {
        let next = prev + reelDirection.current * f.markerSpeed
        if (next >= 100) {
          next = 100
          reelDirection.current = -1
        } else if (next <= 0) {
          next = 0
          reelDirection.current = 1
        }
        return next
      })
    }, 16)
  }

  function attemptReel() {
    if (phase !== 'reeling' || !hooked || !fight) return

    const hit = markerPos >= targetStart && markerPos <= targetStart + fight.targetWidth
    if (!hit) {
      const left = missesLeft - 1
      setMissesLeft(left)
      if (left < 0) {
        window.clearInterval(reelInterval.current)
        setEscapeReason('shookOff')
        setPhase('escaped')
        return
      }
      showToast(left === 0 ? 'Line is slipping!' : 'Slipped!')
      return
    }

    const done = reelsDone + 1
    if (done >= fight.reels) {
      window.clearInterval(reelInterval.current)
      setReelsDone(done)
      setSave((s) => ({
        ...s,
        caught: { ...(s.caught ?? {}), [hooked.name]: ((s.caught ?? {})[hooked.name] ?? 0) + 1 },
      }))
      addItem(hooked.name, 1)
      setPhase('caught')
      return
    }

    // More pulls to go: re-roll the target so each one is a fresh read.
    setReelsDone(done)
    setTargetStart(randomTargetStart(fight.targetWidth))
    showToast(`Good pull! ${done}/${fight.reels}`)
  }

  function resetToIdle() {
    setPhase('idle')
    setHooked(null)
    setReelsDone(0)
  }

  const speciesCaught = Object.keys(caught).length

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Fishing Spot</h2>
      <p style={styles.subLabel}>
        {rod.name} &middot; 🪙 {coins}
      </p>

      <div style={styles.pondWrap}>
        <div style={styles.toastSlot}>{toast && <span style={styles.toast}>{toast}</span>}</div>

        <div style={phase === 'caught' ? { ...styles.pond, ...styles.pondCaught } : styles.pond}>
          {phase === 'idle' && <span style={styles.pondText}>🎣 Cast your line</span>}
          {phase === 'waiting' && <span style={styles.pondText}>〰️ Waiting for a bite...</span>}
          {phase === 'biting' && <span style={styles.bite}>❗ Bite! Hook it!</span>}

          {phase === 'reeling' && fight && (
            <div>
              <div style={styles.pondText}>❓ {fight.hint}</div>
              <div style={styles.pipRow}>
                {fight.reels > 1 &&
                  Array.from({ length: fight.reels }, (_, i) => (
                    <span key={`r${i}`} style={{ ...styles.pip, opacity: i < reelsDone ? 1 : 0.3 }}>
                      ●
                    </span>
                  ))}
              </div>
              <div style={styles.slackRow}>
                line:{' '}
                {Array.from({ length: fight.slack }, (_, i) => (
                  <span key={`s${i}`} style={{ ...styles.slackPip, opacity: i < missesLeft ? 1 : 0.22 }}>
                    ▮
                  </span>
                ))}
              </div>
            </div>
          )}

          {phase === 'caught' && hooked && (
            <div style={styles.catchBox}>
              <FishArt species={hooked.name} size={240} />
              <span style={styles.catchName}>{hooked.name}</span>
              <span style={styles.catchCoins}>worth {hooked.coins} 🪙 at market</span>
            </div>
          )}

          {phase === 'escaped' && (
            <span style={styles.pondText}>
              {escapeReason === 'shookOff'
                ? 'It shook the hook and was gone.'
                : 'Too slow - the fish got away...'}
            </span>
          )}
        </div>

        {phase === 'reeling' && fight && (
          <div style={styles.reelTrack}>
            <div
              style={{
                ...styles.reelTarget,
                left: `${targetStart}%`,
                width: `${fight.targetWidth}%`,
              }}
            />
            <div style={{ ...styles.reelMarker, left: `${markerPos}%` }} />
          </div>
        )}
      </div>

      <div style={styles.actionRow}>
        {phase === 'idle' && (
          <button style={styles.button} onClick={castLine}>
            Cast Line
          </button>
        )}
        {phase === 'waiting' && (
          <button style={{ ...styles.button, opacity: 0.5 }} disabled>
            Waiting...
          </button>
        )}
        {phase === 'biting' && (
          <button style={{ ...styles.button, background: '#d9534f' }} onClick={hookFish}>
            Hook!
          </button>
        )}
        {phase === 'reeling' && (
          <button style={styles.button} onClick={attemptReel}>
            Reel!
          </button>
        )}
        {(phase === 'caught' || phase === 'escaped') && (
          <button style={styles.button} onClick={resetToIdle}>
            Cast Again
          </button>
        )}
      </div>

      <div style={styles.shop}>
        <div style={styles.shopLeft}>
          <span style={styles.shopTitle}>{rod.name}</span>
          <span style={styles.shopBlurb}>
            {nextRod ? `Next: ${nextRod.name} · buy it at the market` : 'Best rod in the shed 🎉'}
          </span>
        </div>
      </div>

      <button style={styles.bookToggle} onClick={() => setShowBook((v) => !v)}>
        {showBook ? 'Hide' : 'Show'} record book ({speciesCaught}/{FISH.length})
      </button>

      {showBook && (
        <div style={styles.book}>
          {FISH.map((f) => {
            const count = caught[f.name] ?? 0
            return (
              <div key={f.name} style={{ ...styles.bookEntry, opacity: count ? 1 : 0.28 }}>
                <FishArt species={f.name} size={44} />
                <span style={styles.bookName}>{count ? f.name : '???'}</span>
                {count > 0 && <span style={styles.bookCount}>&times;{count}</span>}
              </div>
            )
          })}
        </div>
      )}

      <button style={styles.exitButton} onClick={onExit}>
        Leave pond
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#fdf6e3',
    borderRadius: 12,
    padding: 'clamp(16px, 5vw, 32px)',
    width: 'min(380px, calc(100vw - 20px))',
    maxHeight: 'calc(100vh - 20px)',
    overflowY: 'auto',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  title: { margin: '0 0 4px', color: '#3a2e1f' },
  subLabel: { margin: '0 0 16px', color: '#6b5a44', fontSize: 14 },
  pondWrap: { position: 'relative', margin: '0 auto 16px', width: '100%', maxWidth: 300 },
  toastSlot: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    height: 24,
    display: 'flex',
    justifyContent: 'center',
  },
  toast: {
    background: '#3a2e1f',
    color: '#fdf6e3',
    fontSize: 13,
    padding: '3px 10px',
    borderRadius: 12,
    opacity: 0.9,
    whiteSpace: 'nowrap',
  },
  pond: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 132,
    background: '#3f7fbf',
    borderRadius: 10,
    border: '3px solid #2f5f8f',
    marginBottom: 10,
    padding: 8,
  },
  /**
   * On a catch the pond drops its water colour: the fish is the thing to
   * look at, and a mid-blue behind a blue-grey fish hides exactly the
   * markings that tell the species apart.
   */
  pondCaught: {
    background: '#fbf6ea',
    borderColor: '#d8c9a4',
    minHeight: 172,
  },
  pondText: { color: '#eaf3fb', fontSize: 15, fontWeight: 600, padding: '0 8px', textAlign: 'center' },
  bite: { color: '#fff3c4', fontSize: 18, fontWeight: 800 },
  pipRow: { marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' },
  pip: { color: '#fff3c4', fontSize: 13 },
  slackRow: {
    marginTop: 6,
    fontSize: 11,
    color: '#d6e7f5',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  slackPip: { color: '#ffd98a', fontSize: 13, marginLeft: 2 },
  catchBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  catchName: { color: '#3a2e1f', fontSize: 16, fontWeight: 700 },
  catchCoins: { color: '#8a6b1f', fontSize: 13.5, fontWeight: 600 },
  reelTrack: {
    position: 'relative',
    height: 20,
    background: '#e3d5b8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  reelTarget: { position: 'absolute', top: 0, bottom: 0, background: '#7cb342' },
  reelMarker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 28,
    background: '#3a2e1f',
    transform: 'translateX(-2px)',
  },
  actionRow: { marginBottom: 16 },
  button: {
    padding: '10px 26px',
    fontSize: 15,
    borderRadius: 8,
    border: 'none',
    background: '#7cb342',
    color: 'white',
    cursor: 'pointer',
  },
  shop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    background: '#f2e6c9',
    borderRadius: 8,
    padding: '10px 14px',
    textAlign: 'left',
  },
  shopLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  shopTitle: { fontSize: 13, fontWeight: 600, color: '#3a2e1f' },
  shopBlurb: { fontSize: 11.5, color: '#6b5a44' },
  upgradeButton: {
    padding: '6px 14px',
    fontSize: 13,
    borderRadius: 6,
    border: 'none',
    background: '#3a2e1f',
    color: '#fdf6e3',
    cursor: 'pointer',
    flexShrink: 0,
  },
  bookToggle: {
    display: 'block',
    margin: '12px auto 0',
    background: 'none',
    border: 'none',
    color: '#6b5a44',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 12.5,
  },
  book: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 10,
    padding: 10,
    background: '#f2e6c9',
    borderRadius: 8,
  },
  bookEntry: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  bookName: { fontSize: 9.5, color: '#3a2e1f', textAlign: 'center', lineHeight: 1.15 },
  bookCount: { fontSize: 9, color: '#6b5a44' },
  exitButton: {
    display: 'block',
    margin: '16px auto 0',
    background: 'none',
    border: 'none',
    color: '#8a7a63',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 13,
  },
}
