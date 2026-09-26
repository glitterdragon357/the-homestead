/**
 * Snake Dash.
 *
 * An arena full of snakes eating pellets and each other. Everything here
 * is arithmetic and rules - no drawing, no React - so the collision
 * rules can be checked without a browser, which matters because they are
 * the whole game and they are easy to get subtly wrong.
 */

/* ------------------------------------------------------------------ */
/* Maps                                                                */
/* ------------------------------------------------------------------ */

export interface MapSpec {
  key: string
  name: string
  blurb: string
  w: number
  h: number
  rivals: number
  pellets: number
  /** Floor at the centre, floor at the edges, the grid, and the wall. */
  floorIn: string
  floorOut: string
  grid: string
  wall: string
}

export const MAPS: MapSpec[] = [
  {
    key: 'pit',
    name: 'The Pit',
    blurb: 'Open ground, room to run, and eight others in it with you.',
    w: 2600,
    h: 2000,
    rivals: 8,
    pellets: 260,
    floorIn: '#16243a',
    floorOut: '#0a1220',
    grid: 'rgba(120,170,230,0.075)',
    wall: '126,196,255',
  },
  {
    key: 'narrows',
    name: 'The Narrows',
    blurb: 'Long and thin. Nowhere to slip past anything bigger than you.',
    w: 3600,
    h: 1100,
    rivals: 9,
    pellets: 250,
    floorIn: '#22203a',
    floorOut: '#0e0c1a',
    grid: 'rgba(180,150,235,0.08)',
    wall: '190,160,255',
  },
  {
    key: 'grove',
    name: 'The Grove',
    blurb: 'Wide and well fed. Fewer rivals, and plenty to grow on.',
    w: 3200,
    h: 2600,
    rivals: 6,
    pellets: 420,
    floorIn: '#16301f',
    floorOut: '#081409',
    grid: 'rgba(140,220,150,0.075)',
    wall: '150,240,170',
  },
  {
    key: 'crucible',
    name: 'The Crucible',
    blurb: 'Small, crowded and mean. You will meet everything, quickly.',
    w: 1700,
    h: 1300,
    rivals: 10,
    pellets: 190,
    floorIn: '#341c1c',
    floorOut: '#160808',
    grid: 'rgba(255,150,130,0.07)',
    wall: '255,150,120',
  },
]

export const MAP_BY_KEY: Record<string, MapSpec> = Object.fromEntries(MAPS.map((m) => [m.key, m]))

/** The default, and the size everything falls back to. */
export const ARENA = { w: MAPS[0].w, h: MAPS[0].h }

/* ------------------------------------------------------------------ */
/* Skins                                                              */
/* ------------------------------------------------------------------ */

export type Pattern = 'bands' | 'stripe' | 'diamond' | 'solid' | 'glow' | 'shift'

export interface Skin {
  key: string
  name: string
  blurb: string
  hue: number
  pattern: Pattern
  /** Nothing to pay for the first few. */
  cost: number
}

export const SKINS: Skin[] = [
  { key: 'grass', name: 'Grass', blurb: 'The one you started in.', hue: 140, pattern: 'bands', cost: 0 },
  { key: 'coral', name: 'Coral', blurb: 'Warm banding, hard to lose in a crowd.', hue: 8, pattern: 'bands', cost: 0 },
  { key: 'deep', name: 'Deep', blurb: 'A single pale stripe down the spine.', hue: 212, pattern: 'stripe', cost: 0 },
  { key: 'wasp', name: 'Wasp', blurb: 'Diamonds, and a warning to anything smaller.', hue: 48, pattern: 'diamond', cost: 120 },
  { key: 'ink', name: 'Ink', blurb: 'No pattern at all. Just a shape in the dark.', hue: 268, pattern: 'solid', cost: 160 },
  { key: 'ember', name: 'Ember', blurb: 'Lit from the inside.', hue: 22, pattern: 'glow', cost: 260 },
  { key: 'frost', name: 'Frost', blurb: 'Cold, and glowing with it.', hue: 186, pattern: 'glow', cost: 260 },
  { key: 'opal', name: 'Opal', blurb: 'The colour walks down the body as you move.', hue: 300, pattern: 'shift', cost: 420 },
]

