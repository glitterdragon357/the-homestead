/**
 * Snake Dash.
 *
 * An arena full of snakes eating pellets and each other. Everything here
 * is arithmetic and rules - no drawing, no React - so the collision
 * rules can be checked without a browser, which matters because they are
 * the whole game and they are easy to get subtly wrong.
 */

/* ------------------------------------------------------------------ */
/* Maps                                                                */
/* ------------------------------------------------------------------ */

export interface MapSpec {
  key: string
  name: string
  blurb: string
  w: number
  h: number
  rivals: number
  pellets: number
  /** Floor at the centre, floor at the edges, the grid, and the wall. */
  floorIn: string
  floorOut: string
  grid: string
  wall: string
}

export const MAPS: MapSpec[] = [
  {
    key: 'pit',
    name: 'The Pit',
    blurb: 'Open ground, room to run, and eight others in it with you.',
    w: 2600,
    h: 2000,
    rivals: 8,
    pellets: 260,
    floorIn: '#16243a',
    floorOut: '#0a1220',
    grid: 'rgba(120,170,230,0.075)',
    wall: '126,196,255',
  },
  {
    key: 'meadow',
    name: 'The Meadow',
    blurb: 'Gentle, green and forgiving. A good place to learn.',
    w: 3000,
    h: 2400,
    rivals: 5,
    pellets: 400,
    floorIn: '#1b3320',
    floorOut: '#0a1608',
    grid: 'rgba(150,220,150,0.075)',
    wall: '160,240,170',
  },
  {
    key: 'grove',
    name: 'The Grove',
    blurb: 'Wide and well fed. Fewer rivals, and plenty to grow on.',
    w: 3200,
    h: 2600,
    rivals: 6,
    pellets: 420,
    floorIn: '#16301f',
    floorOut: '#081409',
    grid: 'rgba(140,220,150,0.075)',
    wall: '150,240,170',
  },
  {
    key: 'wide-sky',
    name: 'Wide Sky',
    blurb: 'Enormous and nearly empty. You will go looking for trouble.',
    w: 4200,
    h: 3400,
    rivals: 7,
    pellets: 520,
    floorIn: '#1a2a3e',
    floorOut: '#0b1524',
    grid: 'rgba(150,190,240,0.075)',
    wall: '170,210,255',
  },
  {
    key: 'shelf',
    name: 'The Shelf',
    blurb: 'A broad ledge. Everything happens along it.',
    w: 3800,
    h: 1500,
    rivals: 8,
    pellets: 300,
    floorIn: '#122c30',
    floorOut: '#071618',
    grid: 'rgba(130,210,210,0.075)',
    wall: '140,230,230',
  },
  {
    key: 'narrows',
    name: 'The Narrows',
    blurb: 'Long and thin. Nowhere to slip past anything bigger than you.',
    w: 3600,
    h: 1100,
    rivals: 9,
    pellets: 250,
    floorIn: '#22203a',
    floorOut: '#0e0c1a',
    grid: 'rgba(180,150,235,0.075)',
    wall: '190,160,255',
  },
  {
    key: 'long-water',
    name: 'Long Water',
    blurb: 'Narrower still, and darker. Committed, either way.',
    w: 4000,
    h: 900,
    rivals: 9,
    pellets: 240,
    floorIn: '#0e2438',
    floorOut: '#05101c',
    grid: 'rgba(120,180,230,0.075)',
    wall: '130,200,255',
  },
  {
    key: 'causeway',
    name: 'The Causeway',
    blurb: 'A thin road with drops on both sides.',
    w: 4400,
    h: 780,
    rivals: 10,
    pellets: 230,
    floorIn: '#2a2418',
    floorOut: '#14100a',
    grid: 'rgba(220,190,130,0.075)',
    wall: '240,205,140',
  },
  {
    key: 'steppe',
    name: 'The Steppe',
    blurb: 'Flat, wide and cold. Long sight lines.',
    w: 3600,
    h: 2800,
    rivals: 7,
    pellets: 360,
    floorIn: '#242c1e',
    floorOut: '#10140c',
    grid: 'rgba(190,200,150,0.075)',
    wall: '205,215,160',
  },
  {
    key: 'saltflats',
    name: 'Saltflats',
    blurb: 'White ground, no cover, nothing to hide behind.',
    w: 3400,
    h: 2600,
    rivals: 8,
    pellets: 330,
    floorIn: '#2e3034',
    floorOut: '#16181a',
    grid: 'rgba(220,220,225,0.075)',
    wall: '240,240,245',
  },
  {
    key: 'hollow',
    name: 'The Hollow',
    blurb: 'A dip in the ground. Everything rolls toward the middle.',
    w: 2400,
    h: 2200,
    rivals: 8,
    pellets: 280,
    floorIn: '#1c1828',
    floorOut: '#0c0a14',
    grid: 'rgba(170,150,210,0.075)',
    wall: '185,165,230',
  },
  {
    key: 'warren',
    name: 'The Warren',
    blurb: 'Cramped and busy. You will meet things you did not choose to.',
    w: 2000,
    h: 1800,
    rivals: 10,
    pellets: 240,
    floorIn: '#2a2018',
    floorOut: '#130e08',
    grid: 'rgba(210,170,130,0.075)',
    wall: '230,185,140',
  },
  {
    key: 'terraces',
    name: 'The Terraces',
    blurb: 'Stepped ground in bands of colour.',
    w: 2800,
    h: 2400,
    rivals: 8,
    pellets: 320,
    floorIn: '#1e2a22',
    floorOut: '#0c150e',
    grid: 'rgba(160,200,170,0.075)',
    wall: '175,215,185',
  },
  {
    key: 'emberfield',
    name: 'Emberfield',
    blurb: 'Warm ground, warm light, and everything faster than it looks.',
    w: 2600,
    h: 2000,
    rivals: 9,
    pellets: 270,
    floorIn: '#331c14',
    floorOut: '#160a06',
    grid: 'rgba(255,160,120,0.075)',
    wall: '255,170,120',
  },
  {
    key: 'kiln',
    name: 'The Kiln',
    blurb: 'Small, hot, and there is nowhere to be that is not near someone.',
    w: 1900,
    h: 1500,
    rivals: 10,
    pellets: 210,
    floorIn: '#3a1c10',
    floorOut: '#180806',
    grid: 'rgba(255,140,90,0.075)',
    wall: '255,150,100',
  },
  {
    key: 'crucible',
    name: 'The Crucible',
    blurb: 'Small, crowded and mean. You will meet everything, quickly.',
    w: 1700,
    h: 1300,
    rivals: 10,
    pellets: 190,
    floorIn: '#341c1c',
    floorOut: '#160808',
    grid: 'rgba(255,150,130,0.075)',
    wall: '255,150,120',
  },
  {
    key: 'maw',
    name: 'The Maw',
    blurb: 'The smallest there is. Thirty seconds is a long run.',
    w: 1400,
    h: 1100,
    rivals: 11,
    pellets: 170,
    floorIn: '#2a0f14',
    floorOut: '#120406',
    grid: 'rgba(255,120,130,0.075)',
    wall: '255,130,140',
  },
  {
    key: 'coldstore',
    name: 'Coldstore',
    blurb: 'Pale blue and very quiet until it is not.',
    w: 2600,
    h: 2100,
    rivals: 8,
    pellets: 290,
    floorIn: '#182a34',
    floorOut: '#08141a',
    grid: 'rgba(170,220,240,0.075)',
    wall: '180,235,255',
  },
  {
    key: 'floe',
    name: 'The Floe',
    blurb: 'Broken white ground on dark water.',
    w: 3000,
    h: 2300,
    rivals: 8,
    pellets: 300,
    floorIn: '#1d2c38',
    floorOut: '#0a141c',
    grid: 'rgba(200,225,240,0.075)',
    wall: '215,240,255',
  },
  {
    key: 'duskrun',
    name: 'Duskrun',
    blurb: 'Half light. Everything is a silhouette until it is close.',
    w: 3000,
    h: 2200,
    rivals: 9,
    pellets: 280,
    floorIn: '#241a2e',
    floorOut: '#0e0814',
    grid: 'rgba(190,160,220,0.075)',
    wall: '205,175,240',
  },
  {
    key: 'nightmarket',
    name: 'Nightmarket',
    blurb: 'Dark ground, bright pellets, a great deal going on.',
    w: 2800,
    h: 2200,
    rivals: 10,
    pellets: 380,
    floorIn: '#1a1424',
    floorOut: '#0a0610',
    grid: 'rgba(230,180,120,0.075)',
    wall: '250,200,140',
  },
  {
    key: 'glasshouse',
    name: 'The Glasshouse',
    blurb: 'Clean, bright and completely exposed.',
    w: 2600,
    h: 2000,
    rivals: 8,
    pellets: 320,
    floorIn: '#1c2e2c',
    floorOut: '#0a1614',
    grid: 'rgba(180,235,220,0.075)',
    wall: '195,250,235',
  },
  {
    key: 'ironworks',
    name: 'Ironworks',
    blurb: 'Grey and hard. Nothing here is soft.',
    w: 3000,
    h: 2000,
    rivals: 9,
    pellets: 270,
    floorIn: '#22262a',
    floorOut: '#0e1012',
    grid: 'rgba(180,190,200,0.075)',
    wall: '195,205,215',
  },
  {
    key: 'spiral',
    name: 'The Spiral',
    blurb: 'Wide, round-feeling ground that draws you inward.',
    w: 3200,
    h: 3000,
    rivals: 8,
    pellets: 360,
    floorIn: '#1e1a30',
    floorOut: '#0c0a16',
    grid: 'rgba(175,165,225,0.075)',
    wall: '190,180,245',
  },
  {
    key: 'gauntlet',
    name: 'The Gauntlet',
    blurb: 'Long, thin, crowded and fast. The hardest run there is.',
    w: 4600,
    h: 820,
    rivals: 11,
    pellets: 240,
    floorIn: '#30121a',
    floorOut: '#140408',
    grid: 'rgba(255,130,150,0.075)',
    wall: '255,140,160',
  },
  {
    key: 'chimney',
    name: 'The Chimney',
    blurb: 'Taller than it is wide. Everything comes at you from above or below.',
    w: 900,
    h: 3600,
    rivals: 9,
    pellets: 250,
    floorIn: '#1e1a26',
    floorOut: '#0c0a12',
    grid: 'rgba(190,175,215,0.075)',
    wall: '205,190,235',
  },
  {
    key: 'well',
    name: 'The Well',
    blurb: 'Deep and narrow. You will be circling.',
    w: 1200,
    h: 2600,
    rivals: 8,
    pellets: 230,
    floorIn: '#141c26',
    floorOut: '#070c12',
    grid: 'rgba(150,180,215,0.075)',
    wall: '165,195,235',
  },
  {
    key: 'rookery',
    name: 'Rookery',
    blurb: 'Tall, noisy and stacked. Something is always overhead.',
    w: 1600,
    h: 3200,
    rivals: 8,
    pellets: 300,
    floorIn: '#26201a',
    floorOut: '#110d0a',
    grid: 'rgba(215,190,160,0.075)',
    wall: '235,205,170',
  },
  {
    key: 'ladder',
    name: 'The Ladder',
    blurb: 'A tall thin shaft and eleven of you in it.',
    w: 700,
    h: 4200,
    rivals: 11,
    pellets: 240,
    floorIn: '#2a1620',
    floorOut: '#12060c',
    grid: 'rgba(240,150,180,0.075)',
    wall: '255,160,190',
  },
  {
    key: 'standing-stones',
    name: 'Standing Stones',
    blurb: 'Tall, cold and quiet between the fighting.',
    w: 1800,
    h: 3000,
    rivals: 7,
    pellets: 320,
    floorIn: '#1c2228',
    floorOut: '#0a0e12',
    grid: 'rgba(180,195,205,0.075)',
    wall: '195,210,225',
  },
  {
    key: 'hungry-ground',
    name: 'Hungry Ground',
    blurb: 'Thin pickings. If you want to grow you will have to take it off somebody.',
    w: 2800,
    h: 2200,
    rivals: 10,
    pellets: 120,
    floorIn: '#241f18',
    floorOut: '#100d08',
    grid: 'rgba(205,185,150,0.075)',
    wall: '225,200,160',
  },
  {
    key: 'lean-season',
    name: 'Lean Season',
    blurb: 'Little food, plenty of company.',
    w: 3200,
    h: 2400,
    rivals: 9,
    pellets: 140,
    floorIn: '#1f241c',
    floorOut: '#0c100a',
    grid: 'rgba(185,205,170,0.075)',
    wall: '200,220,180',
  },
  {
    key: 'fast',
    name: 'The Fast',
    blurb: 'Almost nothing to eat. Work it out.',
    w: 2200,
    h: 1800,
    rivals: 11,
    pellets: 110,
    floorIn: '#2a1a16',
    floorOut: '#120806',
    grid: 'rgba(230,160,140,0.075)',
    wall: '250,170,150',
  },
  {
    key: 'windfall',
    name: 'Windfall',
    blurb: 'More food than anyone can eat. Everything gets big.',
    w: 3000,
    h: 2400,
    rivals: 6,
    pellets: 560,
    floorIn: '#1c2e18',
    floorOut: '#0a1408',
    grid: 'rgba(170,225,150,0.075)',
    wall: '185,245,165',
  },
  {
    key: 'bloom',
    name: 'The Bloom',
    blurb: 'Absurdly fertile. A race rather than a fight.',
    w: 3400,
    h: 2600,
    rivals: 7,
    pellets: 620,
    floorIn: '#22301c',
    floorOut: '#0d160a',
    grid: 'rgba(190,235,160,0.075)',
    wall: '205,255,175',
  },
  {
    key: 'spawning-grounds',
    name: 'Spawning Grounds',
    blurb: 'Thick with it. Level ten inside a minute, if you live.',
    w: 2600,
    h: 2100,
    rivals: 8,
    pellets: 540,
    floorIn: '#152a2c',
    floorOut: '#061214',
    grid: 'rgba(150,220,225,0.075)',
    wall: '165,240,245',
  },
  {
    key: 'ashfall',
    name: 'Ashfall',
    blurb: 'Grey ground, grey air, grey everything.',
    w: 3000,
    h: 2200,
    rivals: 9,
    pellets: 280,
    floorIn: '#242424',
    floorOut: '#101010',
    grid: 'rgba(200,200,200,0.075)',
    wall: '220,220,220',
  },
  {
    key: 'verge',
    name: 'The Verge',
    blurb: 'Where the good grass gives out.',
    w: 2800,
    h: 2300,
    rivals: 7,
    pellets: 340,
    floorIn: '#26281a',
    floorOut: '#10120a',
    grid: 'rgba(205,215,150,0.075)',
    wall: '220,230,160',
  },
  {
    key: 'tin-alley',
    name: 'Tin Alley',
    blurb: 'A long narrow run between two walls.',
    w: 3800,
    h: 860,
    rivals: 10,
    pellets: 240,
    floorIn: '#22242a',
    floorOut: '#0e1014',
    grid: 'rgba(185,195,215,0.075)',
    wall: '200,210,235',
  },
  {
    key: 'shoal-water',
    name: 'Shoal Water',
    blurb: 'Shallow, bright, and you can be seen from anywhere.',
    w: 3200,
    h: 2000,
    rivals: 8,
    pellets: 380,
    floorIn: '#153038',
    floorOut: '#061418',
    grid: 'rgba(150,215,230,0.075)',
    wall: '165,235,250',
  },
  {
    key: 'moth-hour',
    name: 'Moth Hour',
    blurb: 'The light going. Colours are guesses now.',
    w: 2600,
    h: 2000,
    rivals: 9,
    pellets: 300,
    floorIn: '#201c2a',
    floorOut: '#0d0a14',
    grid: 'rgba(175,165,205,0.075)',
    wall: '190,180,225',
  },
  {
    key: 'quarry',
    name: 'The Quarry',
    blurb: 'Cut stone and hard edges.',
    w: 2200,
    h: 1900,
    rivals: 9,
    pellets: 250,
    floorIn: '#282622',
    floorOut: '#12100e',
    grid: 'rgba(200,195,185,0.075)',
    wall: '215,210,200',
  },
  {
    key: 'peat',
    name: 'Peat',
    blurb: 'Dark, soft and slow underfoot.',
    w: 2400,
    h: 2000,
    rivals: 8,
    pellets: 300,
    floorIn: '#241c14',
    floorOut: '#100a06',
    grid: 'rgba(195,170,135,0.075)',
    wall: '215,185,145',
  },
  {
    key: 'saltmarsh',
    name: 'Saltmarsh',
    blurb: 'Flat, wet and open for miles.',
    w: 3400,
    h: 2200,
    rivals: 8,
    pellets: 340,
    floorIn: '#1e2a24',
    floorOut: '#0c1410',
    grid: 'rgba(180,215,195,0.075)',
    wall: '195,235,210',
  },
  {
    key: 'snowbound',
    name: 'Snowbound',
    blurb: 'White ground and a low sky.',
    w: 3000,
    h: 2400,
    rivals: 8,
    pellets: 310,
    floorIn: '#222a32',
    floorOut: '#0e1218',
    grid: 'rgba(210,225,240,0.075)',
    wall: '225,240,255',
  },
  {
    key: 'glasswater',
    name: 'Glasswater',
    blurb: 'Still enough to see the bottom.',
    w: 3600,
    h: 2400,
    rivals: 7,
    pellets: 360,
    floorIn: '#16282e',
    floorOut: '#061014',
    grid: 'rgba(160,205,220,0.075)',
    wall: '175,225,240',
  },
  {
    key: 'lastlight',
    name: 'Lastlight',
    blurb: 'The last twenty minutes of the day.',
    w: 2800,
    h: 2000,
    rivals: 9,
    pellets: 290,
    floorIn: '#2c1e1a',
    floorOut: '#14090a',
    grid: 'rgba(240,175,140,0.075)',
    wall: '255,185,150',
  },
  {
    key: 'slagfield',
    name: 'Slagfield',
    blurb: 'What the works threw out.',
    w: 2600,
    h: 1900,
    rivals: 10,
    pellets: 260,
    floorIn: '#2a2018',
    floorOut: '#120c08',
    grid: 'rgba(215,175,130,0.075)',
    wall: '235,190,140',
  },
  {
    key: 'lantern',
    name: 'The Lantern',
    blurb: 'Dark ground, and everything on it lit.',
    w: 2400,
    h: 1900,
    rivals: 9,
    pellets: 330,
    floorIn: '#14131c',
    floorOut: '#08070c',
    grid: 'rgba(230,205,150,0.075)',
    wall: '250,220,160',
  },
  {
    key: 'colosseum',
    name: 'The Colosseum',
    blurb: 'Square, crowded, and everyone can see everyone.',
    w: 2000,
    h: 2000,
    rivals: 12,
    pellets: 220,
    floorIn: '#2a1c1c',
    floorOut: '#120808',
    grid: 'rgba(235,170,160,0.075)',
    wall: '255,180,170',
  },
]

