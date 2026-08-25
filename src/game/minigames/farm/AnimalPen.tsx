import { useEffect, useRef, useState } from 'react'
import { useHomesteadStore } from '../../state/store'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { FarmArt } from './FarmArt'
import {
  ANIMALS,
  CHASE_DECAY_PER_TICK,
  CHASE_PER_CLICK,
  isGrown,
  levelOf,
  produceMsFor,
  productReady,
  type Animal,
  type AnimalKind,
  type BuildingId,
  initialPen,
  type PenSave,
} from './farmData'
import { panel } from './farmStyles'

/**
 * The coop and the barn are the same building with different livestock in
 * it, so they share this component: a list of animals with their timers,
 * a breeding row per kind, and the goat-specific play/escape/chase
 * handling. Each pen keeps its own save under its own minigame id, which
 * is also what lets the map badge them separately.
 */
export function AnimalPen({
  buildingId,
  kinds,
  emptyHint,
}: {
  buildingId: BuildingId
  kinds: AnimalKind[]
  emptyHint: string
}) {
  const [save, setSave] = useMinigameProgress<PenSave>(buildingId, initialPen)
  const addItem = useHomesteadStore((s) => s.addItem)

  const [toast, setToast] = useState<string | null>(null)
  const [chase, setChase] = useState<Record<number, number>>({})
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const level = levelOf(buildingId, save.level ?? 0)
  const now = Date.now()
  const animals = save.animals ?? []
  const atCapacity = animals.length >= level.capacity

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1400)
  }

  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  // One heartbeat: repaint timers, decay chase bars, roll for bored goats
  // bolting. Only writes to the save when a goat actually escapes.
  useEffect(() => {
    const interval = window.setInterval(() => {
      repaint((n) => n + 1)

      setChase((prev) => {
        if (!Object.keys(prev).length) return prev
        const next: Record<number, number> = {}
        for (const [id, v] of Object.entries(prev)) {
          const dropped = v - CHASE_DECAY_PER_TICK
          if (dropped > 0) next[Number(id)] = dropped
        }
        return next
      })

      const t = Date.now()
      let bolted = false
      setSave((s) => {
        const updated = (s.animals ?? []).map((a) => {
          const spec = ANIMALS[a.kind]
          if (!spec.boredomMs || a.escaped || !isGrown(a, t)) return a
          if (t - a.lastPlayedAt < spec.boredomMs) return a
          if (Math.random() > (spec.escapeChance ?? 0)) return a
          bolted = true
          return { ...a, escaped: true }
        })
        return updated.some((a, i) => a !== (s.animals ?? [])[i])
          ? { ...s, animals: updated }
          : s
      })
      if (bolted) showToast('A goat got out!')
    }, 1000)
    return () => window.clearInterval(interval)
  }, [setSave])

  // Deliver babies whose breeding timer is up.
  useEffect(() => {
    const ready = (Object.entries(save.breeding ?? {}) as [AnimalKind, number][]).some(
      ([, at]) => now >= at
    )
    if (!ready) return
    setSave((s) => {
      let id = s.nextId ?? 1
      const born: Animal[] = []
      const rest = { ...(s.breeding ?? {}) }
      for (const [kind, at] of Object.entries(s.breeding ?? {}) as [AnimalKind, number][]) {
        if (Date.now() < at) continue
        born.push({
          id: id++,
          kind,
          bornAt: Date.now(),
          lastProductAt: Date.now(),
          lastPlayedAt: Date.now(),
          escaped: false,
        })
        delete rest[kind]
      }
      if (!born.length) return s
      return { ...s, nextId: id, animals: [...(s.animals ?? []), ...born], breeding: rest }
    })
    showToast('A baby was born!')
  }, [save.breeding, now, setSave])

  function collect(a: Animal) {
    const spec = ANIMALS[a.kind]
    setSave((s) => ({
      ...s,
      animals: s.animals.map((x) => (x.id === a.id ? { ...x, lastProductAt: Date.now() } : x)),
    }))
    addItem(spec.product, 1)
    showToast(`+1 ${spec.product}`)
  }

  function collectAll() {
    const ready = animals.filter((a) => productReady(a, now, level.speedMult))
    if (!ready.length) return
    const ids = new Set(ready.map((a) => a.id))
    setSave((s) => ({
      ...s,
      animals: s.animals.map((x) => (ids.has(x.id) ? { ...x, lastProductAt: Date.now() } : x)),
    }))
    for (const a of ready) addItem(ANIMALS[a.kind].product, 1)
    showToast(`Collected ${ready.length}`)
  }

  function play(a: Animal) {
    setSave((s) => ({
      ...s,
      animals: s.animals.map((x) => (x.id === a.id ? { ...x, lastPlayedAt: Date.now() } : x)),
    }))
    showToast('The goat is happy!')
  }

  function chaseClick(a: Animal) {
    const current = (chase[a.id] ?? 0) + CHASE_PER_CLICK
    if (current >= 100) {
      setChase((c) => {
        const next = { ...c }
        delete next[a.id]
        return next
      })
      setSave((s) => ({
        ...s,
        animals: s.animals.map((x) =>
          x.id === a.id ? { ...x, escaped: false, lastPlayedAt: Date.now() } : x
        ),
      }))
      showToast('Caught it! Back in the fence.')
      return
    }
    setChase((c) => ({ ...c, [a.id]: current }))
  }

  function startBreeding(kind: AnimalKind) {
    const adults = animals.filter((a) => a.kind === kind && isGrown(a, now) && !a.escaped).length
    if (adults < 2 || save.breeding?.[kind] || atCapacity) return
    setSave((s) => ({
      ...s,
      breeding: { ...(s.breeding ?? {}), [kind]: Date.now() + ANIMALS[kind].breedMs },
    }))
    showToast(`${ANIMALS[kind].plural} are nesting...`)
  }

  const readyCount = animals.filter((a) => productReady(a, now, level.speedMult)).length

  return (
    <>
      <div style={panel.subhead}>
        <span>
          {level.label} &middot; {animals.length}/{level.capacity} housed
        </span>
        {readyCount > 1 && (
          <button style={panel.smallButton} onClick={collectAll}>
            Collect all ({readyCount})
          </button>
        )}
      </div>

      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      {animals.length === 0 && <p style={panel.empty}>{emptyHint}</p>}

      {animals.map((a) => {
        const spec = ANIMALS[a.kind]
        const grown = isGrown(a, now)
        const ready = productReady(a, now, level.speedMult)
        const produceMs = produceMsFor(a, level.speedMult)
        const bored = !!spec.boredomMs && grown && now - a.lastPlayedAt >= spec.boredomMs
        const contentment = spec.boredomMs
          ? 100 - clampPct(((now - a.lastPlayedAt) / spec.boredomMs) * 100)
          : null

        return (
          <div
            key={a.id}
            style={{
              ...panel.row,
              ...(a.escaped ? panel.rowAlert : ready ? panel.rowReady : null),
            }}
          >
            <div style={panel.rowArt}>
              <FarmArt subject={grown ? a.kind : 'chick'} size={grown ? 46 : 34} />
            </div>

            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>
                {grown ? spec.label : `Baby ${spec.label.toLowerCase()}`}
                {a.escaped && <span style={panel.tagAlert}>ESCAPED</span>}
                {bored && !a.escaped && <span style={panel.tagWarn}>BORED</span>}
              </div>

              {a.escaped ? (
                <>
                  <div style={panel.rowNote}>Chase it down - keep clicking, it keeps running.</div>
                  <Bar value={chase[a.id] ?? 0} color="#d9534f" />
                </>
              ) : !grown ? (
                <>
                  <div style={panel.rowNote}>
                    Growing up &middot; {formatSecs(spec.matureMs - (now - a.bornAt))} left
                  </div>
                  <Bar value={clampPct(((now - a.bornAt) / spec.matureMs) * 100)} color="#9b7fd4" />
                </>
              ) : (
                <>
                  <div style={panel.rowNote}>
                    {ready
                      ? `${spec.product} ready!`
                      : `Next ${spec.product} in ${formatSecs(produceMs - (now - a.lastProductAt))}`}
                  </div>
                  <Bar
                    value={clampPct(((now - a.lastProductAt) / produceMs) * 100)}
                    color={ready ? '#7cb342' : '#c3b48e'}
                  />
                  {contentment !== null && (
                    <div style={panel.contentRow}>
                      <span style={panel.contentLabel}>play</span>
                      <div style={panel.barTrackThin}>
                        <div
                          style={{
                            ...panel.barFill,
                            width: `${contentment}%`,
                            background: contentment < 30 ? '#d9534f' : '#5cb8e0',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={panel.rowActions}>
              {a.escaped ? (
                <button style={{ ...panel.smallButton, background: '#d9534f' }} onClick={() => chaseClick(a)}>
                  Chase!
                </button>
              ) : (
                <>
                  <button
                    style={{ ...panel.smallButton, opacity: ready ? 1 : 0.35 }}
                    onClick={() => collect(a)}
                    disabled={!ready}
                  >
                    {spec.collectVerb}
                  </button>
                  {spec.boredomMs && grown && (
                    <button style={{ ...panel.smallButton, background: '#5cb8e0' }} onClick={() => play(a)}>
                      Play
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}

      <div style={panel.sectionLabel}>Breeding</div>
      {kinds.map((kind) => {
        const spec = ANIMALS[kind]
        const adults = animals.filter((a) => a.kind === kind && isGrown(a, now) && !a.escaped).length
        const due = save.breeding?.[kind]
        const blocked = atCapacity
        return (
          <div key={kind} style={panel.breedRow}>
            <FarmArt subject={kind} size={30} />
            <span style={panel.breedLabel}>
              {spec.plural} &middot; {adults} adult{adults === 1 ? '' : 's'}
            </span>
            {due ? (
              <span style={panel.rowNote}>baby in {formatSecs(due - now)}</span>
            ) : blocked ? (
              <span style={panel.rowNote}>full</span>
            ) : (
              <button
                style={{ ...panel.smallButton, opacity: adults >= 2 ? 1 : 0.35 }}
                onClick={() => startBreeding(kind)}
                disabled={adults < 2}
              >
                Breed
              </button>
            )}
          </div>
        )
      })}

    </>
  )
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={panel.barTrack}>
      <div style={{ ...panel.barFill, width: `${value}%`, background: color }} />
    </div>
  )
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v))
}

function formatSecs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
