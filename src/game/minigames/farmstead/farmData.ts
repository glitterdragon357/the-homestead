/**
 * All of the farmstead's tuning in one place: what animals produce, how
 * long crops take, what recipes need and what everything sells for.
 *
 * Timers are deliberately short (seconds, not hours) so a session is
 * playable in one sitting rather than being an idle game you check on
 * once a day.
 */

export type AnimalKind = 'cow' | 'goat' | 'chicken'

export type ItemKey =
  | 'egg'
  | 'milk'
  | 'goat milk'
  | 'wheat'
  | 'corn'
  | 'bread'
  | 'cheese'
  | 'omelette'
  | 'cornbread'
  | 'cake'

export interface AnimalSpec {
  kind: AnimalKind
  label: string
  /** Plural used in headings and breeding text. */
  plural: string
  /** What collecting from it yields. */
  product: ItemKey
  /** Verb shown on the collect button. */
  collectVerb: string
  /** Time between products, once grown. */
  produceMs: number
  /** Time from birth to producing. */
  matureMs: number
  /** Cost to buy one at market. */
  price: number
  /** Time for a breeding pair to produce a baby. */
  breedMs: number
  /**
   * Goats get bored. After this long without play they may bolt the
   * fence; other animals ignore it.
   */
  boredomMs?: number
  /** Per-second chance of escaping once bored. */
  escapeChance?: number
}

export const ANIMALS: Record<AnimalKind, AnimalSpec> = {
  chicken: {
    kind: 'chicken',
    label: 'Chicken',
    plural: 'Chickens',
    product: 'egg',
    collectVerb: 'Collect egg',
    produceMs: 20_000,
    matureMs: 75_000,
    price: 40,
    breedMs: 45_000,
  },
  goat: {
    kind: 'goat',
    label: 'Goat',
    plural: 'Goats',
    product: 'goat milk',
    collectVerb: 'Milk',
    produceMs: 35_000,
    matureMs: 100_000,
    price: 90,
    breedMs: 70_000,
    boredomMs: 60_000,
    escapeChance: 0.05,
  },
  cow: {
    kind: 'cow',
    label: 'Cow',
    plural: 'Cows',
    product: 'milk',
    collectVerb: 'Milk',
    produceMs: 50_000,
    matureMs: 120_000,
    price: 150,
    breedMs: 90_000,
  },
}

export const ANIMAL_ORDER: AnimalKind[] = ['chicken', 'goat', 'cow']

export type CropKey = 'wheat' | 'corn'

export interface CropSpec {
  key: CropKey
  label: string
  growMs: number
  /** Growing time a single watering is worth. */
  waterMs: number
  yield: number
}

export const CROPS: Record<CropKey, CropSpec> = {
  wheat: { key: 'wheat', label: 'Wheat', growMs: 30_000, waterMs: 4_000, yield: 2 },
  corn: { key: 'corn', label: 'Corn', growMs: 45_000, waterMs: 5_000, yield: 2 },
}

export const CROP_ORDER: CropKey[] = ['wheat', 'corn']

/** What each item fetches at market. */
export const PRICES: Record<ItemKey, number> = {
  egg: 4,
  milk: 7,
  'goat milk': 9,
  wheat: 5,
  corn: 7,
  bread: 18,
  cheese: 26,
  omelette: 30,
  cornbread: 38,
  cake: 70,
}

export const RAW_ITEMS: ItemKey[] = ['egg', 'milk', 'goat milk', 'wheat', 'corn']

export interface Recipe {
  id: string
  label: string
  produces: ItemKey
  /** Ingredients consumed per cook. */
  needs: Partial<Record<ItemKey, number>>
  /** Cost to learn the recipe. */
  price: number
  cookMs: number
}

/**
 * Every recipe sells for more than its ingredients would raw - that
 * margin is the whole reason to own a kitchen. Pricier recipes need more
 * ingredients and more of your attention, so the margin grows with them.
 */
export const RECIPES: Recipe[] = [
  { id: 'bread', label: 'Bread', produces: 'bread', needs: { wheat: 2 }, price: 40, cookMs: 15_000 },
  { id: 'cheese', label: 'Cheese', produces: 'cheese', needs: { milk: 2 }, price: 70, cookMs: 20_000 },
  { id: 'omelette', label: 'Omelette', produces: 'omelette', needs: { egg: 3, milk: 1 }, price: 90, cookMs: 20_000 },
  {
    id: 'cornbread',
    label: 'Cornbread',
    produces: 'cornbread',
    needs: { corn: 2, egg: 1, 'goat milk': 1 },
    price: 130,
    cookMs: 25_000,
  },
  {
    id: 'cake',
    label: 'Cake',
    produces: 'cake',
    needs: { wheat: 2, egg: 2, milk: 1 },
    price: 220,
    cookMs: 35_000,
  },
]

export const KITCHEN_PRICE = 150

/** How much of the chase bar one click is worth, and how fast it slips back. */
export const CHASE_PER_CLICK = 13
export const CHASE_DECAY_PER_TICK = 2.2
