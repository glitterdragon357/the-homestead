import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { useAmbientMusic } from '../../audio/useAmbientMusic'
import { finish } from '../../engine/polish'
import { VIEW, drawArena, drawCoins, drawPellets, drawSnake, type Camera } from './snakeDraw'
import {
  DASH_MAX,
  MAPS,
  MAP_BY_KEY,
  SKINS,
  SKIN_BY_KEY,
  ownedSkins,
  SPAWN_GRACE,
  fedForLevel,
  initialSnake,
  levelOf,
  payout,
  type SnakeSave,
} from './snakeData'
import {
  collect,
  collide,
  dropBounty,
  feed,
  makeWorld,
  moveSnake,
  restock,
  scatter,
  scatterBeads,
  steer,
  type World,
} from './snakeSim'

/**
 * Snake Dash.
 *
 * Steer with the pointer, hold to dash. Everything in the arena obeys
 * one rule: a head that meets something below its level eats it, and a
 * head that meets something at or above its level bounces off. So the
 * same meeting is a meal or a wall depending on which end of it you are,
 * and the only number you need to read in a fight is the one over the
 * other snake's head.
 */

export function SnakeDashMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<SnakeSave>('snakedash', () => initialSnake)
  const { coins, earn, spend } = usePurse('snakedash')
  const saveRef = useRef(save)
  saveRef.current = save

  const music = save.music !== false
  useAmbientMusic(music, 'drive', 0.4)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<World | null>(null)
  const aimRef = useRef<{ x: number; y: number } | null>(null)
  const dashRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useState<null | {
    pay: number
    level: number
    eaten: number
    bitten: number
    found: number
  }>(null)
  const [hud, setHud] = useState({ level: 1, fed: 0, dash: 1, eaten: 0, rank: 1, of: 9, toNext: 0, bitten: 0, pocket: 0 })

  const eatenRef = useRef(0)
  const bittenRef = useRef(0)
  const pocketRef = useRef(0)

  /* ---------------------------------------------------------------- */
  /* A run                                                             */
  /* ---------------------------------------------------------------- */

  function start() {
    const rng = Math.random
    const map = MAP_BY_KEY[saveRef.current.map] ?? MAPS[0]
    const w = makeWorld(map, saveRef.current.skin ?? 'grass', rng)
    w.snakes[0].safeUntil = performance.now() + SPAWN_GRACE
    worldRef.current = w
    eatenRef.current = 0
    bittenRef.current = 0
    pocketRef.current = 0
    aimRef.current = null
    dashRef.current = false
    setResult(null)
    setPlaying(true)
  }

  const end = useCallback(() => {
    const w = worldRef.current
    if (!w) return
    const me = w.snakes[0]
    const level = levelOf(me.fed)
    const found = pocketRef.current
    const pay = payout(level, eatenRef.current, me.fed) + found
    const bitten = bittenRef.current
    earn(pay)
    setSave((s) => ({
      ...s,
      runs: (s.runs ?? 0) + 1,
      eaten: (s.eaten ?? 0) + eatenRef.current,
      best: Math.max(s.best ?? 0, me.fed),
      bestLevel: Math.max(s.bestLevel ?? 1, level),
    }))
    setResult({ pay, level, eaten: eatenRef.current, bitten, found })
    setPlaying(false)
    worldRef.current = null
  }, [earn, setSave])

  useEffect(() => {
    if (!playing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let hudAt = 0
    const rng = Math.random

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const w = worldRef.current
      if (!w) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      w.t = now

      const me = w.snakes[0]

      /* --- steering ------------------------------------------------ */
      for (const s of w.snakes) {
        if (s.dead) continue
        if (s.player) {
          const aim = aimRef.current
          const want = aim ? Math.atan2(aim.y - s.y, aim.x - s.x) : s.heading
          moveSnake(s, want, dashRef.current, dt, now, w.map)
        } else {
          const think = steer(s, w)
          moveSnake(s, think.heading, think.dash, dt, now, w.map)
        }
      }

      feed(w, rng)
      pocketRef.current += collect(w, rng)

      const hits = collide(w, now)
      for (const e of hits.eaten) {
        const victim = w.snakes.find((s) => s.id === e.victim)
        if (victim) {
          scatter(victim, w, rng)
          // Anything that dies drops its purse, whoever killed it - so a
          // fight between two rivals leaves something worth going for.
          dropBounty(victim, w, rng)
        }
        if (e.by === 0) eatenRef.current++
      }
      for (const bite of hits.bites) {
        // The piece that came off goes back on the field as food, so a
        // long chase leaves a trail of it for everyone else.
        scatterBeads(bite.lost, 2, w, rng)
        const victim = w.snakes.find((s) => s.id === bite.victim)
        if (victim) victim.bittenUntil = now + 220
        if (bite.victim === 0) bittenRef.current++
      }

      if (me.dead) {
        end()
        return
      }
      restock(w, now, rng)

      /* --- drawing -------------------------------------------------- */
      const zoom = Math.max(0.46, Math.min(0.95, 0.95 - me.fed * 0.0009))
      const cam: Camera = { x: me.x, y: me.y, zoom }

      drawArena(ctx, cam, w.map)
      drawPellets(ctx, cam, w.pellets, now)
      drawCoins(ctx, cam, w.coins, now)

      // Rivals first, then you, so your own head is never buried.
      const myLevel = levelOf(me.fed)
      for (const s of w.snakes) {
        if (s.dead || s.player) continue
        const their = levelOf(s.fed)
        drawSnake(ctx, cam, s, now, their < myLevel ? 'prey' : their > myLevel ? 'danger' : 'peer')
      }
      drawSnake(ctx, cam, me, now, 'self')

      // A ring while you cannot be touched, so the grace is visible.
      if (now < me.safeUntil) {
        const left = (me.safeUntil - now) / SPAWN_GRACE
        ctx.strokeStyle = `rgba(255,255,255,${(left * 0.6).toFixed(2)})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(VIEW.width / 2, VIEW.height / 2, 34 + (1 - left) * 26, 0, Math.PI * 2)
        ctx.stroke()
      }

      finish(ctx, VIEW, {
        vignette: 0.46,
        grain: 0.04,
        bloom: 0.42,
        bloomSpread: 6,
        grade: { warm: '#ffe3b4', cool: '#1b2a4a', strength: 0.16 },
      })

      if (now - hudAt > 90) {
        hudAt = now
        const levels = w.snakes.filter((s) => !s.dead).map((s) => levelOf(s.fed))
        const rank = levels.filter((l) => l > myLevel).length + 1
        const need = fedForLevel(myLevel + 1)
        const from = fedForLevel(myLevel)
        setHud({
          level: myLevel,
          fed: me.fed,
          dash: me.dash / DASH_MAX,
          eaten: eatenRef.current,
          rank,
          of: levels.length,
          toNext: Math.max(0, Math.min(1, (me.fed - from) / Math.max(1, need - from))),
          bitten: bittenRef.current,
          pocket: pocketRef.current,
        })
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [end, playing])

  /* ---------------------------------------------------------------- */
  /* Controls                                                          */
  /* ---------------------------------------------------------------- */

  const aimAt = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const w = worldRef.current
    if (!w) return
    const me = w.snakes[0]
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * VIEW.width
    const py = ((e.clientY - box.top) / box.height) * VIEW.height
    const zoom = Math.max(0.46, Math.min(0.95, 0.95 - me.fed * 0.0009))
    // Screen back to world, so the head turns toward the actual spot.
    aimRef.current = {
      x: me.x + (px - VIEW.width / 2) / zoom,
      y: me.y + (py - VIEW.height / 2) / zoom,
    }
  }, [])

  useEffect(() => {
    const up = () => {
      dashRef.current = false
    }
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        dashRef.current = true
      }
      if (e.key === 'Escape' && !worldRef.current) onExit()
    }
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') dashRef.current = false
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
    window.addEventListener('keydown', key)
    window.addEventListener('keyup', keyUp)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', up)
      window.removeEventListener('keydown', key)
      window.removeEventListener('keyup', keyUp)
    }
  }, [onExit])

  /* ---------------------------------------------------------------- */
  /* Screens                                                           */
  /* ---------------------------------------------------------------- */

  if (playing) {
    return (
      <div style={S.wrap}>
        <div
          style={S.stage}
          onPointerMove={aimAt}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return
            aimAt(e)
            dashRef.current = true
          }}
        >
          <canvas ref={canvasRef} width={VIEW.width} height={VIEW.height} style={S.canvas} />

          <div style={S.hudTop}>
            <span style={S.level}>Level {hud.level}</span>
            <div style={S.track}>
              <div style={{ ...S.fill, width: `${Math.round(hud.toNext * 100)}%` }} />
            </div>
            <span style={S.pocket}>🪙 {hud.pocket}</span>
            <span style={S.tally}>
              {hud.rank === 1 ? 'biggest in the arena' : `#${hud.rank} of ${hud.of}`}
              {hud.eaten > 0 ? ` · ${hud.eaten} eaten` : ''}
            </span>
          </div>

          <div style={S.hudBottom}>
            <span style={S.hint}>point where you want to go · hold to dash</span>
            <div style={S.dashTrack}>
              <div
                style={{
                  ...S.dashFill,
                  width: `${Math.round(hud.dash * 100)}%`,
                  background: hud.dash > 0.15 ? '#7fd8f2' : '#e2584f',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      <div style={S.sheet}>
        <div style={S.head}>
          <h2 style={S.title}>Snake Dash</h2>
          <span style={S.coins}>🪙 {coins}</span>
        </div>

        <GiftRow from="snakedash" />

        {result && (
          <div style={S.result}>
            <strong>
              {result.eaten > 0
                ? `Level ${result.level}, and ${result.eaten} snake${result.eaten === 1 ? '' : 's'} eaten.`
                : `Level ${result.level}.`}
            </strong>{' '}
            {result.pay} 🪙
            {result.found > 0 && (
              <span style={S.bitNote}> ({result.found} of it picked up in there)</span>
            )}
            {result.bitten > 0 && (
              <span style={S.bitNote}>
                {' '}
                · bitten {result.bitten} time{result.bitten === 1 ? '' : 's'} and kept going
              </span>
            )}
          </div>
        )}

        <div style={S.pickers}>
          <p style={S.rulesHead}>Where</p>
          <div style={S.grid}>
            {MAPS.map((m) => {
              const on = (save.map ?? 'pit') === m.key
              return (
                <button
                  key={m.key}
                  style={{ ...S.card, ...(on ? S.cardOn : null) }}
                  onClick={() => setSave((v) => ({ ...v, map: m.key }))}
                >
                  <span style={S.cardName}>{m.name}</span>
                  <span style={S.cardNote}>{m.blurb}</span>
                  <span style={S.cardMeta}>
                    {m.w}×{m.h} · {m.rivals} rivals
                  </span>
                </button>
              )
            })}
          </div>

          <p style={S.rulesHead}>Skin</p>
          <div style={S.grid}>
            {SKINS.map((k) => {
              const owned = ownedSkins(save).includes(k.key)
              const on = (save.skin ?? 'grass') === k.key
              return (
                <button
                  key={k.key}
                  style={{ ...S.card, ...(on ? S.cardOn : null) }}
                  onClick={() => {
                    if (owned) {
                      setSave((v) => ({ ...v, skin: k.key }))
                      return
                    }
                    if (!spend(k.cost)) return
                    setSave((v) => ({
                      ...v,
                      skin: k.key,
                      skins: [...ownedSkins(v), k.key],
                    }))
                  }}
                >
                  <span style={S.swatchRow}>
                    <SkinSwatch skin={k.key} />
                    <span style={S.cardName}>{k.name}</span>
                  </span>
                  <span style={S.cardNote}>{k.blurb}</span>
                  <span style={S.cardMeta}>{owned ? (on ? 'worn' : 'yours') : `🪙 ${k.cost}`}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={S.rules}>
          <p style={S.rulesHead}>The only rule that matters</p>
          <ul style={S.list}>
            <li>Run into a snake <strong>below</strong> your level and you eat it.</li>
            <li>Run into one <strong>above</strong> your level and you just bounce off.</li>
            <li>Meet one face to face: the <strong>higher level wins</strong>. Lower one dies.</li>
            <li>
              If a <strong>bigger</strong> snake bites your body, you do not die - everything
              behind the bite is cut off and left as food. Keep getting bitten and it works its
              way up you, and when there is nothing left in front of the bite, that is that.
            </li>
          </ul>
          <p style={S.note}>
            Pellets make you longer. Longer makes you higher. Coins are money - run them over,
            and they keep whether you get out alive or not. Anything that dies drops its purse.
          </p>
        </div>

        <div style={S.stats}>
          <span>Best level {save.bestLevel ?? 1}</span>
          <span>{save.eaten ?? 0} eaten all told</span>
          <span>{save.runs ?? 0} runs</span>
        </div>

        <button style={S.go} onClick={start}>
          {result ? 'Go again' : 'Into the arena'}
        </button>

        <label style={S.musicRow}>
          <input
            type="checkbox"
            checked={music}
            onChange={(e) => setSave((s) => ({ ...s, music: e.target.checked }))}
          />
          <span>Music</span>
        </label>

        <button style={S.leave} onClick={onExit}>
          Leave the arena
        </button>
      </div>
    </div>
  )
}

/** A little sample of a skin, so you can choose one by looking at it. */
function SkinSwatch({ skin }: { skin: string }) {
  const k = SKIN_BY_KEY[skin]
  if (!k) return null
  const beads = [0, 1, 2, 3, 4]
  return (
    <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden>
      {beads.map((i) => {
        const hue = k.pattern === 'shift' ? (k.hue + i * 16) % 360 : k.hue
        return (
          <g key={i}>
            <circle cx={5 + i * 9} cy={7} r={6} fill={`hsl(${hue},72%,54%)`} />
            {k.pattern === 'bands' && i % 2 === 0 && (
              <circle cx={5 + i * 9} cy={7} r={3} fill={`hsl(${hue},60%,38%)`} />
            )}
            {k.pattern === 'stripe' && (
              <circle cx={5 + i * 9} cy={7} r={2} fill={`hsl(${hue},40%,84%)`} />
            )}
            {k.pattern === 'diamond' && i % 2 === 1 && (
              <rect
                x={5 + i * 9 - 3}
                y={4}
                width="6"
                height="6"
                transform={`rotate(45 ${5 + i * 9} 7)`}
                fill={`hsl(${hue},70%,26%)`}
              />
            )}
            {k.pattern === 'glow' && (
              <circle cx={5 + i * 9} cy={7} r={6} fill={`hsl(${hue},95%,70%)`} opacity={0.4} />
            )}
          </g>
        )
      })}
    </svg>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' },
  stage: {
    position: 'relative',
    width: VIEW.width,
    maxWidth: '96vw',
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'crosshair',
    touchAction: 'none',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  canvas: { display: 'block', width: '100%', height: 'auto' },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#eaf2ff',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    pointerEvents: 'none',
  },
  level: { fontWeight: 700, fontSize: 16, letterSpacing: 0.3 },
  track: { flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  fill: { height: '100%', background: '#7ff2a8' },
  tally: { fontSize: 12, opacity: 0.8 },
  pocket: { fontSize: 14, fontWeight: 700, color: '#f2c04a' },
  hudBottom: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    pointerEvents: 'none',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(234,242,255,0.6)',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  dashTrack: {
    width: 150,
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  dashFill: { height: '100%' },
  sheet: {
    width: 560,
    maxWidth: '94vw',
    background: '#111a2b',
    color: '#e6eefc',
    borderRadius: 16,
    padding: 22,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { margin: 0, fontSize: 24, fontFamily: 'Georgia, serif', color: '#8ef0b4' },
  coins: { fontSize: 15 },
  result: {
    margin: '14px 0',
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(126,242,168,0.12)',
    fontSize: 14,
  },
  pickers: { marginTop: 16 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 },
  card: {
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    padding: '8px 10px',
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e6eefc',
    cursor: 'pointer',
    font: 'inherit',
  },
  cardOn: { borderColor: '#3fb972', background: 'rgba(63,185,114,0.16)' },
  cardName: { fontWeight: 700, fontSize: 13 },
  cardNote: { fontSize: 11, opacity: 0.66, lineHeight: 1.35 },
  cardMeta: { fontSize: 11, opacity: 0.5 },
  swatchRow: { display: 'flex', alignItems: 'center', gap: 7 },
  bitNote: { opacity: 0.7 },
  rules: { marginTop: 4 },
  rulesHead: { margin: '0 0 6px', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 },
  list: { margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.65 },
  note: { fontSize: 13, opacity: 0.7, marginTop: 8, marginBottom: 0 },
  stats: { display: 'flex', gap: 16, fontSize: 13, opacity: 0.75, marginTop: 16 },
  go: {
    width: '100%',
    marginTop: 18,
    padding: '12px 16px',
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: '#3fb972',
    color: '#06210f',
    cursor: 'pointer',
  },
  musicRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 14, opacity: 0.8 },
  leave: {
    display: 'block',
    margin: '12px auto 0',
    background: 'none',
    border: 'none',
    color: 'rgba(230,238,252,0.6)',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 13,
  },
}
