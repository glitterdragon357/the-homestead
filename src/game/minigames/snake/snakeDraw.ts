/**
 * Drawing the arena.
 *
 * A snake is a chain of beads down its trail, drawn tail first so the
 * head sits on top of its own neck. Each bead is filled from a gradient
 * running across the body rather than a flat circle, which is what stops
 * a snake reading as a string of dots.
 */

import { ARENA, HEAD_R, girthOf, levelOf, segmentsOf, type Pellet, type Snake } from './snakeData'

export const VIEW = { width: 960, height: 640 }

export interface Camera {
  x: number
  y: number
  zoom: number
}

export function toScreen(cam: Camera, x: number, y: number): { sx: number; sy: number } {
  return {
    sx: (x - cam.x) * cam.zoom + VIEW.width / 2,
    sy: (y - cam.y) * cam.zoom + VIEW.height / 2,
  }
}

function hsl(hue: number, s: number, l: number, a = 1): string {
  return `hsla(${Math.round(hue)},${Math.round(s)}%,${Math.round(l)}%,${a})`
}

/* ------------------------------------------------------------------ */
/* The floor                                                           */
/* ------------------------------------------------------------------ */

export function drawArena(ctx: CanvasRenderingContext2D, cam: Camera) {
  const bg = ctx.createRadialGradient(
    VIEW.width / 2,
    VIEW.height / 2,
    40,
    VIEW.width / 2,
    VIEW.height / 2,
    VIEW.width * 0.75
  )
  bg.addColorStop(0, '#16243a')
  bg.addColorStop(1, '#0a1220')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, VIEW.width, VIEW.height)

  // A grid, so speed is legible. Without it a snake in open space looks
  // like it is barely moving whatever the actual speed.
  const step = 100
  ctx.strokeStyle = 'rgba(120,170,230,0.075)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const x0 = Math.floor((cam.x - VIEW.width / 2 / cam.zoom) / step) * step
  const x1 = cam.x + VIEW.width / 2 / cam.zoom
  for (let x = x0; x < x1; x += step) {
    const a = toScreen(cam, x, cam.y - VIEW.height / cam.zoom)
    const b = toScreen(cam, x, cam.y + VIEW.height / cam.zoom)
    ctx.moveTo(a.sx, a.sy)
    ctx.lineTo(b.sx, b.sy)
  }
  const y0 = Math.floor((cam.y - VIEW.height / 2 / cam.zoom) / step) * step
  const y1 = cam.y + VIEW.height / 2 / cam.zoom
  for (let y = y0; y < y1; y += step) {
    const a = toScreen(cam, cam.x - VIEW.width / cam.zoom, y)
    const b = toScreen(cam, cam.x + VIEW.width / cam.zoom, y)
    ctx.moveTo(a.sx, a.sy)
    ctx.lineTo(b.sx, b.sy)
  }
  ctx.stroke()

  // The wall, which you can slide along but not leave.
  const tl = toScreen(cam, 0, 0)
  const br = toScreen(cam, ARENA.w, ARENA.h)
  ctx.strokeStyle = 'rgba(126,196,255,0.55)'
  ctx.lineWidth = 4
  ctx.strokeRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy)
  ctx.strokeStyle = 'rgba(126,196,255,0.14)'
  ctx.lineWidth = 16
  ctx.strokeRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy)
}

/* ------------------------------------------------------------------ */
/* Pellets                                                             */
/* ------------------------------------------------------------------ */

