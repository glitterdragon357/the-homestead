import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { useAmbientMusic } from '../../audio/useAmbientMusic'
import { finish } from '../../engine/polish'
import {
  VIEW,
  drawArena,
  drawChests,
  drawCoins,
  drawFriend,
  drawPellets,
  drawSnake,
  type Camera,
} from './snakeDraw'
import {
  DASH_MAX,
  CHESTS_FOR_ELEMENTAL,
  COMPANIONS,
  COMPANION_BY_KEY,
  MAPS,
  MAP_BY_KEY,
  nipOf,
  SKINS,
  SKIN_BY_KEY,
  SKIN_FAMILIES,
  ownedSkins,
  SPAWN_GRACE,
  fedForLevel,
  initialSnake,
  VANISH_TOLL,
  IDLE_STOP,
  RUN_LIMIT,
  winnerBonus,
  type Ending,
  levelOf,
  payout,
  type SnakeSave,
} from './snakeData'
import {
  collect,
  collide,
  crack,
  dropBounty,
  feed,
  makeFriend,
  nipAll,
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
    nips: number
    how: Ending
    won: boolean
    chests: number
    earnedElemental: boolean
  }>(null)
  const [hud, setHud] = useState({ level: 1, fed: 0, dash: 1, eaten: 0, rank: 1, of: 9, toNext: 0, bitten: 0, pocket: 0, vanish: false, left: RUN_LIMIT, idle: IDLE_STOP })

  const [filter, setFilter] = useState<'all' | 'yours' | 'affordable'>('all')
  const [denied, setDenied] = useState<string | null>(null)
  const owned = ownedSkins(save)
  const kennel = save.companions ?? []

  const eatenRef = useRef(0)
  const bittenRef = useRef(0)
  const pocketRef = useRef(0)
  const nipsRef = useRef(0)
  const chestsRef = useRef(0)
  const activeRef = useRef(0)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const endingRef = useRef<Ending>('eaten')

  /* ---------------------------------------------------------------- */
  /* A run                                                             */
  /* ---------------------------------------------------------------- */

  function start() {
    const rng = Math.random
    const map = MAP_BY_KEY[saveRef.current.map] ?? MAPS[0]
    const skin = saveRef.current.skin ?? 'grass'

    // Nobody charges a toll every time it goes out. Taking it before the
    // world is built means a refused payment cannot leave a run half
    // started with a skin that was never paid for.
    if (skin === 'nobody' && !spend(VANISH_TOLL)) {
      setDenied(`Nobody costs ${VANISH_TOLL} 🪙 a run. You have ${coins}.`)
      return
    }
    setDenied(null)

    const yours = COMPANION_BY_KEY[saveRef.current.companion ?? '']
    const w = makeWorld(map, skin, rng, yours?.cost ?? 0)
    w.snakes[0].friend = makeFriend(yours?.key ?? null, w.snakes[0].x, w.snakes[0].y)
    w.snakes[0].safeUntil = performance.now() + SPAWN_GRACE
    worldRef.current = w
    eatenRef.current = 0
    bittenRef.current = 0
    pocketRef.current = 0
    nipsRef.current = 0
    chestsRef.current = 0
    activeRef.current = performance.now()
    lastPointRef.current = null
    endingRef.current = 'eaten'
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
    const how = endingRef.current

    // Biggest in the arena when the clock ran out is a win. Being eaten
    // or wandering off is not, however big you were.
    const biggest = w.snakes.every((s) => s.dead || s.player || levelOf(s.fed) <= level)
    const won = how === 'time' && biggest && !me.dead

    const pay =
      payout(level, eatenRef.current, me.fed) + found + (won ? winnerBonus(level) : 0)
    const bitten = bittenRef.current
    const chests = (saveRef.current.chests ?? 0) + chestsRef.current
    const earnedNow =
      chests >= CHESTS_FOR_ELEMENTAL && !ownedSkins(saveRef.current).includes('elemental')
    earn(pay)
    setSave((s) => ({
      ...s,
      chests,
      skins: earnedNow ? [...ownedSkins(s), 'elemental'] : s.skins,
      runs: (s.runs ?? 0) + 1,
      eaten: (s.eaten ?? 0) + eatenRef.current,
      best: Math.max(s.best ?? 0, me.fed),
      bestLevel: Math.max(s.bestLevel ?? 1, level),
      wins: (s.wins ?? 0) + (won ? 1 : 0),
    }))
    setResult({
      pay,
      level,
      eaten: eatenRef.current,
      bitten,
      found,
      nips: nipsRef.current,
      how,
      won,
      chests: chestsRef.current,
      earnedElemental: earnedNow,
    })
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
      if (w.startedAt === 0) w.startedAt = now

      // Nobody is unseen for the whole run, not on a cycle.
      me.unseen = me.pattern === 'vanish' ? 1 : 0

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
      const cracked = crack(w, now, rng)
      pocketRef.current += cracked.coins
      chestsRef.current += cracked.opened
      for (const n of nipAll(w, now, dt)) if (n.owner === 0) nipsRef.current++

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
        // long chase leaves a trail of it for everyone else - and it is
        // still that snake's colour, so you can see whose tail it was.
        const victim = w.snakes.find((s) => s.id === bite.victim)
        scatterBeads(bite.lost, 2, w, rng, victim, bite.at)
        if (victim) victim.bittenUntil = now + 220
        if (bite.victim === 0) bittenRef.current++
      }

      if (me.dead) {
        endingRef.current = 'eaten'
        end()
        return
      }

      // Left sitting? Hand the run back with everything still on it.
      if (now - activeRef.current > IDLE_STOP) {
        endingRef.current = 'idle'
        end()
        return
      }

      // Nothing runs longer than ten minutes.
      if (now - w.startedAt > RUN_LIMIT) {
        endingRef.current = 'time'
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
      drawChests(ctx, cam, w.chests, now)

      // Rivals first, then you, so your own head is never buried.
      const myLevel = levelOf(me.fed)
      for (const s of w.snakes) {
        if (s.dead || s.player) continue
        const their = levelOf(s.fed)
        drawSnake(ctx, cam, s, now, their < myLevel ? 'prey' : their > myLevel ? 'danger' : 'peer')
      }
      drawSnake(ctx, cam, me, now, 'self')
      // Every companion in the arena, over the snakes so none is buried.
      for (const s of w.snakes) {
        if (!s.dead && s.friend) drawFriend(ctx, cam, s.friend, w.snakes, now)
      }

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
          vanish: me.pattern === 'vanish',
          left: Math.max(0, RUN_LIMIT - (now - w.startedAt)),
          idle: Math.max(0, IDLE_STOP - (now - activeRef.current)),
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

    // Only a pointer that actually went somewhere counts as playing.
    //
    // A cursor left sitting on the window still produces a stream of
    // pointermove events - a thousand of them in twenty seconds, over an
    // animating canvas - so treating any move as activity meant the idle
    // rule could never fire. Resting your mouse on the page is not
    // playing, and this is what tells the difference.
    const was = lastPointRef.current
    if (!was || Math.abs(e.clientX - was.x) > 2 || Math.abs(e.clientY - was.y) > 2) {
      activeRef.current = performance.now()
      lastPointRef.current = { x: e.clientX, y: e.clientY }
    }
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
      activeRef.current = performance.now()
      if (e.key === 'Escape' && !worldRef.current) onExit()
    }
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') dashRef.current = false
    }
    const back = () => {
      // A hidden tab does not animate, so its clock never advances. What
      // must not happen is the run ending the instant you look at it
      // again because the timer had been sitting idle all along.
      if (!document.hidden) activeRef.current = performance.now()
    }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('focus', back)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
    window.addEventListener('keydown', key)
    window.addEventListener('keyup', keyUp)
    return () => {
      document.removeEventListener('visibilitychange', back)
      window.removeEventListener('focus', back)
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
            {hud.vanish && <span style={S.vanish}>unseen</span>}
            <span style={{ ...S.clock, color: hud.left < 60_000 ? '#ffb4a2' : 'rgba(234,242,255,0.65)' }}>
              {Math.floor(hud.left / 60000)}:{String(Math.floor((hud.left % 60000) / 1000)).padStart(2, '0')}
            </span>
            <span style={S.pocket}>🪙 {hud.pocket}</span>
            <span style={S.tally}>
              {hud.rank === 1 ? 'biggest in the arena' : `#${hud.rank} of ${hud.of}`}
              {hud.eaten > 0 ? ` · ${hud.eaten} eaten` : ''}
            </span>
          </div>

          {hud.idle < 10_000 && (
            <div style={S.idleWarn}>
              Still there? Ending in {Math.ceil(hud.idle / 1000)} - your loot is safe either way.
            </div>
          )}

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
            {result.won && <span style={S.won}>Winner</span>}
            {result.how === 'time' && !result.won && (
              <span style={S.ended}>Ten minutes up — something in there was bigger.</span>
            )}
            {result.how === 'idle' && (
              <span style={S.ended}>You left it a while. Run handed back, loot and all.</span>
            )}
            <strong>
              {result.eaten > 0
                ? `Level ${result.level}, and ${result.eaten} snake${result.eaten === 1 ? '' : 's'} eaten.`
                : `Level ${result.level}.`}
            </strong>{' '}
            {result.pay} 🪙
            {result.earnedElemental && (
              <span style={S.won}>Elemental unlocked</span>
            )}
            {result.chests > 0 && (
              <span style={S.bitNote}>
                {' '}
                · {result.chests} chest{result.chests === 1 ? '' : 's'} open
              </span>
            )}
            {result.nips > 0 && (
              <span style={S.bitNote}>
                {' '}
                · {COMPANION_BY_KEY[save.companion ?? '']?.name ?? 'Your companion'} nipped{' '}
                {result.nips} times
              </span>
            )}
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
          <div style={S.sectionHead}>
            <p style={S.rulesHead}>Where · {MAPS.length} arenas</p>
          </div>
          <div style={S.scroller}>
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
                      {m.w}×{m.h} · {m.rivals} rivals ·{' '}
                      {m.loot === 'chests' ? 'chests' : m.loot === 'none' ? 'no coins' : 'coins'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={S.sectionHead}>
            <p style={S.rulesHead}>Companion</p>
            <span style={S.filters}>
              {save.companion && (
                <button
                  style={S.chip}
                  onClick={() => setSave((v) => ({ ...v, companion: null }))}
                >
                  send it home
                </button>
              )}
            </span>
          </div>
          <div style={S.scroller}>
            <div style={S.grid}>
              {COMPANIONS.map((c) => {
                const have = kennel.includes(c.key)
                const on = save.companion === c.key
                return (
                  <button
                    key={c.key}
                    style={{
                      ...S.card,
                      ...(on ? S.cardOn : null),
                      ...(!have && c.cost > coins ? S.cardBroke : null),
                    }}
                    onClick={() => {
                      if (have) {
                        setSave((v) => ({ ...v, companion: on ? null : c.key }))
                        return
                      }
                      if (!spend(c.cost)) return
                      setSave((v) => ({
                        ...v,
                        companion: c.key,
                        companions: [...(v.companions ?? []), c.key],
                      }))
                    }}
                  >
                    <span style={S.cardName}>{c.name}</span>
                    <span style={S.cardNote}>{c.blurb}</span>
                    <span style={S.cardMeta}>
                      {have ? (on ? 'with you' : 'in the kennel') : `🪙 ${c.cost}`} · nips {nipOf(c.cost)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={S.sectionHead}>
            <p style={S.rulesHead}>
              Skin · {owned.length} of {SKINS.length}
            </p>
            <span style={S.filters}>
              {(['all', 'yours', 'affordable'] as const).map((f) => (
                <button
                  key={f}
                  style={{ ...S.chip, ...(filter === f ? S.chipOn : null) }}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </span>
          </div>
          <div style={S.scroller}>
            {SKIN_FAMILIES.map((family) => {
              const mine = SKINS.filter((k) => {
                if (k.family !== family) return false
                if (filter === 'yours') return owned.includes(k.key)
                if (filter === 'affordable') return !owned.includes(k.key) && k.cost <= coins
                return true
              })
              if (mine.length === 0) return null
              return (
                <div key={family}>
                  <p style={S.family}>{family}</p>
                  <div style={S.grid}>
                    {mine.map((k) => {
                      const have = owned.includes(k.key)
                      const on = (save.skin ?? 'grass') === k.key
                      return (
                        <button
                          key={k.key}
                          style={{
                            ...S.card,
                            ...(on ? S.cardOn : null),
                            ...(!have && k.cost > coins ? S.cardBroke : null),
                          }}
                          onClick={() => {
                            if (have) {
                              setSave((v) => ({ ...v, skin: k.key }))
                              return
                            }
                            if (!spend(k.cost)) return
                            setSave((v) => ({ ...v, skin: k.key, skins: [...ownedSkins(v), k.key] }))
                          }}
                        >
                          <span style={S.swatchRow}>
                            <SkinSwatch skin={k.key} />
                            <span style={S.cardName}>{k.name}</span>
                          </span>
                          <span style={S.cardNote}>{k.blurb}</span>
                          <span style={S.cardMeta}>
                            {have ? (on ? 'worn' : 'yours') : `🪙 ${k.cost}`}
                            {k.key === 'nobody' ? ` · ${VANISH_TOLL} 🪙 a run` : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
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
          <p style={S.note}>
            A companion swims with you and takes pieces out of whatever comes near, however big
            it is - but it never lands the last bite. Chewing something down to a size you can
            swallow is what it is for. The dearer it is, the more it takes.
          </p>
        </div>

        <div style={S.stats}>
          <span>Best level {save.bestLevel ?? 1}</span>
          <span>{save.eaten ?? 0} eaten all told</span>
          <span>{save.runs ?? 0} runs</span>
          <span>{save.wins ?? 0} won on the clock</span>
          <span>
            {save.chests ?? 0} chests
            {ownedSkins(save).includes('elemental')
              ? ''
              : ` of ${CHESTS_FOR_ELEMENTAL} for Elemental`}
          </span>
        </div>

        {denied && <div style={S.denied}>{denied}</div>}

        <button style={S.go} onClick={start}>
          {result ? 'Go again' : 'Into the arena'}
          {(save.skin ?? 'grass') === 'nobody' ? ` · ${VANISH_TOLL} 🪙` : ''}
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
  const sat = k.sat ?? 72
  const body = (h: number) => `hsl(${h},${sat}%,54%)`
  return (
    <svg width="48" height="14" viewBox="0 0 48 14" aria-hidden style={{ flexShrink: 0 }}>
      {beads.map((i) => {
        const hue = k.pattern === 'shift' ? (k.hue + i * 18) % 360 : k.hue
        const cx = 5 + i * 9
        return (
          <g key={i} opacity={k.pattern === 'ghost' ? 0.5 : 1}>
            <circle cx={cx} cy={7} r={6} fill={body(hue)} />
            {k.pattern === 'bands' && i % 2 === 0 && (
              <circle cx={cx} cy={7} r={3} fill={`hsl(${hue},60%,38%)`} />
            )}
            {k.pattern === 'stripe' && <circle cx={cx} cy={7} r={2} fill={`hsl(${hue},40%,84%)`} />}
            {k.pattern === 'diamond' && i % 2 === 1 && (
              <rect
                x={cx - 3}
                y={4}
                width="6"
                height="6"
                transform={`rotate(45 ${cx} 7)`}
                fill={`hsl(${k.accent},70%,30%)`}
              />
            )}
            {k.pattern === 'speckle' && i % 3 !== 2 && (
              <circle cx={cx + 1} cy={5.5} r={1.4} fill={`hsl(${k.accent},55%,72%)`} />
            )}
            {k.pattern === 'rings' && i % 2 === 0 && (
              <circle cx={cx} cy={7} r={3.6} fill="none" stroke={`hsl(${k.accent},72%,66%)`} strokeWidth="1.3" />
            )}
            {k.pattern === 'ladder' && i % 2 === 0 && (
              <rect x={cx - 4} y={6.2} width="8" height="1.8" fill={`hsl(${k.accent},60%,64%)`} />
            )}
            {k.pattern === 'twotone' && i < 2 && (
              <circle cx={cx} cy={7} r={5} fill={`hsl(${k.accent},62%,50%)`} />
            )}
            {k.pattern === 'metal' && (
              <ellipse cx={cx - 1} cy={5} rx="2.6" ry="1.2" fill="rgba(255,255,255,0.55)" />
            )}
            {k.pattern === 'skull' && i % 2 === 0 && (
              <>
                <circle cx={cx} cy={6} r={3} fill="#ece4d6" />
                <circle cx={cx - 1.1} cy={5.6} r={0.8} fill="#201a16" />
                <circle cx={cx + 1.1} cy={5.6} r={0.8} fill="#201a16" />
              </>
            )}
            {k.pattern === 'bones' && (
              <path
                d={`M${cx} 4 q3 2 2.6 5 M${cx} 4 q-3 2 -2.6 5`}
                stroke="#ece4d6"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
            )}
            {k.pattern === 'scales' && (
              <path
                d={`M${cx - 4} 8 a3 3 0 0 1 4 0 a3 3 0 0 1 4 0`}
                stroke={`hsl(${k.accent},46%,34%)`}
                strokeWidth="1.1"
                fill="none"
              />
            )}
            {k.pattern === 'spikes' && i % 2 === 0 && (
              <path d={`M${cx - 2.6} 7 L${cx} 1 L${cx + 2.6} 7 Z`} fill={`hsl(${k.accent},34%,74%)`} />
            )}
            {k.pattern === 'eyes' && i % 2 === 0 && (
              <>
                <circle cx={cx} cy={7} r={2.4} fill={`hsl(${k.accent},62%,80%)`} />
                <circle cx={cx} cy={7} r={1.1} fill="#151020" />
              </>
            )}
            {k.pattern === 'stitch' && i % 2 === 0 && (
              <path
                d={`M${cx - 1.5} 4 h3 M${cx - 1.5} 7 h3 M${cx - 1.5} 10 h3`}
                stroke="#ece4d6"
                strokeWidth="0.9"
              />
            )}
            {k.pattern === 'chevron' && i % 2 === 0 && (
              <path
                d={`M${cx - 3} 9 L${cx} 4.5 L${cx + 3} 9`}
                stroke={`hsl(${k.accent},58%,34%)`}
                strokeWidth="1.4"
                fill="none"
                strokeLinejoin="round"
              />
            )}
            {k.pattern === 'web' && (
              <path
                d={`M${cx} 7 l3 -2.5 M${cx} 7 l-3 1.5 M${cx} 7 l1 3`}
                stroke="#ddd6cb"
                strokeWidth="0.7"
                fill="none"
              />
            )}
            {k.pattern === 'vanish' && (
              <circle cx={cx} cy={7} r={6} fill={body(hue)} opacity={i < 2 ? 1 : 0.16} />
            )}
            {k.pattern === 'glow' && (
              <circle cx={cx} cy={7} r={6} fill={`hsl(${hue},95%,70%)`} opacity={0.42} />
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
  clock: { fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  idleWarn: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 700,
    color: '#ffe6b4',
    textShadow: '0 2px 12px rgba(0,0,0,0.8)',
    pointerEvents: 'none',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  won: {
    display: 'inline-block',
    marginRight: 8,
    padding: '2px 10px',
    borderRadius: 20,
    background: '#f2c04a',
    color: '#2b2008',
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  ended: { display: 'block', fontSize: 12, opacity: 0.72, marginBottom: 4 },
  vanish: {
    fontSize: 12,
    fontWeight: 700,
    color: '#bfe4ff',
    border: '1px solid rgba(191,228,255,0.4)',
    borderRadius: 20,
    padding: '1px 9px',
  },
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
    width: 600,
    maxWidth: '94vw',
    // The picker is long now. Without this the bottom of it - including
    // the button that starts the game - is simply off the screen.
    maxHeight: '92vh',
    overflowY: 'auto',
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
  sectionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  // Each list scrolls in its own right, so choosing a skin does not mean
  // scrolling past twenty-five arenas to get back to the button.
  scroller: {
    maxHeight: 250,
    overflowY: 'auto',
    paddingRight: 6,
    marginBottom: 14,
    borderRadius: 10,
    background: 'rgba(0,0,0,0.16)',
    padding: 8,
  },
  family: {
    margin: '6px 2px 6px',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  filters: { display: 'flex', gap: 5 },
  chip: {
    font: 'inherit',
    fontSize: 11,
    padding: '3px 9px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: 'rgba(230,238,252,0.65)',
    cursor: 'pointer',
  },
  chipOn: { background: '#3fb972', color: '#06210f', border: '1px solid #3fb972', fontWeight: 700 },
  cardBroke: { opacity: 0.42 },
  denied: {
    marginTop: 14,
    padding: '9px 12px',
    borderRadius: 9,
    background: 'rgba(226,88,79,0.16)',
    fontSize: 13,
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
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
  cardOn: { border: '1px solid #3fb972', background: 'rgba(63,185,114,0.16)' },
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
