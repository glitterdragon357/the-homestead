/**
 * A finishing pass over a rendered frame.
 *
 * The canvas games all draw in flat fills - a wall is one colour, a
 * field is another - which is legible but reads as paper. These two
 * effects are what photographs have and flat fills do not: the corners
 * of a frame fall off darker than the middle, and every real image has
 * a fine grain in it that breaks up large areas of one colour.
 *
 * Both are cheap. The grain is one small noise tile blitted about rather
 * than per-pixel work, so this costs a fraction of a millisecond.
 */

export interface Frame {
  width: number
  height: number
}

let noise: HTMLCanvasElement | null = null

/** One tile of monochrome noise, built once and reused for every frame. */
function noiseTile(): HTMLCanvasElement {
  if (noise) return noise
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(size, size)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 90
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }
  noise = c
  return c
}

/** Darkens the corners, the way a lens does. */
export function vignette(ctx: CanvasRenderingContext2D, view: Frame, strength = 0.42) {
  const { width: w, height: h } = view
  const g = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.32, w / 2, h * 0.48, Math.max(w, h) * 0.76)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.62, `rgba(0,0,0,${(strength * 0.22).toFixed(3)})`)
  g.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

/** A fine grain over everything, drifting so it never looks like a texture. */
export function grain(ctx: CanvasRenderingContext2D, view: Frame, amount = 0.045) {
  const tile = noiseTile()
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = amount
  const ox = -Math.floor(Math.random() * tile.width)
  const oy = -Math.floor(Math.random() * tile.height)
  for (let x = ox; x < view.width; x += tile.width) {
    for (let y = oy; y < view.height; y += tile.height) {
      ctx.drawImage(tile, x, y)
    }
  }
  ctx.restore()
}

/**
 * The whole pass, for the end of a render.
 *
 * `light` scenes want a gentler vignette than night ones, so it is worth
 * passing the strength rather than taking the default everywhere.
 */
export function finish(
  ctx: CanvasRenderingContext2D,
  view: Frame,
  opts: { vignette?: number; grain?: number } = {}
) {
  vignette(ctx, view, opts.vignette ?? 0.42)
  grain(ctx, view, opts.grain ?? 0.045)
}

/**
 * The soft dark patch a thing casts where it meets the ground.
 *
 * A billboard figure standing on a flat fill reads as a sticker; the same
 * figure with a shadow under its feet reads as standing there. Draw this
 * before the figure, in the same coordinate frame, with the origin where
 * the feet are.
 */
export function contactShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  strength = 0.34
) {
  const r = Math.max(1, rx)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, Math.max(0.05, ry / r))
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  g.addColorStop(0, `rgba(0,0,0,${strength.toFixed(3)})`)
  g.addColorStop(0.55, `rgba(0,0,0,${(strength * 0.4).toFixed(3)})`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Light                                                               */
/* ------------------------------------------------------------------ */

/**
 * A single sun for every scene that wants one.
 *
 * Up is negative y in this engine, so the y here is negative: the light
 * comes down and across. What makes a box read as a solid object is that
 * its three visible faces are three clearly different colours, and what
 * makes those colours look like daylight rather than three swatches is
 * that the lit face is warm and the shaded face is cool - a face turned
 * away from the sun is not lit by nothing, it is lit by the sky.
 */
export const SUN = { x: 0.6, y: -0.66, z: -0.45 }
const SUN_TINT: RGB = [255, 238, 198]
const SKY_TINT: RGB = [150, 184, 222]

export type RGB = [number, number, number]

export function parseColour(c: string): RGB {
  if (c.startsWith('#')) {
    const h = c.length === 4
      ? c[1] + c[1] + c[2] + c[2] + c[3] + c[3]
      : c.slice(1)
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
  }
  const m = c.match(/-?\d+(\.\d+)?/g)
  return m ? ([+m[0], +m[1], +m[2]] as RGB) : [128, 128, 128]
}

export function toCss(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
}

export function blend(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/**
 * The colour a surface of `base` actually is, given which way it faces.
 *
 * `ambient` is how much light a face gets when it is turned away from the
 * sun entirely - never zero, or the shaded sides of things go to soot.
 */
export function litFill(
  base: string,
  nx: number,
  ny: number,
  nz: number,
  ambient = 0.46
): string {
  const lam = Math.max(0, nx * SUN.x + ny * SUN.y + nz * SUN.z)
  const bright = ambient + (1 - ambient) * lam
  let c = parseColour(base).map((v) => Math.min(255, v * bright)) as RGB
  // Sunlit faces pick up the warmth of the light itself.
  c = blend(c, SUN_TINT, lam * 0.2)
  // Faces turned up or away are lit by the sky instead, which is cold.
  const skyward = Math.max(0, -ny) * 0.5 + (1 - lam) * 0.35
  c = blend(c, SKY_TINT, Math.min(0.3, skyward * 0.22))
  return toCss(c)
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

type Poly = { sx: number; sy: number }[]

function boundsOf(poly: Poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of poly) {
    if (p.sx < x0) x0 = p.sx
    if (p.sy < y0) y0 = p.sy
    if (p.sx > x1) x1 = p.sx
    if (p.sy > y1) y1 = p.sy
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }
}

function clipTo(ctx: CanvasRenderingContext2D, poly: Poly) {
  ctx.beginPath()
  ctx.moveTo(poly[0].sx, poly[0].sy)
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].sx, poly[i].sy)
  ctx.closePath()
  ctx.clip()
}

/**
 * Grain over one filled face.
 *
 * This is screen-space rather than surface-space, so it does not travel
 * with the wall as you walk past. At this strength that does not read as
 * a texture sliding about; it reads as the surface not being plastic.
 */
export function textureFace(ctx: CanvasRenderingContext2D, poly: Poly, amount = 0.2) {
  if (poly.length < 3) return
  const b = boundsOf(poly)
  if (b.w < 2 || b.h < 2) return
  const tile = noiseTile()
  ctx.save()
  clipTo(ctx, poly)
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha *= amount
  for (let x = b.x0; x < b.x1; x += tile.width) {
    for (let y = b.y0; y < b.y1; y += tile.height) ctx.drawImage(tile, x, y)
  }
  ctx.restore()
}

/**
 * The dirt in the corner: a face is darker where it meets the ground and
 * where it meets its neighbours, because less of the sky can reach it.
 */
export function faceAO(ctx: CanvasRenderingContext2D, poly: Poly, strength = 0.35) {
  if (poly.length < 3) return
  const b = boundsOf(poly)
  if (b.h < 3) return
  ctx.save()
  clipTo(ctx, poly)
  const g = ctx.createLinearGradient(0, b.y1, 0, b.y1 - Math.min(b.h, b.h * 0.45))
  g.addColorStop(0, `rgba(18,20,26,${strength.toFixed(3)})`)
  g.addColorStop(1, 'rgba(18,20,26,0)')
  ctx.fillStyle = g
  ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2)
  ctx.restore()
}
