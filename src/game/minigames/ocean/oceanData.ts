/**
 * Ocean Explorers - the rules, the sea life, and the map.
 *
 * This game is deliberately sealed off from the rest of the homestead. It
 * does not touch the shared crate, it is not in the trade list, and its
 * pearls live in its own save rather than in a purse, so nothing here can
 * be gifted to, spent on, or earned from any other game. The pond's
 * fishing game and this one share no code and no data on purpose.
 *
 * Everything in this file is pure. The living world - where each fish is
 * right now, how much air is left - is rebuilt every dive and never saved,
 * because a dive is a single sitting rather than something that keeps
 * running while you are away.
 */

/**
 * The sea in three axes: x runs out from the shore, y is depth, z runs
 * along the coast. You are inside it looking out, so everything is
 * projected from where your eyes are rather than drawn side-on.
 */
export const WORLD = { width: 3600, height: 2600, depth: 3000 }
/** Internal canvas size. CSS scales it down to fit, as the map does. */
export const VIEW = { width: 960, height: 640 }
/** Where the water starts. Above this line is air. */
export const SURFACE_Y = 70
/** Four pixels to the metre, so the trench floor sits around 630m. */
export const PX_PER_M = 4

export function depthMetres(y: number): number {
  return Math.max(0, Math.round((y - SURFACE_Y) / PX_PER_M))
}

/* ------------------------------------------------------------------ */
/* The shelf                                                           */
/* ------------------------------------------------------------------ */

/**
 * The seabed shelves away from the shore, so swimming out to sea is the
 * same movement as going down. That keeps every depth reachable along the
 * bottom instead of stranding the deep zones in open water, and it gives
 * the landmarks somewhere to actually sit.
 */
export const SHELF_TOP = 300
export const SHELF_BOTTOM = 2560

export function floorHeightAt(worldX: number): number {
  const t = Math.min(1, Math.max(0, worldX / WORLD.width))
  return (
    SHELF_TOP +
    t * (SHELF_BOTTOM - SHELF_TOP) +
    Math.sin(worldX * 0.0023) * 40 +
    Math.sin(worldX * 0.0071 + 1.3) * 16
  )
}

/** The nearest-to-shore point where the water is at least this deep. */
export function shoreEdgeFor(depthY: number): number {
  const t = (depthY - SHELF_TOP) / (SHELF_BOTTOM - SHELF_TOP)
  return Math.min(WORLD.width - 80, Math.max(0, t * WORLD.width) + 70)
}

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

export interface Zone {
  key: string
  label: string
  /** World y at which this zone begins. */
  top: number
  /** How dark the water is here, 0 (bright) to 1 (pitch black). */
  gloom: number
  water: string
}

export const ZONES: Zone[] = [
  { key: 'shallows', label: 'Sunlit Shallows', top: SURFACE_Y, gloom: 0, water: '#3fa9d6' },
  { key: 'reef', label: 'The Reef', top: 620, gloom: 0.12, water: '#2b86b8' },
  { key: 'twilight', label: 'Twilight Water', top: 1200, gloom: 0.45, water: '#1b5b8a' },
  { key: 'deep', label: 'The Deep', top: 1750, gloom: 0.76, water: '#123f63' },
  { key: 'trench', label: 'The Trench', top: 2200, gloom: 0.94, water: '#0a2138' },
]

export function zoneAt(y: number): Zone {
  let found = ZONES[0]
  for (const z of ZONES) if (y >= z.top) found = z
  return found
}

/** Smooth darkness between zone boundaries, so light fades rather than steps. */
export function gloomAt(y: number): number {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    const z = ZONES[i]
    if (y < z.top) continue
    const next = ZONES[i + 1]
    if (!next) return z.gloom
    const t = Math.min(1, Math.max(0, (y - z.top) / (next.top - z.top)))
    return z.gloom + (next.gloom - z.gloom) * t
  }
  return 0
}

/* ------------------------------------------------------------------ */
/* Swell                                                               */
/* ------------------------------------------------------------------ */

