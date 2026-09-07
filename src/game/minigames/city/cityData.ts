/**
 * City Explorers - the streets, what is on them, and what is inside.
 *
 * The same first-person engine as the ocean and the wild country, but
 * you are flying, and the world is built rather than grown: a grid of
 * blocks, streets between them, and buildings standing up out of them
 * that you have to fly around rather than through.
 *
 * Everything here is pure. The city is generated from its coordinates
 * rather than stored, so it is the same city every time you come back
 * without anything having to be saved.
 */

export const METRE = 10
export const VIEW = { width: 960, height: 640 }

/** One block plus the street on two of its sides. */
export const BLOCK = 620
export const STREET = 150
export const GRID = 12

export const WORLD = { width: BLOCK * GRID, depth: BLOCK * GRID }

/** Road level. Down is positive, so a roof is a smaller number. */
export const GROUND = 0

/**
 * How high the pavement stands over the road.
 *
 * Small, but it is the thing that makes a street read as a street: you
 * step up onto the kerb, cars stay down on the tarmac, and people walk
 * along the raised bit.
 */
export const KERB = 7

/** The middle of the street is tarmac; the edges are pavement. */
export function isRoad(x: number, z: number): boolean {
  const ix = ((x % BLOCK) + BLOCK) % BLOCK
  const iz = ((z % BLOCK) + BLOCK) % BLOCK
  const alongX = iz < STREET && iz > STREET * 0.26 && iz < STREET * 0.74
  const alongZ = ix < STREET && ix > STREET * 0.26 && ix < STREET * 0.74
  return alongX || alongZ
}

/** How high the ground is where you are standing. */
export function groundHeightAt(x: number, z: number): number {
  return isRoad(x, z) ? GROUND : GROUND - KERB
}

/** Is this spot pavement you could walk along? */
export function isPavement(x: number, z: number): boolean {
  const ix = ((x % BLOCK) + BLOCK) % BLOCK
  const iz = ((z % BLOCK) + BLOCK) % BLOCK
  return (ix < STREET || iz < STREET) && !isRoad(x, z)
}

/** The centreline of the nearest road running each way. */
export function laneCentre(v: number): number {
  return Math.floor(v / BLOCK) * BLOCK + STREET / 2
}
/** You cannot fly below the pavement or above the weather. */
export const CEILING = -1500

export const BASE_SIGHT = 5200

/* ------------------------------------------------------------------ */
/* Making the city                                                     */
/* ------------------------------------------------------------------ */

function hash2(x: number, z: number, salt = 0): number {
  const s = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453
  return s - Math.floor(s)
}

export type BlockKind = 'buildings' | 'park' | 'playground' | 'plaza'

/** What sort of block sits at these grid coordinates. */
export function blockKind(bx: number, bz: number): BlockKind {
  const h = hash2(bx, bz, 3)
  if (h > 0.88) return 'playground'
  if (h > 0.74) return 'park'
  if (h > 0.68) return 'plaza'
  return 'buildings'
}

export interface Building {
  /** Centre of the footprint. */
  x: number
  z: number
  /** Half-width and half-depth. */
  hw: number
  hd: number
  /** How tall, in world units. */
  height: number
  wall: string
  roof: string
  /** Which sort of place it is, if you can get inside it. */
  interior: string | null
  /** Where the door is, in world coordinates. */
  doorX: number
  doorZ: number
  key: string
}

const WALLS = ['#9a8c7a', '#8a7f74', '#a89478', '#7f8a90', '#8f7d72', '#a09a8c', '#6f7a82']
const ROOFS = ['#4a4a52', '#5a4a42', '#3f4a52', '#54504a']

