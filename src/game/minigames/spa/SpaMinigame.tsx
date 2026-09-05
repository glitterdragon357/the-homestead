import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { panel } from '../farm/farmStyles'
import { Person, SpaTool } from './SpaArt'
import {
  ARRIVAL_MS,
  FAMILY_LABEL,
  FORMALITY_LABEL,
  HAIR_CARE,
  HAIR_COLOURS,
  HAIR_STYLES,
  LIPS,
  OCCASION_BY_KEY,
  SHADOWS,
  TREATMENTS,
  TREATMENT_BY_KEY,
  VIBES,
  WARDROBE,
  initialSpa,
  judge,
  newClient,
  type Client,
  type Look,
  type SpaSave,
} from './spaData'

/**
 * Day Spa.
 *
 * Someone comes in with an occasion, a mood they are after and a colour
 * they love. You sort out what is bothering them - knots, feral brows,
 * a week of standing up - then wash and detangle their hair before you
 * touch it, and build them a look: style, dye, face, outfit, shoes, and
 * one finishing touch.
 *
 * They are paid on how close it lands to what they actually asked for,
 * so there is a right answer without there being only one right answer.
 * Nothing here is a race - treatments take five seconds and nothing else
 * is on a clock at all.
 */

type Tab = 'spa' | 'hair' | 'face' | 'wardrobe' | 'shop'

const TABS: { key: Tab; label: string }[] = [
  { key: 'spa', label: 'Spa' },
  { key: 'hair', label: 'Hair' },
  { key: 'face', label: 'Face' },
  { key: 'wardrobe', label: 'Wardrobe' },
  { key: 'shop', label: 'Buy' },
]

