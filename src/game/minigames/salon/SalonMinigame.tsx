import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { SalonArt } from './SalonArt'
import {
  COAT_BY_KEY,
  FRETFUL_AT,
  KITS,
  SALONS,
  STEPS,
  STEP_BY_KEY,
  TREATS,
  blockedBy,
  initialSalon,
  isFinished,
  kitOf,
  makePet,
  nextArrivalDue,
  payoutFor,
  salonOf,
  stepDuration,
  stepReady,
  treatOf,
  type SalonPet,
  type SalonSave,
  type StepKey,
} from './salonData'
import { panel } from '../farm/farmStyles'

/**
 * The pet salon: groom in a sensible order, and keep the animal calm
 * enough to sit still.
 *
 * The order is forgiving - a step that is not ready explains why and
 * costs nothing, so the rules teach themselves. The anxiety bar is the
 * real decision: every step winds them up, a fretting animal takes twice
 * as long to work on, and soothing spends time you could have groomed
 * with. The tip depends on how calm they leave, so hurrying is allowed
 * and rarely pays best.
 */

type Tab = 'salon' | 'shop'

export function SalonMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<SalonSave>('salon', initialSalon)
  const { coins, earn, spend } = usePurse('salon')

  const [tab, setTab] = useState<Tab>('salon')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const now = Date.now()
  const kit = kitOf(save)
  const treat = treatOf(save)
  const salon = salonOf(save)
  const pets = save.pets ?? []

  useEffect(() => {
    const interval = window.setInterval(() => repaint((n) => n + 1), 500)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 2200)
  }

  // Land finished work and admit arrivals. Pets only leave when groomed.
  useEffect(() => {
    const t = Date.now()
    const workDone = pets.some((p) => p.busy && t >= p.busy.doneAt)
    const roomFree = pets.length < salon.chairs
    const due = t >= nextArrivalDue(save, t)
    if (!workDone && !(roomFree && due)) return

    setSave((s) => {
      let next = (s.pets ?? []).map((p) => {
        if (!p.busy || Date.now() < p.busy.doneAt) return p
        if (p.busy.step === 'soothe') {
          return { ...p, anxiety: Math.max(0, p.anxiety - treatOf(s).calm), busy: undefined }
        }
        const step = STEP_BY_KEY[p.busy.step]
        return {
          ...p,
          done: [...p.done, p.busy.step as StepKey],
          anxiety: Math.min(100, p.anxiety + step.anxiety),
          busy: undefined,
        }
      })

      let nextId = s.nextId ?? 1
      let arrival = nextArrivalDue(s, Date.now())
      if (Date.now() >= arrival && next.length < salonOf(s).chairs) {
        next = [...next, makePet(nextId++, Date.now())]
        arrival = Date.now() + salonOf(s).arrivalMs
      }
      return { ...s, pets: next, nextId, nextArrivalAt: arrival }
    })
  }, [pets, now, save.nextArrivalAt, salon.chairs, setSave])

  function doStep(pet: SalonPet, key: StepKey) {
    if (pet.busy) return
    const needs = COAT_BY_KEY[pet.coat]?.needs ?? []
    if (!needs.includes(key)) {
      showToast(`A ${COAT_BY_KEY[pet.coat]?.label.toLowerCase()} does not need that.`)
      return
    }
    if (pet.done.includes(key)) return
    if (!stepReady(key, needs, pet.done)) {
      const blocker = blockedBy(key, needs, pet.done)
      // Explain rather than punish - the ordering rules teach themselves.
      showToast(STEP_BY_KEY[key].tooEarly || `Do the ${blocker} first.`)
      return
    }
    const ms = stepDuration(STEP_BY_KEY[key].ms, pet.anxiety, kit.speedMult)
    setSave((s) => ({
      ...s,
      pets: (s.pets ?? []).map((p) =>
        p.id === pet.id ? { ...p, busy: { step: key, doneAt: Date.now() + ms } } : p
      ),
    }))
  }

  function soothe(pet: SalonPet) {
    if (pet.busy) return
    setSave((s) => ({
      ...s,
      pets: (s.pets ?? []).map((p) =>
        p.id === pet.id
          ? { ...p, busy: { step: 'soothe' as const, doneAt: Date.now() + treatOf(s).ms } }
          : p
      ),
    }))
  }

  function finish(pet: SalonPet) {
    const { fee, tip } = payoutFor(pet)
    setSave((s) => ({
      ...s,
      pets: (s.pets ?? []).filter((p) => p.id !== pet.id),
      groomed: (s.groomed ?? 0) + 1,
    }))
    earn(fee + tip)
    showToast(
      tip > 0
        ? `${pet.name} looks lovely · ${fee} 🪙 + ${tip} tip`
        : `${pet.name} is done · ${fee} 🪙 (too rattled to tip)`
    )
  }

  function upgrade(kind: 'kit' | 'treat' | 'salon') {
    const list = kind === 'kit' ? KITS : kind === 'treat' ? TREATS : SALONS
    const key = kind === 'kit' ? 'kitLevel' : kind === 'treat' ? 'treatLevel' : 'salonLevel'
    const current = (save[key as keyof SalonSave] as number) ?? 0
    const next = list[current + 1]
    if (!next || !spend(next.cost)) return
    setSave((s) => ({ ...s, [key]: current + 1 }))
    showToast(`Now: ${next.label}`)
  }

  const nextKit = KITS[(save.kitLevel ?? 0) + 1]
  const nextTreat = TREATS[(save.treatLevel ?? 0) + 1]
  const nextSalon = SALONS[(save.salonLevel ?? 0) + 1]
  const idle = pets.filter((p) => !p.busy || now >= p.busy.doneAt).length

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'salon', label: 'Salon', badge: idle },
    { key: 'shop', label: 'Equipment' },
  ]

  return (
    <div style={panel.wrap}>
      <div style={panel.header}>
        <h2 style={panel.title}>Pet Salon</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <GiftRow from="salon" />

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

      {tab === 'salon' && (
        <>
          <div style={panel.subhead}>
            <span>
              {salon.label} &middot; {pets.length}/{salon.chairs} chairs
            </span>
            <span style={panel.rowNote}>{save.groomed ?? 0} groomed</span>
          </div>

          {pets.length === 0 && (
            <p style={panel.empty}>
              Nobody booked in. Next along in {formatSecs(nextArrivalDue(save, now) - now)}.
            </p>
          )}

          {pets.map((p) => {
            const coat = COAT_BY_KEY[p.coat]
            const needs = coat?.needs ?? []
            const busy = p.busy && now < p.busy.doneAt ? p.busy : undefined
            const finished = isFinished(p)
            const fretting = p.anxiety >= FRETFUL_AT
            const { fee, tip } = payoutFor(p)

            return (
              <div
                key={p.id}
                style={{
                  ...panel.row,
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  ...(finished ? panel.rowReady : fretting ? panel.rowAlert : null),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={panel.rowArt}>
                    <SalonArt subject={p.kind} size={46} />
                  </div>
                  <div style={panel.rowBody}>
                    <div style={panel.rowTitle}>
                      {p.name}
                      <span style={panel.rowNote}>&middot; {coat?.label.toLowerCase()}</span>
                      {fretting && <span style={panel.tagWarn}>FRETTING</span>}
                    </div>
                    <div style={panel.rowNote}>
                      {busy
                        ? `${busy.step === 'soothe' ? 'Settling them' : STEP_BY_KEY[busy.step as StepKey].label}... ${formatSecs(busy.doneAt - now)}`
                        : finished
                          ? `all done · ${fee} 🪙 + ${tip} tip`
                          : `${p.done.length}/${needs.length} done`}
                    </div>
                    <div style={styles.calmRow}>
                      <span style={styles.calmLabel}>calm</span>
                      <div style={panel.barTrackThin}>
                        <div
                          style={{
                            ...panel.barFill,
                            width: `${100 - p.anxiety}%`,
                            background: fretting ? '#d9534f' : '#5cb8e0',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={panel.rowActions}>
                    {finished ? (
                      <button style={panel.smallButton} onClick={() => finish(p)}>
                        Finish
                      </button>
                    ) : (
                      <button
                        style={{ ...panel.smallButton, background: '#d9587f', opacity: busy ? 0.35 : 1 }}
                        onClick={() => soothe(p)}
                        disabled={!!busy}
                      >
                        Soothe
                      </button>
                    )}
                  </div>
                </div>

                {!finished && (
                  <div style={styles.stepRow}>
                    {STEPS.filter((s) => needs.includes(s.key)).map((s) => {
                      const done = p.done.includes(s.key)
                      const ready = stepReady(s.key, needs, p.done)
                      return (
                        <button
                          key={s.key}
                          onClick={() => doStep(p, s.key)}
                          disabled={!!busy || done}
                          style={{
                            ...styles.step,
                            ...(done ? styles.stepDone : ready ? styles.stepReady : null),
                            opacity: busy ? 0.4 : 1,
                          }}
                          title={done ? 'Done' : ready ? s.label : 'Not yet'}
                        >
                          <SalonArt subject={s.key} size={24} />
                          <span style={styles.stepLabel}>{s.label}</span>
                          <span style={styles.stepMeta}>{done ? '✓' : ready ? '●' : '·'}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {tab === 'shop' && (
        <>
          <p style={panel.hint}>
            A fretting pet takes about twice as long to work on, so calming them is time well spent.
          </p>
          <UpgradeRow
            title={kit.label}
            note={nextKit ? `next: ${nextKit.label} · ${nextKit.blurb}` : 'every tool you could want 🎉'}
            cost={nextKit?.cost}
            coins={coins}
            onBuy={() => upgrade('kit')}
          />
          <UpgradeRow
            title={`${treat.label} · calms ${treat.calm}`}
            note={nextTreat ? `next: ${nextTreat.label} · ${nextTreat.blurb}` : 'nothing calms them faster 🎉'}
            cost={nextTreat?.cost}
            coins={coins}
            onBuy={() => upgrade('treat')}
          />
          <UpgradeRow
            title={salon.label}
            note={nextSalon ? `next: ${nextSalon.label} · ${nextSalon.blurb}` : 'the finest parlour in the county 🎉'}
            cost={nextSalon?.cost}
            coins={coins}
            onBuy={() => upgrade('salon')}
          />

          <div style={panel.sectionLabel}>The order of things</div>
          <p style={panel.rowNote}>
            De-mat before brushing, brush before the bath, dry before clipping, ribbon last.
            Nails whenever suits. Anything out of turn just tells you why.
          </p>
        </>
      )}

      <button style={panel.exitButton} onClick={onExit}>
        Leave the salon
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
  calmRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 },
  calmLabel: { fontSize: 9, color: '#8a7a63', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 3,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed #d6c7a4',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    padding: '5px 1px',
    border: 'none',
    borderRadius: 6,
    background: '#fdf6e3',
    cursor: 'pointer',
  },
  stepReady: { background: '#e6efd4' },
  stepDone: { background: '#dfe8ee' },
  stepLabel: { fontSize: 8, color: '#3a2e1f', lineHeight: 1.1 },
  stepMeta: { fontSize: 8, color: '#6b5a44', fontWeight: 700 },
}
