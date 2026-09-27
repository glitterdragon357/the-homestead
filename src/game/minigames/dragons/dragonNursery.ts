/**
 * The nursery floor.
 *
 * A shift is a couple of minutes of minding a room full of eggs while
 * the things that already hatched go off in it. A dragonette has a grown
 * dragon's ability and a baby's grip on it, so every one of them is a
 * hazard aimed at nothing in particular - and the eggs that have not
 * hatched yet are on the same floor.
 *
 * Nothing here is malicious. A dragonette that lands on an egg was not
 * going for the egg; it was going somewhere and the egg was there. That
 * is the difference between this and a game about enemies, and it is why
 * the answer is always to move the egg rather than to fight the baby.
 */

import { type AbilityKind, type Dragon, ABILITY_BY_KIND, typeOf } from './dragonData'

export const ROOM = { w: 900, h: 560 }

/** How long a shift runs, and how long an egg takes to hatch. */
export const SHIFT = 150_000
/**
 * Long enough that an egg spends most of the shift in the shell.
 *
 * At twenty-two to sixty-two seconds every egg on the floor had hatched
 * inside the first minute of a two and a half minute shift, so for most
 * of the shift there was nothing left to damage and a nursery nobody
 * minded at all came through clean.
 */
export const HATCH_MIN = 55_000
export const HATCH_MAX = 138_000

export const EGG_R = 20
export const BABY_R = 17
export const PROP_R = 26

export interface Egg {
  id: number
  code: number
  x: number
  y: number
  /** Condition, 1 whole down to 0 lost. */
  hp: number
  /** When it opens. */
  hatchAt: number
  /** Silk on the shell. Smothers it until you pull it off. */
  silk: number
  /** Set when something hurts it, so the flinch is visible. */
  hurtUntil: number
  lost: boolean
  hatched: boolean
  /** Being dragged by the player right now. */
  held: boolean
}

export interface Baby {
  id: number
  code: number
  ability: AbilityKind
  x: number
  y: number
  heading: number
  /** When it next loses control of itself. */
  nextAt: number
  /** Settled by the player, and calm until this moment. */
  calmUntil: number
  /** The ability going off right now, and when it stops. */
  firingUntil: number
  /** Where it blinked from, for the trail. */
  fromX: number
  fromY: number
  blinkedAt: number
}

/** A bin, a crate - something heavy that a strong baby can send flying. */
export interface Prop {
  id: number
  kind: 'bin' | 'crate' | 'ball'
  x: number
  y: number
  vx: number
  vy: number
  held: boolean
}

export interface Nursery {
  eggs: Egg[]
  babies: Baby[]
  props: Prop[]
  t: number
  startedAt: number
  nextId: number
  /** Eggs seen safely out of the shell, and eggs lost. */
  hatched: number
  lost: number
}

/* ------------------------------------------------------------------ */
/* Building one                                                        */
/* ------------------------------------------------------------------ */

function spot(rng: () => number, pad = 70): { x: number; y: number } {
  return { x: pad + rng() * (ROOM.w - pad * 2), y: pad + rng() * (ROOM.h - pad * 2) }
}

function clearSpot(rng: () => number, taken: { x: number; y: number }[], gap = 78) {
  for (let tries = 0; tries < 60; tries++) {
    const p = spot(rng)
    if (taken.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > gap)) return p
  }
  return spot(rng)
}

