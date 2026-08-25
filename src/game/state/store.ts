import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GridPoint } from '../isometric/coords'
import { buildStarterMap, tileAt, type HomesteadTile } from '../world/tiles'

interface HomesteadState {
  tiles: HomesteadTile[]
  player: GridPoint

  /** id of the minigame currently open as a full-screen overlay, if any. */
  activeMinigameId: string | null

  /**
   * Saved progress, keyed by minigame id. The store deliberately does not
   * know the shape of any entry - each minigame owns its own save format
   * and reads/writes it through `useMinigameProgress`. That keeps
   * minigames self-contained: adding one still means a component plus a
   * registry entry, with no store changes.
   */
  progress: Record<string, unknown>

  movePlayerTo: (pos: GridPoint) => void
  openMinigame: (id: string) => void
  closeMinigame: () => void
  setProgress: (id: string, value: unknown) => void
  resetSave: () => void
}

export const useHomesteadStore = create<HomesteadState>()(
  persist(
    (set, get) => ({
      tiles: buildStarterMap(),
      player: { x: 0, y: 0 },
      activeMinigameId: null,
      progress: {},

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

      setProgress: (id, value) =>
        set((state) => ({ progress: { ...state.progress, [id]: value } })),

      resetSave: () => set({ progress: {}, player: { x: 0, y: 0 } }),
    }),
    {
      name: 'the-homestead-save',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      /**
       * Only persist what the player actually earned. `tiles` is rebuilt
       * from code on every load, so saving it would freeze the map at
       * whatever layout shipped when the save was written.
       */
      partialize: (state) => ({ progress: state.progress, player: state.player }),
    }
  )
)
