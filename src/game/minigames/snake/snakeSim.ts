/**
 * The simulation, kept apart from React and from drawing.
 *
 * Everything in here is pure enough to run in Node, which is the only
 * practical way to find out whether the rules produce a game worth
 * playing rather than one where the biggest snake wins in ten seconds.
 */

import {
  BASE_LENGTH,
  COMPANION_BY_KEY,
  nipOf,
  rivalCompanion,
  reachOf,
  restOf,
  CHEST_COUNT,
  CHEST_REACH,
  CHEST_VALUE,
  COIN_COUNT,
  COIN_VALUE,
  FOOD_HUE,
  FOOD_SAT,
  bountyFor,
  DASH_DRAIN,
  DASH_FLOOR,
  DASH_MAX,
  DASH_REFILL,
  GROW,
  HEAD_R,
  PELLET_R,
  rivalHues,
  RIVAL_NAMES,
  SKIN_BY_KEY,
  SEGMENT,
  SPAWN_CLEAR,
  START_FED,
  SPAWN_GRACE,
  TURN_RATE,
  gainFrom,
  girthOf,
  inArena,
  wallGap,
  cutTo,
  levelOf,
  meet,
  segmentsOf,
  speedOf,
  type Chest,
  type Coin,
  type Friend,
  type MapSpec,
  type Pattern,
  type Pellet,
  type Snake,
} from './snakeData'

export interface World {
  snakes: Snake[]
  pellets: Pellet[]
  coins: Coin[]
  chests: Chest[]
  t: number
  nextId: number
  map: MapSpec
  /** The earliest the next rival may appear, so they trickle in. */
  nextSpawnAt: number
  /** When the run began. */
  startedAt: number
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
  rng: () => number,
  look?: { hue: number; pattern: Pattern; accent?: number; sat?: number },
  map?: MapSpec
): Snake {
  const heading = rng() * Math.PI * 2
  const trail: { x: number; y: number }[] = []
  const pad = wallGap(fed)
  // Lay the starting body out behind the head, or it unfolds from a dot.
  //
  // Every bead is held inside the arena. Laying it out unclamped put the
  // whole body of anything spawning near a wall and facing away from it
  // outside the barrier, where it could still be bitten and still bite.
  for (let i = 0; i < BASE_LENGTH + fed * GROW + 4; i++) {
    const bx = x - Math.cos(heading) * i * SEGMENT
    const by = y - Math.sin(heading) * i * SEGMENT
    trail.push(map ? inArena(bx, by, pad, map) : { x: bx, y: by })
  }
  return {
    id,
    player,
    name: player ? 'You' : RIVAL_NAMES[id % RIVAL_NAMES.length],
    hue: look?.hue ?? 140,
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
    pattern: look?.pattern ?? 'bands',
    accent: look?.accent ?? 0,
    sat: look?.sat ?? 72,
    unseen: 0,
    friend: null,
    bittenUntil: 0,
  }
}

/** Somewhere to appear that is not right on top of the player. */
function clearOf(
  player: Snake | undefined,
  rng: () => number,
  map: MapSpec
): { x: number; y: number } {
  // The Crucible is small enough that "well away from the player" may
  // not exist, so give up gracefully rather than looping.
  const want = Math.min(SPAWN_CLEAR, Math.min(map.w, map.h) * 0.42)
  for (let tries = 0; tries < 24; tries++) {
    const x = 120 + rng() * (map.w - 240)
    const y = 120 + rng() * (map.h - 240)
    if (!player || Math.hypot(x - player.x, y - player.y) > want) return { x, y }
  }
  return { x: 120 + rng() * (map.w - 240), y: 120 + rng() * (map.h - 240) }
}

export function makeCoin(rng: () => number, map: MapSpec, x?: number, y?: number, value = COIN_VALUE): Coin {
  return {
    x: x ?? 60 + rng() * (map.w - 120),
    y: y ?? 60 + rng() * (map.h - 120),
    value,
    spin: rng() * Math.PI * 2,
  }
}

