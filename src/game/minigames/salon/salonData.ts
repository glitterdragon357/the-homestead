/**
 * The pet salon.
 *
 * Not another diagnosis game. Here you know exactly what is wrong - the
 * dog is filthy - and the game is doing the work in a sensible order
 * while keeping the animal calm enough to sit still.
 *
 * Two systems interact. GROOMING has an order: you cannot bath a matted
 * coat, cannot clip a wet one. That part is forgiving - a step that is
 * not ready simply tells you why and costs nothing. ANXIETY is the real
 * dial: every step winds the animal up, a wound-up animal takes far
 * longer to work on, and soothing costs time you could have spent
 * grooming. The tip at the end depends on how calm they leave, so rushing
 * is possible and rarely pays best.
 */

export type StepKey = 'demat' | 'brush' | 'bath' | 'dry' | 'clip' | 'nails' | 'bow'

export interface Step {
  key: StepKey
  label: string
  /** Seconds of work, before tools. */
  ms: number
  /** How much this winds the animal up. */
  anxiety: number
  /** Steps that must be done first, if the coat requires them. */
  after: StepKey[]
  /** Shown when clicked too early. */
  tooEarly: string
}

export const STEPS: Step[] = [
  { key: 'demat', label: 'De-mat', ms: 14_000, anxiety: 30, after: [], tooEarly: '' },
  { key: 'brush', label: 'Brush', ms: 8_000, anxiety: 10, after: ['demat'], tooEarly: 'The mats have to come out before a brush will go through.' },
  { key: 'bath', label: 'Bath', ms: 12_000, anxiety: 25, after: ['demat', 'brush'], tooEarly: 'Washing a tangled coat only sets the knots.' },
  { key: 'dry', label: 'Dry', ms: 11_000, anxiety: 30, after: ['bath'], tooEarly: 'Nothing to dry yet.' },
  { key: 'clip', label: 'Clip', ms: 13_000, anxiety: 20, after: ['dry'], tooEarly: 'Never clip a wet coat - it drags and pulls.' },
  { key: 'nails', label: 'Nails', ms: 7_000, anxiety: 20, after: [], tooEarly: '' },
  { key: 'bow', label: 'Bow', ms: 4_000, anxiety: 5, after: ['demat', 'brush', 'bath', 'dry', 'clip', 'nails'], tooEarly: 'Finish the grooming first, then the ribbon.' },
]

export const STEP_BY_KEY: Record<StepKey, Step> = Object.fromEntries(
  STEPS.map((s) => [s.key, s])
) as Record<StepKey, Step>

export interface Coat {
  key: string
  label: string
  /** Which steps this coat needs. Order comes from the step rules. */
  needs: StepKey[]
  fee: number
}

export const COATS: Coat[] = [
  { key: 'short', label: 'Short coat', needs: ['brush', 'bath', 'dry', 'nails'], fee: 58 },
  { key: 'wiry', label: 'Wiry coat', needs: ['brush', 'bath', 'dry', 'clip'], fee: 74 },
  { key: 'curly', label: 'Curly coat', needs: ['brush', 'bath', 'dry', 'clip', 'bow'], fee: 88 },
  { key: 'long', label: 'Long coat', needs: ['brush', 'bath', 'dry', 'clip', 'nails', 'bow'], fee: 104 },
  { key: 'matted', label: 'Matted coat', needs: ['demat', 'brush', 'bath', 'dry', 'clip', 'nails'], fee: 132 },
]

export const COAT_BY_KEY: Record<string, Coat> = Object.fromEntries(
  COATS.map((c) => [c.key, c])
)

/** Can this step be started yet, given what the coat needs and what is done? */
export function stepReady(step: StepKey, needs: StepKey[], done: StepKey[]): boolean {
  if (!needs.includes(step)) return false
  if (done.includes(step)) return false
  return STEP_BY_KEY[step].after.every((pre) => !needs.includes(pre) || done.includes(pre))
}

/** Which required step is blocking this one, for the explanation. */
export function blockedBy(step: StepKey, needs: StepKey[], done: StepKey[]): StepKey | null {
  return (
    STEP_BY_KEY[step].after.find((pre) => needs.includes(pre) && !done.includes(pre)) ?? null
  )
}

export const PETS = ['dog', 'cat', 'rabbit', 'poodle'] as const
export type PetKind = (typeof PETS)[number]

/** Anxiety at or above this and the animal will not settle. */
export const FRETFUL_AT = 70
/** How much longer every step takes while they are fretting. */
export const FRETFUL_SLOWDOWN = 2.1

export interface KitLevel {
  label: string
  cost: number
  /** Multiplier on step times - lower is faster. */
  speedMult: number
  blurb: string
}

export const KITS: KitLevel[] = [
  { label: 'Comb and Bucket', cost: 0, speedMult: 1, blurb: 'Everything by hand.' },
  { label: 'Grooming Table', cost: 200, speedMult: 0.8, blurb: 'Steadier work, quicker.' },
  { label: 'Powered Dryer', cost: 520, speedMult: 0.62, blurb: 'Quicker again, especially drying.' },
  { label: 'Full Parlour', cost: 1100, speedMult: 0.45, blurb: 'Every tool to hand.' },
]

