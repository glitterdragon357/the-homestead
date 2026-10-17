/**
 * Rolling.
 *
 * The ball is three numbers: how far down the road it is, how far across
 * it is, and how high above it. Across is in world units rather than an
 * angle round a pipe, because the track is mostly a road - and a road
 * has edges you can leave, which an angle round a closed pipe does not.
 *
 * Leaving them is the point. A corner throws the ball to the outside, a
 * narrow stretch gives it nowhere to be thrown, and a gap gives it
 * nothing underneath at all. Falling off costs the time back to the last
 * checkpoint, which is the only thing a run here can cost.
 */

import {
  type Level,
  type Node,
  type Obstacle,
  BALL_R,
  STEP,
  obstacleU,
} from './chuteData'

export const G = 3000
/** Flat-out top speed. */
export const TOP = 6400
/** How hard the ball can be pushed across the road. */
export const STEER = 3000
/**
 * Gravity while in the air, which is a fifth of what it is on the road.
 *
 * A jump is supposed to be a few seconds of flight, and under full
 * gravity off a short lip it was a third of a second - up and down again
 * before you had registered leaving the ground. This buys about two
 * seconds at speed, and enough at the slowest restart speed to clear the
 * longest gap the generator can lay.
 */
export const AIR_G = 620
/**
 * How much sideways pull the road itself absorbs before the ball starts
 * to move across it.
 *
 * Without it, banking that is steep enough to hold a ball at speed
 * throws a slow one straight off the inside: the camber on a fifty-one
 * degree corner pulls nearly three thousand units a second squared down
 * the slope, and a ball that has not got going yet simply slides down
 * it and over the edge. That is what killed three of the nine runs - at
 * the second corner, before the first checkpoint, over and over.
 *
 * The force budget said those corners were holdable. They were; the ball
 * just was not going fast enough to need holding.
 */
export const GRIP = 1200
/** How long the ball is out of play after going over the edge. */
export const FELL_FOR = 900

export interface Ride {
  /** How far along, as a node index with a fraction. */
  s: number
  /** How far across the road, in world units. Zero is the middle. */
  u: number
  /** How fast it is moving across. */
  vu: number
  /** Height above the road. Zero is on it. */
  h: number
  /** How fast it is rising. Negative is up, as down is positive here. */
  vh: number
  speed: number
  t: number
  /** Off a lip or over an edge. */
  air: boolean
  airT: number
  bestAir: number
  /** The last checkpoint passed, as a node index. */
  checkpoint: number
  /** Times fallen off this run. */
  falls: number
  /** Counting back in after a fall; nothing moves while this runs. */
  fellUntil: number
  /**
   * Nothing on the road can touch it until this moment.
   *
   * Without it a block sitting just past a checkpoint is a trap with no
   * way out: you come back, hit it, go off, come back, and hit it again
   * for as long as you are willing to watch.
   */
  sparedUntil: number
  /** Coins picked up. */
  coins: number
  done: boolean
}

export function startRide(): Ride {
  return {
    s: 0,
    u: 0,
    vu: 0,
    h: 0,
    vh: 0,
    speed: 1600,
    t: 0,
    air: false,
    airT: 0,
    bestAir: 0,
    checkpoint: 0,
    falls: 0,
    fellUntil: 0,
    sparedUntil: 0,
    coins: 0,
    done: false,
  }
}

export function nodeAt(nodes: Node[], s: number): Node {
  const i = Math.max(0, Math.min(nodes.length - 1, Math.floor(s)))
  return nodes[i]
}

/**
 * The track, read smoothly rather than a node at a time.
 *
 * Every value a camera or a ball needs is interpolated between the two
 * nodes it sits between. Reading them off the integer node instead makes
 * each one step at a node boundary, and at six thousand units a second
 * that is forty steps a second - which is not a bumpy road, it is a
 * picture that will not hold still.
 */
export function readAt(nodes: Node[], s: number) {
  const i = Math.max(0, Math.min(nodes.length - 2, Math.floor(s)))
  const f = Math.max(0, Math.min(1, s - i))
  const a = nodes[i]
  const b = nodes[i + 1]
  const mix = (p: number, q: number) => p + (q - p) * f
  return {
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    z: mix(a.z, b.z),
    yaw: mix(a.yaw, b.yaw),
    dip: mix(a.dip, b.dip),
    curve: mix(a.curve, b.curve),
    half: mix(a.half, b.half),
    bank: mix(a.bank, b.bank),
    open: a.open || b.open,
    closed: a.closed && b.closed,
  }
}

/**
 * The slope the camera should sit at, averaged over the road ahead.
 *
 * The ball rides every bump; the camera must not. Read off a single
 * point the pitch follows the washboard exactly, so on a bumpy run the
 * whole picture nods several times a second - which is uncomfortable to
 * watch and tells you nothing you need to know. Averaging a stretch of
 * road gives the slope of the hill rather than the slope of the inch
 * underneath you.
 */