export function SpaMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<SpaSave>('spa', initialSpa)
  const { coins, earn, spend } = usePurse('spa')
  const [tab, setTab] = useState<Tab>('spa')
  const [toast, setToast] = useState<string | null>(null)
  const [showVerdict, setShowVerdict] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  // Only ticks while something is actually in progress.
  const busy = save.client?.busy ?? null
  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => repaint((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [busy])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // Someone new through the door.
  useEffect(() => {
    if (save.client) return
    const now = Date.now()
    if (!save.nextArrivalAt) {
      setSave((s) => ({ ...s, nextArrivalAt: now + ARRIVAL_MS }))
      return
    }
    if (now < save.nextArrivalAt) {
      const id = window.setTimeout(() => repaint((n) => n + 1), save.nextArrivalAt - now + 50)
      return () => window.clearTimeout(id)
    }
    // Naming and recording the name happen in one write, so two renders
    // can never hand out the same name twice.
    setSave((s) => {
      if (s.client) return s
      const arrival = newClient(s.usedNames ?? [])
      return { ...s, client: arrival, usedNames: [...(s.usedNames ?? []), arrival.name] }
    })
  }, [save.client, save.nextArrivalAt, setSave])

  const client = save.client
  const now = Date.now()
  const working = client?.busy && now < client.busy.doneAt ? client.busy : null

  function setClient(fn: (c: Client) => Client) {
    setSave((s) => (s.client ? { ...s, client: fn(s.client) } : s))
  }

  function setLook(patch: Partial<Look>) {
    setClient((c) => ({ ...c, look: { ...c.look, ...patch } }))
  }

  function start(key: string, ms: number) {
    if (!client || working) return
    if (client.done.includes(key)) return
    setClient((c) => ({ ...c, busy: { key, doneAt: Date.now() + ms } }))
  }

  // Bank a finished treatment the moment its timer runs out.
  useEffect(() => {
    const c = save.client
    if (!c?.busy) return
    if (Date.now() < c.busy.doneAt) return
    const key = c.busy.key
    setSave((s) =>
      s.client
        ? { ...s, client: { ...s.client, done: [...s.client.done, key], busy: null } }
        : s
    )
  }, [save.client, setSave, save.client?.busy?.doneAt])

  function buy(key: string, cost: number, label: string) {
    if (save.unlocked.includes(key)) return
    if (!spend(cost)) {
      showToast('Not enough in the till yet.')
      return
    }
    setSave((s) => ({ ...s, unlocked: [...s.unlocked, key] }))
    showToast(`Bought: ${label}`)
  }

  function finish() {
    if (!client) return
    const verdict = judge(client)
    earn(verdict.fee + verdict.tip)
    setSave((s) => ({
      ...s,
      client: null,
      nextArrivalAt: Date.now() + ARRIVAL_MS,
      served: (s.served ?? 0) + 1,
      best: Math.max(s.best ?? 0, Math.round(verdict.score * 100)),
    }))
    setShowVerdict(false)
    setTab('spa')
    showToast(`${client.name} paid ${verdict.fee}${verdict.tip ? ` + ${verdict.tip} tip` : ''} 🪙`)
  }

  if (!client) {
    const wait = Math.max(0, (save.nextArrivalAt ?? 0) - now)
    return (
      <div style={panel.wrap}>
        <div style={panel.header}>
          <h2 style={panel.title}>Day Spa</h2>
          <span style={panel.coins}>🪙 {coins}</span>
        </div>
        <GiftRow from="spa" />
        <p style={panel.empty}>
          The chair is empty. Someone will be along in {Math.ceil(wait / 1000)}s.
        </p>
        <p style={S.stat}>
          {save.served ?? 0} made over · best result {save.best ?? 0}%
        </p>
        <button style={S.leave} onClick={onExit}>
          Close up for now
        </button>
      </div>
    )
  }

  const occasion = OCCASION_BY_KEY[client.occasion]
  const verdict = judge(client)
  const needsOutstanding = client.needs.filter((n) => !client.done.includes(n))
  const careLeft = HAIR_CARE.filter(
    (h) => client[h.fixes] && !client.done.includes(h.key)
  )

  return (
    <div style={{ ...panel.wrap, width: 'min(760px, calc(100vw - 20px))' }}>
      <div style={panel.header}>
        <h2 style={panel.title}>Day Spa</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <GiftRow from="spa" />

      <div style={S.brief}>
        <strong style={S.name}>{client.name}</strong>, here for {occasion.label}
        <div style={S.line}>“{occasion.line}”</div>
        <div style={S.wants}>
          <Chip>wants it {VIBES[client.wants].label.toLowerCase()}</Chip>
          <Chip>loves {FAMILY_LABEL[client.favourite]}</Chip>
          <Chip>{FORMALITY_LABEL[occasion.formality]}</Chip>
        </div>
      </div>

      <div style={S.split}>
        <div style={S.stage}>
          <Person client={client} masked={working?.key === 'mask'} size={230} />
          {working && (
            <div style={S.working}>
              <SpaTool tool={TREATMENT_BY_KEY[working.key]?.icon ?? working.key} size={34} />
              <span>{Math.ceil((working.doneAt - now) / 1000)}s</span>
            </div>
          )}
        </div>

        <div style={S.controls}>
          <div style={S.tabs}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ ...S.tab, ...(tab === t.key ? S.tabActive : null) }}
              >
                {t.label}
                {t.key === 'spa' && (needsOutstanding.length + careLeft.length > 0) && (
                  <span style={S.dot}>{needsOutstanding.length + careLeft.length}</span>
                )}
              </button>
            ))}
          </div>

          <div style={S.pane}>
            {tab === 'spa' && (
              <>
                {careLeft.length > 0 && (
                  <>
                    <div style={panel.sectionLabel}>Hair first</div>
                    <p style={S.hint}>
                      {client.tangled && !client.done.includes('detangle')
                        ? 'It has to be combed out before it can be styled.'
                        : 'Wash it before you put a style in.'}
                    </p>
                  </>
                )}
                {HAIR_CARE.map((h) => {
                  const needed = client[h.fixes]
                  const done = client.done.includes(h.key)
                  if (!needed) return null
                  return (
                    <Row
                      key={h.key}
                      icon={h.key}
                      label={h.label}
                      note={done ? 'Done.' : 'Needed before styling.'}
                      done={done}
                      busy={working?.key === h.key}
                      disabled={!!working}
                      onClick={() => start(h.key, h.ms)}
                    />
                  )
                })}

                <div style={panel.sectionLabel}>Treatments</div>
                {TREATMENTS.map((t) => {
                  const wanted = client.needs.includes(t.key)
                  const done = client.done.includes(t.key)
                  return (
                    <Row
                      key={t.key}
                      icon={t.icon}
                      label={t.label}
                      note={wanted ? `“${t.complaint}”` : 'Not asked for.'}
                      wanted={wanted}
                      done={done}
                      busy={working?.key === t.key}
                      disabled={!!working}
                      onClick={() => start(t.key, t.ms)}
                    />
                  )
                })}
              </>
            )}

            {tab === 'hair' && (
              <>
                <div style={panel.sectionLabel}>Style</div>
                <Grid>
                  {HAIR_STYLES.map((h) => (
                    <Swatch
                      key={h.key}
                      label={h.label}
                      hint={`${FORMALITY_LABEL[h.formality]} · ${VIBES[h.vibe].label.toLowerCase()}`}
                      colour={HAIR_COLOURS.find((c) => c.key === client.look.dye)?.hex}
                      chosen={client.look.hair === h.key}
                      locked={!save.unlocked.includes(`hair:${h.key}`)}
                      cost={h.cost}
                      onClick={() =>
                        save.unlocked.includes(`hair:${h.key}`)
                          ? setLook({ hair: h.key })
                          : buy(`hair:${h.key}`, h.cost, h.label)
                      }
                    />
                  ))}
                </Grid>
                <div style={panel.sectionLabel}>Colour</div>
                <Grid>
                  {HAIR_COLOURS.map((c) => (
                    <Swatch
                      key={c.key}
                      label={c.label}
                      hint={VIBES[c.vibe].label.toLowerCase()}
                      colour={c.hex}
                      chosen={client.look.dye === c.key}
                      locked={!save.unlocked.includes(`dye:${c.key}`)}
                      cost={c.cost}
                      onClick={() =>
                        save.unlocked.includes(`dye:${c.key}`)
                          ? setLook({ dye: c.key })
                          : buy(`dye:${c.key}`, c.cost, c.label)
                      }
                    />
                  ))}
                </Grid>
              </>
            )}

            {tab === 'face' && (
              <>
                <div style={panel.sectionLabel}>Lips</div>
                <Grid>
                  {LIPS.map((l) => (
                    <Swatch
                      key={l.key}
                      label={l.label}
                      hint={VIBES[l.vibe].label.toLowerCase()}
                      colour={l.hex}
                      chosen={client.look.lip === l.key}
                      locked={!save.unlocked.includes(`lip:${l.key}`)}
                      cost={l.cost}
                      onClick={() =>
                        save.unlocked.includes(`lip:${l.key}`)
                          ? setLook({ lip: l.key })
                          : buy(`lip:${l.key}`, l.cost, l.label)
                      }
                    />
                  ))}
                </Grid>
                <div style={panel.sectionLabel}>Eyes</div>
                <Grid>
                  {SHADOWS.map((e) => (
                    <Swatch
                      key={e.key}
                      label={e.label}
                      hint={VIBES[e.vibe].label.toLowerCase()}
                      colour={e.hex === 'none' ? '#e8e2d6' : e.hex}
                      chosen={client.look.eye === e.key}
                      locked={!save.unlocked.includes(`eye:${e.key}`)}
                      cost={e.cost}
                      onClick={() =>
                        save.unlocked.includes(`eye:${e.key}`)
                          ? setLook({ eye: e.key })
                          : buy(`eye:${e.key}`, e.cost, e.label)
                      }
                    />
                  ))}
                </Grid>
              </>
            )}

            {tab === 'wardrobe' &&
              (['outfit', 'shoes', 'extra'] as const).map((slot) => (
                <div key={slot}>
                  <div style={panel.sectionLabel}>
                    {slot === 'extra' ? 'Finishing touch' : slot}
                  </div>
                  <Grid>
                    {WARDROBE.filter((g) => g.slot === slot).map((g) => (
                      <Swatch
                        key={g.key}
                        label={g.label}
                        hint={`${FORMALITY_LABEL[g.formality]} · ${VIBES[g.vibe].label.toLowerCase()}`}
                        colour={g.hex === 'none' ? '#e8e2d6' : g.hex}
                        chosen={client.look[slot === 'outfit' ? 'outfit' : slot === 'shoes' ? 'shoes' : 'extra'] === g.key}
                        locked={!save.unlocked.includes(g.key)}
                        cost={g.cost}
                        onClick={() =>
                          save.unlocked.includes(g.key)
                            ? setLook({ [slot]: g.key } as Partial<Look>)
                            : buy(g.key, g.cost, g.label)
                        }
                      />
                    ))}
                  </Grid>
                </div>
              ))}

            {tab === 'shop' && (
              <>
                <p style={S.hint}>
                  Anything locked can be bought straight from its own tab too. The till is this
                  parlour's own — it is not shared with the rest of the homestead.
                </p>
                {[
                  ...WARDROBE.map((g) => ({ key: g.key, label: g.label, cost: g.cost })),
                  ...HAIR_STYLES.map((h) => ({ key: `hair:${h.key}`, label: h.label, cost: h.cost })),
                  ...HAIR_COLOURS.map((c) => ({ key: `dye:${c.key}`, label: c.label, cost: c.cost })),
                  ...LIPS.map((l) => ({ key: `lip:${l.key}`, label: l.label, cost: l.cost })),
                  ...SHADOWS.map((e) => ({ key: `eye:${e.key}`, label: e.label, cost: e.cost })),
                ]
                  .filter((i) => i.cost > 0 && !save.unlocked.includes(i.key))
                  .sort((a, b) => a.cost - b.cost)
                  .map((i) => (
                    <div key={i.key} style={S.buyRow}>
                      <span style={{ flex: 1 }}>{i.label}</span>
                      <button
                        style={{ ...S.buyBtn, opacity: coins >= i.cost ? 1 : 0.45 }}
                        onClick={() => buy(i.key, i.cost, i.label)}
                      >
                        🪙 {i.cost}
                      </button>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      {!showVerdict ? (
        <button style={S.finish} onClick={() => setShowVerdict(true)}>
          Show {client.name} the mirror
        </button>
      ) : (
        <div style={S.verdict}>
          {verdict.marks.map((m) => (
            <div key={m.key} style={S.mark}>
              <div style={S.markHead}>
                <span>{m.label}</span>
                <span style={S.markPct}>{Math.round(m.score * 100)}%</span>
              </div>
              <div style={S.track}>
                <div
                  style={{
                    ...S.fill,
                    width: `${Math.round(m.score * 100)}%`,
                    background: m.score > 0.7 ? '#7cb342' : m.score > 0.4 ? '#e0a32f' : '#d9534f',
                  }}
                />
              </div>
              <div style={S.markNote}>{m.note}</div>
            </div>
          ))}
          <p style={S.reaction}>{verdict.reaction}</p>
          <div style={S.payRow}>
            <button style={S.back} onClick={() => setShowVerdict(false)}>
              Not finished yet
            </button>
            <button style={S.finish} onClick={finish}>
              Take {verdict.fee}
              {verdict.tip ? ` + ${verdict.tip} tip` : ''} 🪙
            </button>
          </div>
        </div>
      )}

      <button style={S.leave} onClick={onExit}>
        Leave the parlour
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={S.chip}>{children}</span>
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={S.grid}>{children}</div>
}

function Row({
  icon,
  label,
  note,
  wanted,
  done,
  busy,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  note: string
  wanted?: boolean
  done?: boolean
  busy?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={done || disabled}
      style={{
        ...panel.row,
        width: '100%',
        border: 'none',
        textAlign: 'left',
        marginBottom: 4,
        cursor: done || disabled ? 'default' : 'pointer',
        background: done ? '#e6efd4' : wanted ? '#f6ecd9' : '#f2e6c9',
        opacity: disabled && !busy && !done ? 0.5 : 1,
      }}
    >
      <span style={panel.rowArt}>
        <SpaTool tool={icon} size={38} />
      </span>
      <span style={panel.rowBody}>
        <span style={S.rowName}>
          {label}
          {wanted && !done && <span style={S.askedFor}>asked for</span>}
        </span>
        <span style={S.rowNote}>{busy ? 'In progress…' : note}</span>
      </span>
      {done && <span style={S.tick}>✓</span>}
    </button>
  )
}

function Swatch({
  label,
  hint,
  colour,
  chosen,
  locked,
  cost,
  onClick,
}: {
  label: string
  hint: string
  colour?: string
  chosen: boolean
  locked: boolean
  cost: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...S.swatch,
        outline: chosen ? '2.5px solid #3a2e1f' : '1px solid #d6c7a4',
        opacity: locked ? 0.62 : 1,
      }}
    >
      <span style={{ ...S.dab, background: colour ?? '#e8e2d6' }} />
      <span style={S.swatchName}>{label}</span>
      <span style={S.swatchHint}>{locked ? `🪙 ${cost}` : hint}</span>
    </button>
  )
}

const S: Record<string, React.CSSProperties> = {
  brief: {
    background: '#f2e6c9',
    borderRadius: 9,
    padding: '8px 11px',
    fontSize: 13,
    color: '#3a2e1f',
  },
  name: { fontSize: 15 },
  line: { fontStyle: 'italic', color: '#6b5a44', marginTop: 2, fontSize: 12.5 },
  wants: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: {
    background: '#3a2e1f',
    color: '#fdf6e3',
    borderRadius: 10,
    padding: '1px 8px',
    fontSize: 11,
    fontWeight: 600,
  },

  split: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  stage: {
    position: 'relative',
    flex: '1 1 200px',
    minWidth: 190,
    display: 'flex',
    justifyContent: 'center',
    background: 'linear-gradient(#f7efd9, #eadfc4)',
    borderRadius: 10,
    padding: 8,
  },
  working: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: '#3a2e1f',
    color: '#fdf6e3',
    borderRadius: 14,
    padding: '4px 11px',
    fontSize: 12.5,
    fontWeight: 700,
  },
  controls: { flex: '1 1 300px', minWidth: 260 },

  tabs: { display: 'flex', gap: 3 },
  tab: {
    flex: 1,
    padding: '7px 3px',
    fontSize: 11.5,
    border: 'none',
    borderRadius: 7,
    background: '#eadfc4',
    color: '#6b5a44',
    cursor: 'pointer',
    position: 'relative',
  },
  tabActive: { background: '#3a2e1f', color: '#fdf6e3', fontWeight: 600 },
  dot: {
    marginLeft: 3,
    background: '#d9534f',
    color: 'white',
    borderRadius: 8,
    padding: '0 4px',
    fontSize: 9.5,
    fontWeight: 700,
  },
  pane: { maxHeight: 300, overflowY: 'auto', marginTop: 7, paddingRight: 2 },

  hint: { fontSize: 12, color: '#6b5a44', margin: '2px 0 6px' },
  rowName: { fontSize: 13, fontWeight: 600, display: 'block', color: '#3a2e1f' },
  rowNote: { fontSize: 11.5, color: '#6b5a44', display: 'block' },
  askedFor: {
    marginLeft: 6,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    background: '#d9587f',
    color: 'white',
    borderRadius: 7,
    padding: '1px 5px',
  },
  tick: { color: '#5a8a3a', fontWeight: 700 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 4 },
  swatch: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '6px 3px',
    borderRadius: 8,
    background: '#fdf6e3',
    cursor: 'pointer',
  },
  dab: { width: 24, height: 24, borderRadius: 12, border: '1px solid rgba(0,0,0,0.15)' },
  swatchName: { fontSize: 10.5, fontWeight: 600, color: '#3a2e1f', textAlign: 'center', lineHeight: 1.15 },
  swatchHint: { fontSize: 9, color: '#8a7a63', textAlign: 'center' },

  buyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    background: '#f2e6c9',
    borderRadius: 8,
    marginBottom: 4,
    fontSize: 12.5,
    color: '#3a2e1f',
  },
  buyBtn: {
    border: 'none',
    borderRadius: 8,
    background: '#3a2e1f',
    color: '#fdf6e3',
    padding: '5px 10px',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
  },

  verdict: { background: '#f2e6c9', borderRadius: 10, padding: 11 },
  mark: { marginBottom: 7 },
  markHead: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#3a2e1f',
  },
  markPct: { color: '#6b5a44' },
  track: { height: 6, background: '#ddd0ae', borderRadius: 4, overflow: 'hidden', margin: '3px 0' },
  fill: { height: '100%', borderRadius: 4 },
  markNote: { fontSize: 11, color: '#6b5a44' },
  reaction: { fontSize: 13, fontStyle: 'italic', color: '#3a2e1f', textAlign: 'center', margin: '8px 0' },
  payRow: { display: 'flex', gap: 6 },
  back: {
    flex: 1,
    padding: '9px 10px',
    border: '1px solid #b8a77f',
    borderRadius: 9,
    background: 'transparent',
    color: '#6b5a44',
    fontSize: 12.5,
    cursor: 'pointer',
  },

  finish: {
    flex: 2,
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    borderRadius: 9,
    background: '#d9587f',
    color: 'white',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  leave: {
    background: 'none',
    border: 'none',
    color: '#8a7a63',
    fontSize: 12.5,
    textDecoration: 'underline',
    cursor: 'pointer',
    marginTop: 2,
  },
  stat: { fontSize: 12.5, color: '#6b5a44', textAlign: 'center' },
}
