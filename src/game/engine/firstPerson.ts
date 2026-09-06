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
const NEAR = 12

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
