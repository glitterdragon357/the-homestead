import type { GridPoint } from '../isometric/coords'

export type TileType = 'grass' | 'dirt' | 'water' | 'building' | 'forest' | 'orchard'

export interface HomesteadTile {
  x: number
  y: number
  type: TileType
  /** Display label shown on hover/interaction, e.g. "Vegetable Patch". */
  label?: string
  /** Emoji drawn on top of the tile, e.g. a paw for the pet room. */
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
 * Where each building sits: the farmstead west, the pets north-east,
 * the pond in its corner, and the clay bank on the pond's edge - the
 * pottery only makes sense next to the water it digs from.
 */
const PLACEMENTS: Placement[] = [
  { x: 1, y: 5, type: 'building', label: 'Farmstead', icon: '🚜', minigameId: 'farmstead' },
  { x: 4, y: 1, type: 'building', label: 'Pet Care', icon: '🐾', minigameId: 'pets' },
  { x: 5, y: 6, type: 'dirt', label: 'Clay Bank', icon: '🏺', minigameId: 'pottery' },
  { x: 6, y: 2, type: 'forest', label: 'Woodlot', icon: '🌲', minigameId: 'lumber' },
  { x: 2, y: 2, type: 'orchard', label: 'Orchard', icon: '🍎', minigameId: 'fruit' },
  { x: 4, y: 4, type: 'building', label: 'Vet', icon: '🩺', minigameId: 'vet' },
  { x: 5, y: 3, type: 'building', label: 'Doctor', icon: '⚕️', minigameId: 'doctor' },
  { x: 2, y: 4, type: 'building', label: 'Pet Salon', icon: '✂️', minigameId: 'salon' },
  { x: 3, y: 2, type: 'building', label: 'Day Spa', icon: '\u{1F485}', minigameId: 'spa' },
  { x: 6, y: 4, type: 'grass', label: 'Wild Country', icon: '\u{1F40E}', minigameId: 'horses' },
  { x: 7, y: 1, type: 'building', label: 'The City', icon: '\u{1F3D9}\uFE0F', minigameId: 'city' },
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

  // Open sea along the far shore. Deliberately its own water, nowhere
  // near the pond - diving and pond fishing are unrelated games.
  for (const [x, y] of [
    [0, 6],
    [1, 6],
    [0, 7],
    [1, 7],
  ]) {
    const t = tiles.find((t) => t.x === x && t.y === y)
    if (t) {
      t.type = 'water'
      t.walkable = true
      t.label = 'Ocean'
      t.minigameId = 'ocean'
    }
  }
  const shore = tiles.find((t) => t.x === 0 && t.y === 6)
  if (shore) shore.icon = '\u{1F93F}'

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
