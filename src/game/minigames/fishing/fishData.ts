/**
 * Fishing tables: species, the difficulty ladder they sit on, and the
 * rods you fight them with.
 *
 * Split out from the minigame so the market can price fish and sell rod
 * upgrades without importing the whole game component.
 */

export type TierKey = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'legendary'

/**
 * The difficulty/reward ladder. Past the middle tiers we add *more pulls*
 * rather than shrinking the target further - a sub-20% target is luck, not
 * timing, whereas landing several good pulls in a row still feels earned.
 */
export interface Tier {
  /** Vague "how does it feel on the line" hint - never names the fish. */
  hint: string
  baseCoins: number
  markerSpeed: number
  targetWidth: number
  reels: number
  /** Misses allowed before it shakes off, before the rod's bonus. */
  slack: number
}

export const TIER_ORDER: TierKey[] = ['tiny', 'small', 'medium', 'large', 'huge', 'legendary']

export const TIERS: Record<TierKey, Tier> = {
  tiny: { hint: 'Barely a nibble - feels tiny', baseCoins: 2, markerSpeed: 1.8, targetWidth: 38, reels: 1, slack: 5 },
  small: { hint: 'A light little tug', baseCoins: 4, markerSpeed: 2.4, targetWidth: 32, reels: 1, slack: 4 },
  medium: { hint: 'A steady, decent pull', baseCoins: 9, markerSpeed: 3.0, targetWidth: 27, reels: 2, slack: 4 },
  large: { hint: "Heavy - this one's got some weight", baseCoins: 18, markerSpeed: 3.6, targetWidth: 24, reels: 2, slack: 3 },
  huge: { hint: 'Feels HUGE - it is really fighting!', baseCoins: 34, markerSpeed: 4.0, targetWidth: 24, reels: 3, slack: 4 },
  legendary: { hint: 'Something enormous is on the line!', baseCoins: 65, markerSpeed: 4.4, targetWidth: 23, reels: 3, slack: 3 },
}

interface FishSeed {
  name: string
  tier: TierKey
  /** Relative spawn frequency within the whole pond. */
  weight: number
  /** Optional payout tweak vs. its tier-mates. Defaults to 1. */
  valueMult?: number
}

const SEEDS: FishSeed[] = [
  { name: 'Minnow', tier: 'tiny', weight: 30 },
  { name: 'Bluegill', tier: 'tiny', weight: 24 },
  { name: 'Smelt', tier: 'tiny', weight: 18 },

  { name: 'Yellow Perch', tier: 'small', weight: 24 },
  { name: 'Crappie', tier: 'small', weight: 18 },
  { name: 'Rock Bass', tier: 'small', weight: 14 },

  { name: 'Largemouth Bass', tier: 'medium', weight: 20 },
  { name: 'Rainbow Trout', tier: 'medium', weight: 15, valueMult: 1.3 },
  { name: 'Walleye', tier: 'medium', weight: 12, valueMult: 1.4 },
  { name: 'Channel Catfish', tier: 'medium', weight: 12 },

  { name: 'Northern Pike', tier: 'large', weight: 11 },
  { name: 'Coho Salmon', tier: 'large', weight: 10, valueMult: 1.2 },
  { name: 'Red Snapper', tier: 'large', weight: 8, valueMult: 1.3 },
  { name: 'Common Carp', tier: 'large', weight: 12, valueMult: 0.7 },

  { name: 'Yellowfin Tuna', tier: 'huge', weight: 7 },
  { name: 'Mahi-Mahi', tier: 'huge', weight: 6, valueMult: 1.2 },
  { name: 'Tarpon', tier: 'huge', weight: 5 },
  { name: 'Sturgeon', tier: 'huge', weight: 4, valueMult: 1.4 },

  { name: 'Blue Marlin', tier: 'legendary', weight: 3 },
  { name: 'Swordfish', tier: 'legendary', weight: 3 },
  { name: 'Great White Shark', tier: 'legendary', weight: 2, valueMult: 1.3 },
]

export interface FishDef extends FishSeed {
  /** Market price, derived from the tier so value always tracks difficulty. */
  coins: number
}

