/**
 * Pet Care - the animals, what they want, and what you can buy them.
 *
 * The room is a tiled floor with things standing round the edge of it.
 * You tap a thing, the animal walks over to it and uses it, and whatever
 * that thing is for goes back up. Nothing is on a timer you have to beat:
 * the meters come down slowly enough that looking after four animals is
 * pottering rather than firefighting.
 */

/* ------------------------------------------------------------------ */
/* What an animal wants                                                */
/* ------------------------------------------------------------------ */

export type NeedKey = 'food' | 'water' | 'play' | 'rest' | 'care'

export interface Need {
  key: NeedKey
  label: string
  colour: string
  /**
   * How much of the meter drains in a second.
   *
   * Slow on purpose. The old kitten lost a full bar in a hundred
   * seconds, which made a pet a pager. The quickest of these takes seven
   * or eight minutes, and the slowest the better part of twenty.
   */
  drain: number
}

export const NEEDS: Need[] = [
  { key: 'food', label: 'Food', colour: '#e0995c', drain: 0.17 },
  { key: 'water', label: 'Water', colour: '#5cb8e0', drain: 0.22 },
  { key: 'play', label: 'Play', colour: '#7cb342', drain: 0.13 },
  { key: 'rest', label: 'Rest', colour: '#9b7fd4', drain: 0.1 },
  { key: 'care', label: 'Care', colour: '#d9587f', drain: 0.08 },
]

export const NEED_BY_KEY: Record<NeedKey, Need> = Object.fromEntries(
  NEEDS.map((n) => [n.key, n])
) as Record<NeedKey, Need>

/* ------------------------------------------------------------------ */
/* The animals                                                         */
/* ------------------------------------------------------------------ */

export type SpeciesKey =
  | 'kitten'
  | 'puppy'
  | 'rabbit'
  | 'parrot'
  | 'guineapig'
  | 'ferret'
  | 'tortoise'
  | 'duckling'

export interface Species {
  key: SpeciesKey
  label: string
  /** What it costs to bring one home. The first is already yours. */
  cost: number
  /** How fast it crosses the floor, in room units a second. */
  pace: number
  /** The one it minds about most - meeting it pleases them extra. */
  loves: NeedKey
  /** Coat colours one of these turns up in. */
  coats: string[]
  trim: string
  note: string
}

export const SPECIES: Species[] = [
  { key: 'kitten', label: 'Kitten', cost: 0, pace: 96, loves: 'play', coats: ['#9aa2ab', '#c08d50', '#2f2823', '#e8e2d6'], trim: '#e0b6bd', note: 'Asleep for twenty hours and impossible for the other four.' },
  { key: 'puppy', label: 'Puppy', cost: 140, pace: 118, loves: 'play', coats: ['#c08d50', '#3a2f26', '#e2d3b4', '#8a5326'], trim: '#3a332c', note: 'Delighted by absolutely everything, every time.' },
  { key: 'rabbit', label: 'Rabbit', cost: 180, pace: 104, loves: 'food', coats: ['#b8a894', '#5a5148', '#efe6d2', '#8a6f52'], trim: '#e0b6bd', note: 'Will eat the furniture if the bowl is empty.' },
  { key: 'guineapig', label: 'Guinea Pig', cost: 210, pace: 62, loves: 'food', coats: ['#c2762f', '#e8e2d6', '#3a2f26', '#a8896b'], trim: '#d9a24b', note: 'Shrieks when it hears the fridge. Any fridge.' },
  { key: 'duckling', label: 'Duckling', cost: 260, pace: 82, loves: 'water', coats: ['#e0c04a', '#efe6d2', '#c9a850'], trim: '#e0843a', note: 'Follows you about and complains if you stop.' },
  { key: 'parrot', label: 'Parrot', cost: 340, pace: 88, loves: 'care', coats: ['#3f9a5a', '#c2452f', '#2f7ac2', '#e0c04a'], trim: '#e8e2d6', note: 'Repeats the one thing you would rather it did not.' },
  { key: 'ferret', label: 'Ferret', cost: 400, pace: 126, loves: 'play', coats: ['#c9b08a', '#5a4634', '#e2d3b4'], trim: '#3a2f26', note: 'Everything small you own is behind the sofa now.' },
  { key: 'tortoise', label: 'Tortoise', cost: 520, pace: 34, loves: 'rest', coats: ['#7a8a5a', '#8a7f5a', '#5f6b45'], trim: '#c2a878', note: 'Will outlive you, and knows it.' },
]

export const SPECIES_BY_KEY: Record<string, Species> = Object.fromEntries(
  SPECIES.map((s) => [s.key, s])
)

/* ------------------------------------------------------------------ */
/* Things in the room                                                  */
/* ------------------------------------------------------------------ */

export type SlotKey = 'bowl' | 'trough' | 'bed' | 'toy' | 'brush' | 'perch'