export const SKIN_BY_KEY: Record<string, Skin> = Object.fromEntries(SKINS.map((s) => [s.key, s]))

/** The ones that cost nothing, which everybody starts with. */
export const FREE_SKINS = SKINS.filter((s) => s.cost === 0).map((s) => s.key)

/**
 * Which skins a save actually owns.
 *
 * A save written before skins existed has no list at all, and defaulting
 * that to empty would take the free ones away from anyone who had
 * already played.
 */
export function ownedSkins(save: Partial<SnakeSave>): string[] {
  const had = save.skins ?? []
  return [...new Set([...FREE_SKINS, ...had])]
}

/** How far apart the beads of a body sit. */
export const SEGMENT = 13
/** The shortest a snake ever is. */
export const BASE_LENGTH = 8
/** Beads added per pellet eaten. */
export const GROW = 1.6

export const BASE_SPEED = 185
/** Held dash, and what it costs. */
export const DASH_SPEED = 330
export const DASH_DRAIN = 52
export const DASH_REFILL = 26
export const DASH_MAX = 100
/** You cannot dash at all below this, so it cannot be feathered forever. */
export const DASH_FLOOR = 12

/** How sharply a snake can turn, in radians a second. */
export const TURN_RATE = 3.4

export const PELLET_R = 7
export const HEAD_R = 11
/** Pellets kept on the field at once. */
export const PELLET_COUNT = 260
/** How many rivals share the arena with you. */
export const RIVALS = 8
/** You do not start as the smallest thing in the arena. */
export const START_FED = 4

/** How long a snake is untouchable after it appears. */
export const SPAWN_GRACE = 4000
/** How far from the player a new rival is allowed to appear. */
export const SPAWN_CLEAR = 760

/* ------------------------------------------------------------------ */
/* Levels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Level from pellets eaten.
 *
 * Deliberately a square-root curve: the first few levels come quickly so
 * a new snake is not prey for long, and the last ones take real work, so
 * a big snake stays worth being afraid of.
 */
export function levelOf(fed: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, fed) / 2))
}

/** What the next level needs, for the bar under the score. */
export function fedForLevel(level: number): number {
  return 2 * (level - 1) * (level - 1)
}

export function lengthOf(fed: number): number {
  return BASE_LENGTH + fed * GROW
}

/** Bigger snakes are a shade slower. Not enough to make growing a punishment. */
export function speedOf(fed: number, dashing: boolean): number {
  const heft = 1 - Math.min(0.22, fed / 900)
  return (dashing ? DASH_SPEED : BASE_SPEED) * heft
}

/* ------------------------------------------------------------------ */
/* Meeting another snake                                               */
/* ------------------------------------------------------------------ */

export type Meeting = 'eat' | 'die' | 'cut' | 'bounce'

/**
 * What happens to the snake whose *head* did the touching.
 *
 * Head to head, the higher level eats and the lower dies. But a head
 * meeting a *body* no longer kills: it cuts. Everything from the point
 * of contact down to the tail comes off, and the snake that was cut
 * swims on with whatever is left in front of the bite.
 *
 * That is what makes being chased a chase. A bigger snake on your tail
 * has to work its way up you bite by bite, and you die only when it has
 * eaten far enough forward that there is no snake left in front of it -
 * which is the same thing as reaching your head.
 *
 * Only a head can start anything; a body is passive. So the rule is
 * symmetric: what happens when your head meets someone is exactly what
 * happens to them when theirs meets you.
 */
export function meet(myLevel: number, theirLevel: number, where: 'head' | 'body'): Meeting {
  if (where === 'head') {
    if (myLevel > theirLevel) return 'eat'
    if (myLevel < theirLevel) return 'die'
    return 'bounce'
  }
  return myLevel > theirLevel ? 'cut' : 'bounce'
}

/**
 * What a snake is left with after a bite at `bead`, counting from the
 * head. Null means there was not enough in front of the bite to go on
 * with, so the chase is over.
 */
export function cutTo(bead: number): { fed: number } | null {
  const left = (bead - BASE_LENGTH) / GROW
  if (left < 0) return null
  return { fed: left }
}

/* ------------------------------------------------------------------ */
/* The snakes themselves                                               */
/* ------------------------------------------------------------------ */

