import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { FarmArt } from './FarmArt'
import {
  ANIMALS,
  ANIMAL_ORDER,
  CHASE_DECAY_PER_TICK,
  CHASE_PER_CLICK,
  CROPS,
  CROP_ORDER,
  KITCHEN_PRICE,
  PRICES,
  RAW_ITEMS,
  RECIPES,
  type AnimalKind,
  type CropKey,
  type ItemKey,
} from './farmData'

/**
 * Farmstead: keep livestock, work a field, cook what you gather and sell
 * it. Four tabs because it's really four small loops feeding one purse -
 * Barn (collect and breed), Field (plant and harvest), Kitchen (turn raw
 * goods into worth-more dishes) and Market (sell, and buy more stock).
 *
 * GOATS ARE THE ONE THING THAT CAN GO WRONG. Play with them or they get
 * bored, and a bored goat eventually bolts the fence. An escaped goat
 * produces nothing until you chase it down, and chasing costs you real
 * seconds of clicking - the bar slips back if you stop. So goats are the
 * most valuable milk in the barn and the only animal that punishes you
 * for ignoring it.
 *
 * Everything durable is stored as a timestamp rather than a countdown, so
 * animals keep producing and crops keep growing while the game is closed.
 */

type Tab = 'barn' | 'field' | 'kitchen' | 'market'

interface Animal {
  id: number
  kind: AnimalKind
  bornAt: number
  /** When it last gave a product. */
  lastProductAt: number
  /** Goats only: when it was last played with. */
  lastPlayedAt: number
  escaped: boolean
}

interface CropPlot {
  crop: CropKey | null
  plantedAt: number | null
  wateredMs: number
}

const PLOT_COUNT = 6

interface FarmSave {
  coins: number
  nextId: number
  animals: Animal[]
  plots: CropPlot[]
  inventory: Partial<Record<ItemKey, number>>
  kitchen: boolean
  recipes: string[]
  /** In-flight cook, if any. */
  cooking: { recipeId: string; doneAt: number } | null
  /** Per-kind breeding in progress, keyed by kind -> completion time. */
  breeding: Partial<Record<AnimalKind, number>>
}

const EMPTY_PLOT: CropPlot = { crop: null, plantedAt: null, wateredMs: 0 }

function initialSave(): FarmSave {
  const now = Date.now()
  return {
    coins: 60,
    nextId: 4,
    // Start with a laying hen and a goat so both loops are visible at once.
    animals: [
      { id: 1, kind: 'chicken', bornAt: now - 200_000, lastProductAt: now - 15_000, lastPlayedAt: now, escaped: false },
      { id: 2, kind: 'chicken', bornAt: now - 200_000, lastProductAt: now - 5_000, lastPlayedAt: now, escaped: false },
      { id: 3, kind: 'goat', bornAt: now - 200_000, lastProductAt: now - 20_000, lastPlayedAt: now, escaped: false },
    ],
    plots: Array.from({ length: PLOT_COUNT }, () => ({ ...EMPTY_PLOT })),
    inventory: {},
    kitchen: false,
    recipes: [],
    cooking: null,
    breeding: {},
  }
}

function isGrown(a: Animal, now: number): boolean {
  return now - a.bornAt >= ANIMALS[a.kind].matureMs
}

function productReady(a: Animal, now: number): boolean {
  return isGrown(a, now) && !a.escaped && now - a.lastProductAt >= ANIMALS[a.kind].produceMs
}

function cropProgress(plot: CropPlot, now: number): number {
  if (!plot.crop || plot.plantedAt === null) return 0
  const grown = now - plot.plantedAt + plot.wateredMs
  return Math.max(0, Math.min(100, (grown / CROPS[plot.crop].growMs) * 100))
}

function pct(value: number, total: number): number {
  return Math.max(0, Math.min(100, (value / total) * 100))
}

function formatSecs(ms: number): string {
  return `${Math.max(0, Math.ceil(ms / 1000))}s`
}

