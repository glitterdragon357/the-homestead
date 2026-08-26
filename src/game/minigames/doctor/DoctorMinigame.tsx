import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { FaceArt, RemedyArt } from './DoctorArt'
import {
  CLINICS,
  CONDITION_BY_ID,
  KITS,
  REMEDIES,
  REMEDY_BY_ID,
  TESTS,
  TEST_BY_KEY,
  candidatesFor,
  clinicOf,
  feeFor,
  initialDoctor,
  kitOf,
  makeDoctorPatient,
  nextArrivalDue,
  type DoctorPatient,
  type DoctorSave,
  type TestKey,
} from './doctorData'
import { panel } from '../farm/farmStyles'
import { GiftRow } from '../../economy/GiftRow'

/**
 * The village surgery.
 *
 * Where the vet is one binary reveal, this is progressive elimination: a
 * complaint leaves three possibilities, and each test you run splits what
 * is left. You may prescribe at any moment, so the decision is how much
 * certainty to buy - tests cost a fee and take time, but no one is on a
 * clock and wrong calls only shrink the fee, so care and haste are both
 * paid for in money rather than in lost patients.
 *
 * The candidate list is shown and shrinks as results land, so the
 * deduction is visible rather than something to hold in your head.
 */

type Tab = 'surgery' | 'rooms'

