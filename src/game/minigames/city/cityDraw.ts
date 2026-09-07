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
  fillQuad,
  hash,
  horizonY,
  project as projectPoint,
  type Camera,
  type Projected,
} from '../../engine/firstPerson'
import {
  BLOCK,
  GROUND,
  STREET,
  VIEW,
  blockKind,
  type Building,
  type Fixture,
} from './cityData'

const VIEWPORT = { width: VIEW.width, height: VIEW.height }

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

/** Tarmac, pavement, grass or paving, depending on where you are. */
function groundColour(x: number, z: number): string {
  const bx = Math.floor(x / BLOCK)
  const bz = Math.floor(z / BLOCK)
  const ix = x - bx * BLOCK
  const iz = z - bz * BLOCK
  const onStreet = ix < STREET || iz < STREET
  if (onStreet) {
    const kerb = ix < STREET * 0.22 || iz < STREET * 0.22 || ix > STREET * 0.78 || iz > STREET * 0.78
    return kerb ? '#8d8a84' : '#4a4a4e'
  }
  const kind = blockKind(bx, bz)
  if (kind === 'park' || kind === 'playground') return '#5f8a4a'
  if (kind === 'plaza') return '#9a938a'
  return '#7d7870'
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
        const a = project(cam, x, GROUND, z)
        const b = project(cam, x + G, GROUND, z)
        const c = project(cam, x + G, GROUND, z + G)
        const e = project(cam, x, GROUND, z + G)
        if (!a || !b || !c || !e) continue
        ctx.globalAlpha = k
        ctx.fillStyle = groundColour(x + G / 2, z + G / 2)
        fillQuad(ctx, [a, b, c, e])
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

    const p1 = project(cam, x1, GROUND, z1)
    const p2 = project(cam, x2, GROUND, z2)
    const p3 = project(cam, x2, top, z2)
    const p4 = project(cam, x1, top, z1)
    if (!p1 || !p2 || !p3 || !p4) continue

    // Light from one bearing, so the corners of a block read.
    const lit = 0.78 + 0.22 * (nx * 0.7 + nz * -0.7)
    ctx.fillStyle = shade(b.wall, lit)
    fillQuad(ctx, [p1, p2, p3, p4])

    // Windows, but only near enough to be worth the arithmetic.
    if (d < 1600) {
      const wide = Math.hypot(x2 - x1, z2 - z1)
      const cols = Math.max(1, Math.round(wide / 46))
      const rows = Math.max(1, Math.floor(b.height / 58))
      ctx.fillStyle = shade(b.wall, lit * 0.52)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u0 = (c + 0.28) / cols
          const u1 = (c + 0.72) / cols
          const y0 = GROUND - 34 - (r + 0.66) * (b.height / rows)
          const y1 = GROUND - 34 - (r + 0.2) * (b.height / rows)
          if (y1 > GROUND - 20) continue
          const q1 = project(cam, x1 + (x2 - x1) * u0, y0, z1 + (z2 - z1) * u0)
          const q2 = project(cam, x1 + (x2 - x1) * u1, y0, z1 + (z2 - z1) * u1)
          const q3 = project(cam, x1 + (x2 - x1) * u1, y1, z1 + (z2 - z1) * u1)
          const q4 = project(cam, x1 + (x2 - x1) * u0, y1, z1 + (z2 - z1) * u0)
          if (!q1 || !q2 || !q3 || !q4) continue
          fillQuad(ctx, [q1, q2, q3, q4])
        }
      }
    }
  }

  // Roof, if you are above it.
  if (cam.y < top) {
    const r1 = project(cam, b.x - b.hw, top, b.z - b.hd)
    const r2 = project(cam, b.x + b.hw, top, b.z - b.hd)
    const r3 = project(cam, b.x + b.hw, top, b.z + b.hd)
    const r4 = project(cam, b.x - b.hw, top, b.z + b.hd)
    if (r1 && r2 && r3 && r4) {
      ctx.fillStyle = b.roof
      fillQuad(ctx, [r1, r2, r3, r4])
      // A bit of clutter so roofs are not blank lids.
      const hv = hash(b.x * 0.01 + b.z * 0.013)
      if (hv > 0.4) {
        const bx = b.x + (hv - 0.5) * b.hw
        const bz = b.z + (hash(b.z * 0.017) - 0.5) * b.hd
        const boxTop = top - 40
        const c1 = project(cam, bx - 26, boxTop, bz - 26)
        const c2 = project(cam, bx + 26, boxTop, bz - 26)
        const c3 = project(cam, bx + 26, boxTop, bz + 26)
        const c4 = project(cam, bx - 26, boxTop, bz + 26)
        if (c1 && c2 && c3 && c4) {
          ctx.fillStyle = shade(b.roof, 1.25)
          fillQuad(ctx, [c1, c2, c3, c4])
        }
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
