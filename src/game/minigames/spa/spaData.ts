/**
 * Day Spa - the rules behind a makeover.
 *
 * Deliberately not the Pet Salon again. That game is a queue you work
 * through in the right order; this one is about choosing a look. A client
 * turns up with an occasion in mind, a few things they are hoping you
 * will sort out, and their own taste - and you are paid on how close what
 * you build comes to what they actually wanted.
 *
 * Everything here is pure, so the scoring can be run headless against
 * every client the game can produce.
 */

/* ------------------------------------------------------------------ */
/* Taste                                                               */
/* ------------------------------------------------------------------ */

export type Vibe = 'natural' | 'bold' | 'classic' | 'playful'

export const VIBES: Record<Vibe, { label: string; blurb: string }> = {
  natural: { label: 'Natural', blurb: 'Soft, undone, barely-there.' },
  bold: { label: 'Bold', blurb: 'Loud on purpose.' },
  classic: { label: 'Classic', blurb: 'Neat, timeless, safe hands.' },
  playful: { label: 'Playful', blurb: 'Colour and mischief.' },
}

/** Colour families, so "I love green" can be a thing a client says. */
export type Family =
  | 'black'
  | 'white'
  | 'grey'
  | 'brown'
  | 'red'
  | 'pink'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'gold'

export const FAMILY_LABEL: Record<Family, string> = {
  black: 'black', white: 'white', grey: 'grey', brown: 'brown', red: 'red',
  pink: 'pink', orange: 'orange', yellow: 'yellow', green: 'green',
  blue: 'blue', purple: 'purple', gold: 'gold',
}

/** 0 beach, 1 everyday, 2 smart, 3 formal. */
export type Formality = 0 | 1 | 2 | 3

export const FORMALITY_LABEL = ['relaxed', 'everyday', 'smart', 'formal']

/* ------------------------------------------------------------------ */
/* Occasions                                                           */
/* ------------------------------------------------------------------ */

export interface Occasion {
  key: string
  label: string
  formality: Formality
  /** What they turn up asking for. */
  line: string
  fee: number
}

export const OCCASIONS: Occasion[] = [
  { key: 'beach', label: 'a beach day', formality: 0, line: 'I want to look like I have nowhere to be.', fee: 44 },
  { key: 'festival', label: 'a festival', formality: 0, line: 'Three days in a field. Make it count.', fee: 52 },
  { key: 'coffee', label: 'a coffee date', formality: 1, line: 'Nothing that looks like I tried too hard.', fee: 58 },
  { key: 'firstdate', label: 'a first date', formality: 1, line: 'I want to look like myself, but better.', fee: 66 },
  { key: 'portrait', label: 'a family portrait', formality: 2, line: 'This one goes on the wall for thirty years.', fee: 78 },
  { key: 'interview', label: 'a job interview', formality: 2, line: 'They need to take me seriously.', fee: 86 },
  { key: 'shoot', label: 'a photo shoot', formality: 2, line: 'The camera should not be able to look away.', fee: 96 },
  { key: 'graduation', label: 'a graduation', formality: 2, line: 'My whole family will be there with cameras.', fee: 92 },
  { key: 'wedding', label: 'a wedding', formality: 3, line: "It's not my wedding, so don't let me upstage her.", fee: 118 },
  { key: 'gala', label: 'a gala', formality: 3, line: 'I want the whole room to turn around.', fee: 140 },
]

export const OCCASION_BY_KEY: Record<string, Occasion> = Object.fromEntries(
  OCCASIONS.map((o) => [o.key, o])
)

/* ------------------------------------------------------------------ */
/* The spa half                                                        */
/* ------------------------------------------------------------------ */

export interface Treatment {
  key: string
  label: string
  /** The complaint this answers, in the client's own words. */
  complaint: string
  ms: number
  icon: string
}

