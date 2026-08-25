/**
 * Riverside clay and the pottery studio.
 *
 * The chain is dig -> wedge -> throw: river clay comes out of the bank
 * full of grit, wedging turns it into workable clay, and the wheel turns
 * that into a fired piece worth far more than the clay it ate.
 *
 * The clay bank regenerates on a timer rather than being infinite, so
 * digging is paced by the river rather than by how fast you can click.
 */

/** Seconds of river time that produce one diggable unit of clay. */
export const CLAY_REGEN_MS = 25_000

export interface ToolLevel {
  label: string
  cost: number
  /** How much clay the bank holds before it stops accruing. */
  bankCap: number
  /** Multiplier on regen time - lower refills faster. */
  regenMult: number
  /** Chance a dig turns up a rich seam worth two clay. */
  richChance: number
  blurb: string
}

export const SPADES: ToolLevel[] = [
  { label: 'Bare Hands', cost: 0, bankCap: 6, regenMult: 1, richChance: 0.15, blurb: 'Cold, slow, and hard on the fingernails.' },
  { label: 'Wooden Trowel', cost: 60, bankCap: 9, regenMult: 0.85, richChance: 0.25, blurb: 'Digs cleaner, and finds richer seams.' },
  { label: 'Iron Spade', cost: 180, bankCap: 13, regenMult: 0.7, richChance: 0.35, blurb: 'Cuts deep into the bank.' },
  { label: 'Dredging Scoop', cost: 420, bankCap: 18, regenMult: 0.55, richChance: 0.5, blurb: 'Half the digs come up double.' },
]

export interface StudioLevel {
  label: string
  cost: number
  /** Pieces that can be wedging or on the wheel at once. */
  capacity: number
  /** Multiplier on wedge and throw times - lower is faster. */
  speedMult: number
  blurb: string
}

export const STUDIOS: StudioLevel[] = [
  { label: 'Riverbank Stump', cost: 0, capacity: 1, speedMult: 1, blurb: 'A flat rock and a lot of patience.' },
  { label: 'Kick Wheel', cost: 140, capacity: 2, speedMult: 0.85, blurb: 'Two pieces at once, and faster.' },
  { label: 'Potter’s Shed', cost: 380, capacity: 3, speedMult: 0.7, blurb: 'Three at once. Unlocks larger forms.' },
  { label: 'Kiln House', cost: 800, capacity: 4, speedMult: 0.55, blurb: 'Four at once, fired at double speed.' },
]

/** Time to wedge one lump of river clay into workable clay. */
export const WEDGE_MS = 30_000

export interface Form {
  id: string
  label: string
  /** Workable clay consumed. */
  clay: number
  throwMs: number
  /** Studio level needed before this form can be thrown. */
  unlockLevel: number
  blurb: string
}

/**
 * Every form sells for more than the clay it ate - that margin is the
 * reason to own a wheel. Bigger forms need more clay, more time and a
 * better studio, and pay accordingly.
 */
export const FORMS: Form[] = [
  { id: 'bowl', label: 'Bowl', clay: 1, throwMs: 40_000, unlockLevel: 0, blurb: 'Wide and shallow. Everyone needs one.' },
  { id: 'mug', label: 'Mug', clay: 1, throwMs: 45_000, unlockLevel: 0, blurb: 'A handle is harder than it looks.' },
  { id: 'bird whistle', label: 'Bird whistle', clay: 1, throwMs: 55_000, unlockLevel: 1, blurb: 'Hand-modelled, and it actually sounds.' },
  { id: 'jug', label: 'Jug', clay: 2, throwMs: 70_000, unlockLevel: 1, blurb: 'Bellied out, then pulled to a narrow neck.' },
  { id: 'vase', label: 'Vase', clay: 2, throwMs: 80_000, unlockLevel: 2, blurb: 'Tall and thin-walled. Easy to collapse.' },
  { id: 'cat figurine', label: 'Cat figurine', clay: 2, throwMs: 90_000, unlockLevel: 2, blurb: 'Sculpted by hand, not thrown.' },
  { id: 'urn', label: 'Urn', clay: 3, throwMs: 110_000, unlockLevel: 3, blurb: 'Two handles and a lot of nerve.' },
]

// --- save shape -------------------------------------------------------

export interface PotterySave {
  spadeLevel: number
  studioLevel: number
  /**
   * Anchor timestamp for the regenerating clay bank. Available clay is
   * derived from how long ago this was, so the bank keeps filling while
   * the game is closed without needing a running timer.
   */
  bankAt: number
  /** Lumps currently being wedged, by completion time. */
  wedging: number[]
  /** Pieces on the wheel. */
  throwing: { formId: string; doneAt: number }[]
}

export function initialPottery(): PotterySave {
  return {
    spadeLevel: 0,
    studioLevel: 0,
    // Start with a part-filled bank so there is something to dig on arrival.
    bankAt: Date.now() - CLAY_REGEN_MS * 3,
    wedging: [],
    throwing: [],
  }
}

export function spadeOf(save: PotterySave | undefined): ToolLevel {
  return SPADES[Math.min(save?.spadeLevel ?? 0, SPADES.length - 1)]
}

export function studioOf(save: PotterySave | undefined): StudioLevel {
  return STUDIOS[Math.min(save?.studioLevel ?? 0, STUDIOS.length - 1)]
}

/** How many lumps the bank has ready right now. */
export function clayAvailable(save: PotterySave | undefined, now: number): number {
  if (!save) return 0
  const spade = spadeOf(save)
  const per = CLAY_REGEN_MS * spade.regenMult
  const elapsed = now - (save.bankAt ?? now)
  return Math.max(0, Math.min(spade.bankCap, Math.floor(elapsed / per)))
}

/** Milliseconds until the next lump appears, or 0 when the bank is full. */
export function nextClayIn(save: PotterySave | undefined, now: number): number {
  if (!save) return 0
  const spade = spadeOf(save)
  if (clayAvailable(save, now) >= spade.bankCap) return 0
  const per = CLAY_REGEN_MS * spade.regenMult
  const elapsed = now - (save.bankAt ?? now)
  return per - (elapsed % per)
}

/**
 * Consuming clay pushes the bank's anchor forward rather than storing a
 * count, which keeps "how much is ready" a pure function of the clock.
 */
export function spendClay(save: PotterySave, units: number, now: number): number {
  const per = CLAY_REGEN_MS * spadeOf(save).regenMult
  const cappedStart = now - per * spadeOf(save).bankCap
  const base = Math.max(save.bankAt ?? now, cappedStart)
  return base + per * units
}

/** What the studio has waiting, for the map badge. */
export function potteryPending(save: PotterySave | undefined, now: number) {
  if (!save) return null
  const wedged = (save.wedging ?? []).filter((at) => now >= at).length
  const fired = (save.throwing ?? []).filter((t) => now >= t.doneAt).length
  const count = wedged + fired
  return count > 0 ? { count } : null
}
