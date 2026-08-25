import { FISH } from '../minigames/fishing/fishData'

/**
 * Everything that can sit in the crate and be sold at market, in one
 * catalogue. Fish, produce and cooked dishes are all just items with a
 * price - the market doesn't care which building they came from, which
 * is what lets one wallet serve the whole homestead.
 */

export type ItemCategory = 'fish' | 'produce' | 'dish'

export interface ItemDef {
  key: string
  label: string
  price: number
  category: ItemCategory
  /** Which art component draws it. */
  art: 'fish' | 'farm'
}

const PRODUCE: ItemDef[] = [
  { key: 'egg', label: 'Egg', price: 4, category: 'produce', art: 'farm' },
  { key: 'milk', label: 'Milk', price: 7, category: 'produce', art: 'farm' },
  { key: 'goat milk', label: 'Goat milk', price: 9, category: 'produce', art: 'farm' },
  { key: 'wheat', label: 'Wheat', price: 5, category: 'produce', art: 'farm' },
  { key: 'corn', label: 'Corn', price: 7, category: 'produce', art: 'farm' },
]

const DISHES: ItemDef[] = [
  { key: 'bread', label: 'Bread', price: 18, category: 'dish', art: 'farm' },
  { key: 'cheese', label: 'Cheese', price: 26, category: 'dish', art: 'farm' },
  { key: 'omelette', label: 'Omelette', price: 30, category: 'dish', art: 'farm' },
  { key: 'cornbread', label: 'Cornbread', price: 38, category: 'dish', art: 'farm' },
  { key: 'cake', label: 'Cake', price: 70, category: 'dish', art: 'farm' },
]

/**
 * Fish enter the catalogue straight from the fishing tables, so a species
 * is still defined in exactly one place and its market price is the coin
 * value its tier already implied.
 */
const FISH_ITEMS: ItemDef[] = FISH.map((f) => ({
  key: f.name,
  label: f.name,
  price: f.coins,
  category: 'fish' as const,
  art: 'fish' as const,
}))

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [...PRODUCE, ...DISHES, ...FISH_ITEMS].map((i) => [i.key, i])
)

export const ITEM_ORDER: string[] = [
  ...PRODUCE.map((i) => i.key),
  ...DISHES.map((i) => i.key),
  ...FISH_ITEMS.map((i) => i.key),
]

export function priceOf(key: string): number {
  return ITEMS[key]?.price ?? 0
}

export function valueOf(inventory: Record<string, number>): number {
  return Object.entries(inventory).reduce(
    (sum, [key, qty]) => sum + priceOf(key) * (qty ?? 0),
    0
  )
}