export const TREATMENTS: Treatment[] = [
  { key: 'facial', label: 'Facial', complaint: 'My skin has given up on me.', ms: 5_000, icon: 'facial' },
  { key: 'mask', label: 'Mud mask', complaint: 'I want to feel expensive.', ms: 5_000, icon: 'mask' },
  { key: 'massage', label: 'Massage', complaint: 'My shoulders are in knots.', ms: 5_000, icon: 'massage' },
  { key: 'sauna', label: 'Sauna', complaint: 'I am cold to my bones.', ms: 5_000, icon: 'sauna' },
  { key: 'manicure', label: 'Manicure', complaint: 'Look at the state of my nails.', ms: 5_000, icon: 'manicure' },
  { key: 'pedicure', label: 'Pedicure', complaint: 'These feet have walked miles.', ms: 5_000, icon: 'pedicure' },
  { key: 'brows', label: 'Brow shape', complaint: 'My brows have gone feral.', ms: 5_000, icon: 'brows' },
  { key: 'soak', label: 'Foot soak', complaint: 'I have been standing up since six.', ms: 5_000, icon: 'soak' },
]

export const TREATMENT_BY_KEY: Record<string, Treatment> = Object.fromEntries(
  TREATMENTS.map((t) => [t.key, t])
)

/** Hair has to be sorted out before it can be styled. */
export const HAIR_CARE = [
  { key: 'detangle', label: 'Detangle', ms: 5_000, fixes: 'tangled' as const },
  { key: 'wash', label: 'Wash & condition', ms: 5_000, fixes: 'greasy' as const },
]

/* ------------------------------------------------------------------ */
/* Hair                                                                */
/* ------------------------------------------------------------------ */

export interface HairStyle {
  key: string
  label: string
  vibe: Vibe
  formality: Formality
  cost: number
}

export const HAIR_STYLES: HairStyle[] = [
  { key: 'beachy', label: 'Beach waves', vibe: 'natural', formality: 0, cost: 0 },
  { key: 'loose', label: 'Loose & long', vibe: 'natural', formality: 1, cost: 0 },
  { key: 'ponytail', label: 'Ponytail', vibe: 'natural', formality: 1, cost: 0 },
  { key: 'bob', label: 'Sharp bob', vibe: 'classic', formality: 2, cost: 0 },
  { key: 'bun', label: 'Neat bun', vibe: 'classic', formality: 3, cost: 0 },
  { key: 'waves', label: 'Soft waves', vibe: 'natural', formality: 2, cost: 130 },
  { key: 'curls', label: 'Big curls', vibe: 'bold', formality: 2, cost: 160 },
  { key: 'braids', label: 'Braids', vibe: 'playful', formality: 1, cost: 190 },
  { key: 'crop', label: 'Cropped', vibe: 'bold', formality: 2, cost: 210 },
  { key: 'afro', label: 'Afro', vibe: 'bold', formality: 2, cost: 190 },
  { key: 'topknot', label: 'Messy topknot', vibe: 'playful', formality: 0, cost: 120 },
  { key: 'buns', label: 'Twin buns', vibe: 'playful', formality: 2, cost: 170 },
  { key: 'chignon', label: 'Low chignon', vibe: 'natural', formality: 3, cost: 200 },
  { key: 'garland', label: 'Braided crown', vibe: 'playful', formality: 3, cost: 230 },
  { key: 'updo', label: 'Sculpted updo', vibe: 'bold', formality: 3, cost: 280 },
]

export interface HairColour {
  key: string
  label: string
  hex: string
  shade: string
  family: Family
  vibe: Vibe
  cost: number
}

export const HAIR_COLOURS: HairColour[] = [
  { key: 'black', label: 'Jet black', hex: '#2b2620', shade: '#171410', family: 'black', vibe: 'classic', cost: 0 },
  { key: 'brown', label: 'Dark brown', hex: '#4a3527', shade: '#33241a', family: 'brown', vibe: 'natural', cost: 0 },
  { key: 'chestnut', label: 'Chestnut', hex: '#6f4426', shade: '#52301a', family: 'brown', vibe: 'natural', cost: 0 },
  { key: 'blonde', label: 'Honey blonde', hex: '#c99a4e', shade: '#a67a36', family: 'yellow', vibe: 'classic', cost: 0 },
  { key: 'auburn', label: 'Auburn', hex: '#8f3a20', shade: '#6d2914', family: 'red', vibe: 'bold', cost: 110 },
  { key: 'platinum', label: 'Platinum', hex: '#ddd2bd', shade: '#bdb098', family: 'white', vibe: 'bold', cost: 150 },
  { key: 'silver', label: 'Silver', hex: '#b6bcc4', shade: '#949aa3', family: 'grey', vibe: 'bold', cost: 170 },
  { key: 'rose', label: 'Rose pink', hex: '#d97f9c', shade: '#b8607d', family: 'pink', vibe: 'playful', cost: 200 },
  { key: 'copper', label: 'Copper', hex: '#b85a26', shade: '#8f421a', family: 'orange', vibe: 'natural', cost: 120 },
  { key: 'moss', label: 'Moss green', hex: '#4a7a3a', shade: '#375c2a', family: 'green', vibe: 'playful', cost: 230 },
  { key: 'lilac', label: 'Lilac', hex: '#a98cc9', shade: '#8a6fa8', family: 'purple', vibe: 'playful', cost: 220 },
  { key: 'teal', label: 'Deep teal', hex: '#2f8a86', shade: '#226b68', family: 'blue', vibe: 'playful', cost: 240 },
  { key: 'scarlet', label: 'Scarlet', hex: '#c02f2f', shade: '#9a2020', family: 'red', vibe: 'playful', cost: 250 },
]