export function makeChest(rng: () => number, map: MapSpec): Chest {
  return {
    x: 90 + rng() * (map.w - 180),
    y: 90 + rng() * (map.h - 180),
    value: Math.round(CHEST_VALUE * (0.7 + rng() * 0.6)),
    openedAt: 0,
  }
}

export function makePellet(
  rng: () => number,
  map: MapSpec,
  x?: number,
  y?: number,
  worth = 1,
  /** What it came off, if it came off anything. */
  from?: { hue: number; sat: number; accent: number; pattern: Pattern; index: number }
): Pellet {
  return {
    x: x ?? 40 + rng() * (map.w - 80),
    y: y ?? 40 + rng() * (map.h - 80),
    worth,
    hue: from ? from.hue : FOOD_HUE,
    sat: from ? from.sat : FOOD_SAT,
    accent: from?.accent,
    pattern: from?.pattern,
    index: from?.index,
  }
}

export function makeFriend(key: string | null, x: number, y: number): Friend | null {
  const spec = key ? COMPANION_BY_KEY[key] : undefined
  if (!spec) return null
  return { spec, x, y, restUntil: 0, targetId: null, dartUntil: 0 }
}

/**
 * Every companion in the arena, not just yours.
 *
 * Each one trails its owner and takes a piece out of the nearest snake
 * that is not its owner - so rival companions chew on you, on each
 * other, and on their owners' rivals, which is the only way having one
 * is fair rather than a licence.
 *
 * A nip is deliberately blind to level: chewing something far bigger
 * down to where it can be eaten is the whole reason to keep one. What
 * none of them will ever do is land the last bite. This function has no
 * way to mark a snake dead - it clamps at nothing and stops - so a
 * companion can leave something at level one and no lower.
 */
export function nipAll(world: World, now: number, dt: number): { owner: number; took: number }[] {
  const out: { owner: number; took: number }[] = []
  for (const owner of world.snakes) {
    const f = owner.friend
    if (!f || owner.dead) continue

    // Trail the head, a little behind and off to one side.
    const want = {
      x: owner.x - Math.cos(owner.heading) * 46 + Math.cos(now * 0.0016 + owner.id) * 26,
      y: owner.y - Math.sin(owner.heading) * 46 + Math.sin(now * 0.0016 + owner.id) * 26,
    }
    f.x += (want.x - f.x) * Math.min(1, dt * 6)
    f.y += (want.y - f.y) * Math.min(1, dt * 6)

    if (now < f.restUntil) continue

    const reach = reachOf(f.spec.cost)
    let best: Snake | null = null
    let bestD = reach
    for (const other of world.snakes) {
      if (other.dead || other.id === owner.id) continue
      // Nothing can pick on what it cannot see.
      if (other.unseen > 0.6) continue
      const d = Math.hypot(other.x - f.x, other.y - f.y)
      if (d < bestD) {
        bestD = d
        best = other
      }
    }
    if (!best) continue

    const took = Math.min(nipOf(f.spec.cost), best.fed)
    f.restUntil = now + restOf(f.spec.cost)
    f.targetId = best.id
    f.dartUntil = now + 220
    if (took <= 0) continue
    best.fed = Math.max(0, best.fed - took)
    best.bittenUntil = now + 200
    out.push({ owner: owner.id, took })
  }
  return out
}