/**
 * How high the water stands at a point, right now.
 *
 * Three crossing swells rather than one, so the sea never reads as a
 * single rolling sine. Everything that touches the surface reads from
 * here - the surface mesh, the ships riding it, and you when you float -
 * so they all move together instead of sliding through each other.
 */
/**
 * How big the sea is running, here and now: 0 for a flat patch, 1 for the
 * heaviest set. Very long wavelengths and a very slow drift, so it reads
 * as weather moving across the water rather than as noise.
 */
export function seaState(x: number, z: number, t: number): number {
  const a = Math.sin(x * 0.00035 + t * 0.00013)
  const b = Math.sin(z * 0.00027 - t * 0.00009)
  const c = Math.sin((x - z) * 0.00019 + t * 0.00006)
  return Math.max(0, Math.min(1, (a + b + c + 2.2) / 4.4))
}

/** The swell before the sea state is applied. Peaks at about 37. */
function swellAt(x: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.0042 + t * 0.0011) * 15 +
    Math.sin(z * 0.0031 - t * 0.0009) * 11 +
    Math.sin((x + z) * 0.0016 + t * 0.0006) * 8 +
    // A little chop on top of the swell, so crests are not all identical.
    Math.sin(x * 0.011 - t * 0.0021) * 3
  )
}

/**
 * Wave height at a point.
 *
 * The swell is scaled by the sea state, so the same water runs from a
 * gentle ripple up to five times that in the heavy sets - the sea is
 * never one uniform size for long.
 */
export function waveAt(x: number, z: number, t: number): number {
  return swellAt(x, z, t) * (1 + 4 * seaState(x, z, t))
}

/**
 * Where the water actually is at a point, crest or trough included.
 *
 * Whether you are above or below the sea has to be judged against this
 * rather than the mean level, or a wave can never break over your head.
 */
export function surfaceAt(x: number, z: number, t: number): number {
  return SURFACE_Y + waveAt(x, z, t)
}

/* ------------------------------------------------------------------ */
/* Shipping                                                            */
/* ------------------------------------------------------------------ */

export interface Ship {
  key: string
  label: string
  art: 'rowboat' | 'smack' | 'sloop' | 'schooner' | 'trawler' | 'steamer'
  /** Stem to stern, in world units. */
  length: number
  x: number
  z: number
  /** Bearing it is making, and how fast. */
  heading: number
  speed: number
  bounty: number
  note: string
}

export const SHIPS: Ship[] = [
  { key: 'rowboat', label: 'Rowing Boat', art: 'rowboat', length: 90, x: 420, z: 700, heading: 1.1, speed: 5, bounty: 16, note: 'Someone out alone, a long way from the beach.' },
  { key: 'smack', label: 'Fishing Smack', art: 'smack', length: 150, x: 1150, z: 1900, heading: 2.4, speed: 9, bounty: 24, note: 'Nets over the side and gulls arguing above it.' },
  { key: 'sloop', label: 'Sloop', art: 'sloop', length: 190, x: 1900, z: 600, heading: 4.0, speed: 14, bounty: 34, note: 'Heeled right over and making good time.' },
  { key: 'trawler', label: 'Trawler', art: 'trawler', length: 260, x: 2450, z: 2200, heading: 0.4, speed: 11, bounty: 46, note: 'Working her gear, and nothing else on her mind.' },
  { key: 'schooner', label: 'Schooner', art: 'schooner', length: 320, x: 3050, z: 1200, heading: 3.3, speed: 16, bounty: 62, note: 'Two masts of canvas. You can hear the rigging.' },
  { key: 'steamer', label: 'Steamer', art: 'steamer', length: 460, x: 3350, z: 2500, heading: 5.1, speed: 20, bounty: 88, note: 'A rust-streaked hull and a column of smoke.' },
]

export const SHIP_BY_KEY: Record<string, Ship> = Object.fromEntries(
  SHIPS.map((s) => [s.key, s])
)

/* ------------------------------------------------------------------ */
/* Sea life                                                            */
/* ------------------------------------------------------------------ */

