/**
 * Drawing the arena.
 *
 * A snake is a chain of beads down its trail, drawn tail first so the
 * head sits on top of its own neck. Each bead is filled from a gradient
 * running across the body rather than a flat circle, which is what stops
 * a snake reading as a string of dots.
 */

import {
  HEAD_R,
  girthOf,
  levelOf,
  segmentsOf,
  type Coin,
  type MapSpec,
  type Pattern,
  type Pellet,
  type Snake,
} from './snakeData'

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

/** A filled circle, which is most of what drawing a snake consists of. */
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function hsl(hue: number, s: number, l: number, a = 1): string {
  return `hsla(${Math.round(hue)},${Math.round(s)}%,${Math.round(l)}%,${a})`
}

/* ------------------------------------------------------------------ */
/* The floor                                                           */
/* ------------------------------------------------------------------ */

export function drawArena(ctx: CanvasRenderingContext2D, cam: Camera, map: MapSpec) {
  const bg = ctx.createRadialGradient(
    VIEW.width / 2,
    VIEW.height / 2,
    40,
    VIEW.width / 2,
    VIEW.height / 2,
    VIEW.width * 0.75
  )
  bg.addColorStop(0, map.floorIn)
  bg.addColorStop(1, map.floorOut)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, VIEW.width, VIEW.height)

  // A grid, so speed is legible. Without it a snake in open space looks
  // like it is barely moving whatever the actual speed.
  const step = 100
  ctx.strokeStyle = map.grid
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
  const br = toScreen(cam, map.w, map.h)

  // Black out everything beyond it.
  //
  // The narrow arenas are thinner than the viewport, so both walls are
  // on screen at once and the grid used to carry straight on past them -
  // which makes the playable ground impossible to pick out from the
  // nothing beside it.
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  if (tl.sx > 0) ctx.fillRect(0, 0, tl.sx, VIEW.height)
  if (br.sx < VIEW.width) ctx.fillRect(br.sx, 0, VIEW.width - br.sx, VIEW.height)
  if (tl.sy > 0) ctx.fillRect(Math.max(0, tl.sx), 0, Math.min(VIEW.width, br.sx) - Math.max(0, tl.sx), tl.sy)
  if (br.sy < VIEW.height) {
    ctx.fillRect(
      Math.max(0, tl.sx),
      br.sy,
      Math.min(VIEW.width, br.sx) - Math.max(0, tl.sx),
      VIEW.height - br.sy
    )
  }
  ctx.strokeStyle = `rgba(${map.wall},0.55)`
  ctx.lineWidth = 4
  ctx.strokeRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy)
  ctx.strokeStyle = `rgba(${map.wall},0.14)`
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

    // A pellet that came off a snake is drawn as the piece of snake it
    // was - same painter, same colour, same marking, same place in the
    // body - so a kill leaves a recognisable trail of whoever died.
    if (p.pattern) {
      drawBead(
        ctx,
        s.sx,
        s.sy,
        r * 1.25,
        { hue: p.hue, sat: p.sat, accent: p.accent ?? p.hue, pattern: p.pattern },
        p.index ?? 0,
        t,
        { light: 56 }
      )
      continue
    }

    // Loose food: a glowing speck, pulsing out of step with its neighbours.
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

/**
 * Coins. Drawn as a disc that turns edge-on and back, because a flat
 * gold circle among a hundred glowing pellets does not catch the eye,
 * and a turning one does.
 */
