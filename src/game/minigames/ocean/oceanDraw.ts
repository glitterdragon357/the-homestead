/**
 * Ocean Explorers, drawn from behind your own mask.
 *
 * The sea is three-dimensional and the camera sits inside it, so almost
 * everything here is a projection: work out where a point in the water
 * lands on the glass, how big it should be at that distance, and how much
 * murk is in the way. Sprites are billboards - a fish swimming across
 * your view is drawn broadside, and one swimming straight at you is
 * squashed to the narrow silhouette you would actually see.
 */

import {
  SURFACE_Y,
  VIEW,
  WORLD,
  ZONES,
  floorHeightAt,
  gloomAt,
  type Landmark,
  type Species,
} from './oceanData'

export interface Camera {
  x: number
  y: number
  z: number
  /** Heading in the horizontal plane. 0 looks along +z. */
  yaw: number
  /** Positive looks down. */
  pitch: number
}

export interface Projected {
  sx: number
  sy: number
  /** Pixels per world unit at this distance. */
  scale: number
  /** Distance along the view axis. */
  depth: number
}

/** Focal length, giving roughly an 85 degree horizontal field of view. */
const FOCAL = 520
const NEAR = 12

export function project(cam: Camera, x: number, y: number, z: number): Projected | null {
  const dx = x - cam.x
  const dy = y - cam.y
  const dz = z - cam.z

  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const rx = dx * cy - dz * sy
  const rz = dx * sy + dz * cy

  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const ry = dy * cp - rz * sp
  const rd = dy * sp + rz * cp

  if (rd < NEAR) return null
  const scale = FOCAL / rd
  return { sx: VIEW.width / 2 + rx * scale, sy: VIEW.height / 2 + ry * scale, scale, depth: rd }
}

/** The unit vector you are facing, for swimming and for culling. */
export function forwardOf(cam: Camera): { x: number; y: number; z: number } {
  const cp = Math.cos(cam.pitch)
  return { x: Math.sin(cam.yaw) * cp, y: Math.sin(cam.pitch), z: Math.cos(cam.yaw) * cp }
}

/** How much of a thing survives the murk at this distance. 0 means gone. */
export function clarity(depth: number, viewDist: number): number {
  if (depth >= viewDist) return 0
  const t = depth / viewDist
  return Math.max(0, 1 - t * t * t)
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Push a projected quad out from its own centre by a pixel.
 *
 * Neighbouring cells share exact corners, so their fills meet on a seam
 * that antialiasing leaves as a visible hairline. Growing each one very
 * slightly makes them overlap instead, without moving any geometry.
 */
function expand(pts: Projected[], px: number): { sx: number; sy: number }[] {
  let cx = 0
  let cy = 0
  for (const p of pts) {
    cx += p.sx / pts.length
    cy += p.sy / pts.length
  }
  return pts.map((p) => {
    const dx = p.sx - cx
    const dy = p.sy - cy
    const d = Math.hypot(dx, dy) || 1
    return { sx: p.sx + (dx / d) * px, sy: p.sy + (dy / d) * px }
  })
}

function fillQuad(ctx: CanvasRenderingContext2D, pts: Projected[]) {
  const q = expand(pts, 1.1)
  ctx.beginPath()
  ctx.moveTo(q[0].sx, q[0].sy)
  for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].sx, q[i].sy)
  ctx.closePath()
  ctx.fill()
}

/* ------------------------------------------------------------------ */
/* Water                                                               */
/* ------------------------------------------------------------------ */

export function waterColour(worldY: number): string {
  let lower = ZONES[0]
  let upper = ZONES[0]
  for (let i = 0; i < ZONES.length; i++) {
    if (worldY >= ZONES[i].top) {
      lower = ZONES[i]
      upper = ZONES[i + 1] ?? ZONES[i]
    }
  }
  if (lower === upper) return lower.water
  const t = Math.min(1, Math.max(0, (worldY - lower.top) / (upper.top - lower.top)))
  return mix(lower.water, upper.water, t)
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `rgb(${out[0]},${out[1]},${out[2]})`
}