export const MAP_BY_KEY: Record<string, MapSpec> = Object.fromEntries(MAPS.map((m) => [m.key, m]))

/** The default, and the size everything falls back to. */
export const ARENA = { w: MAPS[0].w, h: MAPS[0].h }

/* ------------------------------------------------------------------ */
/* Skins                                                              */
/* ------------------------------------------------------------------ */

/**
 * How a skin is marked.
 *
 * Six was enough for eight skins. For a hundred it is not - without
 * enough shapes they start to read as the same snake in a different
 * colour, which is not a hundred skins, it is one skin and a palette.
 */
export type Pattern =
  | 'bands'
  | 'stripe'
  | 'diamond'
  | 'solid'
  | 'glow'
  | 'shift'
  | 'speckle'
  | 'rings'
  | 'ladder'
  | 'twotone'
  | 'metal'
  | 'ghost'
  | 'vanish'
  // Textures: motifs with a shape of their own, rather than a colour
  // laid over the body.
  | 'skull'
  | 'bones'
  | 'scales'
  | 'spikes'
  | 'eyes'
  | 'stitch'
  | 'chevron'
  | 'web'

export interface Skin {
  key: string
  name: string
  blurb: string
  hue: number
  /** The marking colour. Patterns that need two colours use this. */
  accent: number
  pattern: Pattern
  /** Which set it belongs to, for grouping them in the picker. */
  family: string
  /**
   * How saturated the body is. Bone and stone need to sit near grey, and
   * the default of 72 makes everything look like a sweet.
   */
  sat?: number
  /** Nothing to pay for the first few. */
  cost: number
}

