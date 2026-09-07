/**
 * Wild Horses - the country, the herds, and what it takes to gentle one.
 *
 * Open grassland with nobody else in it. You come on horses at a
 * distance, and the whole skill is the approach: they watch you, and
 * they mind how fast you move far more than how close you are. Stand
 * still and they settle. Rush them and they are gone over the hill.
 *
 * Everything here is pure, so the taming rules can be run headless.
 */

/** Twelve units to the metre, so a horse is about thirty units long. */
export const METRE = 12

export const WORLD = { width: 12000, depth: 12000 }
export const VIEW = { width: 960, height: 640 }

/** How far you can see across open country. */
export const BASE_SIGHT = 3800

/* ------------------------------------------------------------------ */
/* The ground                                                          */
/* ------------------------------------------------------------------ */

/**
 * Height of the land. Negative is uphill, because these games all use a
 * downward y - the same convention as the sea floor next door.
 */
export function groundAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.00055 + 1.2) * 140 +
    Math.sin(z * 0.00043) * 110 +
    Math.sin((x + z) * 0.00027) * 80 +
    Math.sin(x * 0.0016 - z * 0.0011) * 26
  )
}

/** Eye heights, in world units above the turf. */
export const EYE_WALKING = 1.7 * METRE
export const EYE_MOUNTED = 2.7 * METRE

/* ------------------------------------------------------------------ */
/* Horses                                                              */
/* ------------------------------------------------------------------ */

export interface Breed {
  key: string
  label: string
  /** How readily it spooks, 0 placid to 1 flighty. */
  wary: number
  /** Top speed under saddle, units per second. */
  speed: number
  /** Seconds of flat gallop before it has to drop to a trot. */
  stamina: number
  /** How hard it fights the rope once you have it. */
  toughness: number
  /** Nose to tail, in world units. */
  length: number
  /** What a grown one of her fetches. */
  worth: number
  note: string
}

export const BREEDS: Breed[] = [
  { key: 'fjord', label: 'Fjord', wary: 0.22, speed: 470, stamina: 16, toughness: 0.5, length: 27, worth: 59, note: 'Short, thick-necked and almost impossible to rattle.' },
  { key: 'mustang', label: 'Mustang', wary: 0.55, speed: 560, stamina: 13, toughness: 1.0, length: 29, worth: 85, note: 'Born wild and in no hurry to stop being wild.' },
  { key: 'paint', label: 'Paint', wary: 0.44, speed: 540, stamina: 13, toughness: 0.8, length: 29, worth: 78, note: 'Patched like spilt milk, and steadier than she looks.' },
  { key: 'appaloosa', label: 'Appaloosa', wary: 0.5, speed: 570, stamina: 14, toughness: 0.9, length: 30, worth: 91, note: 'Spotted over the rump, and watches you the whole time.' },
  { key: 'andalusian', label: 'Andalusian', wary: 0.38, speed: 610, stamina: 15, toughness: 0.75, length: 31, worth: 124, note: 'Moves as though somebody is watching. Somebody usually is.' },
  { key: 'arabian', label: 'Arabian', wary: 0.72, speed: 680, stamina: 19, toughness: 1.25, length: 28, worth: 163, note: 'Dish-faced, high-tailed, and gone before you have decided.' },
  { key: 'akhal', label: 'Akhal-Teke', wary: 0.8, speed: 720, stamina: 18, toughness: 1.4, length: 30, worth: 208, note: 'A coat like poured metal. The hardest of the lot to hold.' },
  { key: 'shire', label: 'Shire', wary: 0.18, speed: 380, stamina: 22, toughness: 0.6, length: 34, worth: 72, note: 'Enormous, feathered at the heel, and entirely unbothered.' },
]

export const BREED_BY_KEY: Record<string, Breed> = Object.fromEntries(
  BREEDS.map((b) => [b.key, b])
)

export interface Coat {
  key: string
  label: string
  body: string
  mane: string
  /** Dapples, patches or spots drawn over the body. */
  pattern?: 'patches' | 'spots' | 'dapples'
  /** Uncommon colouring is worth more to a buyer. */
  rarity?: number
}

