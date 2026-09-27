/**
 * Painting a recipe.
 *
 * Each scene is drawn once onto an offscreen canvas at board size and
 * kept; a piece is then just a sub-rectangle of that image blitted
 * somewhere else. Nothing to download, and the cut is clean at any size.
 *
 * Everything here is deterministic - the same recipe always paints the
 * same picture - because a jigsaw you come back to should be the one you
 * left, and because a piece has to match the board it was cut from.
 */

import { BOARD } from './jigsawData'
import { RECIPES, type Part, type Recipe } from './jigsawScenes'

const cache = new Map<string, HTMLCanvasElement>()

/** Deterministic noise, so a scene is identical every time it is drawn. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function sceneImage(key: string): HTMLCanvasElement {
  const had = cache.get(key)
  if (had) return had
  const c = document.createElement('canvas')
  c.width = BOARD.w
  c.height = BOARD.h
  const ctx = c.getContext('2d')
  const recipe = RECIPES.find((r) => r.key === key) ?? RECIPES[0]
  if (ctx) paint(ctx, recipe)
  cache.set(key, c)
  return c
}

function paint(ctx: CanvasRenderingContext2D, r: Recipe) {
  const to = r.skyTo ?? BOARD.h
  const g = ctx.createLinearGradient(0, 0, 0, to)
  r.sky.forEach((col, i) => g.addColorStop(r.sky.length === 1 ? i : i / (r.sky.length - 1), col))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, BOARD.w, BOARD.h)

  // Seed from the key, so two scenes using the same part never come out
  // identical.
  let seed = 0
  for (let i = 0; i < r.key.length; i++) seed += r.key.charCodeAt(i) * (i + 3)

  r.parts.forEach((part, i) => draw(ctx, part, seed + i * 977, r))
}

function draw(ctx: CanvasRenderingContext2D, p: Part, s: number, r: Recipe) {
  const W = BOARD.w
  const H = BOARD.h
  switch (p.kind) {
    case 'clouds': {
      const n = p.n ?? 10
      ctx.save()
      ctx.fillStyle = p.tint ?? '#ffffff'
      for (let i = 0; i < n; i++) {
        const x = hash(s + i) * W
        const y = 12 + hash(s + i * 3.1) * ((r.skyTo ?? H) * 0.7)
        const w = 30 + hash(s + i * 7.7) * 80
        ctx.globalAlpha = 0.2 + hash(s + i * 5.5) * 0.4
        for (const [ox, oy, k] of [[-w * 0.5, 4, 0.55], [0, 0, 0.8], [w * 0.5, 5, 0.5]] as const) {
          ctx.beginPath()
          ctx.ellipse(x + ox, y + oy, w * k, w * k * 0.4, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
      break
    }
    case 'birds': {
      const n = p.n ?? 8
      ctx.save()
      ctx.strokeStyle = 'rgba(28,32,44,0.7)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < n; i++) {
        const x = hash(s + i * 2.3) * W
        const y = 14 + hash(s + i * 4.1) * ((r.skyTo ?? H) * 0.75)
        const k = 3.5 + hash(s + i * 6.9) * 4
        ctx.beginPath()
        ctx.moveTo(x - k, y)
        ctx.quadraticCurveTo(x - k * 0.4, y - k * 0.75, x, y)
        ctx.quadraticCurveTo(x + k * 0.4, y - k * 0.75, x + k, y)
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'stars': {
      const n = p.n ?? 80
      ctx.save()
      for (let i = 0; i < n; i++) {
        const x = hash(s + i * 1.7) * W
        const y = hash(s + i * 3.3) * (r.skyTo ?? H)
        const b = hash(s + i * 9.1)
        ctx.globalAlpha = 0.3 + b * 0.7
        ctx.fillStyle = b > 0.9 ? '#ffe8c0' : '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, 0.6 + b * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      break
    }
    case 'sun': {
      const col = p.colour ?? '#fff0c4'
      const rr = p.r ?? 26
      const glow = ctx.createRadialGradient(p.x, p.y, rr * 0.4, p.x, p.y, rr * 5)
      glow.addColorStop(0, 'rgba(255,230,170,0.5)')
      glow.addColorStop(1, 'rgba(255,220,150,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'moon': {
      const rr = p.r ?? 20
      const glow = ctx.createRadialGradient(p.x, p.y, rr * 0.5, p.x, p.y, rr * 4)
      glow.addColorStop(0, 'rgba(210,228,255,0.35)')
      glow.addColorStop(1, 'rgba(200,220,255,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#eef4ff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(180,196,220,0.5)'
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc(p.x + (hash(s + i) - 0.5) * rr, p.y + (hash(s + i * 3) - 0.5) * rr, rr * (0.1 + hash(s + i * 7) * 0.16), 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'aurora': {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 5; i++) {
        const x = hash(s + i * 11) * W
        const g2 = ctx.createLinearGradient(x, 0, x + 60, 300)
        g2.addColorStop(0, `hsla(${140 + i * 18},80%,64%,0.32)`)
        g2.addColorStop(1, 'hsla(180,80%,60%,0)')
        ctx.fillStyle = g2
        ctx.beginPath()
        ctx.moveTo(x - 40, 0)
        ctx.quadraticCurveTo(x + 40, 120, x - 10, 300)
        ctx.lineTo(x + 60, 300)
        ctx.quadraticCurveTo(x + 110, 120, x + 50, 0)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      break
    }
    case 'rain': {
      ctx.save()
      ctx.strokeStyle = 'rgba(200,220,240,0.35)'
      ctx.lineWidth = 1
      for (let i = 0; i < 220; i++) {
        const x = hash(s + i) * (W + 60) - 30
        const y = hash(s + i * 3.7) * H
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 7, y + 16)
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'snowfall': {
      ctx.save()
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 200; i++) {
        const x = hash(s + i * 1.3) * W
        const y = hash(s + i * 5.1) * H
        ctx.globalAlpha = 0.35 + hash(s + i * 2.7) * 0.5
        ctx.beginPath()
        ctx.arc(x, y, 0.8 + hash(s + i * 8.3) * 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      break
    }
    case 'hills': {
      ctx.fillStyle = p.colour
      ctx.beginPath()
      ctx.moveTo(0, p.at)
      for (let x = 0; x <= W; x += 22) {
        ctx.lineTo(x, p.at - p.height * (0.35 + hash(s + x * 0.7) * 0.5) - Math.sin(x * 0.011 + s) * p.height * 0.3)
      }
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.fill()
      break
    }
    case 'mountains': {
      ctx.fillStyle = p.colour
      const top: number[] = []
      ctx.beginPath()
      ctx.moveTo(0, p.at)
      for (let x = 0; x <= W; x += 18) {
        const y = p.at - p.height * (0.4 + hash(s + x) * 0.7) - Math.sin(x * 0.02 + s) * p.height * 0.3
        top.push(y)
        ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.fill()
      if (p.snow) {
        ctx.fillStyle = '#eef5fb'
        for (let i = 1; i < top.length - 1; i++) {
          if (top[i] < top[i - 1] && top[i] < top[i + 1]) {
            const x = i * 18
            ctx.beginPath()
            ctx.moveTo(x - 15, top[i] + 24)
            ctx.lineTo(x, top[i])
            ctx.lineTo(x + 15, top[i] + 24)
            ctx.closePath()
            ctx.fill()
          }
        }
      }
      break
    }
    case 'dunes': {
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k % 2 ? p.colour : shade(p.colour, 0.88)
        ctx.beginPath()
        ctx.moveTo(0, p.at + k * 24)
        for (let x = 0; x <= W; x += 26) {
          ctx.lineTo(x, p.at + k * 24 - Math.sin(x * 0.014 + k + s) * 14 - hash(s + x + k) * 8)
        }
        ctx.lineTo(W, H)
        ctx.lineTo(0, H)
        ctx.fill()
      }
      break
    }
    case 'water': {
      ctx.fillStyle = p.colour
      ctx.fillRect(0, p.at, W, H - p.at)
      const glint = p.glint ?? '#ffffff'
      for (let y = p.at + 4; y < H; y += 7) {
        const k = (y - p.at) / (H - p.at)
        ctx.strokeStyle = fade(glint, 0.3 * (1 - k * 0.7))
        ctx.lineWidth = 1 + k * 2
        ctx.beginPath()
        ctx.moveTo(W * 0.5 - k * 140 - hash(s + y) * 40, y)
        ctx.lineTo(W * 0.5 + k * 140 + hash(s + y * 3) * 40, y)
        ctx.stroke()
      }
      break
    }
    case 'fields': {
      const cols = p.cols ?? ['#8fb066', '#a8b972', '#6f9b56', '#c2b36a', '#b8a35e', '#7fa85f']
      const rows = 5
      const across = 7
      for (let rw = 0; rw < rows; rw++) {
        for (let c = 0; c < across; c++) {
          ctx.fillStyle = cols[Math.floor(hash(s + rw * 13 + c * 7) * cols.length)]
          const x = c * (W / across)
          const y = p.at + rw * ((H - p.at) / rows)
          ctx.fillRect(x, y, W / across + 1, (H - p.at) / rows + 1)
          ctx.strokeStyle = 'rgba(50,58,38,0.25)'
          ctx.lineWidth = 1.2
          ctx.strokeRect(x, y, W / across, (H - p.at) / rows)
        }
      }
      break
    }
    case 'rows': {
      const rows = p.rows ?? 5
      for (let rw = 0; rw < rows; rw++) {
        const y = p.at - rw * ((p.at - 180) / rows)
        const k = 1 - rw * 0.12
        const n = 6 + rw
        for (let i = 0; i < n; i++) {
          const x = 24 + i * (W / n) + hash(s + rw * 9 + i) * 14
          ctx.fillStyle = '#5b4126'
          ctx.fillRect(x - 3 * k, y - 18 * k, 6 * k, 22 * k)
          ctx.fillStyle = rw % 2 ? shade(p.leaf, 0.86) : p.leaf
          ctx.beginPath()
          ctx.arc(x, y - 28 * k, 19 * k, 0, Math.PI * 2)
          ctx.fill()
          if (p.fruit) {
            ctx.fillStyle = p.fruit
            for (let a = 0; a < 3; a++) {
              ctx.beginPath()
              ctx.arc(x + (hash(s + rw + i + a) - 0.5) * 24 * k, y - 28 * k + (hash(s + rw * 2 + a) - 0.5) * 20 * k, 2.4 * k, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }
      }
      break
    }
    case 'meadow': {
      ctx.fillStyle = p.grass
      ctx.fillRect(0, p.at, W, H - p.at)
      for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = shade(p.grass, 0.8 + hash(s + i) * 0.3)
        ctx.lineWidth = 1.4
        ctx.beginPath()
        const x = hash(s + i * 3) * W
        ctx.moveTo(x, H)
        ctx.lineTo(x + 10, p.at + hash(s + i * 5) * 20)
        ctx.stroke()
      }
      for (let i = 0; i < 180; i++) {
        const x = hash(s + i * 2.1) * W
        const y = p.at + hash(s + i * 4.7) * (H - p.at)
        const size = 2 + ((y - p.at) / (H - p.at)) * 4
        ctx.fillStyle = p.petals[Math.floor(hash(s + i * 6.3) * p.petals.length)]
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'forest': {
      const n = p.n ?? 30
      for (let i = 0; i < n; i++) {
        const x = hash(s + i * 3.1) * W
        const depth = hash(s + i * 5.9)
        const y = p.at - depth * 90
        const k = 0.5 + depth * 0.7
        ctx.fillStyle = p.trunk
        ctx.fillRect(x - 3 * k, y - 26 * k, 6 * k, 60 * k)
        ctx.fillStyle = shade(p.leaf, 0.8 + depth * 0.4)
        for (let t = 0; t < 3; t++) {
          ctx.beginPath()
          ctx.moveTo(x - 20 * k + t * 2, y - 10 * k + t * 14 * k)
          ctx.lineTo(x, y - 52 * k + t * 14 * k)
          ctx.lineTo(x + 20 * k - t * 2, y - 10 * k + t * 14 * k)
          ctx.closePath()
          ctx.fill()
        }
      }
      break
    }
    case 'city': {
      const tall = p.tall ?? 110
      ctx.fillStyle = p.colour
      let x = 0
      while (x < W) {
        const w = 26 + hash(s + x) * 46
        const h = tall * (0.35 + hash(s + x * 1.7) * 0.9)
        ctx.fillStyle = shade(p.colour, 0.82 + hash(s + x * 3) * 0.4)
        ctx.fillRect(x, p.at - h, w, h + (H - p.at))
        if (p.lit) {
          for (let ry = p.at - h + 10; ry < p.at - 6; ry += 14) {
            for (let rx = x + 5; rx < x + w - 7; rx += 12) {
              if (hash(s + rx * 3 + ry) < 0.45) continue
              ctx.fillStyle = p.lit
              ctx.globalAlpha = 0.5 + hash(s + rx + ry * 2) * 0.5
              ctx.fillRect(rx, ry, 5, 7)
              ctx.globalAlpha = 1
            }
          }
        }
        x += w + 3
      }
      break
    }
    case 'village': {
      let x = -10
      while (x < W) {
        const w = 44 + hash(s + x) * 40
        const h = 40 + hash(s + x * 2.3) * 34
        ctx.fillStyle = shade(p.wall, 0.86 + hash(s + x * 5) * 0.3)
        ctx.fillRect(x, p.at - h, w, h + (H - p.at))
        ctx.fillStyle = shade(p.roof, 0.86 + hash(s + x * 7) * 0.3)
        ctx.beginPath()
        ctx.moveTo(x - 5, p.at - h)
        ctx.lineTo(x + w / 2, p.at - h - 22)
        ctx.lineTo(x + w + 5, p.at - h)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255,214,130,0.85)'
        for (let i = 0; i < 2; i++) {
          ctx.fillRect(x + 8 + i * 22, p.at - h + 14, 11, 13)
        }
        x += w + 6
      }
      break
    }
    case 'lighthouse': {
      const base = p.at
      ctx.fillStyle = '#e8e4dc'
      ctx.beginPath()
      ctx.moveTo(p.x - 16, base)
      ctx.lineTo(p.x - 10, base - 110)
      ctx.lineTo(p.x + 10, base - 110)
      ctx.lineTo(p.x + 16, base)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#c2452f'
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(p.x - 15 + i * 0.6, base - 30 - i * 34, 30 - i * 1.2, 12)
      }
      ctx.fillStyle = '#2a2f38'
      ctx.fillRect(p.x - 13, base - 130, 26, 22)
      ctx.fillStyle = '#ffe8a8'
      ctx.beginPath()
      ctx.arc(p.x, base - 119, 7, 0, Math.PI * 2)
      ctx.fill()
      const beam = ctx.createLinearGradient(p.x, base - 119, W, base - 160)
      beam.addColorStop(0, 'rgba(255,232,168,0.45)')
      beam.addColorStop(1, 'rgba(255,232,168,0)')
      ctx.fillStyle = beam
      ctx.beginPath()
      ctx.moveTo(p.x, base - 119)
      ctx.lineTo(W, base - 190)
      ctx.lineTo(W, base - 60)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'bridge': {
      ctx.fillStyle = p.colour
      ctx.fillRect(0, p.at, W, 12)
      for (let x = 10; x < W; x += 46) ctx.fillRect(x, p.at + 12, 8, H - p.at - 12)
      ctx.strokeStyle = shade(p.colour, 1.3)
      ctx.lineWidth = 2
      for (let x = 0; x < W; x += 46) {
        ctx.beginPath()
        ctx.moveTo(x, p.at)
        ctx.lineTo(x + 23, p.at - 24)
        ctx.lineTo(x + 46, p.at)
        ctx.stroke()
      }
      break
    }
    case 'windmill': {
      ctx.fillStyle = '#e4dcc8'
      ctx.beginPath()
      ctx.moveTo(p.x - 24, p.at)
      ctx.lineTo(p.x - 14, p.at - 86)
      ctx.lineTo(p.x + 14, p.at - 86)
      ctx.lineTo(p.x + 24, p.at)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#6a4a3a'
      ctx.beginPath()
      ctx.arc(p.x, p.at - 92, 16, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = '#8a6a4a'
      ctx.lineWidth = 5
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4
        ctx.beginPath()
        ctx.moveTo(p.x, p.at - 96)
        ctx.lineTo(p.x + Math.cos(a) * 58, p.at - 96 + Math.sin(a) * 58)
        ctx.stroke()
      }
      break
    }
    case 'boats': {
      const n = p.n ?? 4
      for (let i = 0; i < n; i++) {
        const bx = 50 + hash(s + i * 3.3) * (W - 100)
        const by = p.at + hash(s + i * 5.1) * Math.max(10, H - p.at - 40)
        const bw = 30 + hash(s + i * 7.7) * 46
        ctx.fillStyle = ['#c2452f', '#2f6ec2', '#e0a03a', '#8a5ac2', '#3f8a4a'][i % 5]
        ctx.beginPath()
        ctx.moveTo(bx - bw / 2, by)
        ctx.lineTo(bx + bw / 2, by)
        ctx.lineTo(bx + bw / 3, by + bw * 0.26)
        ctx.lineTo(bx - bw / 3, by + bw * 0.26)
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
    case 'balloons': {
      const n = p.n ?? 7
      for (let i = 0; i < n; i++) {
        const x = 40 + hash(s + i * 2.7) * (W - 80)
        const y = 50 + hash(s + i * 4.3) * 180
        const size = 18 + hash(s + i * 6.1) * 16
        const hue = [8, 42, 96, 190, 265, 320, 160, 30, 210, 280, 60, 340][i % 12]
        for (let q = 0; q < 4; q++) {
          ctx.fillStyle = `hsl(${hue},${70 - q * 8}%,${58 + (q % 2) * 14}%)`
          ctx.beginPath()
          ctx.ellipse(x - size + q * (size / 2), y, size / 4, size, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = 'rgba(40,40,40,0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x - size * 0.4, y + size * 0.9)
        ctx.lineTo(x, y + size * 1.5)
        ctx.moveTo(x + size * 0.4, y + size * 0.9)
        ctx.lineTo(x, y + size * 1.5)
        ctx.stroke()
        ctx.fillStyle = '#6b4a2a'
        ctx.fillRect(x - size * 0.22, y + size * 1.5, size * 0.44, size * 0.3)
      }
      break
    }
    case 'kites': {
      const n = p.n ?? 12
      for (let i = 0; i < n; i++) {
        const x = hash(s + i * 3.9) * W
        const y = 20 + hash(s + i * 5.7) * (H * 0.55)
        const k = 9 + hash(s + i * 7.1) * 10
        const hue = [8, 42, 96, 190, 265, 320][i % 6]
        ctx.fillStyle = `hsl(${hue},76%,58%)`
        ctx.beginPath()
        ctx.moveTo(x, y - k)
        ctx.lineTo(x + k * 0.7, y)
        ctx.lineTo(x, y + k)
        ctx.lineTo(x - k * 0.7, y)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y + k)
        ctx.quadraticCurveTo(x + 8, y + k + 14, x - 4, y + k + 26)
        ctx.stroke()
      }
      break
    }
    case 'coral': {
      const n = p.n ?? 24
      for (let i = 0; i < n; i++) {
        const x = hash(s + i * 3.3) * W
        const h = 26 + hash(s + i * 5.1) * 90
        const hue = [16, 340, 42, 280, 170][i % 5]
        ctx.fillStyle = `hsl(${hue},62%,${42 + (i % 3) * 9}%)`
        ctx.beginPath()
        ctx.moveTo(x, H)
        for (let k = 0; k < 4; k++) ctx.lineTo(x - 12 + k * 8 + Math.sin(k + i) * 6, H - h * (k / 4))
        ctx.lineTo(x + 16, H)
        ctx.fill()
      }
      break
    }
    case 'fish': {
      const n = p.n ?? 20
      for (let i = 0; i < n; i++) {
        const x = 20 + hash(s + i * 7.7) * (W - 40)
        const y = 20 + hash(s + i * 9.1) * (H - 70)
        const size = 6 + hash(s + i * 2.2) * 9
        const hue = [42, 18, 320, 190, 60, 140][i % 6]
        ctx.fillStyle = `hsl(${hue},85%,62%)`
        ctx.beginPath()
        ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(x - size, y)
        ctx.lineTo(x - size * 1.8, y - size * 0.5)
        ctx.lineTo(x - size * 1.8, y + size * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#12202a'
        ctx.beginPath()
        ctx.arc(x + size * 0.45, y - size * 0.12, size * 0.13, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'shafts': {
      const n = p.n ?? 6
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < n; i++) {
        const x = hash(s + i * 11) * W
        const g2 = ctx.createLinearGradient(x, 0, x + 40, H)
        g2.addColorStop(0, 'rgba(190,240,255,0.2)')
        g2.addColorStop(1, 'rgba(190,240,255,0)')
        ctx.fillStyle = g2
        ctx.beginPath()
        ctx.moveTo(x - 14, 0)
        ctx.lineTo(x + 14, 0)
        ctx.lineTo(x + 60, H)
        ctx.lineTo(x + 18, H)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      break
    }
    case 'stripes': {
      const n = p.cols.length
      if (p.diagonal) {
        ctx.save()
        ctx.translate(W / 2, H / 2)
        ctx.rotate(-0.6)
        ctx.translate(-W, -H)
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = p.cols[i % n]
          ctx.globalAlpha = 0.55
          ctx.fillRect(i * 44, 0, 44, H * 3)
        }
        ctx.restore()
      } else {
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = p.cols[i % n]
          ctx.fillRect(0, (i * H) / 26, W, H / 26 + 1)
        }
      }
      break
    }
    case 'tiles': {
      const across = 14
      const down = 11
      for (let rw = 0; rw < down; rw++) {
        for (let c = 0; c < across; c++) {
          ctx.fillStyle = p.cols[Math.floor(hash(s + rw * 17 + c * 5) * p.cols.length)]
          const x = c * (W / across)
          const y = rw * (H / down)
          ctx.fillRect(x + 1.5, y + 1.5, W / across - 3, H / down - 3)
        }
      }
      break
    }
    case 'rings': {
      const n = p.cols.length
      const cx = W * (0.3 + hash(s) * 0.4)
      const cy = H * (0.3 + hash(s + 3) * 0.4)
      ctx.lineWidth = 9
      for (let i = 22; i >= 0; i--) {
        ctx.strokeStyle = p.cols[i % n]
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.arc(cx, cy, 14 + i * 22, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      break
    }
    case 'petalstorm': {
      for (let i = 0; i < 260; i++) {
        const x = hash(s + i * 1.9) * W
        const y = hash(s + i * 3.7) * H
        const size = 2 + hash(s + i * 5.3) * 5
        ctx.fillStyle = p.cols[Math.floor(hash(s + i * 7.1) * p.cols.length)]
        ctx.globalAlpha = 0.6 + hash(s + i * 9.3) * 0.4
        ctx.beginPath()
        ctx.ellipse(x, y, size, size * 0.6, hash(s + i) * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }
  }
}

/** Lighten or darken a hex colour. */
function shade(hex: string, mul: number): string {
  const v = [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * mul)))
  return `rgb(${v[0]},${v[1]},${v[2]})`
}

function fade(hex: string, alpha: number): string {
  if (!hex.startsWith('#')) return hex
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${v[0]},${v[1]},${v[2]},${alpha.toFixed(3)})`
}