export const SKINS: Skin[] = [
  { key: 'grass', name: 'Grass', blurb: 'The one you started in.', hue: 76, accent: 226, pattern: 'bands', family: 'Garden', cost: 0 },
  { key: 'fern', name: 'Fern', blurb: 'Soft banding, low light.', hue: 84, accent: 260, pattern: 'speckle', family: 'Garden', cost: 0 },
  { key: 'moss', name: 'Moss', blurb: 'Damp and dark and hard to see.', hue: 90, accent: 292, pattern: 'stripe', family: 'Garden', cost: 0 },
  { key: 'ivy', name: 'Ivy', blurb: 'It climbs.', hue: 98, accent: 248, pattern: 'ladder', family: 'Garden', cost: 80 },
  { key: 'clover', name: 'Clover', blurb: 'Three leaves, and the fourth somewhere.', hue: 104, accent: 280, pattern: 'diamond', family: 'Garden', cost: 80 },
  { key: 'nettle', name: 'Nettle', blurb: 'Looks worse than it is.', hue: 112, accent: 314, pattern: 'twotone', family: 'Garden', cost: 140 },
  { key: 'thistle', name: 'Thistle', blurb: 'Purple heads on a green stem.', hue: 118, accent: 268, pattern: 'rings', family: 'Garden', cost: 140 },
  { key: 'lichen', name: 'Lichen', blurb: 'Grey-green, slow, patient.', hue: 126, accent: 302, pattern: 'solid', family: 'Garden', cost: 220 },
  { key: 'bramble', name: 'Bramble', blurb: 'Thorned all the way down.', hue: 132, accent: 334, pattern: 'bands', family: 'Garden', cost: 220 },
  { key: 'hedge', name: 'Hedge', blurb: 'Clipped square, oddly.', hue: 140, accent: 290, pattern: 'ladder', family: 'Garden', cost: 320 },
  { key: 'deep', name: 'Deep', blurb: 'A single pale stripe down the spine.', hue: 164, accent: 314, pattern: 'stripe', family: 'Tidewater', cost: 0 },
  { key: 'tide', name: 'Tide', blurb: 'Comes in, goes out.', hue: 172, accent: 348, pattern: 'bands', family: 'Tidewater', cost: 0 },
  { key: 'lagoon', name: 'Lagoon', blurb: 'Warm water over white sand.', hue: 178, accent: 20, pattern: 'twotone', family: 'Tidewater', cost: 80 },
  { key: 'kelp', name: 'Kelp', blurb: 'Long and swaying.', hue: 186, accent: 336, pattern: 'ladder', family: 'Tidewater', cost: 80 },
  { key: 'reef', name: 'Reef', blurb: 'Busy, bright, full of teeth.', hue: 192, accent: 8, pattern: 'diamond', family: 'Tidewater', cost: 140 },
  { key: 'current', name: 'Current', blurb: 'Always going somewhere.', hue: 200, accent: 42, pattern: 'shift', family: 'Tidewater', cost: 140 },
  { key: 'shallows', name: 'Shallows', blurb: 'Sunlight on the bottom.', hue: 206, accent: 356, pattern: 'speckle', family: 'Tidewater', cost: 220 },
  { key: 'brine', name: 'Brine', blurb: 'Salt-crusted.', hue: 214, accent: 30, pattern: 'rings', family: 'Tidewater', cost: 220 },
  { key: 'trench', name: 'Trench', blurb: 'Where the light stops.', hue: 220, accent: 62, pattern: 'solid', family: 'Tidewater', cost: 320 },
  { key: 'abyss', name: 'Abyss', blurb: 'Below even that.', hue: 228, accent: 18, pattern: 'ghost', family: 'Tidewater', cost: 450 },
  { key: 'coral', name: 'Coral', blurb: 'Warm banding, hard to lose in a crowd.', hue: 344, accent: 134, pattern: 'bands', family: 'Ember', cost: 0 },
  { key: 'cinder', name: 'Cinder', blurb: 'Still warm.', hue: 352, accent: 168, pattern: 'speckle', family: 'Ember', cost: 80 },
  { key: 'rust', name: 'Rust', blurb: 'Slow, orange, inevitable.', hue: 358, accent: 200, pattern: 'rings', family: 'Ember', cost: 80 },
  { key: 'flare', name: 'Flare', blurb: 'Brief and very bright.', hue: 6, accent: 156, pattern: 'glow', family: 'Ember', cost: 140 },
  { key: 'kiln', name: 'Kiln', blurb: 'Fired hard.', hue: 12, accent: 188, pattern: 'twotone', family: 'Ember', cost: 140 },
  { key: 'scorch', name: 'Scorch', blurb: 'Marks left behind.', hue: 20, accent: 222, pattern: 'ladder', family: 'Ember', cost: 220 },
  { key: 'magma', name: 'Magma', blurb: 'Cracked black over red.', hue: 26, accent: 176, pattern: 'diamond', family: 'Ember', cost: 320 },
  { key: 'furnace', name: 'Furnace', blurb: 'Lit from the inside.', hue: 34, accent: 210, pattern: 'glow', family: 'Ember', cost: 320 },
  { key: 'pyre', name: 'Pyre', blurb: 'Ceremonial.', hue: 40, accent: 242, pattern: 'shift', family: 'Ember', cost: 450 },
  { key: 'wildfire', name: 'Wildfire', blurb: 'Moves faster than you do.', hue: 48, accent: 198, pattern: 'glow', family: 'Ember', cost: 600 },
  { key: 'rime', name: 'Rime', blurb: 'Feathered ice on every edge.', hue: 158, accent: 308, pattern: 'speckle', family: 'Frost', cost: 80 },
  { key: 'sleet', name: 'Sleet', blurb: 'Half rain, half not.', hue: 166, accent: 342, pattern: 'stripe', family: 'Frost', cost: 80 },
  { key: 'drift', name: 'Drift', blurb: 'Piled up against something.', hue: 172, accent: 14, pattern: 'twotone', family: 'Frost', cost: 140 },
  { key: 'hail', name: 'Hail', blurb: 'Hard and round.', hue: 180, accent: 330, pattern: 'rings', family: 'Frost', cost: 140 },
  { key: 'floe', name: 'Floe', blurb: 'Broken plates of it.', hue: 186, accent: 2, pattern: 'ladder', family: 'Frost', cost: 220 },
  { key: 'thaw', name: 'Thaw', blurb: 'Giving way.', hue: 194, accent: 36, pattern: 'bands', family: 'Frost', cost: 220 },
  { key: 'glacier', name: 'Glacier', blurb: 'Slow, enormous, blue underneath.', hue: 200, accent: 350, pattern: 'glow', family: 'Frost', cost: 320 },
  { key: 'icefall', name: 'Icefall', blurb: 'All of it coming down.', hue: 208, accent: 24, pattern: 'diamond', family: 'Frost', cost: 320 },
  { key: 'blizzard', name: 'Blizzard', blurb: 'You cannot see the walls.', hue: 214, accent: 56, pattern: 'ghost', family: 'Frost', cost: 450 },
  { key: 'permafrost', name: 'Permafrost', blurb: 'Never once melted.', hue: 222, accent: 244, pattern: 'metal', family: 'Frost', cost: 600 },
  { key: 'ink', name: 'Ink', blurb: 'No pattern at all. Just a shape in the dark.', hue: 236, accent: 26, pattern: 'solid', family: 'Twilight', cost: 80 },
  { key: 'dusk', name: 'Dusk', blurb: 'The blue half hour.', hue: 244, accent: 60, pattern: 'stripe', family: 'Twilight', cost: 80 },
  { key: 'indigo', name: 'Indigo', blurb: 'Deeper than it looks.', hue: 250, accent: 92, pattern: 'twotone', family: 'Twilight', cost: 140 },
  { key: 'vesper', name: 'Vesper', blurb: 'Evening, and a bell.', hue: 258, accent: 48, pattern: 'bands', family: 'Twilight', cost: 140 },
  { key: 'gloaming', name: 'Gloaming', blurb: 'The word for it.', hue: 264, accent: 80, pattern: 'ghost', family: 'Twilight', cost: 220 },
  { key: 'umbra', name: 'Umbra', blurb: 'The dark part of a shadow.', hue: 272, accent: 114, pattern: 'solid', family: 'Twilight', cost: 220 },
  { key: 'nebula', name: 'Nebula', blurb: 'Lit gas, very far off.', hue: 278, accent: 68, pattern: 'shift', family: 'Twilight', cost: 320 },
  { key: 'starling', name: 'Starling', blurb: 'A thousand of them turning at once.', hue: 286, accent: 102, pattern: 'speckle', family: 'Twilight', cost: 320 },
  { key: 'midnight', name: 'Midnight', blurb: 'Not the hour, the colour.', hue: 292, accent: 134, pattern: 'ghost', family: 'Twilight', cost: 450 },
  { key: 'eventide', name: 'Eventide', blurb: 'The last of it.', hue: 300, accent: 90, pattern: 'shift', family: 'Twilight', cost: 600 },
  { key: 'dune', name: 'Dune', blurb: 'Wind-carved, always moving.', hue: 10, accent: 160, pattern: 'bands', family: 'Sunbaked', cost: 80 },
  { key: 'ochre', name: 'Ochre', blurb: 'The oldest pigment there is.', hue: 18, accent: 194, pattern: 'solid', family: 'Sunbaked', cost: 80 },
  { key: 'adobe', name: 'Adobe', blurb: 'Baked mud, sun side up.', hue: 24, accent: 226, pattern: 'ladder', family: 'Sunbaked', cost: 140 },
  { key: 'mirage', name: 'Mirage', blurb: 'Not really there.', hue: 32, accent: 182, pattern: 'ghost', family: 'Sunbaked', cost: 140 },
  { key: 'saffron', name: 'Saffron', blurb: 'Worth more than gold by weight.', hue: 38, accent: 214, pattern: 'speckle', family: 'Sunbaked', cost: 220 },
  { key: 'sirocco', name: 'Sirocco', blurb: 'A hot wind with sand in it.', hue: 46, accent: 248, pattern: 'stripe', family: 'Sunbaked', cost: 220 },
  { key: 'sandstone', name: 'Sandstone', blurb: 'Layered, and it shows.', hue: 52, accent: 202, pattern: 'twotone', family: 'Sunbaked', cost: 320 },
  { key: 'basking', name: 'Basking', blurb: 'Flat out on a warm rock.', hue: 60, accent: 236, pattern: 'bands', family: 'Sunbaked', cost: 320 },
  { key: 'sunstruck', name: 'Sunstruck', blurb: 'Too bright to look at.', hue: 66, accent: 268, pattern: 'glow', family: 'Sunbaked', cost: 450 },
  { key: 'wadi', name: 'Wadi', blurb: 'Dry until it very much is not.', hue: 74, accent: 224, pattern: 'rings', family: 'Sunbaked', cost: 600 },
  { key: 'vine', name: 'Vine', blurb: 'Wound round something taller.', hue: 52, accent: 202, pattern: 'stripe', family: 'Canopy', cost: 80 },
  { key: 'sap', name: 'Sap', blurb: 'Sticky and golden.', hue: 60, accent: 236, pattern: 'twotone', family: 'Canopy', cost: 80 },
  { key: 'bower', name: 'Bower', blurb: 'Green shade, all day.', hue: 66, accent: 268, pattern: 'bands', family: 'Canopy', cost: 140 },
  { key: 'frond', name: 'Frond', blurb: 'Splits into fingers.', hue: 74, accent: 224, pattern: 'ladder', family: 'Canopy', cost: 140 },
  { key: 'mangrove', name: 'Mangrove', blurb: 'Roots in salt water.', hue: 80, accent: 256, pattern: 'rings', family: 'Canopy', cost: 220 },
  { key: 'verdant', name: 'Verdant', blurb: 'Almost aggressively alive.', hue: 88, accent: 290, pattern: 'speckle', family: 'Canopy', cost: 220 },
  { key: 'orchid', name: 'Orchid', blurb: 'Extravagant for no reason.', hue: 94, accent: 244, pattern: 'diamond', family: 'Canopy', cost: 320 },
  { key: 'tanager', name: 'Tanager', blurb: 'A red bird in a green tree.', hue: 102, accent: 278, pattern: 'twotone', family: 'Canopy', cost: 320 },
  { key: 'understory', name: 'Understory', blurb: 'Everything below the light.', hue: 108, accent: 310, pattern: 'solid', family: 'Canopy', cost: 450 },
  { key: 'heartwood', name: 'Heartwood', blurb: 'The oldest rings.', hue: 116, accent: 266, pattern: 'rings', family: 'Canopy', cost: 600 },
  { key: 'pewter', name: 'Pewter', blurb: 'Dull, soft, honest.', hue: 356, accent: 18, pattern: 'metal', family: 'Forge', cost: 80 },
  { key: 'iron', name: 'Iron', blurb: 'Plain and heavy.', hue: 4, accent: 180, pattern: 'solid', family: 'Forge', cost: 80 },
  { key: 'brass', name: 'Brass', blurb: 'Polished on the high spots.', hue: 10, accent: 32, pattern: 'metal', family: 'Forge', cost: 140 },
  { key: 'copper', name: 'Copper', blurb: 'Going green at the edges.', hue: 18, accent: 168, pattern: 'twotone', family: 'Forge', cost: 140 },
  { key: 'gunmetal', name: 'Gunmetal', blurb: 'Blued and matte.', hue: 24, accent: 46, pattern: 'metal', family: 'Forge', cost: 220 },
  { key: 'solder', name: 'Solder', blurb: 'Silver run into a seam.', hue: 32, accent: 234, pattern: 'stripe', family: 'Forge', cost: 220 },
  { key: 'chrome', name: 'Chrome', blurb: 'You can see yourself in it.', hue: 38, accent: 60, pattern: 'metal', family: 'Forge', cost: 320 },
  { key: 'alloy', name: 'Alloy', blurb: 'Better than either part.', hue: 46, accent: 222, pattern: 'ladder', family: 'Forge', cost: 320 },
  { key: 'filigree', name: 'Filigree', blurb: 'Wire worked far too fine.', hue: 52, accent: 254, pattern: 'diamond', family: 'Forge', cost: 450 },
  { key: 'anvil', name: 'Anvil', blurb: 'Takes the blow, keeps the shape.', hue: 60, accent: 82, pattern: 'metal', family: 'Forge', cost: 600 },
  { key: 'circuit', name: 'Circuit', blurb: 'Traced lines, faintly lit.', hue: 268, accent: 58, pattern: 'ladder', family: 'Voltage', cost: 140 },
  { key: 'static', name: 'Static', blurb: 'Between stations.', hue: 276, accent: 92, pattern: 'speckle', family: 'Voltage', cost: 140 },
  { key: 'arcade', name: 'Arcade', blurb: 'Nineteen eighty-something.', hue: 282, accent: 124, pattern: 'diamond', family: 'Voltage', cost: 220 },
  { key: 'pulse', name: 'Pulse', blurb: 'On, off, on.', hue: 290, accent: 80, pattern: 'rings', family: 'Voltage', cost: 220 },
  { key: 'laser', name: 'Laser', blurb: 'One wavelength, all the way down.', hue: 296, accent: 112, pattern: 'stripe', family: 'Voltage', cost: 320 },
  { key: 'strobe', name: 'Strobe', blurb: 'Best not looked at directly.', hue: 304, accent: 146, pattern: 'glow', family: 'Voltage', cost: 320 },
  { key: 'spectrum', name: 'Spectrum', blurb: 'The colour walks down the body as you move.', hue: 310, accent: 100, pattern: 'shift', family: 'Voltage', cost: 450 },
  { key: 'radiant', name: 'Radiant', blurb: 'Gives off more than it gets.', hue: 318, accent: 134, pattern: 'glow', family: 'Voltage', cost: 450 },
  { key: 'wavelength', name: 'Wavelength', blurb: 'Tuned to something.', hue: 324, accent: 166, pattern: 'shift', family: 'Voltage', cost: 600 },
  { key: 'overload', name: 'Overload', blurb: 'Whatever comes after bright.', hue: 332, accent: 122, pattern: 'glow', family: 'Voltage', cost: 800 },
  { key: 'jade', name: 'Jade', blurb: 'Carved, and very old.', hue: 298, accent: 88, pattern: 'twotone', family: 'Regalia', cost: 140 },
  { key: 'garnet', name: 'Garnet', blurb: 'Dark red, cut deep.', hue: 306, accent: 122, pattern: 'diamond', family: 'Regalia', cost: 220 },
  { key: 'amethyst', name: 'Amethyst', blurb: 'Geode purple.', hue: 312, accent: 154, pattern: 'speckle', family: 'Regalia', cost: 220 },
  { key: 'topaz', name: 'Topaz', blurb: 'Golden and faceted.', hue: 320, accent: 110, pattern: 'diamond', family: 'Regalia', cost: 320 },
  { key: 'malachite', name: 'Malachite', blurb: 'Banded green, mineral.', hue: 326, accent: 142, pattern: 'bands', family: 'Regalia', cost: 320 },
  { key: 'sapphire', name: 'Sapphire', blurb: 'The good blue.', hue: 334, accent: 356, pattern: 'metal', family: 'Regalia', cost: 450 },
  { key: 'onyx', name: 'Onyx', blurb: 'Black with a single white band.', hue: 340, accent: 130, pattern: 'rings', family: 'Regalia', cost: 450 },
  { key: 'obsidian', name: 'Obsidian', blurb: 'Glass, from a volcano.', hue: 348, accent: 164, pattern: 'solid', family: 'Regalia', cost: 600 },
  { key: 'opal', name: 'Opal', blurb: 'Every colour, depending.', hue: 354, accent: 196, pattern: 'shift', family: 'Regalia', cost: 600 },
  { key: 'regalia', name: 'Regalia', blurb: 'Worn by someone in charge.', hue: 2, accent: 24, pattern: 'metal', family: 'Regalia', cost: 800 },
  /* -- Remains: bone, and what is left of things ------------------- */
  { key: 'skull', name: 'Skull', blurb: 'A row of small skulls down the spine.', hue: 44, accent: 30, sat: 16, pattern: 'skull', family: 'Remains', cost: 260 },
  { key: 'ribcage', name: 'Ribcage', blurb: 'Ribs, paired off all the way along.', hue: 40, accent: 28, sat: 14, pattern: 'bones', family: 'Remains', cost: 260 },
  { key: 'ossuary', name: 'Ossuary', blurb: 'Stacked, sorted and stacked again.', hue: 36, accent: 24, sat: 20, pattern: 'skull', family: 'Remains', cost: 380 },
  { key: 'marrow', name: 'Marrow', blurb: 'Pale outside, red where it counts.', hue: 20, accent: 2, sat: 34, pattern: 'bones', family: 'Remains', cost: 380 },
  { key: 'fossil', name: 'Fossil', blurb: 'Cracked stone with something in it.', hue: 28, accent: 20, sat: 12, pattern: 'web', family: 'Remains', cost: 460 },
  { key: 'wishbone', name: 'Wishbone', blurb: 'Someone got the long half.', hue: 48, accent: 36, sat: 22, pattern: 'bones', family: 'Remains', cost: 460 },
  { key: 'carrion', name: 'Carrion', blurb: 'Stitched back together, badly.', hue: 96, accent: 8, sat: 26, pattern: 'stitch', family: 'Remains', cost: 560 },
  { key: 'revenant', name: 'Revenant', blurb: 'Eyes down both sides. None of them blink.', hue: 268, accent: 52, sat: 40, pattern: 'eyes', family: 'Remains', cost: 680 },
  { key: 'gravebound', name: 'Gravebound', blurb: 'Skulls, and earth worked into the gaps.', hue: 24, accent: 12, sat: 24, pattern: 'skull', family: 'Remains', cost: 680 },
  { key: 'reliquary', name: 'Reliquary', blurb: 'Bone under gold plate.', hue: 46, accent: 44, sat: 54, pattern: 'scales', family: 'Remains', cost: 900 },

  /* -- Hide: what animals are actually covered in ------------------- */
  { key: 'scaled', name: 'Scaled', blurb: 'Proper overlapping scales, at last.', hue: 138, accent: 108, sat: 58, pattern: 'scales', family: 'Hide', cost: 200 },
  { key: 'quilled', name: 'Quilled', blurb: 'Spines along the back. Think twice.', hue: 30, accent: 14, sat: 52, pattern: 'spikes', family: 'Hide', cost: 200 },
  { key: 'chevron', name: 'Chevron', blurb: 'Arrows, all pointing where you are going.', hue: 210, accent: 190, sat: 60, pattern: 'chevron', family: 'Hide', cost: 320 },
  { key: 'basilisk', name: 'Basilisk', blurb: 'Eyespots, to be looked at rather than looked for.', hue: 84, accent: 48, sat: 62, pattern: 'eyes', family: 'Hide', cost: 440 },
  { key: 'patchwork', name: 'Patchwork', blurb: 'Several snakes, sewn into one.', hue: 300, accent: 40, sat: 54, pattern: 'stitch', family: 'Hide', cost: 440 },
  { key: 'adder', name: 'Adder', blurb: 'The zigzag that means leave it alone.', hue: 54, accent: 20, sat: 48, pattern: 'chevron', family: 'Hide', cost: 560 },

  {
    key: 'nobody',
    name: 'Nobody',
    blurb: 'Unseen the whole run. You can always see yourself; nothing else can.',
    hue: 204,
    accent: 204,
    pattern: 'vanish',
    family: 'Oddity',
    cost: 1000,
  },
]

