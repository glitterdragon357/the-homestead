import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { AnimalPen } from './AnimalPen'
import { panel } from './farmStyles'

export function BarnMinigame({ onExit }: MinigameProps) {
  const coins = useHomesteadStore((s) => s.coins)

  return (
    <div style={panel.wrap}>
      <div style={panel.header}>
        <h2 style={panel.title}>Barn</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <AnimalPen
        buildingId="barn"
        kinds={['goat', 'cow']}
        onExit={onExit}
        emptyHint="Empty stalls. Buy goats or cows at the market."
      />
    </div>
  )
}