export interface TreatLevel {
  label: string
  cost: number
  /** Anxiety removed per soothe. */
  calm: number
  ms: number
  blurb: string
}

export const TREATS: TreatLevel[] = [
  { label: 'Kind Words', cost: 0, calm: 25, ms: 7_000, blurb: 'Free, and slow.' },
  { label: 'Biscuit Tin', cost: 160, calm: 40, ms: 6_000, blurb: 'Settles them faster.' },
  { label: 'Liver Treats', cost: 420, calm: 58, ms: 5_000, blurb: 'Works on almost anyone.' },
  { label: 'Calming Spray', cost: 880, calm: 80, ms: 4_000, blurb: 'Near-instant calm.' },
]

export interface SalonLevel {
  label: string
  cost: number
  chairs: number
  arrivalMs: number
  blurb: string
}

export const SALONS: SalonLevel[] = [
  { label: 'Kitchen Sink', cost: 0, chairs: 2, arrivalMs: 45_000, blurb: 'Two at a time, and a wet floor.' },
  { label: 'Back Room', cost: 240, chairs: 3, arrivalMs: 34_000, blurb: 'Three chairs, word gets around.' },
  { label: 'High Street Salon', cost: 600, chairs: 4, arrivalMs: 25_000, blurb: 'Four chairs and a steady book.' },
  { label: 'Grooming Parlour', cost: 1250, chairs: 6, arrivalMs: 17_000, blurb: 'Six chairs, never empty.' },
]

/** Tip as a share of the fee when the animal leaves perfectly calm. */
export const MAX_TIP = 0.5

// --- save shape -------------------------------------------------------

export interface SalonPet {
  id: number
  kind: PetKind
  coat: string
  name: string
  arrivedAt: number
  done: StepKey[]
  anxiety: number
  /** A step or soothe in progress. */
  busy?: { step: StepKey | 'soothe'; doneAt: number }
}

export interface SalonSave {
  kitLevel: number
  treatLevel: number
  salonLevel: number
  nextId: number
  pets: SalonPet[]
  nextArrivalAt: number
  groomed: number
}

const NAMES = ['Biscuit', 'Pepper', 'Marbles', 'Waffle', 'Tuppence', 'Bramble', 'Onion', 'Clover', 'Mittens', 'Rufus']

export function makePet(id: number, now: number): SalonPet {
  const coat = COATS[Math.floor(Math.random() * COATS.length)]
  return {
    id,
    kind: PETS[Math.floor(Math.random() * PETS.length)],
    coat: coat.key,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    arrivedAt: now,
    done: [],
    // They arrive already a bit unsettled, more so if badly matted.
    anxiety: 10 + Math.floor(Math.random() * 20) + (coat.key === 'matted' ? 15 : 0),
  }
}

export function initialSalon(): SalonSave {
  const now = Date.now()
  return {
    kitLevel: 0,
    treatLevel: 0,
    salonLevel: 0,
    nextId: 2,
    pets: [makePet(1, now)],
    nextArrivalAt: now + SALONS[0].arrivalMs,
    groomed: 0,
  }
}

export function kitOf(s: SalonSave | undefined): KitLevel {
  return KITS[Math.min(s?.kitLevel ?? 0, KITS.length - 1)]
}
export function treatOf(s: SalonSave | undefined): TreatLevel {
  return TREATS[Math.min(s?.treatLevel ?? 0, TREATS.length - 1)]
}
export function salonOf(s: SalonSave | undefined): SalonLevel {
  return SALONS[Math.min(s?.salonLevel ?? 0, SALONS.length - 1)]
}

/** Clamped so retuning arrival speed takes effect immediately. */
export function nextArrivalDue(s: SalonSave, now: number): number {
  return Math.min(s.nextArrivalAt ?? now, now + salonOf(s).arrivalMs)
}

/** How long a step takes right now, allowing for a fretting animal. */
export function stepDuration(base: number, anxiety: number, speedMult: number): number {
  const fretting = anxiety >= FRETFUL_AT ? FRETFUL_SLOWDOWN : 1
  return Math.round(base * speedMult * fretting)
}

export function isFinished(pet: SalonPet): boolean {
  const needs = COAT_BY_KEY[pet.coat]?.needs ?? []
  return needs.every((n) => pet.done.includes(n))
}

/** Fee plus a tip that shrinks the more wound-up they still are. */
export function payoutFor(pet: SalonPet): { fee: number; tip: number } {
  const fee = COAT_BY_KEY[pet.coat]?.fee ?? 0
  const calm = Math.max(0, 1 - pet.anxiety / 100)
  return { fee, tip: Math.round(fee * MAX_TIP * calm) }
}

/** What the salon has waiting, for the map badge. */
export function salonPending(s: SalonSave | undefined, now: number) {
  if (!s) return null
  const idle = (s.pets ?? []).filter((p) => !p.busy || now >= p.busy.doneAt).length
  return idle > 0 ? { count: idle } : null
}
