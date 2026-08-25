import { useEffect, useRef, useState } from 'react'
import { useHomesteadStore } from '../../state/store'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { FarmArt } from './FarmArt'
import { priceOf } from '../../economy/items'
import { RECIPES, levelOf, type KitchenSave } from './farmData'
import { panel } from './farmStyles'

export function KitchenPanel() {
  const [save, setSave] = useMinigameProgress<KitchenSave>('kitchen', () => ({
    level: 0,
    recipes: [],
    cooking: [],
  }))
  const coins = useHomesteadStore((s) => s.coins)
  const inventory = useHomesteadStore((s) => s.inventory)
  const spend = useHomesteadStore((s) => s.spend)
  const addItem = useHomesteadStore((s) => s.addItem)
  const takeItems = useHomesteadStore((s) => s.takeItems)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  const [, repaint] = useState(0)

  const level = levelOf('kitchen', save.level ?? 0)
  const now = Date.now()
  const cooking = save.cooking ?? []
  const recipes = save.recipes ?? []

  useEffect(() => {
    const interval = window.setInterval(() => repaint((n) => n + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  // Plate up anything whose timer is done.
  useEffect(() => {
    const done = cooking.filter((c) => now >= c.doneAt)
    if (!done.length) return
    setSave((s) => ({ ...s, cooking: (s.cooking ?? []).filter((c) => Date.now() < c.doneAt) }))
    for (const c of done) {
      const recipe = RECIPES.find((r) => r.id === c.recipeId)
      if (recipe) addItem(recipe.produces, 1)
    }
    showToast(done.length === 1 ? 'A dish is ready!' : `${done.length} dishes ready!`)
  }, [cooking, now, setSave, addItem])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1400)
  }

  function buyRecipe(id: string) {
    const recipe = RECIPES.find((r) => r.id === id)
    if (!recipe || recipes.includes(id)) return
    if (!spend(recipe.price)) return
    setSave((s) => ({ ...s, recipes: [...(s.recipes ?? []), id] }))
    showToast(`Learned ${recipe.label}`)
  }

  function hasIngredients(id: string): boolean {
    const recipe = RECIPES.find((r) => r.id === id)
    if (!recipe) return false
    return Object.entries(recipe.needs).every(([item, qty]) => (inventory[item] ?? 0) >= qty)
  }

  function cook(id: string) {
    const recipe = RECIPES.find((r) => r.id === id)
    if (!recipe || cooking.length >= level.capacity) return
    if (!takeItems(recipe.needs)) return
    setSave((s) => ({
      ...s,
      cooking: [...(s.cooking ?? []), { recipeId: id, doneAt: Date.now() + recipe.cookMs * level.speedMult }],
    }))
    showToast(`Cooking ${recipe.label}...`)
  }

  return (
    <>
      <div style={panel.subhead}>
        <span>
          {level.label} &middot; {cooking.length}/{level.capacity} pots going
        </span>
      </div>

      <div style={panel.toastSlot}>{toast && <span style={panel.toast}>{toast}</span>}</div>

      {cooking.map((c, i) => {
        const recipe = RECIPES.find((r) => r.id === c.recipeId)
        return (
          <div key={i} style={{ ...panel.row, ...panel.rowReady }}>
            <div style={panel.rowArt}>
              {recipe && <FarmArt subject={recipe.produces} size={38} />}
            </div>
            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>{recipe?.label}</div>
              <div style={panel.rowNote}>ready in {formatSecs(c.doneAt - now)}</div>
            </div>
          </div>
        )
      })}

      <div style={panel.sectionLabel}>Recipes</div>

      {RECIPES.map((r) => {
        const owned = recipes.includes(r.id)
        const ready = owned && hasIngredients(r.id) && cooking.length < level.capacity
        const missing = owned && !hasIngredients(r.id)
        return (
          <div key={r.id} style={panel.row}>
            <div style={panel.rowArt}>
              <div style={{ opacity: owned ? 1 : 0.3 }}>
                <FarmArt subject={r.produces} size={40} />
              </div>
            </div>
            <div style={panel.rowBody}>
              <div style={panel.rowTitle}>{r.label}</div>
              <div style={{ ...panel.rowNote, color: missing ? '#b5563f' : '#6b5a44' }}>
                {Object.entries(r.needs)
                  .map(([item, qty]) => `${inventory[item] ?? 0}/${qty} ${item}`)
                  .join(' · ')}
              </div>
              <div style={panel.rowNote}>sells for {priceOf(r.produces)} 🪙</div>
            </div>
            <div style={panel.rowActions}>
              {owned ? (
                <button
                  style={{ ...panel.smallButton, opacity: ready ? 1 : 0.35 }}
                  onClick={() => cook(r.id)}
                  disabled={!ready}
                >
                  Cook
                </button>
              ) : (
                <button
                  style={{ ...panel.darkButton, opacity: coins >= r.price ? 1 : 0.4 }}
                  onClick={() => buyRecipe(r.id)}
                  disabled={coins < r.price}
                >
                  Learn · {r.price}
                </button>
              )}
            </div>
          </div>
        )
      })}

    </>
  )
}

function formatSecs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