/** The order families appear in the picker. */
export const SKIN_FAMILIES = ['Oddity', 'Remains', 'Hide', 'Garden', 'Tidewater', 'Ember', 'Frost', 'Twilight', 'Sunbaked', 'Canopy', 'Forge', 'Voltage', 'Regalia']

export const SKIN_BY_KEY: Record<string, Skin> = Object.fromEntries(SKINS.map((s) => [s.key, s]))

/**
 * Nobody is not on a timer. Wear it and you are unseen for the whole
 * run, first second to last - you can always see yourself, and nothing
 * else in the arena can see you at all.
 *
 * What it costs is money: a toll every single time you take it out,
 * paid before the run starts.
 *
 * The toll has to be larger than the run is worth, or it is not a cost
 * at all - it is an investment, and there is no reason ever to play
 * without it. Measured over natural runs to death, wearing this earns a
 * median of about 2600 against a normal skin's 80, because almost
 * nothing the arena does to you works if it cannot find you. So the
 * toll sits above that: a typical run in it loses money, and only a
 * genuinely long one comes out ahead.
 */
export const VANISH_TOLL = 3000

/** The ones that cost nothing, which everybody starts with. */
export const FREE_SKINS = SKINS.filter((s) => s.cost === 0).map((s) => s.key)

/**
 * Which skins a save actually owns.
 *
 * A save written before skins existed has no list at all, and defaulting
 * that to empty would take the free ones away from anyone who had
 * already played.
 */
