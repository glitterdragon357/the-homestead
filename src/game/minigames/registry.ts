import type { ComponentType } from 'react'
import { KittenCareMinigame } from './kitten/KittenCareMinigame'
import { FishingMinigame } from './fishing/FishingMinigame'
import { CoopMinigame } from './farm/CoopMinigame'
import { BarnMinigame } from './farm/BarnMinigame'
import { FieldMinigame } from './farm/FieldMinigame'
import { KitchenMinigame } from './farm/KitchenMinigame'
import { MarketMinigame } from './market/MarketMinigame'
import {
  RECIPES,
  cropProgress,
  levelOf,
  penPending,
  type FieldSave,
  type KitchenSave,
  type PenSave,
} from './farm/farmData'

/**
 * A badge drawn on this minigame's map tile. The map is the hub now, so a
 * building has to be able to say "something is waiting here" without the
 * player opening it.
 */
export interface PendingBadge {
  count: number
  /** Urgent badges render red rather than amber - an escaped goat, say. */
  urgent?: boolean
}

export interface MinigameDefinition {
  id: string
  name: string
  /** One-line blurb shown on the hub's minigame card. */
  description: string
  /** Emoji shown on the hub card - swap for real art later. */
  icon: string
  /**
   * The React component rendered full-screen when this minigame is
   * launched. Receives `onComplete` / `onExit` so it can hand control
   * back to the hub without knowing anything about how it was launched.
   */
  component: ComponentType<MinigameProps>
  /**
   * Optional: given this minigame's saved progress, how many things are
   * waiting for the player right now. Pure and cheap - it runs for every
   * tile on every map repaint.
   */
  pending?: (progress: unknown, now: number) => PendingBadge | null
}

export interface MinigameProps {
  onComplete: (result?: unknown) => void
  onExit: () => void
}

/**
 * Add new minigames here. Each one is a fully self-contained component -
 * it can be plain React/DOM or mount its own Pixi Application internally
 * for anything more animation-heavy. Adding an entry here plus a tile in
 * tiles.ts is enough to put it on the map.
 */
export const MINIGAME_REGISTRY: Record<string, MinigameDefinition> = {
  coop: {
    id: 'coop',
    name: 'Chicken Coop',
    description: 'Hens, eggs and chicks.',
    icon: '🐔',
    component: CoopMinigame,
    pending: (p, now) => penPending('coop', p as PenSave, now),
  },
  barn: {
    id: 'barn',
    name: 'Barn',
    description: 'Goats and cows - milk them, and keep the goats entertained.',
    icon: '🐄',
    component: BarnMinigame,
    pending: (p, now) => penPending('barn', p as PenSave, now),
  },
  field: {
    id: 'field',
    name: 'Field',
    description: 'Wheat and corn to plant, water and harvest.',
    icon: '🌾',
    component: FieldMinigame,
    pending: (p, now) => {
      const save = p as FieldSave | undefined
      if (!save?.plots) return null
      const speed = levelOf('field', save.level ?? 0).speedMult
      const ripe = save.plots.filter(
        (plot) => plot.crop && cropProgress(plot, now, speed) >= 100
      ).length
      return ripe > 0 ? { count: ripe } : null
    },
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Turn raw goods into dishes worth far more.',
    icon: '🍳',
    component: KitchenMinigame,
    pending: (p, now) => {
      const save = p as KitchenSave | undefined
      if (!save?.cooking?.length) return null
      const done = save.cooking.filter((c) => now >= c.doneAt).length
      return done > 0 ? { count: done } : null
    },
  },
  market: {
    id: 'market',
    name: 'Market',
    description: 'Sell everything you gather; buy stock, tackle and upgrades.',
    icon: '🏪',
    component: MarketMinigame,
  },
  fishing: {
    id: 'fishing',
    name: 'Fishing Spot',
    description: 'Hook and reel in fish for the crate.',
    icon: '🎣',
    component: FishingMinigame,
  },
  kitten: {
    id: 'kitten',
    name: 'Kitten Care',
    description: 'Tend to the kitten through day and night as it grows up.',
    icon: '🐱',
    component: KittenCareMinigame,
  },
}

/** Recipes are referenced by the kitchen badge; re-exported for convenience. */
export { RECIPES }