export function makeWorld(
  map: MapSpec,
  skinKey: string,
  rng: () => number,
  yourCompanionCost = 0
): World {
  const skin = SKIN_BY_KEY[skinKey] ?? SKIN_BY_KEY.grass
  const snakes: Snake[] = [
    makeSnake(0, map.w / 2, map.h / 2, START_FED, true, rng, { hue: skin.hue, pattern: skin.pattern, accent: skin.accent, sat: skin.sat ?? 72 }, map),
  ]
  const hues = rivalHues(skin.hue)
  for (let i = 1; i <= map.rivals; i++) {
    // Everyone opens at level one, you included. Whatever is big later
    // got that way in front of you.
    const spot = clearOf(snakes[0], rng, map)
    const rival = makeSnake(
      i,
      spot.x,
      spot.y,
      START_FED,
      false,
      rng,
      { hue: hues[i % hues.length], pattern: 'bands' },
      map
    )
    rival.friend = makeFriend(rivalCompanion(yourCompanionCost, rng(), rng()), rival.x, rival.y)
    snakes.push(rival)
  }
  snakes[0].friend = null
  const pellets: Pellet[] = []
  for (let i = 0; i < map.pellets; i++) pellets.push(makePellet(rng, map))
  // What a map puts on the floor is the map's business. Some have loose
  // coins, some have a handful of chests instead, and some have nothing
  // at all but food.
  const coins: Coin[] = []
  if (map.loot === 'coins') for (let i = 0; i < COIN_COUNT; i++) coins.push(makeCoin(rng, map))
  const chests: Chest[] = []
  if (map.loot === 'chests') for (let i = 0; i < CHEST_COUNT; i++) chests.push(makeChest(rng, map))
  return {
    snakes,
    pellets,
    coins,
    chests,
    t: 0,
    nextId: map.rivals + 1,
    map,
    nextSpawnAt: 0,
    startedAt: 0,
  }
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
    // Whatever is wearing Nobody is not there as far as this one is
    // concerned - it will not run from it and will not chase it. It can
    // still be bitten by it, which is the entire point.
    if (other.unseen > 0.6) continue
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
      // Worth chasing, and worth more than grazing.
      //
      // This was weighted at 1.5 against a pellet's 1.1, which sounds
      // like a preference and is not: the pull falls off with distance,
      // so a snake three hundred units off pulled about a third as hard
      // as the nearest pellet and nothing ever actually gave chase. A
      // rival that can eat you should want to.
      const pull = (560 - d) / 560
      const keen = 1 + Math.min(1.0, (myLevel - theirLevel) * 0.16)
      wantX += ((other.x - self.x) / d) * pull * 1.9 * keen
      wantY += ((other.y - self.y) / d) * pull * 1.9 * keen
      if (d < 300) dash = true
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
  const edge = Math.min(220, Math.min(world.map.w, world.map.h) * 0.16)
  if (self.x < edge) wantX += ((edge - self.x) / edge) * 2.4
  if (self.x > world.map.w - edge) wantX -= ((edge - (world.map.w - self.x)) / edge) * 2.4
  if (self.y < edge) wantY += ((edge - self.y) / edge) * 2.4
  if (self.y > world.map.h - edge) wantY -= ((edge - (world.map.h - self.y)) / edge) * 2.4

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

export function moveSnake(
  s: Snake,
  want: number,
  wantDash: boolean,
  dt: number,
  now: number,
  map: MapSpec
) {
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
  // game about eating other snakes is a bad way to lose. Nothing crosses
  // it, though - not the head, not a bounce, not a dash into the corner.
  const held = inArena(s.x, s.y, wallGap(s.fed), map)
  s.x = held.x
  s.y = held.y

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
  /**
   * Bites taken out of a snake that survived it, with the piece that came
   * off, so it can be scattered as food.
   */
  bites: { victim: number; by: number; at: number; lost: { x: number; y: number }[] }[]
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
  const out: Outcome = { eaten: [], bites: [] }
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
      let bead = -1
      if (headGap < headTouch) {
        where = 'head'
      } else {
        // Does a's head touch b's body, and how far down it? The bead
        // index is the whole point now - it is where the bite lands.
        const beads = bodies.get(b.id)!
        const r = reach.get(b.id)!
        if (headGap < beads.length * SEGMENT + r + 8) {
          // Skip the beads nearest b's head, or every head-on meeting
          // would also register as a bite on the neck.
          for (let i = 2; i < beads.length; i++) {
            const dx = a.x - beads[i].x
            if (dx > r || dx < -r) continue
            const dy = a.y - beads[i].y
            if (dy > r || dy < -r) continue
            if (dx * dx + dy * dy < r * r) {
              where = 'body'
              bead = i
              break
            }
          }
        }
      }
      if (!where) continue

      // Either of them newly spawned? Then nobody bites anybody.
      const verdict =
        now < a.safeUntil || now < b.safeUntil
          ? 'bounce'
          : meet(levelOf(a.fed), levelOf(b.fed), where)

      if (verdict === 'eat') {
        b.dead = true
        a.fed += gainFrom(b.fed, a.fed)
        out.eaten.push({ victim: b.id, by: a.id })
      } else if (verdict === 'die') {
        a.dead = true
        b.fed += gainFrom(a.fed, b.fed)
        out.eaten.push({ victim: a.id, by: b.id })
      } else if (verdict === 'cut') {
        const beads = bodies.get(b.id)!
        const left = cutTo(bead, b.fed)
        if (!left) {
          // Bitten so far forward there is nothing in front of it.
          b.dead = true
          a.fed += gainFrom(b.fed, a.fed)
          out.eaten.push({ victim: b.id, by: a.id })
        } else {
          const lost = b.fed - left.fed
          b.fed = left.fed
          // The biter gets a share of what came off, on the same
          // diminishing terms as a kill.
          a.fed += Math.max(1, Math.round(gainFrom(lost, a.fed) * 0.8))
          // Shove the bitten one clear, so one bite is one bite and not
          // the same contact resolving again on the very next tick.
          bounce(b, a, now)
          out.bites.push({ victim: b.id, by: a.id, at: bead, lost: beads.slice(bead) })
        }
      } else {
        bounce(a, b, now)
      }
    }
  }
  return out
}