export const FISH: FishDef[] = SEEDS.map((s) => ({
  ...s,
  coins: Math.round(TIERS[s.tier].baseCoins * (s.valueMult ?? 1)),
}))

export interface RodTier {
  name: string
  cost: number
  biteDelay: [number, number]
  hookWindowMs: number
  /** Multiplier on the marker's speed - lower is easier. */
  speedMult: number
  /** Extra percentage points of target width. */
  targetBonus: number
  /** Extra misses allowed before the fish shakes off. */
  slackBonus: number
  /** How strongly this rod skews encounters toward bigger fish. */
  depthBonus: number
  /** One-line summary of what upgrading buys you. */
  blurb: string
}

/**
 * Bonuses are flat additions, which means they help most where the margins
 * are thinnest: +10 points of target width is a rounding error on a
 * minnow's 38% band but nearly doubles a marlin's 23%. So the good rods
 * quietly specialise in big fish without needing a separate rule.
 */
export const RODS: RodTier[] = [
  { name: 'Twig Rod', cost: 0, biteDelay: [1800, 3800], hookWindowMs: 750, speedMult: 1, targetBonus: 0, slackBonus: 0, depthBonus: 0, blurb: 'Bare minimum. Big fish are landable, but barely.' },
  { name: 'Cane Rod', cost: 18, biteDelay: [1650, 3500], hookWindowMs: 800, speedMult: 0.96, targetBonus: 2, slackBonus: 1, depthBonus: 0.6, blurb: 'A bit of give. One extra slip forgiven.' },
  { name: 'Bamboo Rod', cost: 45, biteDelay: [1400, 3200], hookWindowMs: 860, speedMult: 0.92, targetBonus: 3, slackBonus: 1, depthBonus: 1.2, blurb: 'Springy and forgiving. Bites come quicker.' },
  { name: 'Fiberglass Rod', cost: 95, biteDelay: [1200, 2900], hookWindowMs: 920, speedMult: 0.88, targetBonus: 5, slackBonus: 2, depthBonus: 2, blurb: 'Holds a bend. Heavy fish stop running the show.' },
  { name: 'Steel Rod', cost: 175, biteDelay: [1000, 2600], hookWindowMs: 980, speedMult: 0.84, targetBonus: 6, slackBonus: 2, depthBonus: 2.8, blurb: 'Real backbone. Big fish stop being a gamble.' },
  { name: 'Graphite Rod', cost: 300, biteDelay: [850, 2300], hookWindowMs: 1050, speedMult: 0.79, targetBonus: 8, slackBonus: 3, depthBonus: 3.8, blurb: 'Light and fast. The monsters start showing up.' },
  { name: 'Golden Rod', cost: 500, biteDelay: [700, 2000], hookWindowMs: 1150, speedMult: 0.74, targetBonus: 10, slackBonus: 4, depthBonus: 5, blurb: 'Tames anything in the water.' },
]

/** The fight a specific fish puts up on a specific rod. */
export function fightFor(fish: FishDef, rod: RodTier) {
  const tier = TIERS[fish.tier]
  return {
    hint: tier.hint,
    reels: tier.reels,
    markerSpeed: tier.markerSpeed * rod.speedMult,
    targetWidth: Math.min(60, tier.targetWidth + rod.targetBonus),
    slack: tier.slack + rod.slackBonus,
  }
}

/**
 * Better rods scale a fish's spawn weight by how deep its tier sits, so
 * upgrading gradually pulls the pond toward the big stuff. This only
 * shifts how *often* big fish show up - every fish can be hooked, and
 * landed, on every rod.
 */
export function pickFish(depthBonus: number): FishDef {
  const maxIndex = TIER_ORDER.length - 1
  const weights = FISH.map((f) => {
    const depth = TIER_ORDER.indexOf(f.tier) / maxIndex
    return f.weight * (1 + depthBonus * depth)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < FISH.length; i++) {
    r -= weights[i]
    if (r <= 0) return FISH[i]
  }
  return FISH[FISH.length - 1]
}
