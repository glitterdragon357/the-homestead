/**
 * Rolling.
 *
 * The ball's position is two numbers: how far down the chute it is, and
 * where it sits around the inside of the pipe. Everything else - the
 * banking, the scrubbing, the jumps - falls out of those two and the
 * shape of the node you happen to be on.
 *
 * There is no crash. The pipe is closed, so the only thing a bad line
 * costs you is speed, and the only thing it costs you on a jump is
 * landing badly into the next one.
 */

import { ARC, type Level, type Node, BALL_R, STEP } from './chuteData'

/** Gravity, in world units a second squared. */
export const G = 3000
/** Flat-out top speed, before a chute's own steepness is counted. */
/**
 * Twice what it was.
 *
 * Everything that scales with speed scales with it: the gain off a
 * slope, the drag, and the pull a corner puts on the ball, so the shape
 * of a good line is unchanged and only the pace of it moves.
 */
export const TOP = 6400
/** How hard you can push the ball round the inside of the pipe. */
export const STEER = 7.2

export interface Ride {
  /** How far along, as a node index with a fraction. */
  s: number
  /** Where the ball sits around the pipe. 0 is the bottom. */
  theta: number
  /** How fast it is going round the pipe. */
  spin: number
  /** Speed along the chute. */
  speed: number
  /** Seconds since the start. */
  t: number
  /** Off the end of a lip, and how high above the centreline. */
  air: boolean
  airY: number
  airV: number
  /** How long the current jump has lasted, for the HUD. */
  airT: number
  /** Longest jump this run, in seconds. */
  bestAir: number
  /** How well the line is going right now, 0 to 1. Drives the HUD. */
  grip: number
  done: boolean
}

export function startRide(): Ride {
  return {
    s: 0,
    theta: 0,
    spin: 0,
    speed: 640,
    t: 0,
    air: false,
    airY: 0,
    airV: 0,
    airT: 0,
    bestAir: 0,
    grip: 1,
    done: false,
  }
}

export function nodeAt(nodes: Node[], s: number): Node {
  const i = Math.max(0, Math.min(nodes.length - 1, Math.floor(s)))
  return nodes[i]
}

/**
 * The height on the wall where the corner does the work for you.
 *
 * A banked turn holds itself when the wall's slope matches the ratio of
 * sideways pull to gravity, which for a ball going round a bend of this
 * curvature at this speed is the arctangent of one over the other. Ride
 * there and the pipe is carrying you; ride below it and you are dragging
 * the ball up the wall yourself every foot of the corner.
 */
export function idealLine(curve: number, speed: number): number {
  const k = curve / STEP
  const want = Math.atan((speed * speed * Math.abs(k)) / G)
  return curve >= 0 ? want : -want
}

/** How far ahead the line is read. */
export const LOOK = 10

/**
 * The line to be holding right now, read from the corner you are
 * entering rather than the inch of track under you.
 *
 * Taken off the node alone it flips the instant the curvature does,
 * which on a twisty chute is several times a second - faster than the
 * ball can be moved round the pipe at all. The effect was that the
 * twistier a chute, the less a good line was worth, which is exactly
 * backwards. Averaging the corner ahead gives something a person can
 * actually set up for.
 */
export function lineFor(nodes: Node[], s: number, speed: number): number {
  const i = Math.max(0, Math.min(nodes.length - 1, Math.floor(s)))
  let sum = 0
  let n = 0
  for (let k = 0; k < LOOK && i + k < nodes.length; k++) {
    // The near end of the look-ahead counts for more than the far end.
    const w = 1 - k / LOOK
    sum += nodes[i + k].curve * w
    n += w
  }
  const want = idealLine(n > 0 ? sum / n : 0, speed)
  // On open road the best line available is the top of the banking.
  //
  // Unclamped, a fast corner asks for a height the road does not have,
  // so the best a player could possibly do still read as off the line -
  // the needle sat on SCRUBBING for the whole run however well it was
  // driven, and the speed went with it.
  const lip = nodes[i].closed ? Math.PI : ARC * 0.92
  return Math.max(-lip, Math.min(lip, want))
}

