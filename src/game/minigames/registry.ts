import type { ComponentType } from 'react'
import { FarmingMinigame } from './farming/FarmingMinigame'
import { KittenCareMinigame } from './kitten/KittenCareMinigame'
import { FishingMinigame } from './fishing/FishingMinigame'

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
}

export interface MinigameProps {
  onComplete: (result?: unknown) => void
  onExit: () => void
}

/**
 * Add new minigames here. Each one is a fully self-contained component -
 * it can be plain React/DOM (like FarmingMinigame) or mount its own Pixi
 * Application internally for anything more animation-heavy. Adding an
 * entry here is enough to make it show up on the hub screen.
 */
export const MINIGAME_REGISTRY: Record<string, MinigameDefinition> = {
  farming: {
    id: 'farming',
    name: 'Tend the Vegetable Patch',
    description: 'Plant, water, and harvest a 3x3 patch of crops.',
    icon: '🌱',
    component: FarmingMinigame,
  },
  kitten: {
    id: 'kitten',
    name: 'Kitten Care',
    description: 'Tend to the kitten through day and night as it grows up.',
    icon: '🐱',
    component: KittenCareMinigame,
  },
  fishing: {
    id: 'fishing',
    name: 'Fishing Spot',
    description: 'Hook and reel in fish, then spend coins on rod upgrades.',
    icon: '🎣',
    component: FishingMinigame,
  },
}
