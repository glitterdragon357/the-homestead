import { useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { FishArt } from './FishArt'

/**
 * Fishing minigame: cast a line, react to the bite within a short window
 * to hook the fish, then time clicks on a moving marker to reel it in.
 * While reeling you only know how the fish *feels* - the species is
 * revealed at the moment you land it.
 *
 * Everything here is rod and line: species are fish an angler actually
 * catches on a hook. Crabs, lobsters and the like want a trap rather than
 * a rod, so they belong to a different game.
 *
 * THE ROD IS A DIFFICULTY MODIFIER, NOT A GATE. Any rod can land any
 * fish - a marlin on a twig rod is a genuine feat rather than an error
 * message. A better rod slows the marker slightly, widens the target a
 * little, and buys more slack (allowed misses) before the fish shakes
 * off. Bigger fish fight faster, need more pulls, and give less slack, so
 * a poor rod makes them punishing without ever making them impossible.
 *
 * ADDING A SPECIES: append one line to FISH with a name, tier and weight,
 * then draw it in FishArt.tsx. Coin value and fight difficulty come from
 * the tier, so payouts always scale with difficulty. `valueMult` marks a
 * species as worth more or less than its tier-mates, which is also what
 * keeps a tier's payout from being fully predictable from the size hint.
 */

type Phase = 'idle' | 'waiting' | 'biting' | 'reeling' | 'caught' | 'escaped'

/** Why the fish isn't on the line any more - drives the failure message. */
type EscapeReason = 'missedHook' | 'shookOff'

type TierKey = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'legendary'

/**
 * The difficulty/reward ladder. Past the middle tiers we add *more pulls*
 * rather than shrinking the target further - a sub-20% target is luck, not
 * timing, whereas landing several good pulls in a row still feels earned.
 */
interface Tier {
  /** Vague "how does it feel on the line" hint - never names the fish. */
  hint: string
  baseCoins: number
  markerSpeed: number
  targetWidth: number
  reels: number
  /** Misses allowed before it shakes off, before the rod's bonus. */
  slack: number
}

const TIER_ORDER: TierKey[] = ['tiny', 'small', 'medium', 'large', 'huge', 'legendary']

const TIERS: Record<TierKey, Tier> = {
  tiny: { hint: 'Barely a nibble - feels tiny', baseCoins: 2, markerSpeed: 1.8, targetWidth: 38, reels: 1, slack: 5 },
  small: { hint: 'A light little tug', baseCoins: 4, markerSpeed: 2.4, targetWidth: 32, reels: 1, slack: 4 },
  medium: { hint: 'A steady, decent pull', baseCoins: 9, markerSpeed: 3.0, targetWidth: 27, reels: 2, slack: 4 },
  large: { hint: "Heavy - this one's got some weight", baseCoins: 18, markerSpeed: 3.6, targetWidth: 24, reels: 2, slack: 3 },
  huge: { hint: 'Feels HUGE - it is really fighting!', baseCoins: 34, markerSpeed: 4.2, targetWidth: 22, reels: 3, slack: 3 },
  legendary: { hint: 'Something enormous is on the line!', baseCoins: 65, markerSpeed: 4.8, targetWidth: 20, reels: 3, slack: 2 },
}

interface FishDef {
  name: string
  tier: TierKey
  /** Relative spawn frequency within the whole pond. */
  weight: number
  /** Optional payout tweak vs. its tier-mates. Defaults to 1. */
  valueMult?: number
}

const FISH: FishDef[] = [
  { name: 'Minnow', tier: 'tiny', weight: 30 },
  { name: 'Bluegill', tier: 'tiny', weight: 24 },
  { name: 'Smelt', tier: 'tiny', weight: 18 },

  { name: 'Yellow Perch', tier: 'small', weight: 24 },
  { name: 'Crappie', tier: 'small', weight: 18 },
  { name: 'Rock Bass', tier: 'small', weight: 14 },

  { name: 'Largemouth Bass', tier: 'medium', weight: 20 },
  { name: 'Rainbow Trout', tier: 'medium', weight: 15, valueMult: 1.3 },
  { name: 'Walleye', tier: 'medium', weight: 12, valueMult: 1.4 },
  { name: 'Channel Catfish', tier: 'medium', weight: 12 },

  { name: 'Northern Pike', tier: 'large', weight: 11 },
  { name: 'Coho Salmon', tier: 'large', weight: 10, valueMult: 1.2 },
  { name: 'Red Snapper', tier: 'large', weight: 8, valueMult: 1.3 },
  { name: 'Common Carp', tier: 'large', weight: 12, valueMult: 0.7 },

  { name: 'Yellowfin Tuna', tier: 'huge', weight: 7 },
  { name: 'Mahi-Mahi', tier: 'huge', weight: 6, valueMult: 1.2 },
  { name: 'Tarpon', tier: 'huge', weight: 5 },
  { name: 'Sturgeon', tier: 'huge', weight: 4, valueMult: 1.4 },

  { name: 'Blue Marlin', tier: 'legendary', weight: 3 },
  { name: 'Swordfish', tier: 'legendary', weight: 3 },
  { name: 'Great White Shark', tier: 'legendary', weight: 2, valueMult: 1.3 },
]

function coinsFor(fish: FishDef): number {
  return Math.round(TIERS[fish.tier].baseCoins * (fish.valueMult ?? 1))
}

interface RodTier {
  name: string
  cost: number
  biteDelay: [number, number]
  hookWindowMs: number
  /** Multiplier on the marker's speed - lower is easier. */
  speedMult: number
  /** Extra percentage points of target width. */
  targetBonus: number
  /** Extra misses allowed before the fish shakes off. */
  slackBonus: number
  /** How strongly this rod skews encounters toward bigger fish. */
  depthBonus: number
  /** One-line summary of what upgrading buys you. */
  blurb: string
}

const RODS: RodTier[] = [
  {
    name: 'Twig Rod',
    cost: 0,
    biteDelay: [1800, 3800],
    hookWindowMs: 750,
    speedMult: 1,
    targetBonus: 0,
    slackBonus: 0,
    depthBonus: 0,
    blurb: 'Bare minimum. Big fish are landable, but barely.',
  },
  {
    name: 'Bamboo Rod',
    cost: 24,
    biteDelay: [1400, 3200],
    hookWindowMs: 850,
    speedMult: 0.93,
    targetBonus: 2,
    slackBonus: 1,
    depthBonus: 1,
    blurb: 'Steadier fight, one extra slip forgiven.',
  },
  {
    name: 'Steel Rod',
    cost: 80,
    biteDelay: [1000, 2600],
    hookWindowMs: 950,
    speedMult: 0.86,
    targetBonus: 4,
    slackBonus: 2,
    depthBonus: 2.5,
    blurb: 'Real backbone. Big fish stop being a gamble.',
  },
  {
    name: 'Golden Rod',
    cost: 200,
    biteDelay: [700, 2000],
    hookWindowMs: 1100,
    speedMult: 0.78,
    targetBonus: 6,
    slackBonus: 3,
    depthBonus: 5,
    blurb: 'Tames anything in the water.',
  },
]

/** The fight a specific fish puts up on a specific rod. */
function fightFor(fish: FishDef, rod: RodTier) {
  const tier = TIERS[fish.tier]
  return {
    hint: tier.hint,
    reels: tier.reels,
    markerSpeed: tier.markerSpeed * rod.speedMult,
    targetWidth: Math.min(60, tier.targetWidth + rod.targetBonus),
    slack: tier.slack + rod.slackBonus,
  }
}

function randomBetween([min, max]: [number, number]): number {
  return min + Math.random() * (max - min)
}

/**
 * Better rods scale a fish's spawn weight by how deep its tier sits, so
 * upgrading gradually pulls the pond toward the big stuff. Note this only
 * shifts how *often* big fish show up - every fish can be hooked, and
 * landed, on every rod.
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
  /** Times each species has been landed, for the record book. */
  caught: Record<string, number>
}

