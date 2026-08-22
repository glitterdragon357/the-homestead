import { useHomesteadStore } from '../state/store'
import { MINIGAME_REGISTRY } from './registry'

export function MinigameOverlay() {
  const activeMinigameId = useHomesteadStore((s) => s.activeMinigameId)
  const closeMinigame = useHomesteadStore((s) => s.closeMinigame)

  if (!activeMinigameId) return null

  const definition = MINIGAME_REGISTRY[activeMinigameId]
  if (!definition) {
    console.warn(`Unknown minigame id: ${activeMinigameId}`)
    return null
  }

  const MinigameComponent = definition.component

  return (
    <div style={overlayStyle}>
      <MinigameComponent
        onComplete={(result) => {
          // TODO: persist result (inventory, XP, homestead state) once the
          // backend exists. For now, just close the overlay.
          console.log(`Minigame "${definition.id}" completed:`, result)
          closeMinigame()
        }}
        onExit={closeMinigame}
      />
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.55)',
  zIndex: 1000,
}
