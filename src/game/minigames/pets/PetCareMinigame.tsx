import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { panel } from '../farm/farmStyles'
import { useAmbientMusic } from '../../audio/useAmbientMusic'
import { PetBody, SlotArt } from './PetArt'
import { ArtDefs } from '../../art/Shading'
import {
  FLOOR,
  NEEDS,
  NEED_BY_KEY,
  ROOM,
  SLOTS,
  SLOT_BY_KEY,
  SPECIES,
  SPECIES_BY_KEY,
  comfort,
  happiness,
  initialPets,
  makePet,
  payFor,
  resaleOf,
  type Pet,
  type PetSave,
  type SlotKey,
  type SpeciesKey,
} from './petData'

/**
 * Pet Care.
 *
 * A room with a tiled floor, a few animals living in it, and their
 * things standing round the edge. You tap a thing; whoever you have
 * picked walks over to it and uses it. Nothing is urgent - the meters
 * take the better part of ten minutes to come down - and the coins you
 * earn looking after them go on nicer versions of everything, which is
 * what actually makes them happy rather than merely fed.
 */

const USE_MS = 2200
const TICK_MS = 200

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v))
}

export function PetCareMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<PetSave>('pets', initialPets)
  const { coins, earn, spend } = usePurse('pets')
  const saveRef = useRef(save)
  saveRef.current = save

  const music = save.music !== false
  useAmbientMusic(music, 'calm')

  const [chosen, setChosen] = useState<number | null>(null)
  const [sheet, setSheet] = useState<null | 'shop' | 'adopt'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }, [])

  useEffect(() => {
    setSave((s) => ({ ...s, looked: (s.looked ?? 0) + 1, tickedAt: Date.now() }))
    return () => window.clearTimeout(toastTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pets = save.pets ?? []
  const active = chosen ?? pets[0]?.id ?? null

  /* ---------------------------------------------------------------- */
  /* The room ticking over                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      setSave((prev) => {
        const since = Math.min(4000, now - (prev.tickedAt ?? now)) / 1000
        if (since <= 0) return prev
        let paid = 0
        const notes: string[] = []

        const next = (prev.pets ?? []).map((pet) => {
          const p: Pet = { ...pet, needs: { ...pet.needs } }

          // Needs come down, slowly.
          for (const need of NEEDS) {
            p.needs[need.key] = clamp(p.needs[need.key] - need.drain * since)
          }

          // Walking to whatever you sent it to.
          if (p.going) {
            const slot = SLOT_BY_KEY[p.going]
            const pace = SPECIES_BY_KEY[p.species]?.pace ?? 90
            const dx = slot.x - p.x
            const dy = slot.y - 26 - p.y
            const gap = Math.hypot(dx, dy)
            if (now < p.busyUntil) {
              // Using it. Nothing to do but wait.
            } else if (gap > 6) {
              const move = Math.min(gap, pace * since)
              p.x += (dx / gap) * move
              p.y += (dy / gap) * move
            } else if (p.busyUntil === 0) {
              p.busyUntil = now + USE_MS
            } else {
              // Finished with it.
              const tier = slot.tiers[prev.tiers[slot.key] ?? 0]
              const before = p.needs[slot.need]
              p.needs[slot.need] = clamp(before + tier.restore)
              paid += payFor(before, tier)
              notes.push(`${p.name} used the ${tier.label.toLowerCase()}`)
              p.going = null
              p.busyUntil = 0
            }
          } else {
            // Pottering about.
            p.x += Math.sin(now * 0.0004 + p.id * 2) * 6 * since
            p.y += Math.cos(now * 0.00031 + p.id) * 3 * since
            p.x = Math.max(FLOOR.x0, Math.min(FLOOR.x1, p.x))
            p.y = Math.max(FLOOR.y0, Math.min(FLOOR.y1, p.y))
          }
          return p
        })

        if (paid > 0) earn(paid)
        if (notes.length) showToast(`${notes[0]} · ${paid} 🪙`)
        return { ...prev, pets: next, tickedAt: now }
      })
      repaint((n) => n + 1)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [earn, setSave, showToast])

  /* ---------------------------------------------------------------- */
  /* Doing things                                                      */
  /* ---------------------------------------------------------------- */

  function sendTo(slotKey: SlotKey) {
    if (active === null) return
    const pet = pets.find((p) => p.id === active)
    if (!pet) return
    if (pet.going) {
      showToast(`${pet.name} is already on the way.`)
      return
    }
    setSave((s) => ({
      ...s,
      pets: (s.pets ?? []).map((p) =>
        p.id === active ? { ...p, going: slotKey, busyUntil: 0 } : p
      ),
    }))
    showToast(`${pet.name} heads for the ${SLOT_BY_KEY[slotKey].label.toLowerCase()}.`)
  }

  function buyTier(slotKey: SlotKey) {
    const slot = SLOT_BY_KEY[slotKey]
    const owned = saveRef.current.tiers?.[slotKey] ?? 0
    const next = slot.tiers[owned + 1]
    if (!next) return
    const back = resaleOf(slot, owned)
    // You are trading the old one in, so you only need the difference.
    if (!spend(Math.max(0, next.cost - back))) {
      showToast('Not enough coins yet, even with the old one traded in.')
      return
    }
    setSave((s) => ({ ...s, tiers: { ...s.tiers, [slotKey]: owned + 1 } }))
    showToast(
      `Sold the ${slot.tiers[owned].label.toLowerCase()} for ${back} 🪙 and brought home the ${next.label.toLowerCase()}.`
    )
  }

  function adopt(key: SpeciesKey) {
    const s = SPECIES_BY_KEY[key]
    if ((saveRef.current.pets ?? []).some((p) => p.species === key)) {
      showToast(`You already have a ${s.label.toLowerCase()}.`)
      return
    }
    if (!spend(s.cost)) {
      showToast('Not enough coins yet.')
      return
    }
    const now = Date.now()
    setSave((prev) => {
      const pet = makePet(key, prev.usedNames ?? [], prev.nextId ?? 1, now)
      return {
        ...prev,
        pets: [...(prev.pets ?? []), pet],
        usedNames: [...(prev.usedNames ?? []), pet.name],
        nextId: (prev.nextId ?? 1) + 1,
      }
    })
    setSheet(null)
    showToast(`A ${s.label.toLowerCase()} comes home with you.`)
  }

  /* ---------------------------------------------------------------- */
  /* The room                                                          */
  /* ---------------------------------------------------------------- */

  const now = Date.now()
  const activePet = pets.find((p) => p.id === active) ?? null
  const nicety = comfort(save.tiers ?? ({} as Record<SlotKey, number>))

  return (
    <div style={{ ...panel.wrap, width: 'min(760px, calc(100vw - 20px))' }}>
      <div style={panel.header}>
        <h2 style={panel.title}>Pet Care</h2>
        <span style={S.headRight}>
          <button
            style={S.mute}
            onClick={() => setSave((s) => ({ ...s, music: !(s.music !== false) }))}
            title={music ? 'Turn the music off' : 'Turn the music on'}
          >
            {music ? '🔊' : '🔇'}
          </button>
          <span style={panel.coins}>🪙 {coins}</span>
        </span>
      </div>

      <GiftRow from="pets" />

      <svg viewBox={`0 0 ${ROOM.w} ${ROOM.h}`} style={S.room} role="img" aria-label="the pet room">
        <ArtDefs />
        {/* wall and floor */}
        <rect x="0" y="0" width={ROOM.w} height="190" fill="#e0d5bd" />
        <rect x="0" y="0" width={ROOM.w} height="14" fill="#c9bb9c" />
        <rect x="60" y="40" width="150" height="96" rx="4" fill="#a8ccdd" />
        <rect x="60" y="40" width="150" height="96" rx="4" fill="none" stroke="#8a7f6a" strokeWidth="7" />
        <line x1="135" y1="40" x2="135" y2="136" stroke="#8a7f6a" strokeWidth="5" />
        <rect x="470" y="52" width="120" height="80" rx="3" fill="#c2a878" />
        <rect x="478" y="60" width="104" height="64" rx="2" fill="#8a6f52" />

        {/* tiles */}
        {Array.from({ length: 10 }).map((_, r) =>
          Array.from({ length: 16 }).map((__, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * 44 - (r % 2) * 22}
              y={190 + r * 22}
              width="44"
              height="22"
              fill={(r + c) % 2 ? '#cdbfa6' : '#c2b39a'}
            />
          ))
        )}
        <rect x="0" y="188" width={ROOM.w} height="4" fill="#9a8c74" />

        {/* the things, tappable */}
        {SLOTS.map((slot) => {
          const tier = save.tiers?.[slot.key] ?? 0
          const need = NEED_BY_KEY[slot.need]
          const busy = pets.some((p) => p.going === slot.key)
          return (
            <g
              key={slot.key}
              transform={`translate(${slot.x} ${slot.y})`}
              onClick={() => sendTo(slot.key)}
              style={{ cursor: 'pointer' }}
            >
              <ellipse cx="0" cy="4" rx="34" ry="12" fill="#000" opacity={busy ? 0.16 : 0.08} />
              <SlotArt slot={slot.key} tier={tier} />
              <rect x="-32" y="10" width="64" height="15" rx="7" fill="#3a2e1f" opacity={0.82} />
              <text x="0" y="21" textAnchor="middle" fontSize="10" fill={need.colour} fontWeight="700">
                {slot.tiers[tier].label}
              </text>
            </g>
          )
        })}

        {/* the animals */}
        {[...pets]
          .sort((a, b) => a.y - b.y)
          .map((pet) => {
            const s = SPECIES_BY_KEY[pet.species]
            const walking = !!pet.going && now >= pet.busyUntil
            const using = now < pet.busyUntil
            const step = walking ? ((now / 260) % 1) : 0
            const isActive = pet.id === active
            return (
              <g
                key={pet.id}
                transform={`translate(${pet.x - 40} ${pet.y - 46})`}
                onClick={() => setChosen(pet.id)}
                style={{ cursor: 'pointer' }}
              >
                {isActive && (
                  <ellipse cx="40" cy="55" rx="27" ry="6" fill="none" stroke="#d9587f" strokeWidth="2.4" />
                )}
                <PetBody
                  species={pet.species}
                  coat={pet.coat}
                  trim={s.trim}
                  step={step}
                  asleep={using && pet.going === 'bed'}
                />
                {using && (
                  <text x="40" y="4" textAnchor="middle" fontSize="14">
                    {pet.going === 'bed' ? '💤' : '✨'}
                  </text>
                )}
                <text x="40" y="66" textAnchor="middle" fontSize="11" fill="#3a2e1f" fontWeight="700">
                  {pet.name}
                </text>
              </g>
            )
          })}
      </svg>

      <p style={S.hint}>
        {activePet
          ? `Tap a thing and ${activePet.name} will go and use it. Tap another animal to pick them instead.`
          : 'Tap a thing to send them to it.'}
      </p>

      {/* whose meters */}
      <div style={S.petRow}>
        {pets.map((pet) => {
          const s = SPECIES_BY_KEY[pet.species]
          const glad = happiness(pet, save.tiers ?? ({} as Record<SlotKey, number>))
          return (
            <button
              key={pet.id}
              onClick={() => setChosen(pet.id)}
              style={{ ...S.petCard, ...(pet.id === active ? S.petCardOn : null) }}
            >
              <span style={S.petName}>{pet.name}</span>
              <span style={S.petKind}>{s.label}</span>
              <div style={S.heartTrack}>
                <div
                  style={{
                    ...S.heartFill,
                    width: `${Math.round(glad)}%`,
                    background: glad > 60 ? '#7cd88f' : glad > 30 ? '#e0b84a' : '#e2584f',
                  }}
                />
              </div>
              <span style={S.petGlad}>{Math.round(glad)}% happy</span>
            </button>
          )
        })}
      </div>

      {activePet && (
        <div style={S.needs}>
          {NEEDS.map((need) => {
            const v = activePet.needs[need.key]
            const loves = SPECIES_BY_KEY[activePet.species]?.loves === need.key
            return (
              <div key={need.key} style={S.needRow}>
                <span style={S.needLabel}>
                  {need.label}
                  {loves && <span style={S.loves}> favourite</span>}
                </span>
                <div style={S.needTrack}>
                  <div style={{ ...S.needFill, width: `${Math.round(v)}%`, background: need.colour }} />
                </div>
                <span style={S.needPct}>{Math.round(v)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      <div style={S.buttons}>
        <button style={S.shopBtn} onClick={() => setSheet(sheet === 'shop' ? null : 'shop')}>
          Buy things · room {nicety > 60 ? 'lovely' : nicety > 25 ? 'comfy' : 'bare'}
        </button>
        <button style={S.shopBtn} onClick={() => setSheet(sheet === 'adopt' ? null : 'adopt')}>
          Bring one home
        </button>
      </div>

      {sheet === 'shop' && (
        <div style={S.sheet}>
          <p style={S.sheetHint}>
            Nicer things put more back and make the whole room a better place to live. When you
            buy one the old one is sold on, so you only pay the difference — and clearing out the
            cheap stuff is where the real money is. Comfort so far: {nicety}.
          </p>
          {SLOTS.map((slot) => {
            const owned = save.tiers?.[slot.key] ?? 0
            const next = slot.tiers[owned + 1]
            return (
              <div key={slot.key} style={S.buyRow}>
                <svg viewBox="-40 -60 80 74" width="52" height="48" style={{ flexShrink: 0 }}>
                  <ArtDefs />
                  <SlotArt slot={slot.key} tier={owned} />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.buyName}>{slot.tiers[owned].label}</div>
                  <div style={S.buyNote}>{next ? next.blurb : 'The best there is.'}</div>
                </div>
                {next ? (
                  (() => {
                    const back = resaleOf(slot, owned)
                    const due = Math.max(0, next.cost - back)
                    return (
                      <button
                        style={{ ...S.buyBtn, opacity: coins >= due ? 1 : 0.45 }}
                        onClick={() => buyTier(slot.key)}
                      >
                        {next.label}
                        <span style={S.buyCost}>🪙 {due}</span>
                        <span style={S.tradeIn}>{back} back for the old one</span>
                      </button>
                    )
                  })()
                ) : (
                  <span style={S.buyNote}>best</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {sheet === 'adopt' && (
        <div style={S.sheet}>
          <p style={S.sheetHint}>
            Everyone shares the same room and the same things, so it is worth buying well before
            the house fills up.
          </p>
          {SPECIES.map((s) => {
            const have = pets.some((p) => p.species === s.key)
            return (
              <div key={s.key} style={S.buyRow}>
                <svg viewBox="0 0 80 62" width="58" height="45" style={{ flexShrink: 0 }}>
                  <ArtDefs />
                  <PetBody species={s.key} coat={s.coats[0]} trim={s.trim} />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.buyName}>{s.label}</div>
                  <div style={S.buyNote}>{s.note}</div>
                  <div style={S.buyNote}>loves {NEED_BY_KEY[s.loves].label.toLowerCase()}</div>
                </div>
                {have ? (
                  <span style={S.buyNote}>at home</span>
                ) : (
                  <button
                    style={{ ...S.buyBtn, opacity: coins >= s.cost ? 1 : 0.45 }}
                    onClick={() => adopt(s.key)}
                  >
                    Adopt
                    <span style={S.buyCost}>🪙 {s.cost}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button style={S.leave} onClick={onExit}>
        Leave them to it
      </button>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  room: {
    width: '100%',
    height: 'auto',
    borderRadius: 10,
    background: '#e0d5bd',
    display: 'block',
  },
  headRight: { display: 'flex', alignItems: 'center', gap: 8 },
  mute: {
    border: 'none',
    background: 'none',
    fontSize: 16,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  hint: { fontSize: 12, color: '#6b5a44', textAlign: 'center', margin: '6px 0 2px' },

  petRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  petCard: {
    flex: '1 1 110px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 8px',
    border: '2px solid transparent',
    borderRadius: 9,
    background: '#f2e6c9',
    cursor: 'pointer',
    textAlign: 'left',
  },
  petCardOn: { borderColor: '#d9587f', background: '#f7efd9' },
  petName: { fontSize: 13, fontWeight: 700, color: '#3a2e1f' },
  petKind: { fontSize: 10.5, color: '#8a7a63' },
  heartTrack: { height: 6, borderRadius: 4, background: '#ddd0ae', overflow: 'hidden', marginTop: 2 },
  heartFill: { height: '100%', borderRadius: 4, transition: 'width 300ms linear' },
  petGlad: { fontSize: 10, color: '#6b5a44' },

  needs: { display: 'flex', flexDirection: 'column', gap: 3 },
  needRow: { display: 'flex', alignItems: 'center', gap: 7 },
  needLabel: { fontSize: 11.5, color: '#6b5a44', width: 96, flexShrink: 0 },
  loves: { color: '#d9587f', fontWeight: 700, fontSize: 9.5 },
  needTrack: { flex: 1, height: 8, borderRadius: 5, background: '#ddd0ae', overflow: 'hidden' },
  needFill: { height: '100%', borderRadius: 5, transition: 'width 300ms linear' },
  needPct: { fontSize: 10.5, color: '#8a7a63', width: 22, textAlign: 'right' },

  buttons: { display: 'flex', gap: 6 },
  shopBtn: {
    flex: 1,
    padding: '9px 10px',
    border: 'none',
    borderRadius: 9,
    background: '#3a2e1f',
    color: '#fdf6e3',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },

  sheet: {
    background: '#f2e6c9',
    borderRadius: 10,
    padding: 9,
    maxHeight: 260,
    overflowY: 'auto',
  },
  sheetHint: { fontSize: 12, color: '#6b5a44', margin: '2px 0 8px' },
  buyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    background: '#fdf6e3',
    borderRadius: 9,
    padding: 7,
    marginBottom: 5,
  },
  buyName: { fontSize: 13, fontWeight: 600, color: '#3a2e1f' },
  buyNote: { fontSize: 11, color: '#8a7a63' },
  buyBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '7px 11px',
    border: 'none',
    borderRadius: 9,
    background: '#d9587f',
    color: 'white',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  buyCost: { fontSize: 10.5, opacity: 0.85 },
  tradeIn: { fontSize: 9, opacity: 0.8, fontWeight: 600 },

  leave: {
    background: 'none',
    border: 'none',
    color: '#8a7a63',
    fontSize: 12.5,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
}
