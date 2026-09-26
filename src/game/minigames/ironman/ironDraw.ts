/**
 * Iron Man Life, drawn side-on.
 *
 * A flat 2D canvas rather than the first-person engine the ocean and the
 * city use: the whole point of this one is seeing your own suit and what
 * is about to hit it, which you cannot do from behind your own visor.
 */

import { FLOOR_Y, THINGS, VIEW, type ThingKind } from './ironData'
import { blend, parseColour, toCss } from '../../engine/polish'

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

/**
 * A plate of painted metal, lit from up and to the left.
 *
 * Flat red is what made the suit look like a sticker. Armour reads as
 * armour when one edge catches the light, the middle holds the actual
 * colour, and the far edge falls away almost to black - and when the
 * whole thing carries a little of the sky it is flying through.
 */
function plate(
  ctx: CanvasRenderingContext2D,
  base: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): CanvasGradient {
  const c = parseColour(base)
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, toCss(blend(c, [255, 246, 228], 0.5)))
  g.addColorStop(0.28, toCss(blend(c, [255, 246, 228], 0.16)))
  g.addColorStop(0.58, toCss(c))
  g.addColorStop(0.85, toCss(blend(c, [22, 16, 26], 0.42)))
  g.addColorStop(1, toCss(blend(c, [96, 128, 176], 0.3)))
  return g
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
  g.addColorStop(0, '#141c33')
  g.addColorStop(0.32, '#31355c')
  g.addColorStop(0.62, '#6d4f6e')
  g.addColorStop(0.84, '#b86c60')
  g.addColorStop(1, '#eba765')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIEW.width, FLOOR_Y)

  const sx = 760
  const sy = 366

  // The sun, and the air around it lit by the sun. The bloom is the part
  // that matters - a disc on its own is a sticker on the sky.
  const bloom = ctx.createRadialGradient(sx, sy, 10, sx, sy, 300)
  bloom.addColorStop(0, 'rgba(255,224,164,0.55)')
  bloom.addColorStop(0.3, 'rgba(240,160,110,0.2)')
  bloom.addColorStop(1, 'rgba(240,150,110,0)')
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, VIEW.width, FLOOR_Y)

  ctx.globalAlpha = 0.95
  const disc = ctx.createRadialGradient(sx, sy, 2, sx, sy, 46)
  disc.addColorStop(0, '#fff6dd')
  disc.addColorStop(0.7, '#f7c884')
  disc.addColorStop(1, 'rgba(246,190,126,0)')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(sx, sy, 46, 0, Math.PI * 2)
  ctx.fill()

  // Cloud bars. They are underlit near the sun and dark away from it,
  // which is the whole reason a sunset looks like a sunset.
  for (let i = 0; i < 7; i++) {
    const y = 284 + i * 22 + Math.sin(t * 0.0002 + i) * 4
    const h = 5 + (i % 3) * 3
    const drift = (t * 0.004 * (0.3 + i * 0.09)) % (VIEW.width + 400)
    const cx = VIEW.width + 200 - drift
    const bar = ctx.createLinearGradient(cx - 420, 0, cx + 120, 0)
    bar.addColorStop(0, 'rgba(38,30,52,0)')
    bar.addColorStop(0.3, `rgba(46,34,56,${(0.42 - i * 0.03).toFixed(2)})`)
    bar.addColorStop(0.72, `rgba(226,146,104,${(0.3 - i * 0.03).toFixed(2)})`)
    bar.addColorStop(1, 'rgba(240,180,120,0)')
    ctx.fillStyle = bar
    ctx.beginPath()
    ctx.ellipse(cx - 150, y, 280, h, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/**
 * Four ranks of buildings, each sliding past at its own rate.
 *
 * Depth here is not just parallax. A near building is dark and sharp; a
 * far one is washed toward the colour of the air between you and it, and
 * a layer of that air is laid down between every rank. That wash is what
 * turns a row of rectangles into a distance.
 */
export function drawCity(ctx: CanvasRenderingContext2D, scroll: number) {
  const ranks: [number, number, string, number][] = [
    [0.14, 120, '#4a4668', 0.5],
    [0.28, 165, '#38375a', 0.62],
    [0.52, 225, '#272a42', 0.8],
    [0.9, 310, '#14172099'.slice(0, 7), 1],
  ]
  for (const [rate, tall, colour, haze] of ranks) {
    const off = scroll * rate
    const W = 120
    const first = Math.floor(off / W) - 1
    for (let i = first; i < first + VIEW.width / W + 3; i++) {
      const h = tall * (0.5 + hash(i * (rate + 1)) * 0.8)
      const x = i * W - off
      const w = W * (0.62 + hash(i * 3.3) * 0.3)
      const topY = FLOOR_Y - h

      // The face of the building: lighter where the sky reaches the top
      // of it, and close to black down where the street is.
      const c = parseColour(colour)
      const face = ctx.createLinearGradient(0, topY, 0, FLOOR_Y)
      face.addColorStop(0, toCss(blend(c, [180, 150, 170], 0.3)))
      face.addColorStop(0.45, toCss(c))
      face.addColorStop(1, toCss(blend(c, [8, 9, 14], 0.55)))
      ctx.fillStyle = face
      ctx.fillRect(x, topY, w, h)

      // One lit edge, the side the sun is still on.
      ctx.fillStyle = toCss(blend(c, [255, 200, 150], 0.3))
      ctx.fillRect(x + w - 2.5, topY, 2.5, h)
      ctx.fillStyle = toCss(blend(c, [255, 214, 170], 0.42))
      ctx.fillRect(x, topY, w, 2)

      if (rate > 0.2) {
        const rows = Math.floor(h / 34)
        for (let r = 0; r < rows; r++) {
          for (let c2 = 0; c2 < 3; c2++) {
            const roll = hash(i * 31 + r * 7 + c2)
            if (roll < 0.5) continue
            const wx = x + 10 + c2 * (w / 3)
            const wy = FLOOR_Y - h + 14 + r * 34
            const warm = roll > 0.78
            // A lit window throws a little light onto its own wall.
            if (warm && rate > 0.4) {
              const spill = ctx.createRadialGradient(wx + 4.5, wy + 6, 1, wx + 4.5, wy + 6, 18)
              spill.addColorStop(0, 'rgba(255,206,130,0.32)')
              spill.addColorStop(1, 'rgba(255,206,130,0)')
              ctx.fillStyle = spill
              ctx.fillRect(wx - 14, wy - 12, 37, 36)
            }
            ctx.fillStyle = warm ? '#ffd693' : toCss(blend(c, [120, 152, 190], 0.34))
            ctx.fillRect(wx, wy, 9, 12)
          }
        }
      }
    }

    // The air in front of this rank.
    if (haze < 1) {
      ctx.fillStyle = `rgba(122,104,124,${(1 - haze) * 0.5})`
      ctx.fillRect(0, 0, VIEW.width, FLOOR_Y)
    }
  }

  // The street, too far down to make out, and the haze sitting on it.
  const road = ctx.createLinearGradient(0, FLOOR_Y, 0, VIEW.height)
  road.addColorStop(0, '#2a2433')
  road.addColorStop(1, '#0b0d13')
  ctx.fillStyle = road
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
    // The air the thrusters are heating, before the flames themselves.
    const wash = ctx.createRadialGradient(-22, 10, 4, -22, 10, 46)
    wash.addColorStop(0, 'rgba(158,214,255,0.26)')
    wash.addColorStop(1, 'rgba(120,180,255,0)')
    ctx.fillStyle = wash
    ctx.beginPath()
    ctx.arc(-22, 10, 46, 0, Math.PI * 2)
    ctx.fill()
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
  ctx.strokeStyle = plate(ctx, red, -4, 2, -20, 26)
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, 8)
  ctx.lineTo(-18, 20)
  ctx.moveTo(2, 10)
  ctx.lineTo(-10, 24)
  ctx.stroke()
  ctx.strokeStyle = plate(ctx, gold, -14, 14, -22, 28)
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-14, 17)
  ctx.lineTo(-20, 22)
  ctx.moveTo(-6, 21)
  ctx.lineTo(-12, 26)
  ctx.stroke()

  // torso
  ctx.fillStyle = plate(ctx, red, -14, -20, 12, 14)
  ctx.beginPath()
  ctx.moveTo(-16, -12)
  ctx.quadraticCurveTo(0, -20, 14, -10)
  ctx.quadraticCurveTo(16, 4, 4, 12)
  ctx.quadraticCurveTo(-10, 14, -16, -12)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = plate(ctx, gold, -12, -15, 10, 3)
  ctx.beginPath()
  ctx.ellipse(-2, -6, 13, 9, 0, 0, Math.PI * 2)
  ctx.fill()

  // The arc reactor, and the light it throws on everything near it.
  ctx.globalAlpha = 0.3
  const spill = ctx.createRadialGradient(-2, -6, 2, -2, -6, 21)
  spill.addColorStop(0, 'rgba(168,228,255,0.7)')
  spill.addColorStop(1, 'rgba(120,200,255,0)')
  ctx.fillStyle = spill
  ctx.beginPath()
  ctx.arc(-2, -6, 21, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

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
  ctx.strokeStyle = plate(ctx, red, 6, -10, 26, 5)
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(6, -6)
  ctx.lineTo(24, 0)
  ctx.stroke()
  ctx.fillStyle = plate(ctx, gold, 22, -5, 32, 7)
  ctx.beginPath()
  ctx.arc(27, 1, 5.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#cfeeff'
  ctx.beginPath()
  ctx.arc(27, 1, 2.6, 0, Math.PI * 2)
  ctx.fill()

  // helmet
  ctx.fillStyle = plate(ctx, red, 8, -23, 26, -3)
  ctx.beginPath()
  ctx.moveTo(6, -14)
  ctx.quadraticCurveTo(22, -22, 26, -12)
  ctx.quadraticCurveTo(26, -4, 14, -4)
  ctx.quadraticCurveTo(6, -6, 6, -14)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = plate(ctx, gold, 10, -23, 24, -9)
  ctx.beginPath()
  ctx.moveTo(10, -16)
  ctx.quadraticCurveTo(20, -22, 25, -14)
  ctx.lineTo(22, -10)
  ctx.quadraticCurveTo(16, -14, 10, -12)
  ctx.closePath()
  ctx.fill()
  // The eyes, lit from inside.
  const eye = ctx.createLinearGradient(15, -13, 23, -10)
  eye.addColorStop(0, '#ffffff')
  eye.addColorStop(1, '#8fd8ff')
  ctx.fillStyle = eye
  ctx.fillRect(15, -13, 8, 3)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#9fe0ff'
  ctx.fillRect(14, -14.5, 10, 6)
  ctx.globalAlpha = 1

  // A cold rim down the back, where the sky gets behind the armour.
  ctx.strokeStyle = 'rgba(150,190,240,0.5)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-16, -12)
  ctx.quadraticCurveTo(0, -20, 14, -10)
  ctx.stroke()

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
