import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { useAmbientMusic } from '../../audio/useAmbientMusic'
import { finish } from '../../engine/polish'
import type { Camera } from '../../engine/firstPerson'
import {
  BALLS,
  BALL_BY_KEY,
  BALL_FAMILIES,
  FREE_BALLS,
  LEVELS,
  LEVEL_BY_KEY,
  STEP,
  buildChute,
  type Ball,
  type Node,
} from './chuteData'
import {
  type Ride,
  ballAt,
  parOf,
  payFor,
  progress,
  startRide,
  step,
  TOP,
} from './chuteSim'
import { VIEW, ballSwatch, drawBall, drawMouth, drawPipe, drawRush, drawSky } from './chuteDraw'

/**
 * The Chutes.
 *
 * A closed pipe, downhill, fast. There is nothing to hit and nowhere to
 * fall out, so the whole of the game is the line you hold: ride the
 * banking where the corner is doing the work and you come out faster
 * than you went in, sit at the bottom and you scrub all the way round.
 */

export interface ChuteSave {
  /** The ball being rolled, and the ones bought. */
  ball: string
  balls: string[]
  /** The chute last picked. */
  level: string
  /** Best time down each chute, in seconds. */
  best: Record<string, number>
  /** Longest single jump, ever. */
  bestAir: number
  runs: number
  music?: boolean
}

export const initialChutes: ChuteSave = {
  ball: 'rubber',
  balls: [...FREE_BALLS],
  level: 'firstrun',
  best: {},
  bestAir: 0,
  runs: 0,
}

export function ownedBalls(save: ChuteSave): string[] {
  const had = save.balls ?? []
  return had.length ? had : [...FREE_BALLS]
}

