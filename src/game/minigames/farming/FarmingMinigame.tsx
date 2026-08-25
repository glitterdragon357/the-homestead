import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'

/**
 * Vegetable patch minigame: a 3x3 plot of soil. Click empty soil to plant
 * a random crop, click a growing plant to water it (speeds it up), click
 * a ready plant to harvest it. Plots grow on their own over time even
 * without watering, so several can be tended at once. No fail state -
 * it's an endless little garden that builds up a harvest tally and a
 * "farmer" progression, same shape as the kitten minigame.
 *
 * Plots are saved as timestamps rather than a progress percentage, so a
 * crop keeps growing while the game is closed - come back later and the
 * patch is ready.
 */

type CropKey = 'carrot' | 'tomato' | 'corn' | 'pumpkin'

const CROPS: Record<CropKey, string> = {
  carrot: '🥕',
  tomato: '🍅',
  corn: '🌽',
  pumpkin: '🎃',
}
const CROP_KEYS = Object.keys(CROPS) as CropKey[]

interface Plot {
  crop: CropKey | null
  /** Epoch ms the crop went in the ground. Null when the plot is empty. */
  plantedAt: number | null
  /** Growing time already granted by watering, in ms. */
  wateredMs: number
}

const PLOT_COUNT = 9
const TICK_MS = 500
/** Time an unwatered crop takes to ripen. */
const GROW_MS = 10_000
/** Growing time a single watering is worth. */
const WATER_MS = 1_200

const EMPTY_PLOT: Plot = { crop: null, plantedAt: null, wateredMs: 0 }

function plotProgress(plot: Plot, now: number): number {
  if (!plot.crop || plot.plantedAt === null) return 0
  const grown = now - plot.plantedAt + plot.wateredMs
  return Math.max(0, Math.min(100, (grown / GROW_MS) * 100))
}

interface FarmerStage {
  name: string
  min: number
}

const STAGES: FarmerStage[] = [
  { name: 'Novice Farmer', min: 0 },
  { name: 'Green Thumb', min: 10 },
  { name: 'Master Farmer', min: 25 },
]

function getStage(total: number): { stage: FarmerStage; index: number } {
  let index = 0
  for (let i = 0; i < STAGES.length; i++) {
    if (total >= STAGES[i].min) index = i
  }
  return { stage: STAGES[index], index }
}

function randomCrop(): CropKey {
  return CROP_KEYS[Math.floor(Math.random() * CROP_KEYS.length)]
}

function plotEmoji(plot: Plot, progress: number): string {
  if (!plot.crop) return ''
  if (progress >= 100) return CROPS[plot.crop]
  if (progress >= 50) return '🌿'
  return '🌱'
}

/** What the vegetable patch remembers between visits. */
interface FarmingSave {
  plots: Plot[]
  harvestCounts: Record<CropKey, number>
}

export function FarmingMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<FarmingSave>('farming', () => ({
    plots: Array.from({ length: PLOT_COUNT }, () => ({ ...EMPTY_PLOT })),
    harvestCounts: { carrot: 0, tomato: 0, corn: 0, pumpkin: 0 },
  }))
  const { plots, harvestCounts } = save

  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)

  // Growth is derived from timestamps, so this tick only forces a repaint -
  // it never writes to the save.
  const [, forceRepaint] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceRepaint((n) => n + 1), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  const now = Date.now()

  function showToast(message: string) {
    setToast(message)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 900)
  }

  function clickPlot(index: number) {
    const plot = plots[index]

    if (!plot.crop) {
      const crop = randomCrop()
      setSave((s) => ({
        ...s,
        plots: s.plots.map((p, i) =>
          i === index ? { crop, plantedAt: Date.now(), wateredMs: 0 } : p
        ),
      }))
      showToast(`🌱 Planted ${crop}`)
      return
    }

    if (plotProgress(plot, Date.now()) < 100) {
      setSave((s) => ({
        ...s,
        plots: s.plots.map((p, i) =>
          i === index ? { ...p, wateredMs: p.wateredMs + WATER_MS } : p
        ),
      }))
      showToast('💧 Watered')
      return
    }

    const crop = plot.crop
    setSave((s) => ({
      plots: s.plots.map((p, i) => (i === index ? { ...EMPTY_PLOT } : p)),
      harvestCounts: { ...s.harvestCounts, [crop]: s.harvestCounts[crop] + 1 },
    }))
    showToast(`${CROPS[crop]} Harvested!`)
  }

  const totalHarvested = (Object.values(harvestCounts) as number[]).reduce((a, b) => a + b, 0)
  const { stage, index: stageIndex } = getStage(totalHarvested)
  const nextStage = STAGES[stageIndex + 1]

  return (
    <div style={styles.wrap}>
      <style>{pulseKeyframes}</style>
      <h2 style={styles.title}>Vegetable Patch</h2>
      <p style={styles.stageLabel}>{stage.name}</p>

      <div style={styles.plotWrap}>
        <div style={styles.toastSlot}>{toast && <span style={styles.toast}>{toast}</span>}</div>

        <div style={styles.grid}>
          {plots.map((plot, i) => {
            const progress = plotProgress(plot, now)
            const ready = plot.crop !== null && progress >= 100
            const dark = (Math.floor(i / 3) + (i % 3)) % 2 === 1
            return (
              <button
                key={i}
                onClick={() => clickPlot(i)}
                style={{
                  ...styles.tile,
                  background: dark ? '#8a6d4a' : '#a9835c',
                  animation: ready ? 'plotPulse 1.1s ease-in-out infinite' : undefined,
                }}
                title={!plot.crop ? 'Plant' : ready ? 'Harvest' : 'Water'}
              >
                <span style={{ fontSize: 30 }}>{plotEmoji(plot, progress)}</span>
                {plot.crop && progress < 100 && (
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <p style={styles.hint}>Tap soil to plant, growing plants to water, ready ones to harvest.</p>

      <div style={styles.inventory}>
        {CROP_KEYS.map((key) => (
          <span key={key} style={styles.inventoryItem}>
            {CROPS[key]} &times;{harvestCounts[key]}
          </span>
        ))}
      </div>

      <p style={styles.progressText}>
        {totalHarvested} harvested
        {nextStage ? ` · next stage at ${nextStage.min}` : ' · max stage reached'}
      </p>

      <button style={styles.exitButton} onClick={onExit}>
        Leave patch
      </button>
    </div>
  )
}

const pulseKeyframes = `
@keyframes plotPulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.55); }
  50% { box-shadow: 0 0 10px 4px rgba(255, 215, 0, 0.55); }
  100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.55); }
}
`

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#fdf6e3',
    borderRadius: 12,
    padding: 32,
    width: 380,
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  title: { margin: '0 0 4px', color: '#3a2e1f' },
  stageLabel: { margin: '0 0 16px', color: '#6b5a44', fontSize: 14 },
  plotWrap: { position: 'relative', margin: '0 auto 12px', width: 264 },
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: 3,
    width: 264,
    height: 264,
    margin: '0 auto',
    borderRadius: 10,
    overflow: 'hidden',
    border: '3px solid #3a2e1f',
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    right: 10,
    height: 4,
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#7cb342',
    transition: 'width 0.2s ease',
  },
  hint: { margin: '0 0 16px', color: '#6b5a44', fontSize: 12.5 },
  inventory: {
    display: 'flex',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
    fontSize: 15,
    color: '#3a2e1f',
  },
  inventoryItem: { display: 'inline-flex', alignItems: 'center' },
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