/** Silhouettes. Each one draws differently enough to tell apart in gloom. */
export type Form =
  | 'torpedo'
  | 'round'
  | 'flat'
  | 'eel'
  | 'lantern'
  | 'jelly'
  | 'turtle'
  | 'ray'
  | 'squid'
  | 'octopus'
  | 'mammal'

export interface Species {
  key: string
  label: string
  form: Form
  /** Depth band it lives in, in world pixels. */
  min: number
  max: number
  /** Nose-to-tail length in world pixels. */
  length: number
  /** Cruising speed, pixels per second. */
  speed: number
  /** How easily spooked, 0 (placid) to 1 (bolts on sight). */
  wary: number
  /** Pearls for landing one. */
  pearls: number
  /** Pearls the first time you get a good look at one. */
  bounty: number
  /** How many turn up together. */
  school: number
  body: string
  belly: string
  /** Lights of its own - visible in the dark without a lamp. */
  glow?: string
  /**
   * Protected: these are logged by swimming up to them, never speared.
   * The pond game is for fish you catch; the ones you only ever meet
   * belong here instead.
   */
  guarded?: boolean
  note: string
}

export const SPECIES: Species[] = [
  // Sunlit shallows
  { key: 'sardine', label: 'Sardine', form: 'torpedo', min: 90, max: 620, length: 16, speed: 74, wary: 0.55, pearls: 1, bounty: 4, school: 9, body: '#9fc6d8', belly: '#e8f2f6', note: 'Turns as one with the whole shoal.' },
  { key: 'clownfish', label: 'Clownfish', form: 'round', min: 140, max: 700, length: 20, speed: 46, wary: 0.62, pearls: 3, bounty: 8, school: 3, body: '#e8873a', belly: '#fdf3e2', note: 'Never strays far from an anemone.' },
  { key: 'tang', label: 'Yellow Tang', form: 'flat', min: 160, max: 720, length: 24, speed: 52, wary: 0.5, pearls: 4, bounty: 9, school: 4, body: '#e8c53a', belly: '#f6e39a', note: 'Flat as a coin, bright as one too.' },
  { key: 'parrotfish', label: 'Parrotfish', form: 'round', min: 220, max: 820, length: 38, speed: 40, wary: 0.38, pearls: 7, bounty: 12, school: 2, body: '#3fb894', belly: '#9ee0c8', note: 'You can hear it crunching coral.' },
  { key: 'bass', label: 'Sea Bass', form: 'torpedo', min: 260, max: 900, length: 42, speed: 56, wary: 0.44, pearls: 8, bounty: 12, school: 1, body: '#6b7f6a', belly: '#cfd8c4', note: 'Hangs still, then gone.' },

  // The reef
  { key: 'mackerel', label: 'Mackerel', form: 'torpedo', min: 500, max: 1250, length: 28, speed: 88, wary: 0.7, pearls: 5, bounty: 10, school: 7, body: '#4a7fa8', belly: '#dce8ef', note: 'Fast, and it knows it.' },
  { key: 'snapper', label: 'Red Snapper', form: 'round', min: 620, max: 1300, length: 44, speed: 54, wary: 0.5, pearls: 10, bounty: 14, school: 2, body: '#c2452f', belly: '#f0c0ae', note: 'Holds its ground longer than most.' },
  { key: 'barracuda', label: 'Barracuda', form: 'eel', min: 700, max: 1450, length: 78, speed: 104, wary: 0.3, pearls: 18, bounty: 20, school: 1, body: '#8d99a4', belly: '#e2e8ec', note: 'Curious about you, which is unsettling.' },
  { key: 'turtle', label: 'Green Turtle', form: 'turtle', min: 240, max: 1100, length: 66, speed: 30, wary: 0.14, pearls: 0, bounty: 44, school: 1, body: '#5f8f4f', belly: '#cbd8a8', guarded: true, note: 'Protected. Swim alongside, nothing more.' },
  { key: 'ray', label: 'Manta Ray', form: 'ray', min: 560, max: 1500, length: 96, speed: 42, wary: 0.2, pearls: 0, bounty: 54, school: 1, body: '#2f3f52', belly: '#e8eef2', guarded: true, note: 'Protected. It banks past like weather.' },
  { key: 'dolphin', label: 'Dolphin', form: 'mammal', min: 90, max: 800, length: 88, speed: 118, wary: 0.24, pearls: 0, bounty: 56, school: 3, body: '#6b7d8d', belly: '#eef3f6', guarded: true, note: 'Protected. It circles back to look at you.' },

  // Twilight
  { key: 'jelly', label: 'Moon Jelly', form: 'jelly', min: 900, max: 1900, length: 34, speed: 16, wary: 0.06, pearls: 0, bounty: 30, school: 5, body: '#b8a8d8', belly: '#e6dcf2', glow: '#c9b8ec', guarded: true, note: 'Protected. Drifts wherever the water goes.' },
  { key: 'octopus', label: 'Octopus', form: 'octopus', min: 1000, max: 1900, length: 52, speed: 34, wary: 0.66, pearls: 0, bounty: 58, school: 1, body: '#a8556a', belly: '#e0a8b4', guarded: true, note: 'Protected. It saw you first.' },
  { key: 'lanternfish', label: 'Lanternfish', form: 'lantern', min: 1150, max: 2000, length: 22, speed: 62, wary: 0.6, pearls: 13, bounty: 26, school: 6, body: '#3a4a5a', belly: '#7fa8c2', glow: '#8fe0d8', note: 'A row of little portholes down its side.' },
  { key: 'hatchetfish', label: 'Hatchetfish', form: 'flat', min: 1250, max: 2050, length: 20, speed: 44, wary: 0.72, pearls: 15, bounty: 28, school: 4, body: '#c2cbd4', belly: '#f2f6f8', glow: '#a8d8e0', note: 'Silver and thin as a blade.' },
  { key: 'grouper', label: 'Giant Grouper', form: 'round', min: 1300, max: 2100, length: 108, speed: 32, wary: 0.28, pearls: 24, bounty: 36, school: 1, body: '#5a5140', belly: '#b8ac90', note: 'Enormous, and in no hurry at all.' },

  // The deep
  { key: 'swordfish', label: 'Swordfish', form: 'torpedo', min: 1500, max: 2200, length: 124, speed: 132, wary: 0.42, pearls: 32, bounty: 44, school: 1, body: '#3f5f7a', belly: '#cfdce6', note: 'Comes past like a thrown spear.' },
  { key: 'anglerfish', label: 'Anglerfish', form: 'lantern', min: 1900, max: 2500, length: 46, speed: 26, wary: 0.34, pearls: 48, bounty: 58, school: 1, body: '#2b2f3a', belly: '#4a5060', glow: '#e8d87a', note: 'The little light is the invitation.' },
  { key: 'gulper', label: 'Gulper Eel', form: 'eel', min: 2000, max: 2560, length: 96, speed: 38, wary: 0.4, pearls: 55, bounty: 62, school: 1, body: '#241f2e', belly: '#4a3f56', glow: '#d87ac2', note: 'Mostly mouth, mostly hunger.' },
  { key: 'oarfish', label: 'Oarfish', form: 'eel', min: 2050, max: 2560, length: 190, speed: 30, wary: 0.22, pearls: 70, bounty: 80, school: 1, body: '#b8bcc8', belly: '#e8ecf2', glow: '#d9587f', note: 'Longer than your boat. Sailors called it a serpent.' },
  { key: 'squid', label: 'Giant Squid', form: 'squid', min: 2150, max: 2560, length: 168, speed: 58, wary: 0.5, pearls: 0, bounty: 130, school: 1, body: '#8a3f52', belly: '#c2707f', guarded: true, note: 'Protected, and frankly beyond you. Log it and go.' },
]

