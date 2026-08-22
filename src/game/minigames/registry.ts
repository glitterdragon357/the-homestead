import type { ComponentType } from 'react'
import { FarmingMinigame } from './farming/FarmingMinigame'

export interface MinigameDefinition {
  id: string
  name: string
  /**
   * The React component rendered inside the full-screen overlay.
   * Receives `onComplete` / `onExit` so it can hand control back to the
   * homestead without knowing anything about how it was launched.
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
 * Application internally for anything more animation-heavy.
 */
export const MINIGAME_REGISTRY: Record<string, MinigameDefinition> = {
  farming: {
    id: 'farming',
    name: 'Tend the Vegetable Patch',
    component: FarmingMinigame,
  },
}
