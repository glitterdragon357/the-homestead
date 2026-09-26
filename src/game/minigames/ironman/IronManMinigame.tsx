import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { useAmbientMusic } from '../../audio/useAmbientMusic'
import { drawBolt, drawCity, drawReticle, drawSky, drawSuit, drawThing, type Thing } from './ironDraw'
import { finish as finishFrame } from '../../engine/polish'
import {
  CEILING,
  CRUISE,
  FLOOR_Y,
  GLIDE_CHARGE,
  GRAVITY,
  MISSIONS,
  SYSTEMS,
  THINGS,
  THRUST_DRAIN,
  STEER,
  REPULSOR_COOLDOWN,
  reachOf,
  UNIBEAM_COOLDOWN,
  UNIBEAM_COST,
  UNIBEAM_DAMAGE,
  VIEW,
  initialIron,
  markOf,
  payout,
  statOf,
  type IronSave,
  type Mission,
  type SystemKey,
  type ThingKind,
} from './ironData'

/**
 * Iron Man Life.
 *
 * Downstairs you build the suit; upstairs you find out what it can take.
 * One pointer does both jobs: the suit flies to wherever you are pointing,
 * and clicking fires the repulsors at what is under the cursor. Nothing
 * aims itself, so a mission is something you fly rather than watch. The
 * reactor is what you manage - climbing burns it down, levelling out puts
 * it back, and the unibeam costs a good chunk of whatever is left.
 */

const SUIT_X = 250

interface Run {
  mission: Mission
  y: number
  vy: number
  power: number
  integrity: number
  distance: number
  scroll: number
  things: Thing[]
  bolts: { x: number; y: number; big: boolean; until: number }[]
  saved: number
  downed: number
  nextSpawn: number
  nextShot: number
  unibeamAt: number
  hurtUntil: number
  /** Where the pointer is. Null means it has left the stage, so you fall. */
  aimX: number
  aimY: number | null
  thrusting: boolean
  over: null | 'done' | 'downed'
  t: number
}