export function DoctorMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<DoctorSave>('doctor', initialDoctor)
  const { coins, earn, spend } = usePurse('doctor')

  const [tab, setTab] = useState<Tab>('surgery')
  const [toast, setToast] = useState<string | null>(null)
  const [prescribing, setPrescribing] = useState<number | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const now = Date.now()
  const kit = kitOf(save)
  const clinic = clinicOf(save)
  const patients = save.patients ?? []

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

  // Land finished tests and admit arrivals. The only way a patient leaves
  // is successfully treated.
  useEffect(() => {
    const t = Date.now()
    const testDone = patients.some((p) => p.running && t >= p.running.doneAt)
    const roomFree = patients.length < clinic.beds
    const due = t >= nextArrivalDue(save, t)
    if (!testDone && !(roomFree && due)) return

    setSave((s) => {
      let next: DoctorPatient[] = (s.patients ?? [])
        .map((p) => {
          if (!p.running || Date.now() < p.running.doneAt) return p
          const condition = CONDITION_BY_ID[p.conditionId]
          const key = p.running.test
          return {
            ...p,
            results: { ...p.results, [key]: condition?.signature[key] ?? false },
            running: undefined,
          }
        })

      let nextId = s.nextId ?? 1
      let arrival = nextArrivalDue(s, Date.now())
      if (Date.now() >= arrival && next.length < clinicOf(s).beds) {
        next = [...next, makeDoctorPatient(nextId++, Date.now())]
        arrival = Date.now() + clinicOf(s).arrivalMs
      }
      return { ...s, patients: next, nextId, nextArrivalAt: arrival }
    })

  }, [patients, now, save.nextArrivalAt, clinic.beds, setSave])

  function runTest(patient: DoctorPatient, key: TestKey) {
    const test = TEST_BY_KEY[key]
    if (patient.running) return
    if (patient.results[key] !== undefined) return
    if (!spend(test.cost)) {
      showToast('Not enough to cover the test.')
      return
    }
    setSave((s) => ({
      ...s,
      patients: (s.patients ?? []).map((p) =>
        p.id === patient.id
          ? { ...p, running: { test: key, doneAt: Date.now() + test.ms * kitOf(s).speedMult } }
          : p
      ),
    }))
    showToast(`${test.label} sent off...`)
  }

  function prescribe(patient: DoctorPatient, remedyId: string) {
    const condition = CONDITION_BY_ID[patient.conditionId]
    if (condition?.remedyId === remedyId) {
      const fee = feeFor(patient)
      setSave((s) => ({
        ...s,
        patients: (s.patients ?? []).filter((p) => p.id !== patient.id),
        treated: (s.treated ?? 0) + 1,
      }))
      earn(fee)
      setPrescribing(null)
      showToast(`${condition.label} treated · +${fee} 🪙`)
      return
    }

    // Wrong, but they stay in the chair - only the fee suffers.
    const misses = patient.misses + 1
    setSave((s) => ({
      ...s,
      patients: (s.patients ?? []).map((p) => (p.id === patient.id ? { ...p, misses } : p)),
    }))
    showToast('That did not help. Try again - the fee is reduced.')
  }

  function upgrade(kind: 'kit' | 'clinic') {
    const list = kind === 'kit' ? KITS : CLINICS
    const key = kind === 'kit' ? 'kitLevel' : 'clinicLevel'
    const current = (save[key as keyof DoctorSave] as number) ?? 0
    const next = list[current + 1]
    if (!next || !spend(next.cost)) return
    setSave((s) => ({ ...s, [key]: current + 1 }))
    showToast(`Now: ${next.label}`)
  }

  const nextKit = KITS[(save.kitLevel ?? 0) + 1]
  const nextClinic = CLINICS[(save.clinicLevel ?? 0) + 1]
  const waiting = patients.filter((p) => !p.running || now >= p.running.doneAt).length

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'surgery', label: 'Surgery', badge: waiting },
    { key: 'rooms', label: 'Practice' },
  ]

  return (
    <div style={panel.wrap}>
      <div style={panel.header}>
        <h2 style={panel.title}>Doctor</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <GiftRow from="doctor" />

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

      {tab === 'surgery' && (
        <>
          <div style={panel.subhead}>
            <span>
              {clinic.label} &middot; {patients.length}/{clinic.beds} seen
            </span>
            <span style={panel.rowNote}>{save.treated ?? 0} treated</span>
          </div>

          {patients.length === 0 && (
            <p style={panel.empty}>
              Nobody waiting. Next along in {formatSecs(nextArrivalDue(save, now) - now)}.
            </p>
          )}

          {patients.map((p) => {
            const candidates = candidatesFor(p.complaint, p.results)
            const solved = candidates.length === 1
            const open = prescribing === p.id

            return (
              <div
                key={p.id}
                style={{
                  ...panel.row,
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  ...(solved ? panel.rowReady : null),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={panel.rowArt}>
                    <FaceArt face={p.face} size={44} />
                  </div>
                  <div style={panel.rowBody}>
                    <div style={panel.rowTitle}>
                      Complains of {p.complaint}
                      {p.misses > 0 && <span style={panel.tagWarn}>{p.misses} WRONG</span>}
                    </div>
                    <div style={{ ...panel.rowNote, color: solved ? '#4f7a3a' : '#6b5a44' }}>
                      {solved
                        ? `must be ${candidates[0].label}`
                        : `could be ${candidates.map((c) => c.label).join(', ')}`}
                    </div>
                    {Object.keys(p.results).length > 0 && (
                      <div style={panel.rowNote}>
                        {(Object.entries(p.results) as [TestKey, boolean][])
                          .map(([k, v]) =>
                            `${TEST_BY_KEY[k].label.toLowerCase()}: ${v ? TEST_BY_KEY[k].positive : TEST_BY_KEY[k].negative}`
                          )
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={panel.rowActions}>
                    <button style={panel.smallButton} onClick={() => setPrescribing(open ? null : p.id)}>
                      {open ? 'Close' : 'Prescribe'}
                    </button>
                  </div>
                </div>

                {/* Tests: each one splits what is left. */}
                <div style={styles.testRow}>
                  {TESTS.map((t) => {
                    const known = p.results[t.key] !== undefined
                    const running = p.running?.test === t.key
                    const busy = !!p.running
                    return (
                      <button
                        key={t.key}
                        onClick={() => runTest(p, t.key)}
                        disabled={known || busy || solved}
                        style={{
                          ...styles.test,
                          opacity: known ? 0.45 : busy || solved ? 0.35 : 1,
                        }}
                        title={known ? 'Already known' : `${t.label} · ${t.cost} 🪙`}
                      >
                        <span style={styles.testLabel}>{t.label}</span>
                        <span style={styles.testMeta}>
                          {running
                            ? formatSecs(p.running!.doneAt - now)
                            : known
                              ? '✓'
                              : `${t.cost} 🪙`}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {open && (
                  <div style={styles.tray}>
                    {REMEDIES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => prescribe(p, r.id)}
                        style={styles.remedy}
                        title={r.label}
                      >
                        <RemedyArt id={r.id} size={28} />
                        <span style={styles.remedyLabel}>{REMEDY_BY_ID[r.id].label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {tab === 'rooms' && (
        <>
          <p style={panel.hint}>
            A faster kit shortens every test; a bigger practice seats more people and fills sooner.
          </p>
          <UpgradeRow
            title={kit.label}
            note={nextKit ? `next: ${nextKit.label} · ${nextKit.blurb}` : 'nothing left to buy 🎉'}
            cost={nextKit?.cost}
            coins={coins}
            onBuy={() => upgrade('kit')}
          />
          <UpgradeRow
            title={clinic.label}
            note={nextClinic ? `next: ${nextClinic.label} · ${nextClinic.blurb}` : 'the finest practice for miles 🎉'}
            cost={nextClinic?.cost}
            coins={coins}
            onBuy={() => upgrade('clinic')}
          />

          <div style={panel.sectionLabel}>What the tests tell you</div>
          {TESTS.map((t) => (
            <div key={t.key} style={panel.row}>
              <div style={panel.rowBody}>
                <div style={panel.rowTitle}>{t.label}</div>
                <div style={panel.rowNote}>
                  reads {t.positive} or {t.negative} &middot; {t.cost} 🪙 &middot;{' '}
                  {formatSecs(t.ms * kit.speedMult)}
                </div>
              </div>
            </div>
          ))}
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
  testRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 8 },
  test: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '5px 2px',
    border: 'none',
    borderRadius: 7,
    background: '#e8eef2',
    cursor: 'pointer',
  },
  testLabel: { fontSize: 8.5, color: '#3a4a55', textAlign: 'center', lineHeight: 1.1 },
  testMeta: { fontSize: 8.5, color: '#6b7a85', fontWeight: 700 },
  tray: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
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
}