export interface Snake {
  id: number
  player: boolean
  name: string
  hue: number
  /** Head position and the way it is pointing. */
  x: number
  y: number
  heading: number
  /** Everywhere the head has been lately, newest first. */
  trail: { x: number; y: number }[]
  fed: number
  dash: number
  dashing: boolean
  dead: boolean
  /** Set when something bounces, to push it away for a moment. */
  shoveUntil: number
  shoveHeading: number
  /** Newly spawned and briefly untouchable, so a spawn is not a death. */
  safeUntil: number
  /** How it is painted. Rivals all wear plain bands. */
  pattern: Pattern
  /** Set briefly when a bite lands, so the flinch is visible. */
  bittenUntil: number
}

/**
 * The beads of the body, spaced evenly down the trail.
 *
 * One pass. Asking `alongTrail` for each bead separately is the obvious
 * way to write this and it walks the trail from the start every time -
 * quadratic in the length of the snake, which for a long one is over a
 * million operations per call, per snake, per frame.
 */
export function segmentsOf(s: Snake): { x: number; y: number }[] {
  const want = Math.round(lengthOf(s.fed))
  const trail = s.trail
  const out: { x: number; y: number }[] = []
  if (trail.length === 0) return out

  out.push(trail[0])
  let i = 0
  let carried = 0
  let need = SEGMENT

  while (out.length < want && i < trail.length - 1) {
    const a = trail[i]
    const b = trail[i + 1]
    const span = Math.hypot(b.x - a.x, b.y - a.y)
    if (span <= 0.0001) {
      i++
      continue
    }
    if (carried + span < need) {
      carried += span
      i++
      continue
    }
    // The next bead falls inside this leg of the trail.
    const t = (need - carried) / span
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    need += SEGMENT
  }
  return out
}

/** A point `dist` back along the trail, walking it segment by segment. */
export function alongTrail(
  trail: { x: number; y: number }[],
  dist: number
): { x: number; y: number } | null {
  if (trail.length === 0) return null
  if (dist <= 0) return trail[0]
  let left = dist
  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i]
    const b = trail[i + 1]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (d <= 0.0001) continue
    if (left <= d) {
      const t = left / d
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    left -= d
  }
  return trail[trail.length - 1]
}

/** How fat a snake is drawn, which is also how fat it is to collide with. */
export function girthOf(fed: number): number {
  return 9 + Math.min(11, Math.sqrt(fed) * 1.1)
}

/* ------------------------------------------------------------------ */
/* Pellets                                                             */
/* ------------------------------------------------------------------ */

export interface Pellet {
  x: number
  y: number
  /** Worth more than one, when it came off a dead snake. */
  worth: number
  hue: number
}

/* ------------------------------------------------------------------ */
/* Saving                                                              */
/* ------------------------------------------------------------------ */

export interface SnakeSave {
  best: number
  bestLevel: number
  eaten: number
  runs: number
  music?: boolean
  /** The skin being worn, and the ones bought so far. */
  skin: string
  skins: string[]
  /** The map last played. */
  map: string
}

export const initialSnake: SnakeSave = {
  best: 0,
  bestLevel: 1,
  eaten: 0,
  runs: 0,
  skin: 'grass',
  skins: [...FREE_SKINS],
  map: 'pit',
}

/** What a finished run was worth. */
export function payout(level: number, eaten: number, fed: number): number {
  return Math.round(level * 9 + eaten * 14 + fed * 0.7)
}

/**
 * Rival colours, chosen to leave a wide gap around the player's green.
 *
 * `id * 67 % 360` looked fine until a rival rolled hue 134 and turned up
 * a shade away from you. In a game where you have half a second to read
 * a shape and decide whether to charge it, green means you and nothing
 * else.
 */
export const RIVAL_HUES = [0, 18, 36, 190, 208, 224, 244, 266, 288, 310, 332, 350]

export const RIVAL_NAMES = [
  'Bramble', 'Coil', 'Dusk', 'Ember', 'Fang', 'Gutter', 'Hiss', 'Ivy',
  'Jet', 'Kink', 'Lash', 'Moss', 'Nettle', 'Onyx', 'Pike', 'Quill',
  'Rattle', 'Sable', 'Thorn', 'Umber', 'Vex', 'Whip',
]