export function IronManMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<IronSave>('ironman', initialIron)
  const { coins, earn, spend } = usePurse('ironman')
  const saveRef = useRef(save)
  saveRef.current = save

  const music = save.music !== false
  useAmbientMusic(music, 0.055)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const runRef = useRef<Run | null>(null)
  const [flying, setFlying] = useState(false)
  const flyingRef = useRef(false)
  flyingRef.current = flying

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [hud, setHud] = useState({ power: 1, integrity: 1, gone: 0, saved: 0, downed: 0, beam: 0 })
  const [result, setResult] = useState<null | { pay: number; reached: boolean; saved: number; downed: number }>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  /* ---------------------------------------------------------------- */
  /* Going up                                                          */
  /* ---------------------------------------------------------------- */

  function launch(mission: Mission) {
    const s = saveRef.current
    runRef.current = {
      mission,
      y: 260,
      vy: 0,
      power: statOf(s, 'reactor'),
      integrity: statOf(s, 'plating'),
      distance: 0,
      scroll: 0,
      things: [],
      bolts: [],
      saved: 0,
      downed: 0,
      nextSpawn: 600,
      nextShot: 0,
      aimX: VIEW.width * 0.62,
      aimY: null,
      unibeamAt: 0,
      hurtUntil: 0,
      thrusting: false,
      over: null,
      t: 0,
    }
    setResult(null)
    setFlying(true)
    showToast(mission.brief)
  }

  const finish = useCallback(() => {
    const run = runRef.current
    if (!run) return
    const reached = run.over === 'done'
    const pay = payout(run.mission, run.saved, run.downed, reached)
    earn(pay)
    setSave((s) => ({
      ...s,
      flown: { ...s.flown, [run.mission.key]: (s.flown?.[run.mission.key] ?? 0) + 1 },
      saved: (s.saved ?? 0) + run.saved,
      downed: (s.downed ?? 0) + run.downed,
      best: Math.max(s.best ?? 0, Math.round(run.distance)),
    }))
    setResult({ pay, reached, saved: run.saved, downed: run.downed })
    setFlying(false)
    runRef.current = null
  }, [earn, setSave])

  /* ---------------------------------------------------------------- */
  /* The run                                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!flying) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const s = saveRef.current
    const lift = statOf(s, 'thrusters')
    const maxPower = statOf(s, 'reactor')
    const maxHull = statOf(s, 'plating')

    let raf = 0
    let last = performance.now()
    let hudAt = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const run = runRef.current
      if (!run) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      run.t = now

      /* --- flying: the suit chases wherever you are pointing -------- */
      const steering = run.aimY != null && run.power > 0
      if (steering) {
        const want = Math.max(CEILING, Math.min(FLOOR_Y - 26, run.aimY!))
        const gap = want - run.y
        const reach = lift * 0.74
        const target = Math.max(-reach, Math.min(reach, gap * STEER))
        run.vy += (target - run.vy) * Math.min(1, dt * 9)
      } else {
        run.vy += GRAVITY * dt
      }
      const wants = steering && run.vy < -12
      run.vy = Math.max(-520, Math.min(620, run.vy))
      run.y += run.vy * dt
      if (run.y < CEILING) {
        run.y = CEILING
        run.vy = Math.max(0, run.vy)
      }
      if (run.y > FLOOR_Y - 26) {
        run.y = FLOOR_Y - 26
        run.vy = Math.min(0, run.vy)
      }

      run.power = Math.max(
        0,
        Math.min(maxPower, run.power + (wants ? -THRUST_DRAIN : GLIDE_CHARGE) * dt)
      )

      run.distance += CRUISE * dt
      run.scroll += CRUISE * dt

      /* --- what turns up ------------------------------------------ */
      run.nextSpawn -= CRUISE * dt
      if (run.nextSpawn <= 0) {
        const kind = run.mission.mix[Math.floor(Math.random() * run.mission.mix.length)] as ThingKind
        const spec = THINGS[kind]
        const y =
          kind === 'flare'
            ? FLOOR_Y - 34
            : kind === 'missile'
              ? 140 + Math.random() * 260
              : 90 + Math.random() * 300
        run.things.push({
          kind,
          x: VIEW.width + 80,
          y,
          vy: kind === 'civilian' ? 34 : 0,
          hp: spec.hp,
          seed: Math.random() * 100,
          dead: false,
        })
        run.nextSpawn = (420 + Math.random() * 520) / run.mission.density
      }

      for (const thing of run.things) {
        const speed = thing.kind === 'missile' ? CRUISE + 260 : thing.kind === 'gunship' ? CRUISE - 90 : CRUISE
        thing.x -= speed * dt
        thing.y += thing.vy * dt
        if (thing.kind === 'civilian' && thing.y > FLOOR_Y - 30) thing.y = FLOOR_Y - 30
      }

      /* --- collisions ---------------------------------------------- */
      for (const thing of run.things) {
        if (thing.dead) continue
        const spec = THINGS[thing.kind]
        const near = Math.hypot(thing.x - SUIT_X, thing.y - run.y)
        if (near > spec.r + 22) continue
        if (thing.kind === 'civilian') {
          thing.dead = true
          run.saved++
        } else if (now > run.hurtUntil) {
          run.integrity -= spec.harm
          run.hurtUntil = now + 700
          run.vy = 220
          if (thing.kind === 'missile') thing.dead = true
        }
      }

      run.things = run.things.filter((th) => !th.dead && th.x > -120)
      run.bolts = run.bolts.filter((b) => b.until > now)

      if (run.integrity <= 0 && !run.over) run.over = 'downed'
      if (run.distance >= run.mission.distance && !run.over) run.over = 'done'
      if (run.over) {
        finish()
        return
      }

      /* --- drawing -------------------------------------------------- */
      drawSky(ctx, run.t)
      drawCity(ctx, run.scroll)
      for (const thing of run.things) drawThing(ctx, thing, run.t)
      for (const bolt of run.bolts) drawBolt(ctx, bolt.x, bolt.y, bolt.big)
      const tilt = Math.max(-0.4, Math.min(0.45, run.vy / 900))
      drawSuit(ctx, SUIT_X, run.y, wants, tilt, run.t, run.hurtUntil > now ? 1 : 0)

      if (run.aimY != null) {
        drawReticle(ctx, run.aimX, run.aimY, reachOf(saveRef.current), now > run.nextShot)
      }

      finishFrame(ctx, VIEW, {
        vignette: 0.52,
        grain: 0.05,
        bloom: 0.62,
        bloomSpread: 7,
        grade: { warm: '#ffc98a', cool: '#222c52', strength: 0.2 },
      })

      if (now - hudAt > 100) {
        hudAt = now
        setHud({
          power: run.power / maxPower,
          integrity: Math.max(0, run.integrity) / maxHull,
          gone: run.distance / run.mission.distance,
          saved: run.saved,
          downed: run.downed,
          beam: Math.max(0, (run.unibeamAt - now) / UNIBEAM_COOLDOWN),
        })
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [finish, flying])

  /* ---------------------------------------------------------------- */
  /* Controls                                                          */
  /* ---------------------------------------------------------------- */

  /** A repulsor shot at whatever you clicked on. */
  const fire = useCallback((px: number, py: number) => {
    const run = runRef.current
    if (!run) return
    const now = performance.now()
    if (now < run.nextShot) return
    run.nextShot = now + REPULSOR_COOLDOWN

    const reach = reachOf(saveRef.current)
    let best: Thing | null = null
    let bestGap = Infinity
    for (const thing of run.things) {
      if (thing.dead || !THINGS[thing.kind].shootable) continue
      const gap = Math.hypot(thing.x - px, thing.y - py)
      if (gap < reach + THINGS[thing.kind].r && gap < bestGap) {
        bestGap = gap
        best = thing
      }
    }

    run.bolts.push({ x: best ? best.x : px, y: best ? best.y : py, big: false, until: now + 110 })
    if (!best) return
    best.hp -= statOf(saveRef.current, 'repulsors')
    if (best.hp <= 0) {
      best.dead = true
      run.downed++
    }
  }, [])

  const unibeam = useCallback(() => {
    const run = runRef.current
    if (!run) return
    const now = performance.now()
    if (now < run.unibeamAt || run.power < UNIBEAM_COST) return
    run.unibeamAt = now + UNIBEAM_COOLDOWN
    run.power -= UNIBEAM_COST
    run.bolts.push({ x: SUIT_X + 300, y: run.y, big: true, until: now + 180 })
    for (const thing of run.things) {
      if (thing.dead || !THINGS[thing.kind].shootable) continue
      if (thing.x < SUIT_X || Math.abs(thing.y - run.y) > 110) continue
      thing.hp -= UNIBEAM_DAMAGE
      if (thing.hp <= 0) {
        thing.dead = true
        run.downed++
      }
    }
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (flyingRef.current) {
          const run = runRef.current
          if (run) run.over = 'downed'
        } else onExit()
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (runRef.current) runRef.current.thrusting = true
        return
      }
      if (e.key.toLowerCase() === 'b') unibeam()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && runRef.current) runRef.current.thrusting = false
    }
    const release = () => {
      if (runRef.current) runRef.current.thrusting = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      window.removeEventListener('blur', release)
    }
  }, [onExit, unibeam])

  /* ---------------------------------------------------------------- */
  /* Workshop                                                          */
  /* ---------------------------------------------------------------- */

  function upgrade(key: SystemKey) {
    const sys = SYSTEMS.find((s) => s.key === key)!
    const owned = saveRef.current[key] ?? 0
    const next = sys.levels[owned + 1]
    if (!next) return
    if (!spend(next.cost)) {
      showToast('Not enough in the account yet.')
      return
    }
    setSave((s) => ({ ...s, [key]: owned + 1 }))
    showToast(`Fitted: ${next.label}.`)
  }

  const built = SYSTEMS.reduce((n, s) => n + (save[s.key] ?? 0), 0)

  if (flying) {
    return (
      <div style={S.wrap}>
        <div
          style={S.stage}
          onPointerMove={(e) => {
            const run = runRef.current
            if (!run) return
            const box = e.currentTarget.getBoundingClientRect()
            run.aimX = ((e.clientX - box.left) / box.width) * VIEW.width
            run.aimY = ((e.clientY - box.top) / box.height) * VIEW.height
          }}
          onPointerLeave={() => {
            if (runRef.current) runRef.current.aimY = null
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return
            const run = runRef.current
            if (!run) return
            const box = e.currentTarget.getBoundingClientRect()
            const px = ((e.clientX - box.left) / box.width) * VIEW.width
            const py = ((e.clientY - box.top) / box.height) * VIEW.height
            run.aimX = px
            run.aimY = py
            fire(px, py)
          }}
        >
          <canvas ref={canvasRef} width={VIEW.width} height={VIEW.height} style={S.canvas} />

          <div style={S.hudTop}>
            <div style={S.gauge}>
              <span style={S.gaugeLabel}>Reactor</span>
              <div style={S.track}>
                <div style={{ ...S.fill, width: `${Math.round(hud.power * 100)}%`, background: '#7fd8f2' }} />
              </div>
            </div>
            <div style={S.gauge}>
              <span style={S.gaugeLabel}>Integrity</span>
              <div style={S.track}>
                <div
                  style={{
                    ...S.fill,
                    width: `${Math.round(hud.integrity * 100)}%`,
                    background: hud.integrity > 0.4 ? '#e0a33a' : '#e2584f',
                  }}
                />
              </div>
            </div>
            <span style={S.tally}>
              {hud.saved} saved · {hud.downed} down
            </span>
          </div>

          <div style={S.progress}>
            <div style={{ ...S.progressFill, width: `${Math.round(hud.gone * 100)}%` }} />
          </div>

          {toast && <div style={S.toast}>{toast}</div>}

          <div style={S.hudBottom}>
            <span style={S.hint}>the suit follows your pointer · click a drone to fire</span>
            <button
              style={{ ...S.beamBtn, opacity: hud.beam > 0 ? 0.4 : 1 }}
              onPointerDown={(e) => {
                e.stopPropagation()
                unibeam()
              }}
            >
              Unibeam
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...S.shop, width: 'min(760px, calc(100vw - 20px))' }}>
      <div style={S.shopHead}>
        <h2 style={S.title}>Iron Man Life</h2>
        <span style={S.headRight}>
          <button
            style={S.mute}
            onClick={() => setSave((s) => ({ ...s, music: !(s.music !== false) }))}
          >
            {music ? '🔊' : '🔇'}
          </button>
          <span style={S.coins}>🪙 {coins}</span>
        </span>
      </div>

      <GiftRow from="ironman" />

      <div style={S.suitCard}>
        <svg viewBox="-60 -60 200 140" width="190" height="133" style={{ flexShrink: 0 }}>
          <SuitPortrait />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.mark}>{markOf(save)}</div>
          <div style={S.suitLine}>
            {SYSTEMS.map((sys) => (
              <span key={sys.key} style={S.stat}>
                {sys.label} <b>{statOf(save, sys.key)}</b>
              </span>
            ))}
          </div>
          <div style={S.suitNote}>
            {save.saved ?? 0} people out · {save.downed ?? 0} taken down · {built} of{' '}
            {SYSTEMS.length * 3} upgrades fitted
          </div>
        </div>
      </div>

      {result && (
        <div style={{ ...S.result, borderColor: result.reached ? '#7cd88f' : '#e2584f' }}>
          <strong>{result.reached ? 'Mission complete.' : 'Suit down — you set her on a rooftop.'}</strong>{' '}
          {result.saved} out, {result.downed} down · {result.pay} 🪙
        </div>
      )}

      <div style={S.sectionLabel}>Fly out</div>
      {MISSIONS.map((m) => {
        const ready = built >= m.wants
        const flownCount = save.flown?.[m.key] ?? 0
        return (
          <div key={m.key} style={S.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.rowName}>
                {m.label}
                {flownCount > 0 && <span style={S.flown}>flown ×{flownCount}</span>}
              </div>
              <div style={S.rowNote}>{m.brief}</div>
              <div style={S.rowNote}>
                {(m.distance / 1000).toFixed(1)} km · pays {m.pay} 🪙
                {!ready && ` · wants a better suit (${m.wants} upgrades)`}
              </div>
            </div>
            <button
              style={{ ...S.go, opacity: ready ? 1 : 0.5 }}
              onClick={() => (ready ? launch(m) : showToast('Build the suit up first.'))}
            >
              Launch
            </button>
          </div>
        )
      })}

      <div style={S.sectionLabel}>Workshop</div>
      {SYSTEMS.map((sys) => {
        const owned = save[sys.key] ?? 0
        const next = sys.levels[owned + 1]
        return (
          <div key={sys.key} style={S.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.rowName}>
                {sys.label} · {sys.levels[owned].label}
              </div>
              <div style={S.rowNote}>{next ? next.blurb : 'Nothing left to fit.'}</div>
            </div>
            {next ? (
              <button
                style={{ ...S.buy, opacity: coins >= next.cost ? 1 : 0.45 }}
                onClick={() => upgrade(sys.key)}
              >
                {next.label}
                <span style={S.cost}>🪙 {next.cost}</span>
              </button>
            ) : (
              <span style={S.rowNote}>maxed</span>
            )}
          </div>
        )
      })}

      <div style={S.toastSlot}>{toast && <span style={S.shopToast}>{toast}</span>}</div>
      <button style={S.leave} onClick={onExit}>
        Close the shop
      </button>
    </div>
  )
}

