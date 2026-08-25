import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { usePurse } from '../../state/usePurse'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { WoodArt } from './WoodArt'
import { ITEMS, priceOf } from '../../economy/items'
import {
  AXES,
  CARTS,
  PRODUCTS,
  REGROW_MS,
  SHOPS,
  SPECIES,
  SPECIES_ORDER,
  axeOf,
  cartOf,
  initialLumber,
  logKey,
  rollSpecies,
  shopOf,
  stumpTotal,
  type JobKind,
  type LumberSave,
  type SpeciesKey,
} from './lumberData'
import { panel } from '../farm/farmStyles'

/**
 * The woodlot. Fell trees in the stand, haul the logs home, then send
 * them either to the fire or to the bench.
 *
 * Hauling is what keeps this from being a click-for-wood button: felled
 * logs sit at the stumps and a trip only carries so many, so the loop is
 * chop, chop, carry, chop. The stack at the stumps is capped too, which
 * is what makes the cart worth upgrading before the axe.
 *
 * Self-contained like the pond and the clay bank - it sells its own goods
 * and buys its own tools, sharing only the purse and the crate.
 */

type Tab = 'stand' | 'fire' | 'bench' | 'wares'

export function LumberMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<LumberSave>('lumber', initialLumber)
  const { coins, earn, spend } = usePurse('lumber')
  const inventory = useHomesteadStore((s) => s.inventory)
  const addItem = useHomesteadStore((s) => s.addItem)
  const takeItems = useHomesteadStore((s) => s.takeItems)

  const [tab, setTab] = useState<Tab>('stand')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const now = Date.now()
  const axe = axeOf(save)
  const cart = cartOf(save)
  const shop = shopOf(save)
  const trees = save.trees ?? []
  const jobs = save.jobs ?? []
  const stump = stumpTotal(save)
  const freeSlots = Math.max(0, shop.capacity - jobs.length)

  useEffect(() => {
    const interval = window.setInterval(() => repaint((n) => n + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1600)
  }

  // Collect finished burning and carving.
  useEffect(() => {
    const done = jobs.filter((j) => now >= j.doneAt)
    if (!done.length) return
    setSave((s) => ({ ...s, jobs: (s.jobs ?? []).filter((j) => Date.now() < j.doneAt) }))
    for (const j of done) addItem(j.productId, 1)
    showToast(done.length === 1 ? 'A piece is finished!' : `${done.length} pieces finished!`)
  }, [jobs, now, setSave, addItem])

  function fell(index: number) {
    const tree = trees[index]
    if (!tree || now < tree.readyAt) return
    const species = SPECIES[tree.species]
    if (species.hardness > axe.reach) {
      showToast(`${species.label} is too hard for a ${axe.label.toLowerCase()}.`)
      return
    }
    if (stump >= cart.stumpCap) {
      showToast('Nowhere left to stack it - haul what you have first.')
      return
    }
    const won = Math.min(axe.logsPerTree, cart.stumpCap - stump)
    setSave((s) => ({
      ...s,
      trees: (s.trees ?? []).map((t, i) =>
        i === index ? { species: rollSpecies(), readyAt: Date.now() + REGROW_MS } : t
      ),
      atStump: { ...(s.atStump ?? {}), [tree.species]: ((s.atStump ?? {})[tree.species] ?? 0) + won },
    }))
    showToast(`Felled ${species.label.toLowerCase()} · +${won} log${won > 1 ? 's' : ''} at the stumps`)
  }

  function haul() {
    if (stump <= 0) return
    // Carry the heaviest woods first - a trip should bring back the best of
    // what is lying there, not whatever happens to be alphabetically first.
    const order = [...SPECIES_ORDER].sort((a, b) => SPECIES[b].price - SPECIES[a].price)
    const carried: Partial<Record<SpeciesKey, number>> = {}
    let room = cart.load
    for (const sp of order) {
      if (room <= 0) break
      const have = save.atStump?.[sp] ?? 0
      const take = Math.min(have, room)
      if (take > 0) {
        carried[sp] = take
        room -= take
      }
    }
    const total = Object.values(carried).reduce((n, v) => n + (v ?? 0), 0)
    if (!total) return

    setSave((s) => {
      const next = { ...(s.atStump ?? {}) }
      for (const [sp, n] of Object.entries(carried)) {
        next[sp as SpeciesKey] = (next[sp as SpeciesKey] ?? 0) - (n ?? 0)
        if (!next[sp as SpeciesKey]) delete next[sp as SpeciesKey]
      }
      return { ...s, atStump: next }
    })
    for (const [sp, n] of Object.entries(carried)) addItem(logKey(sp as SpeciesKey), n ?? 0)
    showToast(`Hauled ${total} log${total > 1 ? 's' : ''} home`)
  }

  function start(productId: string) {
    const product = PRODUCTS.find((p) => p.id === productId)
    if (!product) return
    if (freeSlots <= 0) {
      showToast('Everything is busy - upgrade the shop.')
      return
    }
    const { species, count } = product.needs
    if (species === 'any') {
      // Spend the cheapest wood on hand first; good timber is for carving.
      const order = [...SPECIES_ORDER].sort((a, b) => SPECIES[a].price - SPECIES[b].price)
      const batch: Record<string, number> = {}
      let need = count
      for (const sp of order) {
        if (need <= 0) break
        const have = inventory[logKey(sp)] ?? 0
        const take = Math.min(have, need)
        if (take > 0) {
          batch[logKey(sp)] = take
          need -= take
        }
      }
      if (need > 0) {
        showToast(`Need ${count} logs.`)
        return
      }
      if (!takeItems(batch)) return
    } else {
      if (!takeItems({ [logKey(species)]: count })) {
        showToast(`Need ${count} ${species} logs.`)
        return
      }
    }
    setSave((s) => ({
      ...s,
      jobs: [...(s.jobs ?? []), { productId, doneAt: Date.now() + product.ms * shop.speedMult }],
    }))
    showToast(`Started: ${product.label}`)
  }

  function upgrade(kind: 'axe' | 'cart' | 'shop') {
    const list = kind === 'axe' ? AXES : kind === 'cart' ? CARTS : SHOPS
    const key = kind === 'axe' ? 'axeLevel' : kind === 'cart' ? 'cartLevel' : 'shopLevel'
    const current = (save[key as keyof LumberSave] as number) ?? 0
    const next = list[current + 1]
    if (!next || !spend(next.cost)) return
    setSave((s) => ({ ...s, [key]: current + 1 }))
    showToast(`Now: ${next.label}`)
  }

  function logsOnHand(species: SpeciesKey): number {
    return inventory[logKey(species)] ?? 0
  }
  function anyLogs(): number {
    return SPECIES_ORDER.reduce((n, sp) => n + logsOnHand(sp), 0)
  }
  function canAfford(p: (typeof PRODUCTS)[number]): boolean {
    const { species, count } = p.needs
    return species === 'any' ? anyLogs() >= count : logsOnHand(species) >= count
  }

  // Finished goods only; logs are stock, not wares.
  const wares = PRODUCTS.map((p) => p.id).filter((id) => (inventory[id] ?? 0) > 0)
  const waresValue = wares.reduce((sum, id) => sum + priceOf(id) * (inventory[id] ?? 0), 0)

  function sellWares() {
    if (!waresValue) return
    const batch = Object.fromEntries(wares.map((id) => [id, inventory[id] ?? 0]))
    if (!takeItems(batch)) return
    earn(waresValue)
    showToast(`Sold your goods for ${waresValue} 🪙`)
  }

  const standing = trees.filter((t) => now >= t.readyAt).length
  const doneJobs = jobs.filter((j) => now >= j.doneAt).length
  const nextAxe = AXES[(save.axeLevel ?? 0) + 1]
  const nextCart = CARTS[(save.cartLevel ?? 0) + 1]
  const nextShop = SHOPS[(save.shopLevel ?? 0) + 1]

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'stand', label: 'Stand', badge: standing },
    { key: 'fire', label: 'Fire' },
    { key: 'bench', label: 'Bench' },
    { key: 'wares', label: 'Goods', badge: doneJobs },
  ]

  return (
    <div style={panel.wrap}>
      <style>{keyframes}</style>

      <div style={panel.header}>
        <h2 style={panel.title}>Woodlot</h2>
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

      {tab === 'stand' && (
        <>
          <div style={panel.subhead}>
            <span>
              {axe.label} &middot; {cart.label}
            </span>
            <span style={panel.rowNote}>
              {stump}/{cart.stumpCap} at the stumps
            </span>
          </div>

          <div style={styles.stand}>
            {trees.map((tree, i) => {
              const grown = now >= tree.readyAt
              const species = SPECIES[tree.species]
              const tooHard = species.hardness > axe.reach
              return (
                <button
                  key={i}
                  onClick={() => fell(i)}
                  style={{
                    ...styles.tree,
                    opacity: grown ? 1 : 0.4,
                    animation: grown && !tooHard ? 'sway 3.2s ease-in-out infinite' : undefined,
                  }}
                  title={grown ? (tooHard ? 'Too hard for this axe' : `Fell ${species.label}`) : 'Regrowing'}
                >
                  <span style={{ fontSize: 26 }}>{grown ? '🌲' : '🌱'}</span>
                  <span style={styles.treeLabel}>
                    {grown ? species.label : formatSecs(tree.readyAt - now)}
                  </span>
                  {grown && tooHard && <span style={styles.lock}>🔒</span>}
                </button>
              )
            })}
          </div>

          <button
            style={{ ...panel.button, width: '100%', opacity: stump > 0 ? 1 : 0.4 }}
            onClick={haul}
            disabled={stump <= 0}
          >
            Haul home &middot; {Math.min(stump, cart.load)} of {stump} log{stump === 1 ? '' : 's'}
          </button>

          <div style={panel.sectionLabel}>Logs on hand</div>
          <div style={styles.logRow}>
            {SPECIES_ORDER.map((sp) => (
              <div key={sp} style={{ ...styles.logChip, opacity: logsOnHand(sp) ? 1 : 0.35 }}>
                <WoodArt subject={logKey(sp)} size={34} />
                <span style={styles.logCount}>
                  {SPECIES[sp].label} &times;{logsOnHand(sp)}
                </span>
              </div>
            ))}
          </div>

          <UpgradeRow
            title={axe.label}
            note={nextAxe ? `next: ${nextAxe.label} · ${nextAxe.blurb}` : 'the best axe in the shed 🎉'}
            cost={nextAxe?.cost}
            coins={coins}
            onBuy={() => upgrade('axe')}
          />
          <UpgradeRow
            title={cart.label}
            note={nextCart ? `next: ${nextCart.label} · ${nextCart.blurb}` : 'nothing hauls more 🎉'}
            cost={nextCart?.cost}
            coins={coins}
            onBuy={() => upgrade('cart')}
          />
        </>
      )}

      {(tab === 'fire' || tab === 'bench') && (
        <>
          <div style={panel.subhead}>
            <span>
              {shop.label} &middot; {jobs.length}/{shop.capacity} going
            </span>
            <span style={panel.rowNote}>{anyLogs()} logs on hand</span>
          </div>

          {jobs.map((j, i) => {
            const p = PRODUCTS.find((x) => x.id === j.productId)
            if (!p || p.kind !== (tab === 'fire' ? 'burn' : 'carve')) return null
            return (
              <div key={i} style={{ ...panel.row, ...panel.rowReady }}>
                <div style={panel.rowArt}>
                  <WoodArt subject={p.id} size={38} />
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>{p.label}</div>
                  <div style={panel.rowNote}>ready in {formatSecs(j.doneAt - now)}</div>
                </div>
              </div>
            )
          })}

          {PRODUCTS.filter((p) => p.kind === (tab === 'fire' ? 'burn' : ('carve' as JobKind))).map((p) => {
            const locked = (save.shopLevel ?? 0) < p.unlock
            const affordable = canAfford(p)
            const ready = !locked && affordable && freeSlots > 0
            const needLabel =
              p.needs.species === 'any'
                ? `${p.needs.count} logs (any)`
                : `${p.needs.count} ${p.needs.species} logs`
            return (
              <div key={p.id} style={panel.row}>
                <div style={panel.rowArt}>
                  <div style={{ opacity: locked ? 0.3 : 1 }}>
                    <WoodArt subject={p.id} size={42} />
                  </div>
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>{p.label}</div>
                  <div style={{ ...panel.rowNote, color: !locked && !affordable ? '#b5563f' : '#6b5a44' }}>
                    {needLabel} &middot; {formatSecs(p.ms * shop.speedMult)}
                  </div>
                  <div style={panel.rowNote}>
                    {locked ? `needs ${SHOPS[p.unlock].label}` : `${p.blurb} · ${priceOf(p.id)} 🪙`}
                  </div>
                </div>
                <div style={panel.rowActions}>
                  <button
                    style={{ ...panel.smallButton, opacity: ready ? 1 : 0.35 }}
                    onClick={() => start(p.id)}
                    disabled={!ready}
                  >
                    {locked ? 'Locked' : tab === 'fire' ? 'Burn' : 'Carve'}
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'wares' && (
        <>
          {wares.length === 0 && <p style={panel.empty}>Nothing finished yet. Light the fire or pick up a knife.</p>}

          {wares.map((id) => (
            <div key={id} style={panel.row}>
              <div style={panel.rowArt}>
                <WoodArt subject={id} size={40} />
              </div>
              <div style={panel.rowBody}>
                <div style={panel.rowTitle}>
                  {ITEMS[id]?.label ?? id} &times;{inventory[id]}
                </div>
                <div style={panel.rowNote}>
                  {priceOf(id)} 🪙 each &middot; {priceOf(id) * (inventory[id] ?? 0)} total
                </div>
              </div>
            </div>
          ))}

          {waresValue > 0 && (
            <button style={{ ...panel.button, width: '100%' }} onClick={sellWares}>
              Sell goods &middot; {waresValue} 🪙
            </button>
          )}

          <div style={panel.sectionLabel}>Workshop</div>
          <UpgradeRow
            title={shop.label}
            note={
              nextShop
                ? `next: ${nextShop.label} · ${nextShop.blurb}`
                : 'the finest workshop in the county 🎉'
            }
            cost={nextShop?.cost}
            coins={coins}
            onBuy={() => upgrade('shop')}
          />
        </>
      )}

      <button style={panel.exitButton} onClick={onExit}>
        Leave the woodlot
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

const keyframes = `
@keyframes sway {
  0%, 100% { transform: rotate(-1.5deg); }
  50% { transform: rotate(1.5deg); }
}
`

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
  stand: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    background: 'linear-gradient(180deg, #40603a 0%, #35502f 100%)',
    marginBottom: 8,
  },
  tree: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '8px 2px',
    border: 'none',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.08)',
    cursor: 'pointer',
    position: 'relative',
  },
  treeLabel: { fontSize: 10, color: '#e6efdc' },
  lock: { position: 'absolute', top: 3, right: 5, fontSize: 10 },
  logRow: { display: 'flex', gap: 4, justifyContent: 'space-between', flexWrap: 'wrap' },
  logChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1 },
  logCount: { fontSize: 9.5, color: '#6b5a44', whiteSpace: 'nowrap' },
}
