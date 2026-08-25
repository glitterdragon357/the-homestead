import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GridPoint } from '../isometric/coords'
import { buildStarterMap, tileAt, type HomesteadTile } from '../world/tiles'
import { initialProgress } from '../minigames/farm/farmData'
import { initialPottery } from '../minigames/pottery/potteryData'
import { initialLumber } from '../minigames/lumber/lumberData'
import { initialFruit } from '../minigames/fruit/fruitData'
import { initialVet } from '../minigames/vet/vetData'
import { initialDoctor } from '../minigames/doctor/doctorData'
import { saveKeysOf, shiftTimestamps } from './gameClock'

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
   * Wall-clock time each game was last left, keyed by game id. A game with
   * an entry here is frozen: its timers are pushed forward by the time you
   * were away the moment you come back, so only the game you are actually
   * playing advances.
   */
  pausedAt: Record<string, number>

  /**
   * A separate purse per game, keyed by minigame id. Money earned at the
   * pond stays at the pond; the orchard cannot spend the woodlot's takings.
   * Each game therefore has to fund its own upgrades out of its own trade,
   * which is what makes an upgrade path mean something locally.
   */
  purses: Record<string, number>

  /**
   * The crate stays shared. It is plumbing - each game filters to its own
   * goods when selling - and keeping one inventory avoids every game
   * needing its own copy of the same item catalogue.
   */
  inventory: Record<string, number>

  movePlayerTo: (pos: GridPoint) => void
  openMinigame: (id: string) => void
  closeMinigame: () => void
  /** Freeze the game being left and thaw the one being entered. */
  switchGame: (next: string | null) => void
  setProgress: (id: string, value: unknown) => void

  /** What one game's purse holds. */
  coinsOf: (game: string) => number
  earn: (game: string, amount: number) => void
  /** Returns false (and changes nothing) when that game's purse is short. */
  spend: (game: string, amount: number) => boolean
  addItem: (key: string, qty?: number) => void
  /** Returns false (and changes nothing) unless every item is in stock. */
  takeItems: (needs: Record<string, number>) => boolean

  resetSave: () => void
  /** Roll back to the snapshot taken when this session loaded. */
  restoreBackup: () => boolean
}

/** Every game that trades. The kitten has no economy. */
export const EARNING_GAMES = ['farmstead', 'fishing', 'pottery', 'lumber', 'fruit', 'vet', 'doctor'] as const

/**
 * Seed money, per game. Each has to fund its own first upgrade out of its
 * own trade, so everyone starts with just enough to get going.
 */