export const COATS: Coat[] = [
  { key: 'bay', label: 'Bay', body: '#8a5326', mane: '#2b1f16' },
  { key: 'chestnut', label: 'Chestnut', body: '#a8552b', mane: '#8a4020' },
  { key: 'black', label: 'Black', body: '#2f2823', mane: '#1a1512' },
  { key: 'grey', label: 'Grey', body: '#9a9aa0', mane: '#6f6f76', pattern: 'dapples' , rarity: 1.1 },
  { key: 'palomino', label: 'Palomino', body: '#c9964a', mane: '#efe6cd' , rarity: 1.3 },
  { key: 'buckskin', label: 'Buckskin', body: '#bd9257', mane: '#2b1f16' , rarity: 1.15 },
  { key: 'roan', label: 'Strawberry roan', body: '#b07f72', mane: '#7a5248', pattern: 'dapples' , rarity: 1.2 },
  { key: 'dun', label: 'Dun', body: '#c2a878', mane: '#5a4632' , rarity: 1.15 },
  { key: 'piebald', label: 'Piebald', body: '#2f2823', mane: '#efe6cd', pattern: 'patches' , rarity: 1.3 },
  { key: 'appaloosa', label: 'Blanket', body: '#7a6a5e', mane: '#3a3129', pattern: 'spots' , rarity: 1.35 },
  { key: 'cream', label: 'Cremello', body: '#e2d3b4', mane: '#cbb894' , rarity: 1.4 },
]

export const COAT_BY_KEY: Record<string, Coat> = Object.fromEntries(
  COATS.map((c) => [c.key, c])
)

/* ------------------------------------------------------------------ */
/* Young ones                                                          */
/* ------------------------------------------------------------------ */

export type Age = 'foal' | 'yearling' | 'grown'

/**
 * How long a young horse takes to come on, per stage.
 *
 * Stored as an absolute moment in the save rather than a countdown, so
 * it survives a reload - and because the homestead freezes a game's
 * clock while you are elsewhere, a foal only grows in the time you
 * actually spend out here with her.
 */
export const STAGE_MS = 200_000

export function ageOf(horse: StabledHorse, now: number): Age {
  const grown = horse.grownAt ?? 0
  if (!grown || now >= grown) return 'grown'
  return now >= grown - STAGE_MS ? 'yearling' : 'foal'
}

export function growthLeft(horse: StabledHorse, now: number): number {
  return Math.max(0, (horse.grownAt ?? 0) - now)
}

/**
 * How long a feed and a bucket last, in time spent out here.
 *
 * Five minutes each. A youngster that runs out of either stops coming on
 * until you see to her - she does not come to harm, she simply does not
 * grow, which is punishment enough for forgetting.
 *
 * Growing takes longer than one bucket on purpose. At the old minute-ish
 * timers a foal was hungry constantly; at five minutes against the old
 * growth she would have been grown before she was ever hungry once, and
 * the manger would have been scenery. She now comes on over about seven
 * minutes, so raising one asks you to see to her a couple of times and
 * no more than that.
 */
export const FEED_MS = 300_000
export const WATER_MS = 300_000

export function isYoung(horse: StabledHorse, now: number): boolean {
  return ageOf(horse, now) !== 'grown'
}

export interface Care {
  hungry: boolean
  thirsty: boolean
  /** 0 to 1, for the bucket levels in the stall. */
  feed: number
  water: number
}

export function careOf(horse: StabledHorse, now: number): Care {
  const feed = Math.max(0, Math.min(1, ((horse.fedUntil ?? 0) - now) / FEED_MS))
  const water = Math.max(0, Math.min(1, ((horse.wateredUntil ?? 0) - now) / WATER_MS))
  return { hungry: feed <= 0, thirsty: water <= 0, feed, water }
}

/**
 * What a horse would fetch.
 *
 * Catching and selling wild horses is the trade out here - it has to be,
 * because hunting is bought and there was otherwise no way on earth to
 * earn the price of the bow. Youngsters are worth a fraction of a grown
 * horse, so raising one on is worth real money as well as sentiment.
 */
