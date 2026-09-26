/**
 * The city, drawn from wherever you happen to be hovering.
 *
 * Buildings are real boxes rather than billboards - the eight corners are
 * projected and the faces that face you are filled, back to front. That
 * matters here in a way it did not in the sea: you fly between these
 * things, so they have to have sides, and the side you are looking at has
 * to be the side that is there.
 */

import {
  clarity,
  fillPoly,
  fillQuad,
  hash,
  horizonY,
  mix,
  project as projectPoint,
  projectPoly,
  type Camera,
  type Projected,
} from '../../engine/firstPerson'
import { SUN, contactShadow, faceAO, litFill } from '../../engine/polish'
import {
  BLOCK,
  GROUND,
  STREET,
  VIEW,
  blockKind,
  groundHeightAt,
  isRoad,
  laneCentre,
  DOOR_WIDE,
  type Building,
  type Car,
  type Fixture,
  type Interior,
  type Person,
  type Prop,
} from './cityData'

const VIEWPORT = { width: VIEW.width, height: VIEW.height }

/**
 * Draw a face by clipping it to the near plane first.
 *
 * Everything solid goes through here. Projecting each corner and giving
 * up when one of them is behind you is what made walls disappear as you
 * walked into them.
 */
function face(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  pts: [number, number, number][],
  surface?: { ao?: number }
): boolean {
  const poly = projectPoly(cam, pts, VIEWPORT)
  if (!poly) return false
  fillPoly(ctx, poly)
  if (surface?.ao) faceAO(ctx, poly, surface.ao)
  return true
}

export function project(cam: Camera, x: number, y: number, z: number): Projected | null {
  return projectPoint(cam, x, y, z, VIEWPORT)
}

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

