/**
 * The pictures, painted rather than loaded.
 *
 * Each scene is drawn once onto an offscreen canvas at board size and
 * kept; a piece is then just a sub-rectangle of that image blitted
 * somewhere else. Nothing to download, and the cut is clean at any size.
 *
 * One rule governs all six: there must be something to look at in every
 * part of the frame. A big flat sky makes half the pieces identical and
 * turns the puzzle into guesswork, so every scene carries birds, cloud,
 * texture or a gradient with features in it right to the corners.
 */

import { BOARD } from './jigsawData'

const cache = new Map<string, HTMLCanvasElement>()

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

export function sceneImage(key: string): HTMLCanvasElement {
  const had = cache.get(key)
  if (had) return had
  const c = document.createElement('canvas')
  c.width = BOARD.w
  c.height = BOARD.h
  const ctx = c.getContext('2d')
  if (ctx) paint(ctx, key)
  cache.set(key, c)
  return c
}

function sky(ctx: CanvasRenderingContext2D, stops: [number, string][], to = BOARD.h) {
  const g = ctx.createLinearGradient(0, 0, 0, to)
  for (const [at, col] of stops) g.addColorStop(at, col)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, BOARD.w, to)
}

/** Birds, cloud and grain, so no corner of a sky is featureless. */
function busySky(ctx: CanvasRenderingContext2D, seed: number, to: number, tint: string) {
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = tint
  for (let i = 0; i < 14; i++) {
    const x = hash(seed + i) * BOARD.w
    const y = hash(seed + i * 3.1) * to
    const w = 30 + hash(seed + i * 7.7) * 90
    ctx.beginPath()
    ctx.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.75
  ctx.strokeStyle = 'rgba(30,34,48,0.5)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < 9; i++) {
    const x = hash(seed + 90 + i) * BOARD.w
    const y = 14 + hash(seed + 120 + i) * (to * 0.7)
    const s = 4 + hash(seed + 150 + i) * 4
    ctx.beginPath()
    ctx.moveTo(x - s, y)
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y)
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y)
    ctx.stroke()
  }
  ctx.restore()
}