export function slopeAhead(nodes: Node[], s: number, span = 14): number {
  const i = Math.max(0, Math.min(nodes.length - 1, Math.floor(s)))
  let sum = 0
  let n = 0
  for (let k = 0; k < span && i + k < nodes.length; k++) {
    const w = 1 - k / span
    sum += nodes[i + k].dip * w
    n += w
  }
  return n > 0 ? sum / n : 0
}

/** Where the ball actually is in the world. */
export function ballAt(nodes: Node[], ride: Ride) {
  const r = readAt(nodes, ride.s)
  const rx = Math.cos(r.yaw)
  const rz = -Math.sin(r.yaw)
  return {
    x: r.x + rx * ride.u,
    // Down is positive, so being above the road is a negative offset.
    y: r.y - BALL_R - ride.h + Math.abs(ride.u) * Math.sin(r.bank) * Math.sign(r.bank || 1),
    z: r.z + rz * ride.u,
    yaw: r.yaw,
  }
}

/** Put the ball back on the road at the last checkpoint. */
function recover(ride: Ride, now: number) {
  ride.s = ride.checkpoint
  ride.u = 0
  ride.vu = 0
  ride.h = 0
  ride.vh = 0
  ride.speed = 1400
  ride.air = false
  ride.airT = 0
  ride.falls++
  ride.fellUntil = now + FELL_FOR
  ride.sparedUntil = now + FELL_FOR + 1400
}

export interface Beat {
  finished: boolean
  /** Went over an edge or into a gap. */
  fell: boolean
  /** Hit something on the road. */
  hit: boolean
  /** Left a lip. */
  launched: boolean
  landed: boolean
  /** Passed a checkpoint it had not passed before. */
  checked: boolean
}

