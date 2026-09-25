/**
 * Iron Man Life, drawn side-on.
 *
 * A flat 2D canvas rather than the first-person engine the ocean and the
 * city use: the whole point of this one is seeing your own suit and what
 * is about to hit it, which you cannot do from behind your own visor.
 */

import { FLOOR_Y, THINGS, VIEW, type ThingKind } from './ironData'

export interface Thing {
  kind: ThingKind
  x: number
  y: number
  vy: number
  hp: number
  /** Ticks up so things bob and flames flicker. */
  seed: number
  dead: boolean
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

/* ------------------------------------------------------------------ */
/* The city going past                                                 */
/* ------------------------------------------------------------------ */

export function drawSky(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR_Y)
  g.addColorStop(0, '#1b2440')
  g.addColorStop(0.45, '#42406b')
  g.addColorStop(0.8, '#a05f6a')
  g.addColorStop(1, '#e09a63')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIEW.width, FLOOR_Y)

  // A low sun, and cloud bars across it.
  ctx.globalAlpha = 0.85
  ctx.fillStyle = '#f2c27a'
  ctx.beginPath()
  ctx.arc(760, 366, 46, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#2b2438'
  for (let i = 0; i < 5; i++) {
    const y = 300 + i * 26 + Math.sin(t * 0.0002 + i) * 4
    ctx.fillRect(0, y, VIEW.width, 7)
  }
  ctx.globalAlpha = 1
}

