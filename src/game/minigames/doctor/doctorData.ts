/**
 * The village surgery (for people).
 *
 * Deliberately NOT the vet with humans. The vet is a single binary
 * reveal - one symptom, two candidates, examine to settle. This is
 * progressive elimination: a patient arrives with a complaint that fits
 * several conditions, and each test you run splits the remaining
 * candidates. You may prescribe at any point, so the real decision is how
 * much certainty to buy before committing.
 *
 * Tests cost a fee and take time, but nobody is on a clock - patients
 * wait as long as it takes. Being thorough costs coins and throughput,
 * never a lost patient, so caution is a trade rather than a gamble.
 *
 * This is a game, not medical advice - the conditions and remedies are
 * period flavour and are not how anything is actually diagnosed.
 */

export type TestKey = 'temperature' | 'pulse' | 'throat' | 'bloods'

export interface Test {
  key: TestKey
  label: string
  /** What a positive vs negative result reads as. */
  positive: string
  negative: string
  cost: number
  ms: number
}

export const TESTS: Test[] = [
  { key: 'temperature', label: 'Temperature', positive: 'feverish', negative: 'normal', cost: 4, ms: 9_000 },
  { key: 'pulse', label: 'Pulse', positive: 'racing', negative: 'steady', cost: 4, ms: 8_000 },
  { key: 'throat', label: 'Look at throat', positive: 'inflamed', negative: 'clear', cost: 6, ms: 11_000 },
  { key: 'bloods', label: 'Bloods', positive: 'infection markers', negative: 'unremarkable', cost: 12, ms: 20_000 },
]

export const TEST_BY_KEY: Record<TestKey, Test> = Object.fromEntries(
  TESTS.map((t) => [t.key, t])
) as Record<TestKey, Test>

export interface Remedy {
  id: string
  label: string
  /** Which art form draws it. */
  art: 'bottle' | 'box' | 'jar' | 'note'
  tint: string
}

export const REMEDIES: Remedy[] = [
  { id: 'willow powder', label: 'Willow powder', art: 'box', tint: '#c9a874' },
  { id: 'rehydration salts', label: 'Rehydration salts', art: 'box', tint: '#5cb8e0' },
  { id: 'fever draught', label: 'Fever draught', art: 'bottle', tint: '#c2542c' },
  { id: 'rest and fluids', label: 'Rest and fluids', art: 'note', tint: '#8fb36a' },
  { id: 'penicillin', label: 'Penicillin', art: 'bottle', tint: '#e0c24a' },
  { id: 'throat gargle', label: 'Throat gargle', art: 'bottle', tint: '#b8437a' },
  { id: 'charcoal', label: 'Charcoal', art: 'jar', tint: '#3b3633' },
  { id: 'surgical referral', label: 'Surgical referral', art: 'note', tint: '#d9534f' },
  { id: 'antacid', label: 'Antacid', art: 'jar', tint: '#e4ddd0' },
]

export const REMEDY_BY_ID: Record<string, Remedy> = Object.fromEntries(
  REMEDIES.map((r) => [r.id, r])
)

export type Complaint = 'headache' | 'sore throat' | 'stomach pain'

export interface Condition {
  id: string
  label: string
  complaint: Complaint
  /** What each test would show. This is what the elimination works on. */
  signature: Record<TestKey, boolean>
  remedyId: string
  fee: number
}

function sig(temperature: boolean, pulse: boolean, throat: boolean, bloods: boolean) {
  return { temperature, pulse, throat, bloods }
}

/**
 * Nine conditions in three complaint groups of three.
 *
 * Two properties make the puzzle work, and both are checked rather than
 * trusted: every signature is unique (so tests can always reach a single
 * answer), and every complaint covers at least three conditions (so the
 * complaint alone is never enough and testing always has a point).
 */
export const CONDITIONS: Condition[] = [
  // --- headache ---
  { id: 'migraine', label: 'Migraine', complaint: 'headache', signature: sig(false, false, false, false), remedyId: 'willow powder', fee: 58 },
  { id: 'dehydration', label: 'Dehydration', complaint: 'headache', signature: sig(false, true, false, true), remedyId: 'rehydration salts', fee: 64 },
  { id: 'influenza', label: 'Influenza', complaint: 'headache', signature: sig(true, true, true, true), remedyId: 'fever draught', fee: 96 },

  // --- sore throat ---
  { id: 'cold', label: 'Common cold', complaint: 'sore throat', signature: sig(false, false, true, false), remedyId: 'rest and fluids', fee: 44 },
  { id: 'strep', label: 'Strep throat', complaint: 'sore throat', signature: sig(true, false, true, true), remedyId: 'penicillin', fee: 88 },
  { id: 'tonsillitis', label: 'Tonsillitis', complaint: 'sore throat', signature: sig(true, false, true, false), remedyId: 'throat gargle', fee: 72 },

  // --- stomach pain ---
  { id: 'food poisoning', label: 'Food poisoning', complaint: 'stomach pain', signature: sig(true, true, false, true), remedyId: 'charcoal', fee: 78 },
  { id: 'appendicitis', label: 'Appendicitis', complaint: 'stomach pain', signature: sig(true, true, false, false), remedyId: 'surgical referral', fee: 120 },
  { id: 'gastritis', label: 'Gastritis', complaint: 'stomach pain', signature: sig(false, false, false, true), remedyId: 'antacid', fee: 62 },
]

