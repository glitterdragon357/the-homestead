import { MinigameOverlay } from './game/minigames/MinigameOverlay'
import { MinigameHub } from './ui/MinigameHub'

// Note: the isometric map (game/world/HomesteadCanvas.tsx, game/isometric/*)
// is still in the codebase and untouched - it's just not mounted as the
// home screen anymore. The hub below replaces it as the entry point.
export default function App() {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <MinigameHub />
      <MinigameOverlay />
    </div>
  )
}