/* ------------------------------------------------------------------ */
/* Face                                                                */
/* ------------------------------------------------------------------ */

export interface MakeupOption {
  key: string
  label: string
  hex: string
  vibe: Vibe
  family: Family
  cost: number
}

export const LIPS: MakeupOption[] = [
  { key: 'bare', label: 'Balm', hex: '#c98b7f', vibe: 'natural', family: 'brown', cost: 0 },
  { key: 'rose', label: 'Rose', hex: '#c9647a', vibe: 'classic', family: 'pink', cost: 0 },
  { key: 'red', label: 'Red', hex: '#b8262f', vibe: 'bold', family: 'red', cost: 0 },
  { key: 'berry', label: 'Berry', hex: '#8a2f52', vibe: 'bold', family: 'purple', cost: 90 },
  { key: 'coral', label: 'Coral', hex: '#e0705a', vibe: 'playful', family: 'orange', cost: 90 },
  { key: 'plum', label: 'Deep plum', hex: '#5e2038', vibe: 'bold', family: 'purple', cost: 140 },
]

export const SHADOWS: MakeupOption[] = [
  { key: 'none', label: 'None', hex: 'none', vibe: 'natural', family: 'brown', cost: 0 },
  { key: 'taupe', label: 'Taupe', hex: '#a08978', vibe: 'natural', family: 'brown', cost: 0 },
  { key: 'bronze', label: 'Bronze', hex: '#b07a3a', vibe: 'classic', family: 'gold', cost: 0 },
  { key: 'smoke', label: 'Smoky', hex: '#4a4550', vibe: 'bold', family: 'grey', cost: 110 },
  { key: 'emerald', label: 'Emerald', hex: '#2f8a5e', vibe: 'playful', family: 'green', cost: 130 },
  { key: 'violet', label: 'Violet', hex: '#7d5aa8', vibe: 'playful', family: 'purple', cost: 130 },
  { key: 'glitter', label: 'Gold glitter', hex: '#e0bb4f', vibe: 'playful', family: 'gold', cost: 170 },
]

/* ------------------------------------------------------------------ */
/* Wardrobe                                                            */
/* ------------------------------------------------------------------ */

export type Slot = 'outfit' | 'shoes' | 'extra'

export interface Garment {
  key: string
  label: string
  slot: Slot
  /** How the body is drawn: a dress, or a top and trousers/skirt. */
  cut: 'dress' | 'separates' | 'shoes' | 'extra'
  formality: Formality
  vibe: Vibe
  family: Family
  hex: string
  accent: string
  cost: number
  /** Shape variant for the renderer. */
  art: string
}

