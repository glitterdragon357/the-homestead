import type { ComponentType } from 'react'
import { KittenCareMinigame } from './kitten/KittenCareMinigame'
import { FishingMinigame } from './fishing/FishingMinigame'
import { FarmsteadMinigame, farmsteadPending } from './farm/FarmsteadMinigame'
import { RECIPES } from './farm/farmData'
import { PotteryMinigame } from './pottery/PotteryMinigame'
import { potteryPending, type PotterySave } from './pottery/potteryData'
import { LumberMinigame } from './lumber/LumberMinigame'
import { lumberPending, type LumberSave } from './lumber/lumberData'
import { FruitMinigame } from './fruit/FruitMinigame'
import { fruitPending, type FruitSave } from './fruit/fruitData'
import { VetMinigame } from './vet/VetMinigame'
import { vetPending, type VetSave } from './vet/vetData'
import { DoctorMinigame } from './doctor/DoctorMinigame'
import { doctorPending, type DoctorSave } from './doctor/doctorData'
import { SalonMinigame } from './salon/SalonMinigame'
import { salonPending, type SalonSave } from './salon/salonData'

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
  pottery: {
    id: 'pottery',
    name: 'Pottery',
    description: 'Dig riverside clay, wedge it, and throw it into pottery.',
    icon: '🏺',
    component: PotteryMinigame,
    pending: (p, now) => potteryPending(p.pottery as PotterySave, now),
  },
  lumber: {
    id: 'lumber',
    name: 'Woodlot',
    description: 'Fell trees, haul the logs home, then burn or carve them.',
    icon: '🌲',
    component: LumberMinigame,
    pending: (p, now) => lumberPending(p.lumber as LumberSave, now),
  },
  fruit: {
    id: 'fruit',
    name: 'Orchard',
    description: 'Pick berries and fruit, then bake pies, tarts and jams.',
    icon: '🍎',
    component: FruitMinigame,
    pending: (p, now) => fruitPending(p.fruit as FruitSave, now),
  },
  vet: {
    id: 'vet',
    name: 'Vet',
    description: 'Diagnose sick animals from their symptoms, then treat them.',
    icon: '🩺',
    component: VetMinigame,
    pending: (p, now) => vetPending(p.vet as VetSave, now),
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    description: 'Narrow a complaint down with tests, then prescribe.',
    icon: '⚕️',
    component: DoctorMinigame,
    pending: (p, now) => doctorPending(p.doctor as DoctorSave, now),
  },
  salon: {
    id: 'salon',
    name: 'Pet Salon',
    description: 'Groom pets in the right order while keeping them calm.',
    icon: '✂️',
    component: SalonMinigame,
    pending: (p, now) => salonPending(p.salon as SalonSave, now),
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