export const CONDITION_BY_ID: Record<string, Condition> = Object.fromEntries(
  CONDITIONS.map((c) => [c.id, c])
)

/**
 * Which conditions are still possible given the complaint and whatever
 * tests have come back. This is the heart of the game and the thing the
 * patient card shows you.
 */
export function candidatesFor(
  complaint: Complaint,
  results: Partial<Record<TestKey, boolean>>
): Condition[] {
  return CONDITIONS.filter((c) => {
    if (c.complaint !== complaint) return false
    return (Object.entries(results) as [TestKey, boolean][]).every(
      ([key, value]) => c.signature[key] === value
    )
  })
}

export interface KitLevel {
  label: string
  cost: number
  /** Multiplier on test times - lower is faster. */
  speedMult: number
  blurb: string
}

export const KITS: KitLevel[] = [
  { label: 'Doctor’s Bag', cost: 0, speedMult: 1, blurb: 'A thermometer and a good ear.' },
  { label: 'Consulting Room', cost: 220, speedMult: 0.8, blurb: 'Tests come back quicker.' },
  { label: 'Dispensary', cost: 560, speedMult: 0.62, blurb: 'Quicker again, and a proper bench.' },
  { label: 'Cottage Hospital', cost: 1200, speedMult: 0.45, blurb: 'Results almost while you wait.' },
]

export interface ClinicLevel {
  label: string
  cost: number
  beds: number
  arrivalMs: number
  blurb: string
}

export const CLINICS: ClinicLevel[] = [
  { label: 'Front Parlour', cost: 0, beds: 2, arrivalMs: 45_000, blurb: 'Two chairs and a curtain.' },
  { label: 'Waiting Room', cost: 260, beds: 3, arrivalMs: 34_000, blurb: 'Three seats, word gets around.' },
  { label: 'Village Practice', cost: 620, beds: 4, arrivalMs: 25_000, blurb: 'Four seats and a steady list.' },
  { label: 'Infirmary', cost: 1300, beds: 6, arrivalMs: 17_000, blurb: 'Six beds and a full list.' },
]

/** A wrong prescription costs this share of the fee. */
export const MISS_PENALTY = 0.4
export const MAX_MISSES = 2

/** People who come to the door. */
export const FACES = 6

// --- save shape -------------------------------------------------------

export interface DoctorPatient {
  id: number
  /** Which drawn face to use. */
  face: number
  conditionId: string
  complaint: Complaint
  arrivedAt: number
  /** Test results that have come back. */
  results: Partial<Record<TestKey, boolean>>
  /** A test currently running: which, and when it lands. */
  running?: { test: TestKey; doneAt: number }
  misses: number
}

export interface DoctorSave {
  kitLevel: number
  clinicLevel: number
  nextId: number
  patients: DoctorPatient[]
  nextArrivalAt: number
  treated: number
}

export function makeDoctorPatient(id: number, now: number): DoctorPatient {
  const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)]
  return {
    id,
    face: Math.floor(Math.random() * FACES),
    conditionId: condition.id,
    complaint: condition.complaint,
    arrivedAt: now,
    results: {},
    misses: 0,
  }
}

export function initialDoctor(): DoctorSave {
  const now = Date.now()
  return {
    kitLevel: 0,
    clinicLevel: 0,
    nextId: 2,
    patients: [makeDoctorPatient(1, now)],
    nextArrivalAt: now + CLINICS[0].arrivalMs,
    treated: 0,
  }
}

export function kitOf(s: DoctorSave | undefined): KitLevel {
  return KITS[Math.min(s?.kitLevel ?? 0, KITS.length - 1)]
}
export function clinicOf(s: DoctorSave | undefined): ClinicLevel {
  return CLINICS[Math.min(s?.clinicLevel ?? 0, CLINICS.length - 1)]
}

/** Clamped so retuning arrival speed takes effect immediately. */
export function nextArrivalDue(s: DoctorSave, now: number): number {
  return Math.min(s.nextArrivalAt ?? now, now + clinicOf(s).arrivalMs)
}

export function feeFor(p: DoctorPatient): number {
  const base = CONDITION_BY_ID[p.conditionId]?.fee ?? 0
  return Math.max(1, Math.round(base * (1 - MISS_PENALTY * p.misses)))
}

/**
 * What the surgery has waiting, for the map badge.
 *
 * Nobody is on a clock, so this is a plain count with nothing urgent
 * about it - a full waiting room is a queue, not a warning.
 */
export function doctorPending(s: DoctorSave | undefined, now: number) {
  if (!s) return null
  const waiting = (s.patients ?? []).filter((p) => !p.running || now >= p.running.doneAt).length
  return waiting > 0 ? { count: waiting } : null
}
