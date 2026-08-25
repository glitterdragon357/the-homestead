import { useState } from 'react'
import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { AnimalPen } from './AnimalPen'
import { FieldPanel } from './FieldPanel'
import { KitchenPanel } from './KitchenPanel'
import { UpgradesPanel } from './UpgradesPanel'
import {
  cropProgress,
  levelOf,
  penPending,
  productReady,
  type FieldSave,
  type KitchenSave,
  type PenSave,
} from './farmData'
import { panel } from './farmStyles'

/**
 * The whole farm behind a single icon: animals, field, kitchen and
 * upgrades as tabs of one panel.
 *
 * This was briefly split into four map tiles. It read as errands rather
 * than a farm - you had to remember which building held which job, and
 * upgrading meant a trip to the market. Keeping the parts as tabs means
 * one click gets you everything, while each part still keeps its own save
 * and its own upgrade ladder underneath.
 *
 * Livestock and tackle are still bought at the market; this panel handles
 * the buildings themselves.
 */

type Tab = 'animals' | 'field' | 'kitchen' | 'upgrades'

export function FarmsteadMinigame({ onExit }: MinigameProps) {
  const coins = useHomesteadStore((s) => s.coins)
  const progress = useHomesteadStore((s) => s.progress)
  const [tab, setTab] = useState<Tab>('animals')

  const now = Date.now()
  const badges = tabBadges(progress, now)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'animals', label: 'Animals' },
    { key: 'field', label: 'Field' },
    { key: 'kitchen', label: 'Kitchen' },
    { key: 'upgrades', label: 'Upgrades' },
  ]

  return (
    <div style={panel.wrap}>
      <div style={panel.header}>
        <h2 style={panel.title}>Farmstead</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : null) }}
          >
            {t.label}
            {!!badges[t.key] && <span style={styles.badge}>{badges[t.key]}</span>}
          </button>
        ))}
      </div>

      {tab === 'animals' && (
        <AnimalPen
          buildingId="barn"
          kinds={['chicken', 'goat', 'cow']}
          emptyHint="No livestock. Buy some at the market."
        />
      )}
      {tab === 'field' && <FieldPanel />}
      {tab === 'kitchen' && <KitchenPanel />}
      {tab === 'upgrades' && <UpgradesPanel />}

      <button style={panel.exitButton} onClick={onExit}>
        Leave farmstead
      </button>
    </div>
  )
}

/** Counts for the little red numbers on each tab. */
function tabBadges(progress: Record<string, unknown>, now: number): Record<Tab, number> {
  const barn = penPending('barn', progress.barn as PenSave, now)

  const field = progress.field as FieldSave | undefined
  const ripe = field?.plots
    ? field.plots.filter(
        (p) => p.crop && cropProgress(p, now, levelOf('field', field.level ?? 0).speedMult) >= 100
      ).length
    : 0

  const kitchen = progress.kitchen as KitchenSave | undefined
  const plated = kitchen?.cooking?.filter((c) => now >= c.doneAt).length ?? 0

  return { animals: barn?.count ?? 0, field: ripe, kitchen: plated, upgrades: 0 }
}

/**
 * What the farmstead has waiting, for the badge on its map tile. Sums
 * every tab so one number on the map means "there is something to do".
 */
export function farmsteadPending(progress: Record<string, unknown>, now: number) {
  const badges = tabBadges(progress, now)
  const count = badges.animals + badges.field + badges.kitchen
  if (count === 0) return null
  const barn = progress.barn as PenSave | undefined
  const escaped = (barn?.animals ?? []).some((a) => a.escaped)
  return { count, urgent: escaped }
}

/** Re-exported so the registry can keep its imports tidy. */
export { productReady }

const styles: Record<string, React.CSSProperties> = {
  tabs: { display: 'flex', gap: 4 },
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
}