export interface Tier {
  label: string
  cost: number
  /**
   * What the second-hand shop gives you for it when you replace it.
   *
   * Upgrading sells the old one, which is where the real money is - the
   * coins you earn a go at a time only ever trickled in.
   */
  resale: number
  /** How much of the meter one go puts back. */
  restore: number
  /** How much nicer this is than the bare minimum, for happiness. */
  joy: number
  blurb: string
}

export interface Slot {
  key: SlotKey
  label: string
  need: NeedKey
  /** Where it stands on the floor. */
  x: number
  y: number
  tiers: Tier[]
}

export const SLOTS: Slot[] = [
  {
    key: 'bowl',
    label: 'Food bowl',
    need: 'food',
    x: 118,
    y: 300,
    tiers: [
      { label: 'Chipped bowl', cost: 0, resale: 40, restore: 44, joy: 0, blurb: 'It holds food. Just about.' },
      { label: 'Ceramic bowl', cost: 90, resale: 52, restore: 62, joy: 6, blurb: 'Heavy enough that it stays put.' },
      { label: 'Raised feeder', cost: 260, resale: 151, restore: 82, joy: 14, blurb: 'Kinder on the neck, and they notice.' },
    ],
  },
  {
    key: 'trough',
    label: 'Water',
    need: 'water',
    x: 214,
    y: 336,
    tiers: [
      { label: 'Old saucer', cost: 0, resale: 40, restore: 46, joy: 0, blurb: 'Gets dusty within the hour.' },
      { label: 'Deep bowl', cost: 80, resale: 46, restore: 64, joy: 5, blurb: 'Holds a day of it.' },
      { label: 'Bubbling fountain', cost: 280, resale: 162, restore: 86, joy: 16, blurb: 'Running water. They drink far more of it.' },
    ],
  },
  {
    key: 'bed',
    label: 'Bed',
    need: 'rest',
    x: 520,
    y: 300,
    tiers: [
      { label: 'Folded blanket', cost: 0, resale: 40, restore: 42, joy: 0, blurb: 'Better than the bare floor.' },
      { label: 'Cushioned basket', cost: 120, resale: 70, restore: 64, joy: 8, blurb: 'Sides to lean against.' },
      { label: 'Canopy bed', cost: 340, resale: 197, restore: 88, joy: 18, blurb: 'A roof of their own. Nobody ever comes out.' },
    ],
  },
  {
    key: 'toy',
    label: 'Toy',
    need: 'play',
    x: 330,
    y: 250,
    tiers: [
      { label: 'Bit of string', cost: 0, resale: 40, restore: 40, joy: 0, blurb: 'Works far better than it should.' },
      { label: 'Feather wand', cost: 110, resale: 64, restore: 62, joy: 9, blurb: 'Worth the arm ache.' },
      { label: 'Puzzle tower', cost: 320, resale: 186, restore: 84, joy: 20, blurb: 'Keeps them busy long after you have stopped.' },
    ],
  },
  {
    key: 'brush',
    label: 'Brush',
    need: 'care',
    x: 430,
    y: 336,
    tiers: [
      { label: 'Old comb', cost: 0, resale: 40, restore: 40, joy: 0, blurb: 'Pulls a bit.' },
      { label: 'Soft brush', cost: 100, resale: 58, restore: 60, joy: 8, blurb: 'They lean into it.' },
      { label: 'Grooming kit', cost: 300, resale: 174, restore: 82, joy: 17, blurb: 'Brush, comb, clippers, the lot.' },
    ],
  },
  {
    key: 'perch',
    label: 'Perch',
    need: 'play',
    x: 596,
    y: 236,
    tiers: [
      { label: 'Cardboard box', cost: 0, resale: 40, restore: 34, joy: 2, blurb: 'The best thing you own, apparently.' },
      { label: 'Window perch', cost: 160, resale: 93, restore: 54, joy: 12, blurb: 'A whole street to watch.' },
      { label: 'Climbing tree', cost: 420, resale: 244, restore: 76, joy: 24, blurb: 'Four levels and a rope. Worth every coin.' },
    ],
  },
]

export const SLOT_BY_KEY: Record<string, Slot> = Object.fromEntries(SLOTS.map((s) => [s.key, s]))

/* ------------------------------------------------------------------ */
/* The room                                                            */
/* ------------------------------------------------------------------ */

export const ROOM = { w: 700, h: 400 }
/** Where an animal can wander: the open floor, not the walls. */
export const FLOOR = { x0: 60, x1: 640, y0: 190, y1: 360 }

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export interface Pet {
  id: number
  name: string
  species: SpeciesKey
  coat: string
  needs: Record<NeedKey, number>
  /** Where it is standing, and where it is heading. */
  x: number
  y: number
  /** The slot it is walking to, if any. */
  going: SlotKey | null
  /** Busy using something until this moment. */
  busyUntil: number
  broughtHome: number
}