/** A severed piece goes back on the field as food. */
export function scatterBeads(
  beads: { x: number; y: number }[],
  worth: number,
  world: World,
  rng: () => number,
  /** The snake it was bitten off, so the piece stays its colour. */
  from?: Snake,
  /** Where along that snake the severed piece began. */
  at = 0
) {
  const step = Math.max(1, Math.floor(beads.length / 18))
  for (let i = 0; i < beads.length; i += step) {
    world.pellets.push(
      makePellet(
        rng,
        world.map,
        beads[i].x + (rng() - 0.5) * 20,
        beads[i].y + (rng() - 0.5) * 20,
        worth,
        from
          ? { hue: from.hue, sat: from.sat, accent: from.accent, pattern: from.pattern, index: at + i }
          : undefined
      )
    )
  }
}

/** A dead snake goes back on the field as food. */
export function scatter(s: Snake, world: World, rng: () => number) {
  const beads = segmentsOf(s)
  const step = Math.max(1, Math.floor(beads.length / 26))
  for (let i = 0; i < beads.length; i += step) {
    world.pellets.push(
      makePellet(
        rng,
        world.map,
        beads[i].x + (rng() - 0.5) * 22,
        beads[i].y + (rng() - 0.5) * 22,
        1 + Math.round(s.fed / 40),
        // What it leaves behind is the snake it was: same hue, same
        // saturation, same marking, and the same place in the body.
        { hue: s.hue, sat: s.sat, accent: s.accent, pattern: s.pattern, index: i }
      )
    )
  }
}

/**
 * Coins the player has run over. Only the player: see the note on `Coin`.
 */
export function collect(world: World, rng: () => number): number {
  const me = world.snakes.find((s) => s.player)
  if (!me || me.dead) return 0
  let got = 0
  const reach = HEAD_R + 10 + girthOf(me.fed) * 0.35
  for (let i = world.coins.length - 1; i >= 0; i--) {
    const c = world.coins[i]
    if (Math.abs(c.x - me.x) > reach || Math.abs(c.y - me.y) > reach) continue
    if (Math.hypot(c.x - me.x, c.y - me.y) > reach) continue
    got += c.value
    world.coins.splice(i, 1)
  }
  if (world.map.loot === 'coins') {
    while (world.coins.length < COIN_COUNT) world.coins.push(makeCoin(rng, world.map))
  }
  return got
}

/**
 * Chests the player has reached.
 *
 * Returns how many coins came out and how many chests were opened - the
 * second number is what the elemental skin is earned with, so it has to
 * be counted rather than inferred from the money.
 */
