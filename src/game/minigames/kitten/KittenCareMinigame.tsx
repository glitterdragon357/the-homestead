import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'

/**
 * Kitten care minigame: a cat sits on a tile floor next to a milk bottle,
 * a pacifier, a feather toy, and a bed, living through a real-time day/
 * night cycle (90s day, 90s night). By day you can feed each of its four
 * needs by handing it the matching item; needs drain slowly if ignored.
 * By night the cat automatically goes to bed and sleeps through the whole
 * night - items are unavailable and its rest need refills on its own.
 * The cat ages purely with clock time: it grows from baby to kid to adult
 * over successive day/night cycles, regardless of how well it's cared
 * for. There's no fail state and no ending - it just keeps living.
 */

type NeedKey = 'hunger' | 'comfort' | 'play' | 'rest'
type ItemKey = 'milk' | 'pacifier' | 'toy' | 'bed'

interface ItemDef {
  key: ItemKey
  need: NeedKey
  icon: string
  label: string
  cell: number // index into the 3x3 floor grid
}

const ITEMS: ItemDef[] = [
  { key: 'milk', need: 'hunger', icon: '🍼', label: 'Milk', cell: 1 },
  { key: 'pacifier', need: 'comfort', icon: '🩷', label: 'Pacifier', cell: 3 },
  { key: 'toy', need: 'play', icon: '🪶', label: 'Feather toy', cell: 5 },
  { key: 'bed', need: 'rest', icon: '🛏️', label: 'Bed', cell: 7 },
]

const NEED_LABELS: Record<NeedKey, string> = {
  hunger: 'Hunger',
  comfort: 'Comfort',
  play: 'Playfulness',
  rest: 'Rest',
}

const NEED_COLORS: Record<NeedKey, string> = {
  hunger: '#e0995c',
  comfort: '#9b7fd4',
  play: '#5cb8e0',
  rest: '#7cb342',
}

const CAT_CELL = 4
const BED_CELL = 7

const TICK_MS = 250
const DAY_MS = 90_000
const NIGHT_MS = 90_000
const CYCLE_MS = DAY_MS + NIGHT_MS

const DAY_DRAIN_PER_TICK = 0.25
const ACTION_BOOST = 25
const NIGHT_REST_PER_TICK = 100 / (NIGHT_MS / TICK_MS)

interface Stage {
  name: string
  emoji: string
  fontSize: number
}

const STAGES: Stage[] = [
  { name: 'Baby', emoji: '🐱', fontSize: 44 },
  { name: 'Kid', emoji: '🐱', fontSize: 60 },
  { name: 'Adult', emoji: '🐈', fontSize: 76 },
]

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/**
 * What the kitten remembers between visits. `bornAt` is a real timestamp,
 * so the cat keeps ageing through day/night cycles while the game is
 * closed - it grows up on wall-clock time, not on time spent watching it.
 */
interface KittenSave {
  bornAt: number
  needs: Record<NeedKey, number>
}

