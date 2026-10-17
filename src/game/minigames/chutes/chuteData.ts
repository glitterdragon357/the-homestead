/**
 * The Chutes.
 *
 * A ball in a closed pipe, going downhill fast. The pipe is opaque and
 * it wraps all the way round you, so there is nothing to hit and nowhere
 * to fall out - and that means the game is not about surviving the
 * track, it is about how you take it.
 *
 * Speed comes from your line. A chute that turns throws you up the
 * outside wall, and there is a height on that wall where the banking
 * does the work for you; ride it and you come out of the corner faster
 * than you went in. Sit at the bottom and you scrub. Jumps are where the
 * pipe simply stops - open air, the city, the sunset, and the mouth of
 * the next chute coming up at you.
 */

/* ------------------------------------------------------------------ */
/* The shape of a chute                                                */
/* ------------------------------------------------------------------ */

/** One sample of the centreline, every STEP units along. */
export interface Node {
  x: number
  y: number
  z: number
  /** Direction of travel in the horizontal plane. */
  yaw: number
  /** How steeply it is heading down. Positive is downhill. */
  dip: number
  /** How hard it is turning here, signed. This is what banks you. */
  curve: number
  /** Inside radius of the pipe at this point. */
  radius: number
  /** True where the track is not there at all - a gap. */
  open: boolean
  /**
   * Half the width of the road here, in world units.
   *
   * This is the whole difficulty curve. A wide road is somewhere to
   * make a mistake and get away with it; a narrow one is not.
   */
  half: number
  /** How far the road leans into the corner, in radians. */
  bank: number
  /** A place to come back to after falling off. */
  checkpoint: boolean
  /**
   * True where the road is roofed over into a closed tube.
   *
   * Most of a run is open road under the sky. A tube is a thing that
   * happens a few times on the way down, and the moment the roof closes
   * over and the sunset goes out is most of the point of having them.
   */
  closed: boolean
}

/**
 * How far round from the bottom the road reaches before it stops.
 *
 * The open road is a deep banked trough rather than a flat strip: there
 * is no falling off, because the sides come up far enough that the ball
 * runs out of road and settles back down instead. That is what keeps a
 * run from needing a fail state at all.
 */
/**
 * Sized so you can see out of it.
 *
 * At two radians the banking came up past horizontal on both sides and
 * the whole sky was a strip at the top of the frame - which is a fine
 * trough and a waste of a sunset. At one and a third the road is still
 * deep enough that running out of it only costs you the climb, and the
 * city is in front of you the whole way down.
 */
export const ARC = 1.34

/** The widest and narrowest the road ever gets. */
/**
 * The tightest a bend is allowed to be, in radians per node.
 *
 * Paired with BANK_AT below: the banking is built to hold a ball going
 * that fast, so anything quicker gets thrown out and anything slower
 * falls in, and steering is what covers the difference.
 */
export const MIN_GAP = 4
export const MAX_GAP = 8

export const MAX_CURVE = 0.0035
export const BANK_AT = 3500

export const WIDE = 150
export const NARROW = 52
/** How far apart the checkpoints are, in nodes. */
export const CHECK_EVERY = 90

/** Something sitting on the road. */
export type Block = 'pillar' | 'gate' | 'sweeper' | 'wall'

export interface Obstacle {
  /** Which node it stands on. */
  at: number
  kind: Block
  /** Across the road, in world units. Zero is the middle. */
  u: number
  /** Half its width. */
  half: number
  /** Sweepers slide across the road; this is how fast, and how far. */
  sweep: number
  span: number
}

/** Distance between centreline samples. */
export const STEP = 26
/** How wide a chute is, inside. */
export const BORE = 112
/** The ball. */
export const BALL_R = 20

export interface Level {
  key: string
  name: string
  blurb: string
  /** How many samples long. Multiply by STEP for the distance. */
  length: number
  /** How twisty, how steep, how bumpy - all 0 to 1. */
  twist: number
  drop: number
  bumps: number
  /** How many times the track opens up for a jump. */
  jumps: number
  /** How many stretches of it are roofed over into tube. */
  tubes: number
  /** How thickly the road is littered with things to get past. */
  clutter: number
  /** How narrow it gets at its worst, 0 wide through 1 very narrow. */
  pinch: number
  /** Seeds the whole shape, so a chute is the same chute every run. */
  seed: number
  /** The sky it runs under. */
  sky: Sky
}