export function drawPellets(ctx: CanvasRenderingContext2D, cam: Camera, pellets: Pellet[], t: number) {
  const pad = 40
  for (const p of pellets) {
    const s = toScreen(cam, p.x, p.y)
    if (s.sx < -pad || s.sx > VIEW.width + pad || s.sy < -pad || s.sy > VIEW.height + pad) continue
    const r = (4.6 + Math.min(4, p.worth * 0.5)) * cam.zoom
    // A slow pulse, out of step between pellets so the field shimmers.
    const beat = 0.82 + Math.sin(t * 0.004 + p.x * 0.05 + p.y * 0.03) * 0.18
    const g = ctx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, r * 2.6 * beat)
    g.addColorStop(0, hsl(p.hue, 90, 78, 0.95))
    g.addColorStop(0.35, hsl(p.hue, 85, 58, 0.55))
    g.addColorStop(1, hsl(p.hue, 85, 50, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(s.sx, s.sy, r * 2.6 * beat, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = hsl(p.hue, 95, 86)
    ctx.beginPath()
    ctx.arc(s.sx, s.sy, r * 0.62, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ------------------------------------------------------------------ */
/* Snakes                                                              */
/* ------------------------------------------------------------------ */

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  s: Snake,
  t: number,
  threat: 'prey' | 'peer' | 'danger' | 'self'
) {
  const beads = segmentsOf(s)
  if (beads.length === 0) return
  const girth = girthOf(s.fed) * cam.zoom
  const level = levelOf(s.fed)

  // Tail first, so each bead overlaps the one behind it and the body
  // comes out as one continuous thing.
  for (let i = beads.length - 1; i >= 0; i--) {
    const p = toScreen(cam, beads[i].x, beads[i].y)
    if (p.sx < -80 || p.sx > VIEW.width + 80 || p.sy < -80 || p.sy > VIEW.height + 80) continue
    // Taper: the last fifth of the body narrows to a point.
    const from = beads.length * 0.8
    const taper = i < from ? 1 : 1 - (i - from) / (beads.length - from + 0.001)
    const r = Math.max(1.5, girth * (0.55 + 0.45 * taper))

    const light = s.dashing ? 66 : 54
    const body = ctx.createRadialGradient(p.sx - r * 0.4, p.sy - r * 0.45, r * 0.1, p.sx, p.sy, r)
    body.addColorStop(0, hsl(s.hue, 78, light + 22))
    body.addColorStop(0.55, hsl(s.hue, 72, light))
    body.addColorStop(1, hsl(s.hue, 68, light - 26))
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
    ctx.fill()

    // Banding down the back, which is most of what says "snake".
    if (i % 3 === 0 && taper > 0.35) {
      ctx.fillStyle = hsl(s.hue, 60, light - 16, 0.5)
      ctx.beginPath()
      ctx.arc(p.sx, p.sy, r * 0.52, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Head.
  const h = toScreen(cam, s.x, s.y)
  const hr = Math.max(3, HEAD_R * cam.zoom * (0.85 + Math.min(0.75, s.fed / 220)))
  const ring =
    threat === 'self' ? '#ffffff' : threat === 'prey' ? '#7ff2a8' : threat === 'danger' ? '#ff6b6b' : '#ffd479'

  if (s.dashing) {
    const glow = ctx.createRadialGradient(h.sx, h.sy, hr * 0.4, h.sx, h.sy, hr * 3.4)
    glow.addColorStop(0, hsl(s.hue, 95, 72, 0.5))
    glow.addColorStop(1, hsl(s.hue, 95, 60, 0))
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(h.sx, h.sy, hr * 3.4, 0, Math.PI * 2)
    ctx.fill()
  }

  const head = ctx.createRadialGradient(h.sx - hr * 0.4, h.sy - hr * 0.45, hr * 0.1, h.sx, h.sy, hr)
  head.addColorStop(0, hsl(s.hue, 80, 76))
  head.addColorStop(0.6, hsl(s.hue, 74, 58))
  head.addColorStop(1, hsl(s.hue, 70, 34))
  ctx.fillStyle = head
  ctx.beginPath()
  ctx.arc(h.sx, h.sy, hr, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ring
  ctx.lineWidth = Math.max(1, 2 * cam.zoom)
  ctx.stroke()

  // Eyes, looking the way it is going.
  const c = Math.cos(s.heading)
  const sn = Math.sin(s.heading)
  for (const side of [-1, 1]) {
    const ex = h.sx + c * hr * 0.42 - sn * side * hr * 0.46
    const ey = h.sy + sn * hr * 0.42 + c * side * hr * 0.46
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(ex, ey, hr * 0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#16202c'
    ctx.beginPath()
    ctx.arc(ex + c * hr * 0.1, ey + sn * hr * 0.1, hr * 0.15, 0, Math.PI * 2)
    ctx.fill()
  }

  // The level, which is the only number that matters in a fight.
  const label = `${level}`
  const size = Math.max(10, 15 * cam.zoom)
  ctx.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const ly = h.sy - hr - size * 0.85
  ctx.fillStyle = 'rgba(8,14,22,0.7)'
  ctx.beginPath()
  ctx.roundRect(h.sx - size * 0.72, ly - size * 0.6, size * 1.44, size * 1.2, size * 0.34)
  ctx.fill()
  ctx.fillStyle = ring
  ctx.fillText(label, h.sx, ly)

  if (!s.player && cam.zoom > 0.55) {
    ctx.font = `500 ${Math.max(8, 11 * cam.zoom)}px ui-sans-serif, system-ui, sans-serif`
    ctx.fillStyle = 'rgba(226,236,248,0.45)'
    ctx.fillText(s.name, h.sx, h.sy + hr + 11 * cam.zoom)
  }
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
  void t
}
