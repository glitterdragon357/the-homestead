/**
 * Wild Horses, drawn from the saddle or from your own two feet.
 *
 * Shares the first-person engine with Ocean Explorers: the same
 * projection, the same billboards, the same distance-graded mesh - all
 * that changes is that the ground is grass instead of water and the
 * things moving across it have legs.
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
import { VIEW, groundAt, type Breed, type Coat, type Quarry } from './horseData'

const VIEWPORT = { width: VIEW.width, height: VIEW.height }

export function project(cam: Camera, x: number, y: number, z: number): Projected | null {
  return projectPoint(cam, x, y, z, VIEWPORT)
}

/* ------------------------------------------------------------------ */
/* Sky and distance                                                    */
/* ------------------------------------------------------------------ */

export function drawSky(ctx: CanvasRenderingContext2D, cam: Camera, t: number) {
  const h = horizonY(cam, VIEWPORT)

  const grad = ctx.createLinearGradient(0, Math.min(0, h - 620), 0, Math.max(h, 1))
  grad.addColorStop(0, '#3f7cbf')
  grad.addColorStop(0.55, '#8fc0e0')
  grad.addColorStop(1, '#dcecef')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, VIEW.width, Math.max(0, Math.min(VIEW.height, h)))
  if (h <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, VIEW.width, Math.min(VIEW.height, h))
  ctx.clip()

  // Sun and cloud sit on world bearings, so they stay put as you turn.
  const rel = ((cam.yaw - 2.1 + Math.PI) % (Math.PI * 2)) - Math.PI
  if (Math.abs(rel) < 1.3) {
    const sx = VIEW.width / 2 - Math.tan(rel) * 520
    const sy = h - 250 - Math.sin(cam.pitch) * 200
    ctx.globalAlpha = 0.92
    ctx.fillStyle = '#fff6d2'
    ctx.beginPath()
    ctx.arc(sx, sy, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.arc(sx, sy, 70, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 0.8
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 9; i++) {
    const bearing = i * 0.72 + t * 0.00001
    const r = ((bearing - cam.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    if (Math.abs(r) > 1.15) continue
    const cx = VIEW.width / 2 - Math.tan(r) * 520
    const cy = h - 150 - ((i * 43) % 120) - Math.sin(cam.pitch) * 200
    for (const [ox, oy, rr] of [[-34, 6, 18], [0, 0, 25], [30, 7, 16]]) {
      ctx.beginPath()
      ctx.ellipse(cx + ox, cy + oy, rr * 1.6, rr * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // A far range of hills, so the country has an edge to it.
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#7a90a8'
  ctx.beginPath()
  ctx.moveTo(0, h + 2)
  for (let sx = 0; sx <= VIEW.width; sx += 12) {
    const bearing = cam.yaw + (sx - VIEW.width / 2) / 520
    const ridge =
      Math.sin(bearing * 3.1) * 26 + Math.sin(bearing * 7.3 + 1.4) * 14 + Math.sin(bearing * 1.7) * 20
    ctx.lineTo(sx, h + 2 - 26 - ridge)
  }
  ctx.lineTo(VIEW.width, h + 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* The ground                                                          */
/* ------------------------------------------------------------------ */

export function drawLand(ctx: CanvasRenderingContext2D, cam: Camera, sight: number, t: number) {
  // Same trick as the sea: cell size grows with distance so near ground
  // does not shatter and the horizon does not cost a fortune.
  const bands: [number, number, number][] = [
    [26, 0, 200],
    [70, 200, 620],
    [180, 620, 1700],
    [420, 1700, sight],
  ]

  const h = Math.max(0, horizonY(cam, VIEWPORT))
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, h - 2, VIEW.width, VIEW.height - h + 2)
  ctx.clip()

  /*
   * Lay the turf down as one sheet before the mesh goes over it.
   *
   * The cells immediately under your feet cannot be projected - their
   * corners are behind the near plane - so the mesh alone leaves a hole
   * exactly where you are standing, which showed through as a black
   * wedge across the bottom of the view.
   */
  const base = ctx.createLinearGradient(0, h, 0, VIEW.height)
  base.addColorStop(0, '#8fa87a')
  base.addColorStop(0.35, '#7a9a5e')
  base.addColorStop(1, '#5f8248')
  ctx.fillStyle = base
  ctx.fillRect(0, h - 2, VIEW.width, VIEW.height - h + 2)

  for (const [G, near, far] of bands) {
    const x0 = Math.floor((cam.x - far) / G) * G
    const z0 = Math.floor((cam.z - far) / G) * G
    for (let x = x0; x < cam.x + far; x += G) {
      for (let z = z0; z < cam.z + far; z += G) {
        const d = Math.hypot(x + G / 2 - cam.x, z + G / 2 - cam.z)
        if (d > far || d < near) continue
        const k = clarity(d, sight)
        if (k <= 0.02) continue

        const yA = groundAt(x, z)
        const yB = groundAt(x + G, z)
        const yC = groundAt(x + G, z + G)
        const yE = groundAt(x, z + G)
        const a = project(cam, x, yA, z)
        const b = project(cam, x + G, yB, z)
        const c = project(cam, x + G, yC, z + G)
        const e = project(cam, x, yE, z + G)
        if (!a || !b || !c || !e) continue

        // Slope shading: the light comes from the same bearing as the sun.
        const slopeX = (yB + yC - yA - yE) / (2 * G)
        const slopeZ = (yE + yC - yA - yB) / (2 * G)
        const lit = Math.max(0, Math.min(1, 0.5 - slopeX * 2.6 - slopeZ * 1.5))
        const patch = hash(x * 0.017 + z * 0.013)
        const r = Math.round(74 + lit * 62 + patch * 16)
        const g = Math.round(96 + lit * 74 + patch * 14)
        const bl = Math.round(48 + lit * 44 + patch * 10)
        ctx.globalAlpha = k
        ctx.fillStyle = `rgb(${r},${g},${bl})`
        fillQuad(ctx, [a, b, c, e])
      }
    }
  }

  drawScenery(ctx, cam, sight, t)
  ctx.restore()
}

/** Grass, scrub, rock and thorn, placed by hash so it never moves. */
function drawScenery(ctx: CanvasRenderingContext2D, cam: Camera, sight: number, t: number) {
  const G = 150
  const reach = Math.min(sight, 2600)
  const x0 = Math.floor((cam.x - reach) / G) * G
  const z0 = Math.floor((cam.z - reach) / G) * G

  for (let x = x0; x < cam.x + reach; x += G) {
    for (let z = z0; z < cam.z + reach; z += G) {
      const seed = x * 0.0071 + z * 0.0113
      const roll = hash(seed)
      const px = x + hash(seed + 1) * G
      const pz = z + hash(seed + 2) * G
      const d = Math.hypot(px - cam.x, pz - cam.z)
      if (d > reach) continue
      const k = clarity(d, sight)
      if (k <= 0.02) continue
      const base = groundAt(px, pz)

      if (roll > 0.955) {
        // A tree, standing alone the way they do out here.
        const height = 190 + hash(seed + 3) * 160
        const p = project(cam, px, base - height, pz)
        const foot = project(cam, px, base, pz)
        if (!p || !foot) continue
        ctx.globalAlpha = k
        ctx.strokeStyle = '#5e4630'
        ctx.lineWidth = Math.max(1, 12 * p.scale)
        ctx.beginPath()
        ctx.moveTo(foot.sx, foot.sy)
        ctx.lineTo(p.sx, p.sy)
        ctx.stroke()
        ctx.fillStyle = hash(seed + 4) > 0.5 ? '#4a6b38' : '#3f5e32'
        for (const [ox, oy, rr] of [[-24, 6, 40], [20, 10, 34], [0, -18, 46]]) {
          ctx.beginPath()
          ctx.ellipse(p.sx + ox * p.scale, p.sy + oy * p.scale, rr * p.scale, rr * 0.82 * p.scale, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (roll > 0.9) {
        const r = 20 + hash(seed + 5) * 34
        const p = project(cam, px, base - r * 0.5, pz)
        if (!p) continue
        ctx.globalAlpha = k
        ctx.fillStyle = '#8d8a83'
        ctx.beginPath()
        ctx.ellipse(p.sx, p.sy, r * p.scale, r * 0.72 * p.scale, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (roll > 0.62) {
        // Tussocks of grass, leaning in whatever wind there is.
        const p = project(cam, px, base, pz)
        if (!p || p.depth > 900) continue
        ctx.globalAlpha = k * 0.85
        ctx.strokeStyle = hash(seed + 6) > 0.5 ? '#6f8f4a' : '#5e7d3e'
        ctx.lineWidth = Math.max(0.8, 3 * p.scale)
        ctx.lineCap = 'round'
        for (let i = 0; i < 4; i++) {
          const lean = Math.sin(t * 0.0018 + px * 0.01 + i) * 8
          ctx.beginPath()
          ctx.moveTo(p.sx + (i - 1.5) * 5 * p.scale, p.sy)
          ctx.lineTo(p.sx + ((i - 1.5) * 5 + lean) * p.scale, p.sy - (16 + i * 4) * p.scale)
          ctx.stroke()
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Horses                                                              */
/* ------------------------------------------------------------------ */

export function drawHorse(
  ctx: CanvasRenderingContext2D,
  breed: Breed,
  coat: Coat,
  p: Projected,
  dir: number,
  squash: number,
  alpha: number,
  t: number,
  seed: number,
  gait: number
) {
  // breed.length is already in world units - a horse is about 29 of them.
  const L = breed.length
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(p.sx, p.sy)
  ctx.scale(p.scale * Math.max(0.18, Math.abs(squash)) * dir, p.scale)

  const step = t * 0.006 * (0.4 + gait * 1.9) + seed
  const body = coat.body
  const mane = coat.mane

  // legs first, so the body sits over them
  ctx.strokeStyle = body
  ctx.lineWidth = L * 0.055
  ctx.lineCap = 'round'
  for (const [ox, phase] of [
    [-L * 0.28, 0],
    [-L * 0.22, Math.PI],
    [L * 0.24, Math.PI * 0.6],
    [L * 0.3, Math.PI * 1.6],
  ]) {
    const swing = Math.sin(step + phase) * L * 0.09 * (0.25 + gait)
    ctx.beginPath()
    ctx.moveTo(ox, -L * 0.06)
    ctx.quadraticCurveTo(ox + swing * 0.5, L * 0.1, ox + swing, L * 0.3)
    ctx.stroke()
  }

  // barrel
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, -L * 0.12, L * 0.36, L * 0.19, 0, 0, Math.PI * 2)
  ctx.fill()

  // hindquarters and chest
  ctx.beginPath()
  ctx.ellipse(-L * 0.26, -L * 0.15, L * 0.16, L * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()

  // neck and head
  ctx.beginPath()
  ctx.moveTo(L * 0.24, -L * 0.2)
  ctx.quadraticCurveTo(L * 0.42, -L * 0.42, L * 0.44, -L * 0.5)
  ctx.lineTo(L * 0.56, -L * 0.48)
  ctx.quadraticCurveTo(L * 0.5, -L * 0.34, L * 0.36, -L * 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(L * 0.53, -L * 0.52, L * 0.1, L * 0.055, -0.5, 0, Math.PI * 2)
  ctx.fill()
  // ears
  ctx.beginPath()
  ctx.moveTo(L * 0.48, -L * 0.56)
  ctx.lineTo(L * 0.47, -L * 0.63)
  ctx.lineTo(L * 0.52, -L * 0.57)
  ctx.closePath()
  ctx.fill()

  // pattern
  if (coat.pattern === 'patches') {
    ctx.fillStyle = mane
    for (const [ox, oy, rr] of [[-L * 0.2, -L * 0.16, L * 0.13], [L * 0.08, -L * 0.06, L * 0.1], [L * 0.26, -L * 0.3, L * 0.07]]) {
      ctx.beginPath()
      ctx.ellipse(ox, oy, rr, rr * 0.78, 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (coat.pattern === 'spots') {
    ctx.fillStyle = '#efe6d2'
    ctx.beginPath()
    ctx.ellipse(-L * 0.24, -L * 0.16, L * 0.17, L * 0.16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = mane
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.arc(-L * 0.32 + hash(i + seed) * L * 0.18, -L * 0.24 + hash(i * 3 + seed) * L * 0.16, L * 0.022, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (coat.pattern === 'dapples') {
    ctx.globalAlpha = alpha * 0.3
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 8; i++) {
      ctx.beginPath()
      ctx.arc(-L * 0.3 + hash(i + seed) * L * 0.6, -L * 0.22 + hash(i * 5 + seed) * L * 0.18, L * 0.03, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = alpha
  }

  // mane and tail
  ctx.strokeStyle = mane
  ctx.lineWidth = L * 0.05
  ctx.beginPath()
  ctx.moveTo(L * 0.48, -L * 0.54)
  ctx.quadraticCurveTo(L * 0.36, -L * 0.4, L * 0.26, -L * 0.22)
  ctx.stroke()
  const tail = Math.sin(step * 0.6) * L * 0.05
  ctx.lineWidth = L * 0.07
  ctx.beginPath()
  ctx.moveTo(-L * 0.4, -L * 0.22)
  ctx.quadraticCurveTo(-L * 0.52 + tail, -L * 0.05, -L * 0.5 + tail, L * 0.16)
  ctx.stroke()

  // eye
  ctx.fillStyle = '#1a1512'
  ctx.beginPath()
  ctx.arc(L * 0.55, -L * 0.535, L * 0.014, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Quarry                                                              */
/* ------------------------------------------------------------------ */

export function drawQuarry(
  ctx: CanvasRenderingContext2D,
  q: Quarry,
  p: Projected,
  dir: number,
  squash: number,
  alpha: number,
  t: number,
  seed: number,
  gait: number
) {
  const L = q.length
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(p.sx, p.sy)
  ctx.scale(p.scale * Math.max(0.18, Math.abs(squash)) * dir, p.scale)
  const step = t * 0.008 * (0.4 + gait * 2) + seed

  if (q.art === 'hare') {
    ctx.fillStyle = q.body
    ctx.beginPath()
    ctx.ellipse(0, -L * 0.2, L * 0.34, L * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(L * 0.28, -L * 0.34, L * 0.14, L * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
    for (const lean of [-0.25, 0.1]) {
      ctx.beginPath()
      ctx.ellipse(L * 0.3 + lean * L * 0.2, -L * 0.56, L * 0.05, L * 0.16, lean, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = q.belly
    ctx.beginPath()
    ctx.ellipse(-L * 0.05, -L * 0.12, L * 0.2, L * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = q.body
    ctx.lineWidth = L * 0.06
    ctx.lineCap = 'round'
    for (const ox of [-L * 0.2, L * 0.12]) {
      const swing = Math.sin(step + ox) * L * 0.1 * (0.2 + gait)
      ctx.beginPath()
      ctx.moveTo(ox, -L * 0.1)
      ctx.lineTo(ox + swing, L * 0.02)
      ctx.stroke()
    }
    ctx.restore()
    return
  }

  // Everything else is built on the same four-legged frame.
  const tall = q.art === 'elk' || q.art === 'deer' || q.art === 'pronghorn'
  ctx.strokeStyle = q.body
  ctx.lineWidth = L * (q.art === 'boar' ? 0.06 : 0.045)
  ctx.lineCap = 'round'
  for (const [ox, phase] of [
    [-L * 0.24, 0],
    [-L * 0.18, Math.PI],
    [L * 0.2, Math.PI * 0.6],
    [L * 0.26, Math.PI * 1.6],
  ]) {
    const swing = Math.sin(step + phase) * L * 0.09 * (0.25 + gait)
    ctx.beginPath()
    ctx.moveTo(ox, -L * 0.08)
    ctx.quadraticCurveTo(ox + swing * 0.5, L * 0.08, ox + swing, L * (tall ? 0.3 : 0.22))
    ctx.stroke()
  }

  ctx.fillStyle = q.body
  ctx.beginPath()
  ctx.ellipse(0, -L * 0.16, L * 0.34, L * (q.art === 'boar' ? 0.2 : 0.17), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = q.belly
  ctx.beginPath()
  ctx.ellipse(0, -L * 0.08, L * 0.24, L * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()

  // neck and head
  ctx.fillStyle = q.body
  ctx.beginPath()
  ctx.moveTo(L * 0.22, -L * 0.24)
  ctx.quadraticCurveTo(L * 0.4, -L * (tall ? 0.5 : 0.34), L * 0.46, -L * (tall ? 0.52 : 0.32))
  ctx.lineTo(L * 0.56, -L * (tall ? 0.48 : 0.28))
  ctx.quadraticCurveTo(L * 0.42, -L * (tall ? 0.34 : 0.24), L * 0.32, -L * 0.14)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(L * 0.54, -L * (tall ? 0.5 : 0.3), L * 0.1, L * 0.055, -0.4, 0, Math.PI * 2)
  ctx.fill()

  if (q.art === 'deer' || q.art === 'elk') {
    ctx.strokeStyle = '#c2b08a'
    ctx.lineWidth = L * 0.028
    const span = q.art === 'elk' ? 0.3 : 0.2
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(L * 0.5, -L * 0.55)
      ctx.quadraticCurveTo(L * (0.5 + s * span * 0.5), -L * 0.78, L * (0.5 + s * span), -L * 0.82)
      ctx.stroke()
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(L * (0.5 + s * span * i * 0.32), -L * (0.62 + i * 0.06))
        ctx.lineTo(L * (0.5 + s * span * i * 0.5), -L * (0.78 + i * 0.05))
        ctx.stroke()
      }
    }
  }
  if (q.art === 'pronghorn') {
    ctx.strokeStyle = '#2b2620'
    ctx.lineWidth = L * 0.03
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(L * 0.5, -L * 0.54)
      ctx.quadraticCurveTo(L * (0.5 + s * 0.05), -L * 0.7, L * (0.5 + s * 0.12), -L * 0.68)
      ctx.stroke()
    }
  }
  if (q.art === 'boar') {
    ctx.fillStyle = '#e8e2d6'
    ctx.beginPath()
    ctx.moveTo(L * 0.56, -L * 0.28)
    ctx.lineTo(L * 0.64, -L * 0.36)
    ctx.lineTo(L * 0.58, -L * 0.24)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#2b2620'
    ctx.lineWidth = L * 0.02
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(-L * 0.1 + i * L * 0.07, -L * 0.32)
      ctx.lineTo(-L * 0.1 + i * L * 0.07, -L * 0.42)
      ctx.stroke()
    }
  }
  if (q.art === 'wolf') {
    ctx.strokeStyle = q.body
    ctx.lineWidth = L * 0.06
    ctx.beginPath()
    ctx.moveTo(-L * 0.32, -L * 0.2)
    ctx.quadraticCurveTo(-L * 0.48, -L * 0.24, -L * 0.54, -L * 0.12)
    ctx.stroke()
  }

  ctx.fillStyle = '#141a20'
  ctx.beginPath()
  ctx.arc(L * 0.55, -L * (tall ? 0.52 : 0.32), L * 0.015, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