export interface PetSave {
  pets: Pet[]
  /** Which tier you own of each thing in the room. */
  tiers: Record<SlotKey, number>
  usedNames: string[]
  nextId: number
  /** When the needs were last worked out, so they drain while you watch. */
  tickedAt: number
  looked: number
  /** Whether the room has music on. Off is remembered too. */
  music?: boolean
}

const NAMES = [
  'Pickle', 'Biscuit', 'Moth', 'Sprout', 'Waffle', 'Nutmeg', 'Pepper', 'Clove',
  'Bramble', 'Fig', 'Olive', 'Pumpkin', 'Marmalade', 'Truffle', 'Bean', 'Toast',
  'Custard', 'Barnaby', 'Winnie', 'Mabel', 'Otto', 'Hazel', 'Percy', 'Dot',
  'Rufus', 'Poppy', 'Alfie', 'Willow', 'Boots', 'Domino', 'Tuppence', 'Crumpet',
  'Noodle', 'Dumpling', 'Scout', 'Bandit', 'Peanut', 'Mango', 'Juniper', 'Sailor',
]

function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let left = n
  for (const [value, numeral] of table) {
    while (left >= value) {
      out += numeral
      left -= value
    }
  }
  return out
}

/** No two animals of yours are ever called the same thing. */
export function pickName(used: string[]): string {
  const free = NAMES.filter((n) => !used.includes(n))
  if (free.length) return free[Math.floor(Math.random() * free.length)]
  for (let numeral = 2; numeral < 500; numeral++) {
    const tier = NAMES.map((n) => `${n} ${roman(numeral)}`).filter((n) => !used.includes(n))
    if (tier.length) return tier[Math.floor(Math.random() * tier.length)]
  }
  return `${NAMES[0]} ${Date.now()}`
}

export function makePet(species: SpeciesKey, used: string[], id: number, now: number): Pet {
  const s = SPECIES_BY_KEY[species]
  return {
    id,
    name: pickName(used),
    species,
    coat: s.coats[Math.floor(Math.random() * s.coats.length)],
    needs: { food: 78, water: 74, play: 70, rest: 82, care: 76 },
    x: FLOOR.x0 + Math.random() * (FLOOR.x1 - FLOOR.x0),
    y: FLOOR.y0 + Math.random() * (FLOOR.y1 - FLOOR.y0),
    going: null,
    busyUntil: 0,
    broughtHome: now,
  }
}

export function initialPets(): PetSave {
  const now = Date.now()
  const first = makePet('kitten', [], 1, now)
  return {
    pets: [first],
    tiers: { bowl: 0, trough: 0, bed: 0, toy: 0, brush: 0, perch: 0 },
    usedNames: [first.name],
    nextId: 2,
    tickedAt: now,
    looked: 0,
    music: true,
  }
}

/* ------------------------------------------------------------------ */
/* How they are getting on                                             */
/* ------------------------------------------------------------------ */

/** How nice the room is, from what you have bought for it. */
export function comfort(tiers: Record<SlotKey, number>): number {
  return SLOTS.reduce((n, slot) => n + (slot.tiers[tiers[slot.key] ?? 0]?.joy ?? 0), 0)
}

/**
 * How happy one animal is, 0 to 100.
 *
 * Mostly whether its meters are up, but a well furnished room lifts the
 * whole household - which is the point of buying anything.
 */
export function happiness(pet: Pet, tiers: Record<SlotKey, number>): number {
  const met = NEEDS.reduce((n, need) => n + pet.needs[need.key], 0) / NEEDS.length
  const loves = SPECIES_BY_KEY[pet.species]?.loves
  const favourite = loves ? pet.needs[loves] : 100
  return Math.max(0, Math.min(100, met * 0.72 + favourite * 0.12 + comfort(tiers) * 0.5))
}

/**
 * What one go at something is worth, in coins.
 *
 * Raised sharply from where this started: at the old rate a go paid six
 * coins and the whole shop took a hundred minutes of solid tapping,
 * against thirty-odd for every other trade on the homestead.
 */
export function payFor(before: number, tier: Tier): number {
  // Catching something before it gets desperate is worth more than a rescue.
  const need = Math.max(0, 100 - before) / 100
  return Math.round(5 + need * 20 + tier.joy * 0.7)
}

/** What you get for the thing you are replacing. */
export function resaleOf(slot: Slot, owned: number): number {
  return slot.tiers[owned]?.resale ?? 0
}

export function petsPending(s: PetSave | undefined) {
  if (!s) return null
  const wanting = (s.pets ?? []).filter((p) =>
    NEEDS.some((n) => p.needs[n.key] < 30)
  ).length
  return wanting > 0 ? { count: wanting, urgent: true } : null
}
