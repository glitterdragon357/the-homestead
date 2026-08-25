import { FISH } from '../minigames/fishing/fishData'

/**
 * Everything that can sit in the crate, in one catalogue. Fish, produce
 * and cooked dishes are all just items with a price; `category` is what
 * lets each game show only its own goods - the farmstead sells produce
 * and dishes, the pond sells the catch.
 */

export type ItemCategory = 'fish' | 'produce' | 'dish' | 'craft'

export interface ItemDef {
  key: string
  label: string
  price: number
  category: ItemCategory
  /** Which art component draws it. */
  art: 'fish' | 'farm' | 'pottery'
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
 * Clay and pottery. `river clay` and `wedged clay` are stock rather than
 * wares - they carry a price so the crate can value them, but the studio
 * only puts fired pieces up for sale.
 */
const CRAFT: ItemDef[] = [
  { key: 'river clay', label: 'River clay', price: 3, category: 'craft', art: 'pottery' },
  { key: 'wedged clay', label: 'Wedged clay', price: 8, category: 'craft', art: 'pottery' },
  { key: 'bowl', label: 'Bowl', price: 22, category: 'craft', art: 'pottery' },
  { key: 'mug', label: 'Mug', price: 26, category: 'craft', art: 'pottery' },
  { key: 'bird whistle', label: 'Bird whistle', price: 38, category: 'craft', art: 'pottery' },
  { key: 'jug', label: 'Jug', price: 55, category: 'craft', art: 'pottery' },
  { key: 'vase', label: 'Vase', price: 65, category: 'craft', art: 'pottery' },
  { key: 'cat figurine', label: 'Cat figurine', price: 80, category: 'craft', art: 'pottery' },
  { key: 'urn', label: 'Urn', price: 105, category: 'craft', art: 'pottery' },
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
  [...PRODUCE, ...DISHES, ...CRAFT, ...FISH_ITEMS].map((i) => [i.key, i])
)

export const ITEM_ORDER: string[] = [
  ...PRODUCE.map((i) => i.key),
  ...DISHES.map((i) => i.key),
  ...CRAFT.map((i) => i.key),
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
