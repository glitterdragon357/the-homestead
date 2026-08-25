import type { ComponentType } from 'react'
import { KittenCareMinigame } from './kitten/KittenCareMinigame'
import { FishingMinigame } from './fishing/FishingMinigame'
import { FarmsteadMinigame, farmsteadPending } from './farm/FarmsteadMinigame'
import { RECIPES } from './farm/farmData'

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
   * Optional: given the whole saved-progress map, how many things are
   * waiting for the player right now. It gets everything rather than just
   * this minigame's slice because the farmstead's data lives under
   * several keys. Pure and cheap - it runs on every map repaint.
   */
  pending?: (progress: Record<string, unknown>, now: number) => PendingBadge | null
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
  farmstead: {
    id: 'farmstead',
    name: 'Farmstead',
    description: 'Animals, field, kitchen, market and upgrades - the whole farm.',
    icon: '🚜',
    component: FarmsteadMinigame,
    pending: farmsteadPending,
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
