import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { clarity, forwardOf, type Camera } from '../../engine/firstPerson'
import { finish } from '../../engine/polish'
import {
  drawBuilding,
  drawCar,
  drawFixture,
  drawGround,
  drawPerson,
  drawPlaygroundFences,
  drawProp,
  drawRoom,
  drawSky,
  project,
} from './cityDraw'
import {
  CAR_COLOURS,
  CEILING,
  COATS,
  DOOR_REACH,
  FIXTURE_DOING,
  FIXTURE_RADIUS,
  fenceBlocks,
  FIXTURE_LABEL,
  GROUND,
  INTERIORS,
  INTERIOR_BY_KEY,
  PAVEMENT_INSET,
  REACH,
  SIGHT,
  STREET,
  VIEW,
  WORLD,
  buildingsAround,
  groundHeightAt,
  initialCity,
  insideBuilding,
  isPavement,
  laneCentre,
  fixturesAround,
  heightOf,
  type Building,
  type Car,
  type CitySave,
  type Fixture,
  type Interior,
  type Person,
  type Prop,
} from './cityData'

/**
 * City Explorers.
 *
 * The engine is the one the ocean and the wild country use, but the
 * problem is different in two ways: you fly, so up is somewhere you can
 * go, and the world is solid, so the buildings are boxes you have to get
 * around rather than sprites you pass through. Fly the streets, have a
 * go on whatever is in the parks, and let yourself into the places that
 * will have you.
 */

interface World {
  cam: Camera
  speed: number
  /** On your feet, or up in the air. */
  flying: boolean
  /** The room you are standing in, if you have gone inside. */
  room: Interior | null
  /** Where you were on the street, so you come back out where you left. */
  outside: { x: number; z: number; yaw: number } | null
  cars: Car[]
  people: Person[]
  t: number
  keys: Set<string>
  stick: { on: boolean; ox: number; oy: number; x: number; y: number }
  highest: number
  walked: number
}

const EYE = 17
const WALK_SPEED = 190
const FLY_SPEED = 620

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

/** Put a car on the nearest road, pointing along it. */
function makeCar(cam: Camera): Car {
  const alongX = Math.random() < 0.5
  const r = rand(600, 2400)
  const a = Math.random() * Math.PI * 2
  const x = cam.x + Math.cos(a) * r
  const z = cam.z + Math.sin(a) * r
  const lane = 22
  const dir = Math.random() < 0.5 ? 1 : -1
  const big = Math.random()
  return {
    x: alongX ? x : laneCentre(x) + dir * lane,
    z: alongX ? laneCentre(z) + dir * lane : z,
    heading: alongX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI,
    speed: rand(120, 240),
    colour: CAR_COLOURS[Math.floor(Math.random() * CAR_COLOURS.length)],
    size: big > 0.86 ? 62 : big > 0.7 ? 46 : 36,
    height: big > 0.86 ? 34 : 24,
  }
}

/** Put somebody on a pavement. */
function makePerson(cam: Camera): Person {
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2
    const r = rand(200, 1500)
    const x = cam.x + Math.cos(a) * r
    const z = cam.z + Math.sin(a) * r
    if (!isPavement(x, z)) continue
    return {
      x,
      z,
      heading: Math.floor(Math.random() * 4) * (Math.PI / 2),
      speed: rand(22, 42),
      coat: COATS[Math.floor(Math.random() * COATS.length)],
      legs: Math.floor(Math.random() * 4),
      scale: Math.random() < 0.22 ? 0.72 : 1,
    }
  }
  return {
    x: cam.x + 200,
    z: laneCentre(cam.z) - STREET * 0.5 + PAVEMENT_INSET,
    heading: 0,
    speed: 30,
    coat: COATS[0],
    legs: 0,
    scale: 1,
  }
}

const TURN_RATE = 1.7
const PITCH_RATE = 1.4
const PITCH_LIMIT = 1.15