export const WARDROBE: Garment[] = [
  // --- outfits you start with ---
  { key: 'tee-jeans', label: 'Tee and jeans', slot: 'outfit', cut: 'separates', formality: 0, vibe: 'natural', family: 'blue', hex: '#e8e2d6', accent: '#4a6f9a', cost: 0, art: 'separates' },
  { key: 'sundress', label: 'Yellow sundress', slot: 'outfit', cut: 'dress', formality: 0, vibe: 'playful', family: 'yellow', hex: '#e0c04a', accent: '#f2e0a0', cost: 0, art: 'aline' },
  { key: 'blouse-skirt', label: 'Blouse and skirt', slot: 'outfit', cut: 'separates', formality: 2, vibe: 'classic', family: 'white', hex: '#3a3f4a', accent: '#f2ece0', cost: 0, art: 'separates' },
  { key: 'shift', label: 'Navy shift dress', slot: 'outfit', cut: 'dress', formality: 2, vibe: 'classic', family: 'blue', hex: '#2f3f5e', accent: '#516a8f', cost: 0, art: 'shift' },
  { key: 'jumper', label: 'Big soft jumper', slot: 'outfit', cut: 'separates', formality: 0, vibe: 'natural', family: 'brown', hex: '#a8896b', accent: '#5e5348', cost: 0, art: 'separates' },

  // --- bought ---
  { key: 'linen', label: 'Linen set', slot: 'outfit', cut: 'separates', formality: 1, vibe: 'natural', family: 'white', hex: '#e2dac6', accent: '#c4b89c', cost: 120, art: 'separates' },
  { key: 'sunhat-dress', label: 'Floral wrap dress', slot: 'outfit', cut: 'dress', formality: 1, vibe: 'playful', family: 'pink', hex: '#d9718f', accent: '#f2b8c8', cost: 150, art: 'wrap' },
  { key: 'suit', label: 'Tailored suit', slot: 'outfit', cut: 'separates', formality: 3, vibe: 'classic', family: 'grey', hex: '#464a52', accent: '#8d939c', cost: 220, art: 'suit' },
  { key: 'green-midi', label: 'Emerald midi', slot: 'outfit', cut: 'dress', formality: 2, vibe: 'bold', family: 'green', hex: '#2f7a56', accent: '#4fa87a', cost: 210, art: 'shift' },
  { key: 'jumpsuit', label: 'Wide jumpsuit', slot: 'outfit', cut: 'separates', formality: 2, vibe: 'bold', family: 'red', hex: '#a83a3a', accent: '#c96a5e', cost: 240, art: 'jumpsuit' },
  { key: 'festival', label: 'Fringed festival kit', slot: 'outfit', cut: 'separates', formality: 0, vibe: 'playful', family: 'purple', hex: '#8a5aa8', accent: '#e0c04a', cost: 190, art: 'separates' },
  { key: 'gown-black', label: 'Black column gown', slot: 'outfit', cut: 'dress', formality: 3, vibe: 'classic', family: 'black', hex: '#22242b', accent: '#3d4049', cost: 320, art: 'gown' },
  { key: 'gown-red', label: 'Scarlet gown', slot: 'outfit', cut: 'dress', formality: 3, vibe: 'bold', family: 'red', hex: '#a8203a', accent: '#d14a5e', cost: 380, art: 'gown' },
  { key: 'gown-gold', label: 'Gold sequin gown', slot: 'outfit', cut: 'dress', formality: 3, vibe: 'bold', family: 'gold', hex: '#c9a13a', accent: '#e8cf7a', cost: 460, art: 'gown' },
  { key: 'gown-lilac', label: 'Lilac tulle gown', slot: 'outfit', cut: 'dress', formality: 3, vibe: 'playful', family: 'purple', hex: '#a98cc9', accent: '#d6c4e8', cost: 420, art: 'gown' },

  { key: 'breton', label: 'Breton stripes', slot: 'outfit', cut: 'separates', formality: 0, vibe: 'classic', family: 'white', hex: '#f2ece0', accent: '#3f4f6e', cost: 0, art: 'separates' },
  { key: 'swim-set', label: 'Tangerine swim set', slot: 'outfit', cut: 'separates', formality: 0, vibe: 'bold', family: 'orange', hex: '#e07a2f', accent: '#f2b06a', cost: 140, art: 'separates' },
  { key: 'boiler', label: 'Emerald boiler suit', slot: 'outfit', cut: 'separates', formality: 1, vibe: 'bold', family: 'green', hex: '#2f7a4a', accent: '#4fa870', cost: 170, art: 'jumpsuit' },
  { key: 'tea-dress', label: 'Cherry tea dress', slot: 'outfit', cut: 'dress', formality: 1, vibe: 'classic', family: 'red', hex: '#b8323a', accent: '#e0848a', cost: 160, art: 'aline' },
  { key: 'rust-set', label: 'Rust knit set', slot: 'outfit', cut: 'separates', formality: 2, vibe: 'natural', family: 'orange', hex: '#b8622f', accent: '#d99a6a', cost: 180, art: 'separates' },
  { key: 'buttercup', label: 'Buttercup shirt dress', slot: 'outfit', cut: 'dress', formality: 2, vibe: 'playful', family: 'yellow', hex: '#e0c04a', accent: '#b8973a', cost: 165, art: 'shift' },
  { key: 'sage-gown', label: 'Sage silk gown', slot: 'outfit', cut: 'dress', formality: 3, vibe: 'natural', family: 'green', hex: '#7a9a72', accent: '#a8c2a0', cost: 340, art: 'gown' },

  // --- shoes ---
  { key: 'sandals', label: 'Sandals', slot: 'shoes', cut: 'shoes', formality: 0, vibe: 'natural', family: 'brown', hex: '#a8763f', accent: '#8a6134', cost: 0, art: 'sandals' },
  { key: 'trainers', label: 'Trainers', slot: 'shoes', cut: 'shoes', formality: 0, vibe: 'playful', family: 'white', hex: '#f2ece0', accent: '#c2cbd4', cost: 0, art: 'trainers' },
  { key: 'flats', label: 'Flats', slot: 'shoes', cut: 'shoes', formality: 2, vibe: 'classic', family: 'black', hex: '#2b2620', accent: '#4a423a', cost: 0, art: 'flats' },
  { key: 'boots', label: 'Ankle boots', slot: 'shoes', cut: 'shoes', formality: 1, vibe: 'bold', family: 'black', hex: '#33302c', accent: '#54504a', cost: 130, art: 'boots' },
  { key: 'espadrilles', label: 'Espadrilles', slot: 'shoes', cut: 'shoes', formality: 1, vibe: 'natural', family: 'yellow', hex: '#d9be7a', accent: '#a8896b', cost: 0, art: 'flats' },
  { key: 'loafers', label: 'Loafers', slot: 'shoes', cut: 'shoes', formality: 2, vibe: 'natural', family: 'brown', hex: '#6b4f36', accent: '#8a6b4a', cost: 140, art: 'flats' },
  { key: 'mules', label: 'Mules', slot: 'shoes', cut: 'shoes', formality: 1, vibe: 'classic', family: 'white', hex: '#e8e2d6', accent: '#c2b8a4', cost: 120, art: 'flats' },
  { key: 'platforms', label: 'Platforms', slot: 'shoes', cut: 'shoes', formality: 2, vibe: 'playful', family: 'orange', hex: '#e07a2f', accent: '#b85a1a', cost: 190, art: 'boots' },
  { key: 'strappy', label: 'Strappy gold', slot: 'shoes', cut: 'shoes', formality: 3, vibe: 'playful', family: 'gold', hex: '#d9b84a', accent: '#f2e0a0', cost: 230, art: 'heels' },
  { key: 'heels', label: 'Heels', slot: 'shoes', cut: 'shoes', formality: 3, vibe: 'classic', family: 'black', hex: '#2b2620', accent: '#4a423a', cost: 150, art: 'heels' },
  { key: 'gold-heels', label: 'Gold heels', slot: 'shoes', cut: 'shoes', formality: 3, vibe: 'bold', family: 'gold', hex: '#c9a13a', accent: '#e8cf7a', cost: 260, art: 'heels' },

  // --- the finishing touch ---
  { key: 'none', label: 'Nothing', slot: 'extra', cut: 'extra', formality: 1, vibe: 'natural', family: 'brown', hex: 'none', accent: 'none', cost: 0, art: 'none' },
  { key: 'studs', label: 'Stud earrings', slot: 'extra', cut: 'extra', formality: 2, vibe: 'classic', family: 'gold', hex: '#d9b84a', accent: '#f2e0a0', cost: 0, art: 'studs' },
  { key: 'hoops', label: 'Big hoops', slot: 'extra', cut: 'extra', formality: 1, vibe: 'bold', family: 'gold', hex: '#d9b84a', accent: '#f2e0a0', cost: 0, art: 'hoops' },
  { key: 'glasses', label: 'Round glasses', slot: 'extra', cut: 'extra', formality: 2, vibe: 'classic', family: 'brown', hex: '#6b4f36', accent: '#a8896b', cost: 110, art: 'glasses' },
  { key: 'flowers', label: 'Flower crown', slot: 'extra', cut: 'extra', formality: 0, vibe: 'playful', family: 'pink', hex: '#e0849c', accent: '#f2c4d0', cost: 140, art: 'flowers' },
  { key: 'sunhat', label: 'Straw sunhat', slot: 'extra', cut: 'extra', formality: 0, vibe: 'natural', family: 'yellow', hex: '#d9be7a', accent: '#b89a56', cost: 130, art: 'sunhat' },
  { key: 'bandana', label: 'Red bandana', slot: 'extra', cut: 'extra', formality: 0, vibe: 'bold', family: 'red', hex: '#c0392f', accent: '#e0705f', cost: 0, art: 'bandana' },
  { key: 'beads', label: 'Bead strings', slot: 'extra', cut: 'extra', formality: 1, vibe: 'playful', family: 'orange', hex: '#e0843a', accent: '#f2b06a', cost: 100, art: 'beads' },
  { key: 'scarf', label: 'Silk scarf', slot: 'extra', cut: 'extra', formality: 1, vibe: 'classic', family: 'green', hex: '#3a7a5a', accent: '#7ab89a', cost: 120, art: 'scarf' },
  { key: 'brooch', label: 'Jade brooch', slot: 'extra', cut: 'extra', formality: 2, vibe: 'natural', family: 'green', hex: '#4a8a6a', accent: '#8fc2a8', cost: 130, art: 'brooch' },
  { key: 'cuff', label: 'Gold cuff', slot: 'extra', cut: 'extra', formality: 2, vibe: 'bold', family: 'gold', hex: '#d9b84a', accent: '#f2e0a0', cost: 150, art: 'cuff' },
  { key: 'shawl', label: 'Silk shawl', slot: 'extra', cut: 'extra', formality: 3, vibe: 'natural', family: 'white', hex: '#efe7d6', accent: '#cfc4ac', cost: 210, art: 'shawl' },
  { key: 'ribbon', label: 'Hair ribbon', slot: 'extra', cut: 'extra', formality: 3, vibe: 'playful', family: 'pink', hex: '#e0849c', accent: '#f2c4d0', cost: 190, art: 'ribbon' },
  { key: 'pearls', label: 'Pearls', slot: 'extra', cut: 'extra', formality: 3, vibe: 'classic', family: 'white', hex: '#f2ece0', accent: '#d6cdba', cost: 200, art: 'pearls' },
  { key: 'choker', label: 'Velvet choker', slot: 'extra', cut: 'extra', formality: 3, vibe: 'bold', family: 'purple', hex: '#5e2038', accent: '#8a2f52', cost: 180, art: 'choker' },
]

