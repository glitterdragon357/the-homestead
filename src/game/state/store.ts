import { create } from 'zustand'
import type { GridPoint } from '../isometric/coords'
import { buildStarterMap, tileAt, type HomesteadTile } from '../world/tiles'

interface HomesteadState {
  tiles: HomesteadTile[]
  player: GridPoint

  /** id of the minigame currently open as a full-screen overlay, if any. */
  activeMinigameId: string | null

  movePlayerTo: (pos: GridPoint) => void
  openMinigame: (id: string) => void
  closeMinigame: () => void
}

export const useHomesteadStore = create<HomesteadState>((set, get) => ({
  tiles: buildStarterMap(),
  player: { x: 0, y: 0 },
  activeMinigameId: null,

  movePlayerTo: (pos) => {
    const tile = tileAt(get().tiles, pos)
    if (!tile || !tile.walkable) return
    set({ player: pos })

    // Auto-launch a minigame when the player steps onto a tile that has one.
    if (tile.minigameId) {
      set({ activeMinigameId: tile.minigameId })
    }
  },

  openMinigame: (id) => set({ activeMinigameId: id }),
  closeMinigame: () => set({ activeMinigameId: null }),
}))
