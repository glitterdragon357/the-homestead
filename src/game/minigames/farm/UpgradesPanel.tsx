import { useEffect, useRef, useState } from 'react'
import { useHomesteadStore } from '../../state/store'
import { BUILDINGS, levelOf, nextLevel, type BuildingId } from './farmData'
import { panel } from './farmStyles'

/**
 * Building upgrades, bought here rather than at the market. Improving the
 * barn is something you do *to the farm*, so it belongs in the farm panel
 * next to the thing it improves; the market keeps buying and selling.
 */
const ORDER: BuildingId[] = ['barn', 'field', 'kitchen']

export function UpgradesPanel() {
  const coins = useHomesteadStore((s) => s.coins)
  const progress = useHomesteadStore((s) => s.progress)
  const spend = useHomesteadStore((s) => s.spend)
  const setProgress = useHomesteadStore((s) => s.setProgress)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function upgrade(id: BuildingId) {
    const saved = (progress[id] ?? {}) as { level?: number }
    const current = saved.level ?? 0
    const next = nextLevel(id, current)
    if (!next || !spend(next.cost)) return
    setProgress(id, { ...saved, level: current + 1 })
    setToast(`${BUILDINGS[id].name}: ${next.label}`)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1500)
  }

  return (
    <>
      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      {ORDER.map((id) => {
        const saved = (progress[id] ?? {}) as { level?: number }
        const current = levelOf(id, saved.level ?? 0)
        const next = nextLevel(id, saved.level ?? 0)
        return (
          <div key={id} style={panel.row}>
            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>{BUILDINGS[id].name}</div>
              <div style={panel.rowNote}>now: {current.label}</div>
              {next ? (
                <div style={panel.rowNote}>
                  next: {next.label} &middot; {next.blurb}
                </div>
              ) : (
                <div style={panel.rowNote}>fully upgraded 🎉</div>
              )}
            </div>
            <div style={panel.rowActions}>
              {next && (
                <button
                  style={{ ...panel.darkButton, opacity: coins >= next.cost ? 1 : 0.4 }}
                  onClick={() => upgrade(id)}
                  disabled={coins < next.cost}
                >
                  {next.cost} 🪙
                </button>
              )}
            </div>
          </div>
        )
      })}

      <p style={panel.hint}>Livestock and fishing tackle are still bought at the market.</p>
    </>
  )
}