/** The suit standing still, for the workshop. */
function SuitPortrait() {
  return (
    <>
      <ellipse cx="40" cy="62" rx="34" ry="5" fill="#000" opacity={0.25} />
      <rect x="22" y="30" width="12" height="30" rx="5" fill="#b8302b" />
      <rect x="46" y="30" width="12" height="30" rx="5" fill="#b8302b" />
      <rect x="20" y="52" width="16" height="10" rx="3" fill="#d9a93a" />
      <rect x="44" y="52" width="16" height="10" rx="3" fill="#d9a93a" />
      <rect x="6" y="2" width="11" height="30" rx="5" fill="#b8302b" />
      <rect x="63" y="2" width="11" height="30" rx="5" fill="#b8302b" />
      <circle cx="11.5" cy="33" r="6.5" fill="#d9a93a" />
      <circle cx="68.5" cy="33" r="6.5" fill="#d9a93a" />
      <circle cx="11.5" cy="33" r="3" fill="#cfeeff" />
      <circle cx="68.5" cy="33" r="3" fill="#cfeeff" />
      <path d="M18 -4 Q40 -12 62 -4 L58 34 Q40 42 22 34 Z" fill="#b8302b" />
      <path d="M24 0 Q40 -6 56 0 L54 20 Q40 26 26 20 Z" fill="#d9a93a" />
      <circle cx="40" cy="12" r="11" fill="#7fd8f2" opacity={0.35} />
      <circle cx="40" cy="12" r="6.5" fill="#e8f8ff" />
      <path d="M26 -30 Q40 -40 54 -30 L52 -8 Q40 -2 28 -8 Z" fill="#b8302b" />
      <path d="M30 -32 Q40 -38 50 -32 L49 -20 Q40 -16 31 -20 Z" fill="#d9a93a" />
      <rect x="31" y="-24" width="18" height="4.4" rx="1.5" fill="#dff4ff" />
    </>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap: { width: 'min(960px, 100vw)', maxHeight: '100dvh', display: 'flex', justifyContent: 'center' },
  stage: {
    position: 'relative',
    width: '100%',
    touchAction: 'none',
    userSelect: 'none',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    cursor: 'pointer',
  },
  canvas: { display: 'block', width: '100%', height: 'auto' },

  hudTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '9px 14px',
    background: 'linear-gradient(rgba(10,12,22,0.7), rgba(10,12,22,0))',
    color: '#e8f2fa',
    pointerEvents: 'none',
  },
  gauge: { display: 'flex', alignItems: 'center', gap: 7, flex: '0 1 210px' },
  gaugeLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 },
  track: { flex: 1, height: 8, borderRadius: 5, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, transition: 'width 120ms linear' },
  tally: { marginLeft: 'auto', fontSize: 12.5, fontWeight: 700 },

  progress: {
    position: 'absolute',
    bottom: 52,
    left: 18,
    right: 18,
    height: 4,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.18)',
    pointerEvents: 'none',
  },
  progressFill: { height: '100%', borderRadius: 3, background: '#7fd8f2' },

  hudBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'linear-gradient(rgba(10,12,22,0), rgba(10,12,22,0.75))',
  },
  hint: { fontSize: 11.5, color: '#cfe0ec', opacity: 0.8 },
  beamBtn: {
    padding: '9px 18px',
    border: 'none',
    borderRadius: 20,
    background: '#7fd8f2',
    color: '#0e2230',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.4,
    cursor: 'pointer',
  },
  toast: {
    position: 'absolute',
    top: 54,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(10,14,24,0.88)',
    color: '#e8f2fa',
    fontSize: 13,
    padding: '6px 14px',
    borderRadius: 14,
    pointerEvents: 'none',
    maxWidth: '80%',
    textAlign: 'center',
  },

  shop: {
    background: '#141821',
    borderRadius: 12,
    padding: 'clamp(14px, 4vw, 22px)',
    maxHeight: 'calc(100dvh - 20px)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    color: '#e8f2fa',
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
  },
  shopHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { margin: 0, fontSize: 21, color: '#f2c27a' },
  headRight: { display: 'flex', alignItems: 'center', gap: 8 },
  mute: { border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', padding: 0 },
  coins: { fontSize: 15, fontWeight: 700, color: '#f2c27a' },

  suitCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#1c222e',
    borderRadius: 10,
    padding: 10,
  },
  mark: { fontSize: 19, fontWeight: 800, color: '#f2c27a' },
  suitLine: { display: 'flex', flexWrap: 'wrap', gap: 10, margin: '4px 0' },
  stat: { fontSize: 11.5, color: '#a8bccc' },
  suitNote: { fontSize: 11, color: '#7f94a6' },

  result: {
    background: '#1c222e',
    border: '1px solid',
    borderRadius: 9,
    padding: '8px 11px',
    fontSize: 12.5,
  },

  sectionLabel: {
    marginTop: 8,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#7f94a6',
    fontWeight: 700,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#1c222e',
    borderRadius: 9,
    padding: 9,
  },
  rowName: { fontSize: 13.5, fontWeight: 600 },
  rowNote: { fontSize: 11.5, color: '#8fa6b8' },
  flown: { marginLeft: 7, fontSize: 9.5, color: '#7cd88f', fontWeight: 700 },
  go: {
    padding: '9px 16px',
    border: 'none',
    borderRadius: 9,
    background: '#b8302b',
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 800,
    cursor: 'pointer',
  },
  buy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '7px 12px',
    border: 'none',
    borderRadius: 9,
    background: '#d9a93a',
    color: '#2b2415',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  cost: { fontSize: 10.5, opacity: 0.8 },

  toastSlot: { minHeight: 20, display: 'flex', justifyContent: 'center' },
  shopToast: {
    background: '#0f1520',
    color: '#e8f2fa',
    fontSize: 12.5,
    padding: '3px 11px',
    borderRadius: 10,
  },
  leave: {
    background: 'none',
    border: 'none',
    color: '#7f94a6',
    fontSize: 12.5,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
}
