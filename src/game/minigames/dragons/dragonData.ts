/**
 * All Dragons.
 *
 * Eggs hatch in the nursery. What comes out is a dragonette - a baby,
 * with a grown dragon's ability and no idea how to hold on to it. A
 * dragonette that can teleport will teleport, and where it lands is not
 * something it decides. That is why the nursery needs minding: the eggs
 * that have not hatched yet are on the same floor.
 *
 * Raise a generation out of the nursery and they take houses of their
 * own. Put two that have fallen for each other under one roof and there
 * is another egg, and the egg is where the types come from.
 */

/* ------------------------------------------------------------------ */
/* What a dragon can do                                                */
/* ------------------------------------------------------------------ */

export type AbilityKind = 'fire' | 'silk' | 'frost' | 'strength' | 'teleport'

export interface AbilitySpec {
  key: AbilityKind
  name: string
  /** What it does to a nursery when nobody is controlling it. */
  trouble: string
  hue: number
}

export const ABILITY_SPECS: AbilitySpec[] = [
  {
    key: 'fire',
    name: 'Fire breath',
    trouble: 'Coughs a cone of flame. Anything in front of it is scorched.',
    hue: 18,
  },
  {
    key: 'silk',
    name: 'Silk spinning',
    trouble: 'Sprays silk. Eggs get wrapped, and wrapped eggs cannot breathe.',
    hue: 286,
  },
  {
    key: 'frost',
    name: 'Frosting breath',
    trouble: 'Breathes hard frost. Shells go brittle and crack under their own weight.',
    hue: 196,
  },
  {
    key: 'strength',
    name: 'Super strength',
    trouble: 'Shoves whatever it bumps into. Usually a bin, usually towards an egg.',
    hue: 36,
  },
  {
    key: 'teleport',
    name: 'Teleportation',
    trouble: 'Blinks somewhere else without looking first. Lands on things.',
    hue: 140,
  },
]

export const ABILITY_BY_KIND: Record<AbilityKind, AbilitySpec> = Object.fromEntries(
  ABILITY_SPECS.map((a) => [a.key, a])
) as Record<AbilityKind, AbilitySpec>

/* ------------------------------------------------------------------ */
/* What a dragon is                                                    */
/* ------------------------------------------------------------------ */

/**
 * A type is four choices: what it can do, how it is marked, where its
 * line came from, and how it is built. Every combination is a real type
 * with its own name, which is where the count comes from - five
 * abilities, ten markings, fourteen lineages and eight builds is five
 * thousand six hundred of them.
 *
 * They are not stored as a list. A list of five and a half thousand
 * objects is a megabyte of source nobody can read and nobody will ever
 * check; the four indices ARE the type, and everything else about it -
 * name, colour, rarity - is worked out from them on demand.
 */
export interface DragonType {
  /** The four indices, packed. Stable across sessions - it is the save. */
  code: number
  ability: AbilityKind
  name: string
  lineage: string
  build: string
  mark: string
  hue: number
  accent: number
  /** 0 common, 1 uncommon, 2 rare, 3 exotic. */
  rarity: number
}

/** The markings, paired with an ability to make the first word of a name. */
const MARKS = [
  'scale',
  'plume',
  'thorn',
  'hide',
  'speck',
  'band',
  'vein',
  'frill',
  'shard',
  'bloom',
] as const

/** The word each ability contributes to that compound. */
const ABILITY_WORD: Record<AbilityKind, string> = {
  fire: 'Ember',
  silk: 'Gossamer',
  frost: 'Rime',
  strength: 'Iron',
  teleport: 'Void',
}

/** Where the line came from. */
const LINEAGES = [
  'Highland',
  'Saltmarsh',
  'Cavern',
  'Orchard',
  'Ashfall',
  'Riverbend',
  'Steppe',
  'Reef',
  'Thicket',
  'Glacier',
  'Dunes',
  'Hollow',
  'Summit',
  'Fenland',
] as const

/** How it is built. */
const BUILDS = [
  'Wyrm',
  'Drake',
  'Serpent',
  'Wyvern',
  'Lindworm',
  'Knucker',
  'Amphithere',
  'Basilisk',
] as const

