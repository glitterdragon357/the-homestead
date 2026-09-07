/**
 * A small first-person renderer, shared by the games that put you inside
 * the world rather than looking at it.
 *
 * It is the same handful of ideas each time: a camera with a yaw and a
 * pitch, a projection onto the glass, a fog term so distance fades, and
 * billboarded sprites that squash as they turn away from you. Ocean
 * Explorers grew all of this first; it lives here so the next game that
 * needs it does not grow a second copy that drifts out of step.
 */

export interface Camera {
  x: number
  /** Down is positive, as it is in the world grids these games use. */
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

export interface Viewport {
  width: number
  height: number
}

/** Focal length, giving roughly an 85 degree horizontal field of view. */
export const FOCAL = 520
export const NEAR = 12

export function project(
  cam: Camera,
  x: number,
  y: number,
  z: number,
  view: Viewport
): Projected | null {
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
  return { sx: view.width / 2 + rx * scale, sy: view.height / 2 + ry * scale, scale, depth: rd }
}

/** A point moved into the camera's own frame, before projection. */
export interface InCamera {
  rx: number
  ry: number
  /** Distance along the view axis. Negative is behind you. */
  rd: number
}

export function toCamera(cam: Camera, x: number, y: number, z: number): InCamera {
  const dx = x - cam.x
  const dy = y - cam.y
  const dz = z - cam.z
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const rx = dx * cy - dz * sy
  const rz = dx * sy + dz * cy
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  return { rx, ry: dy * cp - rz * sp, rd: dy * sp + rz * cp }
}

/**
 * Project a polygon, clipping it against the near plane rather than
 * throwing it away.
 *
 * This is what stops a wall vanishing the moment you walk up to it. A
 * face with one corner behind your eye cannot be projected corner by
 * corner - the maths gives nonsense - so the usual shortcut is to drop
 * the whole face, which is exactly why buildings disappeared when you
 * got close. Cutting the polygon along the near plane first leaves a
 * shape that is entirely in front of you and can be drawn honestly.
 */
export function projectPoly(
  cam: Camera,
  points: [number, number, number][],
  view: Viewport
): { sx: number; sy: number }[] | null {
  const cs = points.map((p) => toCamera(cam, p[0], p[1], p[2]))

  // Sutherland-Hodgman against the single plane rd = NEAR.
  const clipped: InCamera[] = []
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i]
    const b = cs[(i + 1) % cs.length]
    const aIn = a.rd >= NEAR
    const bIn = b.rd >= NEAR
    if (aIn) clipped.push(a)
    if (aIn !== bIn) {
      const t = (NEAR - a.rd) / (b.rd - a.rd)
      clipped.push({
        rx: a.rx + (b.rx - a.rx) * t,
        ry: a.ry + (b.ry - a.ry) * t,
        rd: NEAR,
      })
    }
  }
  if (clipped.length < 3) return null

  return clipped.map((c) => ({
    sx: view.width / 2 + (c.rx * FOCAL) / c.rd,
    sy: view.height / 2 + (c.ry * FOCAL) / c.rd,
  }))
}

/** Fill a polygon that has already been projected and clipped. */
export function fillPoly(ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[]) {
  if (pts.length < 3) return
  ctx.beginPath()
  ctx.moveTo(pts[0].sx, pts[0].sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy)
  ctx.closePath()
  ctx.fill()
}

/** The unit vector you are facing, for moving and for culling. */
export function forwardOf(cam: Camera): { x: number; y: number; z: number } {
  const cp = Math.cos(cam.pitch)
  return { x: Math.sin(cam.yaw) * cp, y: Math.sin(cam.pitch), z: Math.cos(cam.yaw) * cp }
}

/** Where a flat plane at the camera's height vanishes on the glass. */
export function horizonY(cam: Camera, view: Viewport): number {
  return view.height / 2 - FOCAL * Math.tan(cam.pitch)
}

/** How much of a thing survives the haze at this distance. 0 means gone. */
export function clarity(depth: number, viewDist: number): number {
  if (depth >= viewDist) return 0
  const t = depth / viewDist
  return Math.max(0, 1 - t * t * t)
}

/** Cheap deterministic noise, so scenery is stable without storing it. */
export function hash(n: number): number {
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
export function expand(pts: Projected[], px: number): { sx: number; sy: number }[] {
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

export function fillQuad(ctx: CanvasRenderingContext2D, pts: Projected[]) {
  const q = expand(pts, 1.1)
  ctx.beginPath()
  ctx.moveTo(q[0].sx, q[0].sy)
  for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].sx, q[i].sy)
  ctx.closePath()
  ctx.fill()
}

/** Blend two "#rrggbb" colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `rgb(${out[0]},${out[1]},${out[2]})`
}

/**
 * How broadside something is to you, and which way it faces.
 *
 * Sprites are billboards: a creature crossing your view is drawn from
 * the side, and one coming straight at you is squashed to the narrow
 * silhouette you would actually see of it.
 */
export function billboard(heading: number, camYaw: number): { dir: number; squash: number } {
  const across = Math.sin(heading - camYaw)
  return { dir: across >= 0 ? 1 : -1, squash: across }
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
