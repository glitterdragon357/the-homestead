/**
 * Drawing a chute from inside it.
 *
 * The pipe is opaque, so for most of a run the world is the inside of a
 * tube and nothing else - which is a gift, because it means the only
 * geometry that ever needs drawing is the forty or so rings in front of
 * you. The sky and the city are only ever seen through an open lip, and
 * that is exactly when they are worth looking at.
 */

import {
  type Camera,
  type Viewport,
  project,
  projectPoly,
  fillPoly,
} from '../../engine/firstPerson'
import { ARC, type Node, type Sky, BALL_R } from './chuteData'
import { type Ball } from './chuteData'

export const VIEW: Viewport = { width: 900, height: 560 }

/** How far ahead the pipe is drawn, in rings. */
const SEE = 46
/** How many segments go round the pipe. */
const AROUND = 16

const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsl(${h} ${s}% ${l}%${a < 1 ? ` / ${a}` : ''})`

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

interface SkySpec {
  top: string
  mid: string
  low: string
  sun: string
  city: string
  far: string
  sunAt: number
}

const SKIES: Record<Sky, SkySpec> = {
  sundown: { top: '#2b3f7a', mid: '#e0653c', low: '#ffb24d', sun: '#ffd98a', city: '#1d1a33', far: '#3a3157', sunAt: 0.62 },
  ember: { top: '#3a1f33', mid: '#c0392b', low: '#ff8c42', sun: '#ffd27f', city: '#22131f', far: '#45233a', sunAt: 0.3 },
  violet: { top: '#1d1b45', mid: '#6b3fa0', low: '#ef7a9b', sun: '#ffd1e0', city: '#171436', far: '#312a5e', sunAt: 0.78 },
  cold: { top: '#13223f', mid: '#2e6fa3', low: '#9fd4e8', sun: '#e8f6ff', city: '#101c30', far: '#20395c', sunAt: 0.45 },
  night: { top: '#07091c', mid: '#141a40', low: '#2b2f66', sun: '#cdd6ff', city: '#05060f', far: '#0d1028', sunAt: 0.2 },
}

/** Deterministic noise, so a skyline does not shimmer. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * The sunset, and the city under it.
 *
 * Both pan with the camera rather than being pinned to the screen, and
 * the city pans faster than the sky does, which is the whole of the
 * parallax - without it a jump looks like a still photograph slid in
 * behind the ball.
 */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  sky: Sky,
  yaw: number,
  pitch: number,
  t: number
) {
  const s = SKIES[sky]
  const lift = pitch * 240
  const horizon = VIEW.height * 0.62 + lift

  // The gradient hangs off the horizon rather than off the top of the
  // frame. Pinned to the frame, a camera tipped down the hill pushed the
  // whole sunset below the skyline and left a flat navy band up top -
  // which is every colour in the sky except the ones worth having.
  const g = ctx.createLinearGradient(0, horizon - 560, 0, horizon + 40)
  g.addColorStop(0, s.top)
  g.addColorStop(0.58, s.mid)
  g.addColorStop(0.88, s.low)
  g.addColorStop(1, s.low)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIEW.width, VIEW.height)

  // The sun, low and large.
  const sunX = (((s.sunAt - yaw / (Math.PI * 2)) % 1) + 1) % 1
  const sx = sunX * VIEW.width * 1.6 - VIEW.width * 0.3
  const sy = horizon - 58
  const halo = ctx.createRadialGradient(sx, sy, 8, sx, sy, 300)
  halo.addColorStop(0, s.sun)
  halo.addColorStop(0.08, s.sun)
  halo.addColorStop(0.3, hsl(28, 90, 62, 0.35))
  halo.addColorStop(1, hsl(28, 90, 62, 0))
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(sx, sy, 300, 0, Math.PI * 2)
  ctx.fill()

  // Two ranks of city. The far one is hazier and moves less.
  for (const rank of [0, 1]) {
    const pan = (yaw / (Math.PI * 2)) * VIEW.width * (rank === 0 ? 1.1 : 2.2)
    const base = horizon + (rank === 0 ? 6 : 26)
    const w = rank === 0 ? 46 : 32
    ctx.fillStyle = rank === 0 ? s.far : s.city
    for (let i = -2; i < VIEW.width / w + 3; i++) {
      const k = i + Math.floor(pan / w) * 0 + rank * 97
      const x = i * w - (pan % (w * 2)) + rank * 11
      const h = 40 + hash(k * 1.7 + rank * 13) * (rank === 0 ? 120 : 210)
      ctx.fillRect(x, base - h, w - 5, h + 220)
      // Lit windows on the near rank once it is dark enough.
      if (rank === 1 && (sky === 'night' || sky === 'violet')) {
        ctx.fillStyle = hsl(44, 90, 70, 0.5)
        for (let r = 0; r < Math.floor(h / 22); r++) {
          for (let c = 0; c < 3; c++) {
            if (hash(k * 3.3 + r * 7.1 + c) < 0.42) continue
            ctx.fillRect(x + 5 + c * 8, base - h + 8 + r * 22, 4, 9)
          }
        }
        ctx.fillStyle = s.city
      }
    }
  }

  // Long thin cloud, well above the skyline and barely there.
  //
  // Fatter and nearer the horizon they read as grey discs parked in the
  // middle of the sunset rather than as weather.
  ctx.fillStyle = hsl(18, 60, 76, 0.13)
  for (let i = 0; i < 6; i++) {
    const x = (((i * 0.37 + t * 0.00002 - yaw / (Math.PI * 2)) % 1) + 1) % 1
    const cx = x * VIEW.width * 1.4 - VIEW.width * 0.2
    const cy = horizon - 210 - hash(i * 5.5) * 160
    const cw = 130 + hash(i * 2.2) * 190
    ctx.beginPath()
    ctx.ellipse(cx, cy, cw, 6 + hash(i) * 5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ------------------------------------------------------------------ */
/* The pipe                                                            */
/* ------------------------------------------------------------------ */

/** A point on the ring around a node. */
function ringPoint(n: Node, a: number): { x: number; y: number; z: number } {
  const rx = Math.cos(n.yaw)
  const rz = -Math.sin(n.yaw)
  const off = n.radius * Math.sin(a)
  return { x: n.x + rx * off, y: n.y + n.radius * Math.cos(a), z: n.z + rz * off }
}

/**
 * The track.
 *
 * Mostly open road - a deep banked trough with the sky above it - and
 * every so often a stretch where the roof closes over and it becomes a
 * tube. Both are the same ring of quads; the only difference is how far
 * round it goes, which is ARC for road and the whole way for tube.
 *
 * Painted far to near, one band per pair of rings. A band's colour
 * carries two things at once: how far off it is, which is what gives
 * the track its depth, and a rib every few rings, which is what makes
 * speed legible. Plain tarmac at six thousand units a second looks
 * exactly like plain tarmac standing still.
 */
export function drawPipe(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  nodes: Node[],
  from: number,
  hue: number
) {
  const start = Math.max(0, Math.floor(from) - 2)
  const end = Math.min(nodes.length - 1, start + SEE)

  for (let i = end - 1; i >= start; i--) {
    const a = nodes[i]
    const b = nodes[i + 1]
    // No pipe over a jump: that is the jump.
    if (a.open || b.open) continue

    const far = (i - start) / SEE
    const lit = 1 - far * 0.78
    // A rib every four rings, which is what you actually read speed off.
    const rib = i % 4 === 0
    const roofed = a.closed && b.closed
    // Open road only goes round as far as its banking does.
    const span = roofed ? Math.PI * 2 : ARC * 2
    const base = roofed ? 0 : -ARC

    for (let q = 0; q < AROUND; q++) {
      const a0 = base + (q / AROUND) * span
      const a1 = base + ((q + 1) / AROUND) * span
      const p0 = ringPoint(a, a0)
      const p1 = ringPoint(a, a1)
      const p2 = ringPoint(b, a1)
      const p3 = ringPoint(b, a0)

      // Clipped against the near plane rather than projected corner by
      // corner.
      //
      // Projecting each corner on its own means any band with one corner
      // behind the camera gets dropped whole - and inside a pipe that is
      // every band near you, all the way round. The hole that leaves is
      // the sky, so the chute rendered as a tube hanging in the air
      // instead of as somewhere you are inside of.
      const quad = projectPoly(
        cam,
        [
          [p0.x, p0.y, p0.z],
          [p1.x, p1.y, p1.z],
          [p2.x, p2.y, p2.z],
          [p3.x, p3.y, p3.z],
        ],
        VIEW
      )
      if (!quad || quad.length < 3) continue

      // Lit from the top of the pipe, so the bottom of the bore reads
      // as the floor and you can tell which way up you are.
      const mid = (a0 + a1) / 2
      const up = (Math.cos(mid) + 1) / 2
      // Road reads lighter than tube, because road has the sky on it.
      const l = (roofed ? 16 + up * 20 : 26 + up * 22) * lit + (rib ? 9 : 0)
      const sat = roofed ? 26 + up * 10 : 12 + up * 8
      ctx.fillStyle = hsl(hue, sat, Math.max(4, l))
      fillPoly(ctx, quad)

      // A centre line down the open road, and a lip along both rims.
      if (!roofed && !rib) continue
      if (!roofed && Math.abs(mid) < span / AROUND) {
        ctx.fillStyle = hsl(46, 86, Math.max(10, 62 * lit))
        fillPoly(ctx, quad)
      }
    }
  }
}

/**
 * The mouth of the chute you are about to land in.
 *
 * Drawn as a bright ring so that a jump has something to aim at. Without
 * it the far side of a gap is a dark hole against a dark city and the
 * jump stops being exciting and starts being a guess.
 */
export function drawMouth(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  nodes: Node[],
  from: number,
  hue: number
) {
  let i = Math.floor(from)
  while (i < nodes.length && nodes[i].open) i++
  if (i >= nodes.length || i - from > SEE) return
  const n = nodes[i]
  const pts: [number, number, number][] = []
  for (let q = 0; q < AROUND * 2; q++) {
    const p = ringPoint(n, (q / (AROUND * 2)) * Math.PI * 2)
    pts.push([p.x, p.y, p.z])
  }
  const poly = projectPoly(cam, pts, VIEW)
  if (!poly || poly.length < 3) return
  ctx.fillStyle = hsl(hue, 30, 10)
  fillPoly(ctx, poly)
  ctx.strokeStyle = hsl(44, 92, 68, 0.9)
  ctx.lineWidth = 4
  ctx.beginPath()
  poly.forEach((p, k) => (k ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)))
  ctx.closePath()
  ctx.stroke()
}

/* ------------------------------------------------------------------ */
/* The ball                                                            */
/* ------------------------------------------------------------------ */

/**
 * The ball, with its finish actually meaning something.
 *
 * Each finish changes what the painter does rather than just the colour
 * it does it in - a metal ball gets a tight specular and a dark band
 * round its middle, glass gets a bright rim and a lit core, matte gets
 * neither. Two balls that share a hue and differ only in finish have to
 * look like different objects or there are not really fifty-seven of
 * them.
 */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  spec: Ball,
  x: number,
  y: number,
  z: number,
  spin: number,
  view: Viewport = VIEW
) {
  const p = project(cam, x, y, z, view)
  if (!p) return
  const r = BALL_R * p.scale
  if (r < 1) return
  const { hue, sat, accent, finish, motif } = spec

  ctx.save()
  ctx.beginPath()
  ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
  ctx.clip()

  // Body.
  const body = ctx.createRadialGradient(
    p.sx - r * 0.35,
    p.sy - r * 0.4,
    r * 0.05,
    p.sx,
    p.sy,
    r * 1.15
  )
  if (finish === 'metal') {
    body.addColorStop(0, hsl(hue, sat * 0.5, 92))
    body.addColorStop(0.3, hsl(hue, sat, 62))
    body.addColorStop(0.62, hsl(hue, sat, 30))
    body.addColorStop(0.75, hsl(hue, sat * 0.8, 52))
    body.addColorStop(1, hsl(hue, sat, 18))
  } else if (finish === 'glass') {
    body.addColorStop(0, hsl(hue, sat * 0.6, 88))
    body.addColorStop(0.45, hsl(hue, sat, 56))
    body.addColorStop(1, hsl(hue, sat, 26))
  } else if (finish === 'gloss') {
    body.addColorStop(0, hsl(hue, sat * 0.7, 80))
    body.addColorStop(0.5, hsl(hue, sat, 52))
    body.addColorStop(1, hsl(hue, sat, 22))
  } else {
    body.addColorStop(0, hsl(hue, sat * 0.8, 62))
    body.addColorStop(1, hsl(hue, sat, 28))
  }
  ctx.fillStyle = body
  ctx.fillRect(p.sx - r, p.sy - r, r * 2, r * 2)

  // The marking, rolled round with the ball so it is visibly spinning.
  const roll = spin % (Math.PI * 2)
  ctx.globalAlpha = 0.88
  ctx.fillStyle = hsl(accent, finish === 'pattern' ? 70 : 40, finish === 'pattern' ? 58 : 30)
  if (motif === 'stripe') {
    for (let i = 0; i < 3; i++) {
      const off = Math.sin(roll + (i / 3) * Math.PI * 2) * r
      ctx.beginPath()
      ctx.ellipse(p.sx + off, p.sy, r * 0.22, r, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (motif === 'spots' || motif === 'stars') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + roll
      const d = (0.2 + ((i * 37) % 10) / 14) * r
      const vis = Math.cos(a)
      if (vis < 0) continue
      const rr = r * (motif === 'stars' ? 0.07 : 0.14) * (0.5 + vis * 0.5)
      ctx.beginPath()
      ctx.arc(p.sx + Math.sin(a) * d, p.sy + Math.cos(i * 2.1) * r * 0.6, rr, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (motif === 'panels' || motif === 'checker') {
    const n = motif === 'checker' ? 6 : 4
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i + j) % 2) continue
        const a = (i / n) * Math.PI * 2 + roll
        if (Math.cos(a) < 0) continue
        const w = (r * 2) / n
        ctx.fillRect(p.sx + Math.sin(a) * r - w / 2, p.sy - r + j * ((r * 2) / n), w * 0.9, (r * 2) / n - 1)
      }
    }
  } else if (motif === 'swirl') {
    ctx.strokeStyle = hsl(accent, 66, 62, 0.8)
    ctx.lineWidth = Math.max(1, r * 0.16)
    ctx.beginPath()
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const rr = r * (0.25 + (i / 24) * 0.72)
      const px = p.sx + Math.cos(a + roll) * rr
      const py = p.sy + Math.sin(a + roll) * rr * 0.9
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Finish-specific lighting, over the marking.
  if (finish === 'metal') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(p.sx - r, p.sy + r * 0.12, r * 2, r * 0.2)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath()
    ctx.ellipse(p.sx - r * 0.34, p.sy - r * 0.42, r * 0.18, r * 0.1, -0.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (finish === 'glass') {
    const rim = ctx.createRadialGradient(p.sx, p.sy, r * 0.6, p.sx, p.sy, r)
    rim.addColorStop(0, hsl(hue, sat, 60, 0))
    rim.addColorStop(1, hsl(hue, 90, 86, 0.8))
    ctx.fillStyle = rim
    ctx.fillRect(p.sx - r, p.sy - r, r * 2, r * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.beginPath()
    ctx.ellipse(p.sx - r * 0.3, p.sy - r * 0.38, r * 0.22, r * 0.15, -0.6, 0, Math.PI * 2)
    ctx.fill()
  } else if (finish === 'gloss') {
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.ellipse(p.sx - r * 0.32, p.sy - r * 0.4, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Grounding shadow inside the pipe.
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(p.sx, p.sy + r * 0.92, r * 0.86, r * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** A ball on its own, for the picker. */
export function ballSwatch(ctx: CanvasRenderingContext2D, spec: Ball, w: number, h: number, t: number) {
  ctx.clearRect(0, 0, w, h)
  const cam: Camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }
  // A throwaway viewport the size of the swatch, so the one painter does
  // the picker as well as the run - a second painter is a second thing
  // to keep in step, and it never stays in step.
  const view = { width: w, height: h }
  drawBall(ctx, cam, spec, 0, 0, (BALL_R * 520) / (h * 0.36), t * 0.004, view)
}

export const SPEED_LINES = true

/** Streaks at the edge of the view, so speed is felt rather than read. */
export function drawRush(ctx: CanvasRenderingContext2D, speed: number, t: number) {
  const f = Math.max(0, Math.min(1, (speed - 700) / 1100))
  if (f <= 0.01) return
  ctx.save()
  ctx.strokeStyle = `rgba(255,255,255,${(f * 0.22).toFixed(3)})`
  ctx.lineWidth = 2
  for (let i = 0; i < 26; i++) {
    const a = hash(i * 3.7) * Math.PI * 2 + t * 0.001
    const d = 170 + hash(i * 1.3) * 260
    const cx = VIEW.width / 2
    const cy = VIEW.height / 2
    const len = 50 + f * 170
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7)
    ctx.lineTo(cx + Math.cos(a) * (d + len), cy + Math.sin(a) * (d + len) * 0.7)
    ctx.stroke()
  }
  ctx.restore()
}
