import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import {
  GEAR,
  LANDMARKS,
  SPECIES,
  SURFACE_Y,
  VIEW,
  WORLD,
  ZONES,
  depthMetres,
  floorHeightAt,
  gearValue,
  gloomAt,
  homeZone,
  identifyRange,
  initialOcean,
  zoneAt,
  type GearKey,
  type OceanSave,
} from './oceanData'
import {
  makeFish,
  populate,
  spawnAhead,
  spawnPoint,
  stepFish,
  type Fish,
} from './oceanLife'
import {
  clarity,
  drawBackdrop,
  drawCreature,
  drawDarkness,
  drawGlow,
  drawLandmark,
  drawMotes,
  drawSeabed,
  drawSky,
  drawSurface,
  forwardOf,
  makeMotes,
  project,
  type Camera,
  type Mote,
  type Projected,
} from './oceanDraw'

/**
 * Ocean Explorers - seen from behind your own mask.
 *
 * You are in the water rather than watching someone else be in it: the
 * camera is your eyes, fish come at you out of the murk, and the only
 * thing between you and the far side of the sea is how far you can see.
 *
 * There is no air gauge and no timer. You can stay down as long as you
 * like, and the dive ends when you decide it does.
 *
 * Two ways to play, both of which pay. Spear fish for pearls, or never
 * spear a thing and fill the logbook instead - every first sighting and
 * every landmark carries its own bounty.
 *
 * Sealed off from the rest of the homestead on purpose: no crate, no
 * purse, no gifting. Pearls exist only in this game's save.
 */

interface World {
  fish: Fish[]
  cam: Camera
  motes: Mote[]
  t: number
  keys: Set<string>
  /** Virtual stick: where you pressed, and where the finger is now. */
  stick: { on: boolean; ox: number; oy: number; x: number; y: number }
  /** Where the pointer is resting, for highlighting what it is over. */
  hover: { on: boolean; x: number; y: number }
  /** Up on the surface, and staying there until you choose to dive. */
  floating: boolean
  /** Have you been properly under since the last dive? Stops the surface
   *  grabbing you again the instant you push off it. */
  wasDeep: boolean
  /** Momentum, so starting and stopping have some weight to them. */
  driftX: number
  driftY: number
  driftZ: number
  deepest: number
}

/** Where you sit when floating: head and shoulders clear of the water. */
const FLOAT_Y = SURFACE_Y - 30
const PITCH_LIMIT = 1.15
const TURN_RATE = 1.9
const PITCH_RATE = 1.5