export function ownedSkins(save: Partial<SnakeSave>): string[] {
  const had = save.skins ?? []
  return [...new Set([...FREE_SKINS, ...had])]
}

/** How far apart the beads of a body sit. */
export const SEGMENT = 13
/** The shortest a snake ever is. */
export const BASE_LENGTH = 8
/** Beads added per pellet eaten. */
export const GROW = 1.6

export const BASE_SPEED = 185
/** Held dash, and what it costs. */
export const DASH_SPEED = 330
export const DASH_DRAIN = 52
export const DASH_REFILL = 26
export const DASH_MAX = 100
/** You cannot dash at all below this, so it cannot be feathered forever. */
export const DASH_FLOOR = 12

/** How sharply a snake can turn, in radians a second. */
export const TURN_RATE = 3.4

export const PELLET_R = 7
export const HEAD_R = 11
/** Pellets kept on the field at once. */
export const PELLET_COUNT = 260
/** How many rivals share the arena with you. */
export const RIVALS = 8
/**
 * What everything starts with. Zero, so `levelOf` reads 1 - every snake
 * in the arena, player and rival alike, opens at level one and grows
 * from there.
 */
export const START_FED = 0

/** How long a snake is untouchable after it appears. */
export const SPAWN_GRACE = 4000
/** How far from the player a new rival is allowed to appear. */
export const SPAWN_CLEAR = 760

