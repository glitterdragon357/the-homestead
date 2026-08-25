/**
 * The orchard: pick fruit, then bake it.
 *
 * THE LADDER IS THE GATE. Bushes are at arm's height and always pickable;
 * everything on a tree is out of reach until you buy a ladder, and taller
 * ladders reach higher fruit. That makes the opening of the game a real
 * arc - scrape a living off berries, sell them, and buy your way up into
 * the trees - rather than everything being available at once.
 *
 * Locked trees are deliberately visible in the orchard rather than hidden.
 * Seeing the apple tree you cannot reach yet is the whole motivation.
 */

export type PlantKind = 'bush' | 'tree'

export interface Fruit {
  key: string
  label: string
  kind: PlantKind
  /** Ladder level needed to reach it. Bushes are always 0. */
  reach: number
  price: number
  /** Fruit won per pick, before the basket's bonus. */
  yield: number
  regrowMs: number
}

export const FRUITS: Fruit[] = [
  // --- bushes: no ladder needed ---
  { key: 'strawberry', label: 'Strawberry', kind: 'bush', reach: 0, price: 6, yield: 2, regrowMs: 70_000 },
  { key: 'raspberry', label: 'Raspberry', kind: 'bush', reach: 0, price: 7, yield: 2, regrowMs: 75_000 },
  { key: 'blackberry', label: 'Blackberry', kind: 'bush', reach: 0, price: 8, yield: 2, regrowMs: 80_000 },
  { key: 'blueberry', label: 'Blueberry', kind: 'bush', reach: 0, price: 9, yield: 2, regrowMs: 85_000 },

  // --- trees: out of reach until you can climb ---
  { key: 'apple', label: 'Apple', kind: 'tree', reach: 1, price: 12, yield: 3, regrowMs: 100_000 },
  { key: 'plum', label: 'Plum', kind: 'tree', reach: 1, price: 14, yield: 3, regrowMs: 105_000 },
  { key: 'pear', label: 'Pear', kind: 'tree', reach: 2, price: 17, yield: 3, regrowMs: 115_000 },
  { key: 'cherry', label: 'Cherry', kind: 'tree', reach: 2, price: 20, yield: 3, regrowMs: 120_000 },
  { key: 'peach', label: 'Peach', kind: 'tree', reach: 3, price: 24, yield: 3, regrowMs: 130_000 },
  { key: 'apricot', label: 'Apricot', kind: 'tree', reach: 3, price: 28, yield: 3, regrowMs: 140_000 },
]

export const FRUIT_BY_KEY: Record<string, Fruit> = Object.fromEntries(
  FRUITS.map((f) => [f.key, f])
)

export interface LadderLevel {
  label: string
  cost: number
  /** Highest fruit reach this ladder unlocks. */
  reach: number
  blurb: string
}

/**
 * The first rung costs about six good pickings of berries - enough that
 * buying it feels earned, not so much that the bushes become a grind.
 */
export const LADDERS: LadderLevel[] = [
  { label: 'No ladder', cost: 0, reach: 0, blurb: 'You can reach the bushes, and that is all.' },
  { label: 'Step Ladder', cost: 80, reach: 1, blurb: 'Three rungs. Apples and plums come within reach.' },
  { label: 'Orchard Ladder', cost: 240, reach: 2, blurb: 'Tall and splayed. Pears and cherries now.' },
  { label: 'Fruit-picker’s Ladder', cost: 600, reach: 3, blurb: 'Reaches the topmost peaches and apricots.' },
]

export interface BasketLevel {
  label: string
  cost: number
  /** Extra fruit per pick. */
  bonus: number
  blurb: string
}

export const BASKETS: BasketLevel[] = [
  { label: 'Cupped Hands', cost: 0, bonus: 0, blurb: 'You drop about as much as you carry.' },
  { label: 'Withy Basket', cost: 120, bonus: 1, blurb: 'One more from every picking.' },
  { label: 'Picking Apron', cost: 320, bonus: 2, blurb: 'Two more, and both hands free.' },
  { label: 'Orchard Hamper', cost: 720, bonus: 4, blurb: 'Four more. Strip a tree in one go.' },
]

export interface BakeryLevel {
  label: string
  cost: number
  /** Bakes running at once. */
  capacity: number
  /** Multiplier on bake times - lower is faster. */
  speedMult: number
  blurb: string
}

export const BAKERIES: BakeryLevel[] = [
  { label: 'Cottage Oven', cost: 0, capacity: 1, speedMult: 1, blurb: 'One tin, one bake.' },
  { label: 'Baker’s Range', cost: 180, capacity: 2, speedMult: 0.85, blurb: 'Two at once. Unlocks tarts and cakes.' },
  { label: 'Brick Oven', cost: 480, capacity: 3, speedMult: 0.7, blurb: 'Three at once, and the finer pastry.' },
  { label: 'Bakehouse', cost: 950, capacity: 4, speedMult: 0.55, blurb: 'Four at once, at double speed.' },
]

/** The five things you can make, which is what gives each its shape and art. */
export type Form = 'jam' | 'pie' | 'tart' | 'turnover' | 'cake'

