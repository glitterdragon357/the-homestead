/**
 * Iron Man Life - the suit, the workshop, and what you fly out into.
 *
 * Two halves that feed each other. Down in the workshop you build the
 * suit up a mark at a time; out over the city you find out whether what
 * you built is enough. Flying is one control - hold to climb, let go to
 * fall - because everything else is already happening at you.
 */

export const VIEW = { width: 960, height: 540 }

/* ------------------------------------------------------------------ */
/* The suit                                                            */
/* ------------------------------------------------------------------ */

export type SystemKey = 'reactor' | 'repulsors' | 'thrusters' | 'plating'

export interface Upgrade {
  label: string
  cost: number
  value: number
  blurb: string
}

export interface SuitSystem {
  key: SystemKey
  label: string
  unit: string
  levels: Upgrade[]
}

export const SYSTEMS: SuitSystem[] = [
  {
    key: 'reactor',
    label: 'Arc reactor',
    unit: 'power',
    levels: [
      { label: 'Car battery', cost: 0, value: 100, blurb: 'It works. That is the whole of what can be said for it.' },
      { label: 'Palladium core', cost: 180, value: 150, blurb: 'Half again the charge, and it runs warm.' },
      { label: 'Vibranium cell', cost: 520, value: 220, blurb: 'You stop thinking about the gauge.' },
      { label: 'New element', cost: 1200, value: 320, blurb: 'Clean, cold, and it does not run down like the others.' },
    ],
  },
  {
    key: 'repulsors',
    label: 'Repulsors',
    unit: 'damage',
    levels: [
      { label: 'Hand emitters', cost: 0, value: 26, blurb: 'Enough to knock something out of the air. Eventually.' },
      { label: 'Focused array', cost: 220, value: 44, blurb: 'Tighter beam, twice the bite.' },
      { label: 'Twin cannons', cost: 600, value: 68, blurb: 'Two at once, and they track on their own.' },
      { label: 'Overcharged pair', cost: 1400, value: 96, blurb: 'Most things do not get a second hit.' },
    ],
  },
  {
    key: 'thrusters',
    label: 'Thrusters',
    unit: 'lift',
    levels: [
      { label: 'Boot jets', cost: 0, value: 820, blurb: 'Up is a struggle and down is a certainty.' },
      { label: 'Balanced set', cost: 200, value: 1020, blurb: 'You can hold a line now.' },
      { label: 'Gimballed rig', cost: 560, value: 1260, blurb: 'Turns on a thought.' },
      { label: 'Full flight suite', cost: 1300, value: 1520, blurb: 'You go where you look and arrive early.' },
    ],
  },
  {
    key: 'plating',
    label: 'Plating',
    unit: 'integrity',
    levels: [
      { label: 'Scrap iron', cost: 0, value: 100, blurb: 'Heavy, and it dents if you look at it.' },
      { label: 'Gold titanium', cost: 240, value: 160, blurb: 'Lighter and far harder to mark.' },
      { label: 'Layered alloy', cost: 640, value: 240, blurb: 'Takes a missile and keeps going.' },
      { label: 'Nanoplate', cost: 1500, value: 340, blurb: 'Closes over a hit while you are still flying.' },
    ],
  },
]

export const SYSTEM_BY_KEY: Record<string, SuitSystem> = Object.fromEntries(
  SYSTEMS.map((s) => [s.key, s])
)

/** What the suit is called, from how much of it you have built. */
export const MARKS = [
  'Mark I',
  'Mark II',
  'Mark III',
  'Mark IV',
  'Mark V',
  'Mark VI',
  'Mark VII',
  'Mark VIII',
  'Mark IX',
  'Mark X',
  'Mark XI',
  'Mark XII',
  'Mark XIII',
]

export function markOf(save: IronSave): string {
  const built = SYSTEMS.reduce((n, s) => n + (save[s.key] ?? 0), 0)
  return MARKS[Math.min(built, MARKS.length - 1)]
}

export function statOf(save: IronSave, key: SystemKey): number {
  const sys = SYSTEM_BY_KEY[key]
  return sys.levels[Math.min(save[key] ?? 0, sys.levels.length - 1)].value
}

/* ------------------------------------------------------------------ */
/* Flying                                                              */
/* ------------------------------------------------------------------ */

/** How fast the city goes past, in world units a second. */
export const CRUISE = 300
export const GRAVITY = 1150
/** Power spent holding the thrusters open, a second. */
export const THRUST_DRAIN = 9
/** Power that comes back when you are gliding, a second. */
export const GLIDE_CHARGE = 6
/** What one unibeam costs, and what it does. */
export const UNIBEAM_COST = 34
export const UNIBEAM_DAMAGE = 140
export const UNIBEAM_COOLDOWN = 4000