/* ------------------------------------------------------------------ */
/* Levels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Level from pellets eaten.
 *
 * Deliberately a square-root curve: the first few levels come quickly so
 * a new snake is not prey for long, and the last ones take real work, so
 * a big snake stays worth being afraid of.
 */
export function levelOf(fed: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, fed) / 2))
}

/** What the next level needs, for the bar under the score. */
export function fedForLevel(level: number): number {
  return 2 * (level - 1) * (level - 1)
}

/**
 * Nothing is ever longer than a level-three snake.
 *
 * Levels carry on climbing - that is what decides who eats whom - but
 * the body stops growing, because a hundred-bead snake takes up a whole
 * screen and half a dozen of them turn the arena into a maze you cannot
 * move through. What a high level looks like is a bigger head and a
 * bigger number, not more rope.
 */
export const MAX_BODY_FED = 8

export function lengthOf(fed: number): number {
  return BASE_LENGTH + Math.min(fed, MAX_BODY_FED) * GROW
}

/** Bigger snakes are a shade slower. Not enough to make growing a punishment. */
export function speedOf(fed: number, dashing: boolean): number {
  const heft = 1 - Math.min(0.22, fed / 900)
  return (dashing ? DASH_SPEED : BASE_SPEED) * heft
}

/* ------------------------------------------------------------------ */
/* Meeting another snake                                               */
/* ------------------------------------------------------------------ */