export function makeNursery(
  incoming: { code: number }[],
  minders: Dragon[],
  rng: () => number
): Nursery {
  const taken: { x: number; y: number }[] = []
  let nextId = 1
  const eggs: Egg[] = incoming.map((e) => {
    const p = clearSpot(rng, taken)
    taken.push(p)
    return {
      id: nextId++,
      code: e.code,
      x: p.x,
      y: p.y,
      hp: 1,
      hatchAt: HATCH_MIN + rng() * (HATCH_MAX - HATCH_MIN),
      silk: 0,
      hurtUntil: 0,
      lost: false,
      hatched: false,
      held: false,
    }
  })
  // Whatever hatched in an earlier shift and is still too young for a
  // house of its own is in here too, being exactly as much help as a
  // baby dragon is.
  const babies: Baby[] = minders.map((d) => {
    const p = clearSpot(rng, taken, 60)
    taken.push(p)
    return newBaby(nextId++, d.code, p.x, p.y, 0, rng)
  })
  const props: Prop[] = (['bin', 'crate', 'ball', 'bin'] as const).map((kind) => {
    const p = clearSpot(rng, taken, 66)
    taken.push(p)
    return { id: nextId++, kind, x: p.x, y: p.y, vx: 0, vy: 0, held: false }
  })
  return { eggs, babies, props, t: 0, startedAt: 0, nextId, hatched: 0, lost: 0 }
}

export function newBaby(
  id: number,
  code: number,
  x: number,
  y: number,
  now: number,
  rng: () => number
): Baby {
  return {
    id,
    code,
    ability: typeOf(code).ability,
    x,
    y,
    heading: rng() * Math.PI * 2,
    // Never straight away. A baby that hatches on top of an egg and goes
    // off in the same instant is not something you could have stopped.
    nextAt: now + 4_000 + rng() * 5_000,
    calmUntil: now + 2_000,
    firingUntil: 0,
    fromX: x,
    fromY: y,
    blinkedAt: -9_999,
  }
}

/* ------------------------------------------------------------------ */
/* A tick                                                              */
/* ------------------------------------------------------------------ */

/** What happened this tick, for sound and for the running tally. */
export interface Beat {
  /** Abilities that went off, so each can be heard. */
  went: AbilityKind[]
  /** Eggs that opened safely, by code. */
  hatched: number[]
  /** Eggs lost. */
  lost: number
}

