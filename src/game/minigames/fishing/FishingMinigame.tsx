import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'

/**
 * Fishing minigame: cast a line, react to the bite within a short window
 * to hook the fish, then time clicks on a moving marker to reel it in.
 * While reeling you only know how the fish *feels* - the species is
 * revealed at the moment you land it. Landed fish pay out coins, which
 * buy rod upgrades that shorten the wait for bites, widen the hook
 * reaction window, and pull in bigger fish.
 *
 * ADDING A SPECIES: append one line to FISH with a name, icon, tier, and
 * weight (relative spawn frequency). Everything else - coin value, reel
 * difficulty, number of reels, the size hint shown while fighting it -
 * comes from its tier, so payouts always scale with difficulty. Use
 * `valueMult` only when a species should be worth more or less than its
 * tier-mates (that's also what keeps a tier's payout from being fully
 * predictable from the hint alone).
 */

type Phase = 'idle' | 'waiting' | 'biting' | 'reeling' | 'caught' | 'escaped'

type TierKey = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'legendary'

/**
 * The difficulty/reward ladder. Past the middle tiers we add *more reels*
 * rather than shrinking the target further - a sub-20% target is luck, not
 * timing, whereas landing three good pulls in a row still feels earned.
 */
interface Tier {
  /** Vague "how does it feel on the line" hint - never names the fish. */
  hint: string
  baseCoins: number
  markerSpeed: number
  targetWidth: number
  reels: number
}

const TIER_ORDER: TierKey[] = ['tiny', 'small', 'medium', 'large', 'huge', 'legendary']

const TIERS: Record<TierKey, Tier> = {
  tiny: { hint: 'Barely a nibble - feels tiny', baseCoins: 2, markerSpeed: 1.8, targetWidth: 38, reels: 1 },
  small: { hint: 'A light little tug', baseCoins: 4, markerSpeed: 2.4, targetWidth: 32, reels: 1 },
  medium: { hint: 'A steady, decent pull', baseCoins: 9, markerSpeed: 3.0, targetWidth: 27, reels: 2 },
  large: { hint: "Heavy - this one's got some weight", baseCoins: 18, markerSpeed: 3.6, targetWidth: 24, reels: 2 },
  huge: { hint: 'Feels HUGE - it is really fighting!', baseCoins: 34, markerSpeed: 4.2, targetWidth: 22, reels: 3 },
  legendary: { hint: 'Something enormous is on the line!', baseCoins: 65, markerSpeed: 4.8, targetWidth: 20, reels: 3 },
}

interface FishDef {
  name: string
  icon: string
  tier: TierKey
  /** Relative spawn frequency within the whole pond. */
  weight: number
  /** Optional payout tweak vs. its tier-mates. Defaults to 1. */
  valueMult?: number
}

const FISH: FishDef[] = [
  { name: 'Minnow', icon: '🐟', tier: 'tiny', weight: 30 },
  { name: 'Tadpole', icon: '🐸', tier: 'tiny', weight: 20 },
  { name: 'Shrimp', icon: '🦐', tier: 'tiny', weight: 18 },

  { name: 'Perch', icon: '🐠', tier: 'small', weight: 26 },
  { name: 'Crab', icon: '🦀', tier: 'small', weight: 18 },
  { name: 'Clownfish', icon: '🐠', tier: 'small', weight: 12, valueMult: 1.5 },

  { name: 'Bass', icon: '🐟', tier: 'medium', weight: 22 },
  { name: 'Squid', icon: '🦑', tier: 'medium', weight: 14 },
  { name: 'Puffer', icon: '🐡', tier: 'medium', weight: 10, valueMult: 1.6 },
  { name: 'Lobster', icon: '🦞', tier: 'medium', weight: 8, valueMult: 1.8 },

  { name: 'Octopus', icon: '🐙', tier: 'large', weight: 12 },
  { name: 'Sea Turtle', icon: '🐢', tier: 'large', weight: 9 },
  { name: 'Jellyfish', icon: '🪼', tier: 'large', weight: 10, valueMult: 0.6 },

  { name: 'Shark', icon: '🦈', tier: 'huge', weight: 7 },
  { name: 'Dolphin', icon: '🐬', tier: 'huge', weight: 5 },
  { name: 'Seal', icon: '🦭', tier: 'huge', weight: 5 },

  { name: 'Whale', icon: '🐋', tier: 'legendary', weight: 3 },
  { name: 'Crocodile', icon: '🐊', tier: 'legendary', weight: 3 },
  { name: 'Golden Koi', icon: '🎏', tier: 'legendary', weight: 1, valueMult: 2.5 },
]

function coinsFor(fish: FishDef): number {
  return Math.round(TIERS[fish.tier].baseCoins * (fish.valueMult ?? 1))
}

interface RodTier {
  name: string
  cost: number
  biteDelay: [number, number]
  hookWindowMs: number
  /** How strongly this rod skews the pond toward higher tiers. */
  depthBonus: number
}