/**
 * What eating something is actually worth.
 *
 * Half of what the victim had, but scaled by how big it was compared to
 * you. A flat share compounds: with everything starting at level one,
 * whichever snake got the first few kills snowballed to level sixty
 * inside eighty seconds while the rest of the arena sat around eleven,
 * and nothing could ever catch it.
 *
 * Diminishing returns fix it without changing any rule the player has to
 * understand. Eating something your own size is worth what it always
 * was; a giant hoovering up level ones gets almost nothing for it.
 */
export function gainFrom(victimFed: number, myFed: number): number {
  const ratio = Math.min(1, victimFed / Math.max(1, myFed))
  return Math.max(1, Math.round((victimFed * 0.5 + 4) * Math.max(0.16, ratio)))
}

export type Meeting = 'eat' | 'die' | 'cut' | 'bounce'

/**
 * What happens to the snake whose *head* did the touching.
 *
 * Head to head, the higher level eats and the lower dies. But a head
 * meeting a *body* no longer kills: it cuts. Everything from the point
 * of contact down to the tail comes off, and the snake that was cut
 * swims on with whatever is left in front of the bite.
 *
 * That is what makes being chased a chase. A bigger snake on your tail
 * has to work its way up you bite by bite, and you die only when it has
 * eaten far enough forward that there is no snake left in front of it -
 * which is the same thing as reaching your head.
 *
 * Only a head can start anything; a body is passive. So the rule is
 * symmetric: what happens when your head meets someone is exactly what
 * happens to them when theirs meets you.
 */
export function meet(myLevel: number, theirLevel: number, where: 'head' | 'body'): Meeting {
  if (where === 'head') {
    if (myLevel > theirLevel) return 'eat'
    if (myLevel < theirLevel) return 'die'
    return 'bounce'
  }
  return myLevel > theirLevel ? 'cut' : 'bounce'
}

/**
 * What a snake is left with after a bite at `bead`, counting from the
 * head. Null means there was not enough in front of the bite to go on
 * with, so the chase is over.
 */
/**
 * What a snake is left with after a bite at `bead`, counting from the
 * head. Null means there was not enough in front of the bite to go on
 * with, so the chase is over.
 *
 * Now that length is capped, a bead index no longer maps back to a
 * amount eaten - a level four snake and a level forty one are the same
 * number of beads long. So a bite takes the same *fraction* of what the
 * snake has as it takes of the snake's body: bitten halfway along, it
 * keeps half its level's worth, whatever that level is.
 */
export function cutTo(bead: number, fed: number): { fed: number } | null {
  const beads = Math.round(lengthOf(fed))
  if (bead < 3 || beads <= 0) return null
  const kept = Math.min(1, bead / beads)
  const left = fed * kept - 1
  if (left < 0) return null
  return { fed: left }
}

/* ------------------------------------------------------------------ */
/* The snakes themselves                                               */
/* ------------------------------------------------------------------ */

export interface Snake {
  id: number
  player: boolean
  name: string
  hue: number
  /** Head position and the way it is pointing. */
  x: number
  y: number
  heading: number
  /** Everywhere the head has been lately, newest first. */
  trail: { x: number; y: number }[]
  fed: number
  dash: number
  dashing: boolean
  dead: boolean
  /** Set when something bounces, to push it away for a moment. */
  shoveUntil: number
  shoveHeading: number
  /** Newly spawned and briefly untouchable, so a spawn is not a death. */
  safeUntil: number
  /** How it is painted. Rivals all wear plain bands. */
  pattern: Pattern
  /** The marking colour, for the two-tone patterns. */
  accent: number
  /** Body saturation, 0 for bone-grey through 80 for a bright coat. */
  sat: number
  /** Set briefly when a bite lands, so the flinch is visible. */
  bittenUntil: number
  /** How unseen it is, 0 to 1. Only the vanishing skin moves this. */
  unseen: number
}

/**
 * The beads of the body, spaced evenly down the trail.
 *
 * One pass. Asking `alongTrail` for each bead separately is the obvious
 * way to write this and it walks the trail from the start every time -
 * quadratic in the length of the snake, which for a long one is over a
 * million operations per call, per snake, per frame.
 */
export function segmentsOf(s: Snake): { x: number; y: number }[] {
  const want = Math.round(lengthOf(s.fed))
  const trail = s.trail
  const out: { x: number; y: number }[] = []
  if (trail.length === 0) return out

  out.push(trail[0])
  let i = 0
  let carried = 0
  let need = SEGMENT

  while (out.length < want && i < trail.length - 1) {
    const a = trail[i]
    const b = trail[i + 1]
    const span = Math.hypot(b.x - a.x, b.y - a.y)
    if (span <= 0.0001) {
      i++
      continue
    }
    if (carried + span < need) {
      carried += span
      i++
      continue
    }
    // The next bead falls inside this leg of the trail.
    const t = (need - carried) / span
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    need += SEGMENT
  }
  return out
}

