/**
 * Shared farm tuning: livestock, crops, recipes, and the upgrade ladder
 * for each building.
 *
 * TIMERS ARE DELIBERATELY SLOW. The map is the hub now - a badge appears
 * on a building when it has something waiting, you walk over, spend a few
 * seconds collecting, and leave. Short timers would punish you for ever
 * leaving a screen; these are long enough that the round trip is the
 * natural rhythm rather than an interruption.
 */

export type AnimalKind = 'cow' | 'goat' | 'chicken'

export interface AnimalSpec {
  kind: AnimalKind
  label: string
  plural: string
  /** Inventory key this animal yields. */
  product: string
  collectVerb: string
  produceMs: number
  matureMs: number
  price: number
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
    collectVerb: 'Collect',
    produceMs: 45_000,
    matureMs: 180_000,
    price: 40,
    breedMs: 120_000,
  },
  goat: {
    kind: 'goat',
    label: 'Goat',
    plural: 'Goats',
    product: 'goat milk',
    collectVerb: 'Milk',
    produceMs: 75_000,
    matureMs: 240_000,
    price: 90,
    breedMs: 170_000,
    boredomMs: 150_000,
    escapeChance: 0.03,
  },
  cow: {
    kind: 'cow',
    label: 'Cow',
    plural: 'Cows',
    product: 'milk',
    collectVerb: 'Milk',
    produceMs: 100_000,
    matureMs: 300_000,
    price: 150,
    breedMs: 220_000,
  },
}

export type CropKey = 'wheat' | 'corn'

export interface CropSpec {
  key: CropKey
  label: string
  growMs: number
  waterMs: number
  yield: number
}

export const CROPS: Record<CropKey, CropSpec> = {
  wheat: { key: 'wheat', label: 'Wheat', growMs: 70_000, waterMs: 9_000, yield: 2 },
  corn: { key: 'corn', label: 'Corn', growMs: 100_000, waterMs: 12_000, yield: 2 },
}

export const CROP_ORDER: CropKey[] = ['wheat', 'corn']

export interface Recipe {
  id: string
  label: string
  produces: string
  needs: Record<string, number>
  price: number
  cookMs: number
}

/**
 * Every recipe sells for more than its ingredients would raw - that
 * margin is the whole reason to own a kitchen.
 */
export const RECIPES: Recipe[] = [
  { id: 'bread', label: 'Bread', produces: 'bread', needs: { wheat: 2 }, price: 40, cookMs: 45_000 },
  { id: 'cheese', label: 'Cheese', produces: 'cheese', needs: { milk: 2 }, price: 70, cookMs: 60_000 },
  { id: 'omelette', label: 'Omelette', produces: 'omelette', needs: { egg: 3, milk: 1 }, price: 90, cookMs: 60_000 },
  { id: 'cornbread', label: 'Cornbread', produces: 'cornbread', needs: { corn: 2, egg: 1, 'goat milk': 1 }, price: 130, cookMs: 75_000 },
  { id: 'cake', label: 'Cake', produces: 'cake', needs: { wheat: 2, egg: 2, milk: 1 }, price: 220, cookMs: 100_000 },
]

/**
 * Upgrade ladders. Every building levels the same way: more capacity, and
 * a speed multiplier applied to whatever that building's core timer is.
 * Level 0 is what you start with, so `cost` on the first entry is unused.
 */
export interface BuildingLevel {
  label: string
  cost: number
  /** Animals housed, plots tilled, or dishes cooked at once. */
  capacity: number
  /**
   * Barn only: how many of *each* kind fit. The barn is limited per
   * species rather than by a single total, so you cannot fill every stall
   * with chickens - a full barn is three of each, nine in all.
   */
  perKind?: number
  /** Multiplier on production/growth/cook time - lower is faster. */
  speedMult: number
  blurb: string
}

export interface BuildingSpec {
  id: BuildingId
  name: string
  levels: BuildingLevel[]
}

export type BuildingId = 'barn' | 'field' | 'kitchen'

export const BUILDINGS: Record<BuildingId, BuildingSpec> = {
  barn: {
    id: 'barn',
    name: 'Barn',
    levels: [
      { label: 'Old Shed', cost: 0, capacity: 3, perKind: 1, speedMult: 1, blurb: 'One of each, if you are not fussy.' },
      { label: 'Timber Barn', cost: 180, capacity: 6, perKind: 2, speedMult: 0.85, blurb: 'Two of each, and a stronger fence.' },
      { label: 'Stone Barn', cost: 450, capacity: 9, perKind: 3, speedMult: 0.7, blurb: 'A full barn: three of each, nine in all.' },
      { label: 'Great Barn', cost: 900, capacity: 9, perKind: 3, speedMult: 0.55, blurb: 'Still nine, but tended twice as often.' },
    ],
  },
  field: {
    id: 'field',
    name: 'Field',
    levels: [
      { label: 'Scratch Plot', cost: 0, capacity: 4, speedMult: 1, blurb: 'Four furrows of poor soil.' },
      { label: 'Tilled Field', cost: 100, capacity: 6, speedMult: 0.85, blurb: 'Six plots, properly turned.' },
      { label: 'Irrigated Field', cost: 280, capacity: 9, speedMult: 0.7, blurb: 'Nine plots that water themselves.' },
      { label: 'Terraced Field', cost: 650, capacity: 12, speedMult: 0.55, blurb: 'Twelve plots, twice the yield rate.' },
    ],
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen',
    levels: [
      { label: 'Camp Stove', cost: 0, capacity: 1, speedMult: 1, blurb: 'One pot, one dish at a time.' },
      { label: 'Farm Kitchen', cost: 180, capacity: 2, speedMult: 0.85, blurb: 'Two dishes at once.' },
      { label: 'Stone Hearth', cost: 450, capacity: 3, speedMult: 0.7, blurb: 'Three dishes, and faster.' },
      { label: 'Great Kitchen', cost: 900, capacity: 4, speedMult: 0.55, blurb: 'Four dishes at double speed.' },
    ],
  },
}