export function horseValue(horse: StabledHorse, now: number): number {
  const breed = BREED_BY_KEY[horse.breed]
  const coat = COAT_BY_KEY[horse.coat]
  const age = ageOf(horse, now)
  const grown = age === 'grown' ? 1 : age === 'yearling' ? 0.68 : 0.44
  return Math.round((breed?.worth ?? 100) * (coat?.rarity ?? 1) * grown)
}

/** Paid the first time you catch each breed, whether you keep her or not. */
export const BREED_BOUNTY = 60

/** Is anything in the stable waiting on you? */
export function needsTending(stable: StabledHorse[], now: number): number {
  return stable.filter((h) => {
    if (!isYoung(h, now)) return false
    const c = careOf(h, now)
    return c.hungry || c.thirsty
  }).length
}

export const AGE_LABEL: Record<Age, string> = {
  foal: 'Foal',
  yearling: 'Yearling',
  grown: 'Grown',
}

/** A foal is smaller, slower, and has far less wind than her dam. */
export const FOAL_SCALE = 0.62
export const FOAL_SPEED = 0.66
export const FOAL_WIND = 0.45
export const FOAL_FIGHT = 0.5

/* ------------------------------------------------------------------ */
/* Catching one                                                        */
/* ------------------------------------------------------------------ */

/*
 * A wild horse does not come round to you because you stood politely in
 * a field. It sees you, it goes, and you have to run it down, get a rope
 * on it and stay on the end of that rope while it does everything it can
 * to be rid of you.
 *
 * So the whole thing is three problems in a row: close the distance,
 * make the throw, and hold on.
 */

/** How near you can get before it breaks and runs. */
export const NOTICE_RANGE = 480

/**
 * A galloping horse is faster than anything you have on foot, but it
 * cannot keep it up. Wind runs down while it flees and comes back when
 * you are off it, and a blown horse drops to this share of its speed -
 * which is the only reason you ever catch one.
 */
export const BLOWN_PACE = 0.42

/**
 * A spooked horse runs a burst and then turns to look at you, rather
 * than departing over the horizon for good. Without that the gap only
 * ever grows and there is no chase to be had - just a horse leaving.
 */
export const BURST_SECONDS = 1.3
/** Wind is spent this many times faster than it comes back. */
export function windDrain(breed: Breed): number {
  return 1 / (breed.stamina * 0.5)
}
export const WIND_RECOVER = 1 / 16

/** Seconds of holding on needed before a horse gives in. */
export function breakEffort(breed: Breed): number {
  return 3 + breed.toughness * 3.4
}

/**
 * The rope loses ground when you are not pulling, so letting go halfway
 * through costs you. Fall below nothing and it is gone.
 */
export const SLIP_RATE = 0.75

/* ------------------------------------------------------------------ */
/* Game worth hunting                                                  */
/* ------------------------------------------------------------------ */

export interface Quarry {
  key: string
  label: string
  art: 'hare' | 'deer' | 'boar' | 'pronghorn' | 'elk' | 'wolf'
  length: number
  speed: number
  /** How near you can get before it runs. */
  wary: number
  coins: number
  herd: number
  body: string
  belly: string
  note: string
}

export const QUARRY: Quarry[] = [
  { key: 'hare', label: 'Hare', art: 'hare', length: 9, speed: 320, wary: 0.8, coins: 8, herd: 2, body: '#a8896b', belly: '#e0d3bd', note: 'Sits still until it does not.' },
  { key: 'pronghorn', label: 'Pronghorn', art: 'pronghorn', length: 22, speed: 520, wary: 0.75, coins: 26, herd: 4, body: '#c2a878', belly: '#f2ece0', note: 'Faster than anything you will ever ride.' },
  { key: 'deer', label: 'Red Deer', art: 'deer', length: 26, speed: 400, wary: 0.6, coins: 34, herd: 3, body: '#9a6b42', belly: '#d6bfa0', note: 'Grazes the tree line at dusk.' },
  { key: 'boar', label: 'Wild Boar', art: 'boar', length: 24, speed: 300, wary: 0.35, coins: 42, herd: 2, body: '#4a3f38', belly: '#6b5c50', note: 'Would rather come at you than leave.' },
  { key: 'elk', label: 'Elk', art: 'elk', length: 34, speed: 380, wary: 0.5, coins: 66, herd: 2, body: '#7a5a3a', belly: '#c2a878', note: 'Antlers like a dead tree carried at speed.' },
  { key: 'wolf', label: 'Grey Wolf', art: 'wolf', length: 20, speed: 460, wary: 0.45, coins: 88, herd: 3, body: '#7a7a80', belly: '#c8c8cc', note: 'Where there is one there are four you cannot see.' },
]

