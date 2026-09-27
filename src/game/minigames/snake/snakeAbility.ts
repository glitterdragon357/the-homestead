/**
 * The five special snakes.
 *
 * Each of these is a single use, found only in the Wringer, and the code
 * here is what happens while one is out. They are deliberately strong -
 * strong enough to turn a run around - and the balance comes entirely
 * from how hard they are to get and the fact that using one spends it.
 *
 * All five hang off the player. Rivals never get them: a rival with a
 * King is a rival with four snakes, on a map where you are already
 * outnumbered sixteen to one, and the Wringer does not need the help.
 */

import {
  type AbilityKey,
  type Coin,
  type MapSpec,
  type Snake,
  ABILITY_BY_KEY,
  FOG_RADIUS,
  GOO_BOOST,
  GOO_LIFE,
  GOO_SLOW,
  KING_COUNT,
  KING_NIP,
  KING_REST,
  MAGNET_RADIUS,
  inArena,
  speedOf,
} from './snakeData'

/** A patch of the slug's trail. */
export interface Goo {
  x: number
  y: number
  bornAt: number
}

/** One of the King's snakes, out fighting on your behalf. */
export interface Minion {
  x: number
  y: number
  /** Where in the ring around you it sits when it has nothing to do. */
  phase: number
  /** The earliest it can bite again. */
  restUntil: number
  /** Who it is going for, and how long the lunge stays drawn. */
  targetId: number | null
  dartUntil: number
  /** Coins it has picked up and not yet handed over. */
  carrying: number
}

export interface Effects {
  /** When each ability that is out runs out. */
  until: Partial<Record<AbilityKey, number>>
  minions: Minion[]
  goo: Goo[]
}

export function makeEffects(): Effects {
  return { until: {}, minions: [], goo: [] }
}

/** Whether one is out right now. */
export function isOut(fx: Effects, key: AbilityKey, now: number): boolean {
  return (fx.until[key] ?? 0) > now
}

/** How much of one is left, 0 to 1. Zero when it is not out at all. */
export function leftOf(fx: Effects, key: AbilityKey, now: number): number {
  const ends = fx.until[key] ?? 0
  if (ends <= now) return 0
  return Math.min(1, (ends - now) / ABILITY_BY_KEY[key].lasts)
}

/** Everything currently out, for the HUD. */
export function outNow(fx: Effects, now: number): { key: AbilityKey; left: number }[] {
  return (Object.keys(fx.until) as AbilityKey[])
    .map((key) => ({ key, left: leftOf(fx, key, now) }))
    .filter((e) => e.left > 0)
}

/**
 * Take one out.
 *
 * Using the same kind twice does not stack, it restarts - two Kings at
 * once would mean six minions, and the second charge would be worth
 * less than the first, which is a bad thing to let someone do by
 * accident.
 */
export function unleash(fx: Effects, key: AbilityKey, now: number, me: Snake) {
  fx.until[key] = now + ABILITY_BY_KEY[key].lasts
  if (key === 'king') {
    fx.minions = []
    for (let i = 0; i < KING_COUNT; i++) {
      fx.minions.push({
        x: me.x,
        y: me.y,
        phase: (i / KING_COUNT) * Math.PI * 2,
        restUntil: 0,
        targetId: null,
        dartUntil: 0,
        carrying: 0,
      })
    }
  }
}

/**
 * One tick of whatever is out.
 *
 * Returns the coins the King's snakes handed over, which is the only
 * money any of this makes directly.
 */
