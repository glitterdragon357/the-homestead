import type { ReactNode } from 'react'
import { RECIPES } from './fruitData'

/**
 * Fruit and baking art, in the same 64x48 box as the other sets.
 *
 * Baked goods are built from five form helpers - jar, pie, tart, turnover,
 * cake - tinted by their fruit. That is honest to the subject: an apple
 * pie and a cherry pie *are* the same pastry with different filling, and
 * it means a new recipe costs one line rather than a new drawing. Fruit
 * itself is drawn individually, since a strawberry and a pear share
 * nothing but being edible.
 */

/** Filling colours, keyed by fruit. */
const JUICE: Record<string, { deep: string; bright: string }> = {
  strawberry: { deep: '#b8203a', bright: '#e04257' },
  raspberry: { deep: '#a81f45', bright: '#d9445f' },
  blackberry: { deep: '#3d2352', bright: '#5e3a78' },
  blueberry: { deep: '#2f3f7a', bright: '#4a5da3' },
  apple: { deep: '#b8862c', bright: '#e0b44a' },
  plum: { deep: '#5f2a52', bright: '#8a4270' },
  pear: { deep: '#9aa83f', bright: '#c2cf6b' },
  cherry: { deep: '#9c1524', bright: '#cc2b3c' },
  peach: { deep: '#d97a3c', bright: '#f0a463' },
  apricot: { deep: '#d98f2c', bright: '#f0b355' },
  any: { deep: '#7a2f5a', bright: '#a84d7e' },
}

const CRUST = '#e0bd7f'
const CRUST_DARK = '#c49a58'
const CRUST_LIGHT = '#f0d7a4'

function jamArt(c: { deep: string; bright: string }): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="43" rx="13" ry="3" fill="#000" opacity={0.14} />
      <path d="M22 18 L42 18 L43 40 Q32 43 21 40 Z" fill={c.bright} opacity={0.9} />
      <path d="M22 24 L42 24 L42.6 34 L21.4 34 Z" fill={c.deep} opacity={0.55} />
      <path d="M22 18 L42 18 L42 21 L22 21 Z" fill="#f4ead2" opacity={0.5} />
      <rect x="20" y="12" width="24" height="6" rx="2" fill="#c9b58f" />
      <path d="M20 15 h24" stroke="#a89873" strokeWidth="1.2" />
      <path d="M25 22 q-2 8 0 15" stroke="#fff" strokeWidth="2" fill="none" opacity={0.28} />
      <ellipse cx="32" cy="12" rx="12" ry="2.6" fill="#dbcaa4" />
    </>
  )
}

function pieArt(c: { deep: string; bright: string }): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="42" rx="19" ry="3" fill="#000" opacity={0.14} />
      <path d="M10 30 Q32 24 54 30 Q52 40 32 41 Q12 40 10 30 Z" fill={CRUST_DARK} />
      <ellipse cx="32" cy="28" rx="22" ry="8" fill={CRUST} />
      <ellipse cx="32" cy="28" rx="17" ry="5.6" fill={c.deep} />
      {/* lattice */}
      {[-10, -3, 4, 11].map((dx, i) => (
        <path key={`a${i}`} d={`M${32 + dx} 23 L${32 + dx + 6} 33`} stroke={CRUST_LIGHT} strokeWidth="2.6" strokeLinecap="round" />
      ))}
      {[-10, -3, 4, 11].map((dx, i) => (
        <path key={`b${i}`} d={`M${32 + dx} 33 L${32 + dx + 6} 23`} stroke={CRUST} strokeWidth="2.6" strokeLinecap="round" opacity={0.85} />
      ))}
      <ellipse cx="32" cy="28" rx="22" ry="8" fill="none" stroke={CRUST_LIGHT} strokeWidth="2.6" />
    </>
  )
}

function tartArt(c: { deep: string; bright: string }): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="42" rx="18" ry="3" fill="#000" opacity={0.14} />
      <path d="M12 32 Q32 28 52 32 Q51 39 32 40 Q13 39 12 32 Z" fill={CRUST_DARK} />
      <ellipse cx="32" cy="30" rx="21" ry="8" fill={CRUST} />
      {/* fluted rim */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <ellipse key={i} cx={32 + Math.cos(a) * 19} cy={30 + Math.sin(a) * 6.8} rx="2.2" ry="2" fill={CRUST_LIGHT} />
        )
      })}
      <ellipse cx="32" cy="30" rx="15" ry="5" fill={c.bright} />
      {[[26, 29], [32, 28], [38, 30], [29, 32], [35, 32]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill={c.deep} />
      ))}
      <ellipse cx="28" cy="28" rx="4" ry="1.4" fill="#fff" opacity={0.3} />
    </>
  )
}