export function step(
  ride: Ride,
  nodes: Node[],
  steer: number,
  dt: number
): { finished: boolean; landed: boolean; launched: boolean } {
  if (ride.done) return { finished: true, landed: false, launched: false }
  ride.t += dt

  const n = nodeAt(nodes, ride.s)
  const wasAir = ride.air
  let landed = false
  let launched = false

  if (n.open) {
    /* --- off the lip ---------------------------------------------- */
    if (!wasAir) {
      ride.air = true
      ride.airY = 0
      // Everything you had going up the lip turns into height.
      ride.airV = -(ride.speed * 0.42 + 260)
      ride.airT = 0
      launched = true
    }
    ride.airT += dt
    ride.airV += G * 0.9 * dt
    ride.airY += ride.airV * dt
    if (ride.airY > 0) ride.airY = 0
    // Air is cheap: you keep nearly all of it, which is why a jump is
    // worth taking fast rather than something to be survived.
    ride.speed *= 1 - 0.1 * dt
    // You can still turn the ball in the air, just not much.
    ride.spin += steer * STEER * 0.3 * dt
    ride.theta += ride.spin * dt
    ride.spin *= 1 - 1.6 * dt
    ride.grip = 1
  } else {
    /* --- back in the pipe ------------------------------------------ */
    if (wasAir) {
      ride.air = false
      ride.bestAir = Math.max(ride.bestAir, ride.airT)
      // Coming down hard off a big one costs a little, and coming down
      // sideways costs more. Nothing here can end the run.
      const slam = Math.min(1, Math.abs(ride.airV) / 1600)
      ride.speed *= 1 - slam * 0.1
      ride.spin *= 0.4
      ride.airY = 0
      ride.airT = 0
      landed = true
    }

    const want = lineFor(nodes, ride.s, ride.speed)

    // What the corner is doing to you, and what gravity is doing about
    // it. Both act on where the ball sits round the pipe.
    const sideways = (ride.speed * ride.speed * (n.curve / STEP)) / n.radius
    const down = (-G * Math.sin(ride.theta)) / n.radius
    ride.spin += (sideways + down + steer * STEER) * dt
    // Barely damped, on purpose.
    //
    // Damped hard, the ball settles by itself at very nearly the right
    // height on the wall and holds there with no help - so a run where
    // the player never touched anything was as quick as a perfect one,
    // because physics was doing the whole job. Left loose it sloshes up
    // and down the bore through every corner instead, and settling that
    // slosh is the thing there is to be good at.
    ride.spin *= 1 - 0.9 * dt
    ride.theta += ride.spin * dt

    if (n.closed) {
      // Roofed over: nowhere to go but round it.
      if (ride.theta > Math.PI) ride.theta -= Math.PI * 2
      if (ride.theta < -Math.PI) ride.theta += Math.PI * 2
    } else {
      // Open road. The banking comes up far enough that running out of
      // it costs you the climb and sets you back down - which is why
      // there is no falling off and nothing to crash into.
      // Running out of road stops the climb and costs a little speed.
      // It does not kick the ball back down: a rim that shoves started
      // an oscillation the player could not settle, and the ball spent
      // the rest of the run bouncing wall to wall at walking pace.
      if (ride.theta > ARC) {
        ride.theta = ARC
        ride.spin = Math.min(0, ride.spin)
        ride.speed *= 1 - 0.5 * dt
      } else if (ride.theta < -ARC) {
        ride.theta = -ARC
        ride.spin = Math.max(0, ride.spin)
        ride.speed *= 1 - 0.5 * dt
      }
    }

    // How close the line is. This is the whole game.
    const off = Math.abs(ride.theta - want)
    ride.grip = Math.max(0, 1 - off / 1.5 - Math.min(0.6, Math.abs(ride.spin) * 0.22))

    // Downhill pays, the wrong line charges.
    //
    // The gap between the two is the game, and it has to be wide. At the
    // first numbers a perfect line down a chute called Switchback was
    // worth five per cent against sitting at the bottom the whole way,
    // which is not a skill, it is a rounding error. A corner now pays
    // properly for being taken well and charges properly for being
    // dragged round.
    const gain = n.dip * G * 0.6
    const bend = Math.min(1, Math.abs(n.curve) / 0.016)
    // Being off the line costs, and sloshing costs on top of it: a ball
    // climbing and falling across the bore is spending on the wall every
    // bit of height it keeps throwing away.
    const slosh = Math.min(1.4, Math.abs(ride.spin) * 0.5)
    const scrub = 0.2 + (1 - ride.grip) * (0.25 + bend * 0.9) + slosh * 0.55
    // Drag has to actually bite, or every line saturates at the cap and
    // the two are indistinguishable - which is what happened: a perfect
    // run and a lazy one both sat pinned at top speed the whole way
    // down, and the only difference between them was rounding.
    ride.speed += (gain - scrub * ride.speed * 0.875) * dt
    if (bend > 0.2) ride.speed += ride.grip * bend * 900 * dt
    ride.speed = Math.max(140, Math.min(TOP, ride.speed))
  }

  ride.s += (ride.speed * dt) / STEP
  if (ride.s >= nodes.length - 2) {
    ride.s = nodes.length - 2
    ride.done = true
  }
  return { finished: ride.done, landed, launched }
}

/** How far down the chute, 0 to 1. */
export function progress(ride: Ride, nodes: Node[]): number {
  return Math.max(0, Math.min(1, ride.s / (nodes.length - 2)))
}

/** Where the ball actually is in the world, and which way it is facing. */
export function ballAt(nodes: Node[], ride: Ride): {
  x: number
  y: number
  z: number
  yaw: number
} {
  const i = Math.max(0, Math.min(nodes.length - 2, Math.floor(ride.s)))
  const f = ride.s - i
  const a = nodes[i]
  const b = nodes[i + 1]
  const cx = a.x + (b.x - a.x) * f
  const cy = a.y + (b.y - a.y) * f
  const cz = a.z + (b.z - a.z) * f
  const yaw = a.yaw + (b.yaw - a.yaw) * f
  // Out from the centre, round the pipe, in the plane across the track.
  const r = a.radius - BALL_R
  const rx = Math.cos(yaw)
  const rz = -Math.sin(yaw)
  const off = r * Math.sin(ride.theta)
  return {
    x: cx + rx * off,
    y: cy + r * Math.cos(ride.theta) + ride.airY,
    z: cz + rz * off,
    yaw,
  }
}

/**
 * What a finished run is worth.
 *
 * Paid on the clock rather than on turning up, with the par time coming
 * from the chute's own length, so a long chute is not automatically
 * worth more than a short one taken well.
 */
export function payFor(level: Level, seconds: number, bestAir: number): number {
  const par = (level.length * STEP) / 1800
  const ratio = par / Math.max(1, seconds)
  return Math.max(12, Math.round(70 * ratio * ratio + bestAir * 40))
}

export function parOf(level: Level): number {
  return (level.length * STEP) / 1800
}