/** The buildings on one block, worked out from where the block is. */
export function buildingsIn(bx: number, bz: number): Building[] {
  if (blockKind(bx, bz) !== 'buildings') return []
  const out: Building[] = []
  const x0 = bx * BLOCK + STREET / 2
  const z0 = bz * BLOCK + STREET / 2
  const span = BLOCK - STREET

  // Two by two, with each plot built on or left as a yard.
  const cells = 2
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const h = hash2(bx * 10 + i, bz * 10 + j, 7)
      if (h < 0.12) continue
      const w = span / cells
      const cx = x0 + w * (i + 0.5)
      const cz = z0 + w * (j + 0.5)
      const inset = 18 + hash2(cx, cz, 11) * 30
      const hw = w / 2 - inset
      const hd = w / 2 - inset
      const tall = hash2(cx, cz, 13)
      const height = 180 + Math.pow(tall, 2.4) * 900
      const which = hash2(cx, cz, 17)
      const interior = which > 0.55 ? INTERIOR_KEYS[Math.floor(which * 997) % INTERIOR_KEYS.length] : null
      out.push({
        x: cx,
        z: cz,
        hw,
        hd,
        height,
        wall: WALLS[Math.floor(hash2(cx, cz, 19) * WALLS.length)],
        roof: ROOFS[Math.floor(hash2(cx, cz, 23) * ROOFS.length)],
        interior,
        // The door faces the nearest street.
        doorX: cx,
        doorZ: cz - hd - 6,
        key: `${bx}:${bz}:${i}:${j}`,
      })
    }
  }
  return out
}

/** Every building within a radius, for drawing and for bumping into. */
export function buildingsAround(x: number, z: number, radius: number): Building[] {
  const out: Building[] = []
  const b0 = Math.floor((x - radius) / BLOCK)
  const b1 = Math.floor((x + radius) / BLOCK)
  const c0 = Math.floor((z - radius) / BLOCK)
  const c1 = Math.floor((z + radius) / BLOCK)
  for (let bx = b0; bx <= b1; bx++) {
    for (let bz = c0; bz <= c1; bz++) {
      if (bx < 0 || bz < 0 || bx >= GRID || bz >= GRID) continue
      for (const b of buildingsIn(bx, bz)) out.push(b)
    }
  }
  return out
}

/** Are you inside the walls of something? */
export function insideBuilding(b: Building, x: number, y: number, z: number, pad = 14): boolean {
  if (y > GROUND - 1) return false
  if (y < GROUND - b.height) return false
  return Math.abs(x - b.x) < b.hw + pad && Math.abs(z - b.z) < b.hd + pad
}

/* ------------------------------------------------------------------ */
/* Things in the street                                                */
/* ------------------------------------------------------------------ */

export type FixtureKind =
  | 'swings'
  | 'slide'
  | 'roundabout'
  | 'climber'
  | 'seesaw'
  | 'fountain'
  | 'bandstand'
  | 'statue'
  | 'clock'
  | 'market'
  | 'pond'
  | 'bench'

export interface Fixture {
  kind: FixtureKind
  x: number
  z: number
  key: string
}

export const FIXTURE_LABEL: Record<FixtureKind, string> = {
  swings: 'the swings',
  slide: 'the slide',
  roundabout: 'the roundabout',
  climber: 'the climbing frame',
  seesaw: 'the seesaw',
  fountain: 'the fountain',
  bandstand: 'the bandstand',
  statue: 'the statue',
  clock: 'the clock tower',
  market: 'the market stalls',
  pond: 'the duck pond',
  bench: 'a bench',
}

/** What actually happens when you use one. */
export const FIXTURE_DOING: Record<FixtureKind, string> = {
  swings: 'You get the swing going until the chains go slack at the top.',
  slide: 'Down the slide, and the static makes your hair stand up.',
  roundabout: 'You push it round and jump on. The city smears.',
  climber: 'Up and over the climbing frame without touching the ground.',
  seesaw: 'You sit on one end and nothing happens. Still worth it.',
  fountain: 'You fly through the spray and come out the other side wet.',
  bandstand: 'You land on the bandstand roof. The acoustics up here are odd.',
  statue: 'You sit on the statue’s shoulder for a while.',
  clock: 'You hang off the minute hand and let it carry you round.',
  market: 'You drift along the stalls. Somebody hands you an apple.',
  pond: 'You skim the pond. Every duck objects.',
  bench: 'You sit on the bench and watch the street go by.',
}

const PARK_KIT: FixtureKind[] = ['fountain', 'bandstand', 'pond', 'bench', 'statue']
const PLAY_KIT: FixtureKind[] = ['swings', 'slide', 'roundabout', 'climber', 'seesaw']
const PLAZA_KIT: FixtureKind[] = ['market', 'statue', 'clock', 'fountain', 'bench']