export const GARMENT_BY_KEY: Record<string, Garment> = Object.fromEntries(
  WARDROBE.map((g) => [g.key, g])
)

/** What a brand-new parlour owns. */
export function startingKit(): string[] {
  return [
    ...WARDROBE.filter((g) => g.cost === 0).map((g) => g.key),
    ...HAIR_STYLES.filter((h) => h.cost === 0).map((h) => `hair:${h.key}`),
    ...HAIR_COLOURS.filter((c) => c.cost === 0).map((c) => `dye:${c.key}`),
    ...LIPS.filter((l) => l.cost === 0).map((l) => `lip:${l.key}`),
    ...SHADOWS.filter((s) => s.cost === 0).map((s) => `eye:${s.key}`),
  ]
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export const SKINS = ['#f2d3b8', '#e0b492', '#c98f68', '#a06a44', '#7a4a2c', '#4f2e1c']

export interface Look {
  hair: string
  dye: string
  lip: string
  eye: string
  outfit: string
  shoes: string
  extra: string
}

export interface Client {
  name: string
  skin: string
  /** The colour their hair already is when they walk in. */
  natural: string
  occasion: string
  wants: Vibe
  favourite: Family
  /** Treatment keys they are hoping for. */
  needs: string[]
  tangled: boolean
  greasy: boolean
  /** Treatments and hair care done so far. */
  done: string[]
  busy: { key: string; doneAt: number } | null
  look: Look
}

export interface SpaSave {
  unlocked: string[]
  client: Client | null
  nextArrivalAt: number
  served: number
  /** Best score so far, as a percentage. */
  best: number
  usedNames: string[]
}

export function initialSpa(): SpaSave {
  return {
    unlocked: startingKit(),
    client: null,
    nextArrivalAt: 0,
    served: 0,
    best: 0,
    usedNames: [],
  }
}

const NAMES = [
  'Maeve', 'Bridget', 'Cordelia', 'Rosalind', 'Imogen', 'Wilhelmina', 'Clementine',
  'Hyacinth', 'Perpetua', 'Ottoline', 'Marguerite', 'Philippa', 'Henrietta', 'Josephine',
  'Augusta', 'Millicent', 'Theodora', 'Georgiana', 'Beatrix', 'Constance', 'Emmeline',
  'Cressida', 'Araminta', 'Drusilla', 'Petronella', 'Seraphina', 'Antonia', 'Lavinia',
  'Verity', 'Honor', 'Prudence', 'Temperance', 'Winifred', 'Dorothea', 'Euphemia',
  'Sylvie', 'Nadia', 'Yusra', 'Amara', 'Ines', 'Priya', 'Mei', 'Zola', 'Halima',
  'Ottilie', 'Rafaela', 'Salome', 'Tamsin', 'Ursula', 'Vashti', 'Xanthe', 'Yolanda',
  'Zephyrine', 'Anneke', 'Blodwen', 'Ceridwen', 'Delphine', 'Esme', 'Fenella', 'Greta',
]

function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let left = n
  for (const [value, numeral] of table) {
    while (left >= value) {
      out += numeral
      left -= value
    }
  }
  return out
}