const RODS: RodTier[] = [
  { name: 'Twig Rod', cost: 0, biteDelay: [1800, 3800], hookWindowMs: 750, depthBonus: 0 },
  { name: 'Bamboo Rod', cost: 30, biteDelay: [1400, 3200], hookWindowMs: 850, depthBonus: 1 },
  { name: 'Steel Rod', cost: 90, biteDelay: [1000, 2600], hookWindowMs: 950, depthBonus: 2.5 },
  { name: 'Golden Rod', cost: 220, biteDelay: [700, 2000], hookWindowMs: 1100, depthBonus: 5 },
]

function randomBetween([min, max]: [number, number]): number {
  return min + Math.random() * (max - min)
}

/**
 * Better rods scale a fish's spawn weight by how deep its tier sits, so
 * upgrading gradually pulls the pond toward the big stuff instead of
 * flipping a rare/not-rare switch.
 */
function pickFish(depthBonus: number): FishDef {
  const maxIndex = TIER_ORDER.length - 1
  const weights = FISH.map((f) => {
    const depth = TIER_ORDER.indexOf(f.tier) / maxIndex
    return f.weight * (1 + depthBonus * depth)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < FISH.length; i++) {
    r -= weights[i]
    if (r <= 0) return FISH[i]
  }
  return FISH[FISH.length - 1]
}

function randomTargetStart(width: number): number {
  return randomBetween([8, 92 - width])
}

/** What the fishing spot remembers between visits. */
interface FishingSave {
  coins: number
  rodLevel: number
}

export function FishingMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<FishingSave>('fishing', () => ({
    coins: 0,
    rodLevel: 0,
  }))
  const { coins, rodLevel } = save

  const [phase, setPhase] = useState<Phase>('idle')
  const [hooked, setHooked] = useState<FishDef | null>(null)
  const [reelsDone, setReelsDone] = useState(0)
  const [markerPos, setMarkerPos] = useState(0)
  const [targetStart, setTargetStart] = useState(38)
  const [toast, setToast] = useState<string | null>(null)

  const biteTimeout = useRef<number | undefined>(undefined)
  const hookTimeout = useRef<number | undefined>(undefined)
  const reelInterval = useRef<number | undefined>(undefined)
  const toastTimeout = useRef<number | undefined>(undefined)
  const reelDirection = useRef(1)

  const rod = RODS[rodLevel]
  const nextRod = RODS[rodLevel + 1]
  const tier = hooked ? TIERS[hooked.tier] : null

  useEffect(() => {
    return () => {
      window.clearTimeout(biteTimeout.current)
      window.clearTimeout(hookTimeout.current)
      window.clearTimeout(toastTimeout.current)
      window.clearInterval(reelInterval.current)
    }
  }, [])

  function showToast(message: string) {
    setToast(message)
    window.clearTimeout(toastTimeout.current)
    toastTimeout.current = window.setTimeout(() => setToast(null), 1000)
  }

  function castLine() {
    setPhase('waiting')
    const delay = randomBetween(rod.biteDelay)
    biteTimeout.current = window.setTimeout(() => {
      setPhase('biting')
      hookTimeout.current = window.setTimeout(() => setPhase('escaped'), rod.hookWindowMs)
    }, delay)
  }

  function hookFish() {
    if (phase !== 'biting') return
    window.clearTimeout(hookTimeout.current)

    const fish = pickFish(rod.depthBonus)
    const fishTier = TIERS[fish.tier]
    setHooked(fish)
    setReelsDone(0)
    setTargetStart(randomTargetStart(fishTier.targetWidth))
    setMarkerPos(0)
    reelDirection.current = 1
    setPhase('reeling')

    reelInterval.current = window.setInterval(() => {
      setMarkerPos((prev) => {
        let next = prev + reelDirection.current * fishTier.markerSpeed
        if (next >= 100) {
          next = 100
          reelDirection.current = -1
        } else if (next <= 0) {
          next = 0
          reelDirection.current = 1
        }
        return next
      })
    }, 16)
  }

  function attemptReel() {
    if (phase !== 'reeling' || !hooked || !tier) return

    const hit = markerPos >= targetStart && markerPos <= targetStart + tier.targetWidth
    if (!hit) {
      showToast('Slipped - keep reeling!')
      return
    }

    const done = reelsDone + 1
    if (done >= tier.reels) {
      window.clearInterval(reelInterval.current)
      setReelsDone(done)
      setSave((s) => ({ ...s, coins: s.coins + coinsFor(hooked) }))
      setPhase('caught')
      return
    }

    // More pulls to go: re-roll the target so each one is a fresh read.
    setReelsDone(done)
    setTargetStart(randomTargetStart(tier.targetWidth))
    showToast(`Good pull! ${done}/${tier.reels}`)
  }

  function resetToIdle() {
    setPhase('idle')
    setHooked(null)
    setReelsDone(0)
  }

  function upgradeRod() {
    if (!nextRod || coins < nextRod.cost) return
    setSave((s) => ({ coins: s.coins - nextRod.cost, rodLevel: s.rodLevel + 1 }))
    showToast(`Upgraded to ${nextRod.name}!`)
  }

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Fishing Spot</h2>
      <p style={styles.subLabel}>
        {rod.name} &middot; 🪙 {coins}
      </p>

      <div style={styles.pondWrap}>
        <div style={styles.toastSlot}>{toast && <span style={styles.toast}>{toast}</span>}</div>

        <div style={styles.pond}>
          {phase === 'idle' && <span style={styles.pondText}>🎣 Cast your line</span>}
          {phase === 'waiting' && <span style={styles.pondText}>〰️ Waiting for a bite...</span>}
          {phase === 'biting' && <span style={styles.bite}>❗ Bite! Hook it!</span>}
          {phase === 'reeling' && tier && (
            <div>
              <div style={styles.pondText}>❓ {tier.hint}</div>
              {tier.reels > 1 && (
                <div style={styles.reelPips}>
                  {Array.from({ length: tier.reels }, (_, i) => (
                    <span key={i} style={{ ...styles.pip, opacity: i < reelsDone ? 1 : 0.3 }}>
                      ●
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {phase === 'caught' && hooked && (
            <span style={styles.pondText}>
              {hooked.icon} Caught a {hooked.name}! +{coinsFor(hooked)} 🪙
            </span>
          )}
          {phase === 'escaped' && <span style={styles.pondText}>The fish got away...</span>}
        </div>

        {phase === 'reeling' && tier && (
          <div style={styles.reelTrack}>
            <div
              style={{
                ...styles.reelTarget,
                left: `${targetStart}%`,
                width: `${tier.targetWidth}%`,
              }}
            />
            <div style={{ ...styles.reelMarker, left: `${markerPos}%` }} />
          </div>
        )}
      </div>

      <div style={styles.actionRow}>
        {phase === 'idle' && (
          <button style={styles.button} onClick={castLine}>
            Cast Line
          </button>
        )}
        {phase === 'waiting' && (
          <button style={{ ...styles.button, opacity: 0.5 }} disabled>
            Waiting...
          </button>
        )}
        {phase === 'biting' && (
          <button style={{ ...styles.button, background: '#d9534f' }} onClick={hookFish}>
            Hook!
          </button>
        )}
        {phase === 'reeling' && (
          <button style={styles.button} onClick={attemptReel}>
            Reel!
          </button>
        )}
        {(phase === 'caught' || phase === 'escaped') && (
          <button style={styles.button} onClick={resetToIdle}>
            Cast Again
          </button>
        )}
      </div>

      <div style={styles.shop}>
        {nextRod ? (
          <>
            <span style={styles.shopText}>
              Next: {nextRod.name} &middot; {nextRod.cost} 🪙
            </span>
            <button
              style={{ ...styles.upgradeButton, opacity: coins >= nextRod.cost ? 1 : 0.4 }}
              onClick={upgradeRod}
              disabled={coins < nextRod.cost}
            >
              Upgrade
            </button>
          </>
        ) : (
          <span style={styles.shopText}>Max rod reached 🎉</span>
        )}
      </div>

      <button style={styles.exitButton} onClick={onExit}>
        Leave pond
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#fdf6e3',
    borderRadius: 12,
    padding: 'clamp(16px, 5vw, 32px)',
    width: 'min(380px, calc(100vw - 20px))',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  title: { margin: '0 0 4px', color: '#3a2e1f' },
  subLabel: { margin: '0 0 16px', color: '#6b5a44', fontSize: 14 },
  pondWrap: { position: 'relative', margin: '0 auto 16px', width: '100%', maxWidth: 300 },
  toastSlot: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    height: 24,
    display: 'flex',
    justifyContent: 'center',
  },
  toast: {
    background: '#3a2e1f',
    color: '#fdf6e3',
    fontSize: 13,
    padding: '3px 10px',
    borderRadius: 12,
    opacity: 0.9,
    whiteSpace: 'nowrap',
  },
  pond: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    background: '#3f7fbf',
    borderRadius: 10,
    border: '3px solid #2f5f8f',
    marginBottom: 10,
  },
  pondText: { color: '#eaf3fb', fontSize: 15, fontWeight: 600, padding: '0 12px', textAlign: 'center' },
  bite: { color: '#fff3c4', fontSize: 18, fontWeight: 800 },
  reelPips: { marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' },
  pip: { color: '#fff3c4', fontSize: 13 },
  reelTrack: {
    position: 'relative',
    height: 20,
    background: '#e3d5b8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  reelTarget: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    background: '#7cb342',
  },
  reelMarker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 28,
    background: '#3a2e1f',
    transform: 'translateX(-2px)',
  },
  actionRow: { marginBottom: 18 },
  button: {
    padding: '10px 26px',
    fontSize: 15,
    borderRadius: 8,
    border: 'none',
    background: '#7cb342',
    color: 'white',
    cursor: 'pointer',
  },
  shop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f2e6c9',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 4,
  },
  shopText: { fontSize: 13, color: '#3a2e1f' },
  upgradeButton: {
    padding: '6px 14px',
    fontSize: 13,
    borderRadius: 6,
    border: 'none',
    background: '#3a2e1f',
    color: '#fdf6e3',
    cursor: 'pointer',
  },
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
