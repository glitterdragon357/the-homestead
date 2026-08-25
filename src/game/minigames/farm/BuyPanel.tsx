import { useEffect, useRef, useState } from 'react'
import { useHomesteadStore } from '../../state/store'
import { FarmArt } from './FarmArt'
import { RODS } from '../fishing/fishData'
import {
  ANIMALS,
  BUILDINGS,
  levelOf,
  nextLevel,
  type AnimalKind,
  type BuildingId,
  type PenSave,
} from './farmData'
import { panel } from './farmStyles'

/**
 * Everything you spend coins on: building upgrades, livestock, and
 * fishing tackle.
 *
 * These sat on a separate market tile for a while. Splitting them out
 * meant every improvement was a trip somewhere else, so they live here
 * next to the things they improve.
 */

const BUILDING_ORDER: BuildingId[] = ['barn', 'field', 'kitchen']
/** Every animal shares the one barn. */
const PEN_ID: BuildingId = 'barn'

export function BuyPanel() {
  const coins = useHomesteadStore((s) => s.coins)
  const progress = useHomesteadStore((s) => s.progress)
  const spend = useHomesteadStore((s) => s.spend)
  const setProgress = useHomesteadStore((s) => s.setProgress)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1500)
  }

  function upgradeBuilding(id: BuildingId) {
    const saved = (progress[id] ?? {}) as { level?: number }
    const current = saved.level ?? 0
    const next = nextLevel(id, current)
    if (!next || !spend(next.cost)) return
    setProgress(id, { ...saved, level: current + 1 })
    showToast(`${BUILDINGS[id].name}: ${next.label}`)
  }

  function buyAnimal(kind: AnimalKind) {
    const spec = ANIMALS[kind]
    const pen = progress[PEN_ID] as PenSave | undefined
    if (!pen) return
    if ((pen.animals ?? []).length >= levelOf(PEN_ID, pen.level ?? 0).capacity) {
      showToast('The barn is full - upgrade it first')
      return
    }
    if (!spend(spec.price)) return

    const now = Date.now()
    setProgress(PEN_ID, {
      ...pen,
      nextId: (pen.nextId ?? 1) + 1,
      animals: [
        ...(pen.animals ?? []),
        {
          id: pen.nextId ?? 1,
          kind,
          bornAt: now - spec.matureMs, // bought grown
          lastProductAt: now,
          lastPlayedAt: now,
          escaped: false,
        },
      ],
    })
    showToast(`Bought a ${spec.label.toLowerCase()}`)
  }

  function upgradeRod() {
    const fishing = (progress.fishing ?? {}) as { rodLevel?: number }
    const current = fishing.rodLevel ?? 0
    const next = RODS[current + 1]
    if (!next || !spend(next.cost)) return
    setProgress('fishing', { ...fishing, rodLevel: current + 1 })
    showToast(`Upgraded to ${next.name}`)
  }

  const pen = progress[PEN_ID] as PenSave | undefined
  const capacity = pen ? levelOf(PEN_ID, pen.level ?? 0).capacity : 0
  const housed = pen?.animals?.length ?? 0
  const barnFull = housed >= capacity

  const rodLevel = ((progress.fishing ?? {}) as { rodLevel?: number }).rodLevel ?? 0
  const nextRod = RODS[rodLevel + 1]

  return (
    <>
      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      <div style={panel.sectionLabel}>Buildings</div>
      {BUILDING_ORDER.map((id) => {
        const saved = (progress[id] ?? {}) as { level?: number }
        const current = levelOf(id, saved.level ?? 0)
        const next = nextLevel(id, saved.level ?? 0)
        return (
          <div key={id} style={{ ...panel.row, marginTop: 6 }}>
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
                  onClick={() => upgradeBuilding(id)}
                  disabled={coins < next.cost}
                >
                  {next.cost} 🪙
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div style={panel.sectionLabel}>
        Livestock &middot; barn {housed}/{capacity}
      </div>
      {(Object.keys(ANIMALS) as AnimalKind[]).map((kind) => {
        const spec = ANIMALS[kind]
        return (
          <div key={kind} style={{ ...panel.row, marginTop: 6 }}>
            <div style={panel.rowArt}>
              <FarmArt subject={kind} size={44} />
            </div>
            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>{spec.label}</div>
              <div style={panel.rowNote}>
                gives {spec.product} every {Math.round(spec.produceMs / 1000)}s
                {spec.boredomMs ? ' · needs play' : ''}
              </div>
              <div style={panel.rowNote}>arrives fully grown</div>
            </div>
            <div style={panel.rowActions}>
              <button
                style={{ ...panel.smallButton, opacity: coins >= spec.price && !barnFull ? 1 : 0.35 }}
                onClick={() => buyAnimal(kind)}
                disabled={coins < spec.price || barnFull}
              >
                {barnFull ? 'Full' : `Buy · ${spec.price}`}
              </button>
            </div>
          </div>
        )
      })}

      <div style={panel.sectionLabel}>Tackle</div>
      <div style={{ ...panel.row, marginTop: 6 }}>
        <div style={panel.rowBody}>
          <div style={panel.rowTitle}>Fishing rod</div>
          <div style={panel.rowNote}>now: {RODS[rodLevel].name}</div>
          {nextRod ? (
            <div style={panel.rowNote}>
              next: {nextRod.name} &middot; {nextRod.blurb}
            </div>
          ) : (
            <div style={panel.rowNote}>best rod in the shed 🎉</div>
          )}
        </div>
        <div style={panel.rowActions}>
          {nextRod && (
            <button
              style={{ ...panel.darkButton, opacity: coins >= nextRod.cost ? 1 : 0.4 }}
              onClick={upgradeRod}
              disabled={coins < nextRod.cost}
            >
              {nextRod.cost} 🪙
            </button>
          )}
        </div>
      </div>
    </>
  )
}