export const SPECIES_BY_KEY: Record<string, Species> = Object.fromEntries(
  SPECIES.map((s) => [s.key, s])
)

/**
 * The zone a species belongs to for the logbook: where the middle of its
 * band sits, not the top. Anchoring on the top of the band left the
 * trench empty even though four of these live down there, because every
 * one of them also ranges up into the deep.
 */
export function homeZone(sp: Species): Zone {
  return zoneAt((sp.min + sp.max) / 2)
}

/** Everything that could be living at this depth. */
export function speciesAt(y: number): Species[] {
  return SPECIES.filter((s) => y >= s.min && y <= s.max)
}

/* ------------------------------------------------------------------ */
/* Landmarks - the reason to swim somewhere with no fish in it         */
/* ------------------------------------------------------------------ */

export interface Landmark {
  key: string
  label: string
  x: number
  /** Along the coast. */
  z: number
  y: number
  /** How close you must get for it to count as found. */
  radius: number
  pearls: number
  art: 'wreck' | 'kelp' | 'coral' | 'vent' | 'cave' | 'anchor' | 'amphora' | 'statue' | 'whalefall'
  note: string
}

/** Placed by how far out they are; the shelf decides how deep that is. */
function onBed(x: number): number {
  return floorHeightAt(x) - 34
}