export type Sky = 'sundown' | 'ember' | 'violet' | 'cold' | 'night'

/** Deterministic noise. The same chute every time, from four numbers. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function rngFrom(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Lay a chute out.
 *
 * The centreline is walked rather than placed: a heading and a dip that
 * wander under a few sine terms, stepped forward one sample at a time.
 * Walking it is what keeps it continuous - a track placed as a list of
 * corners has to be stitched back together at every join, and any join
 * that is a degree out is a kink you can feel at speed.
 */
export function buildChute(level: Level): Node[] {
  const rnd = rngFrom(level.seed)
  const nodes: Node[] = []

  // A handful of turn and dip waves per chute, at lengths that do not
  // line up with each other, so the track never falls into a rhythm.
  const turns = [
    { k: 0.004 + rnd() * 0.01, a: (0.4 + rnd() * 1.5) * level.twist, p: rnd() * 7 },
    { k: 0.0014 + rnd() * 0.004, a: (0.8 + rnd() * 1.8) * level.twist, p: rnd() * 7 },
    // Deliberately slow. A term up here at three hundredths flips the
    // corner every couple of hundred units, which at full speed is a
    // tenth of a second - a chute you cannot set up for, only survive.
    { k: 0.004 + rnd() * 0.006, a: (0.15 + rnd() * 0.5) * level.twist, p: rnd() * 7 },
  ]
  const rolls = [
    { k: 0.006 + rnd() * 0.012, a: (0.1 + rnd() * 0.5) * level.bumps, p: rnd() * 7 },
    { k: 0.02 + rnd() * 0.04, a: (0.04 + rnd() * 0.2) * level.bumps, p: rnd() * 7 },
  ]

  // Where the pipe opens up. Spread out, never at the very start, and
  // never so close together that you land and leave again.
  const gaps: { at: number; len: number }[] = []
  for (let i = 0; i < level.jumps; i++) {
    const at = Math.round(level.length * (0.18 + (i / Math.max(1, level.jumps)) * 0.72))
    // Short enough that the slowest you can possibly arrive still
    // clears it. A gap longer than the approach can carry is not a
    // jump, it is a wall you fall into for ever: the ball comes back at
    // the checkpoint, runs up at whatever it can manage, drops in, and
    // does it again. One of these cost The Narrows twelve lives in a
    // minute and the run could not be finished at all.
    gaps.push({ at, len: MIN_GAP + Math.round(rnd() * (MAX_GAP - MIN_GAP)) })
  }

  // Where the roof closes over. Spread through the run, and never on
  // top of a jump - a tube with no floor is just a hole.
  const roofs: { at: number; len: number }[] = []
  for (let i = 0; i < level.tubes; i++) {
    const at = Math.round(level.length * (0.1 + (i / Math.max(1, level.tubes)) * 0.8) + 40)
    roofs.push({ at, len: 40 + Math.round(rnd() * 70) })
  }

  let x = 0
  let y = 0
  let z = 0
  let yaw = 0

  for (let i = 0; i < level.length; i++) {
    let turn = 0
    for (const t of turns) turn += Math.sin(i * t.k + t.p) * t.a
    let dip = 0.16 + 0.5 * level.drop
    for (const r of rolls) dip += Math.sin(i * r.k + r.p) * r.a

    // A jump is flat and straight for its whole length, because
    // launching sideways out of a banked corner is a way to arrive
    // somewhere the next chute is not.
    const gap = gaps.find((g) => i >= g.at && i < g.at + g.len)
    if (gap) {
      turn = 0
      dip = -0.26 // nose up off the lip
    }

    // Capped, and the cap is physics rather than taste.
    //
    // Holding a bend needs a sideways pull of v squared times its
    // curvature, and at six thousand units a second an unclamped corner
    // here asked for forty-six thousand units a second squared - twenty
    // times what steering can supply. The ball left the road the instant
    // it entered the bend, every time, and six of the nine runs could
    // not be finished at all. A corner is now never tighter than
    // something that can actually be held.
    // Squashed towards the cap rather than chopped off at it.
    //
    // A hard clamp made every bend on every twisty run come out at
    // exactly the cap, so nine different runs had the same corner in
    // them over and over and no two of them could be told apart. This
    // leaves gentle bends gentle and only bites on the ones that were
    // going to be impossible.
    const curve = MAX_CURVE * Math.tanh((turn * 0.0015) / MAX_CURVE)
    yaw += curve

    const roof = roofs.find((r) => i >= r.at && i < r.at + r.len)
    // The road breathes in and out along its length, and the pinch
    // setting decides how far in. Narrow stretches are placed by a slow
    // wave rather than at random, so one is always visibly coming.
    const squeeze = (Math.sin(i * 0.013 + level.seed) + 1) / 2
    const half = roof
      ? WIDE
      : WIDE - (WIDE - NARROW) * level.pinch * squeeze * squeeze
    nodes.push({
      x,
      y,
      z,
      yaw,
      dip,
      curve,
      radius: BORE,
      open: !!gap,
      closed: !!roof && !gap,
      half,
      // Banked for BANK_AT. Below that the ball drifts down the camber,
      // above it the corner throws it up - which is the whole of taking
      // a corner well.
      bank:
        Math.sign(curve) *
        Math.min(0.62, Math.atan((BANK_AT * BANK_AT * Math.abs(curve / STEP)) / 3000)),
      checkpoint: i % CHECK_EVERY === 0 && i > 0 && !gap,
    })

    x += Math.sin(yaw) * STEP
    z += Math.cos(yaw) * STEP
    y += dip * STEP * 0.5
  }

  // A checkpoint on the run-up to every jump, so a missed one costs the
  // approach rather than the last minute and a half.
  for (const g of gaps) {
    const before = g.at - 5
    if (before > 0 && nodes[before] && !nodes[before].open) nodes[before].checkpoint = true
  }

  // Ease the banking into and out of every lip, so a chute does not go
  // from a hard corner to dead straight in one node.
  //
  // Only the solid nodes are touched. Smoothing the open ones as well
  // put banking back onto the jump itself, which is the one place there
  // is no wall to bank against.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < nodes.length - 1; i++) {
      if (nodes[i].open) continue
      if (nodes[i - 1].open || nodes[i + 1].open) {
        const a = nodes[i - 1].open ? 0 : nodes[i - 1].curve
        const b = nodes[i + 1].open ? 0 : nodes[i + 1].curve
        nodes[i].curve = (a + b) / 2
      }
    }
  }
  return nodes
}