function turnoverArt(c: { deep: string; bright: string }): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="42" rx="16" ry="3" fill="#000" opacity={0.14} />
      <path d="M14 38 L32 14 L50 38 Z" fill={CRUST} />
      <path d="M14 38 L32 14 L32 38 Z" fill={CRUST_LIGHT} />
      <path d="M32 26 q6 5 4 10 q-5 2 -8 -1 Z" fill={c.deep} opacity={0.85} />
      {/* crimped edge */}
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={16 + i * 5.4} cy={37.5} r="2.1" fill={CRUST_DARK} />
      ))}
      <path d="M28 24 l3 3 M34 27 l3 3 M31 31 l3 3" stroke={CRUST_DARK} strokeWidth="1.5" strokeLinecap="round" />
      {[[24, 30], [38, 31], [31, 21]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.2" fill="#fff" opacity={0.55} />
      ))}
    </>
  )
}

function cakeArt(c: { deep: string; bright: string }): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="43" rx="18" ry="3" fill="#000" opacity={0.14} />
      <path d="M14 24 L50 24 L48 40 L16 40 Z" fill={CRUST} />
      <path d="M15 30 L49 30 L48.6 33 L15.4 33 Z" fill={c.deep} opacity={0.75} />
      <ellipse cx="32" cy="24" rx="18" ry="6" fill={CRUST_LIGHT} />
      <ellipse cx="32" cy="24" rx="14" ry="4.4" fill={c.bright} />
      {[[26, 23], [34, 22.5], [30, 26], [38, 25]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2.4" fill={c.deep} />
      ))}
      <ellipse cx="26" cy="22" rx="3" ry="1.2" fill="#fff" opacity={0.3} />
    </>
  )
}

const FORM_ART: Record<string, (c: { deep: string; bright: string }) => ReactNode> = {
  jam: jamArt,
  pie: pieArt,
  tart: tartArt,
  turnover: turnoverArt,
  cake: cakeArt,
}