export function ChutesMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<ChuteSave>('chutes', () => initialChutes)
  const { coins, earn, spend } = usePurse('chutes')
  const saveRef = useRef(save)
  saveRef.current = save

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rideRef = useRef<Ride | null>(null)
  const nodesRef = useRef<Node[]>([])
  const steerRef = useRef(0)
  const spinRef = useRef(0)
  const [riding, setRiding] = useState(false)
  const [denied, setDenied] = useState<string | null>(null)
  const [hud, setHud] = useState({ speed: 0, t: 0, along: 0, grip: 1, air: false, airT: 0 })
  const [result, setResult] = useState<null | {
    t: number
    pay: number
    record: boolean
    bestAir: number
  }>(null)

  useAmbientMusic(save.music !== false, riding ? 'drive' : 'calm', 0.4)

  const level = LEVEL_BY_KEY[save.level ?? 'firstrun'] ?? LEVELS[0]
  const ball = BALL_BY_KEY[save.ball ?? 'rubber'] ?? BALLS[0]
  const owned = ownedBalls(save)

  /* ---------------------------------------------------------------- */
  /* A run                                                             */
  /* ---------------------------------------------------------------- */

  function drop() {
    const lv = LEVEL_BY_KEY[saveRef.current.level ?? 'firstrun'] ?? LEVELS[0]
    nodesRef.current = buildChute(lv)
    rideRef.current = startRide()
    steerRef.current = 0
    spinRef.current = 0
    setResult(null)
    setDenied(null)
    setRiding(true)
  }

  const land = useCallback(() => {
    const ride = rideRef.current
    if (!ride) return
    const lv = LEVEL_BY_KEY[saveRef.current.level ?? 'firstrun'] ?? LEVELS[0]
    const pay = payFor(lv, ride.t, ride.bestAir)
    const had = saveRef.current.best?.[lv.key]
    const record = had === undefined || ride.t < had
    earn(pay)
    setSave((s) => ({
      ...s,
      runs: (s.runs ?? 0) + 1,
      best: record ? { ...(s.best ?? {}), [lv.key]: ride.t } : (s.best ?? {}),
      bestAir: Math.max(s.bestAir ?? 0, ride.bestAir),
    }))
    setResult({ t: ride.t, pay, record, bestAir: ride.bestAir })
    setRiding(false)
    rideRef.current = null
  }, [earn, setSave])

  useEffect(() => {
    if (!riding) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let last = performance.now()
    let hudAt = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const ride = rideRef.current
      const nodes = nodesRef.current
      if (!ride || nodes.length === 0) return
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now

      const out = step(ride, nodes, steerRef.current, dt)
      spinRef.current += (ride.speed / 90) * dt

      /* --- where to look from --------------------------------------- */
      //
      // Behind the ball and a little way in from the wall it is riding,
      // rather than dead on the centreline. On the centreline a ball
      // high on the outside of a corner leaves the frame entirely, and
      // the one thing you must always be able to see is your own line.
      // Well back from the ball.
      //
      // At two and a half nodes the camera sat a hundred units off it,
      // and a twenty-unit ball a hundred units from a five-hundred-and-
      // twenty focal length fills a third of the screen. You could not
      // see the chute past your own ball.
      const back = Math.max(0, ride.s - 8.5)
      const i = Math.min(nodes.length - 2, Math.floor(back))
      const f = back - i
      const a = nodes[i]
      const b = nodes[i + 1]
      const cx = a.x + (b.x - a.x) * f
      const cy = a.y + (b.y - a.y) * f
      const cz = a.z + (b.z - a.z) * f
      const yaw = a.yaw + (b.yaw - a.yaw) * f
      // Up out of the trough a little, so the road, the ball and the
      // city ahead are all in frame at once.
      const lean = a.radius * 0.5
      const rx = Math.cos(yaw)
      const rz = -Math.sin(yaw)
      const cam: Camera = {
        x: cx + rx * lean * Math.sin(ride.theta),
        y: cy + lean * Math.cos(ride.theta) - a.radius * 0.3 + ride.airY * 0.7,
        z: cz + rz * lean * Math.sin(ride.theta),
        yaw,
        pitch: a.dip * 0.5,
      }

      /* --- paint ---------------------------------------------------- */
      drawSky(ctx, LEVEL_BY_KEY[saveRef.current.level]?.sky ?? 'sundown', yaw, cam.pitch, now)
      drawPipe(ctx, cam, nodes, back, pipeHue(saveRef.current.level))
      if (ride.air) drawMouth(ctx, cam, nodes, ride.s, pipeHue(saveRef.current.level))
      const at = ballAt(nodes, ride)
      drawBall(ctx, cam, ball, at.x, at.y, at.z, spinRef.current)
      drawRush(ctx, ride.speed, now)

      finish(ctx, VIEW, {
        vignette: 0.4,
        grain: 0.03,
        bloom: 0.34,
        bloomSpread: 6,
        grade: { warm: '#ffd9a6', cool: '#2a2550', strength: 0.14 },
      })

      if (now - hudAt > 80) {
        hudAt = now
        setHud({
          speed: ride.speed,
          t: ride.t,
          along: progress(ride, nodes),
          grip: ride.grip,
          air: ride.air,
          airT: ride.airT,
        })
      }
      if (out.finished) land()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [riding, ball, land])

  /* ---------------------------------------------------------------- */
  /* Steering                                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!riding) return
    const keys = new Set<string>()
    const read = () => {
      const left = keys.has('ArrowLeft') || keys.has('a')
      const right = keys.has('ArrowRight') || keys.has('d')
      steerRef.current = (right ? 1 : 0) - (left ? 1 : 0)
    }
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        land()
        return
      }
      keys.add(e.key)
      read()
    }
    const up = (e: KeyboardEvent) => {
      keys.delete(e.key)
      read()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [riding, land])

  function aim(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    // A dead zone in the middle, so holding the pointer roughly central
    // is genuinely straight rather than a constant small correction.
    const off = (x - 0.5) * 2
    steerRef.current = Math.abs(off) < 0.08 ? 0 : Math.max(-1, Math.min(1, off * 1.4))
  }

  /* ---------------------------------------------------------------- */
  /* Screens                                                           */
  /* ---------------------------------------------------------------- */

  if (riding) {
    const kmh = Math.round(hud.speed / 6)
    return (
      <div style={S.wrap}>
        <div style={S.stage}>
          <canvas
            ref={canvasRef}
            width={VIEW.width}
            height={VIEW.height}
            style={S.canvas}
            onPointerMove={aim}
            onPointerLeave={() => (steerRef.current = 0)}
          />
          <div style={S.hudTop}>
            <span style={S.speed}>{kmh}</span>
            <span style={S.unit}>km/h</span>
            <div style={S.track}>
              <div style={{ ...S.fill, width: `${Math.round(hud.along * 100)}%` }} />
            </div>
            <span style={S.clock}>{hud.t.toFixed(2)}s</span>
          </div>
          {hud.air ? (
            <div style={S.air}>in the air · {hud.airT.toFixed(1)}s</div>
          ) : (
            <div style={S.lineRead}>
              <div style={S.lineTrack}>
                <div
                  style={{
                    ...S.lineFill,
                    width: `${Math.round(hud.grip * 100)}%`,
                    background:
                      hud.grip > 0.72 ? '#8ef0a0' : hud.grip > 0.4 ? '#ffd48a' : '#ff9a86',
                  }}
                />
              </div>
              <span style={S.lineLabel}>
                {hud.grip > 0.72 ? 'on the line' : hud.grip > 0.4 ? 'close' : 'scrubbing'}
              </span>
            </div>
          )}
          <div style={S.hudBottom}>steer with the mouse, or the arrow keys · esc to stop</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      <div style={S.sheet}>
        <div style={S.head}>
          <h2 style={S.title}>The Chutes</h2>
          <span style={S.coins}>🪙 {coins}</span>
        </div>

        <GiftRow from="chutes" />

        {result && (
          <div style={S.result}>
            {result.record && <span style={S.record}>New best</span>}
            <strong>{result.t.toFixed(2)}s</strong> down {level.name}. {result.pay} 🪙
            {result.bestAir > 0.4 && (
              <span style={S.note}> · longest jump {result.bestAir.toFixed(1)}s</span>
            )}
          </div>
        )}
        {denied && <p style={S.denied}>{denied}</p>}

        <p style={S.rule}>
          The pipe is closed, so there is nothing to hit. Speed is all in the line: ride up the
          outside of a bend and the banking carries you, sit at the bottom and you scrub.
        </p>

        <button style={S.go} onClick={drop}>
          Drop in · {level.name}
        </button>

        <p style={S.sectionHead}>Chute · {LEVELS.length}</p>
        <div style={S.grid}>
          {LEVELS.map((l) => {
            const on = (save.level ?? 'firstrun') === l.key
            const best = save.best?.[l.key]
            return (
              <button
                key={l.key}
                style={{ ...S.card, ...(on ? S.cardOn : null) }}
                onClick={() => setSave((v) => ({ ...v, level: l.key }))}
              >
                <span style={S.cardName}>{l.name}</span>
                <span style={S.cardNote}>{l.blurb}</span>
                <span style={S.cardMeta}>
                  {Math.round((l.length * STEP) / 100) / 10}km · {l.jumps} jump
                  {l.jumps === 1 ? '' : 's'} · par {parOf(l).toFixed(0)}s
                  {best !== undefined ? ` · best ${best.toFixed(2)}s` : ''}
                </span>
              </button>
            )
          })}
        </div>

        <p style={S.sectionHead}>
          Ball · {owned.length} of {BALLS.length}
        </p>
        {BALL_FAMILIES.map((fam) => {
          const mine = BALLS.filter((b) => b.family === fam)
          if (mine.length === 0) return null
          return (
            <div key={fam}>
              <p style={S.famHead}>{fam}</p>
              <div style={S.grid}>
                {mine.map((b) => {
                  const have = owned.includes(b.key)
                  const on = (save.ball ?? 'rubber') === b.key
                  return (
                    <button
                      key={b.key}
                      style={{
                        ...S.card,
                        ...(on ? S.cardOn : null),
                        ...(have ? null : S.cardLocked),
                      }}
                      onClick={() => {
                        if (have) {
                          setSave((v) => ({ ...v, ball: b.key }))
                          return
                        }
                        if (!spend(b.cost)) {
                          setDenied(`${b.name} costs ${b.cost} 🪙. You have ${coins}.`)
                          return
                        }
                        setDenied(null)
                        setSave((v) => ({
                          ...v,
                          ball: b.key,
                          balls: [...ownedBalls(v), b.key],
                        }))
                      }}
                    >
                      <span style={S.swatchRow}>
                        <Swatch spec={b} />
                        <span style={S.cardName}>{b.name}</span>
                      </span>
                      <span style={S.cardNote}>{b.blurb}</span>
                      <span style={S.cardMeta}>
                        {have ? (on ? 'rolling' : 'yours') : `🪙 ${b.cost}`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div style={S.foot}>
          <button style={S.chip} onClick={() => setSave((s) => ({ ...s, music: s.music === false }))}>
            {save.music === false ? 'music off' : 'music on'}
          </button>
          <button style={S.chip} onClick={onExit}>
            leave
          </button>
        </div>
      </div>
    </div>
  )
}

/** A chute's own colour, so one does not look like the last. */
function pipeHue(key: string): number {
  const i = LEVELS.findIndex((l) => l.key === key)
  return [206, 22, 286, 42, 160, 320, 196, 14, 250][Math.max(0, i) % 9]
}

/** One ball, turning slowly, painted by the same code the run uses. */
function Swatch({ spec }: { spec: Ball }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let raf = 0
    const f = (t: number) => {
      raf = requestAnimationFrame(f)
      ballSwatch(ctx, spec, 40, 40, t)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [spec])
  return <canvas ref={ref} width={40} height={40} style={{ width: 40, height: 40 }} />
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    inset: 0,
    background: '#0a0812',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  stage: { position: 'relative', maxWidth: '100%', maxHeight: '100%' },
  canvas: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '88vh',
    borderRadius: 12,
    touchAction: 'none',
    cursor: 'crosshair',
  },
  hudTop: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    color: '#fff3e0',
    font: '600 13px/1 ui-sans-serif, system-ui, sans-serif',
    textShadow: '0 2px 10px rgba(0,0,0,0.85)',
  },
  speed: { font: '800 30px/1 ui-sans-serif, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' },
  unit: { opacity: 0.7 },
  track: { flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: '100%', background: '#ffd48a' },
  clock: { fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 17 },
  lineRead: {
    position: 'absolute',
    bottom: 42,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    pointerEvents: 'none',
  },
  lineTrack: { width: 220, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.45)', overflow: 'hidden' },
  lineFill: { height: '100%', borderRadius: 3 },
  lineLabel: {
    font: '700 11px/1 ui-sans-serif, system-ui, sans-serif',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,243,224,0.8)',
    textShadow: '0 2px 10px rgba(0,0,0,0.9)',
  },
  air: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    textAlign: 'center',
    font: '800 22px/1 ui-sans-serif, system-ui, sans-serif',
    color: '#ffe9b8',
    textShadow: '0 3px 16px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
  },
  hudBottom: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    font: '400 12px/1.4 ui-sans-serif, system-ui, sans-serif',
    color: 'rgba(255,243,224,0.6)',
    textShadow: '0 2px 10px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
  },
  sheet: {
    width: 'min(980px, 100%)',
    maxHeight: '94vh',
    overflowY: 'auto',
    background: 'linear-gradient(180deg,#1a1630,#0f0c1d)',
    border: '1px solid rgba(255,200,170,0.14)',
    borderRadius: 16,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
    color: '#f1e8f5',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { margin: 0, font: '700 22px/1.2 ui-serif, Georgia, serif' },
  coins: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  result: {
    background: 'rgba(255,200,140,0.1)',
    border: '1px solid rgba(255,200,140,0.24)',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 14,
    display: 'flex',
    gap: 8,
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  record: { color: '#8ef0a0', fontWeight: 800, fontSize: 12, letterSpacing: 0.6 },
  note: { opacity: 0.75, fontSize: 12.5 },
  denied: { margin: 0, fontSize: 13, color: '#ffb0a0' },
  rule: { margin: '2px 0 4px', fontSize: 13, opacity: 0.78, maxWidth: '62ch' },
  go: {
    alignSelf: 'flex-start',
    padding: '11px 18px',
    borderRadius: 10,
    border: '1px solid rgba(255,190,120,0.45)',
    background: 'linear-gradient(180deg,#8a3f72,#4a2250)',
    color: '#ffeacd',
    font: '700 15px/1 ui-sans-serif, system-ui, sans-serif',
    cursor: 'pointer',
  },
  sectionHead: {
    margin: '12px 0 0',
    font: '700 12px/1 ui-sans-serif, system-ui, sans-serif',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,214,200,0.7)',
  },
  famHead: {
    margin: '8px 0 4px',
    font: '600 11px/1 ui-sans-serif, system-ui, sans-serif',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,214,200,0.45)',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    padding: 10,
    borderRadius: 10,
    border: '1px solid rgba(255,210,190,0.14)',
    background: 'rgba(255,220,200,0.05)',
    color: '#f1e8f5',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
  },
  cardOn: { borderColor: 'rgba(255,200,140,0.7)', background: 'rgba(255,200,140,0.12)' },
  cardLocked: { opacity: 0.62 },
  swatchRow: { display: 'flex', alignItems: 'center', gap: 8 },
  cardName: { fontWeight: 700, fontSize: 13 },
  cardNote: { fontSize: 12, opacity: 0.8 },
  cardMeta: { fontSize: 11.5, opacity: 0.6, fontVariantNumeric: 'tabular-nums' },
  chip: {
    padding: '6px 11px',
    borderRadius: 8,
    border: '1px solid rgba(255,220,200,0.22)',
    background: 'rgba(255,220,200,0.08)',
    color: '#f1e8f5',
    font: '600 12px/1 ui-sans-serif, system-ui, sans-serif',
    cursor: 'pointer',
  },
  foot: { display: 'flex', gap: 8, marginTop: 10 },
}

void TOP