/** A point `dist` back along the trail, walking it segment by segment. */
export function alongTrail(
  trail: { x: number; y: number }[],
  dist: number
): { x: number; y: number } | null {
  if (trail.length === 0) return null
  if (dist <= 0) return trail[0]
  let left = dist
  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i]
    const b = trail[i + 1]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (d <= 0.0001) continue
    if (left <= d) {
      const t = left / d
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    left -= d
  }
  return trail[trail.length - 1]
}

/** How fat a snake is drawn, which is also how fat it is to collide with. */
export function girthOf(fed: number): number {
  return 9 + Math.min(11, Math.sqrt(Math.min(fed, MAX_BODY_FED)) * 1.1)
}

/**
 * How far a snake's centre must stay from the wall.
 *
 * The head is drawn a good deal bigger than the body is wide, so keeping
 * the body clear is not enough - clamping on girth alone let heads sit
 * half over the barrier.
 */
export function wallGap(fed: number): number {
  return Math.max(girthOf(fed) * 0.5, HEAD_R * (0.85 + Math.min(0.75, fed / 220))) + 2
}

/** Hold a point inside the arena, whatever is being placed. */
export function inArena(
  x: number,
  y: number,
  pad: number,
  map: { w: number; h: number }
): { x: number; y: number } {
  return {
    x: Math.max(pad, Math.min(map.w - pad, x)),
    y: Math.max(pad, Math.min(map.h - pad, y)),
  }
}

/* ------------------------------------------------------------------ */
/* Pellets                                                             */
/* ------------------------------------------------------------------ */

export interface Pellet {
  x: number
  y: number
  /** Worth more than one, when it came off a dead snake. */
  worth: number
  hue: number
}

/**
 * A coin lying in the arena.
 *
 * Kept apart from pellets on purpose: pellets are food and change what
 * you are, coins are money and leave the arena with you. Only the player
 * picks them up - a rival quietly pocketing your coins would read as the
 * game cheating.
 */
export interface Coin {
  x: number
  y: number
  value: number
  spin: number
}

/** How many lie about at once, and what a loose one is worth. */
export const COIN_COUNT = 26
export const COIN_VALUE = 3
/** Dropped when you eat a snake, on top of what it was carrying. */
export function bountyFor(fed: number): number {
  return 4 + Math.round(fed * 0.35)
}

/* ------------------------------------------------------------------ */
/* Companions                                                          */
/* ------------------------------------------------------------------ */

/**
 * Something that swims along with you and takes pieces out of anything
 * that gets close.
 *
 * What it costs is the only number: the nip it takes, how far it will
 * range to take it, and how often it can, are all worked out from the
 * price. So a dearer companion is a stronger one by construction rather
 * than by my remembering to keep a table in step.
 *
 * A nip never finishes anything. It can chew a snake all the way down
 * to level one and leave it there - which is the point of bringing one,
 * because it lets you cut something bigger than you down to a size you
 * can actually swallow - but the last bite is yours to take.
 */
export interface Companion {
  key: string
  name: string
  blurb: string
  cost: number
  /** Body and trim, for drawing it. */
  hue: number
  art: 'fish' | 'bird' | 'beast'
}

export const COMPANIONS: Companion[] = [
  { key: 'minnow', name: 'Minnow', blurb: 'Barely a nibble, but it never stops.', cost: 300, hue: 190, art: 'fish' },
  { key: 'pikelet', name: 'Pikelet', blurb: 'A small pike with big opinions.', cost: 600, hue: 150, art: 'fish' },
  { key: 'ferret', name: 'Ferret', blurb: 'Quick, and it holds on.', cost: 1000, hue: 34, art: 'beast' },
  { key: 'magpie', name: 'Magpie', blurb: 'Takes a piece of everything it passes.', cost: 1500, hue: 220, art: 'bird' },
  { key: 'shrike', name: 'Shrike', blurb: 'Hunts far further out than it looks.', cost: 2200, hue: 12, art: 'bird' },
  { key: 'barracuda', name: 'Barracuda', blurb: 'One pass, and a good deal is missing.', cost: 3200, hue: 200, art: 'fish' },
  { key: 'wolverine', name: 'Wolverine', blurb: 'Picks fights with things far above its level.', cost: 4500, hue: 28, art: 'beast' },
  { key: 'gyrfalcon', name: 'Gyrfalcon', blurb: 'The dearest thing in the arena, and it shows.', cost: 6500, hue: 48, art: 'bird' },
]

export const COMPANION_BY_KEY: Record<string, Companion> = Object.fromEntries(
  COMPANIONS.map((c) => [c.key, c])
)

/** How much a nip takes, in the same units a pellet feeds you. */
export function nipOf(cost: number): number {
  return Math.max(2, Math.round(cost / 85))
}

/** How far it will range from you to take one. */
export function reachOf(cost: number): number {
  return 86 + cost / 60
}

/** How long it needs between nips, in milliseconds. */
export function restOf(cost: number): number {
  return Math.max(800, 1700 - cost / 8)
}

/* ------------------------------------------------------------------ */
/* Saving                                                              */
/* ------------------------------------------------------------------ */

export interface SnakeSave {
  best: number
  bestLevel: number
  eaten: number
  runs: number
  music?: boolean
  /** The skin being worn, and the ones bought so far. */
  skin: string
  skins: string[]
  /** The map last played. */
  map: string
  /** What is swimming along with you, and what has been bought. */
  companion: string | null
  companions: string[]
}

export const initialSnake: SnakeSave = {
  best: 0,
  bestLevel: 1,
  eaten: 0,
  runs: 0,
  skin: 'grass',
  skins: [...FREE_SKINS],
  map: 'pit',
  companion: null,
  companions: [],
}

/**
 * What a finished run was worth, on top of the coins picked up along the
 * way. Surviving longer and eating more both show up here.
 */
export function payout(level: number, eaten: number, fed: number): number {
  return Math.round(level * 11 + eaten * 18 + fed * 0.8)
}

/**
 * Rival colours, chosen to leave a wide gap around the player's green.
 *
 * `id * 67 % 360` looked fine until a rival rolled hue 134 and turned up
 * a shade away from you. In a game where you have half a second to read
 * a shape and decide whether to charge it, green means you and nothing
 * else.
 */
/**
 * Rival colours.
 *
 * A fixed palette that dodged one green worked while the player had one
 * green to dodge. With a hundred skins the player can be any hue at all,
 * so the palette is chosen against whatever is being worn: twelve hues
 * spread round the wheel, with anything within forty degrees of the
 * player's own pushed clear.
 */
export function rivalHues(playerHue: number): number[] {
  // Built outward from the worn hue rather than filtered afterwards.
  // Twelve steps starting seventy degrees away and spaced twenty-two
  // apart span most of the wheel and the nearest is still forty-eight
  // degrees off, whatever the player happens to be wearing.
  const out: number[] = []
  for (let i = 0; i < 12; i++) out.push((playerHue + 70 + i * 22) % 360)
  return out
}

/** How far apart two hues are, never more than 180. */
export function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export const RIVAL_NAMES = [
  'Bramble', 'Coil', 'Dusk', 'Ember', 'Fang', 'Gutter', 'Hiss', 'Ivy',
  'Jet', 'Kink', 'Lash', 'Moss', 'Nettle', 'Onyx', 'Pike', 'Quill',
  'Rattle', 'Sable', 'Thorn', 'Umber', 'Vex', 'Whip',
]
