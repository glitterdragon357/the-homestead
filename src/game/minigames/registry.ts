import type { ComponentType } from 'react'
import { PetCareMinigame } from './pets/PetCareMinigame'
import { petsPending, type PetSave } from './pets/petData'
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
import { OceanMinigame } from './ocean/OceanMinigame'
import { HorsesMinigame } from './horses/HorsesMinigame'
import { CityMinigame } from './city/CityMinigame'
import { IronManMinigame } from './ironman/IronManMinigame'
import { ironPending, type IronSave } from './ironman/ironData'
import { cityPending, type CitySave } from './city/cityData'
import { horsesPending, type HorseSave } from './horses/horseData'
import { SpaMinigame } from './spa/SpaMinigame'
import { spaPending, type SpaSave } from './spa/spaData'
import { SnakeDashMinigame } from './snake/SnakeDashMinigame'
import { JigsawMinigame } from './jigsaw/JigsawMinigame'
import { AllDragonsMinigame } from './dragons/AllDragonsMinigame'
import { ChutesMinigame } from './chutes/ChutesMinigame'
import { type DragonSave } from './dragons/dragonData'
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
  spa: {
    id: 'spa',
    name: 'Day Spa',
    description: 'Spa treatments, hair, makeup and outfits - build someone a look.',
    icon: '\u{1F485}',
    component: SpaMinigame,
    pending: (p, now) => spaPending(p.spa as SpaSave, now),
  },
  ironman: {
    id: 'ironman',
    name: 'Iron Man Life',
    description: 'Build the suit in the workshop, then fly it out over the city.',
    icon: '\u{1F9BE}',
    component: IronManMinigame,
    pending: (p) => ironPending(p.ironman as IronSave),
  },
  city: {
    id: 'city',
    name: 'City Explorers',
    description: 'Fly the streets, have a go on everything, and let yourself in.',
    icon: '\u{1F3D9}\uFE0F',
    component: CityMinigame,
    pending: (p) => cityPending(p.city as CitySave),
  },
  horses: {
    id: 'horses',
    name: 'Wild Horses',
    description: 'Gentle horses in open country, ride them, and take up hunting.',
    icon: '\u{1F40E}',
    component: HorsesMinigame,
    pending: (p, now) => horsesPending(p.horses as HorseSave, now),
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Explorers',
    description: 'Dive the shelf: hunt fish, or just go and see what is down there.',
    icon: '\u{1F93F}',
    component: OceanMinigame,
  },
  chutes: {
    id: 'chutes',
    name: 'The Chutes',
    description: 'A ball, a closed pipe, and a long way down. Nothing to hit - just the line.',
    icon: '\u{1F3B1}',
    component: ChutesMinigame,
  },
  dragons: {
    id: 'dragons',
    name: 'All Dragons',
    description: 'Mind a nursery full of babies who cannot hold on to what they can do.',
    icon: '\u{1F409}',
    component: AllDragonsMinigame,
    /**
     * Eggs waiting on the nursery floor. Urgent, because they are on a
     * floor with the wild ones and nobody is watching them.
     */
    pending: (progress) => {
      const save = progress.dragons as DragonSave | undefined
      const eggs = (save?.dragons ?? []).filter((d) => d.stage === 'egg' && d.house === null)
      return eggs.length > 0 ? { count: eggs.length, urgent: true } : null
    },
  },
  jigsaw: {
    id: 'jigsaw',
    name: 'Jigsaw',
    description: 'A picture cut up and tipped out. Drag the pieces back where they belong.',
    icon: '\u{1F9E9}',
    component: JigsawMinigame,
  },
  snakedash: {
    id: 'snakedash',
    name: 'Snake Dash',
    description: 'Grow on pellets, eat anything below your level, dodge anything above it.',
    icon: '\u{1F40D}',
    component: SnakeDashMinigame,
  },
  pets: {
    id: 'pets',
    name: 'Pet Care',
    description: 'A houseful of animals: tap a thing and they go and use it.',
    icon: '🐾',
    component: PetCareMinigame,
    pending: (p) => petsPending(p.pets as PetSave),
  },
}

/** Recipes are referenced by the kitchen badge; re-exported for convenience. */
export { RECIPES }