export const LANDMARKS: Landmark[] = [
  { key: 'kelp', label: 'Kelp Forest', z: 900, x: 300, y: onBed(300), radius: 150, pearls: 12, art: 'kelp', note: 'Green light and long shadows.' },
  { key: 'coral', label: 'Coral Garden', z: 2100, x: 900, y: onBed(900), radius: 150, pearls: 18, art: 'coral', note: 'Every colour the sea has.' },
  { key: 'anchor', label: 'Lost Anchor', z: 600, x: 1320, y: onBed(1320), radius: 130, pearls: 24, art: 'anchor', note: 'Someone left in a hurry.' },
  { key: 'amphora', label: 'Amphora Field', z: 1750, x: 1700, y: onBed(1700), radius: 140, pearls: 32, art: 'amphora', note: 'Wine jars, still stacked in rows.' },
  { key: 'wreck', label: 'The Wreck', z: 1150, x: 2080, y: onBed(2080), radius: 200, pearls: 60, art: 'wreck', note: 'Ribs of a hull, half swallowed by sand.' },
  { key: 'statue', label: 'Sunken Statue', z: 2450, x: 2480, y: onBed(2480), radius: 140, pearls: 75, art: 'statue', note: 'A face, worn smooth, still looking up.' },
  { key: 'cave', label: 'Blue Cave', z: 700, x: 2860, y: onBed(2860), radius: 160, pearls: 120, art: 'cave', note: 'The dark goes further back than your lamp.' },
  { key: 'whalefall', label: 'Whale Fall', z: 1900, x: 3180, y: onBed(3180), radius: 170, pearls: 160, art: 'whalefall', note: 'A whole ecosystem living off one death.' },
  { key: 'vent', label: 'Hydrothermal Vent', z: 1400, x: 3450, y: onBed(3450), radius: 160, pearls: 240, art: 'vent', note: 'Black smoke, and the water shivers with heat.' },
]

/* ------------------------------------------------------------------ */
/* Gear                                                                */
/* ------------------------------------------------------------------ */

export interface GearLevel {
  label: string
  cost: number
  value: number
  blurb: string
}

/** Swim speed, pixels per second. */
export const FINS: GearLevel[] = [
  { label: 'Bare Feet', cost: 0, value: 128, blurb: 'You kick, and eventually you move.' },
  { label: 'Rubber Fins', cost: 60, value: 168, blurb: 'Proper kick at last.' },
  { label: 'Long Blades', cost: 190, value: 212, blurb: 'Long, stiff, and quick off the mark.' },
  { label: 'Monofin', cost: 480, value: 268, blurb: 'One kick carries you half a length.' },
]

/**
 * How far you can make anything out through the murk, in world units.
 * Underwater the thing you are really short of is not air but distance -
 * you can only ever see a little way, and better glass buys you more of
 * the sea at once.
 */
