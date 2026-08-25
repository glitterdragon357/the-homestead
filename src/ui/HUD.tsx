import { useHomesteadStore } from '../game/state/store'

export function HUD() {
  const player = useHomesteadStore((s) => s.player)
  const resetSave = useHomesteadStore((s) => s.resetSave)

  function handleReset() {
    if (window.confirm('Erase your homestead save? This cannot be undone.')) {
      resetSave()
    }
  }

  return (
    <div style={styles.wrap}>
      <div>The Homestead</div>
      <div style={styles.dim}>
        Position: ({player.x}, {player.y})
      </div>
      <div style={styles.dim}>
        Click a tile to move. Dirt patches, the 🐱 and the pond launch minigames.
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
  wrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    color: '#f4ead9',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 14,
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