export function drawCoins(ctx: CanvasRenderingContext2D, cam: Camera, coins: Coin[], t: number) {
  const pad = 40
  for (const c of coins) {
    const s = toScreen(cam, c.x, c.y)
    if (s.sx < -pad || s.sx > VIEW.width + pad || s.sy < -pad || s.sy > VIEW.height + pad) continue
    const r = (7 + Math.min(5, c.value * 0.28)) * cam.zoom
    const turn = Math.abs(Math.cos(t * 0.003 + c.spin))

    const halo = ctx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, r * 2.8)
    halo.addColorStop(0, 'rgba(255,214,120,0.5)')
    halo.addColorStop(1, 'rgba(255,190,90,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(s.sx, s.sy, r * 2.8, 0, Math.PI * 2)
    ctx.fill()

    const face = ctx.createLinearGradient(s.sx, s.sy - r, s.sx, s.sy + r)
    face.addColorStop(0, '#fff3c4')
    face.addColorStop(0.5, '#f2c04a')
    face.addColorStop(1, '#b8801f')
    ctx.fillStyle = face
    ctx.beginPath()
    ctx.ellipse(s.sx, s.sy, Math.max(0.6, r * turn), r, 0, 0, Math.PI * 2)
    ctx.fill()
    if (turn > 0.45) {
      ctx.strokeStyle = 'rgba(255,248,214,0.8)'
      ctx.lineWidth = Math.max(0.6, 1.2 * cam.zoom)
      ctx.beginPath()
      ctx.ellipse(s.sx, s.sy, Math.max(0.4, r * turn * 0.55), r * 0.58, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/**
 * The companion, and the line of its nip.
 *
 * Drawn after the snakes so it is never buried under one, and with a
 * flash out to whatever it just bit - without that the nip is invisible
 * and the thing looks like an ornament.
 */
export function drawFriend(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  f: {
    spec: { hue: number; art: string; cost: number }
    x: number
    y: number
    dartUntil: number
    targetId: number | null
  },
  snakes: { id: number; x: number; y: number; dead: boolean }[],
  t: number
) {
  const p = toScreen(cam, f.x, f.y)
  const r = Math.max(4, (7 + Math.min(7, f.spec.cost / 900)) * cam.zoom)
  const hue = f.spec.hue

  // The nip itself, or it is an ornament.
  if (t < f.dartUntil && f.targetId !== null) {
    const target = snakes.find((s) => s.id === f.targetId && !s.dead)
    if (target) {
      const q = toScreen(cam, target.x, target.y)
      ctx.strokeStyle = hsl(hue, 90, 76, 0.75)
      ctx.lineWidth = Math.max(1, 2.4 * cam.zoom)
      ctx.beginPath()
      ctx.moveTo(p.sx, p.sy)
      ctx.lineTo(q.sx, q.sy)
      ctx.stroke()
      const pop = ctx.createRadialGradient(q.sx, q.sy, 0, q.sx, q.sy, r * 2.4)
      pop.addColorStop(0, hsl(hue, 95, 84, 0.85))
      pop.addColorStop(1, hsl(hue, 95, 70, 0))
      ctx.fillStyle = pop
      ctx.beginPath()
      ctx.arc(q.sx, q.sy, r * 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 2.6)
  glow.addColorStop(0, hsl(hue, 90, 70, 0.4))
  glow.addColorStop(1, hsl(hue, 90, 60, 0))
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(p.sx, p.sy, r * 2.6, 0, Math.PI * 2)
  ctx.fill()

  const wag = Math.sin(t * 0.012) * 0.5
  ctx.save()
  ctx.translate(p.sx, p.sy)
  const bodyFill = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r)
  bodyFill.addColorStop(0, hsl(hue, 82, 76))
  bodyFill.addColorStop(1, hsl(hue, 76, 44))
  ctx.fillStyle = bodyFill

  if (f.spec.art === 'fish') {
    ctx.beginPath()
    ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-r * 0.85, 0)
    ctx.lineTo(-r * 1.7, -r * 0.55 + wag * r)
    ctx.lineTo(-r * 1.7, r * 0.55 + wag * r)
    ctx.closePath()
    ctx.fill()
  } else if (f.spec.art === 'bird') {
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.8, r * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(-r * 0.5, side * (r * 1.1 + wag * r * 0.4), -r * 1.5, side * r * 0.5)
      ctx.quadraticCurveTo(-r * 0.6, side * r * 0.4, 0, 0)
      ctx.fill()
    }
    ctx.fillStyle = hsl(hue, 90, 86)
    ctx.beginPath()
    ctx.moveTo(r * 0.7, 0)
    ctx.lineTo(r * 1.4, -r * 0.14)
    ctx.lineTo(r * 0.7, r * 0.24)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(r * 0.9, -r * 0.1, r * 0.46, 0, Math.PI * 2)
    ctx.fill()
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(r * 0.78, -r * 0.42)
      ctx.lineTo(r * 0.98 + side * r * 0.12, -r * 0.88)
      ctx.lineTo(r * 1.16, -r * 0.36)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.fillStyle = '#12161c'
  ctx.beginPath()
  ctx.arc(r * 0.55, -r * 0.14, r * 0.14, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Snakes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Everything needed to paint a piece of a particular snake.
 *
 * Passed about as one object so that a pellet dropped by a dead snake
 * can be drawn by exactly the same code as the snake was - which is the
 * only way to be sure it really is the same colour and marking rather
 * than a near miss that drifts apart the next time either is touched.
 */
export interface Look {
  hue: number
  sat: number
  accent: number
  pattern: Pattern
}

export function lookOf(s: { hue: number; sat: number; accent: number; pattern: Pattern }): Look {
  return { hue: s.hue, sat: s.sat, accent: s.accent, pattern: s.pattern }
}

/**
 * One bead of a snake: the body, and whatever marking it wears.
 *
 * `index` is how far down the body it sits - the patterns that repeat
 * (bands, ladders, diamonds) count on it, and 'shift' walks its hue by
 * it. A loose pellet passes the index it had when it was still part of
 * the snake, so a dropped body keeps the banding it had in life.
 */
export function drawBead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  look: Look,
  index: number,
  t: number,
  opts: { light?: number; taper?: number } = {}
) {
  const light = opts.light ?? 54
  const taper = opts.taper ?? 1
  const sat = look.sat
  const a = look.accent
  const hue = look.pattern === 'shift' ? (look.hue + index * 3.2 + t * 0.03) % 360 : look.hue

  if (look.pattern === 'glow') {
    const halo = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.1)
    halo.addColorStop(0, hsl(hue, 95, 62, 0.4))
    halo.addColorStop(1, hsl(hue, 95, 55, 0))
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, r * 2.1, 0, Math.PI * 2)
    ctx.fill()
  }

  const wasAlpha = ctx.globalAlpha
  if (look.pattern === 'ghost') ctx.globalAlpha = wasAlpha * 0.55

  const body = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r)
  body.addColorStop(0, hsl(hue, sat + 6, light + 22))
  body.addColorStop(0.55, hsl(hue, sat, light))
  body.addColorStop(1, hsl(hue, sat - 4, light - 26))
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  if (look.pattern === 'ghost') ctx.globalAlpha = wasAlpha

  // Markings. Whatever it is, it runs down the back, because that is
  // the only part of a snake anyone ever sees.
  if (taper <= 0.3) return
  const i = index
  const p = { sx: x, sy: y }
  switch (look.pattern) {
    case 'bands':
      if (i % 3 === 0) {
        ctx.fillStyle = hsl(hue, 60, light - 16, 0.5)
        dot(ctx, p.sx, p.sy, r * 0.52)
      }
      break
    case 'stripe':
      ctx.fillStyle = hsl(hue, 40, light + 30, 0.6)
      dot(ctx, p.sx, p.sy, r * 0.3)
      break
    case 'diamond':
      if (i % 4 === 0) {
        ctx.fillStyle = hsl(a, 70, light - 26, 0.8)
        ctx.beginPath()
        ctx.moveTo(p.sx, p.sy - r * 0.68)
        ctx.lineTo(p.sx + r * 0.52, p.sy)
        ctx.lineTo(p.sx, p.sy + r * 0.68)
        ctx.lineTo(p.sx - r * 0.52, p.sy)
        ctx.closePath()
        ctx.fill()
      }
      break
    case 'speckle': {
      const n = (i * 2654435761) % 7
      if (n < 4) {
        ctx.fillStyle = hsl(a, 55, light + 18, 0.55)
        dot(ctx, p.sx + ((n - 2) * r) / 4, p.sy + ((n % 3) - 1) * r * 0.3, r * 0.2)
      }
      break
    }
    case 'rings':
      if (i % 5 < 2) {
        ctx.strokeStyle = hsl(a, 72, light + 16, 0.75)
        ctx.lineWidth = Math.max(0.7, r * 0.22)
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, r * 0.66, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'ladder':
      if (i % 2 === 0) {
        ctx.strokeStyle = hsl(a, 60, light + 12, 0.6)
        ctx.lineWidth = Math.max(0.7, r * 0.26)
        ctx.beginPath()
        ctx.moveTo(p.sx - r * 0.6, p.sy)
        ctx.lineTo(p.sx + r * 0.6, p.sy)
        ctx.stroke()
      }
      break
    case 'twotone':
      if (Math.floor(i / 4) % 2 === 0) {
        ctx.fillStyle = hsl(a, 62, light - 4, 0.65)
        dot(ctx, p.sx, p.sy, r * 0.8)
      }
      break
    case 'metal':
      ctx.fillStyle = `rgba(255,255,255,${(0.34 * taper).toFixed(2)})`
      ctx.beginPath()
      ctx.ellipse(p.sx - r * 0.2, p.sy - r * 0.42, r * 0.44, r * 0.2, -0.5, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'ghost':
    case 'vanish':
    case 'solid':
      break

    /* --- textures: motifs with a shape of their own ------------- */
    case 'skull': {
      if (i % 3 !== 0) break
      const k = r * 0.62
      ctx.fillStyle = hsl(a, 24, 92, 0.92)
      ctx.beginPath()
      ctx.arc(p.sx, p.sy - k * 0.12, k * 0.62, Math.PI, 0)
      ctx.rect(p.sx - k * 0.42, p.sy - k * 0.12, k * 0.84, k * 0.5)
      ctx.fill()
      ctx.fillStyle = 'rgba(20,16,14,0.9)'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(p.sx + side * k * 0.26, p.sy - k * 0.14, k * 0.17, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillRect(p.sx - k * 0.08, p.sy + k * 0.1, k * 0.16, k * 0.22)
      break
    }
    case 'bones': {
      if (i % 2 !== 0) break
      ctx.strokeStyle = hsl(a, 22, 90, 0.85)
      ctx.lineWidth = Math.max(0.8, r * 0.2)
      ctx.lineCap = 'round'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(p.sx, p.sy - r * 0.1)
        ctx.quadraticCurveTo(p.sx + side * r * 0.5, p.sy, p.sx + side * r * 0.62, p.sy + r * 0.5)
        ctx.stroke()
      }
      break
    }
    case 'scales': {
      ctx.strokeStyle = hsl(a, 46, light - 22, 0.75)
      ctx.lineWidth = Math.max(0.7, r * 0.16)
      for (const side of [-1, 0, 1]) {
        ctx.beginPath()
        ctx.arc(p.sx + side * r * 0.5, p.sy + (i % 2 ? r * 0.18 : -r * 0.18), r * 0.4, Math.PI * 0.15, Math.PI * 0.85)
        ctx.stroke()
      }
      break
    }
    case 'spikes': {
      if (i % 2 !== 0) break
      ctx.fillStyle = hsl(a, 34, light + 26, 0.9)
      ctx.beginPath()
      ctx.moveTo(p.sx - r * 0.34, p.sy)
      ctx.lineTo(p.sx, p.sy - r * 1.22)
      ctx.lineTo(p.sx + r * 0.34, p.sy)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'eyes': {
      if (i % 4 !== 0) break
      for (const side of [-1, 1]) {
        const ex = p.sx + side * r * 0.42
        ctx.fillStyle = hsl(a, 62, 82, 0.95)
        dot(ctx, ex, p.sy, r * 0.34)
        ctx.fillStyle = 'rgba(16,12,20,0.92)'
        dot(ctx, ex, p.sy, r * 0.17)
      }
      break
    }
    case 'stitch': {
      if (i % 3 !== 0) break
      ctx.strokeStyle = hsl(a, 30, 86, 0.8)
      ctx.lineWidth = Math.max(0.6, r * 0.13)
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath()
        ctx.moveTo(p.sx - r * 0.2, p.sy + (k * r) / 3)
        ctx.lineTo(p.sx + r * 0.2, p.sy + (k * r) / 3)
        ctx.stroke()
      }
      break
    }
    case 'chevron': {
      if (i % 2 !== 0) break
      ctx.strokeStyle = hsl(a, 58, light - 24, 0.85)
      ctx.lineWidth = Math.max(0.8, r * 0.24)
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(p.sx - r * 0.6, p.sy + r * 0.34)
      ctx.lineTo(p.sx, p.sy - r * 0.3)
      ctx.lineTo(p.sx + r * 0.6, p.sy + r * 0.34)
      ctx.stroke()
      break
    }
    case 'web': {
      const seed = (i * 2246822519) % 5
      ctx.strokeStyle = hsl(a, 18, 84, 0.6)
      ctx.lineWidth = Math.max(0.5, r * 0.1)
      ctx.beginPath()
      for (let k = 0; k < 3; k++) {
        const ang = ((seed + k) / 3) * Math.PI * 2
        ctx.moveTo(p.sx, p.sy)
        ctx.lineTo(p.sx + Math.cos(ang) * r * 0.8, p.sy + Math.sin(ang) * r * 0.8)
      }
      ctx.stroke()
      break
    }
    case 'fire': {
      const beat = t * 0.012 + i * 0.7
      const lick = 0.65 + Math.sin(beat) * 0.35 + Math.sin(beat * 2.3) * 0.18
      const tall = r * (1.1 + lick * 1.5)
      const flame = ctx.createLinearGradient(p.sx, p.sy + r * 0.3, p.sx, p.sy - tall)
      flame.addColorStop(0, hsl(hue, 95, 58, 0.85))
      flame.addColorStop(0.45, hsl(hue + 18, 98, 66, 0.7))
      flame.addColorStop(1, hsl(hue + 34, 100, 88, 0))
      ctx.fillStyle = flame
      ctx.beginPath()
      ctx.moveTo(p.sx - r * 0.62, p.sy + r * 0.2)
      ctx.quadraticCurveTo(p.sx - r * 0.3, p.sy - tall * 0.55, p.sx + Math.sin(beat) * r * 0.4, p.sy - tall)
      ctx.quadraticCurveTo(p.sx + r * 0.42, p.sy - tall * 0.5, p.sx + r * 0.62, p.sy + r * 0.2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = hsl(hue + 10, 100, 70, 0.4 + lick * 0.3)
      dot(ctx, p.sx, p.sy, r * 0.5)
      break
    }
    case 'ice': {
      const cycle = (t * 0.0012 + i * 0.13) % 1
      const grow = cycle < 0.82 ? cycle / 0.82 : 1 - (cycle - 0.82) / 0.18
      const len = r * (0.5 + grow * 1.5)
      ctx.fillStyle = hsl(a, 62, 88, 0.5 + grow * 0.4)
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(p.sx + side * r * 0.2, p.sy - r * 0.2)
        ctx.lineTo(p.sx + side * (r * 0.4 + len), p.sy - len * 0.5)
        ctx.lineTo(p.sx + side * r * 0.3, p.sy + r * 0.35)
        ctx.closePath()
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(226,246,255,0.26)'
      ctx.beginPath()
      ctx.ellipse(p.sx - r * 0.2, p.sy - r * 0.3, r * 0.42, r * 0.2, -0.5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'water': {
      const flow = (i * 0.28 - t * 0.0045) % 1
      const wave = (flow + 1) % 1
      const bright = Math.pow(Math.sin(wave * Math.PI), 2)
      ctx.fillStyle = hsl(a, 82, 62 + bright * 30, 0.2 + bright * 0.6)
      dot(ctx, p.sx, p.sy, r * (0.5 + bright * 0.45))
      ctx.strokeStyle = `rgba(232,250,255,${(0.16 + bright * 0.5).toFixed(2)})`
      ctx.lineWidth = Math.max(0.6, r * 0.14)
      ctx.beginPath()
      ctx.arc(p.sx, p.sy, r * 0.74, Math.PI * 0.1, Math.PI * 0.9)
      ctx.stroke()
      break
    }
  }
}

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  s: Snake,
  t: number,
  threat: 'prey' | 'peer' | 'danger' | 'self'
) {
  const beads = segmentsOf(s)
  if (beads.length === 0) return

  // Gone to everyone else, still perfectly clear to you.
  //
  // You keep most of your own opacity - enough to steer by without a
  // moment's squinting - and only lose enough of it to tell you the skin
  // is working. Every other snake in the arena gets nothing at all, and
  // the ones being driven by the game stop reacting to you entirely.
  const fade = s.unseen > 0 ? (s.player ? 1 - s.unseen * 0.38 : 1 - s.unseen) : 1
  if (fade <= 0.02) return
  const wasGlobal = ctx.globalAlpha
  if (fade < 1) ctx.globalAlpha = wasGlobal * fade
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
    const bitten = t < s.bittenUntil

    drawBead(ctx, p.sx, p.sy, r, lookOf(s), i, t, {
      light: (s.dashing ? 66 : 54) + (bitten ? 22 : 0),
      taper,
    })
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

  // While you are unseen, your own head wears a soft halo - so at a
  // glance you can tell which state you are in without reading the HUD.
  if (s.player && s.unseen > 0.15) {
    const shimmer = ctx.createRadialGradient(h.sx, h.sy, hr * 0.5, h.sx, h.sy, hr * 2.6)
    shimmer.addColorStop(0, `rgba(190,228,255,${(0.3 * s.unseen).toFixed(2)})`)
    shimmer.addColorStop(1, 'rgba(190,228,255,0)')
    ctx.fillStyle = shimmer
    ctx.beginPath()
    ctx.arc(h.sx, h.sy, hr * 2.6, 0, Math.PI * 2)
    ctx.fill()
  }

  // The head, with jaws.
  //
  // A circle with two eyes on it reads as a bead, not a snake. This is
  // built in the head's own frame - nose along +x - so the whole thing
  // can be laid out as if it were facing right and then turned to
  // wherever the snake is actually going.
  //
  // The mouth is never quite shut. A jaw line that only appears when
  // the snake happens to be mid-chomp is a jaw line nobody ever sees;
  // holding it a little open means the head always reads as a head.
  const chomp = 0.5 + Math.sin(t * 0.009 + s.id) * 0.5
  const bitJustNow = t < s.bittenUntil ? 1 : 0
  // Kept modest on purpose. Opened wide the jaws become two slivers and
  // the head reads as a mouth with a snake behind it - the gape has to
  // stay narrower than the head is deep.
  const gape = Math.min(0.5, 0.12 + chomp * 0.12 + (s.dashing ? 0.14 : 0) + bitJustNow * 0.22)

  ctx.save()
  ctx.translate(h.sx, h.sy)
  ctx.rotate(s.heading)

  const L = hr * 1.5
  const Wd = hr * 1.1

  // Head skin sits in the same range as the body, or the head looks
  // like a different animal stuck on the front.
  const skin = (lift: number) => {
    const g = ctx.createLinearGradient(0, -Wd, 0, Wd)
    g.addColorStop(0, hsl(s.hue, s.sat + 6, 64 + lift))
    g.addColorStop(0.5, hsl(s.hue, s.sat, 50 + lift))
    g.addColorStop(1, hsl(s.hue, s.sat - 6, 32 + lift))
    return g
  }

  // Throat, drawn first so both jaws close over it.
  ctx.fillStyle = '#4a0f1a'
  ctx.beginPath()
  ctx.moveTo(-hr * 0.2, 0)
  ctx.lineTo(L * 1.02, -Wd * gape * 1.05)
  ctx.lineTo(L * 1.02, Wd * gape * 1.05)
  ctx.closePath()
  ctx.fill()

  // Upper jaw.
  ctx.fillStyle = skin(4)
  ctx.beginPath()
  ctx.moveTo(-L * 0.55, -Wd * 0.2)
  ctx.quadraticCurveTo(-L * 0.4, -Wd * 1.04, L * 0.1, -Wd * 1.02)
  ctx.quadraticCurveTo(L * 0.78, -Wd * 0.9, L * 0.99, -Wd * (0.12 + gape))
  ctx.lineTo(-hr * 0.2, -Wd * gape * 0.35)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = hsl(s.hue, s.sat, 24, 0.55)
  ctx.lineWidth = Math.max(0.7, hr * 0.06)
  ctx.stroke()

  // Lower jaw, hinged further back so it swings rather than slides.
  ctx.fillStyle = skin(-12)
  ctx.beginPath()
  ctx.moveTo(-L * 0.55, Wd * 0.2)
  ctx.quadraticCurveTo(-L * 0.4, Wd * 1.04, L * 0.08, Wd * 1.0)
  ctx.quadraticCurveTo(L * 0.66, Wd * 0.88, L * 0.86, Wd * (0.16 + gape))
  ctx.lineTo(-hr * 0.2, Wd * gape * 0.35)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Teeth. Two on top, two below, and they meet when the mouth shuts.
  if (hr > 6) {
    ctx.fillStyle = '#fdf8ee'
    const tooth = (baseX: number, tipX: number, sign: number, from: number, to: number) => {
      ctx.beginPath()
      ctx.moveTo(baseX, sign * Wd * from)
      ctx.lineTo(tipX, sign * Wd * to)
      ctx.lineTo(baseX - hr * 0.22, sign * Wd * (from + 0.06))
      ctx.closePath()
      ctx.fill()
    }
    tooth(L * 0.9, L * 0.82, -1, 0.14 + gape, 0.5 + gape * 0.5)
    tooth(L * 0.62, L * 0.56, -1, 0.3 + gape * 0.8, 0.62 + gape * 0.4)
    tooth(L * 0.78, L * 0.7, 1, 0.18 + gape, 0.52 + gape * 0.5)
  }

  // A tongue, flicked out now and then rather than always hanging there.
  const flick = Math.sin(t * 0.004 + s.id * 2.1)
  if (flick > 0.84 && hr > 5) {
    ctx.strokeStyle = '#e0486a'
    ctx.lineWidth = Math.max(0.8, hr * 0.11)
    ctx.lineCap = 'round'
    const reach = L * (1.06 + (flick - 0.84) * 2.2)
    ctx.beginPath()
    ctx.moveTo(L * 0.9, 0)
    ctx.lineTo(reach, 0)
    ctx.moveTo(reach, 0)
    ctx.lineTo(reach + hr * 0.28, -hr * 0.2)
    ctx.moveTo(reach, 0)
    ctx.lineTo(reach + hr * 0.28, hr * 0.2)
    ctx.stroke()
  }

  // Eyes, on top of the head and well back from the snout - which is
  // where a snake's actually are, and leaves the jaws room to read.
  for (const side of [-1, 1]) {
    const ex = L * 0.02
    const ey = side * Wd * 0.46
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(ex, ey, hr * 0.26, hr * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#121a24'
    ctx.beginPath()
    ctx.ellipse(ex + hr * 0.09, ey, hr * 0.1, hr * 0.17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(ex + hr * 0.015, ey - hr * 0.1, hr * 0.055, 0, Math.PI * 2)
    ctx.fill()
    // A brow over the top, which is most of the expression.
    ctx.fillStyle = skin(-18)
    ctx.beginPath()
    ctx.ellipse(ex - hr * 0.04, ey + side * hr * 0.22, hr * 0.3, hr * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Nostrils, one dot each. At this size it is a pixel of character.
  if (hr > 9) {
    ctx.fillStyle = hsl(s.hue, s.sat, 18)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(L * 0.74, side * Wd * 0.42, hr * 0.055, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // The threat ring goes round the whole head, outside the rotation, so
  // it stays a circle whatever way the snake is pointing.
  ctx.strokeStyle = ring
  ctx.lineWidth = Math.max(1, 2 * cam.zoom)
  ctx.beginPath()
  ctx.arc(h.sx, h.sy, hr * 1.24, 0, Math.PI * 2)
  ctx.stroke()

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
  if (fade < 1) ctx.globalAlpha = wasGlobal
  void t
}