export const QUARRY_BY_KEY: Record<string, Quarry> = Object.fromEntries(
  QUARRY.map((q) => [q.key, q])
)

/* ------------------------------------------------------------------ */
/* Kit                                                                 */
/* ------------------------------------------------------------------ */

export interface GearLevel {
  label: string
  cost: number
  value: number
  blurb: string
}

/**
 * How far you can throw, and how well you hold. `value` is the reach of
 * the throw in world units; `grip` is how fast you can work a roped
 * horse down.
 */
export interface RopeLevel extends GearLevel {
  grip: number
}

/*
 * Reach is set generously on purpose. A horse breaks and runs at about
 * five hundred units, so a rope you can only throw a few paces is a rope
 * you can never use - you cannot close that last stretch on something
 * that keeps bursting away from you. You need to be able to throw from a
 * decent distance and have the chase be about getting into that band.
 */
export const ROPES: RopeLevel[] = [
  { label: 'Coiled Rope', cost: 0, value: 520, grip: 1, blurb: 'It will reach. Whether it lands is another matter.' },
  { label: 'Lariat', cost: 110, value: 680, grip: 1.3, blurb: 'A proper loop - longer throws start landing.' },
  { label: 'Braided Lasso', cost: 320, value: 850, grip: 1.6, blurb: 'Rope one from further off than she will let you walk.' },
  { label: 'Horsehair Reata', cost: 700, value: 1050, grip: 2, blurb: 'Sixty feet of it, and it does not give.' },
]

export function lassoReach(save: HorseSave): number {
  return ROPES[Math.min(save.rope ?? 0, ROPES.length - 1)].value
}

export function lassoGrip(save: HorseSave): number {
  return ROPES[Math.min(save.rope ?? 0, ROPES.length - 1)].grip
}

/**
 * Whether a throw lands, by how far out you tried it.
 *
 * A hard range check was the wrong shape entirely: a horse breaks and
 * runs before you can reach the distance where the rope worked, so there
 * was never a throw to make. Distance is a risk instead - you can always
 * try, and the odds get better the closer you are. A miss costs you the
 * moment and puts her to flight, which is punishment enough.
 */
export function catchChance(distance: number, reach: number): number {
  if (distance > reach) return 0
  const t = distance / reach
  return Math.max(0.08, 1 - t * t * 0.95)
}

/** You cannot recoil and throw again instantly. */
export const THROW_COOLDOWN = 1.2

/** A better seat: faster under saddle, and longer in the wind. */
export const SADDLES: GearLevel[] = [
  { label: 'Bareback', cost: 0, value: 1, blurb: 'Knees and a fistful of mane.' },
  { label: 'Blanket & Girth', cost: 140, value: 1.12, blurb: 'Something between you and the withers.' },
  { label: 'Stock Saddle', cost: 400, value: 1.28, blurb: 'You can stay on all day.' },
  { label: 'Racing Rig', cost: 900, value: 1.45, blurb: 'Light, and built for going fast.' },
]

/**
 * Hunting is locked until you buy a bow - it is a thing you take up
 * rather than something you start with.
 */
export const BOWS: GearLevel[] = [
  { label: 'No Bow', cost: 0, value: 0, blurb: 'You are out here to watch, not to hunt.' },
  { label: 'Short Bow', cost: 180, value: 620, blurb: 'Takes hares and, with luck, a deer.' },
  { label: 'Hunting Bow', cost: 480, value: 980, blurb: 'Enough reach for the open ground.' },
  { label: 'Recurve', cost: 1100, value: 1450, blurb: 'Drops an elk across a valley.' },
]

