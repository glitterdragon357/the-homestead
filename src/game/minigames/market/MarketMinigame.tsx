import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { ItemArt } from '../../economy/ItemArt'
import { ITEMS, ITEM_ORDER, priceOf, valueOf, type ItemCategory } from '../../economy/items'
import { FarmArt } from '../farm/FarmArt'
import {
  ANIMALS,
  BUILDINGS,
  levelOf,
  nextLevel,
  type AnimalKind,
  type BuildingId,
  type PenSave,
} from '../farm/farmData'
import { RODS } from '../fishing/fishData'
import { panel } from '../farm/farmStyles'

/**
 * The market is where the whole homestead cashes out. Every game feeds one
 * inventory and one purse, so a marlin and a wheel of cheese are sold from
 * the same list, and every upgrade in the game - buildings, livestock,
 * fishing rods - is bought here rather than inside the building it affects.
 * That keeps the other buildings about *doing the thing* and gives the
 * market a reason to exist beyond a sell button.
 */

type Tab = 'sell' | 'stock' | 'upgrades'

const BUILDING_ORDER: BuildingId[] = ['coop', 'barn', 'field', 'kitchen']
/** Which pen a bought animal walks into. */
const PEN_FOR: Record<AnimalKind, BuildingId> = { chicken: 'coop', goat: 'barn', cow: 'barn' }

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  produce: 'Produce',
  dish: 'Kitchen',
  fish: 'Catch',
}

