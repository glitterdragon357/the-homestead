import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { clarity, forwardOf, type Camera } from '../../engine/firstPerson'
import { drawBuilding, drawFixture, drawGround, drawSky, project } from './cityDraw'
import { InteriorScene } from './CityArt'
import {
  CEILING,
  FIXTURE_COIN,
  FIXTURE_DOING,
  FIXTURE_LABEL,
  GEAR,
  GROUND,
  INTERIORS,
  INTERIOR_BY_KEY,
  DOOR_REACH,
  REACH,
  VIEW,
  WORLD,
  buildingsAround,
  canEnter,
  fixturesAround,
  gearValue,
  heightOf,
  initialCity,
  insideBuilding,
  sightRange,
  type Building,
  type CitySave,
  type Fixture,
  type GearKey,
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
  t: number
  keys: Set<string>
  stick: { on: boolean; ox: number; oy: number; x: number; y: number }
  highest: number
}

const TURN_RATE = 1.7
const PITCH_RATE = 1.4
const PITCH_LIMIT = 1.15

export function CityMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<CitySave>('city', initialCity)
  const { coins, earn, spend } = usePurse('city')
  const saveRef = useRef(save)
  saveRef.current = save

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<World | null>(null)
  const pressRef = useRef<{ x: number; y: number; at: number; moved: number } | null>(null)

  const [sheet, setSheet] = useState<null | 'journal' | 'gear'>(null)
  const [inside, setInside] = useState<string | null>(null)
  const sheetRef = useRef<string | null>(null)
  sheetRef.current = sheet ?? inside

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [hud, setHud] = useState({
    height: 0,
    speed: 0,
    fixture: null as null | { key: string; kind: Fixture['kind']; used: boolean },
    door: null as null | { key: string; interior: string; locked: boolean },
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
        y: GROUND - 300,
        z: WORLD.depth / 2,
        yaw: Math.PI / 4,
        pitch: 0.12,
      },
      speed: 0,
      t: 0,
      keys: new Set(),
      stick: { on: false, ox: 0, oy: 0, x: 0, y: 0 },
      highest: save.highest ?? 0,
    }
  }

  useEffect(() => {
    setSave((s) => ({ ...s, flights: (s.flights ?? 0) + 1 }))
    return () => {
      const w = worldRef.current
      if (w) {
        const top = w.highest
        setSave((s) => ({ ...s, highest: Math.max(s.highest ?? 0, top) }))
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

  const useFixture = useCallback(() => {
    const w = worldRef.current
    if (!w) return
    const f = nearestFixture(w)
    if (!f) return
    if ((saveRef.current.used ?? []).includes(f.key)) {
      showToast(`You have already had a go on ${FIXTURE_LABEL[f.kind]}.`)
      return
    }
    const pay = FIXTURE_COIN[f.kind]
    earn(pay)
    setSave((s) => ({
      ...s,
      used: [...(s.used ?? []), f.key],
      kinds: s.kinds?.includes(f.kind) ? s.kinds : [...(s.kinds ?? []), f.kind],
    }))
    showToast(`${FIXTURE_DOING[f.kind]} · ${pay} 🪙`)
  }, [earn, nearestFixture, setSave, showToast])

  const goInside = useCallback(() => {
    const w = worldRef.current
    if (!w) return
    const b = nearestDoor(w)
    if (!b?.interior) return
    const place = INTERIOR_BY_KEY[b.interior]
    if (!canEnter(saveRef.current, place)) {
      showToast(`${place.label} wants a pass you have not got.`)
      return
    }
    const first = !(saveRef.current.visited ?? []).includes(place.key)
    if (first) earn(place.coins)
    setSave((s) => ({
      ...s,
      visited: s.visited?.includes(place.key) ? s.visited : [...(s.visited ?? []), place.key],
    }))
    setInside(place.key)
    if (first) showToast(`First time inside ${place.label} · ${place.coins} 🪙`)
  }, [earn, nearestDoor, setSave, showToast])

  function doThing(placeKey: string, doingKey: string) {
    const place = INTERIOR_BY_KEY[placeKey]
    const doing = place?.doings.find((d) => d.key === doingKey)
    if (!doing) return
    const id = `${placeKey}:${doingKey}`
    if ((save.done ?? []).includes(id)) {
      showToast('You have done that already.')
      return
    }
    earn(doing.coins)
    setSave((s) => ({ ...s, done: [...(s.done ?? []), id] }))
    showToast(`${doing.note} · ${doing.coins} 🪙`)
  }

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const w = worldRef.current
      if (!w) return
      if (e.key === 'Escape') {
        if (inside) setInside(null)
        else if (sheet) setSheet(null)
        else onExit()
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (sheetRef.current) return
        if (nearestDoor(w)) goInside()
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
  }, [goInside, inside, nearestDoor, onExit, sheet, useFixture])

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
        const f = nearestFixture(w)
        const b = nearestDoor(w)
        const place = b?.interior ? INTERIOR_BY_KEY[b.interior] : null
        setHud({
          height: heightOf(w.cam.y),
          speed: w.speed,
          fixture: f
            ? { key: f.key, kind: f.kind, used: (saveRef.current.used ?? []).includes(f.key) }
            : null,
          door: place
            ? {
                key: b!.key,
                interior: place.key,
                locked: !canEnter(saveRef.current, place),
              }
            : null,
        })
      }
    }

    function step(w: World, dt: number) {
      const s = saveRef.current
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

      // You fly where you are looking, so up is a direction like any other.
      const top = gearValue(s, 'wings')
      w.speed += (Math.max(-0.6, Math.min(1, pace)) * top - w.speed) * Math.min(1, dt * 2.6)
      const f = forwardOf(cam)
      const wasX = cam.x
      const wasZ = cam.z
      cam.x += f.x * w.speed * dt
      cam.y += f.y * w.speed * dt
      cam.z += f.z * w.speed * dt

      cam.x = Math.min(WORLD.width - 40, Math.max(40, cam.x))
      cam.z = Math.min(WORLD.depth - 40, Math.max(40, cam.z))
      cam.y = Math.max(CEILING, Math.min(GROUND - 18, cam.y))

      /*
       * The city is solid. If you have ended up inside a wall, back out
       * along whichever axis you are least far through - that slides you
       * along the face rather than stopping you dead against it.
       */
      for (const b of buildingsAround(cam.x, cam.z, 400)) {
        if (!insideBuilding(b, cam.x, cam.y, cam.z)) continue
        const overX = b.hw + 14 - Math.abs(cam.x - b.x)
        const overZ = b.hd + 14 - Math.abs(cam.z - b.z)
        const overY = cam.y - (GROUND - b.height)
        if (overY < 0) continue
        if (overY < Math.min(overX, overZ) * 0.6) {
          cam.y = GROUND - b.height - 6
        } else if (overX < overZ) {
          cam.x = b.x + Math.sign(cam.x - b.x || 1) * (b.hw + 15)
        } else {
          cam.z = b.z + Math.sign(cam.z - b.z || 1) * (b.hd + 15)
        }
        void wasX
        void wasZ
      }

      const up = heightOf(cam.y)
      if (up > w.highest) w.highest = up
    }

    function render(w: World) {
      const s = saveRef.current
      const cam = w.cam
      const sight = sightRange(s)

      drawSky(ctx!, cam, w.t)
      drawGround(ctx!, cam, sight)

      // Buildings, far ones first so near ones cover them.
      const near = buildingsAround(cam.x, cam.z, sight)
      near.sort(
        (a, b) =>
          Math.hypot(b.x - cam.x, b.z - cam.z) - Math.hypot(a.x - cam.x, a.z - cam.z)
      )
      for (const b of near) drawBuilding(ctx!, b, cam, sight, true)

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
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [nearestDoor, nearestFixture])

  /* ---------------------------------------------------------------- */
  /* Chrome                                                            */
  /* ---------------------------------------------------------------- */

  function buy(key: GearKey) {
    const list = GEAR[key].list
    const owned = saveRef.current[key] ?? 0
    const next = list[owned + 1]
    if (!next) return
    if (!spend(next.cost)) {
      showToast('Not enough yet.')
      return
    }
    setSave((s) => ({ ...s, [key]: owned + 1 }))
    showToast(`Bought: ${next.label}`)
  }

  const place = inside ? INTERIOR_BY_KEY[inside] : null

  return (
    <div style={S.wrap}>
      <div
        style={S.stage}
        onPointerDown={(e) => {
          if (sheet || inside) return
          if ((e.target as HTMLElement).closest('button')) return
          ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
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
            <span style={S.label}>Height</span>
            <span style={S.big}>{hud.height} m</span>
          </div>
          <span style={S.hint}>hold to fly · look where you want to go</span>
          <span style={S.coins}>🪙 {coins}</span>
        </div>

        {toast && <div style={S.toast}>{toast}</div>}

        <div style={S.bottomBar}>
          {hud.door && (
            <button
              style={{ ...S.act, opacity: hud.door.locked ? 0.55 : 1 }}
              onClick={goInside}
            >
              {hud.door.locked
                ? `${INTERIOR_BY_KEY[hud.door.interior].label} · locked`
                : `Go inside ${INTERIOR_BY_KEY[hud.door.interior].label}`}
            </button>
          )}
          {!hud.door && hud.fixture && (
            <button style={{ ...S.act, opacity: hud.fixture.used ? 0.55 : 1 }} onClick={useFixture}>
              {hud.fixture.used
                ? `${FIXTURE_LABEL[hud.fixture.kind]} · done`
                : `Have a go on ${FIXTURE_LABEL[hud.fixture.kind]}`}
            </button>
          )}
          <button style={S.ghost} onClick={() => setSheet(sheet === 'journal' ? null : 'journal')}>
            Journal
          </button>
          <button style={S.ghost} onClick={() => setSheet(sheet === 'gear' ? null : 'gear')}>
            Kit
          </button>
          <button style={S.ghost} onClick={onExit}>
            Leave
          </button>
        </div>

        {place && (
          <Sheet title={place.label} onClose={() => setInside(null)} back="Back out to the street">
            <InteriorScene which={place.key} />
            <p style={S.blurb}>{place.blurb}</p>
            {place.doings.map((d) => {
              const done = (save.done ?? []).includes(`${place.key}:${d.key}`)
              return (
                <div key={d.key} style={{ ...S.row, ...(done ? S.rowDone : null) }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.rowName}>{d.label}</div>
                    <div style={S.rowNote}>{done ? d.note : `worth ${d.coins} 🪙`}</div>
                  </div>
                  {done ? (
                    <span style={S.tick}>✓</span>
                  ) : (
                    <button style={S.small} onClick={() => doThing(place.key, d.key)}>
                      Do it
                    </button>
                  )}
                </div>
              )
            })}
          </Sheet>
        )}

        {sheet === 'journal' && (
          <Sheet title="Journal" onClose={() => setSheet(null)} back="Back to the city">
            <div style={S.tally}>
              <Tally label="Places" value={`${(save.visited ?? []).length} / ${INTERIORS.length}`} />
              <Tally label="Things tried" value={String((save.kinds ?? []).length)} />
              <Tally label="Highest" value={`${Math.max(save.highest ?? 0, hud.height)} m`} />
              <Tally label="Flights" value={String(save.flights ?? 0)} />
            </div>
            <div style={S.section}>Places in the city</div>
            {INTERIORS.map((i) => {
              const been = (save.visited ?? []).includes(i.key)
              const doneCount = i.doings.filter((d) => (save.done ?? []).includes(`${i.key}:${d.key}`)).length
              return (
                <div key={i.key} style={S.row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.rowName}>{been ? i.label : 'Somewhere you have not been'}</div>
                    <div style={S.rowNote}>
                      {been
                        ? `${doneCount} of ${i.doings.length} things done`
                        : i.pass > 0
                          ? 'Needs a pass'
                          : 'Open to anyone'}
                    </div>
                  </div>
                  <span style={S.rowNote}>{been ? `${doneCount}/${i.doings.length}` : '—'}</span>
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

        {sheet === 'gear' && (
          <Sheet title="Kit" onClose={() => setSheet(null)} back="Back to the city">
            <p style={S.blurb}>
              Everything out here pays the first time you do it: a go on the swings, a door you
              have not been through before. A pass is what gets you into the places that are
              choosy.
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
                    <div style={S.rowNote}>{next ? next.blurb : 'Nothing better going.'}</div>
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
            <GiftRow from="city" />
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