/**
 * A name this parlour has not used before. Same rule as the pet salon:
 * nobody ever comes back as a second Maeve. Once the list is spent it
 * carries on with numerals rather than repeating.
 */
export function pickName(used: string[]): string {
  const free = NAMES.filter((n) => !used.includes(n))
  if (free.length) return free[Math.floor(Math.random() * free.length)]
  for (let numeral = 2; numeral < 500; numeral++) {
    const tier = NAMES.map((n) => `${n} ${roman(numeral)}`).filter((n) => !used.includes(n))
    if (tier.length) return tier[Math.floor(Math.random() * tier.length)]
  }
  return `${NAMES[0]} ${Date.now()}`
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

const FAMILIES: Family[] = ['red', 'pink', 'orange', 'yellow', 'green', 'blue', 'purple', 'gold', 'black', 'white']

/** Someone new through the door, with their own hair, taste and troubles. */
export function newClient(used: string[]): Client {
  const occasion = pick(OCCASIONS)
  const natural = pick(HAIR_COLOURS.filter((c) => c.cost === 0)).key
  const needs = [...TREATMENTS].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2))
  return {
    name: pickName(used),
    skin: pick(SKINS),
    natural,
    occasion: occasion.key,
    wants: pick(Object.keys(VIBES) as Vibe[]),
    favourite: pick(FAMILIES),
    needs: needs.map((t) => t.key),
    tangled: Math.random() < 0.75,
    greasy: Math.random() < 0.6,
    done: [],
    busy: null,
    look: {
      hair: 'loose',
      dye: natural,
      lip: 'bare',
      eye: 'none',
      outfit: 'tee-jeans',
      shoes: 'sandals',
      extra: 'none',
    },
  }
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export interface Mark {
  key: string
  label: string
  /** 0 to 1. */
  score: number
  note: string
}