const FRUIT_ART: Record<string, ReactNode> = {
  strawberry: (
    <>
      <ellipse cx="32" cy="42" rx="11" ry="2.5" fill="#000" opacity={0.12} />
      <path d="M32 40 Q18 34 20 24 Q22 16 32 16 Q42 16 44 24 Q46 34 32 40 Z" fill="#d92b43" />
      <path d="M32 40 Q24 36 22 28 Q28 32 32 32 Z" fill="#b8203a" opacity={0.6} />
      {[[26, 23], [32, 21], [38, 24], [28, 30], [35, 30], [32, 26]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="1.2" ry="1.7" fill="#f5e07a" />
      ))}
      <path d="M22 16 L32 12 L42 16 L36 18 L32 14 L28 18 Z" fill="#4f8f3f" />
      <path d="M32 12 L32 7" stroke="#3f7a32" strokeWidth="2" />
    </>
  ),
  raspberry: (
    <>
      <ellipse cx="32" cy="42" rx="11" ry="2.5" fill="#000" opacity={0.12} />
      {[[26, 24], [32, 22], [38, 24], [24, 30], [30, 29], [36, 30], [27, 36], [33, 36]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.4" fill="#c72f4f" />
      ))}
      {[[26, 23], [32, 21], [38, 23], [30, 28]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#e2687f" opacity={0.8} />
      ))}
      <path d="M24 20 L32 15 L40 20 L34 21 L32 18 L30 21 Z" fill="#4f8f3f" />
    </>
  ),
  blackberry: (
    <>
      <ellipse cx="32" cy="42" rx="11" ry="2.5" fill="#000" opacity={0.12} />
      {[[27, 23], [33, 21], [39, 24], [25, 30], [31, 29], [37, 30], [28, 36], [34, 36]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.4" fill="#37224d" />
      ))}
      {[[27, 22], [33, 20], [31, 28], [34, 35]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#6b4f8a" opacity={0.85} />
      ))}
      <path d="M25 19 L33 14 L41 19 L35 20 L33 17 L31 20 Z" fill="#4f8f3f" />
    </>
  ),
  blueberry: (
    <>
      <ellipse cx="32" cy="42" rx="12" ry="2.5" fill="#000" opacity={0.12} />
      <circle cx="26" cy="30" r="8" fill="#3a4d94" />
      <circle cx="39" cy="27" r="7" fill="#31427f" />
      <circle cx="33" cy="36" r="6" fill="#44579e" />
      {[[26, 30], [39, 27], [33, 36]].map(([x, y], i) => (
        <path key={i} d={`M${x - 2} ${y - 2} l2 -1 l2 1 l-1 2 l-2 0 Z`} fill="#8a97c9" opacity={0.8} />
      ))}
      <ellipse cx="23" cy="26" rx="2.4" ry="1.4" fill="#fff" opacity={0.3} />
    </>
  ),
  apple: (
    <>
      <ellipse cx="32" cy="43" rx="13" ry="3" fill="#000" opacity={0.12} />
      <path d="M32 18 Q20 16 17 26 Q14 38 26 42 Q32 44 38 42 Q50 38 47 26 Q44 16 32 18 Z" fill="#cc2f34" />
      <path d="M32 18 Q24 17 21 24 Q26 20 32 21 Z" fill="#e0555a" opacity={0.7} />
      <path d="M32 18 L32 11" stroke="#6b4a2c" strokeWidth="2.4" />
      <path d="M33 13 q7 -5 11 -1 q-6 4 -11 3 Z" fill="#4f8f3f" />
      <ellipse cx="24" cy="26" rx="3" ry="4.6" fill="#fff" opacity={0.22} />
    </>
  ),
  plum: (
    <>
      <ellipse cx="32" cy="43" rx="12" ry="3" fill="#000" opacity={0.12} />
      <ellipse cx="32" cy="29" rx="14" ry="15" fill="#5f2a52" />
      <path d="M32 15 q-3 14 0 29" stroke="#421c3a" strokeWidth="2" fill="none" />
      <path d="M32 15 L33 9" stroke="#6b4a2c" strokeWidth="2.2" />
      <path d="M34 11 q6 -4 9 -1 q-5 3 -9 2 Z" fill="#4f8f3f" />
      <ellipse cx="25" cy="25" rx="3" ry="5" fill="#a06f95" opacity={0.35} />
    </>
  ),
  pear: (
    <>
      <ellipse cx="32" cy="43" rx="12" ry="3" fill="#000" opacity={0.12} />
      <path d="M32 14 Q27 18 28 24 Q19 29 20 36 Q22 43 32 43 Q42 43 44 36 Q45 29 36 24 Q37 18 32 14 Z" fill="#b5c246" />
      <path d="M30 20 Q26 26 25 33 Q28 27 32 24 Z" fill="#cdd873" opacity={0.7} />
      <path d="M32 14 L33 8" stroke="#6b4a2c" strokeWidth="2.2" />
      <path d="M34 10 q6 -4 9 -1 q-5 3 -9 2 Z" fill="#4f8f3f" />
      {[[27, 33], [36, 30], [32, 37]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.9" fill="#8a9633" opacity={0.7} />
      ))}
    </>
  ),
  cherry: (
    <>
      <ellipse cx="32" cy="43" rx="13" ry="3" fill="#000" opacity={0.12} />
      <path d="M25 34 Q26 20 33 10" stroke="#4f8f3f" strokeWidth="2" fill="none" />
      <path d="M40 33 Q38 20 33 10" stroke="#4f8f3f" strokeWidth="2" fill="none" />
      <path d="M33 12 q8 -5 12 0 q-7 4 -12 1 Z" fill="#4f8f3f" />
      <circle cx="25" cy="36" r="7.5" fill="#b81f2e" />
      <circle cx="41" cy="35" r="7" fill="#9c1524" />
      <ellipse cx="22.5" cy="33" rx="2.2" ry="3" fill="#fff" opacity={0.28} />
      <ellipse cx="38.5" cy="32.5" rx="2" ry="2.6" fill="#fff" opacity={0.2} />
    </>
  ),
  peach: (
    <>
      <ellipse cx="32" cy="43" rx="13" ry="3" fill="#000" opacity={0.12} />
      <circle cx="32" cy="29" r="15" fill="#e8933f" />
      <path d="M32 14 Q40 22 40 29 Q40 38 32 44 Q46 40 47 29 Q46 18 32 14 Z" fill="#d97a3c" />
      <path d="M32 15 q-4 14 0 28" stroke="#c26a33" strokeWidth="2" fill="none" />
      <ellipse cx="24" cy="24" rx="4" ry="5" fill="#f5b97f" opacity={0.55} />
      <path d="M34 15 q7 -5 11 -2 q-6 4 -11 3 Z" fill="#4f8f3f" />
    </>
  ),
  apricot: (
    <>
      <ellipse cx="32" cy="43" rx="12" ry="3" fill="#000" opacity={0.12} />
      <circle cx="32" cy="30" r="13" fill="#f0a83f" />
      <path d="M32 17 Q39 24 39 30 Q39 38 32 43 Q44 39 45 30 Q44 20 32 17 Z" fill="#d98f2c" />
      <path d="M32 18 q-3 12 0 24" stroke="#c47f26" strokeWidth="1.8" fill="none" />
      <ellipse cx="25" cy="26" rx="3.4" ry="4.4" fill="#f7c883" opacity={0.6} />
      <path d="M33 18 q6 -5 10 -2 q-5 4 -10 3 Z" fill="#4f8f3f" />
    </>
  ),
}

/** Baked goods are a form tinted by their fruit, built from the recipe list. */
const BAKED_ART: Record<string, ReactNode> = Object.fromEntries(
  RECIPES.map((r) => [r.id, FORM_ART[r.form](JUICE[r.needs.fruit] ?? JUICE.any)])
)

const ART: Record<string, ReactNode> = { ...FRUIT_ART, ...BAKED_ART }

const GENERIC: ReactNode = (
  <>
    <ellipse cx="32" cy="43" rx="12" ry="3" fill="#000" opacity={0.12} />
    <circle cx="32" cy="29" r="13" fill="#c2543f" />
    <path d="M32 16 L33 10" stroke="#6b4a2c" strokeWidth="2.2" />
  </>
)

export function FruitArt({ subject, size = 40 }: { subject: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 48) / 64}
      role="img"
      aria-label={subject}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {ART[subject] ?? GENERIC}
    </svg>
  )
}
