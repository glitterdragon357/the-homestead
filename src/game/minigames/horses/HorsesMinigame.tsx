import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { billboard, forwardOf, type Camera } from '../../engine/firstPerson'
import { clarity } from '../../engine/firstPerson'
import { drawHorse, drawLand, drawQuarry, drawSky, project } from './horseDraw'
import { HorsePortrait, Stall } from './HorseArt'
import {
  AGE_LABEL,
  BLOWN_PACE,
  BURST_SECONDS,
  FOAL_FIGHT,
  FOAL_SCALE,
  FOAL_SPEED,
  FOAL_WIND,
  FEED_MS,
  STAGE_MS,
  WATER_MS,
  WIND_RECOVER,
  windDrain,
  BREEDS,
  COATS,
  EYE_MOUNTED,
  EYE_WALKING,
  GEAR,
  NOTICE_RANGE,
  QUARRY,
  SLIP_RATE,
  VIEW,
  WORLD,
  BREED_BOUNTY,
  ageOf,
  breakEffort,
  careOf,
  growthLeft,
  horseValue,
  isYoung,
  catchChance,
  lassoGrip,
  lassoReach,
  THROW_COOLDOWN,
  canHunt,
  gearValue,
  groundAt,
  initialHorses,
  pickName,
  needsTending,
  sightRange,
  type Breed,
  type Coat,
  type GearKey,
  type HorseSave,
  type Quarry,
  type StabledHorse,
} from './horseData'

/**
 * Wild Horses.
 *
 * Open country with nobody in it but you and whatever is grazing. The
 * whole game is the approach: horses mind how fast you come at them far
 * more than how close you get, so the skill is creeping the last hundred
 * yards at a crawl while your hand itches to run. Gentle one and she is
 * yours to ride and to call back later.
 *
 * Hunting is something you take up rather than start with - buy a bow
 * and the country turns into something you can also live off.
 */

interface Wild {
  breed: Breed
  coat: Coat
  /** Young ones run with the herd: slower, softer, and easier to hold. */
  foal: boolean
  x: number
  z: number
  heading: number
  speed: number
  /** Wind left in her, 0 to 1. A blown horse can be caught. */
  wind: number
  /** Seconds of running left before she looks back. */
  fleeing: number
  /** On the end of your rope: how far you have worked her down, 0 to 1. */
  roped: number | null
  seed: number
}

interface Beast {
  q: Quarry
  x: number
  z: number
  heading: number
  speed: number
  panic: number
  seed: number
}

interface Mount {
  horse: StabledHorse
  breed: Breed
  coat: Coat
  seed: number
}

interface World {
  cam: Camera
  wild: Wild[]
  beasts: Beast[]
  /** The horse you are on, if any. */
  mount: Mount | null
  /** A gentled horse standing loose beside you, waiting to be ridden. */
  led: Mount | null
  ledX: number
  ledZ: number
  stamina: number
  /** Time until you can throw again. */
  recoil: number
  t: number
  keys: Set<string>
  stick: { on: boolean; ox: number; oy: number; x: number; y: number }
  hover: { on: boolean; x: number; y: number }
  speed: number
  driftX: number
  driftZ: number
}

const FOOT_SPEED = 300
const TURN_RATE = 1.9
const PITCH_RATE = 1.4
const PITCH_LIMIT = 0.9

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

/** A spot out in the country, at a decent remove from you. */
function spotNear(cam: Camera, near: number, far: number) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2
    const r = rand(near, far)
    const x = cam.x + Math.cos(a) * r
    const z = cam.z + Math.sin(a) * r
    if (x < 200 || x > WORLD.width - 200 || z < 200 || z > WORLD.depth - 200) continue
    return { x, z }
  }
  return { x: cam.x + near, z: cam.z + near }
}

function makeWild(cam: Camera, near: number, far: number, foal = Math.random() < 0.3): Wild {
  const at = spotNear(cam, near, far)
  return {
    breed: pick(BREEDS),
    coat: pick(COATS),
    foal,
    x: at.x,
    z: at.z,
    heading: Math.random() * Math.PI * 2,
    speed: 0,
    wind: 1,
    fleeing: 0,
    roped: null,
    seed: Math.random() * 100,
  }
}

function makeBeast(cam: Camera, near: number, far: number): Beast {
  const q = pick(QUARRY)
  const at = spotNear(cam, near, far)
  return {
    q,
    x: at.x,
    z: at.z,
    heading: Math.random() * Math.PI * 2,
    speed: 0,
    panic: 0,
    seed: Math.random() * 100,
  }
}

