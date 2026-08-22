/**
 * Isometric (2:1 diamond) coordinate math.
 *
 * Grid coordinates (gx, gy) are simple integer tile indices, like a normal
 * 2D array. Screen coordinates are where that tile should be drawn in the
 * Pixi canvas, relative to a chosen origin (usually the canvas center).
 */

export interface TileSize {
  width: number
  height: number
}

export const DEFAULT_TILE: TileSize = { width: 128, height: 64 }

export interface ScreenPoint {
  x: number
  y: number
}

export interface GridPoint {
  x: number
  y: number
}

/** Convert grid coordinates to screen-space pixel coordinates. */
export function gridToScreen(
  grid: GridPoint,
  tile: TileSize = DEFAULT_TILE
): ScreenPoint {
  return {
    x: (grid.x - grid.y) * (tile.width / 2),
    y: (grid.x + grid.y) * (tile.height / 2),
  }
}

/** Convert screen-space pixel coordinates back to the nearest grid tile. */
export function screenToGrid(
  screen: ScreenPoint,
  tile: TileSize = DEFAULT_TILE
): GridPoint {
  const halfW = tile.width / 2
  const halfH = tile.height / 2
  const gx = (screen.x / halfW + screen.y / halfH) / 2
  const gy = (screen.y / halfH - screen.x / halfW) / 2
  return { x: Math.round(gx), y: Math.round(gy) }
}

/** Manhattan-style distance on the grid, useful for "is player adjacent" checks. */
export function gridDistance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