export const ABILITY_COUNT = ABILITY_SPECS.length
export const MARK_COUNT = MARKS.length
export const LINEAGE_COUNT = LINEAGES.length
export const BUILD_COUNT = BUILDS.length

/** Every type there is. */
export const TYPE_COUNT = ABILITY_COUNT * MARK_COUNT * LINEAGE_COUNT * BUILD_COUNT

/** The hue each lineage carries. Spread evenly, then nudged off the grid. */
function lineageHue(l: number): number {
  return Math.round(((l * 360) / LINEAGE_COUNT + (l % 3) * 9) % 360)
}

/**
 * Unpack a code into the type it stands for.
 *
 * Cheap enough to call while drawing - it is four divisions and some
 * string joins, no allocation of anything large.
 */
export function typeOf(code: number): DragonType {
  const c = ((code % TYPE_COUNT) + TYPE_COUNT) % TYPE_COUNT
  let n = c
  const b = n % BUILD_COUNT
  n = (n - b) / BUILD_COUNT
  const l = n % LINEAGE_COUNT
  n = (n - l) / LINEAGE_COUNT
  const m = n % MARK_COUNT
  n = (n - m) / MARK_COUNT
  const a = n % ABILITY_COUNT

  const ability = ABILITY_SPECS[a].key
  const compound = ABILITY_WORD[ability] + MARKS[m]
  return {
    code: c,
    ability,
    name: `${compound} ${LINEAGES[l]} ${BUILDS[b]}`,
    lineage: LINEAGES[l],
    build: BUILDS[b],
    mark: MARKS[m],
    hue: lineageHue(l),
    accent: ABILITY_SPECS[a].hue,
    rarity: rarityOf(a, m, l, b),
  }
}

/** Build a code from its four parts. */
export function codeOf(a: number, m: number, l: number, b: number): number {
  return ((a * MARK_COUNT + m) * LINEAGE_COUNT + l) * BUILD_COUNT + b
}

/** The four parts of a code. */
export function partsOf(code: number): { a: number; m: number; l: number; b: number } {
  const c = ((code % TYPE_COUNT) + TYPE_COUNT) % TYPE_COUNT
  const b = c % BUILD_COUNT
  const l = Math.floor(c / BUILD_COUNT) % LINEAGE_COUNT
  const m = Math.floor(c / (BUILD_COUNT * LINEAGE_COUNT)) % MARK_COUNT
  const a = Math.floor(c / (BUILD_COUNT * LINEAGE_COUNT * MARK_COUNT)) % ABILITY_COUNT
  return { a, m, l, b }
}

/**
 * How unusual a type is.
 *
 * Rarity is a property of the combination rather than a roll, so the
 * same type is always worth the same thing and a rare one stays rare
 * however many you breed.
 *
 * It is a hash of the four parts rather than a spread between them. The
 * spread version read better and distributed terribly: the top band was
 * a single arithmetic maximum, so sixteen of five thousand six hundred
 * types were exotic and the tier may as well not have existed.
 */
function rarityOf(a: number, m: number, l: number, b: number): number {
  let h = (a * 73856093) ^ (m * 19349663) ^ (l * 83492791) ^ (b * 2971215073)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  const r = ((h ^ (h >>> 16)) >>> 0) / 4294967296
  if (r > 0.975) return 3
  if (r > 0.9) return 2
  if (r > 0.66) return 1
  return 0
}

export const RARITY_NAMES = ['Common', 'Uncommon', 'Rare', 'Exotic']

/* ------------------------------------------------------------------ */
/* Breeding                                                            */
/* ------------------------------------------------------------------ */

/**
 * What two dragons produce.
 *
 * Each of the four parts is taken from one parent or the other, and
 * occasionally from neither - a part that lands between them, or one
 * step outside both, which is how a pair of ordinary dragons can throw
 * something no dragon in your care has ever had. That is the whole
 * engine of the game: there is no separate table of exotic types, the
 * exotic ones are just the combinations nobody has reached yet.
 */
