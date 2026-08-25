import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { usePurse } from '../../state/usePurse'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { PotteryArt } from './PotteryArt'
import { ITEMS, ITEM_ORDER, priceOf } from '../../economy/items'
import {
  CLAY_REGEN_MS,
  FORMS,
  SPADES,
  STUDIOS,
  WEDGE_MS,
  clayAvailable,
  initialPottery,
  nextClayIn,
  spadeOf,
  spendClay,
  studioOf,
  type PotterySave,
} from './potteryData'
import { panel } from '../farm/farmStyles'

/**
 * Riverside pottery: dig clay out of the bank, wedge the grit out of it,
 * then throw and fire it into something worth selling.
 *
 * Like the pond, the studio is self-contained - it sells its own wares
 * and buys its own tools. It shares the homestead's purse and crate, but
 * you never have to walk to the farm to finish a pot.
 *
 * The clay bank refills on a timer rather than being bottomless, so the
 * river paces the digging. Everything durable is a timestamp, so the bank
 * keeps filling and kilns keep firing while the game is closed.
 */

type Tab = 'dig' | 'wedge' | 'throw' | 'wares'

const PATCH_COUNT = 6

export function PotteryMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<PotterySave>('pottery', initialPottery)
  const { coins, earn, spend } = usePurse('pottery')
  const inventory = useHomesteadStore((s) => s.inventory)
  const addItem = useHomesteadStore((s) => s.addItem)
  const takeItems = useHomesteadStore((s) => s.takeItems)

  const [tab, setTab] = useState<Tab>('dig')
  const [toast, setToast] = useState<string | null>(null)
  /** Which patches were just dug, so they can look disturbed for a beat. */
  const [dug, setDug] = useState<Record<number, number>>({})
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const now = Date.now()
  const spade = spadeOf(save)
  const studio = studioOf(save)
  const available = clayAvailable(save, now)
  const wedging = save.wedging ?? []
  const throwing = save.throwing ?? []
  const busy = wedging.length + throwing.length
  const freeSlots = Math.max(0, studio.capacity - busy)

  useEffect(() => {
    const interval = window.setInterval(() => {
      repaint((n) => n + 1)
      setDug((prev) => {
        const t = Date.now()
        const next = Object.fromEntries(Object.entries(prev).filter(([, at]) => t - at < 1400))
        return Object.keys(next).length === Object.keys(prev).length ? prev : next
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1500)
  }

  // Collect finished wedging and firing.
  useEffect(() => {
    const doneWedges = wedging.filter((at) => now >= at).length
    const doneThrows = throwing.filter((t) => now >= t.doneAt)
    if (!doneWedges && !doneThrows.length) return

    setSave((s) => ({
      ...s,
      wedging: (s.wedging ?? []).filter((at) => Date.now() < at),
      throwing: (s.throwing ?? []).filter((t) => Date.now() < t.doneAt),
    }))
    if (doneWedges) addItem('wedged clay', doneWedges)
    for (const t of doneThrows) addItem(t.formId, 1)

    const parts: string[] = []
    if (doneWedges) parts.push(`${doneWedges} clay wedged`)
    if (doneThrows.length) parts.push(`${doneThrows.length} piece${doneThrows.length > 1 ? 's' : ''} out of the kiln`)
    showToast(parts.join(' · '))
  }, [wedging, throwing, now, setSave, addItem])

  function dig(patch: number) {
    if (available <= 0) {
      showToast('The bank is dug out - give the river a while.')
      return
    }
    const rich = Math.random() < spade.richChance
    const yieldAmount = rich ? 2 : 1
    setSave((s) => ({ ...s, bankAt: spendClay(s, 1, Date.now()) }))
    addItem('river clay', yieldAmount)
    setDug((d) => ({ ...d, [patch]: Date.now() }))
    showToast(rich ? '✨ A rich seam! +2 river clay' : '+1 river clay')
  }

  function startWedge() {
    if (freeSlots <= 0) {
      showToast('No room at the bench - upgrade the studio.')
      return
    }
    if (!takeItems({ 'river clay': 1 })) {
      showToast('No river clay. Go dig some.')
      return
    }
    setSave((s) => ({
      ...s,
      wedging: [...(s.wedging ?? []), Date.now() + WEDGE_MS * studio.speedMult],
    }))
    showToast('Wedging...')
  }

  function startThrow(formId: string) {
    const form = FORMS.find((f) => f.id === formId)
    if (!form) return
    if (freeSlots <= 0) {
      showToast('The wheel is busy - upgrade the studio.')
      return
    }
    if (!takeItems({ 'wedged clay': form.clay })) return
    setSave((s) => ({
      ...s,
      throwing: [
        ...(s.throwing ?? []),
        { formId, doneAt: Date.now() + form.throwMs * studio.speedMult },
      ],
    }))
    showToast(`Throwing a ${form.label.toLowerCase()}...`)
  }

  function upgradeSpade() {
    const next = SPADES[(save.spadeLevel ?? 0) + 1]
    if (!next || !spend(next.cost)) return
    setSave((s) => ({ ...s, spadeLevel: (s.spadeLevel ?? 0) + 1 }))
    showToast(`Now digging with a ${next.label.toLowerCase()}`)
  }

  function upgradeStudio() {
    const next = STUDIOS[(save.studioLevel ?? 0) + 1]
    if (!next || !spend(next.cost)) return
    setSave((s) => ({ ...s, studioLevel: (s.studioLevel ?? 0) + 1 }))
    showToast(`Studio: ${next.label}`)
  }

  // Only finished pieces sell here; raw and wedged clay are stock, not wares.
  const wares = ITEM_ORDER.filter(
    (key) =>
      (inventory[key] ?? 0) > 0 &&
      ITEMS[key]?.category === 'craft' &&
      key !== 'river clay' &&
      key !== 'wedged clay'
  )
  const waresValue = wares.reduce((sum, k) => sum + priceOf(k) * (inventory[k] ?? 0), 0)

  function sellWares() {
    if (!waresValue) return
    const batch = Object.fromEntries(wares.map((k) => [k, inventory[k] ?? 0]))
    if (!takeItems(batch)) return
    earn(waresValue)
    showToast(`Sold your wares for ${waresValue} 🪙`)
  }

  const nextSpade = SPADES[(save.spadeLevel ?? 0) + 1]
  const nextStudio = STUDIOS[(save.studioLevel ?? 0) + 1]
  const readyWedges = wedging.filter((at) => now >= at).length
  const readyThrows = throwing.filter((t) => now >= t.doneAt).length

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'dig', label: 'Riverbank', badge: available },
    { key: 'wedge', label: 'Wedge', badge: readyWedges },
    { key: 'throw', label: 'Wheel', badge: readyThrows },
    { key: 'wares', label: 'Wares' },
  ]

  return (
    <div style={panel.wrap}>
      <style>{keyframes}</style>

      <div style={panel.header}>
        <h2 style={panel.title}>Pottery</h2>
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

      {tab === 'dig' && (
        <>
          <div style={panel.subhead}>
            <span>
              {spade.label} &middot; {available}/{spade.bankCap} clay in the bank
            </span>
            <span style={panel.rowNote}>
              {available >= spade.bankCap ? 'bank full' : `+1 in ${formatSecs(nextClayIn(save, now))}`}
            </span>
          </div>

          <p style={panel.hint}>Dig the wet patches along the waterline.</p>

          <div style={styles.bank}>
            {Array.from({ length: PATCH_COUNT }, (_, i) => {
              const spent = !!dug[i]
              return (
                <button
                  key={i}
                  onClick={() => dig(i)}
                  style={{
                    ...styles.patch,
                    background: spent ? '#5f5145' : available > 0 ? '#7d6a58' : '#6b6156',
                    opacity: available > 0 || spent ? 1 : 0.55,
                    animation: available > 0 && !spent ? 'wetShine 2.4s ease-in-out infinite' : undefined,
                  }}
                  title={available > 0 ? 'Dig' : 'Dug out'}
                >
                  {spent ? <span style={styles.hole}>◕</span> : <PotteryArt subject="river clay" size={34} />}
                </button>
              )
            })}
          </div>

          <div style={{ ...panel.row, marginTop: 8 }}>
            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>{spade.label}</div>
              <div style={panel.rowNote}>
                {nextSpade ? `next: ${nextSpade.label} · ${nextSpade.blurb}` : 'best tool on the bank 🎉'}
              </div>
            </div>
            <div style={panel.rowActions}>
              {nextSpade && (
                <button
                  style={{ ...panel.darkButton, opacity: coins >= nextSpade.cost ? 1 : 0.4 }}
                  onClick={upgradeSpade}
                  disabled={coins < nextSpade.cost}
                >
                  {nextSpade.cost} 🪙
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'wedge' && (
        <>
          <div style={panel.subhead}>
            <span>
              {studio.label} &middot; {busy}/{studio.capacity} benches busy
            </span>
          </div>

          <p style={panel.hint}>
            River clay is full of grit. Wedging it makes clay you can actually throw.
          </p>

          <div style={panel.row}>
            <div style={panel.rowArt}>
              <PotteryArt subject="river clay" size={40} />
            </div>
            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>Wedge a lump</div>
              <div style={panel.rowNote}>
                1 river clay &rarr; 1 wedged clay &middot; {formatSecs(WEDGE_MS * studio.speedMult)}
              </div>
              <div style={panel.rowNote}>
                you have {inventory['river clay'] ?? 0} river &middot; {inventory['wedged clay'] ?? 0} wedged
              </div>
            </div>
            <div style={panel.rowActions}>
              <button
                style={{
                  ...panel.smallButton,
                  opacity: (inventory['river clay'] ?? 0) > 0 && freeSlots > 0 ? 1 : 0.35,
                }}
                onClick={startWedge}
                disabled={(inventory['river clay'] ?? 0) <= 0 || freeSlots <= 0}
              >
                Wedge
              </button>
            </div>
          </div>

          {wedging.map((at, i) => (
            <div key={i} style={{ ...panel.row, ...panel.rowReady }}>
              <div style={panel.rowArt}>
                <PotteryArt subject="wedged clay" size={38} />
              </div>
              <div style={panel.rowBody}>
                <div style={panel.rowTitle}>Wedging</div>
                <div style={panel.rowNote}>ready in {formatSecs(at - now)}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'throw' && (
        <>
          <div style={panel.subhead}>
            <span>
              {studio.label} &middot; {busy}/{studio.capacity} in use
            </span>
            <span style={panel.rowNote}>{inventory['wedged clay'] ?? 0} wedged clay</span>
          </div>

          {throwing.map((t, i) => {
            const form = FORMS.find((f) => f.id === t.formId)
            return (
              <div key={i} style={{ ...panel.row, ...panel.rowReady }}>
                <div style={panel.rowArt}>
                  <PotteryArt subject={t.formId} size={40} />
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>{form?.label}</div>
                  <div style={panel.rowNote}>out of the kiln in {formatSecs(t.doneAt - now)}</div>
                </div>
              </div>
            )
          })}

          {FORMS.map((form) => {
            const locked = (save.studioLevel ?? 0) < form.unlockLevel
            const haveClay = (inventory['wedged clay'] ?? 0) >= form.clay
            const canThrow = !locked && haveClay && freeSlots > 0
            return (
              <div key={form.id} style={panel.row}>
                <div style={panel.rowArt}>
                  <div style={{ opacity: locked ? 0.3 : 1 }}>
                    <PotteryArt subject={form.id} size={42} />
                  </div>
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>{form.label}</div>
                  <div style={{ ...panel.rowNote, color: !locked && !haveClay ? '#b5563f' : '#6b5a44' }}>
                    {form.clay} wedged clay &middot; {formatSecs(form.throwMs * studio.speedMult)}
                  </div>
                  <div style={panel.rowNote}>
                    {locked ? `needs ${STUDIOS[form.unlockLevel].label}` : `sells for ${priceOf(form.id)} 🪙`}
                  </div>
                </div>
                <div style={panel.rowActions}>
                  <button
                    style={{ ...panel.smallButton, opacity: canThrow ? 1 : 0.35 }}
                    onClick={() => startThrow(form.id)}
                    disabled={!canThrow}
                  >
                    {locked ? 'Locked' : 'Throw'}
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'wares' && (
        <>
          {wares.length === 0 && <p style={panel.empty}>Nothing fired yet. Get something on the wheel.</p>}

          {wares.map((key) => (
            <div key={key} style={panel.row}>
              <div style={panel.rowArt}>
                <PotteryArt subject={key} size={40} />
              </div>
              <div style={panel.rowBody}>
                <div style={panel.rowTitle}>
                  {ITEMS[key].label} &times;{inventory[key]}
                </div>
                <div style={panel.rowNote}>
                  {priceOf(key)} 🪙 each &middot; {priceOf(key) * (inventory[key] ?? 0)} total
                </div>
              </div>
            </div>
          ))}

          {waresValue > 0 && (
            <button style={{ ...panel.button, width: '100%' }} onClick={sellWares}>
              Sell wares &middot; {waresValue} 🪙
            </button>
          )}

          <div style={panel.sectionLabel}>Studio</div>
          <div style={panel.row}>
            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>{studio.label}</div>
              <div style={panel.rowNote}>
                {studio.capacity} at once &middot; unlocks forms as it grows
              </div>
              {nextStudio ? (
                <div style={panel.rowNote}>
                  next: {nextStudio.label} &middot; {nextStudio.blurb}
                </div>
              ) : (
                <div style={panel.rowNote}>the finest studio on the river 🎉</div>
              )}
            </div>
            <div style={panel.rowActions}>
              {nextStudio && (
                <button
                  style={{ ...panel.darkButton, opacity: coins >= nextStudio.cost ? 1 : 0.4 }}
                  onClick={upgradeStudio}
                  disabled={coins < nextStudio.cost}
                >
                  {nextStudio.cost} 🪙
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <button style={panel.exitButton} onClick={onExit}>
        Leave the riverbank
      </button>
    </div>
  )
}

const keyframes = `
@keyframes wetShine {
  0%, 100% { box-shadow: inset 0 0 0 0 rgba(120, 190, 220, 0); }
  50% { box-shadow: inset 0 0 14px 2px rgba(120, 190, 220, 0.35); }
}
`

function formatSecs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

/** Re-exported so the registry can import the badge helper alongside. */
export { CLAY_REGEN_MS }

const styles: Record<string, React.CSSProperties> = {
  tabs: { display: 'flex', gap: 4 },
  tab: {
    flex: 1,
    padding: '7px 4px',
    fontSize: 12,
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
  bank: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    background: 'linear-gradient(180deg, #3f7fbf 0%, #55707a 45%, #6b5a48 100%)',
  },
  patch: {
    aspectRatio: '1.3',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  hole: { fontSize: 20, color: '#3f372e' },
}
