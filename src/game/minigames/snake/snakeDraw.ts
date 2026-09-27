/**
 * Drawing the arena.
 *
 * A snake is a chain of beads down its trail, drawn tail first so the
 * head sits on top of its own neck. Each bead is filled from a gradient
 * running across the body rather than a flat circle, which is what stops
 * a snake reading as a string of dots.
 */

import {
  FOOD_SCALE,
  HEAD_R,
  elementAt,
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

/** The marking on the floor, which is different on every kind of map. */
function drawGround(ctx: CanvasRenderingContext2D, cam: Camera, map: MapSpec) {
  if (map.texture === 'bare') return
  const step = map.texture === 'dots' ? 74 : map.texture === 'hex' ? 96 : map.texture === 'meadow' ? 56 : 100
  const x0 = Math.floor((cam.x - VIEW.width / 2 / cam.zoom) / step) * step
  const x1 = cam.x + VIEW.width / 2 / cam.zoom
  const y0 = Math.floor((cam.y - VIEW.height / 2 / cam.zoom) / step) * step
  const y1 = cam.y + VIEW.height / 2 / cam.zoom

  ctx.strokeStyle = map.grid
  ctx.fillStyle = map.grid
  ctx.lineWidth = 1

  switch (map.texture) {
    case 'grid': {
      ctx.beginPath()
      for (let x = x0; x < x1; x += step) {
        const a = toScreen(cam, x, y0 - step)
        const b = toScreen(cam, x, y1 + step)
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
      }
      for (let y = y0; y < y1; y += step) {
        const a = toScreen(cam, x0 - step, y)
        const b = toScreen(cam, x1 + step, y)
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
      }
      ctx.stroke()
      break
    }
    case 'dots': {
      for (let x = x0; x < x1; x += step) {
        for (let y = y0; y < y1; y += step) {
          const p = toScreen(cam, x, y)
          ctx.beginPath()
          ctx.arc(p.sx, p.sy, Math.max(1, 3 * cam.zoom), 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'hex': {
      // Staggered rows of short strokes: a honeycomb without the cost of
      // actually tiling one.
      ctx.beginPath()
      let row = 0
      for (let y = y0; y < y1; y += step * 0.75) {
        const off = row % 2 ? step / 2 : 0
        for (let x = x0; x < x1; x += step) {
          const c = toScreen(cam, x + off, y)
          const r = step * 0.3 * cam.zoom
          for (let k = 0; k < 6; k++) {
            const a1 = (k / 6) * Math.PI * 2
            const a2 = ((k + 1) / 6) * Math.PI * 2
            ctx.moveTo(c.sx + Math.cos(a1) * r, c.sy + Math.sin(a1) * r)
            ctx.lineTo(c.sx + Math.cos(a2) * r, c.sy + Math.sin(a2) * r)
          }
        }
        row++
      }
      ctx.stroke()
      break
    }
    case 'waves': {
      ctx.beginPath()
      for (let y = y0; y < y1; y += step * 0.5) {
        const left = toScreen(cam, x0 - step, y)
        ctx.moveTo(left.sx, left.sy)
        for (let x = x0; x < x1 + step; x += step * 0.25) {
          const p = toScreen(cam, x, y + Math.sin(x * 0.02 + y * 0.01) * step * 0.12)
          ctx.lineTo(p.sx, p.sy)
        }
      }
      ctx.stroke()
      break
    }
    case 'stripes': {
      ctx.beginPath()
      for (let x = x0; x < x1; x += step * 0.6) {
        const a = toScreen(cam, x, y0 - step)
        const b = toScreen(cam, x + step * 0.5, y1 + step)
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
      }
      ctx.stroke()
      break
    }
    case 'scratch': {
      // Short marks at fixed positions, so the ground looks worked over
      // rather than ruled.
      ctx.beginPath()
      for (let x = x0; x < x1; x += step * 0.7) {
        for (let y = y0; y < y1; y += step * 0.7) {
          const n = hash(x * 0.013 + y * 0.017)
          const a = toScreen(cam, x + n * 30, y + n * 20)
          const b = toScreen(cam, x + n * 30 + 24 + n * 20, y + n * 20 + (n - 0.5) * 30)
          ctx.moveTo(a.sx, a.sy)
          ctx.lineTo(b.sx, b.sy)
        }
      }
      ctx.stroke()
      break
    }
    case 'meadow': {
      // Grass wants to be seen. At the shared grid alpha it was a green
      // field with nothing on it, so speed across it was unreadable.
      ctx.strokeStyle = 'rgba(206,248,180,0.16)'
      // Tufts of grass rather than a ruled floor. Two blades leaning
      // apart from a common root, at fixed positions so the field does
      // not crawl about underneath you.
      ctx.beginPath()
      for (let x = x0; x < x1; x += step) {
        for (let y = y0; y < y1; y += step) {
          const n = hash(x * 0.011 + y * 0.019)
          const m = hash(x * 0.023 + y * 0.007)
          const root = toScreen(cam, x + n * step, y + m * step)
          const h = (9 + n * 11) * cam.zoom
          ctx.moveTo(root.sx, root.sy)
          ctx.lineTo(root.sx - h * 0.35, root.sy - h)
          ctx.moveTo(root.sx, root.sy)
          ctx.lineTo(root.sx + h * 0.3, root.sy - h * 0.86)
        }
      }
      ctx.stroke()
      break
    }
  }
}

/** Deterministic noise, so a floor marking never crawls about. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* ------------------------------------------------------------------ */
/* Country                                                             */
/* ------------------------------------------------------------------ */

/**
 * The lakes, and the sand around them.
 *
 * Laid out once from the map's own dimensions rather than stored, so it
 * is the same country every time you play it and costs nothing to keep.
 * Each lake gets a beach because a body of water with a hard edge
 * against grass reads as a hole in the ground rather than as a lake.
 */
interface Country {
  lakes: { x: number; y: number; r: number; s: number }[]
  trees: { x: number; y: number; r: number; k: number }[]
}

/**
 * Worked out once per map and kept.
 *
 * The Commons is five thousand two hundred by four thousand, which comes
 * to about four hundred and fifty trees. Laying those out inside the
 * draw call meant hashing and allocating the whole country sixty times a
 * second to paint the dozen of it that were on screen.
 */
const COUNTRY = new Map<string, Country>()

function countryOf(map: MapSpec): Country {
  const had = COUNTRY.get(map.key)
  if (had) return had
  const lakes = lakesOf(map)
  const made = { lakes, trees: treesOf(map, lakes) }
  COUNTRY.set(map.key, made)
  return made
}

function lakesOf(map: MapSpec): { x: number; y: number; r: number; s: number }[] {
  const out: { x: number; y: number; r: number; s: number }[] = []
  // More of them, smaller. One lake at a four hundred and ninety radius
  // is wider than the whole viewport at playing zoom, so the map read as
  // a single pond with some grass round the edge rather than as country.
  const n = Math.round((map.w * map.h) / 1_500_000) + 5
  for (let i = 0; i < n; i++) {
    out.push({
      x: hash(i * 3.1 + 11) * map.w,
      y: hash(i * 7.7 + 23) * map.h,
      r: 140 + hash(i * 5.3 + 5) * 200,
      s: 0.6 + hash(i * 2.9 + 31) * 0.7,
    })
  }
  return out
}

/** Where the trees stand. Never in a lake, and never in the sand. */
function treesOf(map: MapSpec, lakes: ReturnType<typeof lakesOf>) {
  const out: { x: number; y: number; r: number; k: number }[] = []
  const want = Math.round((map.w * map.h) / 46_000)
  for (let i = 0; i < want * 2 && out.length < want; i++) {
    const x = hash(i * 1.7 + 71) * map.w
    const y = hash(i * 4.3 + 97) * map.h
    const r = 22 + hash(i * 6.1 + 13) * 20
    if (lakes.some((l) => Math.hypot(l.x - x, l.y - y) < l.r + 70)) continue
    out.push({ x, y, r, k: hash(i * 9.4 + 3) })
  }
  return out
}

/** The water and the sand, under everything else. */
function drawWater(ctx: CanvasRenderingContext2D, cam: Camera, map: MapSpec, t: number) {
  for (const l of countryOf(map).lakes) {
    const p = toScreen(cam, l.x, l.y)
    const r = l.r * cam.zoom
    if (
      p.sx < -r * 1.6 ||
      p.sy < -r * 1.6 ||
      p.sx > VIEW.width + r * 1.6 ||
      p.sy > VIEW.height + r * 1.6
    ) {
      continue
    }
    // Sand first, a little wider than the water.
    const sand = ctx.createRadialGradient(p.sx, p.sy, r * 0.8, p.sx, p.sy, r * 1.32)
    sand.addColorStop(0, hsl(46, 52, 62, 0.9))
    sand.addColorStop(0.55, hsl(44, 48, 56, 0.72))
    sand.addColorStop(1, hsl(42, 44, 50, 0))
    ctx.fillStyle = sand
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, r * 1.32, r * 1.32 * l.s, 0, 0, Math.PI * 2)
    ctx.fill()

    // The water.
    const water = ctx.createRadialGradient(
      p.sx - r * 0.3,
      p.sy - r * 0.3,
      r * 0.1,
      p.sx,
      p.sy,
      r
    )
    water.addColorStop(0, hsl(196, 68, 54))
    water.addColorStop(0.7, hsl(202, 66, 40))
    water.addColorStop(1, hsl(208, 62, 30))
    ctx.fillStyle = water
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, r, r * l.s, 0, 0, Math.PI * 2)
    ctx.fill()

    // Ripples, kept near the shore and faint.
    //
    // Three full rings at a third opacity marching out from the middle
    // did not read as water at all - it read as a radar sweep, with the
    // snake sitting in the crosshairs of it.
    ctx.lineWidth = Math.max(1, 1.4 * cam.zoom)
    for (let i = 0; i < 2; i++) {
      const f = 0.72 + ((t * 0.00008 + i * 0.5 + l.x * 0.0001) % 1) * 0.26
      ctx.strokeStyle = hsl(190, 78, 82, 0.16 * (1 - Math.abs(f - 0.85) * 3))
      ctx.beginPath()
      ctx.ellipse(p.sx, p.sy, r * f, r * l.s * f, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/** Trees, over the ground and under the snakes. */
function drawTrees(ctx: CanvasRenderingContext2D, cam: Camera, map: MapSpec, t: number) {
  for (const tr of countryOf(map).trees) {
    const p = toScreen(cam, tr.x, tr.y)
    const r = tr.r * cam.zoom
    if (p.sx < -r * 3 || p.sy < -r * 3 || p.sx > VIEW.width + r * 3 || p.sy > VIEW.height + r * 3) {
      continue
    }
    // Shadow on the grass, offset the way the light comes from.
    ctx.fillStyle = 'rgba(0,0,0,0.26)'
    ctx.beginPath()
    ctx.ellipse(p.sx + r * 0.5, p.sy + r * 0.55, r * 1.05, r * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()

    // Trunk.
    ctx.fillStyle = hsl(28, 38, 26)
    ctx.fillRect(p.sx - r * 0.12, p.sy - r * 0.1, r * 0.24, r * 0.8)

    // Canopy: three overlapping crowns, leaning very slightly in a
    // breeze so the country is not completely still.
    const sway = Math.sin(t * 0.0008 + tr.x * 0.01) * r * 0.06
    const green = 96 + tr.k * 36
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + tr.k * 6
      const cx = p.sx + Math.cos(a) * r * 0.36 + sway
      const cy = p.sy + Math.sin(a) * r * 0.24 - r * 0.42
      const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r * 0.82)
      g.addColorStop(0, hsl(green, 52, 44 + tr.k * 10))
      g.addColorStop(1, hsl(green + 8, 54, 22))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function drawArena(ctx: CanvasRenderingContext2D, cam: Camera, map: MapSpec, t = 0) {
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

  // Ground markings, so speed is legible. Without something fixed to
  // slide past, a snake in open space looks like it is barely moving
  // whatever its actual speed - and giving each arena its own marking
  // is most of what stops fifty of them feeling like one field in
  // different light.
  drawGround(ctx, cam, map)

  // Country, on the maps that have it. Water and sand go down first,
  // then the trees over them, and the snakes over everything.
  if (map.wild) {
    drawWater(ctx, cam, map, t)
    drawTrees(ctx, cam, map, t)
  }

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

export function drawPellets(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  pellets: Pellet[],
  t: number,
  rainbow = false
) {
  const pad = 40
  for (const p of pellets) {
    const s = toScreen(cam, p.x, p.y)
    if (s.sx < -pad || s.sx > VIEW.width + pad || s.sy < -pad || s.sy > VIEW.height + pad) continue
    // The drawn size follows FOOD_SCALE, so what you see is what you can
    // eat. The rainbow orbs keep a slight edge on the rest, but a much
    // smaller one now that everything is this size.
    const r = (4.6 + Math.min(4, p.worth * 0.5)) * FOOD_SCALE * cam.zoom * (rainbow ? 1.12 : 1)

    // Food never glows. Coins do, and that is the whole point: a glow on
    // the floor means money, a flat disc means something to eat. When
    // both shimmered there was no telling them apart at a glance, which
    // is a poor thing to have to squint at mid-chase.
    if (p.pattern) {
      // Remains keep the colour and marking of whoever they came off,
      // but flat - the glow and halo patterns are suppressed here.
      drawBead(
        ctx,
        s.sx,
        s.sy,
        r * 1.25,
        { hue: p.hue, sat: p.sat, accent: p.accent ?? p.hue, pattern: plainly(p.pattern) },
        p.index ?? 0,
        t,
        { light: 56 }
      )
      continue
    }

    // Wild food: one flat yellow disc, the same as every other one -
    // except on the one map that trades that readability for colour,
    // where every orb runs round the wheel instead.
    //
    // Each orb is offset by its own position, so the field is a spread
    // of colours at any moment rather than five hundred discs all
    // turning green together.
    const hue = rainbow ? (t * 0.06 + p.x * 0.35 + p.y * 0.21) % 360 : p.hue
    const sat = rainbow ? 88 : p.sat
    if (rainbow) {
      // A soft corona. These are orbs rather than pellets here, and it
      // is the one place a glow on the floor is not money.
      const halo = ctx.createRadialGradient(s.sx, s.sy, r * 0.3, s.sx, s.sy, r * 2.1)
      halo.addColorStop(0, hsl(hue, sat, 70, 0.4))
      halo.addColorStop(1, hsl(hue, sat, 62, 0))
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(s.sx, s.sy, r * 2.1, 0, Math.PI * 2)
      ctx.fill()
    }
    // Held deliberately dim.
    //
    // The finishing pass blooms anything bright, and it does it by area -
    // so food that was flat at the old size started throwing a halo the
    // moment it got five times wider, which is exactly the glow that is
    // supposed to mean money and nothing else. Dropping the lightness
    // keeps it under that threshold while leaving it plainly yellow.
    ctx.fillStyle = hsl(hue, sat, rainbow ? 56 : 52)
    ctx.beginPath()
    ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = hsl(hue, sat, rainbow ? 72 : 63)
    ctx.beginPath()
    ctx.arc(s.sx, s.sy, r * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * The same marking, minus anything that lights up.
 *
 * A pellet off a burning or glowing snake would otherwise carry its halo
 * onto the floor and look like money.
 */
function plainly(pattern: Pattern): Pattern {
  return pattern === 'glow' || pattern === 'fire' ? 'bands' : pattern === 'vanish' ? 'solid' : pattern
}

/**
 * A chest: what you get instead of loose coins on the maps that have
 * them. Worth a great deal, and there are only ever a few.
 */
export function drawChests(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  chests: { x: number; y: number; value: number; openedAt: number }[],
  t: number
) {
  for (const c of chests) {
    const p = toScreen(cam, c.x, c.y)
    if (p.sx < -60 || p.sx > VIEW.width + 60 || p.sy < -60 || p.sy > VIEW.height + 60) continue
    const w = 26 * cam.zoom
    const h = 20 * cam.zoom
    const open = c.openedAt ? Math.min(1, (t - c.openedAt) / 420) : 0

    // Its glow says treasure; the same glow coins have, only bigger.
    const glow = ctx.createRadialGradient(p.sx, p.sy, w * 0.3, p.sx, p.sy, w * (2.4 + open * 2))
    glow.addColorStop(0, `rgba(255,210,110,${(0.45 + open * 0.5).toFixed(2)})`)
    glow.addColorStop(1, 'rgba(255,190,90,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, w * (2.4 + open * 2), 0, Math.PI * 2)
    ctx.fill()
    if (open >= 1) continue

    ctx.save()
    ctx.translate(p.sx, p.sy)
    // Body.
    const body = ctx.createLinearGradient(0, -h * 0.2, 0, h)
    body.addColorStop(0, '#8a5a2a')
    body.addColorStop(1, '#4a2e14')
    ctx.fillStyle = body
    ctx.fillRect(-w / 2, -h * 0.1, w, h * 0.9)
    // Lid, tilting back as it opens.
    ctx.save()
    ctx.translate(-w / 2, -h * 0.1)
    ctx.rotate(-open * 1.1)
    const lid = ctx.createLinearGradient(0, -h * 0.55, 0, 0)
    lid.addColorStop(0, '#a87038')
    lid.addColorStop(1, '#6b421d')
    ctx.fillStyle = lid
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -h * 0.34)
    ctx.quadraticCurveTo(w / 2, -h * 0.72, w, -h * 0.34)
    ctx.lineTo(w, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // Bands and lock.
    ctx.fillStyle = '#e8c45a'
    ctx.fillRect(-w / 2, h * 0.18, w, h * 0.12)
    ctx.fillRect(-w * 0.09, -h * 0.1, w * 0.18, h * 0.5)
    ctx.restore()
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
  // Elemental is not a pattern of its own - it is whichever of water,
  // fire and ice it happens to be wearing, in whatever colour it has
  // walked round to. Resolving it here means every one of those
  // textures works on it without being written twice.
  const el = look.pattern === 'elemental' ? elementAt(t) : null
  const pattern = el ? el.pattern : look.pattern
  const a = el ? el.hue : look.accent
  const hue = el
    ? el.hue
    : look.pattern === 'shift'
      ? (look.hue + index * 3.2 + t * 0.03) % 360
      : look.hue

  if (pattern === 'glow') {
    const halo = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.1)
    halo.addColorStop(0, hsl(hue, 95, 62, 0.4))
    halo.addColorStop(1, hsl(hue, 95, 55, 0))
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, r * 2.1, 0, Math.PI * 2)
    ctx.fill()
  }

  const wasAlpha = ctx.globalAlpha
  if (pattern === 'ghost') ctx.globalAlpha = wasAlpha * 0.55

  const body = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r)
  body.addColorStop(0, hsl(hue, sat + 6, light + 22))
  body.addColorStop(0.55, hsl(hue, sat, light))
  body.addColorStop(1, hsl(hue, sat - 4, light - 26))
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  if (pattern === 'ghost') ctx.globalAlpha = wasAlpha

  // Markings. Whatever it is, it runs down the back, because that is
  // the only part of a snake anyone ever sees.
  if (taper <= 0.3) return
  const i = index
  const p = { sx: x, sy: y }
  switch (pattern) {
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
    glow.addColorStop(0, hsl(s.pattern === 'elemental' ? elementAt(t).hue : s.hue, 95, 72, 0.5))
    glow.addColorStop(1, hsl(s.pattern === 'elemental' ? elementAt(t).hue : s.hue, 95, 60, 0))
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

  // The head.
  //
  // Built in its own frame - nose along +x - then turned to wherever the
  // snake is going. It is one rounded head with a mouth cut into the
  // front of it, not two jaws meeting at a hinge: a wedge running back
  // into the skull splits the whole head in two and reads as a beak.
  // The mouth belongs in the front third and nowhere else.
  const chomp = 0.5 + Math.sin(t * 0.009 + s.id) * 0.5
  const bitJustNow = t < s.bittenUntil ? 1 : 0
  const gape = Math.min(0.62, 0.16 + chomp * 0.14 + (s.dashing ? 0.16 : 0) + bitJustNow * 0.3)

  ctx.save()
  ctx.translate(h.sx, h.sy)
  ctx.rotate(s.heading)

  const L = hr * 1.34
  const Wd = hr * 1.12

  // The head has to follow the body's colour, not the skin's nominal
  // one - otherwise an Elemental snake turns orange from the neck back
  // and keeps a blue head.
  const headHue = s.pattern === 'elemental' ? elementAt(t).hue : s.hue

  const skin = (lift: number) => {
    const g = ctx.createLinearGradient(0, -Wd, 0, Wd)
    g.addColorStop(0, hsl(headHue, s.sat + 6, 66 + lift))
    g.addColorStop(0.45, hsl(headHue, s.sat, 52 + lift))
    g.addColorStop(1, hsl(headHue, s.sat - 6, 33 + lift))
    return g
  }

  // The head itself: a blunt dome, wider at the back than the snout.
  ctx.fillStyle = skin(0)
  ctx.beginPath()
  ctx.moveTo(-L * 0.72, 0)
  ctx.bezierCurveTo(-L * 0.7, -Wd * 1.04, -L * 0.1, -Wd * 1.04, L * 0.52, -Wd * 0.8)
  ctx.bezierCurveTo(L * 0.94, -Wd * 0.62, L * 1.02, -Wd * 0.24, L * 1.02, 0)
  ctx.bezierCurveTo(L * 1.02, Wd * 0.24, L * 0.94, Wd * 0.62, L * 0.52, Wd * 0.8)
  ctx.bezierCurveTo(-L * 0.1, Wd * 1.04, -L * 0.7, Wd * 1.04, -L * 0.72, 0)
  ctx.fill()

  // The mouth, cut into the front. Clipped to the head so the opening
  // can never spill past the snout however wide it gets.
  ctx.save()
  ctx.clip()
  const lip = Wd * gape
  ctx.fillStyle = '#4a0f1a'
  ctx.beginPath()
  ctx.moveTo(L * 0.12, -lip * 0.25)
  ctx.quadraticCurveTo(L * 0.8, -lip * 1.0, L * 1.1, -lip * 0.5)
  ctx.lineTo(L * 1.1, lip * 0.5)
  ctx.quadraticCurveTo(L * 0.8, lip * 1.0, L * 0.12, lip * 0.25)
  ctx.closePath()
  ctx.fill()

  // Tongue, back in the throat, only while the mouth is properly open.
  if (gape > 0.3 && hr > 6) {
    ctx.strokeStyle = '#e0486a'
    ctx.lineWidth = Math.max(0.8, hr * 0.1)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(L * 0.3, 0)
    ctx.lineTo(L * 0.85, 0)
    ctx.stroke()
  }

  // Teeth along the upper lip, small and evenly spaced.
  if (hr > 6) {
    ctx.fillStyle = '#fdf8ee'
    for (const side of [-1, 1]) {
      for (const along of [0.5, 0.72, 0.9]) {
        const y = -side * lip * (0.35 + along * 0.55)
        ctx.beginPath()
        ctx.moveTo(L * along, y)
        ctx.lineTo(L * (along + 0.07), y)
        ctx.lineTo(L * (along + 0.035), y + side * lip * 0.36)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
  ctx.restore()

  // The lower lip, a lighter line under the opening so the jaw reads as
  // a jaw rather than as a hole.
  ctx.strokeStyle = hsl(headHue, s.sat, 30, 0.7)
  ctx.lineWidth = Math.max(0.7, hr * 0.07)
  ctx.beginPath()
  ctx.moveTo(L * 0.12, lip * 0.25)
  ctx.quadraticCurveTo(L * 0.8, lip * 1.0, L * 1.06, lip * 0.45)
  ctx.stroke()

  // A tongue flick, out past the snout, now and then.
  const flick = Math.sin(t * 0.004 + s.id * 2.1)
  if (flick > 0.88 && hr > 5) {
    ctx.strokeStyle = '#e0486a'
    ctx.lineWidth = Math.max(0.8, hr * 0.1)
    ctx.lineCap = 'round'
    const reach = L * (1.1 + (flick - 0.88) * 3)
    ctx.beginPath()
    ctx.moveTo(L * 0.95, 0)
    ctx.lineTo(reach, 0)
    ctx.moveTo(reach, 0)
    ctx.lineTo(reach + hr * 0.26, -hr * 0.18)
    ctx.moveTo(reach, 0)
    ctx.lineTo(reach + hr * 0.26, hr * 0.18)
    ctx.stroke()
  }

  // Eyes: big, round and well forward, the way a cartoon snake's are.
  for (const side of [-1, 1]) {
    const ex = -L * 0.02
    const ey = side * Wd * 0.44
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(ex, ey, hr * 0.33, hr * 0.31, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = hsl(headHue, s.sat, 26, 0.5)
    ctx.lineWidth = Math.max(0.6, hr * 0.05)
    ctx.stroke()
    ctx.fillStyle = '#121a24'
    ctx.beginPath()
    ctx.ellipse(ex + hr * 0.11, ey, hr * 0.14, hr * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(ex + hr * 0.06, ey - hr * 0.12, hr * 0.06, 0, Math.PI * 2)
    ctx.fill()
  }

  // Nostrils.
  if (hr > 9) {
    ctx.fillStyle = hsl(headHue, s.sat, 20)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(L * 0.82, side * Wd * 0.3, hr * 0.05, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // The threat ring goes round the whole head, outside the rotation, so
  // it stays a circle whatever way the snake is pointing.
  ctx.strokeStyle = ring
  ctx.lineWidth = Math.max(1, 2 * cam.zoom)
  ctx.beginPath()
  ctx.arc(h.sx, h.sy, hr * 1.26, 0, Math.PI * 2)
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

/* ------------------------------------------------------------------ */
/* The special snakes                                                  */
/* ------------------------------------------------------------------ */

/**
 * The slug's trail.
 *
 * Painted under everything else, oldest first, so a fresh patch reads as
 * brighter than one about to dry up. The wobble is per-patch and fixed
 * off its own position, not off the clock, or the whole trail breathes
 * in step and looks like one object.
 */
export function drawGoo(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  goo: { x: number; y: number; bornAt: number }[],
  t: number,
  life: number
) {
  if (goo.length === 0) return
  ctx.save()
  for (const g of goo) {
    const age = Math.min(1, (t - g.bornAt) / life)
    const p = toScreen(cam, g.x, g.y)
    // Sized generously on purpose. At the zoom a grown snake plays at,
    // the first version of this was an eighteen pixel wash at half alpha
    // over a dark floor, which is to say invisible - the trail was being
    // laid the whole time and could not be seen at all.
    const r = (62 - age * 10) * cam.zoom
    if (p.sx < -r || p.sy < -r || p.sx > VIEW.width + r || p.sy > VIEW.height + r) continue
    const fade = 1 - age * 0.78
    const wob = 1 + Math.sin(g.x * 0.05 + g.y * 0.03) * 0.16
    const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r)
    // Yellow-green rather than green. The starting skin is green, and at
    // this size the trail read as more snake rather than as slime.
    grad.addColorStop(0, hsl(72, 86, 44, fade * 0.9))
    grad.addColorStop(0.55, hsl(68, 80, 33, fade * 0.78))
    grad.addColorStop(0.86, hsl(64, 72, 23, fade * 0.4))
    grad.addColorStop(1, hsl(62, 66, 18, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, r * wob, r / wob, g.x * 0.01, 0, Math.PI * 2)
    ctx.fill()
    // A bright rim and a wet highlight, so it reads as something sitting
    // on the floor rather than a smear of fog.
    ctx.strokeStyle = hsl(76, 90, 58, fade * 0.4)
    ctx.lineWidth = Math.max(1, 1.6 * cam.zoom)
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, r * wob * 0.8, (r / wob) * 0.8, g.x * 0.01, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = hsl(80, 94, 80, fade * 0.5)
    ctx.beginPath()
    ctx.ellipse(p.sx - r * 0.24, p.sy - r * 0.28, r * 0.22, r * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The fog bank.
 *
 * Drawn over the arena but under you, and kept deliberately thin in the
 * middle: you are meant to be able to see out of your own fog. It thins
 * at the rim too, because a hard circle edge looks like a bug.
 */
export function drawFog(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  y: number,
  radius: number,
  t: number,
  strength: number
) {
  const p = toScreen(cam, x, y)
  const r = radius * cam.zoom
  ctx.save()
  // Three offset lobes, drifting slowly, so the bank churns instead of
  // sitting there as a disc.
  for (let i = 0; i < 3; i++) {
    const a = t * 0.00035 + (i / 3) * Math.PI * 2
    const ox = Math.cos(a) * r * 0.16
    const oy = Math.sin(a * 1.3) * r * 0.13
    const grad = ctx.createRadialGradient(p.sx + ox, p.sy + oy, r * 0.12, p.sx + ox, p.sy + oy, r)
    // Milky white. Barely any hue in it at all - a faint cool cast so it
    // does not read as a flat grey smear over the arena, and no more.
    grad.addColorStop(0, hsl(200, 8, 97, 0.12 * strength))
    grad.addColorStop(0.45, hsl(200, 7, 95, 0.4 * strength))
    grad.addColorStop(0.82, hsl(202, 6, 92, 0.3 * strength))
    grad.addColorStop(1, hsl(204, 6, 90, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(p.sx + ox, p.sy + oy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** The King's snakes, out on the floor. */
export function drawMinions(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  minions: { x: number; y: number; targetId: number | null; dartUntil: number; carrying: number }[],
  snakes: { id: number; x: number; y: number; dead: boolean }[],
  hue: number,
  t: number
) {
  for (const m of minions) {
    const p = toScreen(cam, m.x, m.y)
    // Big enough to find on a crowded floor. At ten they were a couple of
    // violet specks among sixteen rivals and you could not tell your own
    // minions from somebody's tail.
    const r = Math.max(7, 15 * cam.zoom)

    if (t < m.dartUntil && m.targetId !== null) {
      const target = snakes.find((s) => s.id === m.targetId && !s.dead)
      if (target) {
        const q = toScreen(cam, target.x, target.y)
        ctx.strokeStyle = hsl(286, 90, 78, 0.8)
        ctx.lineWidth = Math.max(1, 2.6 * cam.zoom)
        ctx.beginPath()
        ctx.moveTo(p.sx, p.sy)
        ctx.lineTo(q.sx, q.sy)
        ctx.stroke()
      }
    }

    // A short body, four beads, angled along the way it is heading.
    const a = Math.atan2(m.y - cam.y, m.x - cam.x) + Math.sin(t * 0.004) * 0.4
    for (let i = 3; i >= 0; i--) {
      const bx = p.sx - Math.cos(a) * i * r * 0.9
      const by = p.sy - Math.sin(a) * i * r * 0.9
      const rr = r * (1 - i * 0.16)
      const grad = ctx.createRadialGradient(bx - rr * 0.3, by - rr * 0.4, rr * 0.1, bx, by, rr)
      grad.addColorStop(0, hsl(hue, 78, 74))
      grad.addColorStop(1, hsl(hue, 70, 44))
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(bx, by, rr, 0, Math.PI * 2)
      ctx.fill()
      // A gold edge. Rivals come in every colour including violet, so
      // colour alone does not say whose these are.
      ctx.strokeStyle = hsl(46, 92, 70, 0.55)
      ctx.lineWidth = Math.max(1, 1.4 * cam.zoom)
      ctx.stroke()
    }
    // A crown-flick of light on the head, so the King's own read apart
    // from a companion at a glance.
    ctx.fillStyle = hsl(46, 96, 80, 0.95)
    ctx.beginPath()
    ctx.arc(p.sx, p.sy - r * 0.95, Math.max(1.6, r * 0.26), 0, Math.PI * 2)
    ctx.fill()

    if (m.carrying > 0) {
      ctx.fillStyle = hsl(46, 94, 66, 0.95)
      ctx.beginPath()
      ctx.arc(p.sx + r * 0.7, p.sy + r * 0.6, Math.max(1.4, r * 0.3), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
