import { useEffect, useRef, useState } from 'react'
import { useHomesteadStore } from '../../state/store'
import { ItemArt } from '../../economy/ItemArt'
import { ITEMS, ITEM_ORDER, priceOf, type ItemCategory } from '../../economy/items'
import { panel } from './farmStyles'

/**
 * Selling what the farm produces: raw goods and cooked dishes.
 *
 * Fish are deliberately absent. The pond is its own game with its own
 * shopfront, so a day's catch is sold there rather than being carted
 * through the farmstead.
 */

/** Categories this panel trades in. Fish sell at the pond. */
const FARM_CATEGORIES: ItemCategory[] = ['produce', 'dish']

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  produce: 'Produce',
  dish: 'Kitchen',
  fish: 'Catch',
}

export function SellPanel() {
  const inventory = useHomesteadStore((s) => s.inventory)
  const earn = useHomesteadStore((s) => s.earn)
  const takeItems = useHomesteadStore((s) => s.takeItems)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1500)
  }

  const held = ITEM_ORDER.filter(
    (key) => (inventory[key] ?? 0) > 0 && FARM_CATEGORIES.includes(ITEMS[key].category)
  )
  const total = held.reduce((sum, key) => sum + priceOf(key) * (inventory[key] ?? 0), 0)

  function sell(key: string, qty: number) {
    const n = Math.min(qty, inventory[key] ?? 0)
    if (n <= 0 || !takeItems({ [key]: n })) return
    earn(priceOf(key) * n)
    showToast(`Sold ${n} × ${key} for ${priceOf(key) * n} 🪙`)
  }

  function sellAll() {
    if (total <= 0) return
    const batch = Object.fromEntries(held.map((k) => [k, inventory[k] ?? 0]))
    if (!takeItems(batch)) return
    earn(total)
    showToast(`Sold everything for ${total} 🪙`)
  }

  return (
    <>
      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      {held.length === 0 && <p style={panel.empty}>Nothing from the farm to sell yet.</p>}

      {FARM_CATEGORIES.map((cat) => {
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
  )
}