/** How long a chute is, in world units. */
export function lengthOf(level: Level): number {
  return level.length * STEP
}

/* ------------------------------------------------------------------ */
/* The chutes themselves                                              */
/* ------------------------------------------------------------------ */

export const LEVELS: Level[] = [
  { key: 'r01', name: '1 · Easy Street', blurb: 'Wide road, gentle bends, a tunnel and one gap.', length: 620, twist: 0.4, drop: 0.3, bumps: 0.45, jumps: 5, tubes: 1, clutter: 0.25, pinch: 0.15, seed: 11, sky: 'sundown' },
  { key: 'r02', name: '2 · The Overpass', blurb: 'Long sweeping curves above the ring road.', length: 760, twist: 0.6, drop: 0.4, bumps: 0.6, jumps: 8, tubes: 1, clutter: 0.4, pinch: 0.3, seed: 29, sky: 'sundown' },
  { key: 'r03', name: '3 · Switchback', blurb: 'It changes its mind about every four seconds.', length: 820, twist: 1, drop: 0.45, bumps: 0.75, jumps: 8, tubes: 1, clutter: 0.45, pinch: 0.4, seed: 47, sky: 'ember' },
  { key: 'r04', name: '4 · Washboard', blurb: 'Bumps the whole way down, and pillars in the middle of them.', length: 840, twist: 0.7, drop: 0.5, bumps: 1.0, jumps: 8, tubes: 1, clutter: 0.6, pinch: 0.45, seed: 63, sky: 'ember' },
  { key: 'r05', name: '5 · Leapfrog', blurb: 'Five times the road just is not there. Carry your speed.', length: 920, twist: 0.6, drop: 0.5, bumps: 0.6, jumps: 17, tubes: 1, clutter: 0.4, pinch: 0.5, seed: 81, sky: 'violet' },
  { key: 'r06', name: '6 · The Narrows', blurb: 'A ledge, really. Sweepers on it.', length: 900, twist: 0.7, drop: 0.5, bumps: 0.75, jumps: 11, tubes: 1, clutter: 0.5, pinch: 0.62, seed: 97, sky: 'violet' },
  { key: 'r07', name: '7 · The Drop', blurb: 'Steep, straight-ish, and very fast. Gates all the way down.', length: 760, twist: 0.55, drop: 1, bumps: 0.75, jumps: 11, tubes: 1, clutter: 0.8, pinch: 0.55, seed: 113, sky: 'cold' },
  { key: 'r08', name: '8 · The Ladder', blurb: 'Bumps, gaps and walls, one after the other, all the way down.', length: 1040, twist: 0.8, drop: 0.7, bumps: 1.0, jumps: 20, tubes: 1, clutter: 0.9, pinch: 0.7, seed: 131, sky: 'cold' },
  { key: 'r09', name: '9 · Night Line', blurb: 'The long one, after dark, with every single thing in it.', length: 1300, twist: 0.9, drop: 0.8, bumps: 1.0, jumps: 20, tubes: 2, clutter: 1, pinch: 0.85, seed: 149, sky: 'night' },
]

