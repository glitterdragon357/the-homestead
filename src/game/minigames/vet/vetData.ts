/**
 * The veterinary surgery.
 *
 * Every other trade on the homestead is gather-then-craft. This one is a
 * guessing game with a way out: a patient arrives showing ONE symptom, and
 * every symptom belongs to exactly two ailments - so one symptom always
 * leaves you with a choice of two, and the second symptom always settles
 * it. Examining reveals the second symptom but costs time.
 *
 * That is the whole decision. Treat on a hunch and you are right half the
 * time but fast; examine first and you are certain but slower, and the
 * patient's patience is running down either way.
 */

export type SymptomKey =
  | 'limping'
  | 'swelling'
  | 'patchy coat'
  | 'itching'
  | 'restless'
  | 'off feed'
  | 'drooling'
  | 'dull eyes'

export interface Treatment {
  id: string
  label: string
  /** What a unit costs to restock. */
  cost: number
  /** Which art form draws it. */
  art: 'bottle' | 'splint' | 'tin' | 'knife'
  tint: string
  blurb: string
}

export const TREATMENTS: Treatment[] = [
  { id: 'splint', label: 'Splint', cost: 14, art: 'splint', tint: '#c9a874', blurb: 'Padded and strapped.' },
  { id: 'antiseptic', label: 'Antiseptic', cost: 20, art: 'bottle', tint: '#b8437a', blurb: 'Stings, then heals.' },
  { id: 'mite salve', label: 'Mite salve', cost: 16, art: 'tin', tint: '#d9a24b', blurb: 'Greasy, and it works.' },
  { id: 'flea powder', label: 'Flea powder', cost: 13, art: 'tin', tint: '#b6c2cc', blurb: 'Dust it well into the coat.' },
  { id: 'colic tonic', label: 'Colic tonic', cost: 18, art: 'bottle', tint: '#7cb342', blurb: 'Settles a churning gut.' },
  { id: 'chalk drench', label: 'Chalk drench', cost: 15, art: 'bottle', tint: '#e4ddd0', blurb: 'Sweetens a sour stomach.' },
  { id: 'tooth file', label: 'Tooth file', cost: 19, art: 'knife', tint: '#8d99a4', blurb: 'Rasps down the bad edge.' },
  { id: 'hoof knife', label: 'Hoof knife', cost: 12, art: 'knife', tint: '#c2cbd4', blurb: 'Pares back the sore spot.' },
]

export const TREATMENT_BY_ID: Record<string, Treatment> = Object.fromEntries(
  TREATMENTS.map((t) => [t.id, t])
)

export interface Ailment {
  id: string
  label: string
  /** Exactly two, and every symptom is shared with exactly one other ailment. */
  symptoms: [SymptomKey, SymptomKey]
  treatmentId: string
  /** What curing it pays. */
  fee: number
}

/**
 * Eight ailments over eight symptoms, arranged as a ring: each ailment
 * shares one symptom with the ailment before it and one with the ailment
 * after. That makes every symptom belong to exactly two ailments, which
 * is the property the whole game rests on - one symptom is always a
 * coin-flip, two symptoms are always decisive.
 *
 * Change one pair and the puzzle quietly breaks (a symptom with only one
 * owner is a dead giveaway; one with three cannot be settled by examining
 * at all), so the ring is checked rather than trusted.
 */
export const AILMENTS: Ailment[] = [
  { id: 'sprain', label: 'Sprained leg', symptoms: ['limping', 'swelling'], treatmentId: 'splint', fee: 62 },
  { id: 'mange', label: 'Mange', symptoms: ['swelling', 'patchy coat'], treatmentId: 'antiseptic', fee: 84 },
  { id: 'mites', label: 'Mites', symptoms: ['patchy coat', 'itching'], treatmentId: 'mite salve', fee: 58 },
  { id: 'fleas', label: 'Fleas', symptoms: ['itching', 'restless'], treatmentId: 'flea powder', fee: 48 },
  { id: 'colic', label: 'Colic', symptoms: ['restless', 'off feed'], treatmentId: 'colic tonic', fee: 78 },
  { id: 'sour stomach', label: 'Sour stomach', symptoms: ['off feed', 'drooling'], treatmentId: 'chalk drench', fee: 66 },
  { id: 'bad tooth', label: 'Bad tooth', symptoms: ['drooling', 'dull eyes'], treatmentId: 'tooth file', fee: 72 },
  { id: 'footrot', label: 'Footrot', symptoms: ['dull eyes', 'limping'], treatmentId: 'hoof knife', fee: 90 },
]

export const AILMENT_BY_ID: Record<string, Ailment> = Object.fromEntries(
  AILMENTS.map((a) => [a.id, a])
)

/** Which ailments share a given symptom - the candidate list a hunch works from. */
export function ailmentsWith(symptom: SymptomKey): Ailment[] {
  return AILMENTS.filter((a) => a.symptoms.includes(symptom))
}

/** Patients are whatever the countryside brings in. */
export const PATIENTS = ['cow', 'goat', 'chicken', 'sheep', 'dog', 'cat'] as const
export type PatientAnimal = (typeof PATIENTS)[number]