/** Three ranks of buildings, each sliding past at its own rate. */
export function drawCity(ctx: CanvasRenderingContext2D, scroll: number) {
  const ranks: [number, number, string, number][] = [
    [0.22, 150, '#2b2f४6'.replace('४', '4'), 0.55],
    [0.45, 210, '#242838', 0.8],
    [0.85, 300, '#181b26', 1],
  ]
  for (const [rate, tall, colour, alpha] of ranks) {
    const off = scroll * rate
    const W = 120
    ctx.globalAlpha = alpha
    ctx.fillStyle = colour
    const first = Math.floor(off / W) - 1
    for (let i = first; i < first + VIEW.width / W + 3; i++) {
      const h = tall * (0.5 + hash(i * (rate + 1)) * 0.8)
      const x = i * W - off
      const w = W * (0.62 + hash(i * 3.3) * 0.3)
      ctx.fillRect(x, FLOOR_Y - h, w, h)
      // Lit windows, a few of them.
      if (rate > 0.4) {
        ctx.globalAlpha = alpha * 0.5
        ctx.fillStyle = '#f2c27a'
        for (let r = 0; r < Math.floor(h / 34); r++) {
          for (let c = 0; c < 3; c++) {
            if (hash(i * 31 + r * 7 + c) < 0.55) continue
            ctx.fillRect(x + 10 + c * (w / 3), FLOOR_Y - h + 14 + r * 34, 9, 12)
          }
        }
        ctx.globalAlpha = alpha
        ctx.fillStyle = colour
      }
    }
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#10131b'
  ctx.fillRect(0, FLOOR_Y, VIEW.width, VIEW.height - FLOOR_Y)
}

/* ------------------------------------------------------------------ */
/* The suit                                                            */
/* ------------------------------------------------------------------ */

export function drawSuit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  thrusting: boolean,
  tilt: number,
  t: number,
  hurt: number
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)

  const red = hurt > 0 ? '#e0846a' : '#b8302b'
  const gold = '#d9a93a'

  // Thruster flames first, so the suit sits over them.
  if (thrusting) {
    const flick = 1 + Math.sin(t * 0.04) * 0.25
    for (const [fx, fy] of [[-16, 20], [-4, 22], [-24, 2], [-24, -8]]) {
      const grad = ctx.createLinearGradient(fx, fy, fx - 34 * flick, fy + 6)
      grad.addColorStop(0, '#dff4ff')
      grad.addColorStop(0.4, '#7fc2f2')
      grad.addColorStop(1, 'rgba(90,150,240,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(fx, fy - 5)
      ctx.lineTo(fx - 36 * flick, fy + 1)
      ctx.lineTo(fx, fy + 5)
      ctx.closePath()
      ctx.fill()
    }
  }

  // legs, trailing behind in flight
  ctx.strokeStyle = red
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, 8)
  ctx.lineTo(-18, 20)
  ctx.moveTo(2, 10)
  ctx.lineTo(-10, 24)
  ctx.stroke()
  ctx.strokeStyle = gold
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-14, 17)
  ctx.lineTo(-20, 22)
  ctx.moveTo(-6, 21)
  ctx.lineTo(-12, 26)
  ctx.stroke()

  // torso
  ctx.fillStyle = red
  ctx.beginPath()
  ctx.moveTo(-16, -12)
  ctx.quadraticCurveTo(0, -20, 14, -10)
  ctx.quadraticCurveTo(16, 4, 4, 12)
  ctx.quadraticCurveTo(-10, 14, -16, -12)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = gold
  ctx.beginPath()
  ctx.ellipse(-2, -6, 13, 9, 0, 0, Math.PI * 2)
  ctx.fill()

  // arc reactor
  const glow = ctx.createRadialGradient(-2, -6, 1, -2, -6, 13)
  glow.addColorStop(0, '#ffffff')
  glow.addColorStop(0.35, '#a8e4ff')
  glow.addColorStop(1, 'rgba(120,200,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(-2, -6, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8f8ff'
  ctx.beginPath()
  ctx.arc(-2, -6, 4.4, 0, Math.PI * 2)
  ctx.fill()

  // arm forward, palm open
  ctx.strokeStyle = red
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(6, -6)
  ctx.lineTo(24, 0)
  ctx.stroke()
  ctx.fillStyle = gold
  ctx.beginPath()
  ctx.arc(27, 1, 5.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#cfeeff'
  ctx.beginPath()
  ctx.arc(27, 1, 2.6, 0, Math.PI * 2)
  ctx.fill()

  // helmet
  ctx.fillStyle = red
  ctx.beginPath()
  ctx.moveTo(6, -14)
  ctx.quadraticCurveTo(22, -22, 26, -12)
  ctx.quadraticCurveTo(26, -4, 14, -4)
  ctx.quadraticCurveTo(6, -6, 6, -14)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = gold
  ctx.beginPath()
  ctx.moveTo(10, -16)
  ctx.quadraticCurveTo(20, -22, 25, -14)
  ctx.lineTo(22, -10)
  ctx.quadraticCurveTo(16, -14, 10, -12)
  ctx.closePath()
  ctx.fill()
  // the eyes
  ctx.fillStyle = '#dff4ff'
  ctx.fillRect(15, -13, 8, 3)

  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Everything else in the air                                          */
/* ------------------------------------------------------------------ */

export function drawThing(ctx: CanvasRenderingContext2D, thing: Thing, t: number) {
  const spec = THINGS[thing.kind]
  const bob = Math.sin(t * 0.004 + thing.seed) * 4
  ctx.save()
  ctx.translate(thing.x, thing.y + (thing.kind === 'flare' ? 0 : bob))

  switch (thing.kind) {
    case 'drone':
      ctx.fillStyle = spec.colour
      ctx.beginPath()
      ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#c2cbd4'
      ctx.lineWidth = 3
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(s * 10, -6)
        ctx.lineTo(s * 20, -14)
        ctx.stroke()
        ctx.beginPath()
        ctx.ellipse(s * 22, -15, 9, 2.4, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(200,215,230,0.55)'
        ctx.fill()
      }
      ctx.fillStyle = '#e2584f'
      ctx.beginPath()
      ctx.arc(-12, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'missile':
      ctx.fillStyle = spec.colour
      ctx.beginPath()
      ctx.moveTo(-16, 0)
      ctx.lineTo(10, -6)
      ctx.lineTo(16, 0)
      ctx.lineTo(10, 6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#e8d9a8'
      ctx.beginPath()
      ctx.moveTo(-14, -6)
      ctx.lineTo(-6, 0)
      ctx.lineTo(-14, 6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(240,160,80,0.75)'
      ctx.beginPath()
      ctx.moveTo(-16, -3)
      ctx.lineTo(-34 - Math.sin(t * 0.03) * 8, 0)
      ctx.lineTo(-16, 3)
      ctx.closePath()
      ctx.fill()
      break
    case 'gunship':
      ctx.fillStyle = spec.colour
      ctx.beginPath()
      ctx.moveTo(-40, -6)
      ctx.lineTo(24, -14)
      ctx.lineTo(40, 0)
      ctx.lineTo(24, 14)
      ctx.lineTo(-40, 8)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#2b3540'
      ctx.fillRect(10, -8, 16, 7)
      ctx.strokeStyle = '#8d99a4'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-10, -14)
      ctx.lineTo(-10, -24)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(-10, -26, 30, 3, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(200,215,230,0.5)'
      ctx.fill()
      break
    case 'debris':
      ctx.rotate(t * 0.0012 + thing.seed)
      ctx.fillStyle = spec.colour
      ctx.beginPath()
      ctx.moveTo(-24, -14)
      ctx.lineTo(10, -22)
      ctx.lineTo(26, 6)
      ctx.lineTo(-6, 22)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#8d8478'
      ctx.fillRect(-10, -8, 14, 10)
      break
    case 'flare': {
      const h = 120 + Math.sin(t * 0.006 + thing.seed) * 18
      const g = ctx.createLinearGradient(0, 30, 0, -h)
      g.addColorStop(0, 'rgba(240,120,40,0.95)')
      g.addColorStop(0.5, 'rgba(240,180,60,0.7)')
      g.addColorStop(1, 'rgba(255,220,140,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(-26, 34)
      ctx.quadraticCurveTo(-8, -h * 0.5, 4, -h)
      ctx.quadraticCurveTo(14, -h * 0.4, 26, 34)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'civilian':
      ctx.fillStyle = '#3f5a7a'
      ctx.fillRect(-6, -6, 12, 18)
      ctx.strokeStyle = '#3f5a7a'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-5, 12)
      ctx.lineTo(-9, 22)
      ctx.moveTo(5, 12)
      ctx.lineTo(9, 22)
      ctx.moveTo(-6, -2)
      ctx.lineTo(-16, -12 + Math.sin(t * 0.01) * 4)
      ctx.moveTo(6, -2)
      ctx.lineTo(16, -12 - Math.sin(t * 0.01) * 4)
      ctx.stroke()
      ctx.fillStyle = spec.colour
      ctx.beginPath()
      ctx.arc(0, -13, 8, 0, Math.PI * 2)
      ctx.fill()
      break
  }
  ctx.restore()
}

/** A repulsor bolt on its way to something. */
export function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number, big: boolean) {
  const len = big ? 60 : 26
  const g = ctx.createLinearGradient(x - len, y, x + len * 0.3, y)
  g.addColorStop(0, 'rgba(150,220,255,0)')
  g.addColorStop(0.6, big ? '#cfeeff' : '#a8e4ff')
  g.addColorStop(1, '#ffffff')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, len, big ? 13 : 5, 0, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * The aiming reticle. The ring is the honest truth about how near a click
 * has to land, so a repulsor upgrade visibly widens it.
 */
export function drawReticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  reach: number,
  ready: boolean
) {
  ctx.save()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = ready ? 'rgba(255,214,140,0.85)' : 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.arc(x, y, reach, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = ready ? 'rgba(255,240,210,0.95)' : 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 2
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    ctx.beginPath()
    ctx.moveTo(x + dx * 7, y + dy * 7)
    ctx.lineTo(x + dx * 15, y + dy * 15)
    ctx.stroke()
  }
  ctx.restore()
}
