/**
 * The simulation, kept apart from React and from drawing.
 *
 * Everything in here is pure enough to run in Node, which is the only
 * practical way to find out whether the rules produce a game worth
 * playing rather than one where the biggest snake wins in ten seconds.
 */

import {
  ARENA,
  BASE_LENGTH,
  DASH_DRAIN,
  DASH_FLOOR,
  DASH_MAX,
  DASH_REFILL,
  GROW,
  HEAD_R,
  PELLET_COUNT,
  PELLET_R,
  RIVAL_HUES,
  RIVAL_NAMES,
  SEGMENT,
  SPAWN_CLEAR,
  START_FED,
  SPAWN_GRACE,
  TURN_RATE,
  girthOf,
  levelOf,
  meet,
  segmentsOf,
  speedOf,
  type Pellet,
  type Snake,
} from './snakeData'

export interface World {
  snakes: Snake[]
  pellets: Pellet[]
  t: number
  nextId: number
}

/* ------------------------------------------------------------------ */
/* Building one                                                        */
/* ------------------------------------------------------------------ */

export function makeSnake(
  id: number,
  x: number,
  y: number,
  fed: number,
  player: boolean,
  rng: () => number
): Snake {
  const heading = rng() * Math.PI * 2
  const trail: { x: number; y: number }[] = []
  // Lay the starting body out behind the head, or it unfolds from a dot.
  for (let i = 0; i < BASE_LENGTH + fed * GROW + 4; i++) {
    trail.push({ x: x - Math.cos(heading) * i * SEGMENT, y: y - Math.sin(heading) * i * SEGMENT })
  }
  return {
    id,
    player,
    name: player ? 'You' : RIVAL_NAMES[id % RIVAL_NAMES.length],
    hue: player ? 140 : RIVAL_HUES[id % RIVAL_HUES.length],
    x,
    y,
    heading,
    trail,
    fed,
    dash: DASH_MAX,
    dashing: false,
    dead: false,
    shoveUntil: 0,
    shoveHeading: 0,
    safeUntil: 0,
  }
}

/** Somewhere to appear that is not right on top of the player. */
function clearOf(player: Snake | undefined, rng: () => number): { x: number; y: number } {
  for (let tries = 0; tries < 24; tries++) {
    const x = 120 + rng() * (ARENA.w - 240)
    const y = 120 + rng() * (ARENA.h - 240)
    if (!player || Math.hypot(x - player.x, y - player.y) > SPAWN_CLEAR) return { x, y }
  }
  return { x: 120 + rng() * (ARENA.w - 240), y: 120 + rng() * (ARENA.h - 240) }
}

export function makePellet(rng: () => number, x?: number, y?: number, worth = 1): Pellet {
  return {
    x: x ?? 40 + rng() * (ARENA.w - 80),
    y: y ?? 40 + rng() * (ARENA.h - 80),
    worth,
    hue: 30 + rng() * 300,
  }
}

export function makeWorld(rivals: number, rng: () => number): World {
  const snakes: Snake[] = [makeSnake(0, ARENA.w / 2, ARENA.h / 2, START_FED, true, rng)]
  for (let i = 1; i <= rivals; i++) {
    // Mostly small, a few middling. Starting them spread over the whole
    // range meant spawning at level 1 among level sevens, which is not a
    // game - it is an ambush, and ninety-seven runs in a hundred ended
    // inside thirteen seconds.
    const fed = Math.round(Math.pow(rng(), 2.4) * 24)
    const spot = clearOf(snakes[0], rng)
    snakes.push(makeSnake(i, spot.x, spot.y, fed, false, rng))
  }
  const pellets: Pellet[] = []
  for (let i = 0; i < PELLET_COUNT; i++) pellets.push(makePellet(rng))
  return { snakes, pellets, t: 0, nextId: rivals + 1 }
}

/* ------------------------------------------------------------------ */
/* Thinking                                                            */
/* ------------------------------------------------------------------ */