export interface Verdict {
  marks: Mark[]
  /** 0 to 1, the whole makeover. */
  score: number
  fee: number
  tip: number
  reaction: string
}

/** Every piece the client is wearing, for palette and vibe counting. */
function worn(look: Look): Garment[] {
  return [look.outfit, look.shoes, look.extra]
    .map((k) => GARMENT_BY_KEY[k])
    .filter((g): g is Garment => !!g && g.key !== 'none')
}

export function judge(client: Client): Verdict {
  const occasion = OCCASION_BY_KEY[client.occasion]
  const look = client.look
  const pieces = worn(look)
  const style = HAIR_STYLES.find((h) => h.key === look.hair)
  const dye = HAIR_COLOURS.find((c) => c.key === look.dye)
  const lip = LIPS.find((l) => l.key === look.lip)
  const eye = SHADOWS.find((s) => s.key === look.eye)

  const marks: Mark[] = []

  // --- did you look after them at all ---
  const met = client.needs.filter((n) => client.done.includes(n)).length
  const care = client.needs.length ? met / client.needs.length : 1
  marks.push({
    key: 'care',
    label: 'Looked after',
    score: care,
    note:
      care === 1
        ? 'Everything they asked for.'
        : met === 0
          ? 'They asked for things and got none of them.'
          : `${met} of ${client.needs.length} things they asked for.`,
  })

  // --- hair sorted before styling ---
  const hairOk =
    (!client.tangled || client.done.includes('detangle')) &&
    (!client.greasy || client.done.includes('wash'))
  marks.push({
    key: 'hair',
    label: 'Hair prepared',
    score: hairOk ? 1 : 0,
    note: hairOk ? 'Clean, combed, ready to style.' : 'Styled over a mess, and it shows.',
  })

  // --- right register for the occasion ---
  const levels: number[] = [...pieces.map((g) => g.formality), style?.formality ?? 1]
  const gap = levels.reduce((n, f) => n + Math.abs(f - occasion.formality), 0) / levels.length
  const fit = Math.max(0, 1 - gap / 2)
  marks.push({
    key: 'occasion',
    label: `Right for ${occasion.label}`,
    score: fit,
    note:
      fit > 0.85
        ? 'Pitched exactly right.'
        : gap > 1.2
          ? 'Nowhere near the right register.'
          : 'A little off for the occasion.',
  })

  // --- their taste ---
  const voices = [
    ...pieces.map((g) => g.vibe),
    style?.vibe,
    dye?.vibe,
    lip?.vibe,
    eye?.vibe,
  ].filter((v): v is Vibe => !!v)
  const onVibe = voices.filter((v) => v === client.wants).length / voices.length
  marks.push({
    key: 'vibe',
    label: `Wanted ${VIBES[client.wants].label.toLowerCase()}`,
    score: Math.min(1, onVibe * 1.5),
    note:
      onVibe >= 0.6
        ? 'Exactly their sort of thing.'
        : onVibe >= 0.3
          ? 'Half of it is them.'
          : 'This is not who they are.',
  })

  // --- their colour, and a palette that holds together ---
  const families = new Set(pieces.map((g) => g.family))
  if (dye) families.add(dye.family)
  const hasFavourite =
    pieces.some((g) => g.family === client.favourite) || dye?.family === client.favourite
  const tidy = families.size <= 3 ? 1 : families.size === 4 ? 0.6 : 0.25
  const colour = (hasFavourite ? 0.6 : 0) + tidy * 0.4
  marks.push({
    key: 'colour',
    label: `Loves ${FAMILY_LABEL[client.favourite]}`,
    score: colour,
    note: hasFavourite
      ? families.size <= 3
        ? 'Their colour, and it all hangs together.'
        : 'Their colour, but the palette is busy.'
      : 'Not a scrap of their favourite colour.',
  })

  const score = marks.reduce((n, m) => n + m.score, 0) / marks.length
  const fee = occasion.fee
  const tip = Math.round(fee * 0.8 * Math.max(0, score - 0.4))

  return {
    marks,
    score,
    fee,
    tip,
    reaction:
      score > 0.9
        ? 'They cannot stop looking in the mirror.'
        : score > 0.72
          ? 'Delighted. They will be back.'
          : score > 0.5
            ? 'Pleased enough, and polite about the rest.'
            : score > 0.3
              ? 'They say it is fine. They do not mean it.'
              : 'They leave quickly and do not look back.',
  }
}

/** Is this piece bought and available? */
export function owns(save: SpaSave, key: string): boolean {
  return save.unlocked.includes(key)
}

export const ARRIVAL_MS = 5_000

export function spaPending(s: SpaSave | undefined, now: number) {
  if (!s) return null
  if (s.client) {
    const busy = s.client.busy
    return busy && now < busy.doneAt ? null : { count: 1 }
  }
  return now >= (s.nextArrivalAt ?? 0) ? { count: 1 } : null
}
