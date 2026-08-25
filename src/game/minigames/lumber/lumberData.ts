/**
 * The woodlot: fell trees, haul the logs home, then either burn them or
 * carve them.
 *
 * The haul step is the spine of the game. Felled logs pile up at the
 * stumps and only become usable once carried back, and a trip carries a
 * limited load - so chopping and hauling alternate instead of one button
 * producing infinite wood. The stump pile is capped rather than wasteful:
 * over-chop and there is simply nowhere left to stack it.
 */

export type SpeciesKey = 'pine' | 'birch' | 'oak' | 'maple' | 'walnut'

export interface Species {
  key: SpeciesKey
  label: string
  /** Axe level needed to fell it. */
  hardness: number
  /** Relative chance of a regrown slot being this species. */
  weight: number
  /** Market price of one log. */
  price: number
}

export const SPECIES: Record<SpeciesKey, Species> = {
  pine: { key: 'pine', label: 'Pine', hardness: 0, weight: 34, price: 4 },
  birch: { key: 'birch', label: 'Birch', hardness: 1, weight: 26, price: 7 },
  oak: { key: 'oak', label: 'Oak', hardness: 2, weight: 20, price: 12 },
  maple: { key: 'maple', label: 'Maple', hardness: 2, weight: 14, price: 15 },
  walnut: { key: 'walnut', label: 'Walnut', hardness: 3, weight: 8, price: 22 },
}

export const SPECIES_ORDER: SpeciesKey[] = ['pine', 'birch', 'oak', 'maple', 'walnut']

/** Inventory key for a species' logs. */
export function logKey(species: SpeciesKey): string {
  return `${species} log`
}

export interface AxeLevel {
  label: string
  cost: number
  /** Highest species hardness this axe can fell. */
  reach: number
  /** Logs won per felled tree. */
  logsPerTree: number
  blurb: string
}

export const AXES: AxeLevel[] = [
  { label: 'Hand Hatchet', cost: 0, reach: 0, logsPerTree: 1, blurb: 'Pine only, and one log at a time.' },
  { label: 'Felling Axe', cost: 80, reach: 1, logsPerTree: 2, blurb: 'Takes birch, and two logs a tree.' },
  { label: 'Broadaxe', cost: 240, reach: 2, logsPerTree: 3, blurb: 'Bites into oak and maple.' },
  { label: 'Steel Axe', cost: 600, reach: 3, logsPerTree: 4, blurb: 'Fells anything in the wood, four logs a tree.' },
]

export interface CartLevel {
  label: string
  cost: number
  /** Logs carried home per trip. */
  load: number
  /** How many logs can be stacked at the stumps before chopping stops. */
  stumpCap: number
  blurb: string
}

export const CARTS: CartLevel[] = [
  { label: 'Bare Arms', cost: 0, load: 3, stumpCap: 8, blurb: 'Three logs a trip, and a sore back.' },
  { label: 'Wheelbarrow', cost: 90, load: 6, stumpCap: 16, blurb: 'Six a trip, and a bigger stack.' },
  { label: 'Handcart', cost: 260, load: 11, stumpCap: 28, blurb: 'Eleven a trip.' },
  { label: 'Ox Dray', cost: 650, load: 20, stumpCap: 48, blurb: 'Twenty a trip. Clear the whole stand.' },
]

export interface ShopLevel {
  label: string
  cost: number
  /** Jobs running at once, across the firepit and the bench together. */
  capacity: number
  /** Multiplier on burn and carve times - lower is faster. */
  speedMult: number
  blurb: string
}

export const SHOPS: ShopLevel[] = [
  { label: 'Open Firepit', cost: 0, capacity: 1, speedMult: 1, blurb: 'A ring of stones and a whittling knife.' },
  { label: 'Woodshed', cost: 150, capacity: 2, speedMult: 0.85, blurb: 'Two jobs at once. Unlocks charcoal.' },
  { label: 'Carpenter’s Shop', cost: 420, capacity: 3, speedMult: 0.7, blurb: 'Three at once, and the finer work.' },
  { label: 'Timber Hall', cost: 900, capacity: 4, speedMult: 0.55, blurb: 'Four at once, at double speed.' },
]

/** How long a felled slot takes to grow back. */
export const REGROW_MS = 100_000

export type JobKind = 'burn' | 'carve'

export interface Product {
  id: string
  label: string
  kind: JobKind
  /**
   * Logs consumed. `any` means logs of any species; a species key demands
   * that wood specifically, which is what makes the harder trees worth
   * felling rather than just worth more per log.
   */
  needs: { species: SpeciesKey | 'any'; count: number }
  ms: number
  /** Shop level required. */
  unlock: number
  price: number
  blurb: string
}

/**
 * Both branches off a log. Burning is fast, steady and low-margin;
 * carving is slow and species-fussy but pays several times better, so the
 * firepit funds the bench early and the bench takes over later.
 */