/** The fixtures on one block. */
export function fixturesIn(bx: number, bz: number): Fixture[] {
  const kind = blockKind(bx, bz)
  if (kind === 'buildings') return []
  const kit = kind === 'park' ? PARK_KIT : kind === 'playground' ? PLAY_KIT : PLAZA_KIT
  const out: Fixture[] = []
  const x0 = bx * BLOCK + STREET / 2
  const z0 = bz * BLOCK + STREET / 2
  const span = BLOCK - STREET
  const n = 3 + Math.floor(hash2(bx, bz, 29) * 3)
  for (let i = 0; i < n; i++) {
    const hx = hash2(bx * 7 + i, bz * 7, 31)
    const hz = hash2(bx * 7, bz * 7 + i, 37)
    out.push({
      kind: kit[Math.floor(hash2(bx + i, bz - i, 41) * kit.length)],
      x: x0 + 60 + hx * (span - 120),
      z: z0 + 60 + hz * (span - 120),
      key: `${bx}:${bz}:f${i}`,
    })
  }
  return out
}

export function fixturesAround(x: number, z: number, radius: number): Fixture[] {
  const out: Fixture[] = []
  const b0 = Math.floor((x - radius) / BLOCK)
  const b1 = Math.floor((x + radius) / BLOCK)
  const c0 = Math.floor((z - radius) / BLOCK)
  const c1 = Math.floor((z + radius) / BLOCK)
  for (let bx = b0; bx <= b1; bx++) {
    for (let bz = c0; bz <= c1; bz++) {
      if (bx < 0 || bz < 0 || bx >= GRID || bz >= GRID) continue
      for (const f of fixturesIn(bx, bz)) out.push(f)
    }
  }
  return out
}

/** Close enough to have a go on something. */
export const REACH = 150

/**
 * Doors get a longer approach than street furniture. You are flying, and
 * a doorway you have to be within a few metres of - at the right height,
 * on the right side - is a doorway you never find.
 */
export const DOOR_REACH = 320

/* ------------------------------------------------------------------ */
/* Traffic and passers-by                                              */
/* ------------------------------------------------------------------ */

export interface Car {
  x: number
  z: number
  /** Which way it is pointing, in radians. */
  heading: number
  speed: number
  colour: string
  /** Saloon, van or bus - they are different sizes. */
  size: number
  height: number
}

export const CAR_COLOURS = [
  '#b8392f', '#2f5fa8', '#d9c04a', '#3f7a52', '#e0e0e0', '#2b2b30', '#c2762f', '#7a4a8a',
]

export interface Person {
  x: number
  z: number
  heading: number
  speed: number
  coat: string
  legs: number
  /** Adults and children, so the pavement is not all one height. */
  scale: number
}

export const COATS = ['#b8392f', '#2f5fa8', '#3f7a52', '#d9c04a', '#8a4a8a', '#e0dcd2', '#2b2b30', '#c2762f']
export const LEGS = ['#3a3f4a', '#4a3a2f', '#2b2b30', '#5a4a3a']

/** People walk along here, a step in from the kerb. */
export const PAVEMENT_INSET = STREET * 0.13

/* ------------------------------------------------------------------ */
/* Inside                                                              */
/* ------------------------------------------------------------------ */

export interface Interior {
  key: string
  label: string
  sign: string
  blurb: string
  /** Things you can do in there. */
  doings: { key: string; label: string; note: string }[]
}

