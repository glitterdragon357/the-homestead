import type { MinigameProps } from '../registry'
import { useHomesteadStore } from '../../state/store'
import { AnimalPen } from './AnimalPen'
import { panel } from './farmStyles'

export function CoopMinigame({ onExit }: MinigameProps) {
  const coins = useHomesteadStore((s) => s.coins)

  return (
    <div style={panel.wrap}>
      <div style={panel.header}>
        <h2 style={panel.title}>Chicken Coop</h2>
        <span style={panel.coins}>🪙 {coins}</span>
      </div>

      <AnimalPen
        buildingId="coop"
        kinds={['chicken']}
        onExit={onExit}
        emptyHint="No hens. Buy some at the market."
      />
    </div>
  )
}
