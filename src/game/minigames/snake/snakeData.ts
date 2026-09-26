/**
 * Snake Dash.
 *
 * An arena full of snakes eating pellets and each other. Everything here
 * is arithmetic and rules - no drawing, no React - so the collision
 * rules can be checked without a browser, which matters because they are
 * the whole game and they are easy to get subtly wrong.
 */

export const ARENA = { w: 2600, h: 2000 }

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

export type Meeting = 'eat' | 'die' | 'bounce'

/**
 * What happens to the snake whose *head* did the touching.
 *
 * All four cases in the brief are the same rule seen from two sides:
 *
 *  - my head into their body, I am higher  -> I eat them
 *  - my head into their body, I am lower   -> I bounce off
 *  - their head into my body, they are higher -> they eat me, I die
 *  - their head into my body, they are lower  -> they bounce off me
 *  - head to head, higher eats, lower dies; level a draw, both bounce
 *
 * So: a head that meets something below its level consumes it, and a
 * head that meets something at or above its level comes off worse or
 * not at all. Only the head can start anything - a body is passive.
 */
export function meet(myLevel: number, theirLevel: number, where: 'head' | 'body'): Meeting {
  if (myLevel > theirLevel) return 'eat'
  if (where === 'head' && myLevel < theirLevel) return 'die'
  return 'bounce'
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
}

export const initialSnake: SnakeSave = { best: 0, bestLevel: 1, eaten: 0, runs: 0 }

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