export function CityMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<CitySave>('city', initialCity)
  const saveRef = useRef(save)
  saveRef.current = save

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<World | null>(null)
  const pressRef = useRef<{ x: number; y: number; at: number; moved: number } | null>(null)

  const [sheet, setSheet] = useState<null | 'journal' | 'gear'>(null)
  const [inside, setInside] = useState<string | null>(null)
  /*
   * Only a real panel pauses the world. Being indoors used to count as
   * one, which froze the room the moment you stepped into it - you could
   * look at it but not walk a single pace.
   */
  const sheetRef = useRef<string | null>(null)
  sheetRef.current = sheet

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [hud, setHud] = useState({
    height: 0,
    flying: false,
    fixture: null as null | { key: string; kind: Fixture['kind']; used: boolean },
    door: null as null | { key: string; interior: string; onFoot: boolean },
    prop: null as null | { key: string; label: string; done: boolean },
    indoors: null as null | string,
  })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  if (!worldRef.current) {
    worldRef.current = {
      cam: {
        x: WORLD.width / 2,
        y: GROUND - EYE,
        z: WORLD.depth / 2,
        yaw: Math.PI / 4,
        pitch: 0.12,
      },
      speed: 0,
      flying: false,
      room: null,
      outside: null,
      cars: [],
      people: [],
      t: 0,
      keys: new Set(),
      stick: { on: false, ox: 0, oy: 0, x: 0, y: 0 },
      highest: save.highest ?? 0,
      walked: 0,
    }
    const w = worldRef.current
    w.cam.y = groundHeightAt(w.cam.x, w.cam.z) - EYE
    w.cars = Array.from({ length: 26 }, () => makeCar(w.cam))
    w.people = Array.from({ length: 34 }, () => makePerson(w.cam))
  }

  useEffect(() => {
    setSave((s) => ({ ...s, outings: (s.outings ?? 0) + 1 }))
    return () => {
      const w = worldRef.current
      if (w) {
        const top = w.highest
        const far = Math.round(w.walked / 10)
        setSave((s) => ({
          ...s,
          highest: Math.max(s.highest ?? 0, top),
          walked: (s.walked ?? 0) + far,
        }))
      }
      window.clearTimeout(toastTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------------------------------------------------------- */
  /* What is to hand                                                   */
  /* ---------------------------------------------------------------- */

  const nearestFixture = useCallback((w: World): Fixture | null => {
    let best: Fixture | null = null
    let bestD = REACH
    for (const f of fixturesAround(w.cam.x, w.cam.z, REACH * 2)) {
      const d = Math.hypot(f.x - w.cam.x, f.z - w.cam.z, (GROUND - w.cam.y) * 0.6)
      if (d < bestD) {
        best = f
        bestD = d
      }
    }
    return best
  }, [])

  const nearestDoor = useCallback((w: World): Building | null => {
    let best: Building | null = null
    let bestD = DOOR_REACH
    for (const b of buildingsAround(w.cam.x, w.cam.z, DOOR_REACH * 2)) {
      if (!b.interior) continue
      const d = Math.hypot(b.doorX - w.cam.x, b.doorZ - w.cam.z, (GROUND - w.cam.y) * 0.5)
      if (d < bestD) {
        best = b
        bestD = d
      }
    }
    return best
  }, [])

  const nearestProp = useCallback((w: World): Prop | null => {
    if (!w.room) return null
    let best: Prop | null = null
    let bestD = 70
    for (const prop of w.room.props) {
      const d = Math.hypot(prop.x - w.cam.x, prop.z - w.cam.z) - prop.r
      if (d < bestD) {
        best = prop
        bestD = d
      }
    }
    return best
  }, [])

  const useFixture = useCallback(() => {
    const w = worldRef.current
    if (!w) return
    const f = nearestFixture(w)
    if (!f) return
    if ((saveRef.current.used ?? []).includes(f.key)) {
      showToast(`You have already had a go on ${FIXTURE_LABEL[f.kind]}.`)
      return
    }
    setSave((s) => ({
      ...s,
      used: [...(s.used ?? []), f.key],
      kinds: s.kinds?.includes(f.kind) ? s.kinds : [...(s.kinds ?? []), f.kind],
    }))
    showToast(FIXTURE_DOING[f.kind])
  }, [nearestFixture, setSave, showToast])

  const goInside = useCallback(() => {
    const w = worldRef.current
    if (!w) return
    const b = nearestDoor(w)
    if (!b?.interior) return
    if (w.flying) {
      showToast('Land first. You cannot open a door from the air.')
      return
    }
    const place = INTERIOR_BY_KEY[b.interior]
    // Remember the street so you come back out where you went in.
    w.outside = { x: w.cam.x, z: w.cam.z, yaw: w.cam.yaw }
    w.room = place
    w.cam.x = 0
    w.cam.z = -place.hd + 40
    w.cam.y = GROUND - EYE
    w.cam.yaw = 0
    w.cam.pitch = 0.02
    w.speed = 0
    setSave((s) => ({
      ...s,
      visited: s.visited?.includes(place.key) ? s.visited : [...(s.visited ?? []), place.key],
    }))
    setInside(place.key)
    showToast(place.blurb)
  }, [nearestDoor, setSave, showToast])

  /** Back out onto the pavement. */
  const goOutside = useCallback(() => {
    const w = worldRef.current
    if (!w?.room) return
    if (w.outside) {
      w.cam.x = w.outside.x
      w.cam.z = w.outside.z
      w.cam.yaw = w.outside.yaw + Math.PI
    }
    w.room = null
    w.outside = null
    w.cam.y = groundHeightAt(w.cam.x, w.cam.z) - EYE
    w.speed = 0
    setInside(null)
  }, [])

  /** Have a go at whatever you are standing next to indoors. */
  const useProp = useCallback(() => {
    const w = worldRef.current
    if (!w?.room) return
    const near = nearestProp(w)
    if (!near) return
    const id = `${w.room.key}:${near.key}`
    if ((saveRef.current.done ?? []).includes(id)) {
      showToast('You have done that already.')
      return
    }
    setSave((s) => ({ ...s, done: [...(s.done ?? []), id] }))
    showToast(near.note)
  }, [setSave, showToast])

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const w = worldRef.current
      if (!w) return
      if (e.key === 'Escape') {
        if (inside) goOutside()
        else if (sheet) setSheet(null)
        else onExit()
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (sheetRef.current) return
        if (w.room) useProp()
        else if (nearestDoor(w)) goInside()
        else useFixture()
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
  }, [goInside, inside, nearestDoor, onExit, sheet, useFixture, useProp])

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
      if (!sheetRef.current) {
        w.t = now
        step(w, dt)
      }
      render(w)

      if (now - hudAt > 110) {
        hudAt = now
        const f = w.room ? null : nearestFixture(w)
        const b = w.room ? null : nearestDoor(w)
        const place = b?.interior ? INTERIOR_BY_KEY[b.interior] : null
        setHud({
          height: heightOf(w.cam.y),
          flying: w.flying,
          fixture: f
            ? { key: f.key, kind: f.kind, used: (saveRef.current.used ?? []).includes(f.key) }
            : null,
          door: place ? { key: b!.key, interior: place.key, onFoot: !w.flying } : null,
          prop: (() => {
            const pr = nearestProp(w)
            if (!pr || !w.room) return null
            return {
              key: pr.key,
              label: pr.label,
              done: (saveRef.current.done ?? []).includes(`${w.room.key}:${pr.key}`),
            }
          })(),
          indoors: w.room?.key ?? null,
        })
      }
    }

    /** Is this spot taken by something you cannot walk through? */
    function blockedOutside(w: World, x: number, y: number, z: number): boolean {
      const pad = 16
      for (const b of buildingsAround(x, z, 420)) {
        if (insideBuilding(b, x, y, z, pad)) return true
      }
      if (!w.flying) {
        if (fenceBlocks(x, z)) return true
        for (const f of fixturesAround(x, z, 300)) {
          if (Math.hypot(f.x - x, f.z - z) < FIXTURE_RADIUS[f.kind]) return true
        }
        for (const car of w.cars) {
          if (Math.hypot(car.x - x, car.z - z) < car.size * 0.75) return true
        }
        for (const p of w.people) {
          if (Math.hypot(p.x - x, p.z - z) < 14) return true
        }
      }
      return false
    }

    /** Indoors: the walls and the furniture. */
    function blockedInside(room: Interior, x: number, z: number): boolean {
      const pad = 15
      if (Math.abs(x) > room.hw - pad || Math.abs(z) > room.hd - pad) return true
      for (const prop of room.props) {
        if (Math.hypot(prop.x - x, prop.z - z) < prop.r + 10) return true
      }
      return false
    }

    function step(w: World, dt: number) {
      const cam = w.cam
      const k = w.keys

      let turn = 0
      let pitch = 0
      let pace = 0
      if (k.has('a') || k.has('ArrowLeft')) turn -= 1
      if (k.has('d') || k.has('ArrowRight')) turn += 1
      if (k.has('ArrowUp')) pitch -= 1
      if (k.has('ArrowDown')) pitch += 1
      if (k.has('w')) pace += 1
      if (k.has('s')) pace -= 0.6

      if (w.stick.on) {
        const dx = w.stick.x - w.stick.ox
        const dy = w.stick.y - w.stick.oy
        const dead = 11
        if (Math.abs(dx) > dead) turn += Math.max(-1, Math.min(1, (dx - Math.sign(dx) * dead) / 140))
        if (Math.abs(dy) > dead) pitch += Math.max(-1, Math.min(1, (dy - Math.sign(dy) * dead) / 120))
        pace += 1
      }

      cam.yaw += turn * TURN_RATE * dt
      cam.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, cam.pitch + pitch * PITCH_RATE * dt))

      const top = w.room ? WALK_SPEED : w.flying ? FLY_SPEED : WALK_SPEED
      w.speed += (Math.max(-0.6, Math.min(1, pace)) * top - w.speed) * Math.min(1, dt * 3.4)

      const f = forwardOf(cam)
      const wasX = cam.x
      const wasZ = cam.z

      if (w.room) {
        // Indoors you are always on your feet.
        const flat = Math.hypot(f.x, f.z) || 1
        cam.x += (f.x / flat) * w.speed * dt
        cam.z += (f.z / flat) * w.speed * dt
        if (blockedInside(w.room, cam.x, cam.z)) {
          cam.x = wasX
          cam.z = wasZ
          w.speed = 0
        }
        cam.y = GROUND - EYE
        return
      }

      if (w.flying) {
        // In the air you go wherever you are pointing.
        cam.x += f.x * w.speed * dt
        cam.y += f.y * w.speed * dt
        cam.z += f.z * w.speed * dt
        cam.y = Math.max(CEILING, cam.y)
      } else {
        /*
         * On your feet you only travel along the ground, however much you
         * are looking at the sky - and your eyes stay a head's height
         * above whatever you are standing on, so stepping up a kerb is
         * something you feel.
         */
        const flat = Math.hypot(f.x, f.z) || 1
        cam.x += (f.x / flat) * w.speed * dt
        cam.z += (f.z / flat) * w.speed * dt
      }

      cam.x = Math.min(WORLD.width - 40, Math.max(40, cam.x))
      cam.z = Math.min(WORLD.depth - 40, Math.max(40, cam.z))

      /*
       * Everything out here is solid, and running into it stops you.
       *
       * Not a slide along the wall - you come to a halt and have to turn
       * around, which is what it is like to walk into a building.
       */
      if (blockedOutside(w, cam.x, cam.y, cam.z)) {
        cam.x = wasX
        cam.z = wasZ
        w.speed = 0
      }

      const stepped = Math.hypot(cam.x - wasX, cam.z - wasZ)
      if (!w.flying) {
        cam.y = groundHeightAt(cam.x, cam.z) - EYE
        w.walked += stepped
      } else {
        cam.y = Math.min(groundHeightAt(cam.x, cam.z) - EYE, cam.y)
      }

      const up = heightOf(cam.y)
      if (up > w.highest) w.highest = up

      // --- traffic ---------------------------------------------------
      for (const car of w.cars) {
        car.x += Math.sin(car.heading) * car.speed * dt
        car.z += Math.cos(car.heading) * car.speed * dt
        if (Math.hypot(car.x - cam.x, car.z - cam.z) > 2800) Object.assign(car, makeCar(cam))
      }

      // --- passers-by ------------------------------------------------
      for (const p of w.people) {
        const nx = p.x + Math.sin(p.heading) * p.speed * dt
        const nz = p.z + Math.cos(p.heading) * p.speed * dt
        if (isPavement(nx, nz)) {
          p.x = nx
          p.z = nz
        } else {
          // Reached a corner: turn and carry on along the next pavement.
          p.heading += Math.PI / 2
        }
        if (Math.hypot(p.x - cam.x, p.z - cam.z) > 1900) Object.assign(p, makePerson(cam))
      }
    }

    function render(w: World) {
      const cam = w.cam
      const sight = SIGHT

      if (w.room) {
        const room = w.room
        ctx!.fillStyle = room.ceiling
        ctx!.fillRect(0, 0, VIEW.width, VIEW.height)
        drawRoom(ctx!, room, cam)
        const items = room.props
          .map((prop) => ({ prop, p: project(cam, prop.x, GROUND, prop.z) }))
          .filter((i) => i.p)
          .sort((a, b) => b.p!.depth - a.p!.depth)
        for (const { prop, p } of items) {
          drawProp(ctx!, prop, p!, w.t, (saveRef.current.done ?? []).includes(`${room.key}:${prop.key}`))
        }
        ctx!.save()
        ctx!.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx!.lineWidth = 1.5
        const mx = VIEW.width / 2
        const my = VIEW.height / 2
        for (const [a, b] of [[-10, -4], [4, 10]]) {
          ctx!.beginPath()
          ctx!.moveTo(mx + a, my)
          ctx!.lineTo(mx + b, my)
          ctx!.moveTo(mx, my + a)
          ctx!.lineTo(mx, my + b)
          ctx!.stroke()
        }
        ctx!.restore()
        finish(ctx!, VIEW, { vignette: 0.46, grain: 0.05 })
        return
      }

      drawSky(ctx!, cam, w.t)
      drawGround(ctx!, cam, sight)
      drawPlaygroundFences(ctx!, cam, sight)

      // Buildings, far ones first so near ones cover them.
      const near = buildingsAround(cam.x, cam.z, sight)
      near.sort(
        (a, b) =>
          Math.hypot(b.x - cam.x, b.z - cam.z) - Math.hypot(a.x - cam.x, a.z - cam.z)
      )
      for (const b of near) drawBuilding(ctx!, b, cam, sight, true)

      // Traffic, sorted with the buildings so nothing sits on the wrong
      // side of a wall.
      const cars = [...w.cars].sort(
        (a, b) =>
          Math.hypot(b.x - cam.x, b.z - cam.z) - Math.hypot(a.x - cam.x, a.z - cam.z)
      )
      for (const car of cars) drawCar(ctx!, car, cam, sight)

      // Street furniture over the top of it.
      const fixtures = fixturesAround(cam.x, cam.z, Math.min(sight, 2600))
      const drawn: { p: NonNullable<ReturnType<typeof project>>; f: Fixture; a: number }[] = []
      for (const f of fixtures) {
        const p = project(cam, f.x, GROUND, f.z)
        if (!p) continue
        const a = clarity(p.depth, sight)
        if (a <= 0.02) continue
        drawn.push({ p, f, a })
      }
      drawn.sort((m, n) => n.p.depth - m.p.depth)
      for (const { p, f, a } of drawn) drawFixture(ctx!, f, p, a, w.t)

      // People, on the pavement where they belong.
      const walkers: { p: NonNullable<ReturnType<typeof project>>; person: Person; a: number }[] = []
      for (const person of w.people) {
        const p = project(cam, person.x, groundHeightAt(person.x, person.z), person.z)
        if (!p) continue
        const a = clarity(p.depth, sight)
        if (a <= 0.02) continue
        walkers.push({ p, person, a })
      }
      walkers.sort((m, n) => n.p.depth - m.p.depth)
      for (const { p, person, a } of walkers) drawPerson(ctx!, person, p, a, w.t)

      // A ring on whatever is to hand.
      const handy = nearestFixture(w)
      const door = nearestDoor(w)
      const markAt = handy
        ? project(cam, handy.x, GROUND, handy.z)
        : door
          ? project(cam, door.doorX, GROUND - 30, door.doorZ)
          : null
      if (markAt) {
        ctx!.save()
        ctx!.strokeStyle = '#f2e0a0'
        ctx!.lineWidth = 2
        ctx!.setLineDash([5, 5])
        ctx!.beginPath()
        ctx!.ellipse(markAt.sx, markAt.sy, 60 * markAt.scale, 20 * markAt.scale, 0, 0, Math.PI * 2)
        ctx!.stroke()
        ctx!.restore()
      }

      ctx!.save()
      ctx!.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx!.lineWidth = 1.5
      const cx = VIEW.width / 2
      const cy = VIEW.height / 2
      for (const [a, b] of [[-10, -4], [4, 10]]) {
        ctx!.beginPath()
        ctx!.moveTo(cx + a, cy)
        ctx!.lineTo(cx + b, cy)
        ctx!.moveTo(cx, cy + a)
        ctx!.lineTo(cx, cy + b)
        ctx!.stroke()
      }
      ctx!.restore()

      finish(ctx!, VIEW, { vignette: 0.4, grain: 0.044 })
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [nearestDoor, nearestFixture, nearestProp])

  /* ---------------------------------------------------------------- */
  /* Chrome                                                            */
  /* ---------------------------------------------------------------- */

  /** Up off the pavement, or back down onto it. */
  function toggleFly() {
    const w = worldRef.current
    if (!w) return
    w.flying = !w.flying
    if (!w.flying) w.cam.y = groundHeightAt(w.cam.x, w.cam.z) - EYE
    w.speed = 0
    showToast(w.flying ? 'Up you go.' : 'Back on the pavement.')
  }

  return (
    <div style={S.wrap}>
      <div
        style={S.stage}
        onPointerDown={(e) => {
          /*
           * Only an open panel swallows the pointer. Being indoors used
           * to as well, which left you standing in a room unable to walk
           * a step - the same mistake as pausing the world in there.
           */
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
          if (w) w.stick = { on: true, ox: p.x, oy: p.y, x: p.x, y: p.y }
        }}
        onPointerMove={(e) => {
          const w = worldRef.current
          if (!w?.stick.on) return
          const p = toCanvas(e.clientX, e.clientY)
          w.stick.x = p.x
          w.stick.y = p.y
          const pr = pressRef.current
          if (pr) pr.moved = Math.max(pr.moved, Math.hypot(p.x - pr.x, p.y - pr.y))
        }}
        onPointerUp={() => {
          const w = worldRef.current
          if (w) w.stick.on = false
          pressRef.current = null
        }}
        onPointerLeave={() => {
          const w = worldRef.current
          if (w) w.stick.on = false
        }}
      >
        <canvas ref={canvasRef} width={VIEW.width} height={VIEW.height} style={S.canvas} />

        <div style={S.topBar}>
          <div style={S.readout}>
            <span style={S.label}>
              {hud.indoors ? INTERIOR_BY_KEY[hud.indoors].label : hud.flying ? 'Flying' : 'On foot'}
            </span>
            <span style={S.big}>
              {hud.indoors ? 'inside' : hud.flying ? `${hud.height} m` : 'street level'}
            </span>
          </div>
          <span style={S.hint}>
            {hud.indoors
              ? 'hold to walk · go up to a thing to try it'
              : hud.flying
                ? 'hold to fly · look where you want to go'
                : 'hold to walk · stand at a door to open it'}
          </span>
          <span style={S.label}>
            {(save.visited ?? []).length} / {INTERIORS.length} places
          </span>
        </div>

        {toast && <div style={S.toast}>{toast}</div>}

        <div style={S.bottomBar}>
          {hud.indoors ? (
            <>
              {hud.prop && (
                <button
                  style={{ ...S.act, opacity: hud.prop.done ? 0.55 : 1 }}
                  onClick={useProp}
                >
                  {hud.prop.done ? `${hud.prop.label} · done` : `Try ${hud.prop.label}`}
                </button>
              )}
              <button style={S.ghost} onClick={goOutside}>
                Out to the street
              </button>
            </>
          ) : (
            <>
              {hud.door && (
                <button
                  style={{ ...S.act, opacity: hud.door.onFoot ? 1 : 0.5 }}
                  onClick={goInside}
                >
                  {hud.door.onFoot
                    ? `Open door · ${INTERIOR_BY_KEY[hud.door.interior].label}`
                    : `${INTERIOR_BY_KEY[hud.door.interior].label} · land first`}
                </button>
              )}
              {!hud.door && hud.fixture && (
                <button
                  style={{ ...S.act, opacity: hud.fixture.used ? 0.55 : 1 }}
                  onClick={useFixture}
                >
                  {hud.fixture.used
                    ? `${FIXTURE_LABEL[hud.fixture.kind]} · done`
                    : `Have a go on ${FIXTURE_LABEL[hud.fixture.kind]}`}
                </button>
              )}
              <button style={S.ghost} onClick={toggleFly}>
                {hud.flying ? 'Land' : 'Fly'}
              </button>
            </>
          )}
          <button style={S.ghost} onClick={() => setSheet(sheet === 'journal' ? null : 'journal')}>
            Journal
          </button>
          <button style={S.ghost} onClick={onExit}>
            Leave
          </button>
        </div>

        {sheet === 'journal' && (
          <Sheet title="Journal" onClose={() => setSheet(null)} back="Back to the city">
            <div style={S.tally}>
              <Tally label="Places" value={`${(save.visited ?? []).length} / ${INTERIORS.length}`} />
              <Tally label="Things tried" value={String((save.kinds ?? []).length)} />
              <Tally label="Highest" value={`${Math.max(save.highest ?? 0, hud.height)} m`} />
              <Tally label="Walked" value={`${save.walked ?? 0} m`} />
            </div>
            <div style={S.section}>Places in the city</div>
            {INTERIORS.map((i) => {
              const been = (save.visited ?? []).includes(i.key)
              const doneCount = i.props.filter((d) => (save.done ?? []).includes(`${i.key}:${d.key}`)).length
              return (
                <div key={i.key} style={S.row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.rowName}>{been ? i.label : 'Somewhere you have not been'}</div>
                    <div style={S.rowNote}>
                      {been ? `${doneCount} of ${i.props.length} things done` : 'Not been in yet'}
                    </div>
                  </div>
                  <span style={S.rowNote}>{been ? `${doneCount}/${i.props.length}` : '—'}</span>
                </div>
              )
            })}
            <div style={S.section}>Things you have had a go on</div>
            <div style={S.rowNote}>
              {(save.kinds ?? []).length
                ? (save.kinds ?? []).map((k) => FIXTURE_LABEL[k as Fixture['kind']]).join(', ')
                : 'Nothing yet. There are parks all over this city.'}
            </div>
          </Sheet>
        )}

      </div>
    </div>
  )
}