export function drawSky(ctx: CanvasRenderingContext2D, cam: Camera, t: number) {
  const h = horizonY(cam, VIEWPORT)
  const grad = ctx.createLinearGradient(0, Math.min(0, h - 700), 0, Math.max(h, 1))
  grad.addColorStop(0, '#4a7fb5')
  grad.addColorStop(0.55, '#9cc4dd')
  grad.addColorStop(1, '#dfe7e4')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, VIEW.width, Math.max(0, Math.min(VIEW.height, h)))
  if (h <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, VIEW.width, Math.min(VIEW.height, h))
  ctx.clip()

  const rel = ((cam.yaw - 1.4 + Math.PI) % (Math.PI * 2)) - Math.PI
  if (Math.abs(rel) < 1.3) {
    const sx = VIEW.width / 2 - Math.tan(rel) * 520
    const sy = h - 300 - Math.sin(cam.pitch) * 200
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#fff3cf'
    ctx.beginPath()
    ctx.arc(sx, sy, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    ctx.arc(sx, sy, 84, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 0.72
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 8; i++) {
    const bearing = i * 0.81 + t * 0.000008
    const r = ((bearing - cam.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    if (Math.abs(r) > 1.15) continue
    const cx = VIEW.width / 2 - Math.tan(r) * 520
    const cy = h - 210 - ((i * 51) % 150) - Math.sin(cam.pitch) * 200
    for (const [ox, oy, rr] of [[-36, 6, 20], [0, 0, 27], [34, 8, 17]]) {
      ctx.beginPath()
      ctx.ellipse(cx + ox, cy + oy, rr * 1.7, rr * 0.72, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Streets                                                             */
/* ------------------------------------------------------------------ */

/** Tarmac, paving, grass or the rubber matting of a playground. */
function groundColour(x: number, z: number): string {
  const bx = Math.floor(x / BLOCK)
  const bz = Math.floor(z / BLOCK)
  if (isRoad(x, z)) return '#3f4045'
  const ix = x - bx * BLOCK
  const iz = z - bz * BLOCK
  if (ix < STREET || iz < STREET) {
    // Paving slabs, in two shades so the pavement has a grain to it.
    const slab = (Math.floor(x / 26) + Math.floor(z / 26)) % 2
    return slab ? '#9a968e' : '#918d85'
  }
  const kind = blockKind(bx, bz)
  if (kind === 'playground') {
    // Rubber matting rather than grass, so a playground reads as one.
    const patch = (Math.floor(x / 90) + Math.floor(z / 90)) % 3
    return patch === 0 ? '#8a5a3f' : patch === 1 ? '#4a7a6a' : '#7a6a3f'
  }
  if (kind === 'park') return '#5f8a4a'
  if (kind === 'plaza') return '#9a938a'
  return '#7d7870'
}

/** A low fence round the playground blocks, so they read from anywhere. */
export function drawPlaygroundFences(ctx: CanvasRenderingContext2D, cam: Camera, sight: number) {
  const b0 = Math.floor((cam.x - sight) / BLOCK)
  const b1 = Math.floor((cam.x + sight) / BLOCK)
  const c0 = Math.floor((cam.z - sight) / BLOCK)
  const c1 = Math.floor((cam.z + sight) / BLOCK)
  ctx.save()
  ctx.strokeStyle = '#4a6f5a'
  for (let bx = b0; bx <= b1; bx++) {
    for (let bz = c0; bz <= c1; bz++) {
      if (blockKind(bx, bz) !== 'playground') continue
      const x0 = bx * BLOCK + STREET * 0.72
      const z0 = bz * BLOCK + STREET * 0.72
      const span = BLOCK - STREET * 1.1
      const d = Math.hypot(x0 + span / 2 - cam.x, z0 + span / 2 - cam.z)
      const k = clarity(d, sight)
      if (k <= 0.03) continue
      ctx.globalAlpha = k
      const step = span / 12
      for (let i = 0; i <= 12; i++) {
        for (const [px, pz] of [
          [x0 + i * step, z0],
          [x0 + i * step, z0 + span],
          [x0, z0 + i * step],
          [x0 + span, z0 + i * step],
        ]) {
          const foot = project(cam, px, GROUND - 7, pz)
          const head = project(cam, px, GROUND - 46, pz)
          if (!foot || !head) continue
          ctx.lineWidth = Math.max(0.8, 3 * foot.scale)
          ctx.beginPath()
          ctx.moveTo(foot.sx, foot.sy)
          ctx.lineTo(head.sx, head.sy)
          ctx.stroke()
        }
      }
    }
  }
  ctx.restore()
}

export function drawGround(ctx: CanvasRenderingContext2D, cam: Camera, sight: number) {
  const h = Math.max(0, horizonY(cam, VIEWPORT))
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, h - 2, VIEW.width, VIEW.height - h + 2)
  ctx.clip()

  // Lay a base down first: the cells right under you cannot be projected.
  const base = ctx.createLinearGradient(0, h, 0, VIEW.height)
  base.addColorStop(0, '#8a8b86')
  base.addColorStop(0.4, '#6f7069')
  base.addColorStop(1, '#5a5b55')
  ctx.fillStyle = base
  ctx.fillRect(0, h - 2, VIEW.width, VIEW.height - h + 2)

  const bands: [number, number, number][] = [
    [38, 0, 420],
    [110, 420, 1400],
    [300, 1400, sight],
  ]
  for (const [G, near, far] of bands) {
    const x0 = Math.floor((cam.x - far) / G) * G
    const z0 = Math.floor((cam.z - far) / G) * G
    for (let x = x0; x < cam.x + far; x += G) {
      for (let z = z0; z < cam.z + far; z += G) {
        const d = Math.hypot(x + G / 2 - cam.x, z + G / 2 - cam.z)
        if (d > far || d < near) continue
        const k = clarity(d, sight)
        if (k <= 0.02) continue
        // Each corner sits at its own height, so the kerb is a real step
        // up from the road rather than a change of colour.
        ctx.globalAlpha = k
        ctx.fillStyle = litFill(groundColour(x + G / 2, z + G / 2), 0, -1, 0, 0.62)
        face(ctx, cam, [
          [x, groundHeightAt(x, z), z],
          [x + G, groundHeightAt(x + G, z), z],
          [x + G, groundHeightAt(x + G, z + G), z + G],
          [x, groundHeightAt(x, z + G), z + G],
        ])

        // A dashed white line down the middle of the tarmac.
        if (G <= 110 && isRoad(x + G / 2, z + G / 2) && d < 900) {
          const ix = ((x % BLOCK) + BLOCK) % BLOCK
          const iz = ((z % BLOCK) + BLOCK) % BLOCK
          const midX = Math.abs(ix - STREET / 2) < G
          const midZ = Math.abs(iz - STREET / 2) < G
          const dash = Math.floor((midX ? z : x) / 46) % 2 === 0
          if ((midX || midZ) && dash) {
            const w = 3
            const p1 = midX
              ? project(cam, laneCentre(x) - w, GROUND, z)
              : project(cam, x, GROUND, laneCentre(z) - w)
            const p2 = midX
              ? project(cam, laneCentre(x) + w, GROUND, z)
              : project(cam, x, GROUND, laneCentre(z) + w)
            const p3 = midX
              ? project(cam, laneCentre(x) + w, GROUND, z + G * 0.5)
              : project(cam, x + G * 0.5, GROUND, laneCentre(z) + w)
            const p4 = midX
              ? project(cam, laneCentre(x) - w, GROUND, z + G * 0.5)
              : project(cam, x + G * 0.5, GROUND, laneCentre(z) - w)
            if (p1 && p2 && p3 && p4) {
              ctx.fillStyle = '#d8d4c4'
              fillQuad(ctx, [p1, p2, p3, p4])
            }
          }
        }
      }
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

function shade(hex: string, mul: number): string {
  const n = hex.replace('#', '')
  const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
  const out = rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * mul))))
  return `rgb(${out[0]},${out[1]},${out[2]})`
}

/**
 * One building. Only the faces turned towards you are drawn, so you can
 * fly right up to a wall and it stays a wall.
 */
/**
 * The patch of ground a building keeps the sun off.
 *
 * Both the footprint and the footprint cast out along the light lie flat
 * on the ground, so the whole shadow is one ground polygon: take the
 * convex hull of those eight points and fill it once. Filling it once is
 * the point - drawing the pieces separately makes the overlaps darker
 * and the shadow comes out looking like several shadows.
 */
export function drawBuildingShadow(
  ctx: CanvasRenderingContext2D,
  b: Building,
  cam: Camera,
  sight: number
) {
  const d = Math.hypot(b.x - cam.x, b.z - cam.z)
  const k = clarity(d, sight)
  if (k <= 0.03) return

  // Where the top of the building lands when the light is done with it.
  const reach = b.height / -SUN.y
  const ox = -SUN.x * reach
  const oz = -SUN.z * reach
  const base: [number, number][] = [
    [b.x - b.hw, b.z - b.hd],
    [b.x + b.hw, b.z - b.hd],
    [b.x + b.hw, b.z + b.hd],
    [b.x - b.hw, b.z + b.hd],
  ]
  const pts = [...base, ...base.map(([x, z]) => [x + ox, z + oz] as [number, number])]

  // Monotone chain, which is plenty for eight points.
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  const cross = (o: number[], a: number[], c: number[]) =>
    (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0])
  const half = (list: [number, number][]) => {
    const out: [number, number][] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  const hull = [...half(pts), ...half([...pts].reverse())]
  if (hull.length < 3) return

  const poly = projectPoly(cam, hull.map(([x, z]) => [x, GROUND - 0.6, z] as [number, number, number]), VIEWPORT)
  if (!poly) return
  ctx.save()
  ctx.globalAlpha = k * 0.3
  ctx.fillStyle = '#131722'
  fillPoly(ctx, poly)
  ctx.restore()
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  cam: Camera,
  sight: number,
  showDoor: boolean
) {
  const top = GROUND - b.height
  const d = Math.hypot(b.x - cam.x, b.z - cam.z)
  const k = clarity(d, sight)
  if (k <= 0.02) return

  // The four walls, as [corner a, corner b, which way it faces].
  const walls: [number, number, number, number, number, number][] = [
    [b.x - b.hw, b.z - b.hd, b.x + b.hw, b.z - b.hd, 0, -1],
    [b.x + b.hw, b.z + b.hd, b.x - b.hw, b.z + b.hd, 0, 1],
    [b.x - b.hw, b.z + b.hd, b.x - b.hw, b.z - b.hd, -1, 0],
    [b.x + b.hw, b.z - b.hd, b.x + b.hw, b.z + b.hd, 1, 0],
  ]

  ctx.save()
  ctx.globalAlpha = k
  for (const [x1, z1, x2, z2, nx, nz] of walls) {
    // Facing away from you? Then it is the far side and you cannot see it.
    const mx = (x1 + x2) / 2
    const mz = (z1 + z2) / 2
    if ((cam.x - mx) * nx + (cam.z - mz) * nz <= 0) continue

    // Lambert against the one sun, so the corners of a block read and the
    // side in shadow is lit by the sky rather than by nothing.
    ctx.fillStyle = litFill(b.wall, nx, 0, nz)
    if (!face(ctx, cam, [
      [x1, GROUND, z1],
      [x2, GROUND, z2],
      [x2, top, z2],
      [x1, top, z1],
    ], { ao: 0.42 })) continue
    const lit = 0.46 + 0.54 * Math.max(0, nx * SUN.x + nz * SUN.z)

    // Windows, but only near enough to be worth the arithmetic.
    if (d < 1600) {
      const wide = Math.hypot(x2 - x1, z2 - z1)
      const cols = Math.max(1, Math.round(wide / 46))
      const rows = Math.max(1, Math.floor(b.height / 58))
      const dark = shade(b.wall, lit * 0.34)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Glass, not painted-on rectangles: most panes hold a cold
          // reflection of the sky, a few are lit from inside, and the
          // ones facing the sun catch it flat on.
          const g = hash(b.x * 0.07 + b.z * 0.11 + r * 3.7 + c * 1.9)
          ctx.fillStyle =
            g > 0.88
              ? '#f6e0a6'
              : g > 0.74
                ? mix('#2d3a4a', '#8fb4d6', 0.15 + lit * 0.55)
                : g > 0.3
                  ? mix('#28313d', '#6d8fae', 0.1 + lit * 0.38)
                  : dark
          const u0 = (c + 0.28) / cols
          const u1 = (c + 0.72) / cols
          const y0 = GROUND - 34 - (r + 0.66) * (b.height / rows)
          const y1 = GROUND - 34 - (r + 0.2) * (b.height / rows)
          if (y1 > GROUND - 20) continue
          face(ctx, cam, [
            [x1 + (x2 - x1) * u0, y0, z1 + (z2 - z1) * u0],
            [x1 + (x2 - x1) * u1, y0, z1 + (z2 - z1) * u1],
            [x1 + (x2 - x1) * u1, y1, z1 + (z2 - z1) * u1],
            [x1 + (x2 - x1) * u0, y1, z1 + (z2 - z1) * u0],
          ])
        }
      }
    }
  }

  // Roof, if you are above it.
  if (cam.y < top) {
    {
      ctx.fillStyle = litFill(b.roof, 0, -1, 0)
      face(ctx, cam, [
        [b.x - b.hw, top, b.z - b.hd],
        [b.x + b.hw, top, b.z - b.hd],
        [b.x + b.hw, top, b.z + b.hd],
        [b.x - b.hw, top, b.z + b.hd],
      ])
      // A bit of clutter so roofs are not blank lids.
      const hv = hash(b.x * 0.01 + b.z * 0.013)
      if (hv > 0.4) {
        const bx = b.x + (hv - 0.5) * b.hw
        const bz = b.z + (hash(b.z * 0.017) - 0.5) * b.hd
        const boxTop = top - 40
        ctx.fillStyle = shade(b.roof, 1.25)
        face(ctx, cam, [
          [bx - 26, boxTop, bz - 26],
          [bx + 26, boxTop, bz - 26],
          [bx + 26, boxTop, bz + 26],
          [bx - 26, boxTop, bz + 26],
        ])
      }
    }
  }

  // The door, so you can tell what you can get into.
  if (showDoor && b.interior && d < 1400) {
    const dp = project(cam, b.doorX, GROUND, b.doorZ)
    const dt = project(cam, b.doorX, GROUND - 62, b.doorZ)
    if (dp && dt) {
      const wdt = 30 * dp.scale
      ctx.fillStyle = '#3a2f26'
      ctx.fillRect(dp.sx - wdt / 2, dt.sy, wdt, dp.sy - dt.sy)
      ctx.fillStyle = '#e8d9a8'
      ctx.fillRect(dp.sx - wdt / 2, dt.sy - 5 * dp.scale, wdt, 5 * dp.scale)
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Traffic                                                             */
/* ------------------------------------------------------------------ */

/** A car, built the same way a building is: a box with sides. */
export function drawCar(ctx: CanvasRenderingContext2D, car: Car, cam: Camera, sight: number) {
  const d = Math.hypot(car.x - cam.x, car.z - cam.z)
  const k = clarity(d, sight)
  if (k <= 0.02) return

  const c = Math.cos(car.heading)
  const sn = Math.sin(car.heading)
  const L = car.size
  const Wd = car.size * 0.42
  // Corners of the footprint, turned to face the way it is going.
  const corner = (fx: number, fz: number) => ({
    x: car.x + fx * L * sn + fz * Wd * c,
    z: car.z + fx * L * c - fz * Wd * sn,
  })
  const fl = corner(0.5, -1)
  const fr = corner(0.5, 1)
  const bl = corner(-0.5, -1)
  const br = corner(-0.5, 1)
  const top = GROUND - car.height

  ctx.save()
  ctx.globalAlpha = k

  const faces: [{ x: number; z: number }, { x: number; z: number }, number][] = [
    [fl, fr, 1],
    [br, bl, 0.72],
    [bl, fl, 0.86],
    [fr, br, 0.86],
  ]
  for (const [p, q, lit] of faces) {
    const mx = (p.x + q.x) / 2
    const mz = (p.z + q.z) / 2
    // Skip the faces pointing away, same as the buildings.
    const nx = mx - car.x
    const nz = mz - car.z
    if ((cam.x - mx) * nx + (cam.z - mz) * nz <= 0) continue
    ctx.fillStyle = shade(car.colour, lit)
    face(ctx, cam, [
      [p.x, GROUND, p.z],
      [q.x, GROUND, q.z],
      [q.x, top, q.z],
      [p.x, top, p.z],
    ])
  }

  // Roof, and a windscreen band so it reads as a car and not a crate.
  ctx.fillStyle = shade(car.colour, 1.18)
  face(ctx, cam, [
    [fl.x, top, fl.z],
    [fr.x, top, fr.z],
    [br.x, top, br.z],
    [bl.x, top, bl.z],
  ])
  const gl = corner(0.16, -1)
  const gr = corner(0.16, 1)
  ctx.fillStyle = '#2b3540'
  face(ctx, cam, [
    [gl.x, top, gl.z],
    [gr.x, top, gr.z],
    [gr.x, top + car.height * 0.42, gr.z],
    [gl.x, top + car.height * 0.42, gl.z],
  ])
  ctx.restore()
}

/** Somebody on the pavement, drawn as a little figure. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  person: Person,
  p: Projected,
  alpha: number,
  t: number
) {
  const s = p.scale * person.scale
  const step = Math.sin(t * 0.006 + person.x * 0.05) * (person.speed > 4 ? 1 : 0.15)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(p.sx, p.sy)
  ctx.scale(s, s)

  contactShadow(ctx, 0, 1.5, 11, 3.2, 0.38)

  ctx.strokeStyle = LEG_COLOURS[person.legs % LEG_COLOURS.length]
  ctx.lineWidth = 4.4
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, -18)
    ctx.lineTo(step * 5 * side, 0)
    ctx.stroke()
  }
  ctx.fillStyle = person.coat
  ctx.beginPath()
  ctx.roundRect(-6.5, -38, 13, 22, 3)
  ctx.fill()
  ctx.strokeStyle = person.coat
  ctx.lineWidth = 3.4
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * 6, -35)
    ctx.lineTo(side * 8 - step * 3 * side, -20)
    ctx.stroke()
  }
  ctx.fillStyle = '#c9a184'
  ctx.beginPath()
  ctx.arc(0, -44, 5.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const LEG_COLOURS = ['#3a3f4a', '#4a3a2f', '#2b2b30', '#5a4a3a']

/* ------------------------------------------------------------------ */
/* Street furniture                                                    */
/* ------------------------------------------------------------------ */

export function drawFixture(
  ctx: CanvasRenderingContext2D,
  f: Fixture,
  p: Projected,
  alpha: number,
  t: number
) {
  const s = p.scale
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(p.sx, p.sy)
  ctx.scale(s, s)
  const swing = Math.sin(t * 0.002 + f.x * 0.01)

  switch (f.kind) {
    case 'swings':
      ctx.strokeStyle = '#5f6a72'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(-46, 0)
      ctx.lineTo(-24, -74)
      ctx.lineTo(24, -74)
      ctx.lineTo(46, 0)
      ctx.stroke()
      for (const ox of [-16, 16]) {
        ctx.strokeStyle = '#8d949a'
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.moveTo(ox, -72)
        ctx.lineTo(ox + swing * 12, -22)
        ctx.stroke()
        ctx.fillStyle = '#c2542f'
        ctx.fillRect(ox + swing * 12 - 9, -24, 18, 5)
      }
      break
    case 'slide':
      ctx.strokeStyle = '#5f6a72'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-30, -60)
      ctx.stroke()
      ctx.fillStyle = '#e0a03a'
      ctx.beginPath()
      ctx.moveTo(-34, -60)
      ctx.lineTo(-18, -58)
      ctx.lineTo(44, -4)
      ctx.lineTo(28, 0)
      ctx.closePath()
      ctx.fill()
      break
    case 'roundabout':
      ctx.fillStyle = '#3f7a8a'
      ctx.beginPath()
      ctx.ellipse(0, -8, 46, 15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#d9d2c4'
      ctx.lineWidth = 3
      for (let i = 0; i < 4; i++) {
        const a = t * 0.0016 + (i * Math.PI) / 4
        ctx.beginPath()
        ctx.moveTo(-Math.cos(a) * 44, -8 - Math.sin(a) * 13)
        ctx.lineTo(Math.cos(a) * 44, -8 + Math.sin(a) * 13)
        ctx.stroke()
      }
      break
    case 'climber':
      ctx.strokeStyle = '#7a8a92'
      ctx.lineWidth = 3.4
      for (let i = 0; i <= 3; i++) {
        ctx.beginPath()
        ctx.moveTo(-42 + i * 28, 0)
        ctx.lineTo(-42 + i * 28, -62)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-42, -i * 20)
        ctx.lineTo(42, -i * 20)
        ctx.stroke()
      }
      break
    case 'seesaw':
      ctx.fillStyle = '#6f7a80'
      ctx.beginPath()
      ctx.moveTo(-10, 0)
      ctx.lineTo(10, 0)
      ctx.lineTo(0, -26)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#c2542f'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(-46, -26 + swing * 16)
      ctx.lineTo(46, -26 - swing * 16)
      ctx.stroke()
      break
    case 'fountain':
      ctx.fillStyle = '#8d949a'
      ctx.beginPath()
      ctx.ellipse(0, 0, 52, 17, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6fb0d8'
      ctx.beginPath()
      ctx.ellipse(0, -2, 42, 12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#bfe4f2'
      ctx.lineWidth = 3
      for (const dir of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(0, -8)
        ctx.quadraticCurveTo(dir * 20, -56 - swing * 5, dir * 34, -6)
        ctx.stroke()
      }
      break
    case 'bandstand':
      ctx.fillStyle = '#8a7f6a'
      ctx.beginPath()
      ctx.ellipse(0, 0, 56, 18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#6f6455'
      ctx.lineWidth = 4
      for (const ox of [-44, -16, 16, 44]) {
        ctx.beginPath()
        ctx.moveTo(ox, -6)
        ctx.lineTo(ox, -66)
        ctx.stroke()
      }
      ctx.fillStyle = '#4f6a52'
      ctx.beginPath()
      ctx.moveTo(-62, -64)
      ctx.lineTo(0, -96)
      ctx.lineTo(62, -64)
      ctx.closePath()
      ctx.fill()
      break
    case 'statue':
      ctx.fillStyle = '#7d7a72'
      ctx.fillRect(-20, -22, 40, 22)
      ctx.fillStyle = '#95928a'
      ctx.beginPath()
      ctx.ellipse(0, -46, 13, 26, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, -78, 11, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'clock':
      ctx.fillStyle = '#8a7f70'
      ctx.fillRect(-24, -190, 48, 190)
      ctx.fillStyle = '#efe6d2'
      ctx.beginPath()
      ctx.arc(0, -160, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#2b2620'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(0, -160)
      ctx.lineTo(Math.cos(t * 0.0005) * 12, -160 + Math.sin(t * 0.0005) * 12)
      ctx.stroke()
      ctx.fillStyle = '#5a4f42'
      ctx.beginPath()
      ctx.moveTo(-30, -190)
      ctx.lineTo(0, -226)
      ctx.lineTo(30, -190)
      ctx.closePath()
      ctx.fill()
      break
    case 'market':
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = i === 0 ? '#c2542f' : '#3f7a8a'
        ctx.beginPath()
        ctx.moveTo(i * 46 - 26, -44)
        ctx.lineTo(i * 46 + 26, -44)
        ctx.lineTo(i * 46 + 20, -32)
        ctx.lineTo(i * 46 - 20, -32)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#8a7f6a'
        ctx.fillRect(i * 46 - 22, -32, 44, 30)
      }
      break
    case 'pond':
      ctx.fillStyle = '#4a7a5a'
      ctx.beginPath()
      ctx.ellipse(0, 0, 78, 26, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4f8fb8'
      ctx.beginPath()
      ctx.ellipse(0, 0, 68, 20, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8e2d6'
      for (let i = 0; i < 3; i++) {
        const a = t * 0.0004 + i * 2
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * 34, Math.sin(a) * 9 - 4, 7, 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'bench':
      ctx.fillStyle = '#6f5a42'
      ctx.fillRect(-26, -18, 52, 6)
      ctx.fillRect(-26, -34, 52, 5)
      ctx.fillStyle = '#4a4a4e'
      ctx.fillRect(-24, -12, 5, 12)
      ctx.fillRect(19, -12, 5, 12)
      break
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Indoors                                                             */
/* ------------------------------------------------------------------ */

/**
 * A room, drawn with the same machinery as the street outside.
 *
 * Going inside used to swap the world for a picture and a list. It is a
 * place now: four walls, a floor, a ceiling and things standing on it,
 * and you walk around it the way you walk anywhere else.
 */
export function drawRoom(ctx: CanvasRenderingContext2D, room: Interior, cam: Camera) {
  const { hw, hd, tall } = room
  const floorY = GROUND
  const roofY = GROUND - tall

  ctx.save()

  // Floor, laid in slabs so you can see yourself moving over it.
  const step = 40
  for (let x = -hw; x < hw; x += step) {
    for (let z = -hd; z < hd; z += step) {
      const slab = (Math.floor(x / step) + Math.floor(z / step)) % 2
      ctx.fillStyle = slab ? room.floor : shade(room.floor, 0.92)
      face(ctx, cam, [
        [x, floorY, z],
        [Math.min(x + step, hw), floorY, z],
        [Math.min(x + step, hw), floorY, Math.min(z + step, hd)],
        [x, floorY, Math.min(z + step, hd)],
      ])
    }
  }

  ctx.fillStyle = room.ceiling
  face(ctx, cam, [
    [-hw, roofY, -hd],
    [hw, roofY, -hd],
    [hw, roofY, hd],
    [-hw, roofY, hd],
  ])

  // The four walls, lit slightly differently so corners read.
  const walls: [[number, number], [number, number], number][] = [
    [[-hw, hd], [hw, hd], 1],
    [[hw, -hd], [-hw, -hd], 0.82],
    [[hw, hd], [hw, -hd], 0.9],
    [[-hw, -hd], [-hw, hd], 0.9],
  ]
  for (const [[x1, z1], [x2, z2], lit] of walls) {
    ctx.fillStyle = shade(room.wall, lit)
    face(ctx, cam, [
      [x1, floorY, z1],
      [x2, floorY, z2],
      [x2, roofY, z2],
      [x1, roofY, z1],
    ])
  }

  // The way back out, in the near wall.
  ctx.fillStyle = '#2b2118'
  face(ctx, cam, [
    [-DOOR_WIDE, floorY, -hd + 1],
    [DOOR_WIDE, floorY, -hd + 1],
    [DOOR_WIDE, floorY - 68, -hd + 1],
    [-DOOR_WIDE, floorY - 68, -hd + 1],
  ])
  ctx.fillStyle = '#e8d9a8'
  face(ctx, cam, [
    [-DOOR_WIDE, floorY - 68, -hd + 1],
    [DOOR_WIDE, floorY - 68, -hd + 1],
    [DOOR_WIDE, floorY - 74, -hd + 1],
    [-DOOR_WIDE, floorY - 74, -hd + 1],
  ])
  ctx.restore()
}

/** One thing standing in a room. */
export function drawProp(
  ctx: CanvasRenderingContext2D,
  prop: Prop,
  p: Projected,
  t: number,
  done: boolean
) {
  const s = p.scale
  ctx.save()
  ctx.translate(p.sx, p.sy)
  ctx.scale(s, s)
  const r = prop.r
  const h = prop.h

  switch (prop.art) {
    case 'counter':
      ctx.fillStyle = '#5a4634'
      ctx.fillRect(-r, -h, r * 2, h)
      ctx.fillStyle = '#8a7255'
      ctx.fillRect(-r - 4, -h - 6, r * 2 + 8, 8)
      ctx.fillStyle = '#d9c04a'
      ctx.fillRect(-r * 0.5, -h - 20, 14, 14)
      break
    case 'table':
      ctx.fillStyle = '#6f5a42'
      ctx.fillRect(-r, -h, r * 2, 7)
      ctx.fillRect(-r * 0.7, -h + 7, 6, h - 7)
      ctx.fillRect(r * 0.5, -h + 7, 6, h - 7)
      ctx.fillStyle = '#c2452f'
      ctx.fillRect(-10, -h - 12, 20, 12)
      break
    case 'shelf':
      ctx.fillStyle = '#3f3226'
      ctx.fillRect(-r, -h, r * 2, h)
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#7a6a52'
        ctx.fillRect(-r + 3, -h + 8 + i * (h / 4), r * 2 - 6, 5)
        for (let c = 0; c < 6; c++) {
          ctx.fillStyle = ['#8a3f3a', '#3f5a7a', '#4a7a52', '#8a7a3a', '#6a4a7a', '#7a5a3a'][(i + c) % 6]
          ctx.fillRect(-r + 6 + c * ((r * 2 - 12) / 6), -h + 8 + i * (h / 4) - 14, 6, 14)
        }
      }
      break
    case 'machine':
      ctx.fillStyle = '#c2452f'
      ctx.fillRect(-r, -h, r * 2, h)
      ctx.fillStyle = '#101018'
      ctx.fillRect(-r + 6, -h + 8, r * 2 - 12, h * 0.42)
      ctx.fillStyle = Math.sin(t * 0.006) > 0 ? '#7cf2b8' : '#f2e07c'
      ctx.fillRect(-r + 12, -h + 14, 9, 8)
      break
    case 'seat':
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = '#7a2f38'
        ctx.fillRect(i * 26 - 11, -h, 22, h * 0.6)
        ctx.fillStyle = '#8f3a44'
        ctx.fillRect(i * 26 - 11, -h - 14, 22, 16)
      }
      break
    case 'oven':
      ctx.fillStyle = '#5a4634'
      ctx.fillRect(-r, -h, r * 2, h)
      ctx.fillStyle = '#2b2018'
      ctx.fillRect(-r + 8, -h + 16, r * 2 - 16, h * 0.4)
      ctx.fillStyle = '#e0a03a'
      ctx.globalAlpha = 0.6
      ctx.fillRect(-r + 12, -h + 20, r * 2 - 24, h * 0.32)
      ctx.globalAlpha = 1
      break
    case 'crate':
      ctx.fillStyle = '#2b2438'
      ctx.fillRect(-r, -h, r * 2, h)
      for (let c = 0; c < 7; c++) {
        ctx.fillStyle = ['#c2452f', '#e0c04a', '#3f7ac2', '#4fa87a'][c % 4]
        ctx.fillRect(-r + 4 + c * ((r * 2 - 8) / 7), -h + 5, 5, h - 10)
      }
      break
    case 'desk':
      ctx.fillStyle = '#6f5a42'
      ctx.fillRect(-r, -h, r * 2, 8)
      ctx.fillRect(-r + 4, -h + 8, 10, h - 8)
      ctx.fillRect(r - 14, -h + 8, 10, h - 8)
      ctx.fillStyle = '#e8e2d6'
      ctx.fillRect(-14, -h - 9, 28, 10)
      ctx.fillStyle = '#2f4a3a'
      ctx.fillRect(r * 0.4, -h - 22, 10, 14)
      break
    case 'stairs':
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#8a857c' : '#9a958c'
        ctx.fillRect(-r + i * 6, -i * (h / 5), r * 2 - i * 12, h / 5 + 2)
      }
      break
    case 'whale':
      ctx.strokeStyle = '#d9d2c0'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(-r * 1.6, -h)
      ctx.quadraticCurveTo(0, -h - 34, r * 1.6, -h + 8)
      ctx.stroke()
      ctx.lineWidth = 4
      for (let i = 0; i < 9; i++) {
        const q = (i / 8 - 0.5) * 2
        ctx.beginPath()
        ctx.moveTo(q * r * 1.5, -h - Math.cos(q * 1.4) * 22)
        ctx.lineTo(q * r * 1.5 - 6, -h + 30 - Math.cos(q * 1.4) * 16)
        ctx.stroke()
      }
      break
    case 'screen':
      ctx.fillStyle = '#1a1418'
      ctx.fillRect(-r, -h, r * 2, h)
      ctx.fillStyle = '#c8ccc4'
      ctx.fillRect(-r + 7, -h + 7, r * 2 - 14, h - 14)
      break
    case 'window':
      ctx.fillStyle = '#3f4a54'
      ctx.fillRect(-r, -h, r * 2, h)
      ctx.fillStyle = '#a8ccdd'
      ctx.fillRect(-r + 6, -h + 6, r * 2 - 12, h - 12)
      ctx.fillStyle = '#7d94a8'
      for (let i = 0; i < 4; i++) ctx.fillRect(-r + 12 + i * ((r * 2 - 24) / 4), -h + 20, 10, h - 26)
      break
  }

  // A tick over anything you have already had a go at.
  if (done) {
    ctx.fillStyle = '#7cd88f'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✓', 0, -h - 26)
  }
  ctx.restore()
}
