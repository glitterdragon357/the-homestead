import { useEffect, useRef, useState } from 'react'
import { useHomesteadStore } from '../../state/store'
import { ItemArt } from '../../economy/ItemArt'
import { ITEMS, ITEM_ORDER, priceOf, valueOf, type ItemCategory } from '../../economy/items'
import { panel } from './farmStyles'

/**
 * Selling. Everything the homestead produces lands in one crate, so
 * produce, cooked dishes and the day's catch all sell from this one list
 * regardless of which part of the farm - or the pond - they came from.
 */

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

  const held = ITEM_ORDER.filter((key) => (inventory[key] ?? 0) > 0)
  const total = valueOf(inventory)

  function sell(key: string, qty: number) {
    const n = Math.min(qty, inventory[key] ?? 0)
    if (n <= 0 || !takeItems({ [key]: n })) return
    earn(priceOf(key) * n)
    showToast(`Sold ${n} × ${key} for ${priceOf(key) * n} 🪙`)
  }

  function sellAll() {
    if (total <= 0) return
    if (!takeItems({ ...inventory })) return
    earn(total)
    showToast(`Sold everything for ${total} 🪙`)
  }

  return (
    <>
      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

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
  )
}
