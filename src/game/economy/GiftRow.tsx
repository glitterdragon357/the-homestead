import { useEffect, useRef, useState } from 'react'
import { useHomesteadStore } from '../state/store'
import { TRADES, tradeLabel } from './trades'
import { panel } from '../minigames/farm/farmStyles'

/**
 * Send coins from this trade's purse to another.
 *
 * Purses are deliberately separate, so this is the one sanctioned way to
 * move money between them - a young trade can be staked by an established
 * one without quietly making the wallets shared again.
 *
 * Pick an amount, then pick who gets it: one tap to send, and every
 * recipient shows what it currently holds so the choice is informed. The
 * panel expands inline rather than floating, because the game panels
 * scroll and an absolutely-positioned popover would be clipped.
 */
export function GiftRow({ from }: { from: string }) {
  const purses = useHomesteadStore((s) => s.purses)
  const gift = useHomesteadStore((s) => s.gift)

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState<number | 'all'>(25)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(toastTimeout.current), [])

  const balance = purses[from] ?? 0
  const others = TRADES.filter((t) => t.id !== from)
  const sending = amount === 'all' ? balance : Math.min(amount, balance)

  function send(to: string) {
    if (sending <= 0) {
      setToast('Nothing to give.')
      window.clearTimeout(toastTimeout.current)
      toastTimeout.current = window.setTimeout(() => setToast(null), 1500)
      return
    }
    if (!gift(from, to, sending)) return
    setToast(`Gave ${sending} 🪙 to the ${tradeLabel(to).toLowerCase()}`)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1800)
    setOpen(false)
  }

  return (
    <>
      <button style={styles.toggle} onClick={() => setOpen((v) => !v)}>
        🎁 {open ? 'Close' : 'Gift coins to another trade'}
      </button>

      {toast && <div style={styles.toastRow}>{toast}</div>}

      {open && (
        <div style={styles.tray}>
          <div style={styles.amountRow}>
            {([10, 25, 100, 'all'] as const).map((a) => (
              <button
                key={String(a)}
                onClick={() => setAmount(a)}
                style={{ ...styles.chip, ...(amount === a ? styles.chipOn : null) }}
              >
                {a === 'all' ? `All (${balance})` : a}
              </button>
            ))}
          </div>

          <div style={panel.rowNote}>
            {sending > 0
              ? `Sending ${sending} 🪙 — choose who gets it:`
              : 'This purse is empty.'}
          </div>

          <div style={styles.targets}>
            {others.map((t) => (
              <button
                key={t.id}
                onClick={() => send(t.id)}
                disabled={sending <= 0}
                style={{ ...styles.target, opacity: sending > 0 ? 1 : 0.4 }}
                title={`Give ${sending} to the ${t.label.toLowerCase()}`}
              >
                <span style={{ fontSize: 17 }}>{t.icon}</span>
                <span style={styles.targetLabel}>{t.label}</span>
                <span style={styles.targetPurse}>{purses[t.id] ?? 0} 🪙</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toggle: {
    display: 'block',
    width: '100%',
    padding: '6px 8px',
    fontSize: 12,
    border: 'none',
    borderRadius: 7,
    background: '#eadfc4',
    color: '#6b5a44',
    cursor: 'pointer',
  },
  toastRow: {
    fontSize: 12,
    color: '#4f7a3a',
    textAlign: 'center',
    padding: '3px 0',
  },
  tray: {
    background: '#f2e6c9',
    borderRadius: 9,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  amountRow: { display: 'flex', gap: 4 },
  chip: {
    flex: 1,
    padding: '5px 4px',
    fontSize: 11.5,
    border: 'none',
    borderRadius: 6,
    background: '#fdf6e3',
    color: '#6b5a44',
    cursor: 'pointer',
  },
  chipOn: { background: '#3a2e1f', color: '#fdf6e3', fontWeight: 700 },
  targets: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 },
  target: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '6px 2px',
    border: 'none',
    borderRadius: 7,
    background: '#fdf6e3',
    cursor: 'pointer',
  },
  targetLabel: { fontSize: 9, color: '#3a2e1f', lineHeight: 1.1 },
  targetPurse: { fontSize: 9, color: '#8a7a63', fontWeight: 700 },
}