export function crack(world: World, now: number, rng: () => number): { coins: number; opened: number } {
  const me = world.snakes.find((s) => s.player)
  if (!me || me.dead) return { coins: 0, opened: 0 }
  let coins = 0
  let opened = 0
  const reach = CHEST_REACH + girthOf(me.fed) * 0.5
  for (const c of world.chests) {
    if (c.openedAt) continue
    if (Math.hypot(c.x - me.x, c.y - me.y) > reach) continue
    c.openedAt = now
    coins += c.value
    opened++
  }
  // Clear the ones whose opening has played out, and put fresh ones on
  // the field so a long run is not left with an empty map.
  world.chests = world.chests.filter((c) => !c.openedAt || now - c.openedAt < 900)
  while (world.chests.length < CHEST_COUNT) world.chests.push(makeChest(rng, world.map))
  return { coins, opened }
}

/** A snake you ate drops what it was worth, right where it died. */
export function dropBounty(at: Snake, world: World, rng: () => number) {
  const total = bountyFor(at.fed)
  const lumps = Math.max(2, Math.min(7, Math.round(total / 6)))
  const each = Math.max(1, Math.round(total / lumps))
  for (let i = 0; i < lumps; i++) {
    world.coins.push(
      makeCoin(rng, world.map, at.x + (rng() - 0.5) * 90, at.y + (rng() - 0.5) * 90, each)
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
  // Keep the field stocked - and capped. Every death scatters food, and
  // with rivals arriving for ever that only ever goes one way: a long
  // run reached seven and a half thousand pellets on the floor, all of
  // them walked over every frame by every snake.
  while (world.pellets.length < world.map.pellets) world.pellets.push(makePellet(rng, world.map))
  const ceiling = Math.round(world.map.pellets * 2.2)
  if (world.pellets.length > ceiling) {
    // Drop the oldest, which are the ones furthest from whatever is
    // happening now.
    world.pellets.splice(0, world.pellets.length - ceiling)
  }
  return playerGot
}

/** Rivals that died are replaced, so the arena never empties out. */
/**
 * Keep the arena full, for ever.
 *
 * There is no roster. Rivals are spawned to hold a population, that
 * population grows a little as you do, and a dead one is replaced by a
 * new one within a second or so - so however long you last there is
 * always something else coming.
 *
 * New arrivals are sized in three bands rather than off one random
 * curve, because the curve alone drifted: once the player was large,
 * everything that spawned was large with it and there was nothing left
 * to hunt. Most arrivals are small, some are a match, and a few are
 * bigger than you. That holds whether you are level two or level thirty.
 */
export function restock(world: World, now: number, rng: () => number) {
  const player = world.snakes.find((s) => s.player)
  const mine = player?.fed ?? 0

  // The arena gets busier as you grow, up to a point.
  const want = world.map.rivals + Math.min(8, Math.floor(levelOf(mine) / 2))
  const alive = world.snakes.filter((s) => !s.dead && !s.player).length

  // Trickle them in rather than refilling the whole field at once, so a
  // big kill does not instantly summon a crowd on top of you.
  if (alive < want && now >= world.nextSpawnAt) {
    // Everything arrives at level one and earns whatever it gets from
    // there. Nothing is handed a size - a big snake in here is one that
    // has been alive a while and eaten well, which is the only reason it
    // should ever be frightening.
    const spot = clearOf(player, rng, world.map)
    const hues = rivalHues(player?.hue ?? 140)
    const s = makeSnake(world.nextId++, spot.x, spot.y, START_FED, false, rng, {
      hue: hues[world.nextId % hues.length],
      pattern: 'bands',
    }, world.map)
    s.safeUntil = now + SPAWN_GRACE
    const yours = player?.friend?.spec.cost ?? 0
    s.friend = makeFriend(rivalCompanion(yours, rng(), rng()), s.x, s.y)
    world.snakes.push(s)
    // Faster when the field is thin, slower when it is nearly full.
    const short = want - alive
    world.nextSpawnAt = now + Math.max(120, 900 - short * 110)
  }

  world.snakes = world.snakes.filter((s) => !s.dead || s.player)
}