export function HorsesMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<HorseSave>('horses', initialHorses)
  const { coins, earn, spend } = usePurse('horses')
  const saveRef = useRef(save)
  saveRef.current = save

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<World | null>(null)
  const pressRef = useRef<{ x: number; y: number; at: number; moved: number } | null>(null)

  const [sheet, setSheet] = useState<null | 'stable' | 'gear'>(null)
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet

  /** Ticks while the stable is open, so a foal visibly comes on. */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (sheet !== 'stable') return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [sheet])

  /*
   * A youngster with an empty manger or a dry bucket stops growing.
   *
   * Rather than take anything away from her, the moment she is left
   * wanting is added back onto how long she has left - so neglect costs
   * you time and nothing worse. The save is only written when somebody
   * is actually going without.
   */
  useEffect(() => {
    const id = window.setInterval(() => {
      const at = Date.now()
      setSave((prev) => {
        const stable = prev.stable ?? []
        let changed = false
        const next = stable.map((h) => {
          if (!isYoung(h, at)) return h
          const care = careOf(h, at)
          if (!care.hungry && !care.thirsty) return h
          changed = true
          return { ...h, grownAt: (h.grownAt ?? at) + 1000 }
        })
        return changed ? { ...prev, stable: next } : prev
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [setSave])

  /**
   * Sell one on. Two presses, because a horse you raised is not
   * something to lose to a stray tap.
   */
  const [selling, setSelling] = useState<string | null>(null)
  function sell(h: StabledHorse) {
    if (selling !== h.name) {
      setSelling(h.name)
      window.setTimeout(() => setSelling((n) => (n === h.name ? null : n)), 3000)
      return
    }
    const price = horseValue(h, Date.now())
    earn(price)
    setSelling(null)
    setSave((prev) => ({ ...prev, stable: (prev.stable ?? []).filter((x) => x.name !== h.name) }))
    const w = worldRef.current
    if (w) {
      if (w.mount?.horse.name === h.name) w.mount = null
      if (w.led?.horse.name === h.name) w.led = null
    }
    showToast(`${h.name} sold on for ${price} 🪙`)
  }

  /** Fill the manger or the bucket for one youngster. */
  function tend(name: string, what: 'feed' | 'water') {
    const at = Date.now()
    setSave((prev) => ({
      ...prev,
      stable: (prev.stable ?? []).map((h) =>
        h.name === name
          ? what === 'feed'
            ? { ...h, fedUntil: at + FEED_MS }
            : { ...h, wateredUntil: at + WATER_MS }
          : h
      ),
    }))
    showToast(what === 'feed' ? `Fed ${name}.` : `Watered ${name}.`)
  }

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [hud, setHud] = useState({
    speed: 0,
    mounted: false,
    mountName: '',
    stamina: 1,
    near: null as null | {
      breed: string
      coat: string
      /** Distance to her, in world units. */
      away: number
      /** Chance a throw lands from here, 0 to 1. */
      odds: number
      /** How blown she is, 0 fresh to 1 finished. */
      blown: number
      /** null unless she is on the end of your rope. */
      roped: number | null
      foal: boolean
    },
    canMount: false,
    aim: '',
    aimFar: false,
  })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  if (!worldRef.current) {
    const cam: Camera = {
      x: WORLD.width / 2,
      y: 0,
      z: WORLD.depth / 2,
      yaw: Math.PI / 3,
      pitch: 0.05,
    }
    cam.y = groundAt(cam.x, cam.z) - EYE_WALKING
    worldRef.current = {
      cam,
      wild: Array.from({ length: 9 }, () => makeWild(cam, 900, 3200)),
      beasts: Array.from({ length: 10 }, () => makeBeast(cam, 900, 3200)),
      mount: null,
      led: null,
      ledX: 0,
      ledZ: 0,
      stamina: 1,
      recoil: 0,
      t: 0,
      keys: new Set(),
      stick: { on: false, ox: 0, oy: 0, x: 0, y: 0 },
      hover: { on: false, x: 0, y: 0 },
      speed: 0,
      driftX: 0,
      driftZ: 0,
    }
  }

  useEffect(() => {
    setSave((s) => ({ ...s, outings: (s.outings ?? 0) + 1 }))
    return () => window.clearTimeout(toastTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  /** The wild horse you are working on: the nearest one watching you. */
  const nearestWild = useCallback((w: World): Wild | null => {
    let best: Wild | null = null
    let bestD = Infinity
    for (const h of w.wild) {
      if (h.roped !== null) return h
      const d = Math.hypot(h.x - w.cam.x, h.z - w.cam.z)
      if (d < NOTICE_RANGE * 1.6 && d < bestD) {
        best = h
        bestD = d
      }
    }
    return best
  }, [])

  /** Throw the rope at the nearest horse, if she is inside its reach. */
  const throwRope = useCallback(() => {
    const w = worldRef.current
    if (!w) return
    const h = nearestWild(w)
    if (!h || h.roped !== null) return
    if (w.recoil > 0) return
    const d = Math.hypot(h.x - w.cam.x, h.z - w.cam.z)
    const reach = lassoReach(saveRef.current)
    w.recoil = THROW_COOLDOWN
    if (d > reach) {
      showToast('Out of rope. She is too far off.')
      h.fleeing = Math.max(h.fleeing, 0.8)
      return
    }
    if (Math.random() > catchChance(d, reach)) {
      showToast('The loop falls short.')
      h.fleeing = Math.max(h.fleeing, 1.4)
      return
    }
    h.roped = 0
    h.fleeing = 0
    showToast('Rope on! Hold her — keep the pointer down.')
  }, [nearestWild, showToast])

  /** She has stopped fighting: she is yours. */
  const finishBreaking = useCallback((h: Wild) => {
    const w = worldRef.current
    if (!w) return

    const name = pickName(saveRef.current.usedNames ?? [])
    const horse: StabledHorse = {
      name,
      breed: h.breed.key,
      coat: h.coat.key,
      tamedAt: Date.now(),
      ridden: 0,
      // Two stages to come on, and only while you are out here with her.
      ...(h.foal
        ? {
            grownAt: Date.now() + STAGE_MS * 2,
            fedUntil: Date.now() + FEED_MS,
            wateredUntil: Date.now() + WATER_MS,
          }
        : {}),
    }
    w.wild = w.wild.filter((x) => x !== h)
    w.wild.push(makeWild(w.cam, 1600, 3400))
    w.led = { horse, breed: h.breed, coat: h.coat, seed: h.seed }
    w.ledX = h.x
    w.ledZ = h.z

    const firstOfHer = !(saveRef.current.breedsSeen ?? []).includes(h.breed.key)
    if (firstOfHer) earn(BREED_BOUNTY)
    setSave((s) => ({
      ...s,
      stable: [...(s.stable ?? []), horse],
      usedNames: [...(s.usedNames ?? []), name],
      breedsSeen: s.breedsSeen?.includes(h.breed.key)
        ? s.breedsSeen
        : [...(s.breedsSeen ?? []), h.breed.key],
    }))
    if (firstOfHer) {
      window.setTimeout(
        () => showToast(`First ${h.breed.label} you have caught · ${BREED_BOUNTY} 🪙`),
        1800
      )
    }
    showToast(
      h.foal
        ? `A foal. She will need raising. You call her ${name}.`
        : `Broken to the rope. You call her ${name}.`
    )
  }, [earn, setSave, showToast])

  const mount = useCallback(() => {
    const w = worldRef.current
    if (!w?.led) return
    if (ageOf(w.led.horse, Date.now()) !== 'grown') {
      showToast(`${w.led.horse.name} is too young to carry you yet.`)
      return
    }
    const d = Math.hypot(w.ledX - w.cam.x, w.ledZ - w.cam.z)
    if (d > 110) return
    w.mount = w.led
    w.led = null
    w.stamina = 1
    const name = w.mount.horse.name
    setSave((s) => ({
      ...s,
      stable: (s.stable ?? []).map((h) => (h.name === name ? { ...h, ridden: (h.ridden ?? 0) + 1 } : h)),
    }))
    showToast(`Up on ${name}.`)
  }, [setSave, showToast])

  const dismount = useCallback(() => {
    const w = worldRef.current
    if (!w?.mount) return
    w.led = w.mount
    w.ledX = w.cam.x + Math.sin(w.cam.yaw) * 70
    w.ledZ = w.cam.z + Math.cos(w.cam.yaw) * 70
    w.mount = null
    showToast('Down.')
  }, [showToast])

  const callHorse = useCallback(
    (horse: StabledHorse) => {
      const w = worldRef.current
      if (!w) return
      const breed = BREEDS.find((b) => b.key === horse.breed) ?? BREEDS[0]
      const coat = COATS.find((c) => c.key === horse.coat) ?? COATS[0]
      w.mount = null
      w.led = { horse, breed, coat, seed: Math.random() * 100 }
      w.ledX = w.cam.x + Math.sin(w.cam.yaw) * 90
      w.ledZ = w.cam.z + Math.cos(w.cam.yaw) * 90
      setSheet(null)
      showToast(`${horse.name} comes to you.`)
    },
    [showToast]
  )

  /** Whatever is under a point on the glass. */
  const pickBeast = useCallback((w: World, sx: number, sy: number) => {
    let best: Beast | null = null
    let bestOff = Infinity
    let dist = 0
    for (const b of w.beasts) {
      const p = project(w.cam, b.x, groundAt(b.x, b.z), b.z)
      if (!p) continue
      const span = b.q.length * p.scale
      const off = Math.hypot(p.sx - sx, p.sy - sy)
      if (off > Math.max(36, span * 0.8)) continue
      if (off < bestOff) {
        best = b
        bestOff = off
        dist = Math.hypot(b.x - w.cam.x, b.z - w.cam.z)
      }
    }
    return best ? { beast: best, dist } : null
  }, [])

  const shoot = useCallback(
    (sx: number, sy: number) => {
      const w = worldRef.current
      if (!w) return
      const hit = pickBeast(w, sx, sy)
      if (!hit) return
      if (!canHunt(saveRef.current)) {
        showToast('You have no bow. There is one in Gear.')
        return
      }
      const range = gearValue(saveRef.current, 'bow')
      if (hit.dist > range) {
        showToast(`${hit.beast.q.label} is out of range.`)
        return
      }
      const q = hit.beast.q
      w.beasts = w.beasts.filter((b) => b !== hit.beast)
      w.beasts.push(makeBeast(w.cam, 1400, 3200))
      for (const b of w.beasts) {
        if (Math.hypot(b.x - w.cam.x, b.z - w.cam.z) < 900) b.panic = 3
      }
      // A bowshot puts every horse in earshot to flight.
      for (const h of w.wild) {
        if (h.roped === null && Math.hypot(h.x - w.cam.x, h.z - w.cam.z) < 900) h.fleeing = 4
      }
      earn(q.coins)
      setSave((s) => ({ ...s, bag: { ...s.bag, [q.key]: (s.bag?.[q.key] ?? 0) + 1 } }))
      showToast(`${q.label} taken · ${q.coins} 🪙`)
    },
    [earn, pickBeast, setSave, showToast]
  )

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const w = worldRef.current
      if (!w) return
      if (e.key === 'Escape') {
        if (sheetRef.current) setSheet(null)
        else onExit()
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (sheetRef.current) return
        const near = nearestWild(w)
        if (w.led) mount()
        else if (near && near.roped === null) throwRope()
        return
      }
      if (e.key.startsWith('Arrow')) e.preventDefault()
      w.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    const up = (e: KeyboardEvent) => {
      worldRef.current?.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    const release = () => {
      const w = worldRef.current
      if (w) w.stick.on = false
    }
    const blur = () => {
      const w = worldRef.current
      if (!w) return
      w.keys.clear()
      w.stick.on = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [mount, nearestWild, onExit, throwRope])

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: ((clientX - r.left) / r.width) * VIEW.width,
      y: ((clientY - r.top) / r.height) * VIEW.height,
    }
  }, [])

  /* ---------------------------------------------------------------- */
  /* Loop                                                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let hudAt = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const w = worldRef.current
      if (!w) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (sheetRef.current === null) {
        w.t = now
        step(w, dt)
      }
      render(w)

      if (now - hudAt > 110) {
        hudAt = now
        const near = nearestWild(w)
        const s = saveRef.current
        const aim = w.hover.on ? pickBeast(w, w.hover.x, w.hover.y) : null
        setHud({
          speed: w.speed,
          mounted: !!w.mount,
          mountName: w.mount?.horse.name ?? '',
          stamina: w.stamina,
          near: near
            ? {
                breed: near.breed.label,
                coat: near.coat.label,
                away: Math.round(Math.hypot(near.x - w.cam.x, near.z - w.cam.z)),
                odds: catchChance(Math.hypot(near.x - w.cam.x, near.z - w.cam.z), lassoReach(s)),
                blown: 1 - near.wind,
                roped: near.roped,
                foal: near.foal,
              }
            : null,
          canMount: !!w.led && Math.hypot(w.ledX - w.cam.x, w.ledZ - w.cam.z) <= 110,
          aim: aim ? aim.beast.q.label : '',
          aimFar: aim ? aim.dist > gearValue(s, 'bow') : false,
        })
      }
    }

    function step(w: World, dt: number) {
      const s = saveRef.current
      const cam = w.cam
      const k = w.keys

      // --- steering and pace ----------------------------------------
      let turn = 0
      let pitch = 0
      let pace = 0
      if (k.has('a') || k.has('ArrowLeft')) turn -= 1
      if (k.has('d') || k.has('ArrowRight')) turn += 1
      if (k.has('q')) pitch -= 1
      if (k.has('e')) pitch += 1
      if (k.has('w') || k.has('ArrowUp')) pace += 1
      if (k.has('s')) pace -= 0.5

      if (w.stick.on) {
        /*
         * Holding down means going, the way it does in the water. The
         * first version asked you to drag upwards before you moved at
         * all, which mostly read as the controls being broken.
         */
        const dx = w.stick.x - w.stick.ox
        const dy = w.stick.y - w.stick.oy
        const dead = 10
        if (Math.abs(dx) > dead) turn += Math.max(-1, Math.min(1, (dx - Math.sign(dx) * dead) / 130))
        pace += 1
        if (dy > dead) pace -= Math.min(1.5, (dy - dead) / 110)
      }

      cam.yaw += turn * TURN_RATE * dt
      cam.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, cam.pitch + pitch * PITCH_RATE * dt))

      // --- moving ---------------------------------------------------
      const mounted = w.mount
      const top = mounted
        ? mounted.breed.speed * gearValue(s, 'saddle')
        : FOOT_SPEED
      const wanted = Math.max(-0.5, Math.min(1, pace)) * top

      // Galloping costs wind; a walk gets it back.
      if (mounted) {
        const hard = Math.abs(wanted) > top * 0.62
        w.stamina = Math.max(0, Math.min(1, w.stamina + (hard ? -dt / mounted.breed.stamina : dt / 6)))
      } else {
        w.stamina = Math.min(1, w.stamina + dt / 5)
      }
      const winded = mounted && w.stamina <= 0.02 ? 0.45 : 1

      const f = forwardOf(cam)
      const flat = Math.hypot(f.x, f.z) || 1
      const target = wanted * winded
      w.speed += (target - w.speed) * Math.min(1, dt * 3.2)

      cam.x += (f.x / flat) * w.speed * dt
      cam.z += (f.z / flat) * w.speed * dt
      cam.x = Math.min(WORLD.width - 60, Math.max(60, cam.x))
      cam.z = Math.min(WORLD.depth - 60, Math.max(60, cam.z))
      cam.y = groundAt(cam.x, cam.z) - (mounted ? EYE_MOUNTED : EYE_WALKING)


      // --- wild horses ----------------------------------------------
      w.recoil = Math.max(0, w.recoil - dt)
      const grip = lassoGrip(s)
      for (const h of w.wild) {
        const d = Math.hypot(h.x - cam.x, h.z - cam.z)

        if (h.roped !== null) {
          /*
           * On the rope. Pulling works her down; letting go gives it
           * back, and enough slack and she is away with your rope.
           */
          const holding = w.stick.on || w.keys.has(' ') || w.keys.has('Shift')
          const fight = breakEffort(h.breed) * (h.foal ? FOAL_FIGHT : 1)
          h.roped += (holding ? grip / fight : -SLIP_RATE * 0.3) * dt
          h.speed = h.breed.speed * 0.25 * (1 - h.roped)
          h.heading += Math.sin(w.t * 0.02 + h.seed) * 2.4 * dt
          if (h.roped < -0.15) {
            h.roped = null
            h.fleeing = 5
            h.wind = 0.8
            showToast('She threw the rope and went.')
          }
        } else if (h.fleeing > 0) {
          // A burst, not an exit. She runs, then turns to look at you.
          h.fleeing -= dt
          h.wind = Math.max(0, h.wind - (windDrain(h.breed) / (h.foal ? FOAL_WIND : 1)) * dt)
          h.speed = h.breed.speed * (h.foal ? FOAL_SPEED : 1) * (h.wind > 0 ? 1 : BLOWN_PACE)
          const away = Math.atan2(h.x - cam.x, h.z - cam.z)
          h.heading += ((away - h.heading + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 2.2)
        } else {
          // Standing, watching you, getting her wind back slowly.
          h.wind = Math.min(1, h.wind + WIND_RECOVER * dt)
          h.speed += (16 - h.speed) * Math.min(1, dt * 2)
          h.heading += Math.sin(w.t * 0.0002 + h.seed * 2) * 0.4 * dt
          if (d < NOTICE_RANGE) h.fleeing = BURST_SECONDS
        }

        h.x += Math.sin(h.heading) * h.speed * dt
        h.z += Math.cos(h.heading) * h.speed * dt
        h.x = Math.min(WORLD.width - 40, Math.max(40, h.x))
        h.z = Math.min(WORLD.depth - 40, Math.max(40, h.z))

        // A roped horse cannot get further away than the rope is long.
        if (h.roped !== null && h.roped >= 1) {
          finishBreaking(h)
          continue
        }

        if (h.roped !== null) {
          const reach = lassoReach(s) * 1.15
          const away = Math.hypot(h.x - cam.x, h.z - cam.z)
          if (away > reach) {
            h.x = cam.x + ((h.x - cam.x) / away) * reach
            h.z = cam.z + ((h.z - cam.z) / away) * reach
          }
        } else if (d > sightRange(s) * 1.4) {
          const at = spotNear(cam, 1200, 2800)
          h.x = at.x
          h.z = at.z
          h.fleeing = 0
          h.wind = 1
        }
      }

      // --- quarry ---------------------------------------------------
      for (const b of w.beasts) {
        const d = Math.hypot(b.x - cam.x, b.z - cam.z)
        const flee = b.q.wary * 620
        if (d < flee || b.panic > 0) {
          b.panic = Math.max(b.panic - dt, d < flee ? 1.6 : 0)
          b.speed = b.q.speed
          const away = Math.atan2(b.x - cam.x, b.z - cam.z)
          b.heading += ((away - b.heading + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 3)
        } else {
          b.speed += (0 - b.speed) * Math.min(1, dt * 1.4)
          b.heading += Math.sin(w.t * 0.00025 + b.seed) * 0.5 * dt
        }
        b.x += Math.sin(b.heading) * b.speed * dt
        b.z += Math.cos(b.heading) * b.speed * dt
        b.x = Math.min(WORLD.width - 40, Math.max(40, b.x))
        b.z = Math.min(WORLD.depth - 40, Math.max(40, b.z))
        if (d > sightRange(s) * 1.4) {
          const at = spotNear(cam, 1200, 3000)
          b.x = at.x
          b.z = at.z
          b.panic = 0
        }
      }

      // A led horse follows you about.
      if (w.led) {
        const d = Math.hypot(w.ledX - cam.x, w.ledZ - cam.z)
        if (d > 90) {
          const toward = Math.atan2(cam.x - w.ledX, cam.z - w.ledZ)
          const pace2 = Math.min(w.speed + 60, 400)
          w.ledX += Math.sin(toward) * pace2 * dt
          w.ledZ += Math.cos(toward) * pace2 * dt
        }
      }
    }

    function render(w: World) {
      const s = saveRef.current
      const cam = w.cam
      const sight = sightRange(s)

      drawSky(ctx!, cam, w.t)
      drawLand(ctx!, cam, sight, w.t)

      type Item =
        | { kind: 'wild'; p: ReturnType<typeof project>; a: number; h: Wild }
        | { kind: 'beast'; p: ReturnType<typeof project>; a: number; b: Beast }
        | { kind: 'led'; p: ReturnType<typeof project>; a: number; m: Mount }
      const items: Item[] = []

      for (const h of w.wild) {
        const p = project(cam, h.x, groundAt(h.x, h.z), h.z)
        if (!p) continue
        const a = clarity(p.depth, sight)
        if (a <= 0.02) continue
        items.push({ kind: 'wild', p, a, h })
      }
      for (const b of w.beasts) {
        const p = project(cam, b.x, groundAt(b.x, b.z), b.z)
        if (!p) continue
        const a = clarity(p.depth, sight)
        if (a <= 0.02) continue
        items.push({ kind: 'beast', p, a, b })
      }
      if (w.led) {
        const p = project(cam, w.ledX, groundAt(w.ledX, w.ledZ), w.ledZ)
        if (p) items.push({ kind: 'led', p, a: clarity(p.depth, sight), m: w.led })
      }
      items.sort((m, n) => (n.p?.depth ?? 0) - (m.p?.depth ?? 0))

      for (const item of items) {
        if (!item.p) continue
        if (item.kind === 'wild') {
          const { dir, squash } = billboard(item.h.heading, cam.yaw)
          drawHorse(
            ctx!,
            item.h.foal ? { ...item.h.breed, length: item.h.breed.length * FOAL_SCALE } : item.h.breed,
            item.h.coat,
            item.p,
            dir,
            squash,
            item.a,
            w.t,
            item.h.seed,
            item.h.speed / 400
          )
        } else if (item.kind === 'led') {
          const { dir, squash } = billboard(cam.yaw + Math.PI / 2, cam.yaw)
          const young = ageOf(item.m.horse, Date.now()) !== 'grown'
          drawHorse(
            ctx!,
            young ? { ...item.m.breed, length: item.m.breed.length * FOAL_SCALE } : item.m.breed,
            item.m.coat,
            item.p,
            dir,
            squash,
            item.a,
            w.t,
            item.m.seed,
            0.2
          )
        } else {
          const { dir, squash } = billboard(item.b.heading, cam.yaw)
          drawQuarry(ctx!, item.b.q, item.p, dir, squash, item.a, w.t, item.b.seed, item.b.speed / 400)
        }
      }

      // A ring on the horse you are working, and on what you are aiming at.
      const near = nearestWild(w)
      if (near) {
        const p = project(cam, near.x, groundAt(near.x, near.z), near.z)
        if (p) {
          const roped = near.roped !== null
          const odds = catchChance(Math.hypot(near.x - cam.x, near.z - cam.z), lassoReach(s))
          ctx!.save()
          ctx!.strokeStyle = roped ? '#7cd88f' : odds > 0.5 ? '#e8c46a' : '#f2e0a0'
          ctx!.setLineDash(roped || odds > 0.5 ? [] : [6, 6])
          ctx!.lineWidth = 2
          ctx!.beginPath()
          ctx!.ellipse(p.sx, p.sy + 6 * p.scale, near.breed.length * 0.62 * p.scale, near.breed.length * 0.22 * p.scale, 0, 0, Math.PI * 2)
          ctx!.stroke()
          ctx!.restore()
        }
      }

      // Crosshair
      ctx!.save()
      ctx!.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx!.lineWidth = 1.5
      const cx = VIEW.width / 2
      const cy = VIEW.height / 2
      for (const [a, b] of [[-11, -4], [4, 11]]) {
        ctx!.beginPath()
        ctx!.moveTo(cx + a, cy)
        ctx!.lineTo(cx + b, cy)
        ctx!.moveTo(cx, cy + a)
        ctx!.lineTo(cx, cy + b)
        ctx!.stroke()
      }
      ctx!.restore()
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [nearestWild, pickBeast, setSave, showToast])

  /* ---------------------------------------------------------------- */
  /* Chrome                                                            */
  /* ---------------------------------------------------------------- */

  function buy(key: GearKey) {
    const list = GEAR[key].list
    const owned = saveRef.current[key] ?? 0
    const next = list[owned + 1]
    if (!next) return
    if (!spend(next.cost)) {
      showToast('Not enough coin yet.')
      return
    }
    setSave((s) => ({ ...s, [key]: owned + 1 }))
    showToast(`Bought: ${next.label}`)
  }

  const pace = Math.abs(hud.speed)
  const near = hud.near
  const waiting = needsTending(save.stable ?? [], now)

  return (
    <div style={S.wrap}>
      <div
        style={S.stage}
        onPointerDown={(e) => {
          if (sheet) return
          if ((e.target as HTMLElement).closest('button')) return
          // Capturing can throw for a pointer the browser is not tracking, and
          // an exception here would abort the handler before you ever started
          // moving.
          try {
            ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
          } catch {
            // Not fatal - the window-level pointerup still ends the stroke.
          }
          const p = toCanvas(e.clientX, e.clientY)
          pressRef.current = { x: p.x, y: p.y, at: performance.now(), moved: 0 }
          const w = worldRef.current
          if (w) {
            w.stick = { on: true, ox: p.x, oy: p.y, x: p.x, y: p.y }
            w.hover = { on: true, x: p.x, y: p.y }
          }
        }}
        onPointerMove={(e) => {
          const w = worldRef.current
          if (!w) return
          const p = toCanvas(e.clientX, e.clientY)
          w.hover = { on: true, x: p.x, y: p.y }
          if (!w.stick.on) return
          w.stick.x = p.x
          w.stick.y = p.y
          const pr = pressRef.current
          if (pr) pr.moved = Math.max(pr.moved, Math.hypot(p.x - pr.x, p.y - pr.y))
        }}
        onPointerUp={() => {
          const w = worldRef.current
          if (w) w.stick.on = false
          const pr = pressRef.current
          pressRef.current = null
          if (!pr || sheet) return
          if (pr.moved > 9 || performance.now() - pr.at > 400) return
          shoot(pr.x, pr.y)
        }}
        onPointerLeave={() => {
          const w = worldRef.current
          if (!w) return
          w.hover.on = false
          w.stick.on = false
        }}
      >
        <canvas ref={canvasRef} width={VIEW.width} height={VIEW.height} style={S.canvas} />

        <div style={S.topBar}>
          <div style={S.readout}>
            <span style={S.label}>{hud.mounted ? `Riding ${hud.mountName}` : 'On foot'}</span>
            <span style={S.pace}>
              {pace < 8 ? 'standing' : pace < 220 ? 'walking' : pace < 520 ? 'at a canter' : 'flat out'}
            </span>
          </div>

          {hud.mounted && (
            <div style={S.staminaWrap}>
              <span style={S.label}>Wind</span>
              <div style={S.track}>
                <div
                  style={{
                    ...S.fill,
                    width: `${Math.round(hud.stamina * 100)}%`,
                    background: hud.stamina > 0.3 ? '#7cd88f' : '#e2584f',
                  }}
                />
              </div>
            </div>
          )}

          <span style={S.coins}>🪙 {coins}</span>
        </div>

        {near && (
          <div style={S.trustBox}>
            <div style={S.trustHead}>
              {near.coat} {near.breed}
              {near.foal && <span style={S.away}> · foal</span>}
              <span style={S.away}>
                {near.roped !== null ? ' — roped' : ` — ${near.away} out`}
              </span>
            </div>
            <div style={S.track}>
              <div
                style={{
                  ...S.fill,
                  width: `${Math.round(
                    (near.roped !== null ? Math.max(0, near.roped) : near.blown) * 100
                  )}%`,
                  background: near.roped !== null ? '#7cd88f' : '#e8c46a',
                }}
              />
            </div>
            <div style={S.trustNote}>
              {near.roped !== null
                ? 'Hold on — keep the pointer down until she gives in.'
                : near.blown > 0.75
                  ? 'She is blown. Close on her now.'
                  : near.odds > 0.05
                    ? `Throw would land about ${Math.round(near.odds * 100)} times in a hundred.`
                    : 'Out of rope. Run her down — she cannot gallop for ever.'}
            </div>
          </div>
        )}

        {toast && <div style={S.toast}>{toast}</div>}

        <div style={S.bottomBar}>
          {near && near.roped === null && (
            <button
              style={{ ...S.act, opacity: near.odds > 0.05 ? 1 : 0.5 }}
              onPointerDown={(e) => {
                e.stopPropagation()
                throwRope()
              }}
            >
              Throw the rope
            </button>
          )}
          {hud.canMount && (
            <button style={S.act} onClick={mount}>
              Mount
            </button>
          )}
          {hud.mounted && (
            <button style={S.ghost} onClick={dismount}>
              Dismount
            </button>
          )}
          <button style={S.ghost} onClick={() => setSheet(sheet === 'stable' ? null : 'stable')}>
            Stable
          </button>
          <button style={S.ghost} onClick={() => setSheet(sheet === 'gear' ? null : 'gear')}>
            Gear
          </button>
          <button style={S.ghost} onClick={onExit}>
            Leave
          </button>
        </div>

        {hud.aim && (
          <div style={{ ...S.aimTag, color: hud.aimFar ? '#ffc9a8' : '#f2e0a0' }}>
            {!canHunt(save)
              ? `${hud.aim} · you have no bow`
              : hud.aimFar
                ? `${hud.aim} · out of range`
                : `${hud.aim} · click to shoot`}
          </div>
        )}

        {sheet === 'stable' && (
          <Sheet title="Stable" onClose={() => setSheet(null)}>
            <div style={S.beam} />
            {waiting > 0 && (
              <div style={S.waiting}>
                {waiting === 1 ? 'One youngster is' : `${waiting} youngsters are`} waiting on
                feed or water — nothing grows until you see to them.
              </div>
            )}
            <p style={S.hint}>
              Every horse you have caught, in her own stall. Call one and she will come to you
              wherever you are. Youngsters need bringing on before they can carry anyone — and
              they only grow in the time you spend out here.
            </p>

            {(save.stable ?? []).length === 0 ? (
              <div style={S.emptyStable}>
                <Stall label="Empty" sub="waiting for a horse">
                  <span style={S.emptyNote}>—</span>
                </Stall>
                <p style={S.hint}>
                  Nothing in here yet. Find a herd, run one down and get a rope on her.
                </p>
              </div>
            ) : (
              <div style={S.stalls}>
                {(save.stable ?? []).map((h) => {
                  const age = ageOf(h, now)
                  const breed = BREEDS.find((b) => b.key === h.breed)
                  const coat = COATS.find((c) => c.key === h.coat)
                  const left = growthLeft(h, now)
                  const care = careOf(h, now)
                  const stalled = age !== 'grown' && (care.hungry || care.thirsty)
                  return (
                    <Stall
                      key={h.name}
                      label={h.name}
                      sub={`${coat?.label ?? ''} ${breed?.label ?? ''}`}
                      action={
                        <>
                          {age !== 'grown' && (
                            <div style={S.care}>
                              <CareRow
                                label="Feed"
                                level={care.feed}
                                empty={care.hungry}
                                onFill={() => tend(h.name, 'feed')}
                              />
                              <CareRow
                                label="Water"
                                level={care.water}
                                empty={care.thirsty}
                                onFill={() => tend(h.name, 'water')}
                              />
                            </div>
                          )}
                          <div style={S.stallFoot}>
                            <span
                              style={{
                                ...S.ageTag,
                                color: stalled ? '#ff9b93' : '#c2b08a',
                              }}
                            >
                              {AGE_LABEL[age]}
                              {left > 0 && (stalled ? ' · waiting on you' : ` · ${countdown(left)}`)}
                            </span>
                            <button
                              style={{ ...S.small, opacity: age === 'grown' ? 1 : 0.55 }}
                              onClick={() => callHorse(h)}
                            >
                              {age === 'grown' ? 'Call' : 'Bring out'}
                            </button>
                          </div>
                          <button
                            style={{
                              ...S.sell,
                              ...(selling === h.name ? S.sellSure : null),
                            }}
                            onClick={() => sell(h)}
                          >
                            {selling === h.name
                              ? `Sure? ${horseValue(h, now)} 🪙`
                              : `Sell · ${horseValue(h, now)} 🪙`}
                          </button>
                        </>
                      }
                    >
                      <HorsePortrait breed={h.breed} coat={h.coat} age={age} size={126} />
                    </Stall>
                  )
                })}
              </div>
            )}

            <div style={S.section}>Breeds caught</div>
            <div style={S.rowNote}>
              {(save.breedsSeen ?? []).length} of {BREEDS.length} —{' '}
              {BREEDS.filter((b) => (save.breedsSeen ?? []).includes(b.key))
                .map((b) => b.label)
                .join(', ') || 'none yet'}
            </div>

            <div style={S.section}>Game taken</div>
            {QUARRY.filter((q) => (save.bag?.[q.key] ?? 0) > 0).length === 0 && (
              <div style={S.rowNote}>Nothing yet.</div>
            )}
            {QUARRY.filter((q) => (save.bag?.[q.key] ?? 0) > 0).map((q) => (
              <div key={q.key} style={S.row}>
                <span style={{ ...S.swatch, background: q.body }} />
                <div style={{ flex: 1 }}>
                  <div style={S.rowName}>{q.label}</div>
                  <div style={S.rowNote}>{q.note}</div>
                </div>
                <span style={S.rowNote}>×{save.bag?.[q.key]}</span>
              </div>
            ))}
          </Sheet>
        )}

        {sheet === 'gear' && (
          <Sheet title="Gear" onClose={() => setSheet(null)}>
            <p style={S.hint}>
              Catching horses is the trade: sell one on from the stable, and every breed you
              catch for the first time pays a bounty on top. A bow opens up hunting as a second
              string — until you own one you are only here to watch. Coin earned out here stays
              out here.
            </p>
            {(Object.keys(GEAR) as GearKey[]).map((key) => {
              const { list, label } = GEAR[key]
              const owned = save[key] ?? 0
              const next = list[owned + 1]
              return (
                <div key={key} style={S.row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.section}>{label}</div>
                    <div style={S.rowName}>{list[owned].label}</div>
                    <div style={S.rowNote}>{next ? next.blurb : 'Nothing better to be had.'}</div>
                  </div>
                  {next ? (
                    <button
                      style={{ ...S.small, opacity: coins >= next.cost ? 1 : 0.45 }}
                      onClick={() => buy(key)}
                    >
                      {next.label}
                      <span style={S.cost}>🪙 {next.cost}</span>
                    </button>
                  ) : (
                    <span style={S.rowNote}>best</span>
                  )}
                </div>
              )
            })}
            <div style={S.section}>Coin</div>
            <GiftRow from="horses" />
          </Sheet>
        )}
      </div>
    </div>
  )
}

/** A wait in minutes and seconds, now that these run long. */
function countdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  if (total < 90) return `${total}s`
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`
}

function CareRow({
  label,
  level,
  empty,
  onFill,
}: {
  label: string
  level: number
  empty: boolean
  onFill: () => void
}) {
  return (
    <div style={S.careRow}>
      <span style={S.careLabel}>{label}</span>
      <div style={S.careTrack}>
        <div
          style={{
            ...S.careFill,
            width: `${Math.round(level * 100)}%`,
            background: empty ? '#e2584f' : level < 0.3 ? '#e0b84a' : '#7cd88f',
          }}
        />
      </div>
      <button style={S.careBtn} onClick={onFill}>
        {label === 'Feed' ? 'Fill' : 'Fill'}
      </button>
    </div>
  )
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div style={S.sheet}>
      <div style={S.sheetHead}>
        <h3 style={S.sheetTitle}>{title}</h3>
        <button style={S.small} onClick={onClose}>
          Back to the country
        </button>
      </div>
      <div style={S.sheetBody}>{children}</div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    width: 'min(960px, 100vw)',
    maxHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  stage: {
    position: 'relative',
    width: '100%',
    touchAction: 'none',
    userSelect: 'none',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    cursor: 'crosshair',
  },
  canvas: { display: 'block', width: '100%', height: 'auto' },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 12px',
    background: 'linear-gradient(rgba(20,26,16,0.55), rgba(20,26,16,0))',
    color: '#f2f6ea',
    pointerEvents: 'none',
  },
  readout: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 },
  label: { fontSize: 10.5, letterSpacing: 0.7, textTransform: 'uppercase', opacity: 0.85 },
  pace: { fontSize: 16, fontWeight: 700 },
  coins: { fontSize: 16, fontWeight: 700, color: '#ffe6a8' },
  staminaWrap: { display: 'flex', alignItems: 'center', gap: 7, flex: '0 1 200px' },
  track: { flex: 1, height: 8, borderRadius: 5, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, transition: 'width 120ms linear' },

  trustBox: {
    position: 'absolute',
    top: 56,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 300,
    background: 'rgba(18,24,14,0.72)',
    borderRadius: 10,
    padding: '7px 11px',
    color: '#f2f6ea',
    pointerEvents: 'none',
  },
  trustHead: { fontSize: 12.5, fontWeight: 700, marginBottom: 4 },
  away: { color: '#cfe0c0', fontWeight: 600 },
  trustNote: { fontSize: 11, opacity: 0.85, marginTop: 4 },

  toast: {
    position: 'absolute',
    bottom: 66,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(18,24,14,0.9)',
    color: '#f2f6ea',
    fontSize: 13,
    padding: '6px 14px',
    borderRadius: 14,
    pointerEvents: 'none',
    maxWidth: '80%',
    textAlign: 'center',
  },
  aimTag: {
    position: 'absolute',
    bottom: 96,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(18,24,14,0.82)',
    fontSize: 12.5,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: 13,
    pointerEvents: 'none',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'linear-gradient(rgba(20,26,16,0), rgba(20,26,16,0.72))',
  },
  act: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: 20,
    background: '#e8c46a',
    color: '#2b2415',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghost: {
    padding: '10px 13px',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 20,
    background: 'rgba(20,30,16,0.55)',
    color: '#f2f6ea',
    fontSize: 12.5,
    cursor: 'pointer',
  },

  sheet: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(16,22,14,0.95)',
    display: 'flex',
    flexDirection: 'column',
    color: '#f2f6ea',
  },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.14)',
  },
  sheetTitle: { margin: 0, fontSize: 18 },
  sheetBody: { flex: 1, overflowY: 'auto', padding: '4px 16px 18px' },
  hint: { fontSize: 12.5, color: '#b8c8a8', margin: '10px 0' },
  section: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#9fb890',
    fontWeight: 700,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 9,
    marginBottom: 5,
  },
  swatch: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  rowName: { fontSize: 13.5, fontWeight: 600 },
  rowNote: { fontSize: 11.5, color: '#a8bd9a' },
  small: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '7px 12px',
    border: 'none',
    borderRadius: 9,
    background: '#e8c46a',
    color: '#2b2415',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  cost: { fontSize: 11, opacity: 0.75 },
  beam: {
    height: 10,
    borderRadius: 3,
    background: 'linear-gradient(#6b563c, #3a2c1e)',
    margin: '6px 0 2px',
  },
  stalls: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 8,
  },
  emptyStable: { maxWidth: 200 },
  emptyNote: { color: '#8a7a5f', fontSize: 26 },
  stallFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  care: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 },
  careRow: { display: 'flex', alignItems: 'center', gap: 5 },
  careLabel: { fontSize: 9.5, width: 30, color: '#c2b08a', textTransform: 'uppercase', letterSpacing: 0.4 },
  careTrack: { flex: 1, height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.35)', overflow: 'hidden' },
  careFill: { height: '100%', borderRadius: 4, transition: 'width 200ms linear' },
  careBtn: {
    padding: '2px 8px',
    border: 'none',
    borderRadius: 6,
    background: '#c9a850',
    color: '#2b2415',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
  },
  sell: {
    width: '100%',
    marginTop: 4,
    padding: '5px 8px',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 7,
    background: 'transparent',
    color: '#c2b08a',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  sellSure: { background: '#a8563a', color: '#fff', border: '1px solid #c2704f' },
  waiting: {
    background: 'rgba(200,80,60,0.22)',
    border: '1px solid rgba(226,88,79,0.5)',
    color: '#ffd7d2',
    fontSize: 12,
    borderRadius: 8,
    padding: '6px 10px',
    margin: '6px 0 2px',
  },
  ageTag: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#c2b08a',
    fontWeight: 700,
  },
}