/**
 * What is standing on the road.
 *
 * Laid out from the chute's own seed, so a level is the same level every
 * time you run it - which matters more here than anywhere else in the
 * game, because the whole of getting better at one of these is learning
 * where the things are.
 *
 * Nothing is ever placed across the full width: there is always a way
 * through, and finding it at speed is the game. A level you cannot pass
 * without stopping is a wall with extra steps.
 */
export function obstaclesFor(level: Level): Obstacle[] {
  const rnd = (() => {
    let a = (level.seed * 7919) | 0
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })()
  const nodes = buildChute(level)
  const out: Obstacle[] = []
  const gap = Math.max(14, Math.round(44 - level.clutter * 30))
  for (let i = 60; i < nodes.length - 30; i += gap) {
    const at = i + Math.round(rnd() * gap * 0.5)
    const n = nodes[at]
    if (!n || n.open) continue
    // Never right on a checkpoint, or landing there is a trap.
    if (nodes.slice(at - 3, at + 3).some((m) => m.checkpoint)) continue
    const roll = rnd()
    const kind: Block = roll < 0.4 ? 'pillar' : roll < 0.65 ? 'gate' : roll < 0.88 ? 'sweeper' : 'wall'
    const room = n.half
    if (kind === 'gate') {
      // A gate is two blocks with a hole between them; the hole is never
      // narrower than a ball needs.
      const hole = Math.max(BALL_R * 2.4, room * (0.3 + rnd() * 0.25))
      const side = room - hole / 2
      out.push({ at, kind, u: -(hole / 2 + side / 2), half: side / 2, sweep: 0, span: 0 })
      out.push({ at, kind, u: hole / 2 + side / 2, half: side / 2, sweep: 0, span: 0 })
    } else if (kind === 'sweeper') {
      const half = Math.min(room * 0.3, 46)
      out.push({ at, kind, u: 0, half, sweep: 0.9 + rnd() * 1.3, span: Math.max(0, room - half) })
    } else if (kind === 'wall') {
      // A wall blocks one side and leaves the other open.
      const half = room * (0.3 + rnd() * 0.2)
      out.push({ at, kind, u: (rnd() < 0.5 ? -1 : 1) * (room - half), half, sweep: 0, span: 0 })
    } else {
      const half = Math.min(room * 0.26, 38)
      out.push({ at, kind, u: (rnd() * 2 - 1) * Math.max(0, room - half * 1.6), half, sweep: 0, span: 0 })
    }
  }
  return out
}

/** Where a sweeper is right now. */
export function obstacleU(o: Obstacle, t: number): number {
  if (o.kind !== 'sweeper') return o.u
  return Math.sin(t * 0.001 * o.sweep + o.at) * o.span
}

export const LEVEL_BY_KEY: Record<string, Level> = Object.fromEntries(
  LEVELS.map((l) => [l.key, l])
)

/* ------------------------------------------------------------------ */
/* Balls                                                               */
/* ------------------------------------------------------------------ */

/**
 * How a ball is painted.
 *
 * Five finishes, and the finish is what the painter actually does with
 * the colours - it is not a label. A `metal` ball gets a tight specular
 * and a dark equator; a `glass` one gets a bright rim and a soft core;
 * `matte` gets neither. Two balls sharing a hue and differing only in
 * finish do not look like the same ball twice.
 */
export type Finish = 'matte' | 'gloss' | 'metal' | 'glass' | 'pattern'

/** What a patterned ball is patterned with. */
export type Motif = 'none' | 'stripe' | 'spots' | 'panels' | 'swirl' | 'stars' | 'checker'