export interface KitLevel {
  label: string
  cost: number
  /** How long an examination takes. */
  examineMs: number
  blurb: string
}

export const KITS: KitLevel[] = [
  { label: 'Bare Hands', cost: 0, examineMs: 25_000, blurb: 'Look, prod, and hope.' },
  { label: 'Stethoscope', cost: 140, examineMs: 16_000, blurb: 'Listen in. Examinations go quicker.' },
  { label: 'Thermometer & Scope', cost: 380, examineMs: 9_000, blurb: 'Faster again.' },
  { label: 'Microscope', cost: 850, examineMs: 4_000, blurb: 'Near-instant diagnosis.' },
]

export interface SurgeryLevel {
  label: string
  cost: number
  /** Patients in the waiting room at once. */
  beds: number
  /** Time between arrivals. */
  arrivalMs: number
  blurb: string
}

export const SURGERIES: SurgeryLevel[] = [
  { label: 'Kitchen Table', cost: 0, beds: 2, arrivalMs: 40_000, blurb: 'Two at a time, and a lot of mess.' },
  { label: 'Back Room', cost: 200, beds: 3, arrivalMs: 30_000, blurb: 'Three beds, word gets around.' },
  { label: 'Village Surgery', cost: 520, beds: 4, arrivalMs: 22_000, blurb: 'Four beds and a steady queue.' },
  { label: 'Animal Hospital', cost: 1100, beds: 6, arrivalMs: 15_000, blurb: 'Six beds, never a quiet moment.' },
]

/** How long a patient waits before giving up and going home. */
export const PATIENCE_MS = 260_000
/** A wrong treatment costs this share of the fee. */
export const MISS_PENALTY = 0.35
/** Two wrong guesses and they walk out. */
export const MAX_MISSES = 2

// --- save shape -------------------------------------------------------

export interface Patient {
  id: number
  animal: PatientAnimal
  ailmentId: string
  arrivedAt: number
  /** Which of the ailment's two symptoms is visible without examining. */
  shownSymptom: SymptomKey
  /** Set once examining finishes, revealing the second symptom. */
  examined: boolean
  /** When an in-progress examination finishes, if one is running. */
  examiningUntil?: number
  misses: number
}

export interface VetSave {
  kitLevel: number
  surgeryLevel: number
  nextId: number
  patients: Patient[]
  nextArrivalAt: number
  /** Treatments in the cupboard, by id. */
  supplies: Record<string, number>
  /** Animals cured, for the ledger. */
  cured: number
}

export function initialVet(): VetSave {
  const now = Date.now()
  return {
    kitLevel: 0,
    surgeryLevel: 0,
    nextId: 2,
    // Start with one patient already waiting so the door is never silent.
    patients: [makePatient(1, now)],
    nextArrivalAt: now + SURGERIES[0].arrivalMs,
    // A few of everything, so the first cases are treatable before restocking.
    supplies: Object.fromEntries(TREATMENTS.map((t) => [t.id, 1])),
    cured: 0,
  }
}

export function makePatient(id: number, now: number): Patient {
  const ailment = AILMENTS[Math.floor(Math.random() * AILMENTS.length)]
  const animal = PATIENTS[Math.floor(Math.random() * PATIENTS.length)]
  return {
    id,
    animal,
    ailmentId: ailment.id,
    arrivedAt: now,
    shownSymptom: ailment.symptoms[Math.floor(Math.random() * 2)],
    examined: false,
    misses: 0,
  }
}

/**
 * When the next patient is actually due.
 *
 * Clamped to the current arrival interval so a schedule written under an
 * older, slower setting cannot keep the door shut longer than it should -
 * without this, retuning arrival speed only takes effect after the stale
 * wait has run down.
 */
export function nextArrivalDue(s: VetSave, now: number): number {
  return Math.min(s.nextArrivalAt ?? now, now + surgeryOf(s).arrivalMs)
}

export function kitOf(s: VetSave | undefined): KitLevel {
  return KITS[Math.min(s?.kitLevel ?? 0, KITS.length - 1)]
}
export function surgeryOf(s: VetSave | undefined): SurgeryLevel {
  return SURGERIES[Math.min(s?.surgeryLevel ?? 0, SURGERIES.length - 1)]
}

/** Fee after any wrong guesses have been docked. */
export function feeFor(patient: Patient): number {
  const base = AILMENT_BY_ID[patient.ailmentId]?.fee ?? 0
  return Math.max(1, Math.round(base * (1 - MISS_PENALTY * patient.misses)))
}

/** What the surgery has waiting, for the map badge. */
export function vetPending(s: VetSave | undefined, now: number) {
  if (!s) return null
  const waiting = (s.patients ?? []).filter(
    (p) => !p.examiningUntil || now >= p.examiningUntil
  ).length
  if (!waiting) return null
  // A patient about to walk out is worth a red badge.
  const urgent = (s.patients ?? []).some(
    (p) => now - p.arrivedAt > PATIENCE_MS * 0.75
  )
  return { count: waiting, urgent }
}