const HOLD_IN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function step(n: Nursery, now: number, dt: number, rng: () => number): Beat {
  n.t = now
  const beat: Beat = { went: [], hatched: [], lost: 0 }

  /* --- props slide and settle -------------------------------------- */
  for (const p of n.props) {
    if (p.held) {
      p.vx = 0
      p.vy = 0
      continue
    }
    if (Math.abs(p.vx) + Math.abs(p.vy) < 1) {
      p.vx = 0
      p.vy = 0
    } else {
      p.x += p.vx * dt
      p.y += p.vy * dt
      // Off the walls rather than through them.
      if (p.x < PROP_R || p.x > ROOM.w - PROP_R) p.vx *= -0.55
      if (p.y < PROP_R || p.y > ROOM.h - PROP_R) p.vy *= -0.55
      p.x = HOLD_IN(p.x, PROP_R, ROOM.w - PROP_R)
      p.y = HOLD_IN(p.y, PROP_R, ROOM.h - PROP_R)
      p.vx *= 1 - 1.7 * dt
      p.vy *= 1 - 1.7 * dt
      // Anything heavy moving into an egg is bad news for the egg.
      for (const e of n.eggs) {
        if (e.lost || e.hatched) continue
        if (Math.hypot(e.x - p.x, e.y - p.y) < PROP_R + EGG_R) {
          const speed = Math.hypot(p.vx, p.vy)
          hurt(e, (speed / 460) * 0.9 * dt * 6, now)
          p.vx *= -0.4
          p.vy *= -0.4
        }
      }
    }
  }

  /* --- babies ------------------------------------------------------ */
  for (const b of n.babies) {
    // Wander, but not evenly. Eggs are warm and babies like warm, so
    // they drift back towards the clutch without meaning anything by it.
    //
    // This is what makes the room dangerous. Left to wander truly at
    // random on a floor this size they almost never happened to be
    // pointing at an egg from inside two hundred units, and a nursery
    // with nobody minding it came through without losing one.
    if (now > b.calmUntil) {
      b.heading += (rng() - 0.5) * 2.4 * dt
      let near: Egg | null = null
      let nearD = 260
      for (const e of n.eggs) {
        if (e.lost || e.hatched) continue
        const d = Math.hypot(e.x - b.x, e.y - b.y)
        if (d < nearD) {
          nearD = d
          near = e
        }
      }
      if (near && nearD > 60) {
        const want = Math.atan2(near.y - b.y, near.x - b.x)
        let turn = ((want - b.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        b.heading += turn * Math.min(1, 0.9 * dt)
      }
      const speed = 74
      b.x += Math.cos(b.heading) * speed * dt
      b.y += Math.sin(b.heading) * speed * dt
      if (b.x < BABY_R || b.x > ROOM.w - BABY_R) b.heading = Math.PI - b.heading
      if (b.y < BABY_R || b.y > ROOM.h - BABY_R) b.heading = -b.heading
      b.x = HOLD_IN(b.x, BABY_R, ROOM.w - BABY_R)
      b.y = HOLD_IN(b.y, BABY_R, ROOM.h - BABY_R)
    }

    // The ability, while it is going off.
    if (now < b.firingUntil) {
      discharge(n, b, now, dt)
      continue
    }

    if (now < b.calmUntil || now < b.nextAt) continue

    // It goes off.
    beat.went.push(b.ability)
    b.firingUntil = now + burstOf(b.ability)
    b.nextAt = now + 5_200 + rng() * 6_500
    if (b.ability === 'teleport') {
      b.fromX = b.x
      b.fromY = b.y
      b.blinkedAt = now
      const p = spot(rng, 40)
      b.x = p.x
      b.y = p.y
      // Landed on something? It did not look first. Nothing does.
      for (const e of n.eggs) {
        if (e.lost || e.hatched) continue
        if (Math.hypot(e.x - b.x, e.y - b.y) < EGG_R + BABY_R) hurt(e, 0.42, now)
      }
    } else if (b.ability === 'strength') {
      // Shoves whatever is nearest, in whatever direction it happens to
      // be pointing.
      let best: Prop | null = null
      let bestD = 190
      for (const p of n.props) {
        const d = Math.hypot(p.x - b.x, p.y - b.y)
        if (d < bestD) {
          bestD = d
          best = p
        }
      }
      if (best && !best.held) {
        const a = Math.atan2(best.y - b.y, best.x - b.x)
        best.vx = Math.cos(a) * 430
        best.vy = Math.sin(a) * 430
      }
    }
  }

  /* --- eggs -------------------------------------------------------- */
  for (const e of n.eggs) {
    if (e.lost || e.hatched) continue
    // Silk smothers until it is pulled off.
    if (e.silk > 0) {
      hurt(e, 0.075 * dt, now)
      e.silk = Math.max(0, e.silk - 0.02 * dt)
    }
    if (e.hp <= 0) {
      e.lost = true
      n.lost++
      beat.lost++
      continue
    }
    if (now - n.startedAt > e.hatchAt) {
      e.hatched = true
      n.hatched++
      beat.hatched.push(e.code)
      n.babies.push(newBaby(n.nextId++, e.code, e.x, e.y, now, rng))
    }
  }

  return beat
}

function hurt(e: Egg, by: number, now: number) {
  if (e.held) by *= 0.35 // in your hands, it is at least partly shielded
  e.hp = Math.max(0, e.hp - by)
  e.hurtUntil = now + 260
}

function burstOf(a: AbilityKind): number {
  if (a === 'fire') return 1_400
  if (a === 'frost') return 1_600
  if (a === 'silk') return 1_100
  return 320
}

/** The part that actually damages things, for the abilities that linger. */
function discharge(n: Nursery, b: Baby, now: number, dt: number) {
  if (b.ability === 'fire') {
    for (const e of n.eggs) {
      if (e.lost || e.hatched) continue
      const d = Math.hypot(e.x - b.x, e.y - b.y)
      if (d > 190) continue
      // A cone, not a circle - which way it is facing is the whole
      // reason moving an egg sideways works.
      const a = Math.atan2(e.y - b.y, e.x - b.x)
      let off = Math.abs(((a - b.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
      if (off < 0.62) hurt(e, 0.52 * dt, now)
    }
  } else if (b.ability === 'frost') {
    for (const e of n.eggs) {
      if (e.lost || e.hatched) continue
      const d = Math.hypot(e.x - b.x, e.y - b.y)
      if (d < 130) hurt(e, 0.3 * dt * (1 - d / 130), now)
    }
  } else if (b.ability === 'silk') {
    for (const e of n.eggs) {
      if (e.lost || e.hatched) continue
      const d = Math.hypot(e.x - b.x, e.y - b.y)
      if (d > 170) continue
      const a = Math.atan2(e.y - b.y, e.x - b.x)
      const off = Math.abs(((a - b.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
      if (off < 0.8) e.silk = Math.min(1, e.silk + 0.9 * dt)
    }
  }
}

/* ------------------------------------------------------------------ */
/* What the player does                                               */
/* ------------------------------------------------------------------ */

/** Whatever is under the pointer, nearest first. */
export function pick(n: Nursery, x: number, y: number) {
  for (const e of n.eggs) {
    if (e.lost || e.hatched) continue
    if (Math.hypot(e.x - x, e.y - y) < EGG_R + 10) return { kind: 'egg' as const, id: e.id }
  }
  for (const p of n.props) {
    if (Math.hypot(p.x - x, p.y - y) < PROP_R + 6) return { kind: 'prop' as const, id: p.id }
  }
  for (const b of n.babies) {
    if (Math.hypot(b.x - x, b.y - y) < BABY_R + 12) return { kind: 'baby' as const, id: b.id }
  }
  return null
}

/**
 * Settling a dragonette.
 *
 * It buys quiet, and it is the only thing you can do to a baby - there
 * is no putting one outside and no telling one off. It also cannot be
 * spammed: settling one that is already settled does not stack.
 */
export const CALM_FOR = 7_000

export function settle(n: Nursery, id: number, now: number): boolean {
  const b = n.babies.find((x) => x.id === id)
  if (!b) return false
  if (now < b.calmUntil) return false
  b.calmUntil = now + CALM_FOR
  b.firingUntil = 0
  b.nextAt = Math.max(b.nextAt, now + CALM_FOR + 1_200)
  return true
}

/** Pulling silk off a shell. */
export function unwrap(n: Nursery, id: number): boolean {
  const e = n.eggs.find((x) => x.id === id)
  if (!e || e.silk <= 0) return false
  e.silk = 0
  return true
}

export function moveHeld(n: Nursery, held: { kind: string; id: number }, x: number, y: number) {
  if (held.kind === 'egg') {
    const e = n.eggs.find((v) => v.id === held.id)
    if (!e) return
    e.x = HOLD_IN(x, EGG_R, ROOM.w - EGG_R)
    e.y = HOLD_IN(y, EGG_R, ROOM.h - EGG_R)
  } else if (held.kind === 'prop') {
    const p = n.props.find((v) => v.id === held.id)
    if (!p) return
    p.x = HOLD_IN(x, PROP_R, ROOM.w - PROP_R)
    p.y = HOLD_IN(y, PROP_R, ROOM.h - PROP_R)
  }
}

/** How much of the shift is left. */
export function leftOf(n: Nursery, now: number): number {
  return Math.max(0, SHIFT - (now - n.startedAt))
}

/** Eggs still in one piece and still in the shell. */
export function standing(n: Nursery): number {
  return n.eggs.filter((e) => !e.lost && !e.hatched).length
}

/** The blurb for whatever is about to go wrong, for the HUD. */
export function troubleOf(a: AbilityKind): string {
  return ABILITY_BY_KIND[a].trouble
}
