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

interface Placement {
  x: number
  y: number
  type: TileType
  label: string
  icon: string
  minigameId: string
}

/**
 * Where each building sits. Three places to go: the farmstead west, the
 * kitten north-east and the pond in its corner.
 */
const PLACEMENTS: Placement[] = [
  { x: 1, y: 5, type: 'building', label: 'Farmstead', icon: '🚜', minigameId: 'farmstead' },
  { x: 4, y: 1, type: 'grass', label: 'Kitten', icon: '🐱', minigameId: 'kitten' },
]

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

  for (const p of PLACEMENTS) {
    const tile = tiles.find((t) => t.x === p.x && t.y === p.y)
    if (!tile) continue
    tile.type = p.type
    tile.label = p.label
    tile.icon = p.icon
    tile.minigameId = p.minigameId
  }

  return tiles
}

export function tileAt(
  tiles: HomesteadTile[],
  pos: GridPoint
): HomesteadTile | undefined {
  return tiles.find((t) => t.x === pos.x && t.y === pos.y)
}