export interface Ball {
  key: string
  name: string
  blurb: string
  hue: number
  sat: number
  /** The second colour, for anything with a marking on it. */
  accent: number
  finish: Finish
  motif: Motif
  cost: number
  family: string
}

export const BALLS: Ball[] = [
  // Starters, free.
  { key: 'rubber', name: 'Rubber', blurb: 'The one everybody starts with.', hue: 8, sat: 62, accent: 8, finish: 'matte', motif: 'none', cost: 0, family: 'Yard' },
  { key: 'tennis', name: 'Tennis', blurb: 'Fuzzy yellow-green, one white seam.', hue: 68, sat: 72, accent: 0, finish: 'matte', motif: 'swirl', cost: 0, family: 'Yard' },
  { key: 'gumball', name: 'Gumball', blurb: 'Pink, and faintly sticky.', hue: 334, sat: 74, accent: 334, finish: 'gloss', motif: 'none', cost: 0, family: 'Yard' },

  { key: 'football', name: 'Football', blurb: 'Black and white panels, the classic.', hue: 0, sat: 0, accent: 0, finish: 'matte', motif: 'panels', cost: 120, family: 'Yard' },
  { key: 'beachball', name: 'Beach Ball', blurb: 'Wide bright panels, summer all year.', hue: 196, sat: 86, accent: 48, finish: 'gloss', motif: 'panels', cost: 160, family: 'Yard' },
  { key: 'marble', name: 'Marble', blurb: 'Glass with a ribbon through the middle.', hue: 210, sat: 70, accent: 44, finish: 'glass', motif: 'swirl', cost: 220, family: 'Yard' },
  { key: 'bowling', name: 'Bowling', blurb: 'Heavy, dark, and polished.', hue: 276, sat: 44, accent: 276, finish: 'gloss', motif: 'none', cost: 220, family: 'Yard' },
  { key: 'golf', name: 'Golf', blurb: 'White, and covered in little dimples.', hue: 40, sat: 8, accent: 40, finish: 'matte', motif: 'spots', cost: 160, family: 'Yard' },
  { key: 'cricket', name: 'Cricket', blurb: 'Oxblood leather with a raised seam.', hue: 356, sat: 64, accent: 40, finish: 'gloss', motif: 'stripe', cost: 260, family: 'Yard' },
  { key: 'basketball', name: 'Basketball', blurb: 'Orange, and lined all over.', hue: 24, sat: 82, accent: 20, finish: 'matte', motif: 'panels', cost: 260, family: 'Yard' },

  { key: 'copper', name: 'Copper', blurb: 'Warm metal, lightly tarnished.', hue: 22, sat: 62, accent: 30, finish: 'metal', motif: 'none', cost: 320, family: 'Metal' },
  { key: 'brass', name: 'Brass', blurb: 'Yellow metal, kept polished.', hue: 44, sat: 64, accent: 48, finish: 'metal', motif: 'none', cost: 320, family: 'Metal' },
  { key: 'steel', name: 'Steel', blurb: 'Cold, grey, and very round.', hue: 212, sat: 12, accent: 212, finish: 'metal', motif: 'none', cost: 380, family: 'Metal' },
  { key: 'chrome', name: 'Chrome', blurb: 'So polished it is mostly other things.', hue: 206, sat: 6, accent: 206, finish: 'metal', motif: 'none', cost: 520, family: 'Metal' },
  { key: 'gunmetal', name: 'Gunmetal', blurb: 'Dark, matte, and serious.', hue: 220, sat: 14, accent: 220, finish: 'metal', motif: 'none', cost: 440, family: 'Metal' },
  { key: 'gold', name: 'Gold', blurb: 'What it says.', hue: 46, sat: 86, accent: 42, finish: 'metal', motif: 'none', cost: 900, family: 'Metal' },
  { key: 'rosegold', name: 'Rose Gold', blurb: 'Gold that went slightly pink.', hue: 14, sat: 58, accent: 18, finish: 'metal', motif: 'none', cost: 900, family: 'Metal' },
  { key: 'titanium', name: 'Titanium', blurb: 'Grey with a blue cast and a hard shine.', hue: 216, sat: 20, accent: 200, finish: 'metal', motif: 'none', cost: 760, family: 'Metal' },
  { key: 'rust', name: 'Rust', blurb: 'Left out in the weather for years.', hue: 18, sat: 56, accent: 28, finish: 'matte', motif: 'spots', cost: 280, family: 'Metal' },
  { key: 'foil', name: 'Foil', blurb: 'Crumpled, then smoothed out again.', hue: 50, sat: 16, accent: 196, finish: 'metal', motif: 'panels', cost: 620, family: 'Metal' },

  { key: 'amber', name: 'Amber', blurb: 'Lit from somewhere inside it.', hue: 38, sat: 84, accent: 30, finish: 'glass', motif: 'none', cost: 420, family: 'Glass' },
  { key: 'seaglass', name: 'Sea Glass', blurb: 'Pale green, worn soft by water.', hue: 158, sat: 46, accent: 170, finish: 'glass', motif: 'none', cost: 420, family: 'Glass' },
  { key: 'sapphireball', name: 'Sapphire', blurb: 'Deep blue, and very clear.', hue: 222, sat: 84, accent: 210, finish: 'glass', motif: 'none', cost: 560, family: 'Glass' },
  { key: 'emerald', name: 'Emerald', blurb: 'Green, with a cold white point on it.', hue: 150, sat: 80, accent: 150, finish: 'glass', motif: 'none', cost: 560, family: 'Glass' },
  { key: 'ruby', name: 'Ruby', blurb: 'Red, and lit right through.', hue: 352, sat: 84, accent: 346, finish: 'glass', motif: 'none', cost: 560, family: 'Glass' },
  { key: 'quartz', name: 'Quartz', blurb: 'Almost clear, with a cloudy heart.', hue: 290, sat: 22, accent: 290, finish: 'glass', motif: 'swirl', cost: 480, family: 'Glass' },
  { key: 'opalball', name: 'Opal', blurb: 'Whatever colour it feels like.', hue: 196, sat: 54, accent: 320, finish: 'glass', motif: 'swirl', cost: 820, family: 'Glass' },
  { key: 'obsidianball', name: 'Obsidian', blurb: 'Black glass with one hard highlight.', hue: 260, sat: 30, accent: 260, finish: 'glass', motif: 'none', cost: 700, family: 'Glass' },
  { key: 'bubble', name: 'Bubble', blurb: 'Thin, iridescent, and somehow still rolling.', hue: 186, sat: 40, accent: 300, finish: 'glass', motif: 'swirl', cost: 880, family: 'Glass' },
  { key: 'ice', name: 'Ice', blurb: 'Frozen, with the cracks still in it.', hue: 192, sat: 48, accent: 200, finish: 'glass', motif: 'stripe', cost: 640, family: 'Glass' },

  { key: 'ember', name: 'Ember', blurb: 'Orange over black, still hot.', hue: 22, sat: 92, accent: 8, finish: 'gloss', motif: 'swirl', cost: 600, family: 'Heat' },
  { key: 'magma', name: 'Magma', blurb: 'Cracked crust with light underneath.', hue: 12, sat: 94, accent: 44, finish: 'pattern', motif: 'stripe', cost: 760, family: 'Heat' },
  { key: 'coal', name: 'Coal', blurb: 'Dull black, with the odd bright fleck.', hue: 24, sat: 16, accent: 30, finish: 'matte', motif: 'spots', cost: 300, family: 'Heat' },
  { key: 'solar', name: 'Solar', blurb: 'Too bright to look straight at.', hue: 48, sat: 96, accent: 36, finish: 'gloss', motif: 'none', cost: 820, family: 'Heat' },
  { key: 'sunset', name: 'Sundown', blurb: 'Orange up top, violet underneath.', hue: 20, sat: 84, accent: 288, finish: 'gloss', motif: 'stripe', cost: 680, family: 'Heat' },

  { key: 'moss', name: 'Moss', blurb: 'Soft green, grown over.', hue: 104, sat: 44, accent: 94, finish: 'matte', motif: 'spots', cost: 240, family: 'Wild' },
  { key: 'bark', name: 'Bark', blurb: 'Rough brown with long grain.', hue: 28, sat: 36, accent: 24, finish: 'matte', motif: 'stripe', cost: 240, family: 'Wild' },
  { key: 'stone', name: 'Stone', blurb: 'Grey, heavy-looking, and chipped.', hue: 34, sat: 10, accent: 34, finish: 'matte', motif: 'spots', cost: 220, family: 'Wild' },
  { key: 'sandball', name: 'Sand', blurb: 'Pale and slightly rough.', hue: 42, sat: 40, accent: 40, finish: 'matte', motif: 'none', cost: 200, family: 'Wild' },
  { key: 'coral', name: 'Coral', blurb: 'Pink-orange, and full of holes.', hue: 10, sat: 66, accent: 18, finish: 'matte', motif: 'spots', cost: 340, family: 'Wild' },
  { key: 'wave', name: 'Wave', blurb: 'Blue-green, always moving.', hue: 186, sat: 70, accent: 170, finish: 'gloss', motif: 'swirl', cost: 420, family: 'Wild' },
  { key: 'thunder', name: 'Thunder', blurb: 'Slate grey with a bright fork across it.', hue: 224, sat: 22, accent: 52, finish: 'pattern', motif: 'stripe', cost: 560, family: 'Wild' },
  { key: 'bloom', name: 'Bloom', blurb: 'Covered in small flowers.', hue: 320, sat: 62, accent: 78, finish: 'pattern', motif: 'spots', cost: 440, family: 'Wild' },

  { key: 'neon', name: 'Neon', blurb: 'One colour, turned all the way up.', hue: 150, sat: 98, accent: 150, finish: 'gloss', motif: 'none', cost: 520, family: 'City' },
  { key: 'arcadeball', name: 'Arcade', blurb: 'Hard edges and primary colours.', hue: 276, sat: 86, accent: 48, finish: 'pattern', motif: 'checker', cost: 480, family: 'City' },
  { key: 'traffic', name: 'Traffic', blurb: 'Stop, wait, go, all at once.', hue: 0, sat: 84, accent: 120, finish: 'pattern', motif: 'panels', cost: 420, family: 'City' },
  { key: 'cab', name: 'Cab', blurb: 'Yellow, with a checkered band.', hue: 48, sat: 90, accent: 0, finish: 'pattern', motif: 'checker', cost: 400, family: 'City' },
  { key: 'signal', name: 'Signal', blurb: 'Hazard stripes, diagonally.', hue: 44, sat: 88, accent: 0, finish: 'pattern', motif: 'stripe', cost: 400, family: 'City' },
  { key: 'graffiti', name: 'Graffiti', blurb: 'Somebody got to it.', hue: 300, sat: 72, accent: 160, finish: 'pattern', motif: 'swirl', cost: 540, family: 'City' },
  { key: 'blueprint', name: 'Blueprint', blurb: 'White lines on deep blue.', hue: 218, sat: 72, accent: 200, finish: 'pattern', motif: 'checker', cost: 480, family: 'City' },
  { key: 'chequer', name: 'Chequered Flag', blurb: 'For finishing first, mostly.', hue: 0, sat: 0, accent: 0, finish: 'pattern', motif: 'checker', cost: 700, family: 'City' },

  { key: 'nebula', name: 'Nebula', blurb: 'Purple, blue, and a long way off.', hue: 268, sat: 70, accent: 196, finish: 'pattern', motif: 'swirl', cost: 880, family: 'Far Off' },
  { key: 'starfield', name: 'Starfield', blurb: 'Black, with everything in it.', hue: 240, sat: 50, accent: 50, finish: 'pattern', motif: 'stars', cost: 940, family: 'Far Off' },
  { key: 'moonball', name: 'Moon', blurb: 'Grey, and covered in craters.', hue: 44, sat: 6, accent: 44, finish: 'matte', motif: 'spots', cost: 620, family: 'Far Off' },
  { key: 'ringed', name: 'Ringed', blurb: 'Banded, like a planet with opinions.', hue: 38, sat: 56, accent: 20, finish: 'pattern', motif: 'stripe', cost: 820, family: 'Far Off' },
  { key: 'comet', name: 'Comet', blurb: 'Pale blue with a tail it cannot shake.', hue: 196, sat: 72, accent: 50, finish: 'glass', motif: 'stripe', cost: 1000, family: 'Far Off' },
  { key: 'eclipse', name: 'Eclipse', blurb: 'Black, with a ring of fire round the edge.', hue: 28, sat: 90, accent: 0, finish: 'pattern', motif: 'none', cost: 1200, family: 'Far Off' },
]

export const BALL_BY_KEY: Record<string, Ball> = Object.fromEntries(BALLS.map((b) => [b.key, b]))

/** The order families show up in the picker. */
export const BALL_FAMILIES = ['Yard', 'Metal', 'Glass', 'Heat', 'Wild', 'City', 'Far Off']

export const FREE_BALLS = BALLS.filter((b) => b.cost === 0).map((b) => b.key)
