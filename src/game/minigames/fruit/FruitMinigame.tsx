import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { FruitArt } from './FruitArt'
import { priceOf } from '../../economy/items'
import {
  BAKERIES,
  BASKETS,
  FRUITS,
  FRUIT_BY_KEY,
  LADDERS,
  RECIPES,
  bakeryOf,
  basketOf,
  canReach,
  initialFruit,
  ladderOf,
  type FruitSave,
} from './fruitData'
import { panel } from '../farm/farmStyles'

/**
 * The orchard: pick fruit, then bake it.
 *
 * The ladder is the spine. Bushes are always pickable but cheap; every
 * tree is visible and explicitly out of reach until you have bought a
 * ladder tall enough, so the first stretch of the game is berries sold to
 * buy your way up into the branches.
 *
 * Self-contained like the pond, the clay bank and the woodlot - sells its
 * own fruit and bakes, buys its own ladders, sharing only purse and crate.
 */

type Tab = 'orchard' | 'bakery' | 'stall'

export function FruitMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<FruitSave>('fruit', initialFruit)
  const coins = useHomesteadStore((s) => s.coins)
  const inventory = useHomesteadStore((s) => s.inventory)
  const addItem = useHomesteadStore((s) => s.addItem)
  const earn = useHomesteadStore((s) => s.earn)
  const spend = useHomesteadStore((s) => s.spend)
  const takeItems = useHomesteadStore((s) => s.takeItems)

  const [tab, setTab] = useState<Tab>('orchard')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const now = Date.now()
  const ladder = ladderOf(save)
  const basket = basketOf(save)
  const bakery = bakeryOf(save)
  const plants = save.plants ?? []
  const bakes = save.bakes ?? []
  const freeOvens = Math.max(0, bakery.capacity - bakes.length)

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

  // Take anything out of the oven that has finished.
  useEffect(() => {
    const done = bakes.filter((b) => now >= b.doneAt)
    if (!done.length) return
    setSave((s) => ({ ...s, bakes: (s.bakes ?? []).filter((b) => Date.now() < b.doneAt) }))
    for (const b of done) addItem(b.recipeId, 1)
    showToast(done.length === 1 ? 'Out of the oven!' : `${done.length} bakes out of the oven!`)
  }, [bakes, now, setSave, addItem])

  function pick(index: number) {
    const plant = plants[index]
    if (!plant) return
    const fruit = FRUIT_BY_KEY[plant.fruit]
    if (!fruit) return
    if (!canReach(save, fruit)) {
      const needed = LADDERS.find((l) => l.reach >= fruit.reach)
      showToast(`Out of reach - you need the ${needed?.label ?? 'a taller ladder'}.`)
      return
    }
    if (now < plant.readyAt) return

    const got = fruit.yield + basket.bonus
    setSave((s) => ({
      ...s,
      plants: (s.plants ?? []).map((p, i) =>
        i === index ? { ...p, readyAt: Date.now() + fruit.regrowMs } : p
      ),
    }))
    addItem(fruit.key, got)
    showToast(`+${got} ${fruit.label.toLowerCase()}`)
  }

  function pickAll() {
    const ripe = plants
      .map((p, i) => ({ p, i, f: FRUIT_BY_KEY[p.fruit] }))
      .filter(({ p, f }) => f && canReach(save, f) && now >= p.readyAt)
    if (!ripe.length) return
    const idx = new Set(ripe.map(({ i }) => i))
    setSave((s) => ({
      ...s,
      plants: (s.plants ?? []).map((p, i) =>
        idx.has(i) ? { ...p, readyAt: Date.now() + (FRUIT_BY_KEY[p.fruit]?.regrowMs ?? 90_000) } : p
      ),
    }))
    let total = 0
    for (const { f } of ripe) {
      if (!f) continue
      const got = f.yield + basket.bonus
      addItem(f.key, got)
      total += got
    }
    showToast(`Picked ${total} fruit`)
  }

  function bake(recipeId: string) {
    const recipe = RECIPES.find((r) => r.id === recipeId)
    if (!recipe) return
    if (freeOvens <= 0) {
      showToast('The oven is full - upgrade the bakery.')
      return
    }
    const { fruit, count } = recipe.needs
    if (fruit === 'any') {
      // Spend the cheapest fruit first; good fruit is for the named bakes.
      const order = [...FRUITS].sort((a, b) => a.price - b.price)
      const batch: Record<string, number> = {}
      let need = count
      for (const f of order) {
        if (need <= 0) break
        const have = inventory[f.key] ?? 0
        const take = Math.min(have, need)
        if (take > 0) {
          batch[f.key] = take
          need -= take
        }
      }
      if (need > 0) {
        showToast(`Need ${count} fruit.`)
        return
      }
      if (!takeItems(batch)) return
    } else if (!takeItems({ [fruit]: count })) {
      showToast(`Need ${count} ${fruit}.`)
      return
    }
    setSave((s) => ({
      ...s,
      bakes: [...(s.bakes ?? []), { recipeId, doneAt: Date.now() + recipe.ms * bakery.speedMult }],
    }))
    showToast(`In the oven: ${recipe.label}`)
  }

  function upgrade(kind: 'ladder' | 'basket' | 'bakery') {
    const list = kind === 'ladder' ? LADDERS : kind === 'basket' ? BASKETS : BAKERIES
    const key = kind === 'ladder' ? 'ladderLevel' : kind === 'basket' ? 'basketLevel' : 'bakeryLevel'
    const current = (save[key as keyof FruitSave] as number) ?? 0
    const next = list[current + 1]
    if (!next || !spend(next.cost)) return
    setSave((s) => ({ ...s, [key]: current + 1 }))
    showToast(`Bought: ${next.label}`)
  }

  const anyFruit = FRUITS.reduce((n, f) => n + (inventory[f.key] ?? 0), 0)
  function haveFor(r: (typeof RECIPES)[number]): boolean {
    return r.needs.fruit === 'any'
      ? anyFruit >= r.needs.count
      : (inventory[r.needs.fruit] ?? 0) >= r.needs.count
  }

  // Fresh fruit and finished bakes both sell here - fresh sales are how you
  // afford the first ladder, so they cannot live behind it.
  const freshHeld = FRUITS.map((f) => f.key).filter((k) => (inventory[k] ?? 0) > 0)
  const bakedHeld = RECIPES.map((r) => r.id).filter((k) => (inventory[k] ?? 0) > 0)
  const freshValue = freshHeld.reduce((n, k) => n + priceOf(k) * (inventory[k] ?? 0), 0)
  const bakedValue = bakedHeld.reduce((n, k) => n + priceOf(k) * (inventory[k] ?? 0), 0)

  function sell(keys: string[], value: number, what: string) {
    if (!value) return
    const batch = Object.fromEntries(keys.map((k) => [k, inventory[k] ?? 0]))
    if (!takeItems(batch)) return
    earn(value)
    showToast(`Sold ${what} for ${value} 🪙`)
  }

  const ripeCount = plants.filter((p) => {
    const f = FRUIT_BY_KEY[p.fruit]
    return f && canReach(save, f) && now >= p.readyAt
  }).length
  const doneBakes = bakes.filter((b) => now >= b.doneAt).length

  const nextLadder = LADDERS[(save.ladderLevel ?? 0) + 1]
  const nextBasket = BASKETS[(save.basketLevel ?? 0) + 1]
  const nextBakery = BAKERIES[(save.bakeryLevel ?? 0) + 1]

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'orchard', label: 'Orchard', badge: ripeCount },
    { key: 'bakery', label: 'Bakery', badge: doneBakes },
    { key: 'stall', label: 'Stall' },
  ]

  const bushes = plants.map((p, i) => ({ p, i })).filter(({ p }) => FRUIT_BY_KEY[p.fruit]?.kind === 'bush')
  const trees = plants.map((p, i) => ({ p, i })).filter(({ p }) => FRUIT_BY_KEY[p.fruit]?.kind === 'tree')

  function plantTile({ p, i }: { p: (typeof plants)[number]; i: number }) {
    const f = FRUIT_BY_KEY[p.fruit]
    if (!f) return null
    const reachable = canReach(save, f)
    const ripe = now >= p.readyAt
    const pickable = reachable && ripe
    return (
      <button
        key={i}
        onClick={() => pick(i)}
        style={{
          ...styles.plant,
          opacity: reachable ? (ripe ? 1 : 0.5) : 0.4,
          animation: pickable ? 'ripe 2.2s ease-in-out infinite' : undefined,
        }}
        title={!reachable ? 'Out of reach' : ripe ? `Pick ${f.label}` : 'Ripening'}
      >
        <FruitArt subject={f.key} size={34} />
        <span style={styles.plantLabel}>
          {!reachable ? f.label : ripe ? f.label : formatSecs(p.readyAt - now)}
        </span>
        {!reachable && <span style={styles.lock}>🪜</span>}
      </button>
    )
  }

  return (
    <div style={panel.wrap}>
      <style>{keyframes}</style>

      <div style={panel.header}>
        <h2 style={panel.title}>Orchard</h2>
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

      {tab === 'orchard' && (
        <>
          <div style={panel.subhead}>
            <span>
              {ladder.label} &middot; {basket.label}
            </span>
            {ripeCount > 1 && (
              <button style={panel.smallButton} onClick={pickAll}>
                Pick all ({ripeCount})
              </button>
            )}
          </div>

          <div style={panel.sectionLabel}>Bushes</div>
          <div style={styles.grid}>{bushes.map(plantTile)}</div>

          <div style={panel.sectionLabel}>
            Trees {ladder.reach === 0 && <span style={styles.needLadder}>· need a ladder</span>}
          </div>
          <div style={styles.grid}>{trees.map(plantTile)}</div>

          <UpgradeRow
            title={ladder.label}
            note={
              nextLadder
                ? `next: ${nextLadder.label} · ${nextLadder.blurb}`
                : 'you can reach every branch 🎉'
            }
            cost={nextLadder?.cost}
            coins={coins}
            onBuy={() => upgrade('ladder')}
          />
          <UpgradeRow
            title={basket.label}
            note={nextBasket ? `next: ${nextBasket.label} · ${nextBasket.blurb}` : 'carries all you can pick 🎉'}
            cost={nextBasket?.cost}
            coins={coins}
            onBuy={() => upgrade('basket')}
          />
        </>
      )}

      {tab === 'bakery' && (
        <>
          <div style={panel.subhead}>
            <span>
              {bakery.label} &middot; {bakes.length}/{bakery.capacity} in the oven
            </span>
            <span style={panel.rowNote}>{anyFruit} fruit</span>
          </div>

          {bakes.map((b, i) => {
            const r = RECIPES.find((x) => x.id === b.recipeId)
            return (
              <div key={i} style={{ ...panel.row, ...panel.rowReady }}>
                <div style={panel.rowArt}>
                  <FruitArt subject={b.recipeId} size={38} />
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>{r?.label}</div>
                  <div style={panel.rowNote}>ready in {formatSecs(b.doneAt - now)}</div>
                </div>
              </div>
            )
          })}

          {RECIPES.map((r) => {
            const locked = (save.bakeryLevel ?? 0) < r.unlock
            const have = haveFor(r)
            const ready = !locked && have && freeOvens > 0
            const needLabel =
              r.needs.fruit === 'any' ? `${r.needs.count} fruit (any)` : `${r.needs.count} ${r.needs.fruit}`
            return (
              <div key={r.id} style={panel.row}>
                <div style={panel.rowArt}>
                  <div style={{ opacity: locked ? 0.3 : 1 }}>
                    <FruitArt subject={r.id} size={42} />
                  </div>
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>{r.label}</div>
                  <div style={{ ...panel.rowNote, color: !locked && !have ? '#b5563f' : '#6b5a44' }}>
                    {needLabel} &middot; {formatSecs(r.ms * bakery.speedMult)}
                  </div>
                  <div style={panel.rowNote}>
                    {locked ? `needs ${BAKERIES[r.unlock].label}` : `${r.blurb} · ${priceOf(r.id)} 🪙`}
                  </div>
                </div>
                <div style={panel.rowActions}>
                  <button
                    style={{ ...panel.smallButton, opacity: ready ? 1 : 0.35 }}
                    onClick={() => bake(r.id)}
                    disabled={!ready}
                  >
                    {locked ? 'Locked' : 'Bake'}
                  </button>
                </div>
              </div>
            )
          })}

          <UpgradeRow
            title={bakery.label}
            note={nextBakery ? `next: ${nextBakery.label} · ${nextBakery.blurb}` : 'the finest bakehouse around 🎉'}
            cost={nextBakery?.cost}
            coins={coins}
            onBuy={() => upgrade('bakery')}
          />
        </>
      )}

      {tab === 'stall' && (
        <>
          {!freshHeld.length && !bakedHeld.length && (
            <p style={panel.empty}>Nothing to sell. Go and pick something.</p>
          )}

          {freshHeld.length > 0 && (
            <>
              <div style={panel.sectionLabel}>Fresh fruit</div>
              {freshHeld.map((k) => (
                <SellRow key={k} item={k} qty={inventory[k] ?? 0} />
              ))}
              <button
                style={{ ...panel.button, width: '100%', marginTop: 4 }}
                onClick={() => sell(freshHeld, freshValue, 'the fresh fruit')}
              >
                Sell fresh &middot; {freshValue} 🪙
              </button>
            </>
          )}

          {bakedHeld.length > 0 && (
            <>
              <div style={panel.sectionLabel}>From the oven</div>
              {bakedHeld.map((k) => (
                <SellRow key={k} item={k} qty={inventory[k] ?? 0} />
              ))}
              <button
                style={{ ...panel.button, width: '100%', marginTop: 4 }}
                onClick={() => sell(bakedHeld, bakedValue, 'the bakes')}
              >
                Sell bakes &middot; {bakedValue} 🪙
              </button>
            </>
          )}
        </>
      )}

      <button style={panel.exitButton} onClick={onExit}>
        Leave the orchard
      </button>
    </div>
  )
}

function SellRow({ item, qty }: { item: string; qty: number }) {
  return (
    <div style={{ ...panel.row, marginTop: 6 }}>
      <div style={panel.rowArt}>
        <FruitArt subject={item} size={38} />
      </div>
      <div style={panel.rowBody}>
        <div style={panel.rowTitle}>
          {item} &times;{qty}
        </div>
        <div style={panel.rowNote}>
          {priceOf(item)} 🪙 each &middot; {priceOf(item) * qty} total
        </div>
      </div>
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
@keyframes ripe {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 210, 90, 0.5); }
  50% { box-shadow: 0 0 10px 3px rgba(255, 210, 90, 0.5); }
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  plant: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '7px 2px',
    border: 'none',
    borderRadius: 8,
    background: '#e6efd4',
    cursor: 'pointer',
    position: 'relative',
  },
  plantLabel: { fontSize: 9.5, color: '#4f5f3a', whiteSpace: 'nowrap' },
  lock: { position: 'absolute', top: 3, right: 4, fontSize: 11 },
  needLadder: { color: '#b5563f', fontWeight: 400 },
}