function Sheet({
  title,
  onClose,
  back,
  children,
}: {
  title: string
  onClose: () => void
  back: string
  children: React.ReactNode
}) {
  return (
    <div style={S.sheet}>
      <div style={S.sheetHead}>
        <h3 style={S.sheetTitle}>{title}</h3>
        <button style={S.small} onClick={onClose}>
          {back}
        </button>
      </div>
      <div style={S.sheetBody}>{children}</div>
    </div>
  )
}

function Tally({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.tallyCell}>
      <div style={S.tallyValue}>{value}</div>
      <div style={S.tallyLabel}>{label}</div>
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
    background: 'linear-gradient(rgba(10,20,30,0.55), rgba(10,20,30,0))',
    color: '#eef4f8',
    pointerEvents: 'none',
  },
  readout: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 },
  label: { fontSize: 10.5, letterSpacing: 0.7, textTransform: 'uppercase', opacity: 0.85 },
  big: { fontSize: 18, fontWeight: 700 },
  hint: { fontSize: 11, opacity: 0.62 },
  coins: { fontSize: 16, fontWeight: 700, color: '#ffe6a8' },

  toast: {
    position: 'absolute',
    bottom: 66,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(10,20,30,0.9)',
    color: '#eef4f8',
    fontSize: 13,
    padding: '6px 14px',
    borderRadius: 14,
    pointerEvents: 'none',
    maxWidth: '82%',
    textAlign: 'center',
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
    background: 'linear-gradient(rgba(10,20,30,0), rgba(10,20,30,0.72))',
  },
  act: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: 20,
    background: '#f2c85a',
    color: '#2b2415',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
    maxWidth: 300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  ghost: {
    padding: '10px 13px',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 20,
    background: 'rgba(12,24,36,0.55)',
    color: '#eef4f8',
    fontSize: 12.5,
    cursor: 'pointer',
  },

  sheet: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(12,20,28,0.95)',
    display: 'flex',
    flexDirection: 'column',
    color: '#eef4f8',
  },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.14)',
  },
  sheetTitle: { margin: 0, fontSize: 18 },
  sheetBody: { flex: 1, overflowY: 'auto', padding: '10px 16px 18px' },
  blurb: { fontSize: 12.5, color: '#a8bccc', margin: '10px 0' },

  tally: { display: 'flex', gap: 8, margin: '4px 0 10px' },
  tallyCell: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    borderRadius: 9,
    padding: '7px 4px',
    textAlign: 'center',
  },
  tallyValue: { fontSize: 15, fontWeight: 700 },
  tallyLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.7 },

  section: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8fb0c4',
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
  rowDone: { background: 'rgba(124,216,143,0.12)' },
  rowName: { fontSize: 13.5, fontWeight: 600 },
  rowNote: { fontSize: 11.5, color: '#a0b8c8' },
  tick: { color: '#7cd88f', fontWeight: 700, fontSize: 16 },
  small: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '7px 12px',
    border: 'none',
    borderRadius: 9,
    background: '#f2c85a',
    color: '#2b2415',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  cost: { fontSize: 11, opacity: 0.75 },
}
