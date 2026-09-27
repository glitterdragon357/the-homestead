import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { useAmbientMusic } from '../../audio/useAmbientMusic'
import {
  ABILITY_BY_KIND,
  IN_LOVE,
  RARITY_NAMES,
  TYPE_COUNT,
  breed,
  collected,
  fondness,
  givenName,
  initialDragons,
  typeOf,
  type Dragon,
  type DragonSave,
  type House,
} from './dragonData'
import {
  SHIFT,
  leftOf,
  makeNursery,
  moveHeld,
  pick,
  settle,
  standing,
  step,
  unwrap,
  type Nursery,
} from './dragonNursery'
import { VIEW, drawNursery, drawPortrait } from './dragonDraw'

/**
 * All Dragons.
 *
 * Two halves that feed each other. The nursery is the half you play: a
 * room of eggs and the dragonettes that already hatched, none of which
 * can hold on to what it can do. The houses are the half you keep - the
 * ones that got out of the nursery, who they took to, and what the pairs
 * put back into the nursery afterwards.
 *
 * There is no table of dragon types anywhere in here. A type is four
 * numbers, breeding moves those numbers, and the five thousand six
 * hundred of them are what the four numbers can spell.
 */

type Screen = 'home' | 'nursery'

export function AllDragonsMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<DragonSave>('dragons', () => initialDragons)
  const { coins, earn } = usePurse('dragons')
  const saveRef = useRef(save)
  saveRef.current = save

  const [screen, setScreen] = useState<Screen>('home')
  const [note, setNote] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const roomRef = useRef<Nursery | null>(null)
  const heldRef = useRef<{ kind: string; id: number } | null>(null)
  const [hud, setHud] = useState({ left: SHIFT, standing: 0, lost: 0, babies: 0 })
  const [result, setResult] = useState<null | {
    hatched: number
    lost: number
    pay: number
    fresh: string[]
  }>(null)

  useAmbientMusic(save.music !== false, screen === 'nursery' ? 'drive' : 'calm', 0.4)

  const dragons = save.dragons ?? []
  const houses = save.houses ?? []
  const eggsWaiting = dragons.filter((d) => d.stage === 'egg' && d.house === null)
  const inNursery = dragons.filter((d) => d.stage === 'dragonette')
  const grown = dragons.filter((d) => d.stage === 'grown')

  /* ---------------------------------------------------------------- */
  /* Getting started                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * The first clutch.
   *
   * Handed over rather than earned, because there is nothing to breed
   * with until something hatches and no way to start otherwise.
   */
  const firstClutch = useCallback(() => {
    setSave((s) => {
      if ((s.dragons ?? []).length > 0) return s
      let id = s.nextId ?? 1
      const eggs: Dragon[] = [...Array(5)].map(() => {
        const code = Math.floor(Math.random() * TYPE_COUNT)
        return {
          id: id,
          code,
          name: givenName(id++),
          stage: 'egg' as const,
          house: null,
          grown: 0,
        }
      })
      return { ...s, dragons: eggs, nextId: id }
    })
  }, [setSave])

  /* ---------------------------------------------------------------- */
  /* A shift in the nursery                                            */
  /* ---------------------------------------------------------------- */

  function startShift() {
    const s = saveRef.current
    const eggs = (s.dragons ?? []).filter((d) => d.stage === 'egg' && d.house === null)
    if (eggs.length === 0) {
      setNote('Nothing in the nursery to mind. Pair two dragons up and send the egg here.')
      return
    }
    const minders = (s.dragons ?? []).filter((d) => d.stage === 'dragonette')
    const room = makeNursery(eggs, minders, Math.random)
    room.startedAt = performance.now()
    roomRef.current = room
    heldRef.current = null
    setResult(null)
    setNote(null)
    setScreen('nursery')
  }

  const endShift = useCallback(() => {
    const room = roomRef.current
    if (!room) return
    const now = performance.now()
    const lostIds = new Set(room.eggs.filter((e) => e.lost).map((e) => e.id))
    const hatchedIds = new Set(room.eggs.filter((e) => e.hatched).map((e) => e.id))
    // The room's egg ids are its own, so match back by position in the
    // clutch rather than by id.
    const clutch = (saveRef.current.dragons ?? []).filter(
      (d) => d.stage === 'egg' && d.house === null
    )
    const byIndex = room.eggs.map((e, i) => ({ e, d: clutch[i] }))

    const fresh: string[] = []
    let hatched = 0
    let lost = 0

    setSave((s) => {
      const seen = new Set(s.seen ?? [])
      const next = (s.dragons ?? []).map((d) => ({ ...d }))
      for (const { e, d } of byIndex) {
        if (!d) continue
        const me = next.find((x) => x.id === d.id)
        if (!me) continue
        if (lostIds.has(e.id)) {
          me.stage = 'egg'
          me.house = -1 // gone. kept in the record rather than deleted.
          lost++
        } else if (hatchedIds.has(e.id)) {
          me.stage = 'dragonette'
          me.grown = 0
          hatched++
          if (!seen.has(me.code)) {
            seen.add(me.code)
            fresh.push(typeOf(me.code).name)
          }
        }
      }
      // Everyone who was already a dragonette got a shift older. Three
      // shifts in the nursery and they are ready for a house.
      for (const d of next) {
        if (d.stage !== 'dragonette') continue
        d.grown = Math.min(1, (d.grown ?? 0) + 0.34)
      }
      return {
        ...s,
        dragons: next,
        seen: [...seen],
        shifts: (s.shifts ?? 0) + 1,
        lost: (s.lost ?? 0) + lost,
      }
    })

    // Paid for the eggs that came through, not for turning up.
    const pay = hatched * 46 + (lost === 0 ? 60 : 0)
    if (pay > 0) earn(pay)
    setResult({ hatched, lost, pay, fresh })
    roomRef.current = null
    setScreen('home')
    void now
  }, [earn, setSave])

  useEffect(() => {
    if (screen !== 'nursery') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let last = performance.now()
    let hudAt = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const room = roomRef.current
      if (!room) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      step(room, now, dt, Math.random)
      drawNursery(ctx, room, now)

      if (now - hudAt > 100) {
        hudAt = now
        setHud({
          left: leftOf(room, now),
          standing: standing(room),
          lost: room.lost,
          babies: room.babies.length,
        })
      }
      // The bell, or nothing left to mind.
      if (leftOf(room, now) <= 0 || standing(room) === 0) endShift()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [screen, endShift])

  function at(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * VIEW.w,
      y: ((e.clientY - r.top) / r.height) * VIEW.h,
    }
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    const room = roomRef.current
    if (!room) return
    if (e.button !== 0) return
    const p = at(e)
    const hit = pick(room, p.x, p.y)
    if (!hit) return
    const now = performance.now()
    if (hit.kind === 'baby') {
      settle(room, hit.id, now)
      return
    }
    if (hit.kind === 'egg') {
      const egg = room.eggs.find((x) => x.id === hit.id)
      // Silk first. Picking up a smothered egg and carrying it about
      // does not help it; getting the silk off does.
      if (egg && egg.silk > 0) {
        unwrap(room, hit.id)
        return
      }
      if (egg) egg.held = true
    }
    if (hit.kind === 'prop') {
      const prop = room.props.find((x) => x.id === hit.id)
      if (prop) prop.held = true
    }
    heldRef.current = hit
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const room = roomRef.current
    const held = heldRef.current
    if (!room || !held) return
    // Nothing is being dragged unless a button is actually down.
    //
    // A pointerup that lands somewhere other than this canvas - which is
    // what happens when the press that started a shift is still in
    // flight as the screen changes under it - never reaches the release
    // handler, and the grab stays live. Every move after that dragged
    // whatever it was holding, so eggs followed the cursor around the
    // room and ended up in a heap.
    if (e.buttons === 0) {
      up()
      return
    }
    const p = at(e)
    moveHeld(room, held, p.x, p.y)
  }

  function up() {
    const room = roomRef.current
    const held = heldRef.current
    if (room && held) {
      if (held.kind === 'egg') {
        const egg = room.eggs.find((x) => x.id === held.id)
        if (egg) egg.held = false
      } else if (held.kind === 'prop') {
        const prop = room.props.find((x) => x.id === held.id)
        if (prop) prop.held = false
      }
    }
    heldRef.current = null
  }

  /* ---------------------------------------------------------------- */
  /* Houses                                                            */
  /* ---------------------------------------------------------------- */

  /** A grown dragon that has no house gets one. */
  const buildHouse = useCallback(
    (who: number) => {
      setSave((s) => {
        const next = (s.dragons ?? []).map((d) => ({ ...d }))
        const me = next.find((d) => d.id === who)
        if (!me || me.stage !== 'grown' || me.house !== null) return s
        const id = s.nextHouse ?? 1
        me.house = id
        return {
          ...s,
          dragons: next,
          houses: [...(s.houses ?? []), { id, name: `${me.name}'s`, living: [who] }],
          nextHouse: id + 1,
        }
      })
    },
    [setSave]
  )

  /** Move one in with the other. Only if they have taken to each other. */
  const moveIn = useCallback(
    (who: number, into: number) => {
      setSave((s) => {
        const next = (s.dragons ?? []).map((d) => ({ ...d }))
        const me = next.find((d) => d.id === who)
        const houses = (s.houses ?? []).map((h) => ({ ...h, living: [...h.living] }))
        const to = houses.find((h) => h.id === into)
        if (!me || !to || to.living.length >= 2) return s
        const other = next.find((d) => d.id === to.living[0])
        if (!other || fondness(me, other) < IN_LOVE) return s
        // Out of wherever it was.
        for (const h of houses) h.living = h.living.filter((x) => x !== who)
        to.living.push(who)
        me.house = to.id
        return { ...s, dragons: next, houses: houses.filter((h) => h.living.length > 0) }
      })
    },
    [setSave]
  )

  /**
   * A pair has an egg.
   *
   * Where it goes is the choice. Keeping it at the house is the safe
   * option and the slow one - it sits there and hatches on its own with
   * nothing to threaten it and nothing to mind. Sending it to the
   * nursery means it is on the floor with the wild ones, which is what
   * three quarters of people do, because that is where you are.
   */
  const layEgg = useCallback(
    (houseId: number) => {
      setSave((s) => {
        const houses = s.houses ?? []
        const h = houses.find((x) => x.id === houseId)
        if (!h || h.living.length < 2) return s
        const dragons = s.dragons ?? []
        const mum = dragons.find((d) => d.id === h.living[0])
        const dad = dragons.find((d) => d.id === h.living[1])
        if (!mum || !dad) return s
        const id = s.nextId ?? 1
        const code = breed(mum.code, dad.code, Math.random)
        const egg: Dragon = {
          id,
          code,
          name: givenName(id),
          stage: 'egg',
          house: s.toNursery ? null : houseId,
          parents: [mum.id, dad.id],
          grown: 0,
        }
        return { ...s, dragons: [...dragons, egg], nextId: id + 1 }
      })
      setNote(
        saveRef.current.toNursery
          ? 'Egg sent to the nursery. It will be on the floor next shift.'
          : 'Egg kept at the house. It will hatch there in its own time, unminded.'
      )
    },
    [setSave]
  )

  /** Eggs kept at home hatch quietly between shifts. */
  const settleHomeEggs = useCallback(() => {
    setSave((s) => {
      const next = (s.dragons ?? []).map((d) => ({ ...d }))
      const seen = new Set(s.seen ?? [])
      let any = false
      for (const d of next) {
        if (d.stage !== 'egg' || d.house === null || d.house < 0) continue
        d.stage = 'grown'
        d.grown = 1
        seen.add(d.code)
        any = true
      }
      return any ? { ...s, dragons: next, seen: [...seen] } : s
    })
  }, [setSave])

  /** Dragonettes old enough leave the nursery. */
  const growUp = useCallback(() => {
    setSave((s) => {
      const next = (s.dragons ?? []).map((d) => ({ ...d }))
      let any = false
      for (const d of next) {
        if (d.stage === 'dragonette' && (d.grown ?? 0) >= 1) {
          d.stage = 'grown'
          any = true
        }
      }
      return any ? { ...s, dragons: next } : s
    })
  }, [setSave])

  useEffect(() => {
    growUp()
  }, [save.shifts, growUp])

  /* ---------------------------------------------------------------- */
  /* Screens                                                           */
  /* ---------------------------------------------------------------- */

  if (screen === 'nursery') {
    return (
      <div style={S.wrap}>
        <div style={S.stage}>
          <canvas
            ref={canvasRef}
            width={VIEW.w}
            height={VIEW.h}
            style={S.canvas}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
          <div style={S.hudTop}>
            <span style={S.clock}>
              {Math.floor(hud.left / 60000)}:
              {String(Math.floor((hud.left % 60000) / 1000)).padStart(2, '0')}
            </span>
            <span style={S.count}>{hud.standing} still in the shell</span>
            <span style={{ ...S.count, color: hud.lost ? '#ffb0a0' : undefined }}>
              {hud.lost} lost
            </span>
            <span style={S.count}>{hud.babies} loose</span>
            <button style={S.chip} onClick={endShift}>
              end the shift
            </button>
          </div>
          <div style={S.hudBottom}>
            drag an egg out of the way · click a dragonette to settle it · click a silked egg to
            pull it off
          </div>
        </div>
      </div>
    )
  }

  const seenCount = collected(save)

  return (
    <div style={S.wrap}>
      <div style={S.sheet}>
        <div style={S.head}>
          <h2 style={S.title}>All Dragons</h2>
          <span style={S.coins}>🪙 {coins}</span>
        </div>

        <GiftRow from="dragons" />

        {result && (
          <div style={S.result}>
            <strong>
              {result.hatched} through the shell
              {result.lost > 0 ? `, ${result.lost} lost` : ', none lost'}.
            </strong>{' '}
            {result.pay > 0 ? `${result.pay} 🪙` : ''}
            {result.fresh.length > 0 && (
              <div style={S.fresh}>
                New to you: {result.fresh.join(', ')}
              </div>
            )}
          </div>
        )}
        {note && <p style={S.note}>{note}</p>}

        <div style={S.rowWrap}>
          <span style={S.stat}>
            <strong>{seenCount}</strong> of {TYPE_COUNT.toLocaleString()} types met
          </span>
          <span style={S.stat}>
            <strong>{grown.length}</strong> grown
          </span>
          <span style={S.stat}>
            <strong>{inNursery.length}</strong> dragonettes
          </span>
          <span style={S.stat}>
            <strong>{eggsWaiting.length}</strong> eggs in the nursery
          </span>
          <span style={S.stat}>
            <strong>{save.shifts ?? 0}</strong> shifts
          </span>
        </div>

        {dragons.length === 0 ? (
          <div style={S.empty}>
            <p style={S.emptyLine}>
              A clutch has been left with you. Nobody knows what is in them until they open.
            </p>
            <button style={S.go} onClick={firstClutch}>
              Take the clutch
            </button>
          </div>
        ) : (
          <>
            <div style={S.actions}>
              <button style={S.go} onClick={startShift}>
                Mind the nursery
                {eggsWaiting.length > 0
                  ? ` · ${eggsWaiting.length} egg${eggsWaiting.length === 1 ? '' : 's'}`
                  : ''}
              </button>
              <label style={S.toggle}>
                <input
                  type="checkbox"
                  checked={save.toNursery !== false}
                  onChange={(e) => setSave((s) => ({ ...s, toNursery: e.target.checked }))}
                />
                new eggs go to the nursery
              </label>
              {dragons.some((d) => d.stage === 'egg' && (d.house ?? 0) > 0) && (
                <button style={S.chip} onClick={settleHomeEggs}>
                  check the eggs kept at home
                </button>
              )}
            </div>

            <Nurseryside inNursery={inNursery} eggs={eggsWaiting} />

            <Homeside
              houses={houses}
              dragons={dragons}
              onBuild={buildHouse}
              onMoveIn={moveIn}
              onEgg={layEgg}
            />
          </>
        )}

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

/* ------------------------------------------------------------------ */
/* The nursery, as a list                                              */
/* ------------------------------------------------------------------ */

function Nurseryside({ inNursery, eggs }: { inNursery: Dragon[]; eggs: Dragon[] }) {
  if (inNursery.length === 0 && eggs.length === 0) return null
  return (
    <>
      <p style={S.sectionHead}>In the nursery</p>
      <div style={S.grid}>
        {eggs.map((d) => (
          <div key={d.id} style={S.card}>
            <Face code={d.code} egg />
            <span style={S.cardName}>An egg</span>
            <span style={S.cardNote}>
              {d.parents ? 'Sent down from a house' : 'Nobody knows yet'}
            </span>
          </div>
        ))}
        {inNursery.map((d) => {
          const t = typeOf(d.code)
          return (
            <div key={d.id} style={S.card}>
              <Face code={d.code} />
              <span style={S.cardName}>{d.name}</span>
              <span style={S.cardNote}>{t.name}</span>
              <span style={S.cardMeta}>
                {ABILITY_BY_KIND[t.ability].name} · {Math.round((d.grown ?? 0) * 100)}% grown
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Houses                                                              */
/* ------------------------------------------------------------------ */

function Homeside({
  houses,
  dragons,
  onBuild,
  onMoveIn,
  onEgg,
}: {
  houses: House[]
  dragons: Dragon[]
  onBuild: (id: number) => void
  onMoveIn: (who: number, into: number) => void
  onEgg: (house: number) => void
}) {
  const grown = dragons.filter((d) => d.stage === 'grown')
  const homeless = grown.filter((d) => d.house === null)
  const byId = (id: number) => dragons.find((d) => d.id === id)

  return (
    <>
      {homeless.length > 0 && (
        <>
          <p style={S.sectionHead}>Ready for a house</p>
          <div style={S.grid}>
            {homeless.map((d) => {
              const t = typeOf(d.code)
              return (
                <button key={d.id} style={S.card} onClick={() => onBuild(d.id)}>
                  <Face code={d.code} />
                  <span style={S.cardName}>{d.name}</span>
                  <span style={S.cardNote}>{t.name}</span>
                  <span style={S.cardMeta}>give it a house</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {houses.length > 0 && (
        <>
          <p style={S.sectionHead}>Houses</p>
          <div style={S.grid}>
            {houses.map((h) => {
              const living = h.living.map(byId).filter(Boolean) as Dragon[]
              const one = living[0]
              const two = living[1]
              // Who out there would move in with the one living here.
              const suitors = two
                ? []
                : grown.filter(
                    (d) =>
                      d.id !== one?.id &&
                      one &&
                      fondness(d, one) >= IN_LOVE &&
                      (d.house === null ||
                        (houses.find((x) => x.id === d.house)?.living.length ?? 0) < 2)
                  )
              return (
                <div key={h.id} style={{ ...S.card, ...S.house }}>
                  <div style={S.pair}>
                    {living.map((d) => (
                      <Face key={d.id} code={d.code} />
                    ))}
                  </div>
                  <span style={S.cardName}>{h.name}</span>
                  <span style={S.cardNote}>
                    {living.map((d) => d.name).join(' and ')}
                  </span>
                  {two ? (
                    <button style={S.chip} onClick={() => onEgg(h.id)}>
                      have an egg
                    </button>
                  ) : suitors.length > 0 ? (
                    <div style={S.suitors}>
                      <span style={S.cardMeta}>taken with {one?.name}:</span>
                      {suitors.slice(0, 4).map((d) => (
                        <button key={d.id} style={S.chip} onClick={() => onMoveIn(d.id, h.id)}>
                          move {d.name} in
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={S.cardMeta}>
                      {one ? `${one.name} lives alone. Nobody has taken to them yet.` : 'Empty.'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

/** A little dragon, drawn rather than described. */
function Face({ code, egg = false }: { code: number; egg?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let raf = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      ctx.clearRect(0, 0, 72, 56)
      if (egg) {
        const type = typeOf(code)
        ctx.fillStyle = `hsl(${type.hue} 50% 62%)`
        ctx.beginPath()
        ctx.ellipse(36, 30, 14, 19, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `hsl(${type.accent} 60% 60% / 0.35)`
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(36 + Math.cos(a) * 6, 30 + Math.sin(a) * 8, 2, 0, Math.PI * 2)
          ctx.fill()
        }
        return
      }
      drawPortrait(ctx, code, 36, 30, 15, t)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [code, egg])
  return <canvas ref={ref} width={72} height={56} style={S.face} />
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const S: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    inset: 0,
    background: '#0d0907',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  stage: { position: 'relative', maxWidth: '100%', maxHeight: '100%' },
  canvas: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '86vh',
    borderRadius: 12,
    touchAction: 'none',
    cursor: 'grab',
  },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    font: '600 13px/1 ui-sans-serif, system-ui, sans-serif',
    color: '#ffe7c8',
    textShadow: '0 1px 6px rgba(0,0,0,0.9)',
  },
  clock: { fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 16 },
  count: { opacity: 0.88 },
  hudBottom: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    font: '400 12px/1.4 ui-sans-serif, system-ui, sans-serif',
    color: 'rgba(255,231,200,0.68)',
    textShadow: '0 1px 6px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
  },
  sheet: {
    width: 'min(980px, 100%)',
    maxHeight: '94vh',
    overflowY: 'auto',
    background: 'linear-gradient(180deg,#1d1511,#140e0b)',
    border: '1px solid rgba(255,200,150,0.14)',
    borderRadius: 16,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    color: '#f3e7da',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { margin: 0, font: '700 22px/1.2 ui-serif, Georgia, serif', letterSpacing: 0.2 },
  coins: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  result: {
    background: 'rgba(255,200,140,0.09)',
    border: '1px solid rgba(255,200,140,0.22)',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 14,
  },
  fresh: { marginTop: 5, fontSize: 12.5, color: '#ffd9a0' },
  note: { margin: 0, fontSize: 13, color: 'rgba(243,231,218,0.72)' },
  rowWrap: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12.5, opacity: 0.85 },
  stat: { fontVariantNumeric: 'tabular-nums' },
  actions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  toggle: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, opacity: 0.85 },
  go: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,190,120,0.45)',
    background: 'linear-gradient(180deg,#8a4f22,#5e3315)',
    color: '#ffeacd',
    font: '700 14px/1 ui-sans-serif, system-ui, sans-serif',
    cursor: 'pointer',
  },
  chip: {
    padding: '6px 11px',
    borderRadius: 8,
    border: '1px solid rgba(255,220,180,0.22)',
    background: 'rgba(255,220,180,0.08)',
    color: '#f3e7da',
    font: '600 12px/1 ui-sans-serif, system-ui, sans-serif',
    cursor: 'pointer',
  },
  sectionHead: {
    margin: '10px 0 2px',
    font: '700 12px/1 ui-sans-serif, system-ui, sans-serif',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,214,168,0.7)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
    gap: 9,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    padding: 10,
    borderRadius: 10,
    border: '1px solid rgba(255,210,160,0.16)',
    background: 'rgba(255,220,180,0.05)',
    color: '#f3e7da',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
  },
  house: { cursor: 'default', gap: 5 },
  pair: { display: 'flex', gap: 2 },
  face: { width: 72, height: 56 },
  cardName: { fontWeight: 700, fontSize: 13 },
  cardNote: { fontSize: 12, opacity: 0.82 },
  cardMeta: { fontSize: 11.5, opacity: 0.6 },
  suitors: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' },
  empty: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' },
  emptyLine: { margin: 0, fontSize: 14, opacity: 0.85 },
  foot: { display: 'flex', gap: 8, marginTop: 8 },
}

void RARITY_NAMES
