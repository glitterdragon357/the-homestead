import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GridPoint } from '../isometric/coords'
import { buildStarterMap, tileAt, type HomesteadTile } from '../world/tiles'
import { initialProgress } from '../minigames/farm/farmData'
import { initialPottery } from '../minigames/pottery/potteryData'
import { initialLumber } from '../minigames/lumber/lumberData'
import { initialFruit } from '../minigames/fruit/fruitData'

interface HomesteadState {
  tiles: HomesteadTile[]
  player: GridPoint

  /** id of the minigame currently open as a full-screen overlay, if any. */
  activeMinigameId: string | null

  /**
   * Saved progress, keyed by minigame id. The store deliberately does not
   * know the shape of any entry - each minigame owns its own save format
   * and reads/writes it through `useMinigameProgress`.
   */
  progress: Record<string, unknown>

  /**
   * One wallet and one crate for the whole homestead. Every game feeds the
   * same inventory and draws on the same purse, but each sells its own
   * goods: farm produce at the farmstead, fish at the pond. The crate is
   * shared plumbing, not a shared shopfront.
   */
  coins: number
  inventory: Record<string, number>

  movePlayerTo: (pos: GridPoint) => void
  openMinigame: (id: string) => void
  closeMinigame: () => void
  setProgress: (id: string, value: unknown) => void

  earn: (amount: number) => void
  /** Returns false (and changes nothing) when the purse is short. */
  spend: (amount: number) => boolean
  addItem: (key: string, qty?: number) => void
  /** Returns false (and changes nothing) unless every item is in stock. */
  takeItems: (needs: Record<string, number>) => boolean

  resetSave: () => void
  /** Roll back to the snapshot taken when this session loaded. */
  restoreBackup: () => boolean
}

const SAVE_KEY = 'the-homestead-save'
/** Snapshot of the save as it looked when this session started. */
const BACKUP_KEY = 'the-homestead-save.prev'

/**
 * Copy the on-disk save aside before the app starts writing over it.
 *
 * The game autosaves constantly, so a bad write - a bug, a stray console
 * command, a mistaken reset - is normally unrecoverable the moment it
 * lands. One session-old snapshot costs nothing and makes that survivable.
 */
function snapshotSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) localStorage.setItem(BACKUP_KEY, raw)
  } catch {
    // Storage unavailable (private mode, quota) - the game still runs.
  }
}

export const useHomesteadStore = create<HomesteadState>()(
  persist(
    (set, get) => ({
      tiles: buildStarterMap(),
      player: { x: 0, y: 0 },
      activeMinigameId: null,
      progress: { ...initialProgress(), pottery: initialPottery(), lumber: initialLumber(), fruit: initialFruit() },
      coins: 40,
      inventory: {},

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

      earn: (amount) => set((s) => ({ coins: s.coins + amount })),

      spend: (amount) => {
        if (get().coins < amount) return false
        set((s) => ({ coins: s.coins - amount }))
        return true
      },

      addItem: (key, qty = 1) =>
        set((s) => ({ inventory: { ...s.inventory, [key]: (s.inventory[key] ?? 0) + qty } })),

      takeItems: (needs) => {
        const inv = get().inventory
        for (const [key, qty] of Object.entries(needs)) {
          if ((inv[key] ?? 0) < qty) return false
        }
        const next = { ...inv }
        for (const [key, qty] of Object.entries(needs)) {
          next[key] = (next[key] ?? 0) - qty
        }
        set({ inventory: next })
        return true
      },

      restoreBackup: () => {
        try {
          const raw = localStorage.getItem(BACKUP_KEY)
          if (!raw) return false
          const parsed = JSON.parse(raw) as { state?: Partial<HomesteadState> }
          if (!parsed?.state) return false
          const { progress, player, coins, inventory } = parsed.state
          set({
            progress: progress ?? {},
            player: player ?? { x: 0, y: 0 },
            coins: coins ?? 40,
            inventory: inventory ?? {},
          })
          return true
        } catch {
          return false
        }
      },

      resetSave: () =>
        set({
          progress: { ...initialProgress(), pottery: initialPottery(), lumber: initialLumber(), fruit: initialFruit() },
          player: { x: 0, y: 0 },
          coins: 40,
          inventory: {},
        }),
    }),
    {
      name: SAVE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // Runs before rehydration, so this captures the previous session's
      // save rather than anything this one has written.
      onRehydrateStorage: () => {
        snapshotSave()
        return undefined
      },
      /**
       * Only persist what the player actually earned. `tiles` is rebuilt
       * from code on every load, so saving it would freeze the map at
       * whatever layout shipped when the save was written.
       */
      partialize: (state) => ({
        progress: state.progress,
        player: state.player,
        coins: state.coins,
        inventory: state.inventory,
      }),
      /**
       * v1 kept coins inside each minigame's own save; v2 split the farm
       * across four buildings. Carry old purses into the shared wallet,
       * and tip any coop birds back into the single barn.
       */
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>
        const progress = { ...((state.progress ?? {}) as Record<string, any>) }

        if (version < 2) {
          const carried =
            (progress.fishing?.coins ?? 0) + (progress.farmstead?.coins ?? 0)
          return {
            ...state,
            coins: ((state.coins as number) ?? 0) + carried || 40,
            inventory: state.inventory ?? {},
            progress: initialProgress(),
          }
        }

        // v2 -> v3: the coop was folded into the barn, so its birds move in.
        if (progress.coop) {
          const barn = progress.barn ?? { level: 0, nextId: 1, animals: [], breeding: {} }
          const birds = progress.coop.animals ?? []
          let nextId = Math.max(barn.nextId ?? 1, ...birds.map((a: any) => a.id ?? 0)) + 1
          progress.barn = {
            ...barn,
            animals: [
              ...(barn.animals ?? []),
              ...birds.map((a: any) => ({ ...a, id: nextId++ })),
            ],
            nextId,
          }
          delete progress.coop
        }

        return { ...state, progress }
      },
    }
  )
)