export function breed(mum: number, dad: number, rng: () => number): number {
  const A = partsOf(mum)
  const B = partsOf(dad)
  const pick = (x: number, y: number, span: number): number => {
    const roll = rng()
    if (roll < 0.42) return x
    if (roll < 0.84) return y
    if (roll < 0.94) {
      // Between them, which for two neighbours is one of them again and
      // for two opposites is something in the middle.
      return Math.floor((x + y) / 2) % span
    }
    // One step outside the pair entirely.
    return (Math.max(x, y) + 1 + Math.floor(rng() * 2)) % span
  }
  return codeOf(
    pick(A.a, B.a, ABILITY_COUNT),
    pick(A.m, B.m, MARK_COUNT),
    pick(A.l, B.l, LINEAGE_COUNT),
    pick(A.b, B.b, BUILD_COUNT)
  )
}

/**
 * Whether two dragons have taken to each other.
 *
 * Deterministic in the pair, so it does not change between looks at the
 * same two dragons, and symmetrical, so it does not matter which one you
 * are looking at. Shared lineage helps; shared ability helps more.
 */
export function fondness(one: Dragon, two: Dragon): number {
  if (one.id === two.id) return 0
  const a = typeOf(one.code)
  const b = typeOf(two.code)
  const key = Math.min(one.id, two.id) * 7919 + Math.max(one.id, two.id) * 104729
  let score = ((key * 2654435761) % 1000) / 1000
  score = score * 0.55
  if (a.lineage === b.lineage) score += 0.18
  if (a.ability === b.ability) score += 0.24
  if (a.build === b.build) score += 0.1
  return Math.min(1, score)
}

/**
 * In love enough to share a house.
 *
 * Set by measuring rather than by feel. At 0.72 only three per cent of
 * pairs cleared it - effectively only two dragons of the same lineage
 * AND the same ability - so a player with a first generation of four or
 * five had nobody to pair and no way to breed at all. At 0.55 it is
 * about one pair in nine: uncommon enough that a match is worth
 * something, common enough that a small nursery has one.
 */
export const IN_LOVE = 0.55

/* ------------------------------------------------------------------ */
/* The dragons themselves                                              */
/* ------------------------------------------------------------------ */

export type Stage = 'egg' | 'dragonette' | 'grown'

export interface Dragon {
  id: number
  code: number
  name: string
  stage: Stage
  /** Which house it lives in, or null while it is in the nursery. */
  house: number | null
  /** Who it came from, if it was bred rather than found. */
  parents?: [number, number]
  /** How far through growing up, 0 to 1. */
  grown: number
}

export interface House {
  id: number
  name: string
  /** Who lives here. Two at most, and only two that are in love. */
  living: number[]
}

/** Given names, so a dragon is somebody rather than a type. */
const GIVEN = [
  'Pip', 'Ash', 'Bramble', 'Nix', 'Sorrel', 'Vetch', 'Quill', 'Marrow',
  'Tansy', 'Flint', 'Dorn', 'Hazel', 'Wren', 'Clove', 'Rook', 'Fennel',
  'Bryn', 'Mote', 'Teasel', 'Kip', 'Sable', 'Yarrow', 'Juno', 'Pell',
  'Mabel', 'Thorn', 'Bay', 'Gale', 'Lark', 'Cinder', 'Rue', 'Fig',
]

export function givenName(id: number): string {
  const n = GIVEN[id % GIVEN.length]
  const round = Math.floor(id / GIVEN.length)
  return round === 0 ? n : `${n} ${'II III IV V VI VII VIII IX X'.split(' ')[round - 1] ?? round + 1}`
}

/* ------------------------------------------------------------------ */
/* Saving                                                              */
/* ------------------------------------------------------------------ */

export interface DragonSave {
  dragons: Dragon[]
  houses: House[]
  nextId: number
  nextHouse: number
  /** Every type ever seen, as codes. This is the collection. */
  seen: number[]
  /** Nursery shifts finished, and eggs lost across all of them. */
  shifts: number
  lost: number
  music?: boolean
  /**
   * Where a new egg goes by default. Three quarters of people send them
   * to the nursery, so that is what this starts as.
   */
  toNursery: boolean
}

export const initialDragons: DragonSave = {
  dragons: [],
  houses: [],
  nextId: 1,
  nextHouse: 1,
  seen: [],
  shifts: 0,
  lost: 0,
  toNursery: true,
}

/** How many of the five and a half thousand you have actually met. */
export function collected(save: DragonSave): number {
  return new Set(save.seen ?? []).size
}
