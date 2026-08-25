import { useHomesteadStore } from '../game/state/store'
import { MINIGAME_REGISTRY } from '../game/minigames/registry'

/**
 * The app's home screen: a scrollable list of minigame cards, Roblox-style.
 * Clicking a card opens that minigame full-screen via MinigameOverlay.
 * The isometric map/canvas code still exists under game/world and
 * game/isometric - it's just not mounted here anymore.
 */
export function MinigameHub() {
  const openMinigame = useHomesteadStore((s) => s.openMinigame)
  const games = Object.values(MINIGAME_REGISTRY)

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>The Homestead</h1>
      <p style={styles.subtitle}>Pick a minigame to play.</p>

      <div style={styles.list}>
        {games.map((game) => (
          <button key={game.id} style={styles.card} onClick={() => openMinigame(game.id)}>
            <span style={styles.icon}>{game.icon}</span>
            <span style={styles.cardBody}>
              <span style={styles.cardTitle}>{game.name}</span>
              <span style={styles.cardDescription}>{game.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: 480,
    maxWidth: '90vw',
    color: '#f4ead9',
    fontFamily: 'system-ui, sans-serif',
  },
  title: { margin: '0 0 4px', fontSize: 28 },
  subtitle: { margin: '0 0 24px', opacity: 0.75 },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '14px 18px',
    borderRadius: 12,
    border: '1px solid rgba(244,234,217,0.15)',
    background: 'rgba(244,234,217,0.06)',
    color: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
    font: 'inherit',
  },
  icon: { fontSize: 32, lineHeight: 1 },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 2 },
  cardTitle: { fontWeight: 600, fontSize: 16 },
  cardDescription: { fontSize: 13, opacity: 0.7 },
}
