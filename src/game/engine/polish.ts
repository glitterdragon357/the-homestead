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
