import type { GridPoint } from '../isometric/coords'

export type TileType = 'grass' | 'dirt' | 'water' | 'building'

export interface HomesteadTile {
  x: number
  y: number
  type: TileType
  /** Display label shown on hover/interaction, e.g. "Vegetable Patch". */
  label?: string
  /** Emoji drawn on top of the tile, e.g. a cat icon for the kitten tile. */
  icon?: string
  /** If set, interacting with this tile launches the given minigame. */
  minigameId?: string
  /** Whether the player can stand on this tile. */
  walkable: boolean
}

/**
 * Starter homestead layout. Replace with a real map (loaded from JSON,
 * a level editor, or eventually DynamoDB) once the scaffold is proven out.
 * Kept small and hand-written here so the whole pipeline is inspectable.
 */
export function buildStarterMap(): HomesteadTile[] {
  const tiles: HomesteadTile[] = []
  const size = 8

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      tiles.push({ x, y, type: 'grass', walkable: true })
    }
  }

  // A pond in the corner that opens the fishing minigame.
  for (const [x, y] of [
    [6, 6],
    [7, 6],
    [6, 7],
    [7, 7],
  ]) {
    const t = tiles.find((t) => t.x === x && t.y === y)
    if (t) {
      t.type = 'water'
      t.walkable = true
      t.label = 'Fishing Spot'
      t.minigameId = 'fishing'
    }
  }

  // A farm plot that opens the farming minigame.
  const farmTile = tiles.find((t) => t.x === 2 && t.y === 2)
  if (farmTile) {
    farmTile.type = 'dirt'
    farmTile.label = 'Vegetable Patch'
    farmTile.minigameId = 'farming'
  }

  // A kitten to take care of.
  const kittenTile = tiles.find((t) => t.x === 4 && t.y === 3)
  if (kittenTile) {
    kittenTile.label = 'Kitten'
    kittenTile.icon = '🐱'
    kittenTile.minigameId = 'kitten'
  }

  // The barn: livestock, field and farm kitchen.
  const farmsteadTile = tiles.find((t) => t.x === 1 && t.y === 5)
  if (farmsteadTile) {
    farmsteadTile.type = 'building'
    farmsteadTile.label = 'Farmstead'
    farmsteadTile.icon = '🐄'
    farmsteadTile.minigameId = 'farmstead'
  }

  return tiles
}

export function tileAt(
  tiles: HomesteadTile[],
  pos: GridPoint
): HomesteadTile | undefined {
  return tiles.find((t) => t.x === pos.x && t.y === pos.y)
}