export function MarketMinigame({ onExit }: MinigameProps) {
  const coins = useHomesteadStore((s) => s.coins)
  const inventory = useHomesteadStore((s) => s.inventory)
  const progress = useHomesteadStore((s) => s.progress)
  const earn = useHomesteadStore((s) => s.earn)
  const spend = useHomesteadStore((s) => s.spend)
  const takeItems = useHomesteadStore((s) => s.takeItems)
  const setProgress = useHomesteadStore((s) => s.setProgress)

  const [tab, setTab] = useState<Tab>('sell')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1500)
  }

  const held = ITEM_ORDER.filter((key) => (inventory[key] ?? 0) > 0)
  const total = valueOf(inventory)

  function sell(key: string, qty: number) {
    const have = inventory[key] ?? 0
    const n = Math.min(qty, have)
    if (n <= 0) return
    if (!takeItems({ [key]: n })) return
    earn(priceOf(key) * n)
    showToast(`Sold ${n} × ${key} for ${priceOf(key) * n} 🪙`)
  }

  function sellAll() {
    if (total <= 0) return
    const snapshot = { ...inventory }
    if (!takeItems(snapshot)) return
    earn(total)
    showToast(`Sold everything for ${total} 🪙`)
  }

  function buyAnimal(kind: AnimalKind) {
    const spec = ANIMALS[kind]
    const penId = PEN_FOR[kind]
    const pen = progress[penId] as PenSave | undefined
    if (!pen) {
      showToast(`Visit the ${BUILDINGS[penId].name.toLowerCase()} first`)
      return
    }
    const cap = levelOf(penId, pen.level ?? 0).capacity
    if ((pen.animals ?? []).length >= cap) {
      showToast(`${BUILDINGS[penId].name} is full - upgrade it first`)
      return
    }
    if (!spend(spec.price)) return

    const now = Date.now()
    setProgress(penId, {
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

  function upgradeBuilding(id: BuildingId) {
    const saved = (progress[id] ?? {}) as { level?: number }
    const current = saved.level ?? 0
    const next = nextLevel(id, current)
    if (!next) return
    if (!spend(next.cost)) return
    setProgress(id, { ...saved, level: current + 1 })
    showToast(`${BUILDINGS[id].name}: ${next.label}`)
  }

  function upgradeRod() {
    const fishing = (progress.fishing ?? {}) as { rodLevel?: number }
    const current = fishing.rodLevel ?? 0
    const next = RODS[current + 1]
    if (!next) return
    if (!spend(next.cost)) return
    setProgress('fishing', { ...fishing, rodLevel: current + 1 })
    showToast(`Upgraded to ${next.name}`)
  }

  const fishingSave = (progress.fishing ?? {}) as { rodLevel?: number }
  const rodLevel = fishingSave.rodLevel ?? 0
  const nextRod = RODS[rodLevel + 1]

  const TABS: { key: Tab; label: string }[] = [
    { key: 'sell', label: 'Sell' },
    { key: 'stock', label: 'Livestock' },
    { key: 'upgrades', label: 'Upgrades' },
  ]

  return (
    <div style={panel.wrap}>
      <div style={panel.header}>
        <h2 style={panel.title}>Market</h2>
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
          </button>
        ))}
      </div>

      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      {tab === 'sell' && (
        <>
          {held.length === 0 && <p style={panel.empty}>Your crate is empty. Go gather something.</p>}

          {(['produce', 'dish', 'fish'] as ItemCategory[]).map((cat) => {
            const rows = held.filter((k) => ITEMS[k].category === cat)
            if (!rows.length) return null
            return (
              <div key={cat}>
                <div style={panel.sectionLabel}>{CATEGORY_LABEL[cat]}</div>
                {rows.map((key) => (
                  <div key={key} style={{ ...panel.row, marginTop: 6 }}>
                    <div style={panel.rowArt}>
                      <ItemArt item={key} size={38} />
                    </div>
                    <div style={panel.rowBody}>
                      <div style={panel.rowTitle}>
                        {ITEMS[key].label} &times;{inventory[key]}
                      </div>
                      <div style={panel.rowNote}>
                        {priceOf(key)} 🪙 each &middot; {priceOf(key) * (inventory[key] ?? 0)} total
                      </div>
                    </div>
                    <div style={panel.rowActions}>
                      <button style={panel.smallButton} onClick={() => sell(key, 1)}>
                        Sell 1
                      </button>
                      <button style={panel.darkButton} onClick={() => sell(key, inventory[key] ?? 0)}>
                        Sell all
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          {total > 0 && (
            <button style={{ ...panel.button, marginTop: 8 }} onClick={sellAll}>
              Sell everything &middot; {total} 🪙
            </button>
          )}
        </>
      )}

      {tab === 'stock' && (
        <>
          <p style={panel.hint}>Bought animals arrive fully grown, straight into their pen.</p>
          {(Object.keys(ANIMALS) as AnimalKind[]).map((kind) => {
            const spec = ANIMALS[kind]
            const penId = PEN_FOR[kind]
            const pen = progress[penId] as PenSave | undefined
            const cap = pen ? levelOf(penId, pen.level ?? 0).capacity : 0
            const housed = pen?.animals?.length ?? 0
            const full = !!pen && housed >= cap
            return (
              <div key={kind} style={panel.row}>
                <div style={panel.rowArt}>
                  <FarmArt subject={kind} size={44} />
                </div>
                <div style={panel.rowBody}>
                  <div style={panel.rowTitle}>{spec.label}</div>
                  <div style={panel.rowNote}>
                    gives {spec.product} every {Math.round(spec.produceMs / 1000)}s
                    {spec.boredomMs ? ' · needs play' : ''}
                  </div>
                  <div style={panel.rowNote}>
                    {BUILDINGS[penId].name}: {housed}/{cap}
                    {full ? ' · full' : ''}
                  </div>
                </div>
                <div style={panel.rowActions}>
                  <button
                    style={{ ...panel.smallButton, opacity: coins >= spec.price && !full ? 1 : 0.35 }}
                    onClick={() => buyAnimal(kind)}
                    disabled={coins < spec.price || full}
                  >
                    Buy &middot; {spec.price}
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'upgrades' && (
        <>
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
      )}

      <button style={panel.exitButton} onClick={onExit}>
        Leave market
      </button>
    </div>
  )
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
}