export const MASKS: GearLevel[] = [
  { label: 'Borrowed Goggles', cost: 0, value: 620, blurb: 'Blurred, and they leak.' },
  { label: 'Rubber Mask', cost: 90, value: 880, blurb: 'A clear pane and a proper seal.' },
  { label: 'Wide Lens', cost: 260, value: 1180, blurb: 'You see a shoal before it sees you.' },
  { label: 'Panoramic Mask', cost: 600, value: 1560, blurb: 'The whole water, all at once.' },
]

/** Lamp reach, pixels. */
export const LAMPS: GearLevel[] = [
  { label: 'No Lamp', cost: 0, value: 74, blurb: 'Whatever daylight gets down to you.' },
  { label: 'Hand Torch', cost: 80, value: 168, blurb: 'A yellow cone and a lot of dark.' },
  { label: 'Dive Lantern', cost: 240, value: 268, blurb: 'You can see a wreck before you hit it.' },
  { label: 'Arc Floodlight', cost: 560, value: 392, blurb: 'Daylight, carried down by hand.' },
]

/**
 * How far the spear reaches. Set long on purpose: you can see a great
 * deal further than you can swim, and having to close right up on a fish
 * that bolts the moment you move was simply annoying. Even the starting
 * line takes anything you can properly make out.
 */
export const SPEARS: GearLevel[] = [
  { label: 'Hand Line', cost: 0, value: 260, blurb: 'Short, but it does reach.' },
  { label: 'Hawaiian Sling', cost: 70, value: 400, blurb: 'Takes fish you would have had to chase.' },
  { label: 'Speargun', cost: 220, value: 580, blurb: 'Most of what you can see is now in range.' },
  { label: 'Pneumatic Gun', cost: 520, value: 820, blurb: 'If you can see it, you can take it.' },
]

export const GEAR = {
  fins: { list: FINS, label: 'Fins', unit: 'speed' },
  mask: { list: MASKS, label: 'Mask', unit: 'view' },
  lamp: { list: LAMPS, label: 'Lamp', unit: 'reach' },
  spear: { list: SPEARS, label: 'Spear', unit: 'reach' },
} as const

export type GearKey = keyof typeof GEAR

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export interface OceanSave {
  /** This game's own currency. Deliberately not a purse in the store. */
  pearls: number
  fins: number
  mask: number
  lamp: number
  spear: number
  /** Species keys you have had a proper look at. */
  seen: string[]
  /** Landmark keys you have swum into. */
  found: string[]
  /** Ships you have come up alongside. */
  ships: string[]
  /** How many of each species you have landed. */
  caught: Record<string, number>
  /** Deepest you have ever been, in metres. */
  deepest: number
  dives: number
}

export function initialOcean(): OceanSave {
  return { pearls: 0, fins: 0, mask: 0, lamp: 0, spear: 0, seen: [], found: [], ships: [], caught: {}, deepest: 0, dives: 0 }
}

export function gearValue(save: OceanSave, key: GearKey): number {
  const list = GEAR[key].list
  return list[Math.min(save[key] ?? 0, list.length - 1)].value
}

/**
 * How close something must be before you can tell what it is. Derived
 * from the mask, so better glass fills the logbook faster as well as
 * showing you more water.
 */
export function identifyRange(save: OceanSave): number {
  return gearValue(save, 'mask') * 0.42
}

/**
 * How near you can get before a fish bolts. Barging about scares
 * everything off, so drifting in slowly is the whole skill of it.
 */
export function fleeRange(sp: Species, diverSpeed: number, maxSpeed: number): number {
  const haste = Math.min(1, diverSpeed / Math.max(1, maxSpeed))
  return sp.wary * (34 + haste * 150)
}

/** Total pearls the logbook represents, for the summary line. */
export function logbookValue(save: OceanSave): number {
  const sightings = save.seen.reduce((n, k) => n + (SPECIES_BY_KEY[k]?.bounty ?? 0), 0)
  const places = save.found.reduce((n, k) => n + (LANDMARKS.find((l) => l.key === k)?.pearls ?? 0), 0)
  return sightings + places
}
