/**
 * The nursery, drawn.
 *
 * Top down, because the whole game is about where things are in
 * relation to each other - which way a baby is facing, whether an egg is
 * inside the cone, how far the bin has to travel before it hits
 * something. A view with any tilt on it makes all three harder to read
 * and buys nothing.
 */

import {
  type AbilityKind,
  ABILITY_BY_KIND,
  typeOf,
} from './dragonData'
import {
  type Baby,
  type Egg,
  type Nursery,
  type Prop,
  BABY_R,
  EGG_R,
  PROP_R,
  ROOM,
} from './dragonNursery'

export const VIEW = ROOM

const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsl(${h} ${s}% ${l}%${a < 1 ? ` / ${a}` : ''})`

/* ------------------------------------------------------------------ */
/* The room                                                            */
/* ------------------------------------------------------------------ */

export function drawRoom(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createRadialGradient(
    ROOM.w / 2,
    ROOM.h * 0.42,
    40,
    ROOM.w / 2,
    ROOM.h / 2,
    ROOM.w * 0.72
  )
  g.addColorStop(0, '#3a2b20')
  g.addColorStop(0.6, '#2a1e17')
  g.addColorStop(1, '#170f0b')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, ROOM.w, ROOM.h)

  // Straw on the floor. Fixed off position rather than time, so it is
  // bedding rather than static.
  ctx.save()
  for (let i = 0; i < 220; i++) {
    const x = ((i * 7919) % ROOM.w) + Math.sin(i) * 3
    const y = ((i * 104729) % ROOM.h) + Math.cos(i * 1.3) * 3
    const a = (i % 9) * 0.35
    ctx.strokeStyle = hsl(38, 34, 34 + (i % 5) * 3, 0.5)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11)
    ctx.stroke()
  }
  ctx.restore()

  // A warm lamp overhead, breathing very slightly.
  const lamp = 0.9 + Math.sin(t * 0.0009) * 0.06
  const warm = ctx.createRadialGradient(ROOM.w / 2, ROOM.h * 0.3, 20, ROOM.w / 2, ROOM.h * 0.3, 420)
  warm.addColorStop(0, `rgba(255,208,140,${0.16 * lamp})`)
  warm.addColorStop(1, 'rgba(255,190,120,0)')
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, ROOM.w, ROOM.h)

  // The walls.
  ctx.strokeStyle = 'rgba(255,214,160,0.3)'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, ROOM.w - 6, ROOM.h - 6)
  ctx.strokeStyle = 'rgba(120,80,50,0.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(9, 9, ROOM.w - 18, ROOM.h - 18)
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x, y + r * 0.5, 0, x, y + r * 0.5, r * 1.3)
  g.addColorStop(0, 'rgba(0,0,0,0.42)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.55, r * 1.25, r * 0.6, 0, 0, Math.PI * 2)
  ctx.fill()
}

/* ------------------------------------------------------------------ */
/* Eggs                                                                */
/* ------------------------------------------------------------------ */

export function drawEgg(ctx: CanvasRenderingContext2D, e: Egg, t: number) {
  if (e.lost || e.hatched) return
  const type = typeOf(e.code)
  shadow(ctx, e.x, e.y, EGG_R)

  // Condition shows in the shell rather than in a bar: a hurt egg goes
  // grey and cracks, so you can read the room without reading numbers.
  const cond = e.hp
  const sat = 20 + cond * 46
  const light = 30 + cond * 36
  const rx = EGG_R * (0.82 + Math.sin(t * 0.003 + e.id) * 0.02)
  const ry = EGG_R * 1.12

  const g = ctx.createRadialGradient(e.x - rx * 0.35, e.y - ry * 0.4, 2, e.x, e.y, ry * 1.2)
  g.addColorStop(0, hsl(type.hue, sat, Math.min(92, light + 28)))
  g.addColorStop(0.62, hsl(type.hue, sat, light))
  g.addColorStop(1, hsl(type.hue, sat * 0.8, Math.max(8, light - 18)))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(e.x, e.y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  // Speckles, in the ability's colour, fixed to the egg.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + e.id
    const rr = 0.3 + ((i * 37) % 10) / 22
    ctx.fillStyle = hsl(type.accent, 60, 62, 0.5 * cond + 0.12)
    ctx.beginPath()
    ctx.ellipse(
      e.x + Math.cos(a) * rx * rr,
      e.y + Math.sin(a) * ry * rr,
      2.4,
      1.8,
      a,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }

  // Cracks, one more for each quarter of condition gone.
  const cracks = Math.floor((1 - cond) * 4)
  if (cracks > 0) {
    ctx.strokeStyle = `rgba(20,10,6,${0.35 + (1 - cond) * 0.45})`
    ctx.lineWidth = 1.6
    for (let i = 0; i < cracks; i++) {
      const a = e.id * 1.7 + i * 2.1
      ctx.beginPath()
      ctx.moveTo(e.x + Math.cos(a) * rx * 0.2, e.y + Math.sin(a) * ry * 0.2)
      ctx.lineTo(e.x + Math.cos(a + 0.4) * rx * 0.75, e.y + Math.sin(a + 0.4) * ry * 0.8)
      ctx.lineTo(e.x + Math.cos(a - 0.2) * rx * 0.95, e.y + Math.sin(a - 0.2) * ry * 1.02)
      ctx.stroke()
    }
  }

  // Silk, if something wrapped it.
  if (e.silk > 0) {
    ctx.strokeStyle = `rgba(236,224,255,${0.35 + e.silk * 0.5})`
    ctx.lineWidth = 2.2
    for (let i = 0; i < 6; i++) {
      const a = i * 0.9 + e.id
      ctx.beginPath()
      ctx.ellipse(e.x, e.y, rx * (0.5 + i * 0.1), ry * 0.9, a, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // A flinch when something just hurt it.
  if (t < e.hurtUntil) {
    ctx.strokeStyle = `rgba(255,120,90,${((e.hurtUntil - t) / 260) * 0.9})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(e.x, e.y, rx + 4, ry + 4, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  if (e.held) {
    ctx.strokeStyle = 'rgba(255,235,190,0.85)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.ellipse(e.x, e.y, rx + 8, ry + 8, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

/* ------------------------------------------------------------------ */
/* Dragonettes                                                         */
/* ------------------------------------------------------------------ */

export function drawBaby(ctx: CanvasRenderingContext2D, b: Baby, t: number) {
  const type = typeOf(b.code)
  const calm = t < b.calmUntil

  // The blink trail, while it is fresh.
  const since = t - b.blinkedAt
  if (since < 450) {
    const f = 1 - since / 450
    ctx.strokeStyle = hsl(140, 80, 72, f * 0.6)
    ctx.lineWidth = 3
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(b.fromX, b.fromY)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = hsl(140, 86, 78, f * 0.35)
    ctx.beginPath()
    ctx.arc(b.fromX, b.fromY, BABY_R * (1 + (1 - f) * 1.4), 0, Math.PI * 2)
    ctx.fill()
  }

  shadow(ctx, b.x, b.y, BABY_R)

  const flap = Math.sin(t * 0.011 + b.id) * (calm ? 0.12 : 0.45)
  // Wings first, behind the body.
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.heading + side * (0.9 + flap * side))
    ctx.fillStyle = hsl(type.hue, 46, 44, 0.9)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(BABY_R * 1.5, -BABY_R * 0.5, BABY_R * 1.9, BABY_R * 0.35)
    ctx.quadraticCurveTo(BABY_R * 1.1, BABY_R * 0.35, 0, 0)
    ctx.fill()
    ctx.restore()
  }

  // Body.
  const g = ctx.createRadialGradient(
    b.x - BABY_R * 0.35,
    b.y - BABY_R * 0.4,
    2,
    b.x,
    b.y,
    BABY_R * 1.2
  )
  g.addColorStop(0, hsl(type.hue, 62, 66))
  g.addColorStop(1, hsl(type.hue, 58, 34))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(b.x, b.y, BABY_R, BABY_R * 0.88, b.heading, 0, Math.PI * 2)
  ctx.fill()

  // Snout, pointed the way it is facing - which is the thing you have to
  // be able to read, because fire and silk both come out of it in a cone.
  const sx = b.x + Math.cos(b.heading) * BABY_R * 0.95
  const sy = b.y + Math.sin(b.heading) * BABY_R * 0.95
  ctx.fillStyle = hsl(type.hue, 56, 52)
  ctx.beginPath()
  ctx.ellipse(sx, sy, BABY_R * 0.42, BABY_R * 0.32, b.heading, 0, Math.PI * 2)
  ctx.fill()

  // Eyes. Shut when settled, which is how you tell at a glance.
  for (const side of [-0.42, 0.42]) {
    const ex = b.x + Math.cos(b.heading + side) * BABY_R * 0.62
    const ey = b.y + Math.sin(b.heading + side) * BABY_R * 0.62
    if (calm) {
      ctx.strokeStyle = 'rgba(20,12,8,0.8)'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(ex, ey, 3, 0.2, Math.PI - 0.2)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#fff8ee'
      ctx.beginPath()
      ctx.arc(ex, ey, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#20140c'
      ctx.beginPath()
      ctx.arc(ex + Math.cos(b.heading) * 1.1, ey + Math.sin(b.heading) * 1.1, 1.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // A ring in the ability's colour while it is winding up, so there is
  // always a moment where you could have done something.
  const till = b.nextAt - t
  if (!calm && till > 0 && till < 1400) {
    const f = 1 - till / 1400
    ctx.strokeStyle = hsl(ABILITY_BY_KIND[b.ability].hue, 90, 66, 0.3 + f * 0.6)
    ctx.lineWidth = 2 + f * 2
    ctx.beginPath()
    ctx.arc(b.x, b.y, BABY_R + 9 - f * 4, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (calm) {
    ctx.fillStyle = 'rgba(190,220,255,0.55)'
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('zzz', b.x, b.y - BABY_R - 8)
    ctx.textAlign = 'start'
  }
}

/** The ability itself, while it is going off. */
export function drawBurst(ctx: CanvasRenderingContext2D, b: Baby, t: number) {
  if (t >= b.firingUntil) return
  const a = b.ability
  const hue = ABILITY_BY_KIND[a].hue
  if (a === 'fire' || a === 'silk') {
    const reach = a === 'fire' ? 190 : 170
    const spread = a === 'fire' ? 0.62 : 0.8
    const g = ctx.createRadialGradient(b.x, b.y, BABY_R * 0.5, b.x, b.y, reach)
    if (a === 'fire') {
      g.addColorStop(0, 'rgba(255,240,190,0.9)')
      g.addColorStop(0.35, hsl(28, 96, 58, 0.72))
      g.addColorStop(1, hsl(8, 92, 44, 0))
    } else {
      g.addColorStop(0, 'rgba(244,238,255,0.8)')
      g.addColorStop(0.5, hsl(286, 60, 80, 0.5))
      g.addColorStop(1, hsl(286, 50, 70, 0))
    }
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.arc(b.x, b.y, reach, b.heading - spread, b.heading + spread)
    ctx.closePath()
    ctx.fill()
  } else if (a === 'frost') {
    const f = (t - (b.firingUntil - 1600)) / 1600
    const r = 130 * Math.min(1, f * 1.6)
    const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, Math.max(6, r))
    g.addColorStop(0, 'rgba(236,252,255,0.75)')
    g.addColorStop(0.7, hsl(196, 86, 72, 0.4))
    g.addColorStop(1, hsl(200, 80, 66, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(b.x, b.y, Math.max(6, r), 0, Math.PI * 2)
    ctx.fill()
    // Spikes of frost, so it reads as cold rather than as a glow.
    ctx.strokeStyle = hsl(198, 90, 88, 0.55)
    ctx.lineWidth = 2
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + t * 0.0004
      ctx.beginPath()
      ctx.moveTo(b.x + Math.cos(ang) * r * 0.5, b.y + Math.sin(ang) * r * 0.5)
      ctx.lineTo(b.x + Math.cos(ang) * r * 0.92, b.y + Math.sin(ang) * r * 0.92)
      ctx.stroke()
    }
  } else if (a === 'strength') {
    ctx.strokeStyle = hsl(hue, 92, 66, (b.firingUntil - t) / 320)
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(b.x, b.y, BABY_R + 12, b.heading - 0.9, b.heading + 0.9)
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ */
/* Things that get knocked about                                       */
/* ------------------------------------------------------------------ */

export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  shadow(ctx, p.x, p.y, PROP_R)
  const moving = Math.hypot(p.vx, p.vy) > 20
  ctx.save()
  ctx.translate(p.x, p.y)
  if (moving) ctx.rotate(t * 0.006)
  if (p.kind === 'bin') {
    ctx.fillStyle = '#5d6672'
    ctx.beginPath()
    ctx.moveTo(-PROP_R * 0.7, -PROP_R * 0.8)
    ctx.lineTo(PROP_R * 0.7, -PROP_R * 0.8)
    ctx.lineTo(PROP_R * 0.55, PROP_R * 0.8)
    ctx.lineTo(-PROP_R * 0.55, PROP_R * 0.8)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#7b8695'
    ctx.fillRect(-PROP_R * 0.78, -PROP_R * 0.95, PROP_R * 1.56, PROP_R * 0.3)
  } else if (p.kind === 'crate') {
    ctx.fillStyle = '#8a6136'
    ctx.fillRect(-PROP_R * 0.75, -PROP_R * 0.75, PROP_R * 1.5, PROP_R * 1.5)
    ctx.strokeStyle = '#a97c49'
    ctx.lineWidth = 3
    ctx.strokeRect(-PROP_R * 0.75, -PROP_R * 0.75, PROP_R * 1.5, PROP_R * 1.5)
    ctx.beginPath()
    ctx.moveTo(-PROP_R * 0.75, -PROP_R * 0.75)
    ctx.lineTo(PROP_R * 0.75, PROP_R * 0.75)
    ctx.stroke()
  } else {
    const g = ctx.createRadialGradient(-PROP_R * 0.3, -PROP_R * 0.3, 2, 0, 0, PROP_R * 0.85)
    g.addColorStop(0, '#e8d27a')
    g.addColorStop(1, '#9a7b2c')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, PROP_R * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  if (moving) {
    ctx.strokeStyle = 'rgba(255,170,120,0.55)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06)
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ */
/* The whole floor                                                     */
/* ------------------------------------------------------------------ */

export function drawNursery(ctx: CanvasRenderingContext2D, n: Nursery, t: number) {
  drawRoom(ctx, t)
  for (const p of n.props) drawProp(ctx, p, t)
  for (const e of n.eggs) drawEgg(ctx, e, t)
  for (const b of n.babies) drawBaby(ctx, b, t)
  // Bursts over everything, so a cone is never hidden under a baby.
  for (const b of n.babies) drawBurst(ctx, b, t)
}

/** A dragon on its own, for the houses and the collection. */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  code: number,
  x: number,
  y: number,
  r: number,
  t: number
) {
  const type = typeOf(code)
  const flap = Math.sin(t * 0.004 + code) * 0.2
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(side * (1.5 + flap * side))
    ctx.fillStyle = hsl(type.hue, 46, 46, 0.92)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(r * 1.6, -r * 0.6, r * 2, r * 0.4)
    ctx.quadraticCurveTo(r * 1.2, r * 0.4, 0, 0)
    ctx.fill()
    ctx.restore()
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 2, x, y, r * 1.2)
  g.addColorStop(0, hsl(type.hue, 64, 68))
  g.addColorStop(1, hsl(type.hue, 58, 32))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = hsl(type.accent, 74, 60, 0.75)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + code
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.42, r * 0.11, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fff8ee'
  for (const side of [-0.4, 0.4]) {
    ctx.beginPath()
    ctx.arc(x + side * r * 0.5, y - r * 0.2, r * 0.17, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#20140c'
  for (const side of [-0.4, 0.4]) {
    ctx.beginPath()
    ctx.arc(x + side * r * 0.5, y - r * 0.2, r * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The one line that says what this baby is about to do. */
export function troubleLine(a: AbilityKind): string {
  return ABILITY_BY_KIND[a].trouble
}
