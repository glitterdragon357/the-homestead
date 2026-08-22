import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'

/**
 * Placeholder minigame: a classic "stop the moving marker in the target
 * zone" timing bar. Swap this out for real farming mechanics later - it
 * exists mainly to prove out the overlay/registry plumbing end to end.
 */
export function FarmingMinigame({ onComplete, onExit }: MinigameProps) {
  const [markerPos, setMarkerPos] = useState(0)
  const [result, setResult] = useState<'success' | 'miss' | null>(null)
  const directionRef = useRef(1)

  useEffect(() => {
    if (result) return
    const interval = setInterval(() => {
      setMarkerPos((prev) => {
        let next = prev + directionRef.current * 3
        if (next >= 100) {
          next = 100
          directionRef.current = -1
        } else if (next <= 0) {
          next = 0
          directionRef.current = 1
        }
        return next
      })
    }, 16)
    return () => clearInterval(interval)
  }, [result])

  const targetStart = 40
  const targetEnd = 60

  function handlePlant() {
    const hit = markerPos >= targetStart && markerPos <= targetEnd
    setResult(hit ? 'success' : 'miss')
  }

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Vegetable Patch</h2>
      <p style={styles.hint}>Stop the marker in the green zone to plant.</p>

      <div style={styles.track}>
        <div
          style={{
            ...styles.targetZone,
            left: `${targetStart}%`,
            width: `${targetEnd - targetStart}%`,
          }}
        />
        <div style={{ ...styles.marker, left: `${markerPos}%` }} />
      </div>

      {result === null && (
        <button style={styles.button} onClick={handlePlant}>
          Plant
        </button>
      )}

      {result === 'success' && (
        <div>
          <p style={styles.resultText}>🌱 Planted successfully!</p>
          <button style={styles.button} onClick={() => onComplete({ success: true })}>
            Done
          </button>
        </div>
      )}

      {result === 'miss' && (
        <div>
          <p style={styles.resultText}>Missed the timing - try again.</p>
          <button
            style={styles.button}
            onClick={() => {
              setResult(null)
              setMarkerPos(0)
              directionRef.current = 1
            }}
          >
            Retry
          </button>
        </div>
      )}

      <button style={styles.exitButton} onClick={onExit}>
        Leave patch
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#fdf6e3',
    borderRadius: 12,
    padding: 32,
    width: 360,
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  title: { margin: '0 0 4px', color: '#3a2e1f' },
  hint: { margin: '0 0 20px', color: '#6b5a44', fontSize: 14 },
  track: {
    position: 'relative',
    height: 24,
    background: '#e3d5b8',
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  targetZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    background: '#7cb342',
  },
  marker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 32,
    background: '#3a2e1f',
    transform: 'translateX(-2px)',
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