/** Where a rival wants to be pointing. */
export function steer(self: Snake, world: World): { heading: number; dash: boolean } {
  const myLevel = levelOf(self.fed)
  let wantX = 0
  let wantY = 0
  let dash = false

  // Run from anything that could eat us, hard, and weight it by how
  // close it is - a bigger snake two arenas away is not a problem.
  let fleeing = false
  for (const other of world.snakes) {
    if (other.dead || other.id === self.id) continue
    const d = Math.hypot(other.x - self.x, other.y - self.y)
    if (d > 420 || d < 0.001) continue
    const theirLevel = levelOf(other.fed)
    if (theirLevel > myLevel) {
      const push = (420 - d) / 420
      wantX -= ((other.x - self.x) / d) * push * 3.2
      wantY -= ((other.y - self.y) / d) * push * 3.2
      if (d < 200) {
        fleeing = true
        dash = true
      }
    } else if (theirLevel < myLevel && d < 560) {
      // Worth chasing, but never at the cost of ignoring a threat.
      const pull = (560 - d) / 560
      wantX += ((other.x - self.x) / d) * pull * 1.5
      wantY += ((other.y - self.y) / d) * pull * 1.5
      if (d < 260) dash = true
    }
  }

  if (!fleeing) {
    // Nearest pellet, of the ones nearby.
    let best: Pellet | null = null
    let bestD = 620
    for (const p of world.pellets) {
      const d = Math.hypot(p.x - self.x, p.y - self.y)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    if (best) {
      wantX += ((best.x - self.x) / (bestD || 1)) * 1.1
      wantY += ((best.y - self.y) / (bestD || 1)) * 1.1
    }
  }

  // Keep off the wall. A rival that pins itself in a corner is not fun
  // to hunt and not dangerous to meet.
  const edge = 220
  if (self.x < edge) wantX += (edge - self.x) / edge * 2.4
  if (self.x > ARENA.w - edge) wantX -= (edge - (ARENA.w - self.x)) / edge * 2.4
  if (self.y < edge) wantY += (edge - self.y) / edge * 2.4
  if (self.y > ARENA.h - edge) wantY -= (edge - (ARENA.h - self.y)) / edge * 2.4

  if (Math.abs(wantX) < 0.001 && Math.abs(wantY) < 0.001) {
    return { heading: self.heading, dash: false }
  }
  return { heading: Math.atan2(wantY, wantX), dash: dash && self.dash > DASH_FLOOR + 10 }
}

/* ------------------------------------------------------------------ */
/* Moving                                                              */
/* ------------------------------------------------------------------ */

function turnToward(current: number, want: number, most: number): number {
  let diff = ((want - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  if (diff > most) diff = most
  if (diff < -most) diff = -most
  return current + diff
}

export function moveSnake(s: Snake, want: number, wantDash: boolean, dt: number, now: number) {
  // A shove from bouncing overrides steering for a moment, so a bounce
  // reads as a bounce rather than a stutter.
  const shoved = now < s.shoveUntil
  const target = shoved ? s.shoveHeading : want

  const dashing = wantDash && s.dash > DASH_FLOOR && !shoved
  s.dashing = dashing
  s.dash = Math.max(0, Math.min(DASH_MAX, s.dash + (dashing ? -DASH_DRAIN : DASH_REFILL) * dt))

  s.heading = turnToward(s.heading, target, TURN_RATE * dt * (shoved ? 2.4 : 1))
  const speed = speedOf(s.fed, dashing) * (shoved ? 1.35 : 1)
  s.x += Math.cos(s.heading) * speed * dt
  s.y += Math.sin(s.heading) * speed * dt

  // The wall stops you rather than killing you. Dying to scenery in a
  // game about eating other snakes is a bad way to lose.
  const r = girthOf(s.fed) * 0.5
  s.x = Math.max(r, Math.min(ARENA.w - r, s.x))
  s.y = Math.max(r, Math.min(ARENA.h - r, s.y))

  // Record the trail, but only once we have actually gone somewhere.
  const head = s.trail[0]
  if (!head || Math.hypot(s.x - head.x, s.y - head.y) > 4) {
    s.trail.unshift({ x: s.x, y: s.y })
    const keep = Math.ceil((BASE_LENGTH + s.fed * GROW) * SEGMENT / 4) + 16
    if (s.trail.length > keep) s.trail.length = keep
  }
}

/* ------------------------------------------------------------------ */
/* Meeting                                                             */
/* ------------------------------------------------------------------ */

export interface Outcome {
  /** Ids of snakes that were eaten this tick, and who ate them. */
  eaten: { victim: number; by: number }[]
}

function bounce(s: Snake, awayFrom: Snake, now: number) {
  const dx = s.x - awayFrom.x
  const dy = s.y - awayFrom.y
  s.shoveHeading = Math.atan2(dy, dx) || s.heading + Math.PI
  s.shoveUntil = now + 260
}

/**
 * Resolve every head that is touching another snake.
 *
 * Only heads act. A body never starts anything, which is what makes the
 * rules symmetric: whatever happens to you when your head meets someone
 * is exactly what happens to them when theirs meets you.
 *
 * Each body is built once per tick and shared. Building it per pair is
 * the obvious way to write this and it is quadratic in allocations - it
 * was slow enough to stall a headless run of a few thousand ticks, which
 * is a fair warning about what it would have done to the frame rate.
 */
export function collide(world: World, now: number): Outcome {
  const out: Outcome = { eaten: [] }
  const alive = world.snakes.filter((s) => !s.dead)

  const bodies = new Map<number, { x: number; y: number }[]>()
  const reach = new Map<number, number>()
  for (const s of alive) {
    bodies.set(s.id, segmentsOf(s))
    reach.set(s.id, HEAD_R + girthOf(s.fed) * 0.5)
  }

  for (const a of alive) {
    if (a.dead) continue
    for (const b of alive) {
      if (b.dead || a.dead || a.id === b.id) continue

      const headGap = Math.hypot(a.x - b.x, a.y - b.y)
      const headTouch = HEAD_R + girthOf(a.fed) * 0.5 + girthOf(b.fed) * 0.5

      let where: 'head' | 'body' | null = null
      if (headGap < headTouch) {
        where = 'head'
      } else {
        // Does a's head touch b's body? Skip the beads nearest b's head,
        // or every head-on meeting would also register as a body hit.
        const beads = bodies.get(b.id)!
        const r = reach.get(b.id)!
        // Cheap reject first: nothing can touch if the head is further
        // away than the whole body could possibly extend.
        if (headGap < beads.length * SEGMENT + r + 8) {
          for (let i = 2; i < beads.length; i++) {
            const dx = a.x - beads[i].x
            if (dx > r || dx < -r) continue
            const dy = a.y - beads[i].y
            if (dy > r || dy < -r) continue
            if (dx * dx + dy * dy < r * r) {
              where = 'body'
              break
            }
          }
        }
      }
      if (!where) continue

      // Either of them newly spawned? Then nobody eats anybody.
      const verdict =
        now < a.safeUntil || now < b.safeUntil
          ? 'bounce'
          : meet(levelOf(a.fed), levelOf(b.fed), where)
      if (verdict === 'eat') {
        b.dead = true
        a.fed += Math.round(b.fed * 0.5) + 4
        out.eaten.push({ victim: b.id, by: a.id })
      } else if (verdict === 'die') {
        a.dead = true
        b.fed += Math.round(a.fed * 0.5) + 4
        out.eaten.push({ victim: a.id, by: b.id })
      } else {
        bounce(a, b, now)
      }
    }
  }
  return out
}

/** A dead snake goes back on the field as food. */
export function scatter(s: Snake, world: World, rng: () => number) {
  const beads = segmentsOf(s)
  const step = Math.max(1, Math.floor(beads.length / 26))
  for (let i = 0; i < beads.length; i += step) {
    world.pellets.push(
      makePellet(
        rng,
        beads[i].x + (rng() - 0.5) * 22,
        beads[i].y + (rng() - 0.5) * 22,
        1 + Math.round(s.fed / 40)
      )
    )
  }
}

/** Heads eating pellets. Returns how many the player got. */
export function feed(world: World, rng: () => number): number {
  let playerGot = 0
  for (const s of world.snakes) {
    if (s.dead) continue
    const reach = HEAD_R + PELLET_R + girthOf(s.fed) * 0.3
    for (let i = world.pellets.length - 1; i >= 0; i--) {
      const p = world.pellets[i]
      if (Math.abs(p.x - s.x) > reach || Math.abs(p.y - s.y) > reach) continue
      if (Math.hypot(p.x - s.x, p.y - s.y) > reach) continue
      s.fed += p.worth
      if (s.player) playerGot += p.worth
      world.pellets.splice(i, 1)
    }
  }
  // Keep the field stocked.
  while (world.pellets.length < PELLET_COUNT) world.pellets.push(makePellet(rng))
  return playerGot
}

/** Rivals that died are replaced, so the arena never empties out. */
/**
 * Replace the rivals that died.
 *
 * New rivals are sized against the player rather than against a fixed
 * range, so the arena keeps pace: there is always something below you
 * worth chasing and something above you worth avoiding, whether you are
 * level two or level twenty.
 */
export function restock(world: World, rivals: number, now: number, rng: () => number) {
  const player = world.snakes.find((s) => s.player)
  const alive = world.snakes.filter((s) => !s.dead && !s.player).length
  const bar = Math.max(18, (player?.fed ?? 0) * 1.25)
  for (let i = alive; i < rivals; i++) {
    const fed = Math.round(Math.pow(rng(), 1.9) * bar)
    const spot = clearOf(player, rng)
    const s = makeSnake(world.nextId++, spot.x, spot.y, fed, false, rng)
    s.safeUntil = now + SPAWN_GRACE
    world.snakes.push(s)
  }
  world.snakes = world.snakes.filter((s) => !s.dead || s.player)
}