export function FishingMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<FishingSave>('fishing', () => ({
    coins: 0,
    rodLevel: 0,
    caught: {},
  }))
  const { coins, rodLevel } = save
  const caught = save.caught ?? {}

  const [phase, setPhase] = useState<Phase>('idle')
  const [hooked, setHooked] = useState<FishDef | null>(null)
  const [reelsDone, setReelsDone] = useState(0)
  const [missesLeft, setMissesLeft] = useState(0)
  const [escapeReason, setEscapeReason] = useState<EscapeReason>('missedHook')
  const [markerPos, setMarkerPos] = useState(0)
  const [targetStart, setTargetStart] = useState(38)
  const [toast, setToast] = useState<string | null>(null)
  const [showBook, setShowBook] = useState(false)

  const biteTimeout = useRef<number | undefined>(undefined)
  const hookTimeout = useRef<number | undefined>(undefined)
  const reelInterval = useRef<number | undefined>(undefined)
  const toastTimeout = useRef<number | undefined>(undefined)
  const reelDirection = useRef(1)

  const rod = RODS[rodLevel]
  const nextRod = RODS[rodLevel + 1]
  const fight = hooked ? fightFor(hooked, rod) : null

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
    setHooked(null)
    setPhase('waiting')
    const delay = randomBetween(rod.biteDelay)
    biteTimeout.current = window.setTimeout(() => {
      setPhase('biting')
      hookTimeout.current = window.setTimeout(() => {
        setEscapeReason('missedHook')
        setPhase('escaped')
      }, rod.hookWindowMs)
    }, delay)
  }

  function hookFish() {
    if (phase !== 'biting') return
    window.clearTimeout(hookTimeout.current)

    const fish = pickFish(rod.depthBonus)
    const f = fightFor(fish, rod)
    setHooked(fish)
    setReelsDone(0)
    setMissesLeft(f.slack)
    setTargetStart(randomTargetStart(f.targetWidth))
    setMarkerPos(0)
    reelDirection.current = 1
    setPhase('reeling')

    reelInterval.current = window.setInterval(() => {
      setMarkerPos((prev) => {
        let next = prev + reelDirection.current * f.markerSpeed
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
    if (phase !== 'reeling' || !hooked || !fight) return

    const hit = markerPos >= targetStart && markerPos <= targetStart + fight.targetWidth
    if (!hit) {
      const left = missesLeft - 1
      setMissesLeft(left)
      if (left < 0) {
        window.clearInterval(reelInterval.current)
        setEscapeReason('shookOff')
        setPhase('escaped')
        return
      }
      showToast(left === 0 ? 'Line is slipping!' : 'Slipped!')
      return
    }

    const done = reelsDone + 1
    if (done >= fight.reels) {
      window.clearInterval(reelInterval.current)
      setReelsDone(done)
      setSave((s) => ({
        ...s,
        coins: s.coins + coinsFor(hooked),
        caught: { ...(s.caught ?? {}), [hooked.name]: ((s.caught ?? {})[hooked.name] ?? 0) + 1 },
      }))
      setPhase('caught')
      return
    }

    // More pulls to go: re-roll the target so each one is a fresh read.
    setReelsDone(done)
    setTargetStart(randomTargetStart(fight.targetWidth))
    showToast(`Good pull! ${done}/${fight.reels}`)
  }

  function resetToIdle() {
    setPhase('idle')
    setHooked(null)
    setReelsDone(0)
  }

  function upgradeRod() {
    if (!nextRod || coins < nextRod.cost) return
    setSave((s) => ({ ...s, coins: s.coins - nextRod.cost, rodLevel: s.rodLevel + 1 }))
    showToast(`Upgraded to ${nextRod.name}!`)
  }

  const speciesCaught = Object.keys(caught).length

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

          {phase === 'reeling' && fight && (
            <div>
              <div style={styles.pondText}>❓ {fight.hint}</div>
              <div style={styles.pipRow}>
                {fight.reels > 1 &&
                  Array.from({ length: fight.reels }, (_, i) => (
                    <span key={`r${i}`} style={{ ...styles.pip, opacity: i < reelsDone ? 1 : 0.3 }}>
                      ●
                    </span>
                  ))}
              </div>
              <div style={styles.slackRow}>
                line:{' '}
                {Array.from({ length: fight.slack }, (_, i) => (
                  <span key={`s${i}`} style={{ ...styles.slackPip, opacity: i < missesLeft ? 1 : 0.22 }}>
                    ▮
                  </span>
                ))}
              </div>
            </div>
          )}

          {phase === 'caught' && hooked && (
            <div style={styles.catchBox}>
              <FishArt species={hooked.name} size={92} />
              <span style={styles.catchName}>{hooked.name}</span>
              <span style={styles.catchCoins}>+{coinsFor(hooked)} 🪙</span>
            </div>
          )}

          {phase === 'escaped' && (
            <span style={styles.pondText}>
              {escapeReason === 'shookOff'
                ? 'It shook the hook and was gone.'
                : 'Too slow - the fish got away...'}
            </span>
          )}
        </div>

        {phase === 'reeling' && fight && (
          <div style={styles.reelTrack}>
            <div
              style={{
                ...styles.reelTarget,
                left: `${targetStart}%`,
                width: `${fight.targetWidth}%`,
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
            <div style={styles.shopLeft}>
              <span style={styles.shopTitle}>
                {nextRod.name} &middot; {nextRod.cost} 🪙
              </span>
              <span style={styles.shopBlurb}>{nextRod.blurb}</span>
            </div>
            <button
              style={{ ...styles.upgradeButton, opacity: coins >= nextRod.cost ? 1 : 0.4 }}
              onClick={upgradeRod}
              disabled={coins < nextRod.cost}
            >
              Upgrade
            </button>
          </>
        ) : (
          <span style={styles.shopTitle}>Best rod in the shed 🎉</span>
        )}
      </div>

      <button style={styles.bookToggle} onClick={() => setShowBook((v) => !v)}>
        {showBook ? 'Hide' : 'Show'} record book ({speciesCaught}/{FISH.length})
      </button>

      {showBook && (
        <div style={styles.book}>
          {FISH.map((f) => {
            const count = caught[f.name] ?? 0
            return (
              <div key={f.name} style={{ ...styles.bookEntry, opacity: count ? 1 : 0.28 }}>
                <FishArt species={f.name} size={44} />
                <span style={styles.bookName}>{count ? f.name : '???'}</span>
                {count > 0 && <span style={styles.bookCount}>&times;{count}</span>}
              </div>
            )
          })}
        </div>
      )}

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
    maxHeight: 'calc(100vh - 20px)',
    overflowY: 'auto',
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
    minHeight: 132,
    background: '#3f7fbf',
    borderRadius: 10,
    border: '3px solid #2f5f8f',
    marginBottom: 10,
    padding: 8,
  },
  pondText: { color: '#eaf3fb', fontSize: 15, fontWeight: 600, padding: '0 8px', textAlign: 'center' },
  bite: { color: '#fff3c4', fontSize: 18, fontWeight: 800 },
  pipRow: { marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' },
  pip: { color: '#fff3c4', fontSize: 13 },
  slackRow: {
    marginTop: 6,
    fontSize: 11,
    color: '#d6e7f5',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  slackPip: { color: '#ffd98a', fontSize: 13, marginLeft: 2 },
  catchBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  catchName: { color: '#ffffff', fontSize: 15, fontWeight: 700 },
  catchCoins: { color: '#ffe9a8', fontSize: 13, fontWeight: 600 },
  reelTrack: {
    position: 'relative',
    height: 20,
    background: '#e3d5b8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  reelTarget: { position: 'absolute', top: 0, bottom: 0, background: '#7cb342' },
  reelMarker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 28,
    background: '#3a2e1f',
    transform: 'translateX(-2px)',
  },
  actionRow: { marginBottom: 16 },
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
    gap: 10,
    background: '#f2e6c9',
    borderRadius: 8,
    padding: '10px 14px',
    textAlign: 'left',
  },
  shopLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  shopTitle: { fontSize: 13, fontWeight: 600, color: '#3a2e1f' },
  shopBlurb: { fontSize: 11.5, color: '#6b5a44' },
  upgradeButton: {
    padding: '6px 14px',
    fontSize: 13,
    borderRadius: 6,
    border: 'none',
    background: '#3a2e1f',
    color: '#fdf6e3',
    cursor: 'pointer',
    flexShrink: 0,
  },
  bookToggle: {
    display: 'block',
    margin: '12px auto 0',
    background: 'none',
    border: 'none',
    color: '#6b5a44',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 12.5,
  },
  book: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 10,
    padding: 10,
    background: '#f2e6c9',
    borderRadius: 8,
  },
  bookEntry: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  bookName: { fontSize: 9.5, color: '#3a2e1f', textAlign: 'center', lineHeight: 1.15 },
  bookCount: { fontSize: 9, color: '#6b5a44' },
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