/**
 * The open water you are looking into. Light comes from above, so the
 * top of the view is always paler - and tipping your head changes which
 * part of the water column you are staring at.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, cam: Camera) {
  const lean = Math.sin(cam.pitch) * 900
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height)
  grad.addColorStop(0, waterColour(cam.y - 520 + lean))
  grad.addColorStop(0.5, waterColour(cam.y + lean))
  grad.addColorStop(1, waterColour(cam.y + 560 + lean))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, VIEW.width, VIEW.height)
}

/** The underside of the surface, seen from below. */
export function drawSurface(ctx: CanvasRenderingContext2D, cam: Camera, viewDist: number, t: number) {
  if (cam.y < SURFACE_Y - 30) return
  if (cam.y - SURFACE_Y > 900) return

  const G = 150
  const reach = Math.min(viewDist, 1500)
  const x0 = Math.floor((cam.x - reach) / G) * G
  const z0 = Math.floor((cam.z - reach) / G) * G

  ctx.save()
  for (let x = x0; x < cam.x + reach; x += G) {
    for (let z = z0; z < cam.z + reach; z += G) {
      const d = Math.hypot(x + G / 2 - cam.x, z + G / 2 - cam.z)
      if (d > reach) continue
      // The swell has to be sampled per corner. Wobbling each cell as a
      // block leaves neighbours at different heights, which at a grazing
      // angle tears the surface into bands.
      const swell = (px: number, pz: number) =>
        SURFACE_Y + Math.sin((px + pz) * 0.004 + t * 0.0016) * 7
      const a = project(cam, x, swell(x, z), z)
      const b = project(cam, x + G, swell(x + G, z), z)
      const c = project(cam, x + G, swell(x + G, z + G), z + G)
      const e = project(cam, x, swell(x, z + G), z + G)
      if (!a || !b || !c || !e) continue
      // Alpha comes off the cell centre, not a corner: neighbouring
      // quads shaded from different corners leave visible seams, which
      // read as cracked glass rather than water.
      const k = clarity(d, reach)
      if (k <= 0.02) continue
      ctx.globalAlpha = 0.2 * k
      ctx.fillStyle = '#e8f8ff'
      fillQuad(ctx, [a, b, c, e])
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Seabed                                                              */
/* ------------------------------------------------------------------ */

export function drawSeabed(ctx: CanvasRenderingContext2D, cam: Camera, viewDist: number, t: number) {
  const G = 110
  const reach = viewDist
  const x0 = Math.floor((cam.x - reach) / G) * G
  const z0 = Math.floor((cam.z - reach) / G) * G

  ctx.save()
  for (let x = x0; x < cam.x + reach; x += G) {
    if (x < -G || x > WORLD.width + G) continue
    for (let z = z0; z < cam.z + reach; z += G) {
      const cx = x + G / 2
      const cz = z + G / 2
      const d = Math.hypot(cx - cam.x, cz - cam.z)
      if (d > reach) continue

      const a = project(cam, x, floorHeightAt(x), z)
      const b = project(cam, x + G, floorHeightAt(x + G), z)
      const c = project(cam, x + G, floorHeightAt(x + G), z + G)
      const e = project(cam, x, floorHeightAt(x), z + G)
      if (!a || !b || !c || !e) continue
      const k = clarity(d, reach)
      if (k <= 0.02) continue

      // Pale sand where the light still reaches, cold and dark where it
      // does not. Only a whisper of per-cell variation: any more and the
      // grid reads as a chequerboard instead of a seabed.
      const g = gloomAt(floorHeightAt(cx))
      const tone = 0.95 + hash(x * 0.013 + z * 0.017) * 0.1
      const sandR = Math.round((198 * (1 - g) + 44 * g) * tone)
      const sandG = Math.round((181 * (1 - g) + 48 * g) * tone)
      const sandB = Math.round((143 * (1 - g) + 60 * g) * tone)
      ctx.globalAlpha = k
      ctx.fillStyle = `rgb(${sandR},${sandG},${sandB})`
      fillQuad(ctx, [a, b, c, e])

      // A boulder or a stand of weed, always in the same cells.
      const h = hash(x * 3.1 + z * 7.7)
      if (h > 0.86) {
        const r = 14 + h * 30
        const p = project(cam, cx, floorHeightAt(cx) - r * 0.5, cz)
        if (p) {
          ctx.globalAlpha = clarity(p.depth, reach)
          ctx.fillStyle = gloomAt(floorHeightAt(cx)) > 0.5 ? '#33353d' : '#8d8570'
          ctx.beginPath()
          ctx.ellipse(p.sx, p.sy, r * p.scale, r * 0.7 * p.scale, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (h > 0.64) {
        const base = floorHeightAt(cx)
        const height = 40 + h * 90
        const sway = Math.sin(t * 0.0012 + x * 0.01 + z * 0.01) * 16
        const p0 = project(cam, cx, base, cz)
        const p1 = project(cam, cx + sway, base - height, cz)
        if (p0 && p1) {
          ctx.globalAlpha = clarity(p0.depth, reach) * 0.85
          ctx.strokeStyle = '#3f7a52'
          ctx.lineWidth = Math.max(1, 7 * p0.scale)
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(p0.sx, p0.sy)
          ctx.quadraticCurveTo((p0.sx + p1.sx) / 2 + 4, (p0.sy + p1.sy) / 2, p1.sx, p1.sy)
          ctx.stroke()
        }
      }
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Marine snow                                                         */
/* ------------------------------------------------------------------ */

export interface Mote {
  x: number
  y: number
  z: number
  r: number
}

/** A box of drifting specks that follows you, wrapping as you swim. */
export function makeMotes(cam: Camera, n = 260): Mote[] {
  const out: Mote[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      x: cam.x + (Math.random() - 0.5) * 900,
      y: cam.y + (Math.random() - 0.5) * 900,
      z: cam.z + (Math.random() - 0.5) * 900,
      r: 0.9 + Math.random() * 2.4,
    })
  }
  return out
}

export function drawMotes(ctx: CanvasRenderingContext2D, cam: Camera, motes: Mote[], dt: number) {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  for (const m of motes) {
    m.y += dt * 7
    // Keep the box centred on the diver without ever popping in view.
    for (const axis of ['x', 'y', 'z'] as const) {
      const d = m[axis] - cam[axis]
      if (d > 450) m[axis] -= 900
      else if (d < -450) m[axis] += 900
    }
    const p = project(cam, m.x, m.y, m.z)
    if (!p) continue
    if (p.sx < -8 || p.sx > VIEW.width + 8 || p.sy < -8 || p.sy > VIEW.height + 8) continue
    // Close motes must stay specks. Scaled straight off the projection
    // they balloon into bubbles the size of the fish behind them.
    const r = Math.min(2.6, Math.max(0.4, m.r * p.scale * 0.45))
    ctx.globalAlpha = Math.min(0.3, 0.06 + r * 0.09)
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Sea life                                                            */
/* ------------------------------------------------------------------ */

/**
 * Draw a creature as a billboard at a projected point.
 *
 * `squash` is how broadside it is: 1 means fully across your view, near
 * 0 means it is pointing at you and you see almost nothing of its flank.
 */
export function drawCreature(
  ctx: CanvasRenderingContext2D,
  sp: Species,
  p: Projected,
  dir: number,
  squash: number,
  tilt: number,
  t: number,
  seed: number,
  alpha: number
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(p.sx, p.sy)
  ctx.scale(p.scale * Math.max(0.16, Math.abs(squash)) * dir, p.scale)
  ctx.rotate(tilt)
  paintCreature(ctx, sp, t, seed)
  ctx.restore()
}

function paintCreature(ctx: CanvasRenderingContext2D, sp: Species, t: number, seed: number) {
  const L = sp.length
  const beat = Math.sin(t * 0.006 + seed)

  switch (sp.form) {
    case 'torpedo':
    case 'lantern': {
      const h = L * 0.34
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.moveTo(L * 0.5, 0)
      ctx.quadraticCurveTo(L * 0.1, -h, -L * 0.34, -h * 0.42)
      ctx.quadraticCurveTo(-L * 0.44, 0, -L * 0.34, h * 0.42)
      ctx.quadraticCurveTo(L * 0.1, h, L * 0.5, 0)
      ctx.fill()
      ctx.fillStyle = sp.belly
      ctx.beginPath()
      ctx.ellipse(-L * 0.02, h * 0.34, L * 0.3, h * 0.34, 0, 0, Math.PI * 2)
      ctx.fill()
      tail(ctx, -L * 0.34, L * 0.32, beat, sp.body)
      fin(ctx, -L * 0.02, -h * 0.72, L * 0.24, beat, sp.body)
      if (sp.form === 'lantern') {
        ctx.fillStyle = sp.glow ?? '#fff'
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.arc(-L * 0.26 + i * L * 0.13, h * 0.5, 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
        if (sp.key === 'anglerfish') {
          ctx.strokeStyle = sp.body
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(L * 0.16, -h * 0.8)
          ctx.quadraticCurveTo(L * 0.5, -L * 0.6, L * 0.62, -L * 0.42)
          ctx.stroke()
          ctx.fillStyle = sp.glow ?? '#fff'
          ctx.beginPath()
          ctx.arc(L * 0.62, -L * 0.42, 3.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      eye(ctx, L * 0.3, -h * 0.22, L * 0.055)
      break
    }
    case 'round': {
      const h = L * 0.52
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.ellipse(0, 0, L * 0.44, h * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = sp.belly
      ctx.beginPath()
      ctx.ellipse(0, h * 0.2, L * 0.32, h * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      tail(ctx, -L * 0.42, L * 0.36, beat, sp.body)
      fin(ctx, 0, -h * 0.46, L * 0.26, beat, sp.body)
      if (sp.key === 'clownfish') {
        ctx.fillStyle = sp.belly
        for (const ox of [-L * 0.16, L * 0.08]) {
          ctx.beginPath()
          ctx.ellipse(ox, 0, L * 0.05, h * 0.46, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      eye(ctx, L * 0.26, -h * 0.14, L * 0.06)
      break
    }
    case 'flat': {
      const h = L * 0.92
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.moveTo(L * 0.44, 0)
      ctx.quadraticCurveTo(L * 0.1, -h * 0.5, -L * 0.24, -h * 0.36)
      ctx.quadraticCurveTo(-L * 0.4, 0, -L * 0.24, h * 0.36)
      ctx.quadraticCurveTo(L * 0.1, h * 0.5, L * 0.44, 0)
      ctx.fill()
      ctx.fillStyle = sp.belly
      ctx.beginPath()
      ctx.ellipse(0, h * 0.14, L * 0.2, h * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      tail(ctx, -L * 0.26, L * 0.3, beat, sp.body)
      eye(ctx, L * 0.24, -h * 0.12, L * 0.06)
      break
    }
    case 'eel': {
      ctx.strokeStyle = sp.body
      ctx.lineWidth = Math.max(3, L * 0.11)
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i <= 14; i++) {
        const q = i / 14
        const px = L * 0.5 - q * L
        const py = Math.sin(t * 0.005 + seed + q * 5) * L * 0.09 * q
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      if (sp.glow) {
        ctx.strokeStyle = sp.glow
        ctx.lineWidth = 1.4
        ctx.stroke()
      }
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.ellipse(L * 0.46, 0, L * 0.1, L * 0.075, 0, 0, Math.PI * 2)
      ctx.fill()
      if (sp.key === 'gulper') {
        ctx.fillStyle = sp.belly
        ctx.beginPath()
        ctx.moveTo(L * 0.52, -L * 0.03)
        ctx.lineTo(L * 0.18, L * 0.17)
        ctx.lineTo(L * 0.5, L * 0.06)
        ctx.closePath()
        ctx.fill()
      }
      eye(ctx, L * 0.48, -L * 0.025, L * 0.03)
      break
    }
    case 'jelly': {
      const pulse = 1 + Math.sin(t * 0.003 + seed) * 0.12
      ctx.globalAlpha *= 0.75
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.ellipse(0, 0, L * 0.44 * pulse, (L * 0.38) / pulse, 0, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = sp.belly
      ctx.lineWidth = 2
      for (let i = 0; i < 7; i++) {
        const ox = -L * 0.3 + i * L * 0.1
        ctx.beginPath()
        ctx.moveTo(ox, 0)
        ctx.quadraticCurveTo(ox + Math.sin(t * 0.004 + i) * 7, L * 0.4, ox + Math.sin(t * 0.004 + i) * 12, L * 0.72)
        ctx.stroke()
      }
      break
    }
    case 'turtle': {
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.ellipse(0, 0, L * 0.4, L * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = sp.belly
      ctx.lineWidth = 2
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.ellipse(i * L * 0.13, 0, L * 0.06, L * 0.24, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = sp.belly
      ctx.beginPath()
      ctx.ellipse(L * 0.44, -L * 0.04, L * 0.11, L * 0.09, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = sp.body
      const flap = Math.sin(t * 0.004 + seed) * 0.5
      for (const s of [-1, 1]) {
        ctx.save()
        ctx.translate(L * 0.16, s * L * 0.2)
        ctx.rotate(flap * s)
        ctx.beginPath()
        ctx.ellipse(0, 0, L * 0.24, L * 0.08, s * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      eye(ctx, L * 0.48, -L * 0.07, L * 0.028)
      break
    }
    case 'ray': {
      const flap = Math.sin(t * 0.0028 + seed)
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.moveTo(L * 0.26, 0)
      ctx.quadraticCurveTo(0, -L * 0.34 - flap * L * 0.1, -L * 0.46, -L * 0.06)
      ctx.quadraticCurveTo(-L * 0.1, L * 0.04, -L * 0.46, L * 0.06)
      ctx.quadraticCurveTo(0, L * 0.34 + flap * L * 0.1, L * 0.26, 0)
      ctx.fill()
      ctx.fillStyle = sp.belly
      ctx.beginPath()
      ctx.ellipse(L * 0.1, 0, L * 0.13, L * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = sp.body
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(-L * 0.4, 0)
      ctx.lineTo(-L * 0.66, flap * L * 0.05)
      ctx.stroke()
      eye(ctx, L * 0.2, -L * 0.09, L * 0.03)
      break
    }
    case 'squid': {
      const pulse = Math.sin(t * 0.003 + seed)
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.moveTo(-L * 0.5, 0)
      ctx.quadraticCurveTo(-L * 0.1, -L * 0.19, L * 0.14, -L * 0.12)
      ctx.quadraticCurveTo(L * 0.22, 0, L * 0.14, L * 0.12)
      ctx.quadraticCurveTo(-L * 0.1, L * 0.19, -L * 0.5, 0)
      ctx.fill()
      ctx.fillStyle = sp.belly
      ctx.beginPath()
      ctx.moveTo(-L * 0.5, 0)
      ctx.lineTo(-L * 0.34, -L * 0.16)
      ctx.lineTo(-L * 0.34, L * 0.16)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = sp.body
      ctx.lineCap = 'round'
      for (let i = 0; i < 8; i++) {
        const spread = (i - 3.5) * L * 0.035
        ctx.lineWidth = i < 2 ? 4 : 2.6
        ctx.beginPath()
        ctx.moveTo(L * 0.14, spread)
        ctx.quadraticCurveTo(
          L * 0.34,
          spread + pulse * L * 0.06 * (i % 2 ? 1 : -1),
          L * 0.52 + (i < 2 ? L * 0.12 : 0),
          spread * 2.4 + pulse * L * 0.08 * (i % 2 ? 1 : -1)
        )
        ctx.stroke()
      }
      eye(ctx, -L * 0.16, -L * 0.1, L * 0.05)
      break
    }
    case 'octopus': {
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.ellipse(0, -L * 0.1, L * 0.3, L * 0.27, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = sp.body
      ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const ox = -L * 0.24 + i * L * 0.1
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(ox, L * 0.1)
        ctx.quadraticCurveTo(
          ox + Math.sin(t * 0.0035 + i + seed) * L * 0.12,
          L * 0.32,
          ox + Math.sin(t * 0.0035 + i + seed) * L * 0.2,
          L * 0.5
        )
        ctx.stroke()
      }
      eye(ctx, L * 0.13, -L * 0.16, L * 0.055)
      eye(ctx, -L * 0.13, -L * 0.16, L * 0.055)
      break
    }
    case 'mammal': {
      const h = L * 0.28
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.moveTo(L * 0.5, 0)
      ctx.quadraticCurveTo(L * 0.05, -h, -L * 0.36, -h * 0.3)
      ctx.quadraticCurveTo(-L * 0.44, 0, -L * 0.36, h * 0.3)
      ctx.quadraticCurveTo(L * 0.05, h * 0.9, L * 0.5, 0)
      ctx.fill()
      ctx.fillStyle = sp.belly
      ctx.beginPath()
      ctx.ellipse(0, h * 0.42, L * 0.28, h * 0.26, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = sp.body
      ctx.beginPath()
      ctx.moveTo(-L * 0.34, 0)
      ctx.quadraticCurveTo(-L * 0.48, beat * L * 0.06, -L * 0.56, beat * L * 0.12 - L * 0.04)
      ctx.lineTo(-L * 0.56, beat * L * 0.12 + L * 0.05)
      ctx.quadraticCurveTo(-L * 0.48, beat * L * 0.06, -L * 0.34, 0)
      ctx.fill()
      fin(ctx, 0, -h * 0.86, L * 0.2, beat, sp.body)
      eye(ctx, L * 0.3, -h * 0.2, L * 0.035)
      break
    }
  }
}

function tail(ctx: CanvasRenderingContext2D, x: number, size: number, beat: number, colour: string) {
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x - size, -size * 0.66 + beat * size * 0.34)
  ctx.lineTo(x - size * 0.72, 0)
  ctx.lineTo(x - size, size * 0.66 + beat * size * 0.34)
  ctx.closePath()
  ctx.fill()
}

function fin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, beat: number, colour: string) {
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.moveTo(x - size * 0.5, y + size * 0.5)
  ctx.quadraticCurveTo(x, y - size * 0.3 + beat * 2, x + size * 0.5, y + size * 0.5)
  ctx.closePath()
  ctx.fill()
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#f6f8fa'
  ctx.beginPath()
  ctx.arc(x, y, Math.max(1.6, r), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#141a20'
  ctx.beginPath()
  ctx.arc(x + r * 0.25, y, Math.max(0.9, r * 0.55), 0, Math.PI * 2)
  ctx.fill()
}

/* ------------------------------------------------------------------ */
/* Landmarks                                                           */
/* ------------------------------------------------------------------ */

export function drawLandmark(
  ctx: CanvasRenderingContext2D,
  lm: Landmark,
  p: Projected,
  t: number,
  alpha: number
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(p.sx, p.sy)
  ctx.scale(p.scale, p.scale)
  paintLandmark(ctx, lm, t)
  ctx.restore()
}

function paintLandmark(ctx: CanvasRenderingContext2D, lm: Landmark, t: number) {
  switch (lm.art) {
    case 'kelp': {
      for (let i = 0; i < 14; i++) {
        const ox = (i - 7) * 26 + hash(i) * 12
        const h = 220 + hash(i * 3) * 170
        const sway = Math.sin(t * 0.0011 + i * 0.8) * 24
        ctx.beginPath()
        ctx.moveTo(ox, 34)
        ctx.quadraticCurveTo(ox + sway * 0.5, 34 - h * 0.5, ox + sway, 34 - h)
        ctx.strokeStyle = 'rgba(64,116,64,0.9)'
        ctx.lineWidth = 8
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      break
    }
    case 'coral': {
      const cols = ['#e0705f', '#e8a83a', '#c26fb8', '#4fb8a8', '#e8d06a']
      for (let i = 0; i < 20; i++) {
        const ox = (hash(i * 7.1) - 0.5) * 260
        const oy = 30 - hash(i * 2.3) * 70
        const r = 14 + hash(i * 5.5) * 26
        ctx.fillStyle = cols[i % cols.length]
        ctx.beginPath()
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2
          ctx.ellipse(ox + Math.cos(a) * r * 0.5, oy + Math.sin(a) * r * 0.4, r * 0.55, r * 0.42, a, 0, Math.PI * 2)
        }
        ctx.fill()
      }
      break
    }
    case 'anchor': {
      ctx.strokeStyle = '#6b6f78'
      ctx.lineWidth = 13
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, -150)
      ctx.lineTo(6, 20)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-52, -110)
      ctx.lineTo(56, -104)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, -164, 18, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-58, -20)
      ctx.quadraticCurveTo(6, 56, 68, -26)
      ctx.stroke()
      break
    }
    case 'amphora': {
      for (let i = 0; i < 9; i++) {
        const ox = (i % 5) * 50 - 100 + (i > 4 ? 25 : 0)
        const oy = i > 4 ? -50 : 10
        ctx.fillStyle = i % 3 === 0 ? '#9a6b47' : '#8a5f40'
        ctx.beginPath()
        ctx.ellipse(ox, oy, 17, 30, 0.1, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(ox - 5, oy - 42, 10, 18)
      }
      break
    }
    case 'wreck': {
      ctx.fillStyle = '#4a3a2c'
      ctx.beginPath()
      ctx.moveTo(-240, 20)
      ctx.quadraticCurveTo(-40, 90, 230, 0)
      ctx.lineTo(206, -76)
      ctx.quadraticCurveTo(-30, 10, -216, -56)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#5e4a38'
      ctx.lineWidth = 9
      for (let i = 0; i < 7; i++) {
        const ox = -180 + i * 62
        ctx.beginPath()
        ctx.moveTo(ox, -24)
        ctx.quadraticCurveTo(ox + 10, -140, ox + 38, -200)
        ctx.stroke()
      }
      ctx.strokeStyle = '#6b5540'
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.moveTo(44, -60)
      ctx.lineTo(84, -280)
      ctx.stroke()
      break
    }
    case 'statue': {
      ctx.fillStyle = '#7d8878'
      ctx.fillRect(-66, 0, 132, 36)
      ctx.beginPath()
      ctx.ellipse(0, -92, 50, 68, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, -172, 37, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5e6a5c'
      ctx.beginPath()
      ctx.arc(-14, -178, 5.5, 0, Math.PI * 2)
      ctx.arc(14, -178, 5.5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'cave': {
      ctx.fillStyle = '#1a1f2b'
      ctx.beginPath()
      ctx.moveTo(-180, 40)
      ctx.quadraticCurveTo(-140, -200, 0, -212)
      ctx.quadraticCurveTo(140, -200, 180, 40)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#05080f'
      ctx.beginPath()
      ctx.ellipse(0, -50, 86, 100, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'whalefall': {
      ctx.strokeStyle = '#d8d2c4'
      ctx.lineWidth = 11
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-210, 10)
      ctx.quadraticCurveTo(0, 40, 210, -12)
      ctx.stroke()
      for (let i = 0; i < 11; i++) {
        const ox = -190 + i * 38
        const curve = Math.sin((i / 11) * Math.PI) * 88
        ctx.lineWidth = 7
        ctx.beginPath()
        ctx.moveTo(ox, 16)
        ctx.quadraticCurveTo(ox - 9, 16 - curve * 0.7, ox - 5, 16 - curve)
        ctx.stroke()
      }
      ctx.fillStyle = '#c8c0b0'
      ctx.beginPath()
      ctx.ellipse(-234, 4, 48, 28, -0.2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'vent': {
      ctx.fillStyle = '#241d22'
      ctx.beginPath()
      ctx.moveTo(-62, 30)
      ctx.lineTo(-26, -130)
      ctx.lineTo(22, -130)
      ctx.lineTo(62, 30)
      ctx.closePath()
      ctx.fill()
      ctx.save()
      ctx.globalAlpha *= 0.5
      for (let i = 0; i < 9; i++) {
        const q = ((t * 0.05 + i * 40) % 320) / 320
        ctx.fillStyle = '#3a3138'
        ctx.beginPath()
        ctx.arc(Math.sin(q * 6 + i) * 28, -140 - q * 260, 16 + q * 44, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      ctx.fillStyle = '#e07a4a'
      ctx.beginPath()
      ctx.ellipse(0, -130, 24, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }
}

/* ------------------------------------------------------------------ */
/* Dark water                                                          */
/* ------------------------------------------------------------------ */

/**
 * Deep water is dark everywhere except where your lamp is pointing -
 * which, in first person, is wherever you happen to be looking.
 */
export function drawDarkness(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  lampRadius: number
) {
  const gloom = gloomAt(cam.y)
  if (gloom < 0.02) return

  const cx = VIEW.width / 2
  const cy = VIEW.height / 2
  const r = Math.max(90, lampRadius * 0.55)

  const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, Math.max(r, VIEW.width * 0.75))
  g.addColorStop(0, `rgba(2,7,16,0)`)
  g.addColorStop(0.45, `rgba(2,7,16,${(gloom * 0.55).toFixed(3)})`)
  g.addColorStop(1, `rgba(2,7,16,${gloom.toFixed(3)})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIEW.width, VIEW.height)
}

export function drawGlow(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  radius: number,
  colour: string,
  strength: number
) {
  if (strength <= 0.02 || radius <= 0.5) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.5 * strength
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius)
  g.addColorStop(0, colour)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(sx, sy, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