function paint(ctx: CanvasRenderingContext2D, key: string) {
  switch (key) {
    case 'harbour': {
      sky(ctx, [
        [0, '#2b3f6b'],
        [0.4, '#7a6a8e'],
        [0.7, '#e09a63'],
        [1, '#f4c98a'],
      ], 240)
      busySky(ctx, 11, 200, '#f6d9b0')
      // Sun and its track on the water.
      ctx.fillStyle = '#fff0c4'
      ctx.beginPath()
      ctx.arc(400, 196, 26, 0, Math.PI * 2)
      ctx.fill()
      // Sea.
      sky(ctx, [
        [0, '#2f5a72'],
        [1, '#12293a'],
      ], BOARD.h)
      ctx.fillStyle = '#1b3b52'
      ctx.fillRect(0, 240, BOARD.w, BOARD.h - 240)
      for (let y = 244; y < BOARD.h; y += 7) {
        const k = (y - 244) / (BOARD.h - 244)
        ctx.strokeStyle = `rgba(255,214,150,${(0.32 * (1 - k)).toFixed(2)})`
        ctx.lineWidth = 1 + k * 2
        ctx.beginPath()
        ctx.moveTo(400 - k * 90 - hash(y) * 26, y)
        ctx.lineTo(400 + k * 90 + hash(y + 5) * 26, y)
        ctx.stroke()
      }
      // Jetty.
      ctx.fillStyle = '#3a2b22'
      ctx.fillRect(0, 300, 210, 12)
      for (let x = 12; x < 210; x += 34) ctx.fillRect(x, 312, 8, 60)
      // Boats, each a different size so their pieces differ.
      for (const [bx, by, bw, hue] of [
        [110, 268, 46, '#c2452f'],
        [250, 286, 60, '#2f6ec2'],
        [420, 262, 38, '#e0a03a'],
        [330, 330, 74, '#8a5ac2'],
      ] as [number, number, number, string][]) {
        ctx.fillStyle = hue
        ctx.beginPath()
        ctx.moveTo(bx - bw / 2, by)
        ctx.lineTo(bx + bw / 2, by)
        ctx.lineTo(bx + bw / 3, by + bw * 0.28)
        ctx.lineTo(bx - bw / 3, by + bw * 0.28)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#efe6d2'
        ctx.beginPath()
        ctx.moveTo(bx, by - bw * 0.8)
        ctx.lineTo(bx + bw * 0.34, by - 4)
        ctx.lineTo(bx - bw * 0.06, by - 4)
        ctx.closePath()
        ctx.fill()
      }
      break
    }

    case 'orchard': {
      sky(ctx, [
        [0, '#5fa8d8'],
        [1, '#cfe6ef'],
      ], 170)
      busySky(ctx, 31, 150, '#ffffff')
      // Hills behind.
      ctx.fillStyle = '#6f9b62'
      ctx.beginPath()
      ctx.moveTo(0, 190)
      for (let x = 0; x <= BOARD.w; x += 28) {
        ctx.lineTo(x, 170 + Math.sin(x * 0.012) * 22 + hash(x) * 10)
      }
      ctx.lineTo(BOARD.w, BOARD.h)
      ctx.lineTo(0, BOARD.h)
      ctx.fill()
      // Striped field, so every row of pieces differs.
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? '#84b06a' : '#76a25e'
        const y = 200 + i * 20
        ctx.fillRect(0, y, BOARD.w, 20)
      }
      // Trees in rows, getting smaller up the slope.
      for (let r = 0; r < 5; r++) {
        const y = 400 - r * 44
        const s = 1 - r * 0.13
        for (let i = 0; i < 6 + r; i++) {
          const x = 30 + i * (BOARD.w / (6 + r)) + hash(r * 9 + i) * 14
          ctx.fillStyle = '#5b4126'
          ctx.fillRect(x - 3 * s, y - 20 * s, 6 * s, 24 * s)
          ctx.fillStyle = r % 2 ? '#3f7a3a' : '#4a8c40'
          ctx.beginPath()
          ctx.arc(x, y - 30 * s, 20 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#c4352f'
          for (let a = 0; a < 3; a++) {
            ctx.beginPath()
            ctx.arc(x + (hash(r + i + a) - 0.5) * 26 * s, y - 30 * s + (hash(r * 2 + a) - 0.5) * 22 * s, 2.6 * s, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      break
    }

    case 'peaks': {
      sky(ctx, [
        [0, '#17305e'],
        [0.5, '#5a7fb0'],
        [1, '#bcd4e0'],
      ], 230)
      busySky(ctx, 51, 190, '#dce9f2')
      // Three ranges, each paler than the one in front.
      const range = (base: number, height: number, col: string, seed: number) => {
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(0, base)
        for (let x = 0; x <= BOARD.w; x += 20) {
          ctx.lineTo(x, base - height * (0.4 + hash(seed + x) * 0.7) - Math.sin(x * 0.02 + seed) * height * 0.3)
        }
        ctx.lineTo(BOARD.w, BOARD.h)
        ctx.lineTo(0, BOARD.h)
        ctx.fill()
      }
      range(250, 90, '#7d93ad', 3)
      range(280, 110, '#5b6f8c', 9)
      range(310, 130, '#3c4b63', 17)
      // Snow caps.
      ctx.fillStyle = '#eef5fb'
      for (let i = 0; i < 9; i++) {
        const x = 20 + i * 62
        const y = 310 - 130 * (0.4 + hash(17 + x) * 0.7) - Math.sin(x * 0.02 + 17) * 39
        ctx.beginPath()
        ctx.moveTo(x - 16, y + 24)
        ctx.lineTo(x, y)
        ctx.lineTo(x + 16, y + 24)
        ctx.closePath()
        ctx.fill()
      }
      // The lake, with the ranges reflected.
      ctx.fillStyle = '#20364d'
      ctx.fillRect(0, 330, BOARD.w, BOARD.h - 330)
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.scale(1, -1)
      ctx.translate(0, -660)
      range(250, 110, '#8fa6c0', 17)
      ctx.restore()
      for (let y = 336; y < BOARD.h; y += 9) {
        ctx.strokeStyle = `rgba(200,224,244,${(0.1 + hash(y) * 0.1).toFixed(2)})`
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(hash(y) * 60, y)
        ctx.lineTo(BOARD.w - hash(y + 3) * 60, y)
        ctx.stroke()
      }
      break
    }

    case 'market': {
      ctx.fillStyle = '#1b1226'
      ctx.fillRect(0, 0, BOARD.w, BOARD.h)
      // Lanterns strung across, all different.
      for (let row = 0; row < 3; row++) {
        const y = 40 + row * 34
        ctx.strokeStyle = 'rgba(220,200,160,0.4)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(0, y - 8)
        ctx.quadraticCurveTo(BOARD.w / 2, y + 12, BOARD.w, y - 8)
        ctx.stroke()
        for (let i = 0; i < 11; i++) {
          const x = 24 + i * (BOARD.w / 11)
          const t = x / BOARD.w
          const ly = y - 8 + Math.sin(t * Math.PI) * 20
          const hue = [18, 42, 320, 190, 96][(row * 11 + i) % 5]
          const glow = ctx.createRadialGradient(x, ly + 10, 1, x, ly + 10, 26)
          glow.addColorStop(0, `hsla(${hue},90%,70%,0.9)`)
          glow.addColorStop(1, `hsla(${hue},90%,60%,0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(x, ly + 10, 26, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `hsl(${hue},85%,62%)`
          ctx.beginPath()
          ctx.ellipse(x, ly + 10, 7, 9, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // Awnings and stalls.
      for (let i = 0; i < 5; i++) {
        const x = i * 116
        const hue = [8, 200, 46, 300, 150][i]
        ctx.fillStyle = `hsl(${hue},58%,44%)`
        ctx.beginPath()
        ctx.moveTo(x, 200)
        ctx.lineTo(x + 112, 200)
        ctx.lineTo(x + 100, 176)
        ctx.lineTo(x + 12, 176)
        ctx.closePath()
        ctx.fill()
        for (let s = 0; s < 6; s++) {
          ctx.fillStyle = s % 2 ? `hsl(${hue},58%,52%)` : `hsl(${hue},40%,86%)`
          ctx.fillRect(x + 6 + s * 17, 200, 17, 16)
        }
        ctx.fillStyle = '#2a2033'
        ctx.fillRect(x + 8, 216, 96, 60)
        // Produce on the counter.
        for (let p = 0; p < 7; p++) {
          ctx.fillStyle = `hsl(${(hue + p * 40) % 360},70%,${54 + (p % 3) * 8}%)`
          ctx.beginPath()
          ctx.arc(x + 18 + p * 13, 224 + hash(i * 7 + p) * 6, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // The street, wet and reflecting.
      sky(ctx, [
        [0, '#241a2e'],
        [1, '#100a16'],
      ], BOARD.h)
      ctx.fillStyle = '#241a2e'
      ctx.fillRect(0, 276, BOARD.w, BOARD.h - 276)
      for (let i = 0; i < 40; i++) {
        const x = hash(i * 3) * BOARD.w
        const y = 282 + hash(i * 5) * (BOARD.h - 288)
        ctx.fillStyle = `hsla(${[18, 42, 320, 190][i % 4]},80%,64%,0.3)`
        ctx.fillRect(x, y, 3, 16)
      }
      break
    }

    case 'reef': {
      sky(ctx, [
        [0, '#2fa5c8'],
        [0.5, '#1c7ba0'],
        [1, '#0c4763'],
      ], BOARD.h)
      // Shafts of light from the surface.
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 7; i++) {
        const x = hash(i * 11) * BOARD.w
        const g = ctx.createLinearGradient(x, 0, x + 40, BOARD.h)
        g.addColorStop(0, 'rgba(190,240,255,0.22)')
        g.addColorStop(1, 'rgba(190,240,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x - 14, 0)
        ctx.lineTo(x + 14, 0)
        ctx.lineTo(x + 60, BOARD.h)
        ctx.lineTo(x + 18, BOARD.h)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      // Coral along the bottom.
      for (let i = 0; i < 26; i++) {
        const x = hash(i * 3.3) * BOARD.w
        const h = 30 + hash(i * 5.1) * 90
        const hue = [16, 340, 42, 280, 170][i % 5]
        ctx.fillStyle = `hsl(${hue},62%,${44 + (i % 3) * 8}%)`
        ctx.beginPath()
        ctx.moveTo(x, BOARD.h)
        for (let k = 0; k < 4; k++) {
          ctx.lineTo(x - 12 + k * 8 + Math.sin(k + i) * 6, BOARD.h - h * (k / 4))
        }
        ctx.lineTo(x + 16, BOARD.h)
        ctx.fill()
      }
      // Fish, scattered so every region has one.
      for (let i = 0; i < 22; i++) {
        const x = 20 + hash(i * 7.7) * (BOARD.w - 40)
        const y = 24 + hash(i * 9.1) * (BOARD.h - 90)
        const s = 7 + hash(i * 2.2) * 9
        const hue = [42, 18, 320, 190, 60][i % 5]
        ctx.fillStyle = `hsl(${hue},85%,62%)`
        ctx.beginPath()
        ctx.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(x - s, y)
        ctx.lineTo(x - s * 1.8, y - s * 0.5)
        ctx.lineTo(x - s * 1.8, y + s * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#12202a'
        ctx.beginPath()
        ctx.arc(x + s * 0.45, y - s * 0.12, s * 0.13, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    default: {
      // balloons
      sky(ctx, [
        [0, '#3f7fc4'],
        [0.6, '#9fc8e4'],
        [1, '#dfeaf0'],
      ], 260)
      busySky(ctx, 71, 240, '#ffffff')
      // Patchwork fields below.
      const cols = ['#8fb066', '#a8b972', '#6f9b56', '#c2b36a', '#b8a35e', '#7fa85f']
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 7; c++) {
          ctx.fillStyle = cols[(r * 7 + c) % cols.length]
          const x = c * (BOARD.w / 7)
          const y = 260 + r * ((BOARD.h - 260) / 5)
          ctx.fillRect(x, y, BOARD.w / 7 + 1, (BOARD.h - 260) / 5 + 1)
          ctx.strokeStyle = 'rgba(60,70,40,0.25)'
          ctx.lineWidth = 1.2
          ctx.strokeRect(x, y, BOARD.w / 7, (BOARD.h - 260) / 5)
        }
      }
      // Seven balloons, none alike.
      for (let i = 0; i < 7; i++) {
        const x = 46 + i * 76 + (hash(i) - 0.5) * 20
        const y = 60 + hash(i * 3) * 150
        const s = 20 + hash(i * 5) * 16
        const hue = [8, 42, 96, 190, 265, 320, 160][i]
        for (let p = 0; p < 4; p++) {
          ctx.fillStyle = `hsl(${hue},${70 - p * 8}%,${58 + (p % 2) * 14}%)`
          ctx.beginPath()
          ctx.ellipse(x - s + p * (s / 2), y, s / 4, s, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = 'rgba(40,40,40,0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x - s * 0.4, y + s * 0.9)
        ctx.lineTo(x, y + s * 1.5)
        ctx.moveTo(x + s * 0.4, y + s * 0.9)
        ctx.lineTo(x, y + s * 1.5)
        ctx.stroke()
        ctx.fillStyle = '#6b4a2a'
        ctx.fillRect(x - s * 0.22, y + s * 1.5, s * 0.44, s * 0.3)
      }
      break
    }
  }
}
