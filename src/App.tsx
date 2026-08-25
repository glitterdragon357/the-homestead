import { HomesteadCanvas } from './game/world/HomesteadCanvas'
import { MinigameOverlay } from './game/minigames/MinigameOverlay'
import { HUD } from './ui/HUD'

export default function App() {
  return (
    <div className="app-shell" style={{ position: 'relative', width: '100%', maxWidth: 960 }}>
      <HomesteadCanvas />
      <HUD />
      <MinigameOverlay />
    </div>
  )
}
