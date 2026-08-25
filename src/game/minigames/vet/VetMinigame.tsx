import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { PatientArt, TreatmentArt } from './VetArt'
import {
  AILMENT_BY_ID,
  KITS,
  MAX_MISSES,
  SURGERIES,
  TREATMENTS,
  TREATMENT_BY_ID,
  ailmentsWith,
  feeFor,
  initialVet,
  kitOf,
  makePatient,
  nextArrivalDue,
  surgeryOf,
  type Patient,
  type VetSave,
} from './vetData'
import { panel } from '../farm/farmStyles'

/**
 * The veterinary surgery: diagnose, then treat.
 *
 * A patient shows one symptom, and every symptom belongs to exactly two
 * ailments - so one symptom narrows it to a coin-flip and the second
 * settles it. Examining reveals the second symptom but costs time you may
 * not have, because patients get tired of waiting and go home.
 *
 * That trade is the whole game: guess for throughput, examine for
 * certainty. A wrong guess still uses up the medicine and docks the fee,
 * so bad hunches cost real money rather than just a retry - but no patient
 * is ever lost to the clock.
 *
 * Self-contained like the other trades. It earns fees rather than making
 * goods, so it never touches the crate - the only thing it buys is
 * medicine and equipment.
 */

type Tab = 'ward' | 'cupboard'