/** Seeing further across open country. */
export const GLASSES: GearLevel[] = [
  { label: 'Naked Eye', cost: 0, value: 1, blurb: 'Good enough, most days.' },
  { label: 'Field Glass', cost: 220, value: 1.22, blurb: 'Pick a herd out of the haze.' },
  { label: 'Spyglass', cost: 560, value: 1.45, blurb: 'See the far side of the valley.' },
]

export const GEAR = {
  rope: { list: ROPES, label: 'Rope' },
  saddle: { list: SADDLES, label: 'Saddle' },
  bow: { list: BOWS, label: 'Bow' },
  glass: { list: GLASSES, label: 'Glass' },
} as const

export type GearKey = keyof typeof GEAR

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export interface StabledHorse {
  name: string
  breed: string
  coat: string
  /** When you got a rope on her. */
  tamedAt: number
  ridden: number
  /**
   * The moment she is fully grown. Absent or past means she already is.
   * Only young ones carry it, and it is pushed back whenever she is left
   * without feed or water.
   */
  grownAt?: number
  /** When the last feed runs out. Young ones only. */
  fedUntil?: number
  /** When the bucket runs dry. */
  wateredUntil?: number
}

export interface HorseSave {
  rope: number
  saddle: number
  bow: number
  glass: number
  /** Horses you have gentled, and can call to you. */
  stable: StabledHorse[]
  /** Names already used, so no two are ever alike. */
  usedNames: string[]
  /** Quarry taken, by species. */
  bag: Record<string, number>
  /** Breeds you have gentled at least one of. */
  breedsSeen: string[]
  outings: number
}

export function initialHorses(): HorseSave {
  return {
    rope: 0,
    saddle: 0,
    bow: 0,
    glass: 0,
    stable: [],
    usedNames: [],
    bag: {},
    breedsSeen: [],
    outings: 0,
  }
}

export function gearValue(save: HorseSave, key: GearKey): number {
  const list = GEAR[key].list
  return list[Math.min(save[key] ?? 0, list.length - 1)].value
}

export function sightRange(save: HorseSave): number {
  return BASE_SIGHT * gearValue(save, 'glass')
}

export function canHunt(save: HorseSave): boolean {
  return (save.bow ?? 0) > 0
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

const NAMES = [
  'Juniper', 'Bracken', 'Willow', 'Tamarisk', 'Sorrel', 'Cinder', 'Ash', 'Marigold',
  'Thistle', 'Barley', 'Comet', 'Kestrel', 'Merlin', 'Harrier', 'Osprey', 'Gale',
  'Tempest', 'Squall', 'Flint', 'Quartz', 'Slate', 'Amber', 'Saffron', 'Clover',
  'Nutmeg', 'Cardamom', 'Juno', 'Vesper', 'Aurora', 'Solstice', 'Equinox', 'Meridian',
  'Bramble', 'Foxglove', 'Larkspur', 'Yarrow', 'Rowan', 'Alder', 'Hazel', 'Linden',
  'Pilgrim', 'Wanderer', 'Drifter', 'Compass', 'Anchor', 'Beacon', 'Lantern', 'Ember',
  'Whisper', 'Rumour', 'Legend', 'Fable', 'Ballad', 'Sonnet', 'Verse', 'Chapter',
  'Copper', 'Pewter', 'Silver', 'Bronze',
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

/** A name no horse of yours has ever had. */
export function pickName(used: string[]): string {
  const free = NAMES.filter((n) => !used.includes(n))
  if (free.length) return free[Math.floor(Math.random() * free.length)]
  for (let numeral = 2; numeral < 500; numeral++) {
    const tier = NAMES.map((n) => `${n} ${roman(numeral)}`).filter((n) => !used.includes(n))
    if (tier.length) return tier[Math.floor(Math.random() * tier.length)]
  }
  return `${NAMES[0]} ${Date.now()}`
}

export function horsesPending(s: HorseSave | undefined, now: number) {
  if (!s) return null
  const waiting = needsTending(s.stable ?? [], now)
  // A youngster wanting her bucket is worth interrupting you for.
  if (waiting > 0) return { count: waiting, urgent: true }
  return (s.stable?.length ?? 0) === 0 ? { count: 1 } : null
}
