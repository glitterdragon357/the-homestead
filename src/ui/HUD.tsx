import { useHomesteadStore } from '../game/state/store'
import { valueOf } from '../game/economy/items'

export function HUD() {
  const coins = useHomesteadStore((s) => s.coins)
  const inventory = useHomesteadStore((s) => s.inventory)
  const resetSave = useHomesteadStore((s) => s.resetSave)

  const crateCount = Object.values(inventory).reduce((a, b) => a + (b ?? 0), 0)
  const crateValue = valueOf(inventory)

  function handleReset() {
    if (window.confirm('Erase your homestead save? This cannot be undone.')) {
      resetSave()
    }
  }

  return (
    <div className="hud" style={styles.wrap}>
      <div>
        The Homestead &middot; 🪙 {coins}
      </div>
      <div style={styles.dim}>
        Crate: {crateCount} item{crateCount === 1 ? '' : 's'}
        {crateCount > 0 && ` · worth ${crateValue} 🪙`}
      </div>
      <div style={styles.dim}>
        Click a building to visit it. A badge means something is waiting.
      </div>
      <div style={styles.dim}>
        Progress saves automatically &middot;{' '}
        <button style={styles.reset} onClick={handleReset}>
          reset save
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  // Positioning lives in the `.hud` class in index.css so a media query can
  // lift it off the canvas on narrow screens.
  wrap: {
    color: '#f4ead9',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 'clamp(11px, 2.6vw, 14px)',
    background: 'rgba(0,0,0,0.4)',
    padding: '10px 14px',
    borderRadius: 8,
  },
  dim: { opacity: 0.75, marginTop: 2 },
  reset: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#f4ead9',
    textDecoration: 'underline',
    cursor: 'pointer',
    font: 'inherit',
    opacity: 0.9,
  },
}
