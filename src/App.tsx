import { HomesteadCanvas } from './game/world/HomesteadCanvas'
import { MinigameOverlay } from './game/minigames/MinigameOverlay'
import { HUD } from './ui/HUD'

export default function App() {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <HomesteadCanvas />
      <HUD />
      <MinigameOverlay />
    </div>
  )
}