export const INTERIORS: Interior[] = [
  {
    key: 'cafe',
    label: 'The Corner Café',
    sign: 'CAFÉ',
    blurb: 'Steamed windows, four tables, and a cat asleep on the till.',
    doings: [
      { key: 'coffee', label: 'Order a coffee', note: 'It comes in a cup the size of a bowl.' },
      { key: 'cat', label: 'Say hello to the cat', note: 'The cat does not open its eyes.' },
      { key: 'window', label: 'Sit by the window', note: 'You watch the street until the cup is cold.' },
    ],
  },
  {
    key: 'library',
    label: 'The Reading Room',
    sign: 'LIBRARY',
    blurb: 'Green lamps, long tables, and a silence with weight to it.',
    doings: [
      { key: 'atlas', label: 'Open the big atlas', note: 'Somebody has pencilled a route across the sea.' },
      { key: 'stacks', label: 'Get lost in the stacks', note: 'You come out three aisles from where you went in.' },
      { key: 'window', label: 'Read by the window', note: 'You get through four pages and most of an hour.' },
    ],
  },
  {
    key: 'arcade',
    label: 'Pier Arcade',
    sign: 'ARCADE',
    blurb: 'Carpet you cannot look at directly, and everything is beeping.',
    doings: [
      { key: 'claw', label: 'Try the claw machine', note: 'It lifts the bear and then thinks better of it.' },
      { key: 'pinball', label: 'Play the pinball', note: 'You get the multiball and immediately lose it.' },
      { key: 'photo', label: 'Sit in the photo booth', note: 'Four pictures. You blink in three.' },
    ],
  },
  {
    key: 'bakery',
    label: 'The Bakehouse',
    sign: 'BAKERY',
    blurb: 'Warm enough to fall asleep in, and it smells like the morning.',
    doings: [
      { key: 'bun', label: 'Buy a bun', note: 'Still hot. You eat it standing up.' },
      { key: 'watch', label: 'Watch the oven', note: 'Thirty loaves go in on a paddle the size of an oar.' },
    ],
  },
  {
    key: 'records',
    label: 'Second Spin Records',
    sign: 'RECORDS',
    blurb: 'Crates to the ceiling and somebody playing something you half know.',
    doings: [
      { key: 'crate', label: 'Dig through a crate', note: 'Nothing, nothing, nothing, and then something.' },
      { key: 'listen', label: 'Use the listening post', note: 'The headphones are held together with tape.' },
    ],
  },
  {
    key: 'museum',
    label: 'City Museum',
    sign: 'MUSEUM',
    blurb: 'Marble, echo, and a whale hanging from the ceiling.',
    doings: [
      { key: 'whale', label: 'Fly up to the whale', note: 'Close up, the bones are the colour of tea.' },
      { key: 'cases', label: 'Read every label', note: 'Somebody spent a life on the things in case nine.' },
      { key: 'stairs', label: 'Sit on the big stairs', note: 'Everyone sits on the big stairs.' },
    ],
  },
  {
    key: 'cinema',
    label: 'The Roxy',
    sign: 'CINEMA',
    blurb: 'Red velvet gone bald at the arms, and one screen.',
    doings: [
      { key: 'balcony', label: 'Sit in the balcony', note: 'The whole row is yours.' },
      { key: 'projector', label: 'Look in the projection room', note: 'The reels are taller than you are.' },
    ],
  },
  {
    key: 'tower',
    label: 'The Tower Office',
    sign: 'TOWER',
    blurb: 'Forty floors of nothing much, and then the roof.',
    doings: [
      { key: 'roof', label: 'Go up to the roof', note: 'The whole city, laid out and getting on with it.' },
      { key: 'lift', label: 'Ride the lift to the top', note: 'Your ears go on the twenty-second floor.' },
    ],
  },
]

export const INTERIOR_KEYS = INTERIORS.map((i) => i.key)
export const INTERIOR_BY_KEY: Record<string, Interior> = Object.fromEntries(
  INTERIORS.map((i) => [i.key, i])
)

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export interface CitySave {
  /** Fixture keys you have had a go on. */
  used: string[]
  /** Interior keys you have been inside. */
  visited: string[]
  /** "interior:doing" pairs you have done. */
  done: string[]
  /** Kinds of fixture tried at least once, for the journal. */
  kinds: string[]
  outings: number
  highest: number
  /** How far you have walked, in metres. */
  walked: number
}

export function initialCity(): CitySave {
  return { used: [], visited: [], done: [], kinds: [], outings: 0, highest: 0, walked: 0 }
}

/*
 * There is no money in this city and nothing to buy. Every door that is
 * a door will open, and what you get for doing a thing is having done
 * it - the journal is the whole of the score.
 */
export const SIGHT = BASE_SIGHT

/** Height above the street, in metres, for the readout. */
export function heightOf(y: number): number {
  return Math.max(0, Math.round((GROUND - y) / METRE))
}

export function cityPending(s: CitySave | undefined) {
  if (!s) return null
  const seen = (s.visited ?? []).length
  return seen < INTERIORS.length ? { count: INTERIORS.length - seen } : null
}