export function VetMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<VetSave>('vet', initialVet)
  const { coins, earn, spend } = usePurse('vet')

  const [tab, setTab] = useState<Tab>('ward')
  const [toast, setToast] = useState<string | null>(null)
  /** Which patient's treatment tray is open. */
  const [treating, setTreating] = useState<number | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const now = Date.now()
  const kit = kitOf(save)
  const surgery = surgeryOf(save)
  const patients = save.patients ?? []
  const supplies = save.supplies ?? {}

  useEffect(() => {
    const interval = window.setInterval(() => repaint((n) => n + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1800)
  }

  // Finish examinations and admit new arrivals. Nobody is sent home for
  // waiting - the only way out is cured, or two wrong treatments. One pass
  // so the ward only rewrites the save when something actually changed.
  useEffect(() => {
    const t = Date.now()
    const list = patients
    const anyExamDone = list.some((p) => p.examiningUntil && t >= p.examiningUntil)
    const roomFree = list.length < surgery.beds
    const dueArrival = t >= nextArrivalDue(save, t)

    if (!anyExamDone && !(roomFree && dueArrival)) return

    setSave((s) => {
      let next = (s.patients ?? []).map((p) =>
        p.examiningUntil && Date.now() >= p.examiningUntil
          ? { ...p, examined: true, examiningUntil: undefined }
          : p
      )

      let nextId = s.nextId ?? 1
      let arrival = nextArrivalDue(s, Date.now())
      if (Date.now() >= arrival && next.length < surgeryOf(s).beds) {
        next = [...next, makePatient(nextId++, Date.now())]
        arrival = Date.now() + surgeryOf(s).arrivalMs
      }
      return { ...s, patients: next, nextId, nextArrivalAt: arrival }
    })

  }, [patients, now, save.nextArrivalAt, surgery.beds, setSave])

  function examine(id: number) {
    setSave((s) => ({
      ...s,
      patients: (s.patients ?? []).map((p) =>
        p.id === id ? { ...p, examiningUntil: Date.now() + kitOf(s).examineMs } : p
      ),
    }))
    showToast('Examining...')
  }

  function treat(patient: Patient, treatmentId: string) {
    if ((supplies[treatmentId] ?? 0) <= 0) {
      showToast(`No ${TREATMENT_BY_ID[treatmentId]?.label.toLowerCase()} left - restock the cupboard.`)
      return
    }
    const ailment = AILMENT_BY_ID[patient.ailmentId]
    const correct = ailment?.treatmentId === treatmentId

    if (correct) {
      const fee = feeFor(patient)
      setSave((s) => ({
        ...s,
        supplies: { ...s.supplies, [treatmentId]: (s.supplies[treatmentId] ?? 0) - 1 },
        patients: (s.patients ?? []).filter((p) => p.id !== patient.id),
        cured: (s.cured ?? 0) + 1,
      }))
      earn(fee)
      setTreating(null)
      showToast(`${ailment.label} cured · +${fee} 🪙`)
      return
    }

    const misses = patient.misses + 1
    const gaveUp = misses >= MAX_MISSES
    setSave((s) => ({
      ...s,
      supplies: { ...s.supplies, [treatmentId]: (s.supplies[treatmentId] ?? 0) - 1 },
      patients: gaveUp
        ? (s.patients ?? []).filter((p) => p.id !== patient.id)
        : (s.patients ?? []).map((p) => (p.id === patient.id ? { ...p, misses } : p)),
    }))
    if (gaveUp) {
      setTreating(null)
      showToast('That did not help either - they took the animal home.')
    } else {
      showToast('That is not it. The medicine is wasted.')
    }
  }

  function restock(treatmentId: string, qty: number) {
    const t = TREATMENT_BY_ID[treatmentId]
    if (!t) return
    const total = t.cost * qty
    if (!spend(total)) {
      showToast('Not enough in the fee tin.')
      return
    }
    setSave((s) => ({
      ...s,
      supplies: { ...s.supplies, [treatmentId]: (s.supplies[treatmentId] ?? 0) + qty },
    }))
    showToast(`Restocked ${qty} × ${t.label.toLowerCase()}`)
  }

  function upgrade(kind: 'kit' | 'surgery') {
    const list = kind === 'kit' ? KITS : SURGERIES
    const key = kind === 'kit' ? 'kitLevel' : 'surgeryLevel'
    const current = (save[key as keyof VetSave] as number) ?? 0
    const next = list[current + 1]
    if (!next || !spend(next.cost)) return
    setSave((s) => ({ ...s, [key]: current + 1 }))
    showToast(`Now: ${next.label}`)
  }

  const nextKit = KITS[(save.kitLevel ?? 0) + 1]
  const nextSurgery = SURGERIES[(save.surgeryLevel ?? 0) + 1]
  const waiting = patients.filter((p) => !p.examiningUntil || now >= p.examiningUntil).length

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'ward', label: 'Ward', badge: waiting },
    { key: 'cupboard', label: 'Cupboard' },
  ]

  return (
    <div style={panel.wrap}>
      <div style={panel.header}>
        <h2 style={panel.title}>Vet</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : null) }}
          >
            {t.label}
            {!!t.badge && <span style={styles.badge}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      {tab === 'ward' && (
        <>
          <div style={panel.subhead}>
            <span>
              {surgery.label} &middot; {patients.length}/{surgery.beds} beds
            </span>
            <span style={panel.rowNote}>{save.cured ?? 0} cured</span>
          </div>

          {patients.length === 0 && (
            <p style={panel.empty}>
              Nobody waiting. The next one turns up in {formatSecs(nextArrivalDue(save, now) - now)}.
            </p>
          )}

          {patients.map((p) => {
            const ailment = AILMENT_BY_ID[p.ailmentId]
            const examining = !!p.examiningUntil && now < p.examiningUntil
            const candidates = p.examined ? [ailment] : ailmentsWith(p.shownSymptom)
            const open = treating === p.id

            return (
              <div
                key={p.id}
                style={{
                  ...panel.row,
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  ...(p.examined ? panel.rowReady : null),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={panel.rowArt}>
                    <PatientArt animal={p.animal} size={46} />
                  </div>
                  <div style={panel.rowBody}>
                    <div style={panel.rowTitle}>
                      {p.animal}
                      {p.misses > 0 && <span style={panel.tagWarn}>{p.misses} WRONG</span>}
                    </div>
                    <div style={panel.rowNote}>
                      symptom: <strong>{p.shownSymptom}</strong>
                      {p.examined && ailment && (
                        <>
                          {' '}
                          &amp; <strong>{ailment.symptoms.find((x) => x !== p.shownSymptom)}</strong>
                        </>
                      )}
                    </div>
                    <div style={{ ...panel.rowNote, color: p.examined ? '#4f7a3a' : '#6b5a44' }}>
                      {examining
                        ? `examining · ${formatSecs(p.examiningUntil! - now)}`
                        : p.examined
                          ? `diagnosed: ${ailment?.label}`
                          : `could be ${candidates.map((c) => c?.label).join(' or ')}`}
                    </div>
                  </div>
                  <div style={panel.rowActions}>
                    {!p.examined && !examining && (
                      <button style={{ ...panel.smallButton, background: '#5cb8e0' }} onClick={() => examine(p.id)}>
                        Examine
                      </button>
                    )}
                    <button
                      style={panel.smallButton}
                      onClick={() => setTreating(open ? null : p.id)}
                    >
                      {open ? 'Close' : 'Treat'}
                    </button>
                  </div>
                </div>

                {open && (
                  <div style={styles.tray}>
                    {TREATMENTS.map((t) => {
                      const stock = supplies[t.id] ?? 0
                      return (
                        <button
                          key={t.id}
                          onClick={() => treat(p, t.id)}
                          disabled={stock <= 0}
                          style={{ ...styles.remedy, opacity: stock > 0 ? 1 : 0.35 }}
                          title={`${t.label} · ${stock} in stock`}
                        >
                          <TreatmentArt id={t.id} size={30} />
                          <span style={styles.remedyLabel}>{t.label}</span>
                          <span style={styles.remedyStock}>×{stock}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <UpgradeRow
            title={kit.label}
            note={nextKit ? `next: ${nextKit.label} · ${nextKit.blurb}` : 'nothing left to buy 🎉'}
            cost={nextKit?.cost}
            coins={coins}
            onBuy={() => upgrade('kit')}
          />
          <UpgradeRow
            title={surgery.label}
            note={nextSurgery ? `next: ${nextSurgery.label} · ${nextSurgery.blurb}` : 'the finest surgery for miles 🎉'}
            cost={nextSurgery?.cost}
            coins={coins}
            onBuy={() => upgrade('surgery')}
          />
        </>
      )}

      {tab === 'cupboard' && (
        <>
          <p style={panel.hint}>
            Every treatment uses one from the cupboard - even a wrong one.
          </p>
          {TREATMENTS.map((t) => {
            const cures = AILMENT_BY_ID[
              Object.keys(AILMENT_BY_ID).find((k) => AILMENT_BY_ID[k].treatmentId === t.id) ?? ''
            ]
            return (
              <div key={t.id} style={panel.row}>
                <div style={panel.rowArt}>
                  <TreatmentArt id={t.id} size={40} />
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>
                    {t.label} &middot; ×{supplies[t.id] ?? 0}
                  </div>
                  <div style={panel.rowNote}>
                    {t.blurb} {cures ? `· treats ${cures.label.toLowerCase()}` : ''}
                  </div>
                  <div style={panel.rowNote}>{t.cost} 🪙 each</div>
                </div>
                <div style={panel.rowActions}>
                  <button
                    style={{ ...panel.smallButton, opacity: coins >= t.cost ? 1 : 0.35 }}
                    onClick={() => restock(t.id, 1)}
                    disabled={coins < t.cost}
                  >
                    Buy 1
                  </button>
                  <button
                    style={{ ...panel.darkButton, opacity: coins >= t.cost * 5 ? 1 : 0.35 }}
                    onClick={() => restock(t.id, 5)}
                    disabled={coins < t.cost * 5}
                  >
                    Buy 5
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}

      <button style={panel.exitButton} onClick={onExit}>
        Leave the surgery
      </button>
    </div>
  )
}

function UpgradeRow({
  title,
  note,
  cost,
  coins,
  onBuy,
}: {
  title: string
  note: string
  cost?: number
  coins: number
  onBuy: () => void
}) {
  return (
    <div style={{ ...panel.row, marginTop: 6 }}>
      <div style={panel.rowBody}>
        <div style={panel.rowTitle}>{title}</div>
        <div style={panel.rowNote}>{note}</div>
      </div>
      <div style={panel.rowActions}>
        {cost !== undefined && (
          <button
            style={{ ...panel.darkButton, opacity: coins >= cost ? 1 : 0.4 }}
            onClick={onBuy}
            disabled={coins < cost}
          >
            {cost} 🪙
          </button>
        )}
      </div>
    </div>
  )
}

function formatSecs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const styles: Record<string, React.CSSProperties> = {
  tabs: { display: 'flex', gap: 4 },
  tab: {
    flex: 1,
    padding: '7px 4px',
    fontSize: 12.5,
    border: 'none',
    borderRadius: 7,
    background: '#eadfc4',
    color: '#6b5a44',
    cursor: 'pointer',
  },
  tabActive: { background: '#3a2e1f', color: '#fdf6e3', fontWeight: 600 },
  badge: {
    marginLeft: 4,
    background: '#d9534f',
    color: 'white',
    borderRadius: 9,
    padding: '0 5px',
    fontSize: 10,
    fontWeight: 700,
  },
  tray: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed #d6c7a4',
  },
  remedy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '5px 2px',
    border: 'none',
    borderRadius: 7,
    background: '#fdf6e3',
    cursor: 'pointer',
  },
  remedyLabel: { fontSize: 8.5, color: '#3a2e1f', textAlign: 'center', lineHeight: 1.1 },
  remedyStock: { fontSize: 8.5, color: '#8a7a63' },
}
