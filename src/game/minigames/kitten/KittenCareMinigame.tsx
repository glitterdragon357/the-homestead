import { useEffect, useState } from 'react'
import type { MinigameProps } from '../registry'

/**
 * Kitten care minigame: keep a kitten's needs topped up by giving milk,
 * a pacifier, a toy to play with, or letting it nap. Each need drains
 * slowly over time; get all four comfortably full to "win" a round.
 */

type NeedKey = 'hunger' | 'comfort' | 'play' | 'energy'

const NEED_LABELS: Record<NeedKey, string> = {
  hunger: 'Hunger',
  comfort: 'Comfort',
  play: 'Playfulness',
  energy: 'Energy',
}

const NEED_COLORS: Record<NeedKey, string> = {
  hunger: '#e0995c',
  comfort: '#9b7fd4',
  play: '#5cb8e0',
  energy: '#7cb342',
}

const DRAIN_PER_TICK = 0.6
const TICK_MS = 400
const ACTION_BOOST = 22
const WIN_THRESHOLD = 80

export function KittenCareMinigame({ onComplete, onExit }: MinigameProps) {
  const [needs, setNeeds] = useState<Record<NeedKey, number>>({
    hunger: 55,
    comfort: 55,
    play: 55,
    energy: 55,
  })
  const [won, setWon] = useState(false)
  const [napping, setNapping] = useState(false)

  useEffect(() => {
    if (won) return
    const interval = setInterval(() => {
      setNeeds((prev) => {
        const next: Record<NeedKey, number> = { ...prev }
        for (const key of Object.keys(next) as NeedKey[]) {
          const drain = key === 'energy' && napping ? -1.5 : DRAIN_PER_TICK
          next[key] = clamp(next[key] - drain)
        }
        return next
      })
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [won, napping])

  useEffect(() => {
    const allHigh = (Object.values(needs) as number[]).every((v) => v >= WIN_THRESHOLD)
    if (allHigh && !won) setWon(true)
  }, [needs, won])

  function boost(key: NeedKey) {
    if (won) return
    if (key === 'energy') {
      setNapping(true)
      window.setTimeout(() => setNapping(false), 1600)
    }
    setNeeds((prev) => ({ ...prev, [key]: clamp(prev[key] + ACTION_BOOST) }))
  }

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Kitten Care</h2>
      <p style={styles.hint}>
        {napping ? 'Shh, the kitten is napping...' : 'Keep every need topped up.'}
      </p>

      <div style={styles.bars}>
        {(Object.keys(needs) as NeedKey[]).map((key) => (
          <div key={key} style={styles.barRow}>
            <span style={styles.barLabel}>{NEED_LABELS[key]}</span>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barFill,
                  width: `${needs[key]}%`,
                  background: NEED_COLORS[key],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {!won && (
        <div style={styles.actions}>
          <button style={styles.actionButton} onClick={() => boost('hunger')}>
            🍼 Give milk
          </button>
          <button style={styles.actionButton} onClick={() => boost('comfort')}>
            🩷 Give pacifier
          </button>
          <button style={styles.actionButton} onClick={() => boost('play')}>
            🧶 Give toy
          </button>
          <button style={styles.actionButton} onClick={() => boost('energy')} disabled={napping}>
            😴 Nap time
          </button>
        </div>
      )}

      {won && (
        <div>
          <p style={styles.resultText}>🐱 The kitten is happy and content!</p>
          <button style={styles.button} onClick={() => onComplete({ success: true })}>
            Done
          </button>
        </div>
      )}

      <button style={styles.exitButton} onClick={onExit}>
        Leave kitten
      </button>
    </div>
  )
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#fdf6e3',
    borderRadius: 12,
    padding: 32,
    width: 380,
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  title: { margin: '0 0 4px', color: '#3a2e1f' },
  hint: { margin: '0 0 20px', color: '#6b5a44', fontSize: 14, minHeight: 18 },
  bars: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10 },
  barLabel: { width: 88, fontSize: 13, color: '#3a2e1f', textAlign: 'left' },
  barTrack: {
    flex: 1,
    height: 14,
    background: '#e3d5b8',
    borderRadius: 7,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
    transition: 'width 0.2s ease',
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 8,
  },
  actionButton: {
    padding: '10px 12px',
    fontSize: 14,
    borderRadius: 8,
    border: 'none',
    background: '#7cb342',
    color: 'white',
    cursor: 'pointer',
  },
  button: {
    padding: '10px 24px',
    fontSize: 15,
    borderRadius: 8,
    border: 'none',
    background: '#7cb342',
    color: 'white',
    cursor: 'pointer',
  },
  resultText: { fontWeight: 600, marginBottom: 12 },
  exitButton: {
    display: 'block',
    margin: '16px auto 0',
    background: 'none',
    border: 'none',
    color: '#8a7a63',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 13,
  },
}