export function FarmsteadMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<FarmSave>('farmstead', initialSave)
  const [tab, setTab] = useState<Tab>('barn')
  const [toast, setToast] = useState<string | null>(null)
  const [plantChoice, setPlantChoice] = useState<CropKey>('wheat')
  /** Chase-bar progress per escaped goat id. Transient, never saved. */
  const [chase, setChase] = useState<Record<number, number>>({})
  const toastTimeout = useRef<number | undefined>(undefined)

  const [, repaint] = useState(0)

  const { coins, animals, plots, inventory, kitchen, recipes, cooking, breeding } = save
  const now = Date.now()

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1400)
  }

  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  // Single heartbeat: repaints timers, decays chase bars, and rolls for
  // bored goats bolting. It only writes to the save when a goat actually
  // escapes, so idling doesn't hammer localStorage.
  useEffect(() => {
    const interval = window.setInterval(() => {
      repaint((n) => n + 1)

      setChase((prev) => {
        if (!Object.keys(prev).length) return prev
        const next: Record<number, number> = {}
        for (const [id, v] of Object.entries(prev)) {
          const dropped = v - CHASE_DECAY_PER_TICK
          if (dropped > 0) next[Number(id)] = dropped
        }
        return next
      })

      const t = Date.now()
      let bolted: string | null = null
      setSave((s) => {
        const updated = s.animals.map((a) => {
          const spec = ANIMALS[a.kind]
          if (!spec.boredomMs || a.escaped || !isGrown(a, t)) return a
          if (t - a.lastPlayedAt < spec.boredomMs) return a
          if (Math.random() > (spec.escapeChance ?? 0)) return a
          bolted = `A goat got out!`
          return { ...a, escaped: true }
        })
        return updated.some((a, i) => a !== s.animals[i]) ? { ...s, animals: updated } : s
      })
      if (bolted) showToast(bolted)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [setSave])

  // Finish a cook once its timer is up.
  useEffect(() => {
    if (!cooking || now < cooking.doneAt) return
    const recipe = RECIPES.find((r) => r.id === cooking.recipeId)
    if (!recipe) return
    setSave((s) => ({
      ...s,
      cooking: null,
      inventory: { ...s.inventory, [recipe.produces]: (s.inventory[recipe.produces] ?? 0) + 1 },
    }))
    showToast(`${recipe.label} is ready!`)
  }, [cooking, now, setSave])

  // Deliver a baby once its breeding timer is up.
  useEffect(() => {
    const due = (Object.entries(breeding) as [AnimalKind, number][]).filter(([, at]) => now >= at)
    if (!due.length) return
    setSave((s) => {
      let id = s.nextId
      const born: Animal[] = []
      const rest = { ...s.breeding }
      for (const [kind, at] of Object.entries(s.breeding) as [AnimalKind, number][]) {
        if (Date.now() < at) continue
        born.push({ id: id++, kind, bornAt: Date.now(), lastProductAt: Date.now(), lastPlayedAt: Date.now(), escaped: false })
        delete rest[kind]
      }
      if (!born.length) return s
      return { ...s, nextId: id, animals: [...s.animals, ...born], breeding: rest }
    })
    showToast(`A baby was born!`)
  }, [breeding, now, setSave])

  function collect(a: Animal) {
    const spec = ANIMALS[a.kind]
    setSave((s) => ({
      ...s,
      animals: s.animals.map((x) => (x.id === a.id ? { ...x, lastProductAt: Date.now() } : x)),
      inventory: { ...s.inventory, [spec.product]: (s.inventory[spec.product] ?? 0) + 1 },
    }))
    showToast(`+1 ${spec.product}`)
  }

  function play(a: Animal) {
    setSave((s) => ({
      ...s,
      animals: s.animals.map((x) => (x.id === a.id ? { ...x, lastPlayedAt: Date.now() } : x)),
    }))
    showToast('The goat is happy!')
  }

  function chaseClick(a: Animal) {
    const current = (chase[a.id] ?? 0) + CHASE_PER_CLICK
    if (current >= 100) {
      setChase((c) => {
        const next = { ...c }
        delete next[a.id]
        return next
      })
      setSave((s) => ({
        ...s,
        animals: s.animals.map((x) =>
          x.id === a.id ? { ...x, escaped: false, lastPlayedAt: Date.now() } : x
        ),
      }))
      showToast('Caught it! Back in the fence.')
      return
    }
    setChase((c) => ({ ...c, [a.id]: current }))
  }

  function startBreeding(kind: AnimalKind) {
    const adults = animals.filter((a) => a.kind === kind && isGrown(a, now) && !a.escaped).length
    if (adults < 2 || breeding[kind]) return
    setSave((s) => ({ ...s, breeding: { ...s.breeding, [kind]: Date.now() + ANIMALS[kind].breedMs } }))
    showToast(`${ANIMALS[kind].plural} are nesting...`)
  }

  function buyAnimal(kind: AnimalKind) {
    const spec = ANIMALS[kind]
    if (coins < spec.price) return
    setSave((s) => ({
      ...s,
      coins: s.coins - spec.price,
      nextId: s.nextId + 1,
      animals: [
        ...s.animals,
        {
          id: s.nextId,
          kind,
          bornAt: Date.now() - spec.matureMs, // bought grown
          lastProductAt: Date.now(),
          lastPlayedAt: Date.now(),
          escaped: false,
        },
      ],
    }))
    showToast(`Bought a ${spec.label.toLowerCase()}`)
  }

  function clickPlot(index: number) {
    const plot = plots[index]
    if (!plot.crop) {
      setSave((s) => ({
        ...s,
        plots: s.plots.map((p, i) =>
          i === index ? { crop: plantChoice, plantedAt: Date.now(), wateredMs: 0 } : p
        ),
      }))
      showToast(`Planted ${plantChoice}`)
      return
    }
    if (cropProgress(plot, Date.now()) < 100) {
      setSave((s) => ({
        ...s,
        plots: s.plots.map((p, i) =>
          i === index && p.crop ? { ...p, wateredMs: p.wateredMs + CROPS[p.crop].waterMs } : p
        ),
      }))
      showToast('Watered')
      return
    }
    const crop = plot.crop
    const spec = CROPS[crop]
    setSave((s) => ({
      ...s,
      plots: s.plots.map((p, i) => (i === index ? { ...EMPTY_PLOT } : p)),
      inventory: { ...s.inventory, [crop]: (s.inventory[crop] ?? 0) + spec.yield },
    }))
    showToast(`+${spec.yield} ${crop}`)
  }

  function buyKitchen() {
    if (coins < KITCHEN_PRICE) return
    setSave((s) => ({ ...s, coins: s.coins - KITCHEN_PRICE, kitchen: true }))
    showToast('Farm kitchen built!')
  }

  function buyRecipe(id: string) {
    const recipe = RECIPES.find((r) => r.id === id)
    if (!recipe || coins < recipe.price || recipes.includes(id)) return
    setSave((s) => ({ ...s, coins: s.coins - recipe.price, recipes: [...s.recipes, id] }))
    showToast(`Learned ${recipe.label}`)
  }

  function canCook(id: string): boolean {
    const recipe = RECIPES.find((r) => r.id === id)
    if (!recipe || cooking) return false
    return Object.entries(recipe.needs).every(
      ([item, qty]) => (inventory[item as ItemKey] ?? 0) >= (qty ?? 0)
    )
  }

  function cook(id: string) {
    const recipe = RECIPES.find((r) => r.id === id)
    if (!recipe || !canCook(id)) return
    setSave((s) => {
      const inv = { ...s.inventory }
      for (const [item, qty] of Object.entries(recipe.needs)) {
        inv[item as ItemKey] = (inv[item as ItemKey] ?? 0) - (qty ?? 0)
      }
      return { ...s, inventory: inv, cooking: { recipeId: id, doneAt: Date.now() + recipe.cookMs } }
    })
    showToast(`Cooking ${recipe.label}...`)
  }

  function sell(item: ItemKey, qty: number) {
    const have = inventory[item] ?? 0
    const n = Math.min(qty, have)
    if (n <= 0) return
    setSave((s) => ({
      ...s,
      coins: s.coins + PRICES[item] * n,
      inventory: { ...s.inventory, [item]: (s.inventory[item] ?? 0) - n },
    }))
    showToast(`Sold ${n} ${item} for ${PRICES[item] * n} 🪙`)
  }

  function sellAll() {
    const total = (Object.entries(inventory) as [ItemKey, number][]).reduce(
      (sum, [item, qty]) => sum + PRICES[item] * (qty ?? 0),
      0
    )
    if (total <= 0) return
    setSave((s) => ({ ...s, coins: s.coins + total, inventory: {} }))
    showToast(`Sold everything for ${total} 🪙`)
  }

  const escapedGoats = animals.filter((a) => a.escaped)
  const readyCount = animals.filter((a) => productReady(a, now)).length
  const harvestable = plots.filter((p) => p.crop && cropProgress(p, now) >= 100).length
  const inventoryValue = (Object.entries(inventory) as [ItemKey, number][]).reduce(
    (sum, [item, qty]) => sum + PRICES[item] * (qty ?? 0),
    0
  )

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'barn', label: 'Barn', badge: readyCount + escapedGoats.length },
    { key: 'field', label: 'Field', badge: harvestable },
    { key: 'kitchen', label: 'Kitchen' },
    { key: 'market', label: 'Market' },
  ]

  return (
    <div style={styles.wrap}>
      <style>{keyframes}</style>

      <div style={styles.header}>
        <h2 style={styles.title}>Farmstead</h2>
        <span style={styles.coins}>🪙 {coins}</span>
      </div>

      <div style={styles.toastSlot}>{toast && <span style={styles.toast}>{toast}</span>}</div>

      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...styles.tab,
              ...(tab === t.key ? styles.tabActive : null),
            }}
          >
            {t.label}
            {!!t.badge && <span style={styles.badge}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'barn' && (
        <div style={styles.panel}>
          {animals.length === 0 && <p style={styles.empty}>No animals yet. Buy some at the market.</p>}

          {animals.map((a) => {
            const spec = ANIMALS[a.kind]
            const grown = isGrown(a, now)
            const ready = productReady(a, now)
            const bored = !!spec.boredomMs && grown && now - a.lastPlayedAt >= spec.boredomMs
            const contentment = spec.boredomMs
              ? 100 - pct(now - a.lastPlayedAt, spec.boredomMs)
              : null

            return (
              <div
                key={a.id}
                style={{
                  ...styles.row,
                  ...(a.escaped ? styles.rowEscaped : ready ? styles.rowReady : null),
                }}
              >
                <div style={styles.rowArt}>
                  <FarmArt subject={grown ? a.kind : 'chick'} size={grown ? 46 : 34} />
                </div>

                <div style={styles.rowBody}>
                  <div style={styles.rowTitle}>
                    {grown ? spec.label : `Baby ${spec.label.toLowerCase()}`}
                    {a.escaped && <span style={styles.escapeTag}>ESCAPED</span>}
                    {bored && !a.escaped && <span style={styles.boredTag}>BORED</span>}
                  </div>

                  {a.escaped ? (
                    <>
                      <div style={styles.rowNote}>Chase it down - keep clicking, it keeps running.</div>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${chase[a.id] ?? 0}%`, background: '#d9534f' }} />
                      </div>
                    </>
                  ) : !grown ? (
                    <>
                      <div style={styles.rowNote}>
                        Growing up &middot; {formatSecs(spec.matureMs - (now - a.bornAt))} left
                      </div>
                      <div style={styles.barTrack}>
                        <div
                          style={{
                            ...styles.barFill,
                            width: `${pct(now - a.bornAt, spec.matureMs)}%`,
                            background: '#9b7fd4',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={styles.rowNote}>
                        {ready
                          ? `${spec.product} ready!`
                          : `Next ${spec.product} in ${formatSecs(spec.produceMs - (now - a.lastProductAt))}`}
                      </div>
                      <div style={styles.barTrack}>
                        <div
                          style={{
                            ...styles.barFill,
                            width: `${pct(now - a.lastProductAt, spec.produceMs)}%`,
                            background: ready ? '#7cb342' : '#c3b48e',
                          }}
                        />
                      </div>
                      {contentment !== null && (
                        <div style={styles.contentRow}>
                          <span style={styles.contentLabel}>play</span>
                          <div style={styles.barTrackThin}>
                            <div
                              style={{
                                ...styles.barFill,
                                width: `${contentment}%`,
                                background: contentment < 30 ? '#d9534f' : '#5cb8e0',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={styles.rowActions}>
                  {a.escaped ? (
                    <button style={{ ...styles.smallButton, background: '#d9534f' }} onClick={() => chaseClick(a)}>
                      Chase!
                    </button>
                  ) : (
                    <>
                      <button
                        style={{ ...styles.smallButton, opacity: ready ? 1 : 0.35 }}
                        onClick={() => collect(a)}
                        disabled={!ready}
                      >
                        {spec.collectVerb}
                      </button>
                      {spec.boredomMs && grown && (
                        <button style={{ ...styles.smallButton, background: '#5cb8e0' }} onClick={() => play(a)}>
                          Play
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          <div style={styles.sectionLabel}>Breeding</div>
          {ANIMAL_ORDER.map((kind) => {
            const spec = ANIMALS[kind]
            const adults = animals.filter((a) => a.kind === kind && isGrown(a, now) && !a.escaped).length
            const due = breeding[kind]
            return (
              <div key={kind} style={styles.breedRow}>
                <FarmArt subject={kind} size={30} />
                <span style={styles.breedLabel}>
                  {spec.plural} &middot; {adults} adult{adults === 1 ? '' : 's'}
                </span>
                {due ? (
                  <span style={styles.breedNote}>baby in {formatSecs(due - now)}</span>
                ) : (
                  <button
                    style={{ ...styles.smallButton, opacity: adults >= 2 ? 1 : 0.35 }}
                    onClick={() => startBreeding(kind)}
                    disabled={adults < 2}
                  >
                    Breed
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'field' && (
        <div style={styles.panel}>
          <div style={styles.seedRow}>
            {CROP_ORDER.map((c) => (
              <button
                key={c}
                onClick={() => setPlantChoice(c)}
                style={{ ...styles.seedButton, ...(plantChoice === c ? styles.seedActive : null) }}
              >
                <FarmArt subject={c} size={26} />
                {CROPS[c].label}
              </button>
            ))}
          </div>
          <p style={styles.hint}>
            Tap soil to plant {CROPS[plantChoice].label.toLowerCase()}, growing crops to water, ripe ones to harvest.
          </p>

          <div style={styles.field}>
            {plots.map((plot, i) => {
              const progress = cropProgress(plot, now)
              const ripe = plot.crop !== null && progress >= 100
              return (
                <button
                  key={i}
                  onClick={() => clickPlot(i)}
                  style={{
                    ...styles.fieldPlot,
                    animation: ripe ? 'ripePulse 1.2s ease-in-out infinite' : undefined,
                  }}
                  title={!plot.crop ? 'Plant' : ripe ? 'Harvest' : 'Water'}
                >
                  {plot.crop ? (
                    <div style={{ opacity: ripe ? 1 : 0.35 + (progress / 100) * 0.5 }}>
                      <FarmArt subject={plot.crop} size={34} />
                    </div>
                  ) : (
                    <span style={styles.plotEmpty}>+</span>
                  )}
                  {plot.crop && !ripe && (
                    <div style={styles.plotBar}>
                      <div style={{ ...styles.plotBarFill, width: `${progress}%` }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'kitchen' && (
        <div style={styles.panel}>
          {!kitchen ? (
            <div style={styles.buyBox}>
              <FarmArt subject="bread" size={64} />
              <p style={styles.hint}>
                A farm kitchen turns raw goods into dishes worth far more than their ingredients.
              </p>
              <button
                style={{ ...styles.button, opacity: coins >= KITCHEN_PRICE ? 1 : 0.4 }}
                onClick={buyKitchen}
                disabled={coins < KITCHEN_PRICE}
              >
                Build kitchen &middot; {KITCHEN_PRICE} 🪙
              </button>
            </div>
          ) : (
            <>
              {cooking && (
                <div style={styles.cookingBox}>
                  <span style={styles.rowNote}>
                    Cooking {RECIPES.find((r) => r.id === cooking.recipeId)?.label}... {formatSecs(cooking.doneAt - now)}
                  </span>
                </div>
              )}

              {RECIPES.map((r) => {
                const owned = recipes.includes(r.id)
                const cookable = owned && canCook(r.id)
                return (
                  <div key={r.id} style={styles.row}>
                    <div style={styles.rowArt}>
                      <div style={{ opacity: owned ? 1 : 0.3 }}>
                        <FarmArt subject={r.produces} size={42} />
                      </div>
                    </div>
                    <div style={styles.rowBody}>
                      <div style={styles.rowTitle}>{r.label}</div>
                      <div style={styles.rowNote}>
                        {Object.entries(r.needs)
                          .map(([item, qty]) => `${qty} ${item}`)
                          .join(' + ')}
                      </div>
                      <div style={styles.rowNote}>sells for {PRICES[r.produces]} 🪙</div>
                    </div>
                    <div style={styles.rowActions}>
                      {owned ? (
                        <button
                          style={{ ...styles.smallButton, opacity: cookable ? 1 : 0.35 }}
                          onClick={() => cook(r.id)}
                          disabled={!cookable}
                        >
                          Cook
                        </button>
                      ) : (
                        <button
                          style={{ ...styles.smallButton, opacity: coins >= r.price ? 1 : 0.35 }}
                          onClick={() => buyRecipe(r.id)}
                          disabled={coins < r.price}
                        >
                          Learn &middot; {r.price}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {tab === 'market' && (
        <div style={styles.panel}>
          <div style={styles.sectionLabel}>Your goods</div>
          {inventoryValue === 0 && <p style={styles.empty}>Nothing to sell yet.</p>}

          {(Object.keys(PRICES) as ItemKey[])
            .filter((item) => (inventory[item] ?? 0) > 0)
            .map((item) => (
              <div key={item} style={styles.row}>
                <div style={styles.rowArt}>
                  <FarmArt subject={item} size={38} />
                </div>
                <div style={styles.rowBody}>
                  <div style={styles.rowTitle}>
                    {item} &times;{inventory[item]}
                  </div>
                  <div style={styles.rowNote}>
                    {PRICES[item]} 🪙 each &middot; {RAW_ITEMS.includes(item) ? 'raw' : 'cooked'}
                  </div>
                </div>
                <div style={styles.rowActions}>
                  <button style={styles.smallButton} onClick={() => sell(item, 1)}>
                    Sell 1
                  </button>
                  <button style={styles.smallButton} onClick={() => sell(item, inventory[item] ?? 0)}>
                    Sell all
                  </button>
                </div>
              </div>
            ))}

          {inventoryValue > 0 && (
            <button style={styles.button} onClick={sellAll}>
              Sell everything &middot; {inventoryValue} 🪙
            </button>
          )}

          <div style={styles.sectionLabel}>Livestock for sale</div>
          {ANIMAL_ORDER.map((kind) => {
            const spec = ANIMALS[kind]
            return (
              <div key={kind} style={styles.row}>
                <div style={styles.rowArt}>
                  <FarmArt subject={kind} size={44} />
                </div>
                <div style={styles.rowBody}>
                  <div style={styles.rowTitle}>{spec.label}</div>
                  <div style={styles.rowNote}>
                    gives {spec.product} every {formatSecs(spec.produceMs)}
                    {spec.boredomMs ? ' · needs play' : ''}
                  </div>
                </div>
                <div style={styles.rowActions}>
                  <button
                    style={{ ...styles.smallButton, opacity: coins >= spec.price ? 1 : 0.35 }}
                    onClick={() => buyAnimal(kind)}
                    disabled={coins < spec.price}
                  >
                    Buy &middot; {spec.price}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button style={styles.exitButton} onClick={onExit}>
        Leave farmstead
      </button>
    </div>
  )
}

const keyframes = `
@keyframes ripePulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 9px 3px rgba(255, 215, 0, 0.5); }
  100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.5); }
}
`

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#fdf6e3',
    borderRadius: 12,
    padding: 'clamp(14px, 4vw, 24px)',
    width: 'min(440px, calc(100vw - 20px))',
    maxHeight: 'calc(100vh - 20px)',
    overflowY: 'auto',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  header: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { margin: 0, color: '#3a2e1f' },
  coins: { fontSize: 15, fontWeight: 700, color: '#8a6b1f' },
  toastSlot: { height: 22, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  toast: {
    background: '#3a2e1f',
    color: '#fdf6e3',
    fontSize: 12.5,
    padding: '2px 10px',
    borderRadius: 10,
  },
  tabs: { display: 'flex', gap: 4, margin: '6px 0 12px' },
  tab: {
    flex: 1,
    padding: '7px 4px',
    fontSize: 12.5,
    border: 'none',
    borderRadius: 7,
    background: '#eadfc4',
    color: '#6b5a44',
    cursor: 'pointer',
    position: 'relative',
  },
  tabActive: { background: '#3a2e1f', color: '#fdf6e3', fontWeight: 600 },
  badge: {
    marginLeft: 5,
    background: '#d9534f',
    color: 'white',
    borderRadius: 9,
    padding: '0 5px',
    fontSize: 10.5,
    fontWeight: 700,
  },
  panel: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { margin: '8px 0', fontSize: 13, color: '#8a7a63', textAlign: 'center' },
  hint: { margin: '0 0 6px', fontSize: 12.5, color: '#6b5a44', textAlign: 'center' },
  sectionLabel: {
    marginTop: 8,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8a7a63',
    fontWeight: 700,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    background: '#f2e6c9',
    borderRadius: 9,
    padding: 8,
  },
  rowReady: { background: '#e6efd4' },
  rowEscaped: { background: '#f6ddd9' },
  rowArt: { flexShrink: 0, width: 48, display: 'flex', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13.5, fontWeight: 600, color: '#3a2e1f', display: 'flex', alignItems: 'center', gap: 5 },
  rowNote: { fontSize: 11.5, color: '#6b5a44', marginTop: 1 },
  escapeTag: { fontSize: 9, background: '#d9534f', color: 'white', borderRadius: 4, padding: '1px 4px', fontWeight: 700 },
  boredTag: { fontSize: 9, background: '#d9a441', color: 'white', borderRadius: 4, padding: '1px 4px', fontWeight: 700 },
  rowActions: { display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 },
  barTrack: { height: 6, background: '#e3d5b8', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  barTrackThin: { flex: 1, height: 4, background: '#e3d5b8', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.25s ease' },
  contentRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 },
  contentLabel: { fontSize: 9.5, color: '#8a7a63', textTransform: 'uppercase', letterSpacing: 0.5 },
  breedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f2e6c9',
    borderRadius: 8,
    padding: '5px 8px',
  },
  breedLabel: { flex: 1, fontSize: 12.5, color: '#3a2e1f' },
  breedNote: { fontSize: 11.5, color: '#6b5a44' },
  seedRow: { display: 'flex', gap: 6, justifyContent: 'center' },
  seedButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    fontSize: 12.5,
    border: '2px solid transparent',
    borderRadius: 7,
    background: '#eadfc4',
    color: '#6b5a44',
    cursor: 'pointer',
  },
  seedActive: { borderColor: '#7cb342', background: '#e6efd4', color: '#3a2e1f', fontWeight: 600 },
  field: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
  },
  fieldPlot: {
    position: 'relative',
    aspectRatio: '1',
    border: 'none',
    borderRadius: 8,
    background: '#a9835c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  plotEmpty: { fontSize: 22, color: '#c9a883' },
  plotBar: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    height: 4,
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  plotBarFill: { height: '100%', background: '#7cb342' },
  buyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' },
  cookingBox: { background: '#e6efd4', borderRadius: 8, padding: 8, textAlign: 'center' },
  button: {
    padding: '9px 20px',
    fontSize: 14,
    borderRadius: 8,
    border: 'none',
    background: '#7cb342',
    color: 'white',
    cursor: 'pointer',
    marginTop: 4,
  },
  smallButton: {
    padding: '5px 9px',
    fontSize: 11.5,
    borderRadius: 6,
    border: 'none',
    background: '#7cb342',
    color: 'white',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  exitButton: {
    display: 'block',
    margin: '14px auto 0',
    background: 'none',
    border: 'none',
    color: '#8a7a63',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 13,
  },
}