function startingPurses(): Record<string, number> {
  return Object.fromEntries(EARNING_GAMES.map((g) => [g, 40]))
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
      progress: { ...initialProgress(), pottery: initialPottery(), lumber: initialLumber(), fruit: initialFruit(), vet: initialVet(), doctor: initialDoctor() },
      purses: startingPurses(),
      // Everything starts frozen; the first game you open is the first to run.
      pausedAt: Object.fromEntries(
        Object.keys({ ...initialProgress(), pottery: 0, lumber: 0, fruit: 0, vet: 0, doctor: 0 }).map((k) => [
          k,
          Date.now(),
        ])
      ),
      inventory: {},

      movePlayerTo: (pos) => {
        const tile = tileAt(get().tiles, pos)
        if (!tile || !tile.walkable) return
        set({ player: pos })

        // Auto-launch a minigame when the player steps onto a tile that has one.
        if (tile.minigameId) {
          get().switchGame(tile.minigameId)
        }
      },

      openMinigame: (id) => get().switchGame(id),
      closeMinigame: () => get().switchGame(null),

      /**
       * Move between games, freezing the one being left and thawing the one
       * being entered. Doing both in one place is what guarantees a game is
       * never left running in the background - there is only one way in and
       * one way out.
       */
      switchGame: (next) => {
        const { activeMinigameId, pausedAt, progress } = get()
        if (activeMinigameId === next) return
        const now = Date.now()

        const nextPaused = { ...pausedAt }
        let nextProgress = progress

        // Freeze the game being left, along with every key it owns.
        if (activeMinigameId) {
          for (const key of saveKeysOf(activeMinigameId)) nextPaused[key] = now
        }

        // Thaw the one being entered by pushing its timers past the gap.
        if (next) {
          const patched: Record<string, unknown> = { ...progress }
          let changed = false
          for (const key of saveKeysOf(next)) {
            const since = nextPaused[key]
            if (since === undefined) continue
            const away = now - since
            if (away > 0 && patched[key] !== undefined) {
              patched[key] = shiftTimestamps(patched[key], away)
              changed = true
            }
            delete nextPaused[key]
          }
          if (changed) nextProgress = patched
        }

        set({ activeMinigameId: next, pausedAt: nextPaused, progress: nextProgress })
      },

      setProgress: (id, value) =>
        set((state) => ({ progress: { ...state.progress, [id]: value } })),

      coinsOf: (game) => get().purses[game] ?? 0,

      earn: (game, amount) =>
        set((s) => ({ purses: { ...s.purses, [game]: (s.purses[game] ?? 0) + amount } })),

      spend: (game, amount) => {
        if ((get().purses[game] ?? 0) < amount) return false
        set((s) => ({ purses: { ...s.purses, [game]: (s.purses[game] ?? 0) - amount } }))
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
          const { progress, player, purses, inventory, pausedAt } = parsed.state
          set({
            progress: progress ?? {},
            player: player ?? { x: 0, y: 0 },
            purses: purses ?? startingPurses(),
            inventory: inventory ?? {},
            pausedAt: pausedAt ?? {},
            // Whatever was open before the rollback is not open now.
            activeMinigameId: null,
          })
          return true
        } catch {
          return false
        }
      },

      resetSave: () =>
        set({
          progress: { ...initialProgress(), pottery: initialPottery(), lumber: initialLumber(), fruit: initialFruit(), vet: initialVet(), doctor: initialDoctor() },
          player: { x: 0, y: 0 },
          purses: startingPurses(),
          inventory: {},
          pausedAt: {},
          activeMinigameId: null,
        }),
    }),
    {
      name: SAVE_KEY,
      version: 6,
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
        pausedAt: state.pausedAt,
        player: state.player,
        purses: state.purses,
        inventory: state.inventory,
      }),
      /**
       * v1 kept coins inside each minigame's own save; v2 split the farm
       * across four buildings; v3 folded the coop into the barn; v4 gave
       * every game its own purse again.
       *
       * Each step only ever moves value around - nothing is discarded, so
       * an old save keeps every animal, recipe and rod it earned.
       */
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, any>
        const progress = { ...((state.progress ?? {}) as Record<string, any>) }

        // v1 -> v2: pull the per-minigame purses into one shared wallet.
        if (version < 2) {
          const carried =
            (progress.fishing?.coins ?? 0) + (progress.farmstead?.coins ?? 0)
          state.coins = ((state.coins as number) ?? 0) + carried || 40
          state.inventory = state.inventory ?? {}
          Object.assign(progress, initialProgress())
        }

        // v2 -> v3: the coop was folded into the barn, so its birds move in.
        if (version < 3 && progress.coop) {
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

        // v3 -> v4: split the shared wallet evenly between the games that
        // trade. An even split keeps every total intact and leaves nothing
        // stranded with an empty purse it cannot refill.
        let purses = state.purses as Record<string, number> | undefined
        if (!purses) {
          const pot = (state.coins as number) ?? 0
          const each = Math.floor(pot / EARNING_GAMES.length)
          const remainder = pot - each * EARNING_GAMES.length
          purses = Object.fromEntries(EARNING_GAMES.map((g) => [g, each]))
          // The odd coins go to the farmstead rather than evaporating.
          purses.farmstead += remainder
          delete state.coins
        }

        // v4 -> v5, and any future trade: a game added after the split has
        // no purse yet. Seed it rather than leaving it on zero, which would
        // mean opening a brand-new trade with no float to stock it.
        for (const g of EARNING_GAMES) {
          if (purses[g] === undefined) purses[g] = 40
        }

        // v5 -> v6: games used to run on wall-clock time whether or not you
        // were in them. Freeze everything as of now, so the first visit to
        // each game catches up once and it pauses properly from then on.
        const pausedAt: Record<string, number> =
          (state.pausedAt as Record<string, number>) ??
          Object.fromEntries(Object.keys(progress).map((k) => [k, Date.now()]))

        return { ...state, progress, purses, pausedAt }
      },
    }
  )
)