export function runEffects(
  fx: Effects,
  me: Snake,
  others: Snake[],
  coins: Coin[],
  map: MapSpec,
  now: number,
  dt: number
): number {
  let delivered = 0

  // Everything runs at its own pace unless something changes it.
  me.pace = 1
  for (const s of others) s.pace = 1

  /* --- Nobody: unseen, everywhere, by everything ------------------- */
  me.unseen = isOut(fx, 'nobody', now) ? 1 : 0

  /* --- Fog Breath: a bank nothing else can see through -------------- */
  if (isOut(fx, 'fog', now)) {
    for (const s of others) {
      if (s.dead) continue
      if (Math.hypot(s.x - me.x, s.y - me.y) < FOG_RADIUS) s.blindUntil = now + 220
    }
  }

  /* --- Coin Magnet: the coins come to you --------------------------- */
  if (isOut(fx, 'magnet', now)) {
    for (const c of coins) {
      const dx = me.x - c.x
      const dy = me.y - c.y
      const d = Math.hypot(dx, dy)
      if (d > MAGNET_RADIUS || d < 1) continue
      // Faster the closer it gets, so the last stretch snaps in.
      const pull = (520 + (1 - d / MAGNET_RADIUS) * 700) * dt
      c.x += (dx / d) * Math.min(pull, d)
      c.y += (dy / d) * Math.min(pull, d)
    }
  }

  /* --- Slug Snake: sticky behind you, quick underneath you ---------- */
  if (isOut(fx, 'slug', now)) {
    me.pace = GOO_BOOST
    const last = fx.goo[fx.goo.length - 1]
    if (!last || Math.hypot(me.x - last.x, me.y - last.y) > 30) {
      fx.goo.push({ x: me.x, y: me.y, bornAt: now })
    }
  }
  if (fx.goo.length > 0) {
    // The trail outlives the ability - laying it down is the point, and
    // it would be a strange thing to have evaporate the instant the
    // twenty seconds are up.
    while (fx.goo.length > 0 && now - fx.goo[0].bornAt > GOO_LIFE) fx.goo.shift()
    for (const s of others) {
      if (s.dead) continue
      for (const g of fx.goo) {
        if (Math.abs(s.x - g.x) > 46 || Math.abs(s.y - g.y) > 46) continue
        if (Math.hypot(s.x - g.x, s.y - g.y) < 46) {
          s.pace = GOO_SLOW
          break
        }
      }
    }
  }

  /* --- King Snake: they fight for you and bring back what they find - */
  if (isOut(fx, 'king', now)) {
    for (const m of fx.minions) {
      // Carrying something? Then it is on its way back to you, and it
      // will not be distracted on the way. Without this they hand over
      // nothing at all: there is nearly always another rival inside
      // three hundred units, so a minion that picked up a coin simply
      // fought on with it forever.
      const goingHome = m.carrying > 0

      // Otherwise, look for something to bite, and failing that hold
      // station in a ring around the head.
      let best: Snake | null = null
      let bestD = 300
      if (!goingHome) {
        for (const s of others) {
          if (s.dead || s.unseen > 0.6) continue
          const d = Math.hypot(s.x - m.x, s.y - m.y)
          if (d < bestD) {
            bestD = d
            best = s
          }
        }
      }

      const ring = 110
      const want = best
        ? { x: best.x, y: best.y }
        : goingHome
        ? { x: me.x, y: me.y }
        : {
            x: me.x + Math.cos(now * 0.002 + m.phase) * ring,
            y: me.y + Math.sin(now * 0.002 + m.phase) * ring,
          }

      // Chased at a real speed, not eased toward.
      //
      // These used to close on a target by lerping a fraction of the
      // remaining gap each tick, which looks fine and cannot ever catch
      // anything: a rival moving at its own speed held the minion at a
      // steady sixty units away for as long as the chase lasted, so the
      // King sent out three snakes that never once landed a bite. They
      // are small, so they are quicker than a snake - that is the whole
      // reason they can run something down.
      const dx = want.x - m.x
      const dy = want.y - m.y
      const gap = Math.hypot(dx, dy)
      if (gap > 0.5) {
        const step = Math.min(gap, speedOf(me.fed, false) * 1.45 * dt)
        m.x += (dx / gap) * step
        m.y += (dy / gap) * step
      }
      const held = inArena(m.x, m.y, 8, map)
      m.x = held.x
      m.y = held.y

      if (best && bestD < 54 && now >= m.restUntil) {
        const took = Math.min(KING_NIP, best.fed)
        m.restUntil = now + KING_REST
        m.targetId = best.id
        m.dartUntil = now + 200
        if (took > 0) {
          best.fed = Math.max(0, best.fed - took)
          best.bittenUntil = now + 200
        }
      }

      // Loot on the way past, handed over when it gets back to you.
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]
        if (Math.hypot(c.x - m.x, c.y - m.y) < 40) {
          coins.splice(i, 1)
          m.carrying += c.value
        }
      }
      if (m.carrying > 0 && Math.hypot(me.x - m.x, me.y - m.y) < 90) {
        delivered += m.carrying
        m.carrying = 0
      }
    }
  } else if (fx.minions.length > 0) {
    // They go home when the King does, and anything still in their
    // mouths comes with them.
    for (const m of fx.minions) delivered += m.carrying
    fx.minions = []
  }

  return delivered
}