export function OceanMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<OceanSave>('ocean', initialOcean)
  const saveRef = useRef(save)
  saveRef.current = save

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  /** The above-water view, painted aside so it can fade in as you rise. */
  const skyRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<World | null>(null)

  /** Where a press started, so a click can be told apart from a drag. */
  const press = useRef<{ x: number; y: number; at: number; moved: number } | null>(null)

  const [sheet, setSheet] = useState<null | 'log' | 'gear'>(null)
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [hud, setHud] = useState({
    depth: 0,
    zone: ZONES[0].label,
    target: '',
    guarded: false,
    far: false,
    floating: false,
  })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  // One dive's worth of sea. None of it is saved: a dive is a sitting.
  if (!worldRef.current) {
    const cam: Camera = { x: 240, y: SURFACE_Y + 90, z: WORLD.depth / 2, yaw: Math.PI / 2, pitch: 0.1 }
    worldRef.current = {
      fish: populate(cam),
      cam,
      motes: makeMotes(cam),
      t: 0,
      keys: new Set(),
      stick: { on: false, ox: 0, oy: 0, x: 0, y: 0 },
      hover: { on: false, x: 0, y: 0 },
      floating: false,
      wasDeep: true,
      driftX: 0,
      driftY: 0,
      driftZ: 0,
      deepest: save.deepest ?? 0,
    }
  }

  useEffect(() => {
    setSave((s) => ({ ...s, dives: (s.dives ?? 0) + 1 }))
    return () => {
      const w = worldRef.current
      if (w && w.deepest > (saveRef.current.deepest ?? 0)) {
        const reached = w.deepest
        setSave((s) => ({ ...s, deepest: Math.max(s.deepest ?? 0, reached) }))
      }
      window.clearTimeout(toastTimer.current)
    }
    // Arrival and departure only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Whatever is under a point on the glass. Returns the fish even when it
   * is out of range, so the game can say "too far" rather than nothing -
   * being told your spear is short is how you learn to want a longer one.
   */
  const pickAt = useCallback((w: World, sx: number, sy: number): { fish: Fish; dist: number } | null => {
    let best: Fish | null = null
    let bestOff = Infinity
    let bestDist = 0
    for (const f of w.fish) {
      const p = project(w.cam, f.x, f.y, f.z)
      if (!p) continue
      const span = f.sp.length * p.scale
      const off = Math.hypot(p.sx - sx, p.sy - sy)
      // A distant sardine is a few pixels across, so the clickable target
      // has to be much bigger than the fish itself or it cannot be hit.
      if (off > Math.max(38, span * 0.8)) continue
      if (off < bestOff) {
        best = f
        bestOff = off
        bestDist = Math.hypot(f.x - w.cam.x, f.y - w.cam.y, f.z - w.cam.z)
      }
    }
    return best ? { fish: best, dist: bestDist } : null
  }, [])

  /** What the pointer is currently over, for the ring and the readout. */
  const aimAt = useCallback(
    (w: World): Fish | null => {
      if (!w.hover.on) return null
      return pickAt(w, w.hover.x, w.hover.y)?.fish ?? null
    },
    [pickAt]
  )

  /** Leave the surface. The only way back under. */
  const dive = useCallback(() => {
    const w = worldRef.current
    if (!w?.floating) return
    w.floating = false
    w.wasDeep = false
    // Tip your head down and push off, so the dive actually takes.
    w.cam.pitch = Math.max(w.cam.pitch, 0.5)
    w.driftY = 150
  }, [])

  const spear = useCallback(
    (sx: number, sy: number) => {
    const w = worldRef.current
    if (!w) return
    const hit = pickAt(w, sx, sy)
    if (!hit) return
    const target = hit.fish
    if (hit.dist > gearValue(saveRef.current, 'spear')) {
      showToast(`${target.sp.label} is out of reach — get closer.`)
      return
    }
    if (target.sp.guarded) {
      showToast(`${target.sp.label} is protected — logged, never speared.`)
      target.panic = 1.2
      return
    }

    const sp = target.sp
    w.fish = w.fish.filter((f) => f !== target)
    w.fish.push(makeFish(sp, spawnAhead(sp, w.cam, 900) ?? spawnPoint(sp)))
    const reach = gearValue(saveRef.current, 'spear')
    for (const f of w.fish) {
      if (Math.hypot(f.x - w.cam.x, f.y - w.cam.y, f.z - w.cam.z) < reach * 3) f.panic = 1.5
    }

    setSave((prev) => ({
      ...prev,
      pearls: (prev.pearls ?? 0) + sp.pearls,
      caught: { ...prev.caught, [sp.key]: (prev.caught?.[sp.key] ?? 0) + 1 },
    }))
    showToast(`${sp.label} landed · +${sp.pearls} pearls`)
    },
    [pickAt, setSave, showToast]
  )

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
        if (w.floating) dive()
        else spear(VIEW.width / 2, VIEW.height / 2)
        return
      }
      if (e.key.startsWith('Arrow')) e.preventDefault()
      w.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    const up = (e: KeyboardEvent) => {
      worldRef.current?.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    const blur = () => {
      const w = worldRef.current
      if (!w) return
      w.keys.clear()
      w.stick.on = false
    }
    /*
     * Let go anywhere and you stop swimming.
     *
     * The stage's own pointerup is not enough: open the game by tapping
     * its tile and the release can land somewhere else entirely, leaving
     * the stick held down and you swimming forward on your own until you
     * hit the surface. Watching the window catches every release.
     */
    const release = () => {
      const w = worldRef.current
      if (w) w.stick.on = false
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
  }, [dive, onExit, spear])

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

    if (!skyRef.current) {
      const layer = document.createElement('canvas')
      layer.width = VIEW.width
      layer.height = VIEW.height
      skyRef.current = layer
    }

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
      render(w, dt)

      if (now - hudAt > 110) {
        hudAt = now
        const target = aimAt(w)
        const reach = gearValue(saveRef.current, 'spear')
        const up = w.cam.y < SURFACE_Y + 6
        setHud({
          floating: up,
          depth: depthMetres(w.cam.y),
          zone: up ? 'Floating' : zoneAt(w.cam.y).label,
          target: target ? target.sp.label : '',
          guarded: !!target?.sp.guarded,
          far: target
            ? Math.hypot(target.x - w.cam.x, target.y - w.cam.y, target.z - w.cam.z) > reach
            : false,
        })
      }
    }

    function step(w: World, dt: number) {
      const s = saveRef.current
      const maxSpeed = gearValue(s, 'fins')
      const cam = w.cam
      const k = w.keys

      // --- looking --------------------------------------------------
      let turn = 0
      let pitch = 0
      let thrust = 0
      if (k.has('a') || k.has('ArrowLeft')) turn -= 1
      if (k.has('d') || k.has('ArrowRight')) turn += 1
      if (k.has('ArrowUp')) pitch -= 1
      if (k.has('ArrowDown')) pitch += 1
      if (k.has('w')) thrust += 1
      if (k.has('s')) thrust -= 1

      if (w.stick.on) {
        // The press point is the centre; how far you have dragged from it
        // is how hard you are turning. Holding at all swims you forward.
        const dx = w.stick.x - w.stick.ox
        const dy = w.stick.y - w.stick.oy
        const dead = 14
        if (Math.abs(dx) > dead) turn += Math.max(-1, Math.min(1, (dx - Math.sign(dx) * dead) / 150))
        if (Math.abs(dy) > dead) pitch += Math.max(-1, Math.min(1, (dy - Math.sign(dy) * dead) / 110))
        thrust += 1
      }

      cam.yaw += turn * TURN_RATE * dt
      cam.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, cam.pitch + pitch * PITCH_RATE * dt))

      // --- swimming -------------------------------------------------
      const f = forwardOf(cam)
      const prev = { x: cam.x, y: cam.y, z: cam.z }
      const speed = maxSpeed * Math.max(-0.5, Math.min(1, thrust))
      const ease = Math.min(1, dt * 2.6)
      w.driftX += (f.x * speed - w.driftX) * ease
      w.driftY += (f.y * speed - w.driftY) * ease
      w.driftZ += (f.z * speed - w.driftZ) * ease

      cam.x += w.driftX * dt
      cam.y += w.driftY * dt
      cam.z += w.driftZ * dt

      cam.x = Math.min(WORLD.width - 30, Math.max(30, cam.x))
      cam.z = Math.min(WORLD.depth - 30, Math.max(30, cam.z))
      const bed = floorHeightAt(cam.x) - 20
      if (cam.y > bed) cam.y = bed
      /*
       * The surface holds you up.
       *
       * Break through and you stay there - bobbing, free to swim about on
       * top for as long as you like. Nothing pulls you under by accident;
       * going back down is a button press and nothing else.
       */
      if (cam.y > SURFACE_Y + 25) w.wasDeep = true
      if (!w.floating && w.wasDeep && cam.y <= SURFACE_Y) w.floating = true

      if (w.floating) {
        const bob = Math.sin(w.t * 0.0022) * 3
        cam.y += (FLOAT_Y + bob - cam.y) * Math.min(1, dt * 6)
        w.driftY = 0
      } else if (cam.y < FLOAT_Y) {
        // You cannot leave the water altogether.
        cam.y = FLOAT_Y
        w.driftY = Math.max(0, w.driftY)
      }

      const camSpeed = Math.hypot(cam.x - prev.x, cam.y - prev.y, cam.z - prev.z) / Math.max(dt, 1e-4)

      const metres = depthMetres(cam.y)
      if (metres > w.deepest) w.deepest = metres

      // --- sea life -------------------------------------------------
      const viewDist = gearValue(s, 'mask') * (1 - gloomAt(cam.y) * 0.3)
      for (const fish of w.fish) {
        stepFish(fish, dt, w.t, cam, maxSpeed, camSpeed)
        // Anything that has wandered out of sight is brought back around
        // to the edge of your vision. The sea stays populated wherever
        // you swim without carrying thousands of fish - and because the
        // depth band still has to hold, a species only ever reappears in
        // water it actually lives in.
        const far = Math.hypot(fish.x - cam.x, fish.y - cam.y, fish.z - cam.z)
        if (far > viewDist * 1.5) {
          const at = spawnAhead(fish.sp, cam, viewDist * 0.85)
          if (at) {
            fish.x = at.x
            fish.y = at.y
            fish.z = at.z
            fish.panic = 0
          }
        }
      }

      // --- discoveries ----------------------------------------------
      const idRange = identifyRange(s)
      const lamp = gearValue(s, 'lamp')
      for (const fish of w.fish) {
        if (s.seen.includes(fish.sp.key)) continue
        const dist = Math.hypot(fish.x - cam.x, fish.y - cam.y, fish.z - cam.z)
        if (dist > idRange) continue
        // You have to be looking at it, and be able to see it.
        if (!project(cam, fish.x, fish.y, fish.z)) continue
        const lit = fish.sp.glow || dist < lamp || gloomAt(fish.y) < 0.45
        if (!lit) continue
        const sp = fish.sp
        setSave((p) =>
          p.seen.includes(sp.key)
            ? p
            : { ...p, seen: [...p.seen, sp.key], pearls: (p.pearls ?? 0) + sp.bounty }
        )
        showToast(`Logbook: ${sp.label} · +${sp.bounty} pearls`)
        break
      }

      for (const lm of LANDMARKS) {
        if (s.found.includes(lm.key)) continue
        if (Math.hypot(lm.x - cam.x, lm.y - cam.y, lm.z - cam.z) > lm.radius) continue
        setSave((p) =>
          p.found.includes(lm.key)
            ? p
            : { ...p, found: [...p.found, lm.key], pearls: (p.pearls ?? 0) + lm.pearls }
        )
        showToast(`Found: ${lm.label} · +${lm.pearls} pearls`)
        break
      }
    }

    function render(w: World, dt: number) {
      const s = saveRef.current
      const cam = w.cam
      const viewDist = gearValue(s, 'mask') * (1 - gloomAt(cam.y) * 0.3)

      drawBackdrop(ctx!, cam)
      drawSurface(ctx!, cam, viewDist, w.t, false)
      drawSeabed(ctx!, cam, viewDist, w.t)

      // Everything solid, painted far to near so near things overlap.
      type Item =
        | { kind: 'fish'; p: Projected; a: number; f: Fish }
        | { kind: 'mark'; p: Projected; a: number; lm: (typeof LANDMARKS)[number] }
      const items: Item[] = []

      for (const lm of LANDMARKS) {
        const p = project(cam, lm.x, lm.y, lm.z)
        if (!p) continue
        const a = clarity(p.depth, viewDist * 1.35)
        if (a <= 0.02) continue
        items.push({ kind: 'mark', p, a, lm })
      }
      for (const f of w.fish) {
        const p = project(cam, f.x, f.y, f.z)
        if (!p) continue
        const a = clarity(p.depth, viewDist)
        if (a <= 0.02) continue
        const span = f.sp.length * p.scale
        if (p.sx < -span || p.sx > VIEW.width + span || p.sy < -span || p.sy > VIEW.height + span) continue
        items.push({ kind: 'fish', p, a, f })
      }
      items.sort((m, n) => n.p.depth - m.p.depth)

      for (const item of items) {
        if (item.kind === 'mark') {
          drawLandmark(ctx!, item.lm, item.p, w.t, item.a)
        } else {
          const f = item.f
          // How side-on it is to you: broadside draws full width, coming
          // straight at you draws almost none.
          const heading = Math.atan2(f.vx, f.vz)
          const across = Math.sin(heading - cam.yaw)
          const climb = Math.atan2(f.vy, Math.hypot(f.vx, f.vz))
          drawCreature(
            ctx!,
            f.sp,
            item.p,
            across >= 0 ? 1 : -1,
            across,
            Math.max(-0.6, Math.min(0.6, climb)),
            w.t,
            f.seed,
            item.a
          )
        }
      }

      drawMotes(ctx!, cam, w.motes, sheetRef.current === null ? dt : 0)
      drawDarkness(ctx!, cam, gearValue(s, 'lamp'))

      // Lights of their own, painted after the dark so they show through.
      for (const item of items) {
        if (item.kind !== 'fish' || !item.f.sp.glow) continue
        drawGlow(
          ctx!,
          item.p.sx,
          item.p.sy,
          item.f.sp.length * item.p.scale * 1.6,
          item.f.sp.glow,
          gloomAt(item.f.y) * item.a
        )
      }

      // Coming up for air: the sky and the sea from above fade in over the
      // last stretch, so surfacing is a rise rather than a jump cut.
      // Fully above water by the time you are floating, or the underwater
      // view bleeds through and washes the sea out.
      const mix = Math.max(0, Math.min(1, (SURFACE_Y + 14 - cam.y) / 34))
      if (mix > 0) {
        const layer = skyRef.current!
        const lctx = layer.getContext('2d')!
        lctx.clearRect(0, 0, VIEW.width, VIEW.height)
        drawSky(lctx, cam, w.t)
        drawSurface(lctx, cam, viewDist, w.t, true)
        ctx!.save()
        ctx!.globalAlpha = mix
        ctx!.drawImage(layer, 0, 0)
        ctx!.restore()
      }

      if (mix < 0.9) drawCrosshair(ctx!, w)
    }

    function drawCrosshair(ctx: CanvasRenderingContext2D, w: World) {
      const target = aimAt(w)
      const cx = VIEW.width / 2
      const cy = VIEW.height / 2

      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1.5
      for (const [a, b] of [
        [-11, -4],
        [4, 11],
      ]) {
        ctx.beginPath()
        ctx.moveTo(cx + a, cy)
        ctx.lineTo(cx + b, cy)
        ctx.moveTo(cx, cy + a)
        ctx.lineTo(cx, cy + b)
        ctx.stroke()
      }

      if (target) {
        const p = project(w.cam, target.x, target.y, target.z)
        if (p) {
          ctx.strokeStyle = target.sp.guarded ? '#7fe0c2' : '#ffd76a'
          ctx.setLineDash(target.sp.guarded ? [5, 5] : [])
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(p.sx, p.sy, Math.max(16, target.sp.length * p.scale * 0.7), 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [aimAt, setSave, showToast])

  /* ---------------------------------------------------------------- */
  /* Chrome                                                            */
  /* ---------------------------------------------------------------- */

  function buy(key: GearKey) {
    const list = GEAR[key].list
    const owned = saveRef.current[key] ?? 0
    const next = list[owned + 1]
    if (!next) return
    if ((saveRef.current.pearls ?? 0) < next.cost) {
      showToast('Not enough pearls yet.')
      return
    }
    setSave((s) => ({ ...s, pearls: s.pearls - next.cost, [key]: owned + 1 }))
    showToast(`Fitted: ${next.label}`)
  }

  return (
    <div style={S.wrap}>
      <div
        style={S.stage}
        onPointerDown={(e) => {
          if (sheet) return
          // Capturing the pointer retargets the whole gesture to the
          // canvas, which swallows the click the buttons are waiting for.
          // Anything starting on a control is that control's business.
          if ((e.target as HTMLElement).closest('button')) return
          ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
          const p = toCanvas(e.clientX, e.clientY)
          press.current = { x: p.x, y: p.y, at: performance.now(), moved: 0 }
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
          const pr = press.current
          if (pr) pr.moved = Math.max(pr.moved, Math.hypot(p.x - pr.x, p.y - pr.y))
        }}
        onPointerUp={() => {
          const w = worldRef.current
          if (w) w.stick.on = false
          // A click that did not turn into a drag is a thrown spear.
          const pr = press.current
          press.current = null
          if (!pr || sheet) return
          if (pr.moved > 9 || performance.now() - pr.at > 400) return
          spear(pr.x, pr.y)
        }}
        onPointerLeave={() => {
          const w = worldRef.current
          if (!w) return
          w.hover.on = false
          w.stick.on = false
        }}
        onPointerCancel={() => {
          const w = worldRef.current
          if (w) w.stick.on = false
          press.current = null
        }}
      >
        <canvas ref={canvasRef} width={VIEW.width} height={VIEW.height} style={S.canvas} />

        <div style={S.topBar}>
          <div style={S.readout}>
            <span style={S.zone}>{hud.zone}</span>
            <span style={S.depth}>{hud.depth} m</span>
          </div>
          <span style={S.hint}>
            {hud.floating
              ? 'floating · press Dive to go back under'
              : 'drag to swim · click a fish to spear it'}
          </span>
          <span style={S.pearls}>◍ {save.pearls ?? 0}</span>
        </div>

        <div style={S.bottomBar}>
          {hud.floating && (
            <button style={S.diveBtn} onClick={dive}>
              Dive
            </button>
          )}
          <button style={S.ghost} onClick={() => setSheet(sheet === 'log' ? null : 'log')}>
            Logbook
          </button>
          <button style={S.ghost} onClick={() => setSheet(sheet === 'gear' ? null : 'gear')}>
            Gear
          </button>
          <button style={S.ghost} onClick={onExit}>
            Leave
          </button>
        </div>

        {hud.target && (
          <div style={{ ...S.aimTag, color: hud.guarded ? '#7fe0c2' : '#ffd76a' }}>
            {hud.guarded
              ? `${hud.target} · protected`
              : hud.far
                ? `${hud.target} · too far`
                : `${hud.target} · click to spear`}
          </div>
        )}

        {toast && <div style={S.toast}>{toast}</div>}

        {sheet === 'log' && (
          <Sheet title="Logbook" onClose={() => setSheet(null)}>
            <p style={S.sheetHint}>
              Get close enough to make something out and it goes in the book. Every first
              sighting pays, whether or not you ever spear a thing.
            </p>
            <div style={S.tally}>
              <Tally label="Species" value={`${save.seen.length} / ${SPECIES.length}`} />
              <Tally label="Places" value={`${save.found.length} / ${LANDMARKS.length}`} />
              <Tally label="Deepest" value={`${Math.max(save.deepest ?? 0, hud.depth)} m`} />
              <Tally label="Dives" value={String(save.dives ?? 0)} />
            </div>

            {ZONES.map((z) => {
              const list = SPECIES.filter((sp) => homeZone(sp).key === z.key)
              if (!list.length) return null
              return (
                <div key={z.key}>
                  <div style={S.sectionLabel}>{z.label}</div>
                  {list.map((sp) => {
                    const seen = save.seen.includes(sp.key)
                    const got = save.caught?.[sp.key] ?? 0
                    return (
                      <div key={sp.key} style={S.logRow}>
                        <span style={{ ...S.swatch, background: seen ? sp.body : '#3d4753' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={S.logName}>
                            {seen ? sp.label : 'Not yet seen'}
                            {sp.guarded && seen && <span style={S.guard}>protected</span>}
                          </div>
                          <div style={S.logNote}>
                            {seen ? sp.note : `Somewhere in the ${z.label.toLowerCase()}.`}
                          </div>
                        </div>
                        <span style={S.logCount}>
                          {sp.guarded ? '—' : got > 0 ? `${got} landed` : seen ? '0 landed' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            <div style={S.sectionLabel}>Places</div>
            {LANDMARKS.map((lm) => {
              const found = save.found.includes(lm.key)
              return (
                <div key={lm.key} style={S.logRow}>
                  <span style={{ ...S.swatch, background: found ? '#c2a03a' : '#3d4753' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.logName}>{found ? lm.label : 'Uncharted'}</div>
                    <div style={S.logNote}>
                      {found ? lm.note : `Around ${depthMetres(lm.y)} m down, somewhere out there.`}
                    </div>
                  </div>
                  <span style={S.logCount}>{found ? `+${lm.pearls}` : ''}</span>
                </div>
              )
            })}
          </Sheet>
        )}

        {sheet === 'gear' && (
          <Sheet title="Gear" onClose={() => setSheet(null)}>
            <p style={S.sheetHint}>
              Pearls stay in this game — nothing here is shared with the homestead.
            </p>
            {(Object.keys(GEAR) as GearKey[]).map((key) => {
              const { list, label } = GEAR[key]
              const owned = save[key] ?? 0
              const next = list[owned + 1]
              const canAfford = next && (save.pearls ?? 0) >= next.cost
              return (
                <div key={key} style={S.gearRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.sectionLabel}>{label}</div>
                    <div style={S.logName}>{list[owned].label}</div>
                    <div style={S.logNote}>
                      {next ? next.blurb : 'The best there is. Nothing left to fit.'}
                    </div>
                  </div>
                  {next ? (
                    <button
                      style={{ ...S.buy, opacity: canAfford ? 1 : 0.45 }}
                      onClick={() => buy(key)}
                    >
                      {next.label}
                      <span style={S.buyCost}>◍ {next.cost}</span>
                    </button>
                  ) : (
                    <span style={S.maxed}>maxed</span>
                  )}
                </div>
              )
            })}
          </Sheet>
        )}
      </div>
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
        <button style={S.close} onClick={onClose}>
          Back to the water
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
    background: 'linear-gradient(rgba(4,14,26,0.55), rgba(4,14,26,0))',
    color: '#eaf4fa',
    pointerEvents: 'none',
  },
  readout: { display: 'flex', flexDirection: 'column', lineHeight: 1.15 },
  zone: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.8 },
  depth: { fontSize: 19, fontWeight: 700 },
  hint: { fontSize: 11, opacity: 0.6, letterSpacing: 0.3 },
  pearls: { fontSize: 16, fontWeight: 700, color: '#ffe6a8' },

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
    background: 'linear-gradient(rgba(4,14,26,0), rgba(4,14,26,0.72))',
  },
  spearBtn: {
    flex: '0 1 260px',
    padding: '11px 16px',
    border: 'none',
    borderRadius: 22,
    color: '#2b2415',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  diveBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: 20,
    background: '#ffd76a',
    color: '#2b2415',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghost: {
    padding: '10px 13px',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 20,
    background: 'rgba(6,20,34,0.55)',
    color: '#eaf4fa',
    fontSize: 12.5,
    cursor: 'pointer',
  },

  aimTag: {
    position: 'absolute',
    bottom: 62,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(6,20,34,0.82)',
    fontSize: 12.5,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: 13,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  toast: {
    position: 'absolute',
    bottom: 92,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(6,20,34,0.9)',
    color: '#eaf4fa',
    fontSize: 13,
    padding: '6px 14px',
    borderRadius: 14,
    pointerEvents: 'none',
    maxWidth: '80%',
    textAlign: 'center',
  },

  sheet: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(6,18,30,0.94)',
    display: 'flex',
    flexDirection: 'column',
    color: '#eaf4fa',
  },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.14)',
  },
  sheetTitle: { margin: 0, fontSize: 18 },
  close: {
    padding: '7px 12px',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 16,
    background: 'transparent',
    color: '#eaf4fa',
    fontSize: 12.5,
    cursor: 'pointer',
  },
  sheetBody: { flex: 1, overflowY: 'auto', padding: '4px 16px 18px' },
  sheetHint: { fontSize: 12.5, color: '#a8c2d2', margin: '10px 0' },

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

  sectionLabel: {
    marginTop: 12,
    marginBottom: 5,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8fb0c4',
    fontWeight: 700,
  },
  logRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 9px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 4,
  },
  swatch: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  logName: { fontSize: 13.5, fontWeight: 600 },
  logNote: { fontSize: 11.5, color: '#9fbccd' },
  logCount: { fontSize: 11.5, color: '#c2d6e2', whiteSpace: 'nowrap' },
  guard: {
    marginLeft: 7,
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#7fe0c2',
    border: '1px solid rgba(127,224,194,0.5)',
    borderRadius: 8,
    padding: '0 5px',
  },

  gearRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 9,
    marginBottom: 6,
  },
  buy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 10,
    background: '#ffd76a',
    color: '#2b2415',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  buyCost: { fontSize: 11, fontWeight: 700, opacity: 0.75 },
  maxed: { fontSize: 11.5, color: '#8fb0c4', textTransform: 'uppercase', letterSpacing: 0.6 },
}
