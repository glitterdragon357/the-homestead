import type { ReactNode } from 'react'

/**
 * Clay and pottery art, drawn into the same 64x48 box as the farm and
 * fishing sets so items from any game line up in a list together.
 *
 * The chain reads visually: river clay is a lumpy grey-brown blob, wedged
 * clay is a tidy warm block, and every fired piece is terracotta with a
 * glaze highlight. Silhouettes are exaggerated so a jug and a vase stay
 * distinct at ~40px.
 */

const CLAY = '#b4653f'
const CLAY_DARK = '#8d4a2c'
const CLAY_LIGHT = '#c97f56'
const GLAZE = '#e3d0b8'

/** Soft highlight that makes a form read as round rather than flat. */
function Sheen({ d }: { d: string }) {
  return <path d={d} fill="#ffffff" opacity={0.22} />
}

const ART: Record<string, ReactNode> = {
  'river clay': (
    <>
      <ellipse cx="32" cy="42" rx="17" ry="3" fill="#000" opacity={0.12} />
      <path
        d="M15 34 Q12 24 20 19 Q27 13 38 16 Q49 19 50 28 Q51 38 42 41 Q28 44 15 34 Z"
        fill="#7d6a58"
      />
      <path d="M20 24 Q28 19 37 22 Q44 25 44 30 Q34 25 22 29 Z" fill="#93806c" />
      {[[24, 32], [33, 35], [40, 30], [28, 27]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#5f5145" opacity={0.55} />
      ))}
    </>
  ),
  'wedged clay': (
    <>
      <ellipse cx="32" cy="42" rx="15" ry="3" fill="#000" opacity={0.12} />
      <path d="M18 38 L18 22 L32 15 L46 22 L46 38 Z" fill={CLAY} />
      <path d="M18 22 L32 15 L46 22 L32 29 Z" fill={CLAY_LIGHT} />
      <path d="M46 22 L46 38 L32 45 L32 29 Z" fill={CLAY_DARK} />
      <path d="M32 29 L32 45 L18 38 L18 22 Z" fill={CLAY} />
      <Sheen d="M22 24 L31 19 L31 22 L22 27 Z" />
    </>
  ),

  bowl: (
    <>
      <ellipse cx="32" cy="41" rx="16" ry="3" fill="#000" opacity={0.14} />
      <path d="M14 24 Q32 20 50 24 Q47 39 32 40 Q17 39 14 24 Z" fill={CLAY} />
      <ellipse cx="32" cy="24" rx="18" ry="5" fill={CLAY_LIGHT} />
      <ellipse cx="32" cy="24" rx="14" ry="3.4" fill="#6f4630" />
      <path d="M18 27 Q32 31 46 27 Q45 33 32 34 Q19 33 18 27 Z" fill={GLAZE} opacity={0.5} />
    </>
  ),
  mug: (
    <>
      <ellipse cx="30" cy="42" rx="13" ry="3" fill="#000" opacity={0.14} />
      <path d="M44 22 q9 0 9 7 q0 7 -9 7 l0 -3 q5 0 5 -4 q0 -4 -5 -4 Z" fill={CLAY_DARK} />
      <path d="M17 19 L45 19 L43 40 Q30 43 19 40 Z" fill={CLAY} />
      <ellipse cx="31" cy="19" rx="14" ry="4" fill={CLAY_LIGHT} />
      <ellipse cx="31" cy="19" rx="10.5" ry="2.6" fill="#6f4630" />
      <path d="M20 27 L42 27 L41.5 32 L20.5 32 Z" fill={GLAZE} opacity={0.55} />
      <Sheen d="M21 22 L25 22 L24 38 L21 37 Z" />
    </>
  ),
  jug: (
    <>
      <ellipse cx="31" cy="43" rx="14" ry="3" fill="#000" opacity={0.14} />
      <path d="M43 20 q9 3 8 10 q-1 7 -9 8 l-1 -3.5 q5 -1 5.5 -5 q0.5 -4 -4.5 -6 Z" fill={CLAY_DARK} />
      <path d="M26 10 L37 10 L38 19 Q49 25 47 34 Q45 42 31 42 Q17 42 15 34 Q13 25 25 19 Z" fill={CLAY} />
      <ellipse cx="31.5" cy="10" rx="6" ry="2.4" fill={CLAY_LIGHT} />
      <path d="M17 30 Q31 35 46 30 Q45 37 31 38 Q18 37 17 30 Z" fill={GLAZE} opacity={0.5} />
      <Sheen d="M22 22 Q19 28 20 35 L23 35 Q22 28 25 22 Z" />
    </>
  ),
  vase: (
    <>
      <ellipse cx="32" cy="43" rx="12" ry="3" fill="#000" opacity={0.14} />
      <path d="M26 6 L38 6 L36 16 Q50 24 47 34 Q44 42 32 42 Q20 42 17 34 Q14 24 28 16 Z" fill={CLAY} />
      <path d="M26 6 L38 6 L37.4 9 L26.6 9 Z" fill={CLAY_LIGHT} />
      <ellipse cx="32" cy="6" rx="6" ry="2.2" fill="#6f4630" />
      <path d="M19 28 Q32 33 45 28 Q44 32 32 34 Q20 32 19 28 Z" fill="#4d6f7a" opacity={0.6} />
      <path d="M21 33 Q32 37 43 33 Q42 36 32 37.5 Q22 36 21 33 Z" fill={GLAZE} opacity={0.5} />
      <Sheen d="M24 20 Q20 28 21 36 L24 36 Q23 28 27 20 Z" />
    </>
  ),
  urn: (
    <>
      <ellipse cx="32" cy="44" rx="15" ry="3" fill="#000" opacity={0.14} />
      <path d="M13 20 q-4 6 1 11 l3 -2 q-3 -4 -1 -8 Z" fill={CLAY_DARK} />
      <path d="M51 20 q4 6 -1 11 l-3 -2 q3 -4 1 -8 Z" fill={CLAY_DARK} />
      <path d="M22 12 L42 12 L44 18 Q52 26 49 35 Q45 43 32 43 Q19 43 15 35 Q12 26 20 18 Z" fill={CLAY} />
      <path d="M22 12 L42 12 L43 16 L21 16 Z" fill={CLAY_LIGHT} />
      <ellipse cx="32" cy="12" rx="10" ry="3" fill="#6f4630" />
      <path d="M17 26 Q32 32 47 26 Q46 31 32 33 Q18 31 17 26 Z" fill="#7d5f3f" opacity={0.7} />
      {[24, 32, 40].map((x, i) => (
        <circle key={i} cx={x} cy={29} r="2" fill={GLAZE} opacity={0.75} />
      ))}
      <Sheen d="M23 20 Q18 29 20 38 L23 38 Q22 29 26 20 Z" />
    </>
  ),
  'cat figurine': (
    <>
      <ellipse cx="32" cy="43" rx="13" ry="3" fill="#000" opacity={0.14} />
      <path d="M20 42 Q18 26 26 20 Q32 16 38 20 Q46 26 44 42 Z" fill={CLAY} />
      <path d="M24 21 L22 12 L30 17 Z" fill={CLAY} />
      <path d="M40 21 L42 12 L34 17 Z" fill={CLAY} />
      <path d="M25 20 L24 15 L28.5 18 Z" fill={CLAY_DARK} />
      <path d="M39 20 L40 15 L35.5 18 Z" fill={CLAY_DARK} />
      <path d="M44 42 q6 -3 4 -10 l-3 1 q1 5 -3 7 Z" fill={CLAY_DARK} />
      <circle cx="28" cy="26" r="1.7" fill="#4a2c1c" />
      <circle cx="36" cy="26" r="1.7" fill="#4a2c1c" />
      <path d="M30.5 30 q1.5 1.6 3 0" stroke="#4a2c1c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <Sheen d="M25 26 Q22 33 23 40 L26 40 Q25 33 28 27 Z" />
    </>
  ),
  'bird whistle': (
    <>
      <ellipse cx="32" cy="41" rx="12" ry="3" fill="#000" opacity={0.14} />
      <path d="M20 34 Q16 24 25 20 Q34 16 42 22 Q49 27 45 34 Q38 40 30 39 Q23 38 20 34 Z" fill={CLAY} />
      <path d="M45 34 L56 30 L52 36 Z" fill={CLAY_DARK} />
      <path d="M28 24 Q34 22 39 26 Q35 31 29 29 Z" fill={CLAY_LIGHT} />
      <path d="M20 26 L11 24 L19 22 Z" fill="#d9a24b" />
      <circle cx="24" cy="24" r="1.7" fill="#4a2c1c" />
      <path d="M24 36 q4 3 9 1" stroke={GLAZE} strokeWidth="2" fill="none" opacity={0.6} />
      <Sheen d="M24 27 Q21 31 22 35 L25 35 Q24 31 27 28 Z" />
    </>
  ),
}

const GENERIC: ReactNode = (
  <>
    <ellipse cx="32" cy="41" rx="13" ry="3" fill="#000" opacity={0.12} />
    <path d="M20 20 L44 20 L41 40 L23 40 Z" fill={CLAY} />
    <ellipse cx="32" cy="20" rx="12" ry="3.4" fill={CLAY_LIGHT} />
  </>
)

export function PotteryArt({ subject, size = 40 }: { subject: string; size?: number }) {
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