export const PRODUCTS: Product[] = [
  // --- the fire ---
  { id: 'firewood', label: 'Firewood bundle', kind: 'burn', needs: { species: 'any', count: 2 }, ms: 30_000, unlock: 0, price: 16, blurb: 'Split, stacked and tied.' },
  { id: 'charcoal', label: 'Charcoal', kind: 'burn', needs: { species: 'any', count: 3 }, ms: 70_000, unlock: 1, price: 48, blurb: 'Burned slow under turf.' },
  { id: 'pine tar', label: 'Pine tar', kind: 'burn', needs: { species: 'pine', count: 3 }, ms: 80_000, unlock: 2, price: 62, blurb: 'Cooked out of resinous pine.' },
  { id: 'potash', label: 'Potash', kind: 'burn', needs: { species: 'any', count: 4 }, ms: 95_000, unlock: 2, price: 78, blurb: 'Ash leached and boiled down.' },

  // --- the bench ---
  { id: 'spoon', label: 'Wooden spoon', kind: 'carve', needs: { species: 'any', count: 1 }, ms: 25_000, unlock: 0, price: 15, blurb: 'Everyone needs a few.' },
  { id: 'whistle', label: 'Willow whistle', kind: 'carve', needs: { species: 'any', count: 1 }, ms: 32_000, unlock: 0, price: 20, blurb: 'One note, endlessly.' },
  { id: 'wooden bowl', label: 'Turned bowl', kind: 'carve', needs: { species: 'any', count: 2 }, ms: 48_000, unlock: 0, price: 34, blurb: 'Hollowed out and oiled.' },
  { id: 'toy horse', label: 'Toy horse', kind: 'carve', needs: { species: 'pine', count: 2 }, ms: 58_000, unlock: 1, price: 46, blurb: 'Soft wood, quick knife.' },
  { id: 'decoy duck', label: 'Decoy duck', kind: 'carve', needs: { species: 'birch', count: 2 }, ms: 65_000, unlock: 1, price: 58, blurb: 'Painted, weighted, and it floats.' },
  { id: 'stool', label: 'Three-leg stool', kind: 'carve', needs: { species: 'oak', count: 3 }, ms: 78_000, unlock: 1, price: 74, blurb: 'Green-wood legs, dry seat.' },
  { id: 'chess set', label: 'Chess set', kind: 'carve', needs: { species: 'maple', count: 3 }, ms: 105_000, unlock: 2, price: 118, blurb: 'Thirty-two little problems.' },
  { id: 'jewellery box', label: 'Jewellery box', kind: 'carve', needs: { species: 'walnut', count: 3 }, ms: 115_000, unlock: 2, price: 140, blurb: 'Dovetailed and hinged.' },
  { id: 'rocking chair', label: 'Rocking chair', kind: 'carve', needs: { species: 'oak', count: 5 }, ms: 145_000, unlock: 3, price: 205, blurb: 'Steam-bent and pegged.' },
  { id: 'carved chest', label: 'Carved chest', kind: 'carve', needs: { species: 'walnut', count: 6 }, ms: 180_000, unlock: 3, price: 300, blurb: 'A winter of evenings in one lid.' },
]

// --- save shape -------------------------------------------------------

export interface Tree {
  species: SpeciesKey
  /** When this slot finishes regrowing. Past = standing and fellable. */
  readyAt: number
}

export interface LumberSave {
  axeLevel: number
  cartLevel: number
  shopLevel: number
  trees: Tree[]
  /** Felled logs waiting at the stumps, not yet carried home. */
  atStump: Partial<Record<SpeciesKey, number>>
  jobs: { productId: string; doneAt: number }[]
}

export const STAND_SIZE = 6

export function rollSpecies(): SpeciesKey {
  const total = SPECIES_ORDER.reduce((n, k) => n + SPECIES[k].weight, 0)
  let r = Math.random() * total
  for (const k of SPECIES_ORDER) {
    r -= SPECIES[k].weight
    if (r <= 0) return k
  }
  return 'pine'
}

export function initialLumber(): LumberSave {
  const now = Date.now()
  return {
    axeLevel: 0,
    cartLevel: 0,
    shopLevel: 0,
    // Start with the stand grown so there is something to fell on arrival.
    trees: Array.from({ length: STAND_SIZE }, () => ({
      species: rollSpecies(),
      readyAt: now - 1,
    })),
    atStump: {},
    jobs: [],
  }
}

export function axeOf(s: LumberSave | undefined): AxeLevel {
  return AXES[Math.min(s?.axeLevel ?? 0, AXES.length - 1)]
}
export function cartOf(s: LumberSave | undefined): CartLevel {
  return CARTS[Math.min(s?.cartLevel ?? 0, CARTS.length - 1)]
}
export function shopOf(s: LumberSave | undefined): ShopLevel {
  return SHOPS[Math.min(s?.shopLevel ?? 0, SHOPS.length - 1)]
}

export function stumpTotal(s: LumberSave | undefined): number {
  return Object.values(s?.atStump ?? {}).reduce((n, v) => n + (v ?? 0), 0)
}

/** What the woodlot has waiting, for the map badge. */
export function lumberPending(s: LumberSave | undefined, now: number) {
  if (!s) return null
  const standing = (s.trees ?? []).filter((t) => now >= t.readyAt).length
  const done = (s.jobs ?? []).filter((j) => now >= j.doneAt).length
  const waiting = stumpTotal(s) > 0 ? 1 : 0
  const count = standing + done + waiting
  return count > 0 ? { count } : null
}