export function step(
  ride: Ride,
  nodes: Node[],
  blocks: Obstacle[],
  steer: number,
  dt: number
): Beat {
  const beat: Beat = {
    finished: ride.done,
    fell: false,
    hit: false,
    launched: false,
    landed: false,
    checked: false,
  }
  if (ride.done) return beat
  ride.t += dt

  // Counting back in after a fall. The clock keeps running, which is
  // what makes falling cost something at all.
  if (ride.t * 1000 < ride.fellUntil) return beat

  const r = readAt(nodes, ride.s)
  const wasAir = ride.air

  /* --- across the road -------------------------------------------- */
  //
  // A corner throws the ball to the outside, the banking holds some of
  // that, and steering is what is left to you.
  // What the corner does to it, and what the camber takes back. Both
  // are real accelerations: v squared times curvature out, and gravity
  // times the tangent of the banking in.
  if (ride.air) {
    // In the air there is no camber to lean on and no corner pulling at
    // you, and barely any steering either.
    //
    // At full authority a ball could fly sideways off the road while it
    // was in mid-flight, which is how a run with seventeen clearable
    // jumps in it still managed ninety-two falls. You can nudge where
    // you land. You cannot drive there.
    ride.vu += steer * STEER * 0.18 * dt
  } else {
    const throwOut = ride.speed * ride.speed * (r.curve / STEP)
    const held = -Math.tan(r.bank) * G
    // Whatever the corner and the camber do not settle between them, the
    // road holds up to GRIP of - and you deal with the rest.
    const pull = throwOut + held
    const slips = Math.sign(pull) * Math.max(0, Math.abs(pull) - GRIP)
    ride.vu += (slips + steer * STEER) * dt
  }
  ride.vu *= 1 - 2.6 * dt
  ride.u += ride.vu * dt

  /* --- up and down -------------------------------------------------- */
  //
  // Being in the air is a property of the ball, not of the road beneath
  // it. Tied to the road, the ball slammed back down the instant it
  // crossed the far lip however high it happened to be - so a jump was
  // over the moment the gap was, and the arc you were in the middle of
  // just stopped. Now it leaves the ramp, flies, and comes down when it
  // comes down, over road or not.
  if (r.open && !wasAir && ride.h <= 0) {
    ride.air = true
    // Mostly a fixed shove rather than one that scales with pace.
    //
    // Tied to speed, a fast ball flew both higher and longer, and two
    // seconds at four and a half thousand units a second is nine
    // thousand units - more than a third of a run in one jump. Three
    // jumps finished a level, the ball spent most of its time in the
    // air where nothing can touch it, and the picture leapt forward in
    // great chunks. A jump is now roughly the same jump however fast
    // you arrive; arriving fast makes it longer, not slower.
    //
    // On top of that, the ramp throws you across whatever gap is
    // actually in front of you. A fixed shove means the gap you can
    // clear depends on how fast you happened to arrive, and arriving
    // slowly is exactly what happens after a fall or from behind a
    // block - so a jump could become a hole you drop into over and over
    // with no way to build the speed to get out of it. Four separate
    // attempts to place checkpoints generously enough to prevent that
    // each moved the problem somewhere else. Arriving fast still flies
    // further and longer; arriving slowly clears it and no more.
    // Walk forward to the gap first, then across it.
    //
    // readAt reports a node as open when either end of it is, so at the
    // moment of launch the integer node underneath is usually still
    // solid - and a loop that starts there and runs "while open" stops
    // immediately, measures nothing, and adds no lift at all.
    let far = Math.floor(ride.s)
    while (far < nodes.length && !nodes[far].open) far++
    while (far < nodes.length && nodes[far].open) far++
    const across = (far - ride.s) * STEP + BALL_R * 6
    const needed = (AIR_G * across) / (2 * Math.max(200, ride.speed))
    ride.vh = Math.max(ride.speed * 0.03 + 420, needed)
    ride.airT = 0
    beat.launched = true
  }

  if (ride.air) {
    ride.airT += dt
    ride.vh -= AIR_G * dt
    ride.h += ride.vh * dt
    ride.speed *= 1 - 0.05 * dt
    if (r.open) {
      if (ride.h < -200) {
        // Came down where there was nothing to come down onto.
        recover(ride, ride.t * 1000)
        beat.fell = true
        return beat
      }
    } else if (ride.h <= 0) {
      ride.air = false
      ride.bestAir = Math.max(ride.bestAir, ride.airT)
      const slam = Math.min(1, Math.abs(ride.vh) / 2400)
      ride.speed *= 1 - slam * 0.12
      ride.h = 0
      ride.vh = 0
      ride.airT = 0
      beat.landed = true
    }
    // Nothing on the road can touch a ball that is above it.
    ride.s += (ride.speed * dt) / STEP
    if (ride.s >= nodes.length - 2) {
      ride.s = nodes.length - 2
      ride.done = true
      beat.finished = true
    }
    return beat
  }

  if (!r.open) {

    /* --- the edge ------------------------------------------------- */
    if (r.closed) {
      // Roofed over: the wall is there, so it just stops you.
      const lip = r.half
      if (ride.u > lip) {
        ride.u = lip
        ride.vu = Math.min(0, ride.vu)
        ride.speed *= 1 - 0.6 * dt
      } else if (ride.u < -lip) {
        ride.u = -lip
        ride.vu = Math.max(0, ride.vu)
        ride.speed *= 1 - 0.6 * dt
      }
    } else if (Math.abs(ride.u) > r.half + BALL_R * 0.4) {
      recover(ride, ride.t * 1000)
      beat.fell = true
      return beat
    }

    /* --- things in the way ---------------------------------------- */
    const here = Math.floor(ride.s)
    for (const o of blocks) {
      if (Math.abs(o.at - here) > 1) continue
      const ou = obstacleU(o, ride.t * 1000)
      if (Math.abs(ride.u - ou) < o.half + BALL_R * 0.8) {
        if (ride.t * 1000 < ride.sparedUntil) continue
        // Knocked aside and slowed, never off.
        //
        // The knock used to be worth a hundred and sixty units of drift,
        // which from the middle of a road this wide is over the edge -
        // so every single clip of a block was a fall, and a block just
        // past a checkpoint was a loop with no way out of it. A hit now
        // costs speed and position, and the fall comes from what you do
        // after it.
        const away = Math.sign(ride.u - ou) || 1
        const room = r.half * 0.78
        ride.u = Math.max(-room, Math.min(room, ou + away * (o.half + BALL_R * 0.85)))
        ride.vu = away * 150
        ride.speed *= 0.72
        beat.hit = true
      }
    }

    /* --- speed ------------------------------------------------------ */
    const gain = r.dip * G * 0.6
    // Wide open and pointing downhill is fast; fighting a corner is not.
    const drag = 0.2 + Math.min(1.2, Math.abs(ride.vu) / 420) * 0.5
    ride.speed += (gain - drag * ride.speed * 0.875) * dt
    ride.speed = Math.max(220, Math.min(TOP, ride.speed))
  }

  /* --- along ------------------------------------------------------- */
  const was = Math.floor(ride.s)
  ride.s += (ride.speed * dt) / STEP
  const now = Math.floor(ride.s)
  for (let i = was + 1; i <= now && i < nodes.length; i++) {
    if (nodes[i].checkpoint && i > ride.checkpoint) {
      ride.checkpoint = i
      beat.checked = true
    }
  }

  if (ride.s >= nodes.length - 2) {
    ride.s = nodes.length - 2
    ride.done = true
    beat.finished = true
  }
  return beat
}

export function progress(ride: Ride, nodes: Node[]): number {
  return Math.max(0, Math.min(1, ride.s / (nodes.length - 2)))
}

/** How close to the middle of the road, 0 to 1. Drives the HUD. */
export function safety(ride: Ride, nodes: Node[]): number {
  const r = readAt(nodes, ride.s)
  if (r.open) return 1
  return Math.max(0, 1 - Math.abs(ride.u) / Math.max(1, r.half))
}

/**
 * What a finished run is worth.
 *
 * On the clock, and the clock already counts every fall - so there is no
 * separate punishment for falling off, which would be charging twice for
 * the same mistake.
 */
export function payFor(level: Level, seconds: number, bestAir: number): number {
  const par = parOf(level)
  const ratio = par / Math.max(1, seconds)
  return Math.max(12, Math.round(80 * ratio * ratio + bestAir * 40))
}

export function parOf(level: Level): number {
  return (level.length * STEP) / 1800
}
