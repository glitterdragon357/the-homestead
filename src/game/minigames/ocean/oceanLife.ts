/**
 * The living part of the ocean: where fish are, and what they do next.
 *
 * Kept out of the component and free of React so the rules can be run
 * headless. The invariant that matters is that a species is only ever
 * found in water it actually lives in - a trench fish must never turn up
 * in the shallows because that is where the diver happens to be - and
 * that is far easier to prove over ten thousand simulated steps than to
 * spot by swimming around looking for it.
 */

import {
  SHELF_BOTTOM,
  SPECIES,
  SURFACE_Y,
  WORLD,
  fleeRange,
  floorHeightAt,
  shoreEdgeFor,
  type Species,
} from './oceanData'

export interface Eye {
  x: number
  y: number
  z: number
}

export interface Fish {
  sp: Species
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  seed: number
  /** Seconds of bolting left. */
  panic: number
}


export function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

/** Somewhere this species could actually be: right depth, real water. */
export function spawnPoint(sp: Species) {
  let y = rand(sp.min, Math.min(sp.max, SHELF_BOTTOM - 60))
  const x = rand(shoreEdgeFor(y), WORLD.width - 60)
  const z = rand(60, WORLD.depth - 60)
  const bed = floorHeightAt(x) - 30
  if (y > bed) y = Math.max(sp.min, bed)
  return { x, y, z }
}

/**
 * A spot in that species' water, out at the edge of what you can see.
 *
 * Fish that wander off are quietly recycled to the far side of your
 * vision rather than left swimming around an empty ocean. It keeps the
 * sea populated wherever you go without carrying thousands of them, and
 * because the depth band is still honoured, the deep species still only
 * ever turn up in the deep.
 */
export function spawnAhead(sp: Species, cam: Eye, near: number) {
  for (let attempt = 0; attempt < 14; attempt++) {
    const a = Math.random() * Math.PI * 2
    const r = rand(near * 0.75, near * 1.3)
    const x = cam.x + Math.cos(a) * r
    const z = cam.z + Math.sin(a) * r
    if (x < 40 || x > WORLD.width - 40 || z < 40 || z > WORLD.depth - 40) continue
    const bed = floorHeightAt(x) - 30
    const lo = Math.max(sp.min, SURFACE_Y + 20)
    const hi = Math.min(sp.max, bed)
    if (hi <= lo) continue
    // Only within reach of its own band, so a trench fish never turns up
    // in the shallows just because that is where you happen to be.
    const y = rand(lo, hi)
    if (Math.abs(y - cam.y) > 900) continue
    return { x, y, z }
  }
  return null
}

export function makeFish(sp: Species, at: { x: number; y: number; z: number }): Fish {
  const heading = Math.random() * Math.PI * 2
  return {
    sp,
    x: at.x,
    y: at.y,
    z: at.z,
    vx: Math.cos(heading) * sp.speed * 0.6,
    vy: 0,
    vz: Math.sin(heading) * sp.speed * 0.6,
    seed: Math.random() * 100,
    panic: 0,
  }
}

export function populate(cam: Eye): Fish[] {
  const out: Fish[] = []
  for (const sp of SPECIES) {
    const groups = sp.school > 1 ? 2 : 1
    for (let g = 0; g < groups; g++) {
      const at = spawnPoint(sp)
      for (let i = 0; i < sp.school; i++) {
        out.push(
          makeFish(sp, {
            x: at.x + rand(-90, 90),
            y: at.y + rand(-40, 40),
            z: at.z + rand(-90, 90),
          })
        )
      }
    }
  }
  void cam
  return out
}

export function stepFish(f: Fish, dt: number, t: number, cam: Eye, maxSpeed: number, camSpeed: number) {
  const dx = f.x - cam.x
  const dy = f.y - cam.y
  const dz = f.z - cam.z
  const d = Math.hypot(dx, dy, dz) || 1

  if (d < fleeRange(f.sp, camSpeed, maxSpeed)) f.panic = Math.max(f.panic, 1.2)

  if (f.panic > 0) {
    f.panic -= dt
    const s = f.sp.speed * 1.9
    const k = Math.min(1, dt * 5)
    f.vx += ((dx / d) * s - f.vx) * k
    f.vy += ((dy / d) * s - f.vy) * k
    f.vz += ((dz / d) * s - f.vz) * k
  } else {
    // Cruise, with a slow turn so nothing swims in a dead straight line.
    const turn = Math.sin(t * 0.0004 + f.seed) * 0.5 * dt
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    const nx = f.vx * cos - f.vz * sin
    const nz = f.vx * sin + f.vz * cos
    f.vx = nx
    f.vz = nz
    const flat = Math.hypot(f.vx, f.vz) || 1
    const cruise = f.sp.speed * (0.45 + 0.55 * Math.abs(Math.sin(t * 0.0004 + f.seed)))
    f.vx = (f.vx / flat) * cruise
    f.vz = (f.vz / flat) * cruise
    const rise = Math.sin(t * 0.0007 + f.seed * 2.3) * f.sp.speed * 0.2
    f.vy += (rise - f.vy) * Math.min(1, dt * 0.9)
  }

  const wasX = f.x
  f.x += f.vx * dt
  f.y += f.vy * dt
  f.z += f.vz * dt

  if (f.x < 40 || f.x > WORLD.width - 40) f.vx = -f.vx
  if (f.z < 40 || f.z > WORLD.depth - 40) f.vz = -f.vz
  f.x = Math.min(WORLD.width - 40, Math.max(40, f.x))
  f.z = Math.min(WORLD.depth - 40, Math.max(40, f.z))

  // The shelf rises as you come inshore. Turn back rather than swim in
  // over ground that is shallower than this species lives - otherwise the
  // depth clamp below has to choose between putting it above its own band
  // or burying it in the sand, and it used to pick the sand.
  if (floorHeightAt(f.x) - 20 < f.sp.min) {
    f.x = wasX
    f.vx = -f.vx
  }

  const ceiling = Math.max(SURFACE_Y + 18, f.sp.min)
  const bed = Math.min(f.sp.max, floorHeightAt(f.x) - 16)
  if (bed <= ceiling) {
    f.y = Math.max(SURFACE_Y + 12, bed)
  } else if (f.y < ceiling) {
    f.y = ceiling
    f.vy = Math.abs(f.vy)
  } else if (f.y > bed) {
    f.y = bed
    f.vy = -Math.abs(f.vy)
  }
}