export const CEILING = 40
export const FLOOR_Y = 470

/* ------------------------------------------------------------------ */
/* What is out there                                                   */
/* ------------------------------------------------------------------ */

export type ThingKind = 'drone' | 'missile' | 'debris' | 'flare' | 'civilian' | 'gunship'

export interface ThingSpec {
  kind: ThingKind
  label: string
  /** How much punishment it takes. Debris and flares cannot be shot. */
  hp: number
  /** What it does to you if you touch it. */
  harm: number
  /** How wide and tall it is, for hitting things. */
  r: number
  shootable: boolean
  colour: string
  note: string
}

export const THINGS: Record<ThingKind, ThingSpec> = {
  drone: { kind: 'drone', label: 'Drone', hp: 30, harm: 14, r: 20, shootable: true, colour: '#8d99a4', note: 'Hangs about at your height and waits for you.' },
  missile: { kind: 'missile', label: 'Missile', hp: 14, harm: 26, r: 14, shootable: true, colour: '#c2452f', note: 'Comes in fast and low. Shoot it or climb.' },
  gunship: { kind: 'gunship', label: 'Gunship', hp: 120, harm: 34, r: 38, shootable: true, colour: '#4a5560', note: 'Slow, heavy, and it takes a unibeam to hurry it along.' },
  debris: { kind: 'debris', label: 'Debris', hp: 0, harm: 18, r: 26, shootable: false, colour: '#6b5a42', note: 'Half a building, tumbling. Go round it.' },
  flare: { kind: 'flare', label: 'Fire', hp: 0, harm: 12, r: 30, shootable: false, colour: '#e0702f', note: 'A column of it, straight up from the street.' },
  civilian: { kind: 'civilian', label: 'Civilian', hp: 0, harm: 0, r: 22, shootable: false, colour: '#e8c9a8', note: 'Falling. Fly into them and you have them.' },
}

export interface Mission {
  key: string
  label: string
  brief: string
  /** How far you have to fly, in world units. */
  distance: number
  /** How thickly things turn up, and which. */
  density: number
  mix: ThingKind[]
  pay: number
  /** How badly the suit needs to be built before this is sensible. */
  wants: number
}

export const MISSIONS: Mission[] = [
  {
    key: 'patrol',
    label: 'Evening patrol',
    brief: 'Nothing on the scanner. Go and look anyway.',
    distance: 5200,
    density: 0.55,
    mix: ['drone', 'debris', 'civilian'],
    pay: 120,
    wants: 0,
  },
  {
    key: 'fire',
    label: 'Tower fire',
    brief: 'Forty floors alight and the stairwell is gone. Get them out.',
    distance: 6400,
    density: 0.8,
    mix: ['flare', 'civilian', 'debris', 'drone'],
    pay: 210,
    wants: 2,
  },
  {
    key: 'swarm',
    label: 'Drone swarm',
    brief: 'Somebody has bought a great many of somebody else\'s drones.',
    distance: 7000,
    density: 1.05,
    mix: ['drone', 'drone', 'missile', 'debris'],
    pay: 320,
    wants: 4,
  },
  {
    key: 'convoy',
    label: 'Convoy intercept',
    brief: 'Gunships over the river, heading for the bridge.',
    distance: 7800,
    density: 1.0,
    mix: ['gunship', 'missile', 'drone', 'civilian'],
    pay: 480,
    wants: 6,
  },
  {
    key: 'reactor',
    label: 'Reactor run',
    brief: 'The plant is going up. You have one pass to get everyone clear.',
    distance: 9000,
    density: 1.35,
    mix: ['flare', 'civilian', 'debris', 'missile', 'gunship'],
    pay: 720,
    wants: 8,
  },
]

export const MISSION_BY_KEY: Record<string, Mission> = Object.fromEntries(
  MISSIONS.map((m) => [m.key, m])
)

/** What a run was worth, all in. */
export function payout(mission: Mission, saved: number, downed: number, reached: boolean): number {
  const base = reached ? mission.pay : Math.round(mission.pay * 0.35)
  return base + saved * 34 + downed * 12
}

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export interface IronSave {
  reactor: number
  repulsors: number
  thrusters: number
  plating: number
  /** Missions finished, by key. */
  flown: Record<string, number>
  saved: number
  downed: number
  best: number
  music?: boolean
}

export function initialIron(): IronSave {
  return { reactor: 0, repulsors: 0, thrusters: 0, plating: 0, flown: {}, saved: 0, downed: 0, best: 0, music: true }
}

export function ironPending(s: IronSave | undefined) {
  if (!s) return null
  const done = Object.keys(s.flown ?? {}).length
  return done < MISSIONS.length ? { count: MISSIONS.length - done } : null
}