/** How much of the chase bar one click is worth, and how fast it slips back. */
export const CHASE_PER_CLICK = 13
export const CHASE_DECAY_PER_TICK = 2.2

// --- shared save shapes ----------------------------------------------

export interface Animal {
  id: number
  kind: AnimalKind
  bornAt: number
  lastProductAt: number
  /** Goats only: when it was last played with. */
  lastPlayedAt: number
  escaped: boolean
}

export interface PenSave {
  level: number
  nextId: number
  animals: Animal[]
  /** Per-kind breeding in progress, keyed by kind -> completion time. */
  breeding: Partial<Record<AnimalKind, number>>
}

export interface CropPlot {
  crop: CropKey | null
  plantedAt: number | null
  wateredMs: number
}

export interface FieldSave {
  level: number
  plots: CropPlot[]
}

export interface KitchenSave {
  level: number
  recipes: string[]
  cooking: { recipeId: string; doneAt: number }[]
}

export const EMPTY_PLOT: CropPlot = { crop: null, plantedAt: null, wateredMs: 0 }

export function levelOf(id: BuildingId, level: number): BuildingLevel {
  const levels = BUILDINGS[id].levels
  return levels[Math.min(level, levels.length - 1)]
}

export function nextLevel(id: BuildingId, level: number): BuildingLevel | null {
  return BUILDINGS[id].levels[level + 1] ?? null
}

/** How many of one kind fit at this barn level. */
export function kindCap(level: number): number {
  return levelOf('barn', level).perKind ?? 1
}

export function countOfKind(animals: Animal[] | undefined, kind: AnimalKind): number {
  return (animals ?? []).filter((a) => a.kind === kind).length
}

export function isGrown(a: Animal, now: number): boolean {
  return now - a.bornAt >= ANIMALS[a.kind].matureMs
}

export function produceMsFor(a: Animal, speedMult: number): number {
  return ANIMALS[a.kind].produceMs * speedMult
}

export function productReady(a: Animal, now: number, speedMult: number): boolean {
  return (
    isGrown(a, now) && !a.escaped && now - a.lastProductAt >= produceMsFor(a, speedMult)
  )
}

export function cropProgress(plot: CropPlot, now: number, speedMult: number): number {
  if (!plot.crop || plot.plantedAt === null) return 0
  const total = CROPS[plot.crop].growMs * speedMult
  const grown = now - plot.plantedAt + plot.wateredMs
  return Math.max(0, Math.min(100, (grown / total) * 100))
}

/**
 * Starting state for every building, seeded into the store rather than
 * created lazily when each panel first mounts. The map badges read saved
 * progress directly, so a building that has never been opened would
 * otherwise sit silent and the homestead would look dead on day one.
 */
export function initialPen(): PenSave {
  const now = Date.now()
  const stock: AnimalKind[] = ['chicken', 'chicken', 'goat']
  return {
    level: 0,
    nextId: stock.length + 1,
    animals: stock.map((kind, i) => ({
      id: i + 1,
      kind,
      bornAt: now - ANIMALS[kind].matureMs,
      lastProductAt: now - ANIMALS[kind].produceMs * 0.6,
      lastPlayedAt: now,
      escaped: false,
    })),
    breeding: {},
  }
}

export function initialProgress(): Record<string, unknown> {
  return {
    barn: initialPen(),
    field: {
      level: 0,
      plots: Array.from({ length: BUILDINGS.field.levels[0].capacity }, () => ({ ...EMPTY_PLOT })),
    } satisfies FieldSave,
    kitchen: { level: 0, recipes: [], cooking: [] } satisfies KitchenSave,
  }
}

/** Counts what's waiting in a pen, for the map badge. */
export function penPending(id: BuildingId, save: PenSave | undefined, now: number) {
  if (!save?.animals) return null
  const speed = levelOf(id, save.level ?? 0).speedMult
  const ready = save.animals.filter((a) => productReady(a, now, speed)).length
  const escaped = save.animals.filter((a) => a.escaped).length
  const babies = (Object.values(save.breeding ?? {}) as number[]).filter((at) => now >= at).length
  const count = ready + escaped + babies
  return count > 0 ? { count, urgent: escaped > 0 } : null
}