export function KittenCareMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<KittenSave>('kitten', () => ({
    bornAt: Date.now(),
    needs: { hunger: 55, comfort: 55, play: 55, rest: 55 },
  }))

  const startRef = useRef(save.bornAt)
  const [elapsed, setElapsed] = useState(Date.now() - save.bornAt)

  // Needs drain several times a second, so they live in local state and are
  // only written to the save on real actions (see `giveItem` and unmount).
  const [needs, setNeeds] = useState<Record<NeedKey, number>>(save.needs)
  const [bounce, setBounce] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const bounceTimeout = useRef<number | undefined>(undefined)
  const toastTimeout = useRef<number | undefined>(undefined)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsed(Date.now() - startRef.current)
    }, TICK_MS)
    return () => window.clearInterval(interval)
  }, [])

  const cyclePos = elapsed % CYCLE_MS
  const isDay = cyclePos < DAY_MS
  const cyclesCompleted = Math.floor(elapsed / CYCLE_MS)
  const dayNumber = cyclesCompleted + 1
  const phaseTimeLeftMs = isDay ? DAY_MS - cyclePos : CYCLE_MS - cyclePos

  const stageIndex = Math.min(cyclesCompleted, STAGES.length - 1)
  const stage = STAGES[stageIndex]
  const nextStage = STAGES[stageIndex + 1]
  const growthPct = nextStage ? clamp((cyclePos / CYCLE_MS) * 100) : 100

  useEffect(() => {
    setNeeds((prev) => {
      const next: Record<NeedKey, number> = { ...prev }
      if (isDay) {
        for (const key of Object.keys(next) as NeedKey[]) {
          next[key] = clamp(next[key] - DAY_DRAIN_PER_TICK)
        }
      } else {
        next.rest = clamp(next.rest + NIGHT_REST_PER_TICK)
      }
      return next
    })
  }, [elapsed, isDay])

  // Keep the latest needs in a ref so the unmount handler below saves the
  // current values rather than whatever they were on first render.
  const needsRef = useRef(needs)
  needsRef.current = needs

  useEffect(() => {
    return () => {
      window.clearTimeout(bounceTimeout.current)
      window.clearTimeout(toastTimeout.current)
      setSave((s) => ({ ...s, needs: needsRef.current }))
    }
  }, [setSave])

  function giveItem(item: ItemDef) {
    if (!isDay) return

    const updated = { ...needs, [item.need]: clamp(needs[item.need] + ACTION_BOOST) }
    setNeeds(updated)
    setSave((s) => ({ ...s, needs: updated }))

    setBounce(true)
    window.clearTimeout(bounceTimeout.current)
    bounceTimeout.current = window.setTimeout(() => setBounce(false), 220)

    setToast(`${item.icon} ${item.label}!`)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 900)
  }

  const catCell = isDay ? CAT_CELL : BED_CELL
  const cellIndices = Array.from({ length: 9 }, (_, i) => i)

  return (
    <div style={styles.wrap}>
      <style>{keyframes}</style>
      <h2 style={styles.title}>Kitten Care</h2>
      <p style={styles.stageLabel}>{stage.name} cat</p>

      <div style={styles.phaseRow}>
        <span>
          {isDay ? '☀️' : '🌙'} Day {dayNumber} &middot; {isDay ? 'daytime' : 'nighttime'}
        </span>
        <span>{formatClock(phaseTimeLeftMs)} left</span>
      </div>

      <div style={styles.floorWrap}>
        <div style={styles.toastSlot}>{toast && <span style={styles.toast}>{toast}</span>}</div>

        <div style={styles.floor}>
          {cellIndices.map((cell) => {
            const isCat = cell === catCell
            const item = !isCat ? ITEMS.find((i) => i.cell === cell) : undefined
            const dark = (Math.floor(cell / 3) + (cell % 3)) % 2 === 1
            const bg = isDay ? (dark ? '#dcc9a0' : '#e8d9b8') : dark ? '#2d2d47' : '#3a3a5c'

            return (
              <div key={cell} style={{ ...styles.tile, background: bg }}>
                {isCat && (
                  <>
                    {!isDay && <span style={styles.zzz}>Zzz</span>}
                    <span
                      style={{
                        fontSize: stage.fontSize,
                        transform: bounce ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease, font-size 0.3s ease',
                        lineHeight: 1,
                      }}
                    >
                      {isDay ? stage.emoji : '😴'}
                    </span>
                  </>
                )}
                {item && (
                  <button
                    style={{ ...styles.itemButton, opacity: isDay ? 1 : 0.3, cursor: isDay ? 'pointer' : 'default' }}
                    onClick={() => giveItem(item)}
                    disabled={!isDay}
                    title={isDay ? item.label : 'Sleeping...'}
                  >
                    <span style={{ fontSize: 30 }}>{item.icon}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={styles.bars}>
        {(Object.keys(needs) as NeedKey[]).map((key) => (
          <div key={key} style={styles.barRow}>
            <span style={styles.barLabel}>{NEED_LABELS[key]}</span>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barFill,
                  width: `${needs[key]}%`,
                  background: NEED_COLORS[key],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={styles.progressWrap}>
        {nextStage ? (
          <>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${growthPct}%` }} />
            </div>
            <p style={styles.progressText}>grows into a {nextStage.name.toLowerCase()} cat after today</p>
          </>
        ) : (
          <p style={styles.progressText}>fully grown 🎉</p>
        )}
      </div>

      <button style={styles.exitButton} onClick={onExit}>
        Leave kitten
      </button>
    </div>
  )
}

const keyframes = `
@keyframes zzzFloat {
  0% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(-6px); opacity: 1; }
  100% { transform: translateY(0); opacity: 0.4; }
}
`

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#fdf6e3',
    borderRadius: 12,
    padding: 'clamp(16px, 5vw, 32px)',
    width: 'min(380px, calc(100vw - 20px))',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  title: { margin: '0 0 4px', color: '#3a2e1f' },
  stageLabel: { margin: '0 0 12px', color: '#6b5a44', fontSize: 14 },
  phaseRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12.5,
    color: '#6b5a44',
    width: '100%',
    maxWidth: 264,
    margin: '0 auto 8px',
  },
  floorWrap: { position: 'relative', margin: '0 auto 18px', width: '100%', maxWidth: 264 },
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
  },
  floor: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: 3,
    width: '100%',
    maxWidth: 264,
    aspectRatio: '1',
    margin: '0 auto',
    borderRadius: 10,
    overflow: 'hidden',
    border: '3px solid #3a2e1f',
    transition: 'background 0.4s ease',
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'background 0.4s ease',
  },
  zzz: {
    position: 'absolute',
    top: 6,
    right: 14,
    fontSize: 13,
    color: '#fdf6e3',
    fontWeight: 700,
    animation: 'zzzFloat 1.8s ease-in-out infinite',
  },
  itemButton: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    padding: 0,
  },
  bars: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10 },
  barLabel: { width: 88, fontSize: 13, color: '#3a2e1f', textAlign: 'left' },
  barTrack: {
    flex: 1,
    height: 12,
    background: '#e3d5b8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.2s ease',
  },
  progressWrap: { marginBottom: 8 },
  progressTrack: {
    height: 10,
    background: '#e3d5b8',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    background: '#7cb342',
    transition: 'width 0.2s ease',
  },
  progressText: { margin: 0, fontSize: 12, color: '#6b5a44' },
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