export interface Recipe {
  id: string
  label: string
  form: Form
  /** Fruit consumed. `any` accepts any fruit, which is what makes odds and ends useful. */
  needs: { fruit: string | 'any'; count: number }
  ms: number
  /** Bakery level required. */
  unlock: number
  price: number
  blurb: string
}

/**
 * Jams are cheap, fast and take whatever is lying about; pies and cakes
 * want a specific fruit and pay far better. So the jam pot keeps you
 * solvent early and the oven takes over once you can reach the trees.
 */
export const RECIPES: Recipe[] = [
  { id: 'berry jam', label: 'Berry jam', form: 'jam', needs: { fruit: 'any', count: 3 }, ms: 45_000, unlock: 0, price: 34, blurb: 'Whatever the bushes gave up.' },
  { id: 'strawberry preserve', label: 'Strawberry preserve', form: 'jam', needs: { fruit: 'strawberry', count: 4 }, ms: 55_000, unlock: 0, price: 52, blurb: 'Set with a knob of butter.' },
  { id: 'bramble jelly', label: 'Bramble jelly', form: 'jam', needs: { fruit: 'blackberry', count: 4 }, ms: 60_000, unlock: 0, price: 58, blurb: 'Strained twice, clear as glass.' },

  { id: 'mixed berry pie', label: 'Mixed berry pie', form: 'pie', needs: { fruit: 'any', count: 5 }, ms: 70_000, unlock: 0, price: 78, blurb: 'Lattice top, purple everywhere.' },
  { id: 'apple pie', label: 'Apple pie', form: 'pie', needs: { fruit: 'apple', count: 4 }, ms: 80_000, unlock: 1, price: 96, blurb: 'The one everybody asks for.' },
  { id: 'cherry pie', label: 'Cherry pie', form: 'pie', needs: { fruit: 'cherry', count: 4 }, ms: 90_000, unlock: 1, price: 132, blurb: 'Stoned by hand, every one.' },

  { id: 'blueberry tart', label: 'Blueberry tart', form: 'tart', needs: { fruit: 'blueberry', count: 4 }, ms: 75_000, unlock: 1, price: 104, blurb: 'Glazed till it shines.' },
  { id: 'pear tart', label: 'Pear tart', form: 'tart', needs: { fruit: 'pear', count: 4 }, ms: 95_000, unlock: 2, price: 158, blurb: 'Fanned in neat overlapping slices.' },

  { id: 'apple turnover', label: 'Apple turnover', form: 'turnover', needs: { fruit: 'apple', count: 3 }, ms: 60_000, unlock: 1, price: 82, blurb: 'Folded, crimped, sugared.' },
  { id: 'apricot turnover', label: 'Apricot turnover', form: 'turnover', needs: { fruit: 'apricot', count: 3 }, ms: 85_000, unlock: 2, price: 176, blurb: 'Flaky, and dangerously hot.' },

  { id: 'plum cake', label: 'Plum cake', form: 'cake', needs: { fruit: 'plum', count: 4 }, ms: 100_000, unlock: 2, price: 168, blurb: 'Heavy, dark and keeps for weeks.' },
  { id: 'peach cake', label: 'Peach upside-down cake', form: 'cake', needs: { fruit: 'peach', count: 5 }, ms: 120_000, unlock: 3, price: 252, blurb: 'Turned out hot, caramel and all.' },
]

// --- save shape -------------------------------------------------------

export interface Plant {
  /** Fruit key this plant bears. Fixed, so a locked tree is a *specific* tree. */
  fruit: string
  readyAt: number
}

export interface FruitSave {
  ladderLevel: number
  basketLevel: number
  bakeryLevel: number
  plants: Plant[]
  bakes: { recipeId: string; doneAt: number }[]
}

export function initialFruit(): FruitSave {
  const now = Date.now()
  return {
    ladderLevel: 0,
    basketLevel: 0,
    bakeryLevel: 0,
    // Every plant exists from the start; the ladder decides what you can
    // actually reach. Bushes begin ripe so there is something to pick.
    plants: FRUITS.map((f) => ({
      fruit: f.key,
      readyAt: f.kind === 'bush' ? now - 1 : now - 1,
    })),
    bakes: [],
  }
}

export function ladderOf(s: FruitSave | undefined): LadderLevel {
  return LADDERS[Math.min(s?.ladderLevel ?? 0, LADDERS.length - 1)]
}
export function basketOf(s: FruitSave | undefined): BasketLevel {
  return BASKETS[Math.min(s?.basketLevel ?? 0, BASKETS.length - 1)]
}
export function bakeryOf(s: FruitSave | undefined): BakeryLevel {
  return BAKERIES[Math.min(s?.bakeryLevel ?? 0, BAKERIES.length - 1)]
}

export function canReach(s: FruitSave | undefined, fruit: Fruit): boolean {
  return fruit.reach <= ladderOf(s).reach
}

/** What the orchard has waiting, for the map badge. Only counts reachable fruit. */
export function fruitPending(s: FruitSave | undefined, now: number) {
  if (!s) return null
  const ripe = (s.plants ?? []).filter((p) => {
    const f = FRUIT_BY_KEY[p.fruit]
    return f && canReach(s, f) && now >= p.readyAt
  }).length
  const baked = (s.bakes ?? []).filter((b) => now >= b.doneAt).length
  const count = ripe + baked
  return count > 0 ? { count } : null
}
