import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { FarmArt } from './FarmArt'
import {
  CROPS,
  CROP_ORDER,
  EMPTY_PLOT,
  cropProgress,
  levelOf,
  type CropKey,
  type FieldSave,
} from './farmData'
import { panel } from './farmStyles'

export function FieldMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<FieldSave>('field', () => ({
    level: 0,
    plots: Array.from({ length: levelOf('field', 0).capacity }, () => ({ ...EMPTY_PLOT })),
  }))
  const coins = useHomesteadStore((s) => s.coins)
  const addItem = useHomesteadStore((s) => s.addItem)

  const [plantChoice, setPlantChoice] = useState<CropKey>('wheat')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const level = levelOf('field', save.level ?? 0)
  const now = Date.now()

  // Growth comes from timestamps, so this tick only repaints - it never
  // writes to the save.
  useEffect(() => {
    const interval = window.setInterval(() => repaint((n) => n + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  // An upgrade adds furrows; make sure the plot list matches the level.
  const plots = save.plots ?? []
  useEffect(() => {
    if (plots.length >= level.capacity) return
    setSave((s) => ({
      ...s,
      plots: [
        ...(s.plots ?? []),
        ...Array.from({ length: level.capacity - (s.plots ?? []).length }, () => ({ ...EMPTY_PLOT })),
      ],
    }))
  }, [plots.length, level.capacity, setSave])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1200)
  }

  function clickPlot(index: number) {
    const plot = plots[index]
    if (!plot) return

    if (!plot.crop) {
      setSave((s) => ({
        ...s,
        plots: s.plots.map((p, i) =>
          i === index ? { crop: plantChoice, plantedAt: Date.now(), wateredMs: 0 } : p
        ),
      }))
      showToast(`Planted ${plantChoice}`)
      return
    }

    if (cropProgress(plot, Date.now(), level.speedMult) < 100) {
      setSave((s) => ({
        ...s,
        plots: s.plots.map((p, i) =>
          i === index && p.crop ? { ...p, wateredMs: p.wateredMs + CROPS[p.crop].waterMs } : p
        ),
      }))
      showToast('Watered')
      return
    }

    const crop = plot.crop
    const spec = CROPS[crop]
    setSave((s) => ({
      ...s,
      plots: s.plots.map((p, i) => (i === index ? { ...EMPTY_PLOT } : p)),
    }))
    addItem(crop, spec.yield)
    showToast(`+${spec.yield} ${crop}`)
  }

  function harvestAll() {
    const ripe = plots
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.crop && cropProgress(p, now, level.speedMult) >= 100)
    if (!ripe.length) return
    const ids = new Set(ripe.map(({ i }) => i))
    for (const { p } of ripe) if (p.crop) addItem(p.crop, CROPS[p.crop].yield)
    setSave((s) => ({ ...s, plots: s.plots.map((p, i) => (ids.has(i) ? { ...EMPTY_PLOT } : p)) }))
    showToast(`Harvested ${ripe.length}`)
  }

  function plantAll() {
    const empty = plots.filter((p) => !p.crop).length
    if (!empty) return
    setSave((s) => ({
      ...s,
      plots: s.plots.map((p) =>
        p.crop ? p : { crop: plantChoice, plantedAt: Date.now(), wateredMs: 0 }
      ),
    }))
    showToast(`Planted ${empty} ${plantChoice}`)
  }

  const ripeCount = plots.filter((p) => p.crop && cropProgress(p, now, level.speedMult) >= 100).length
  const emptyCount = plots.filter((p) => !p.crop).length
  const columns = plots.length > 9 ? 4 : 3

  return (
    <div style={panel.wrap}>
      <style>{keyframes}</style>

      <div style={panel.header}>
        <h2 style={panel.title}>Field</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <div style={panel.subhead}>
        <span>
          {level.label} &middot; {plots.length} plots
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {emptyCount > 1 && (
            <button style={panel.smallButton} onClick={plantAll}>
              Plant all
            </button>
          )}
          {ripeCount > 1 && (
            <button style={panel.smallButton} onClick={harvestAll}>
              Harvest ({ripeCount})
            </button>
          )}
        </div>
      </div>

      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      <div style={styles.seedRow}>
        {CROP_ORDER.map((c) => (
          <button
            key={c}
            onClick={() => setPlantChoice(c)}
            style={{ ...styles.seedButton, ...(plantChoice === c ? styles.seedActive : null) }}
          >
            <FarmArt subject={c} size={26} />
            {CROPS[c].label}
          </button>
        ))}
      </div>

      <p style={panel.hint}>
        Tap soil to plant, growing crops to water, ripe ones to harvest.
      </p>

      <div style={{ ...styles.field, gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {plots.map((plot, i) => {
          const progress = cropProgress(plot, now, level.speedMult)
          const ripe = plot.crop !== null && progress >= 100
          return (
            <button
              key={i}
              onClick={() => clickPlot(i)}
              style={{
                ...styles.plot,
                animation: ripe ? 'ripePulse 1.2s ease-in-out infinite' : undefined,
              }}
              title={!plot.crop ? 'Plant' : ripe ? 'Harvest' : 'Water'}
            >
              {plot.crop ? (
                <div style={{ opacity: ripe ? 1 : 0.35 + (progress / 100) * 0.5 }}>
                  <FarmArt subject={plot.crop} size={32} />
                </div>
              ) : (
                <span style={styles.plotEmpty}>+</span>
              )}
              {plot.crop && !ripe && (
                <div style={styles.plotBar}>
                  <div style={{ ...styles.plotBarFill, width: `${progress}%` }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <button style={panel.exitButton} onClick={onExit}>
        Leave field
      </button>
    </div>
  )
}

const keyframes = `
@keyframes ripePulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 9px 3px rgba(255, 215, 0, 0.5); }
  100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.5); }
}
`

const styles: Record<string, React.CSSProperties> = {
  seedRow: { display: 'flex', gap: 6, justifyContent: 'center' },
  seedButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    fontSize: 12.5,
    border: '2px solid transparent',
    borderRadius: 7,
    background: '#eadfc4',
    color: '#6b5a44',
    cursor: 'pointer',
  },
  seedActive: { borderColor: '#7cb342', background: '#e6efd4', color: '#3a2e1f', fontWeight: 600 },
  field: { display: 'grid', gap: 6 },
  plot: {
    position: 'relative',
    aspectRatio: '1',
    border: 'none',
    borderRadius: 8,
    background: '#a9835c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  plotEmpty: { fontSize: 20, color: '#c9a883' },
  plotBar: {
    position: 'absolute',
    bottom: 5,
    left: 7,
    right: 7,
    height: 4,
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  plotBarFill: { height: '100%', background: '#7cb342' },
}
