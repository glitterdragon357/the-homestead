import type { ReactNode } from 'react'

/**
 * Hand-drawn SVG art for the farmstead: livestock, raw goods and cooked
 * dishes, all drawn into the same 64x48 box so they can be swapped inline
 * without the layout shifting.
 *
 * Same approach as the fishing portraits - readable silhouette over
 * anatomical accuracy, with each subject's identifying feature pushed a
 * little (a goat's horns and beard, a chicken's comb, wheat's drooping
 * ear) so they stay distinct at ~40px.
 */

const DARK = '#2b2118'

function Eye({ cx, cy, r = 1.8 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={DARK} />
      <circle cx={cx - 0.5} cy={cy - 0.5} r={r * 0.35} fill="#fff" opacity={0.85} />
    </>
  )
}

const ART: Record<string, ReactNode> = {
  // --- livestock --------------------------------------------------------
  cow: (
    <>
      <rect x="16" y="34" width="4" height="9" rx="1.6" fill="#6f6257" />
      <rect x="26" y="34" width="4" height="9" rx="1.6" fill="#6f6257" />
      <rect x="38" y="34" width="4" height="9" rx="1.6" fill="#7d6f63" />
      <rect x="46" y="34" width="4" height="9" rx="1.6" fill="#7d6f63" />
      <ellipse cx="33" cy="26" rx="20" ry="12" fill="#f4efe6" />
      <path d="M24 16 Q32 12 38 18 Q34 24 25 22 Z" fill="#3f3730" />
      <ellipse cx="44" cy="31" rx="6" ry="5" fill="#3f3730" />
      <ellipse cx="46" cy="35" rx="5" ry="3.4" fill="#e9b7bd" />
      <ellipse cx="15" cy="22" rx="10" ry="9" fill="#f4efe6" />
      <path d="M6 18 Q2 14 5 12 Q9 13 9 17 Z" fill="#cbbfae" />
      <path d="M24 18 Q28 14 25 12 Q21 13 21 17 Z" fill="#cbbfae" />
      <ellipse cx="12" cy="26" rx="7" ry="5" fill="#e9b7bd" />
      <circle cx="10" cy="26" r="1.1" fill="#b98a92" />
      <circle cx="14.5" cy="26.5" r="1.1" fill="#b98a92" />
      <Eye cx={11} cy={19} />
      <Eye cx={19} cy={19} />
    </>
  ),
  goat: (
    <>
      <rect x="18" y="33" width="3.6" height="10" rx="1.5" fill="#7a6a55" />
      <rect x="27" y="33" width="3.6" height="10" rx="1.5" fill="#7a6a55" />
      <rect x="38" y="33" width="3.6" height="10" rx="1.5" fill="#8a7a63" />
      <rect x="45" y="33" width="3.6" height="10" rx="1.5" fill="#8a7a63" />
      <ellipse cx="33" cy="26" rx="18" ry="10.5" fill="#cbbba2" />
      <path d="M49 20 Q54 22 52 27 Q49 25 48 22 Z" fill="#b6a68d" />
      <ellipse cx="16" cy="21" rx="9" ry="7.5" fill="#dbcdb6" />
      <path d="M13 13 Q10 5 5 4 Q9 9 9 15 Z" fill="#8d7f68" />
      <path d="M20 13 Q19 5 14 3 Q17 9 16 15 Z" fill="#8d7f68" />
      <path d="M8 20 Q2 19 1 23 Q5 24 8 23 Z" fill="#cbbba2" />
      <ellipse cx="10" cy="25" rx="5" ry="3.6" fill="#efe4d2" />
      <path d="M12 29 Q13 35 10 37 Q9 32 9.5 29 Z" fill="#efe4d2" />
      <circle cx="8" cy="25" r="1" fill="#9c8d78" />
      <Eye cx={13} cy={20} r={1.7} />
      <Eye cx={20} cy={20} r={1.7} />
    </>
  ),
  chicken: (
    <>
      <path d="M26 40 l-3 4 M30 40 l0 4 M34 40 l3 4" stroke="#d9962f" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M46 20 Q57 16 56 28 Q52 34 44 32 Z" fill="#d8d2c6" />
      <path d="M48 22 Q56 20 55 27" stroke="#b8b0a2" strokeWidth="1.6" fill="none" />
      <ellipse cx="31" cy="28" rx="16" ry="13" fill="#f2ede2" />
      <ellipse cx="20" cy="18" rx="8.5" ry="8" fill="#f7f3ea" />
      <path d="M15 10 Q17 5 19 10 Q21 5 23 10 Q25 6 25 12 L15 12 Z" fill="#cf4b3f" />
      <path d="M12 20 L5 22.5 L12 25 Z" fill="#e9a92f" />
      <path d="M18 25 Q20 30 16 30 Q15 27 16 25 Z" fill="#cf4b3f" />
      <Eye cx={17} cy={17} r={1.6} />
    </>
  ),
  chick: (
    <>
      <path d="M27 38 l-2 4 M32 38 l2 4" stroke="#d9962f" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="30" cy="29" rx="11" ry="10" fill="#f7d762" />
      <ellipse cx="24" cy="21" rx="7.5" ry="7" fill="#fbe484" />
      <path d="M18 21 L12 23 L18 25 Z" fill="#e9a92f" />
      <path d="M40 27 Q45 25 44 31 Q41 31 39 30 Z" fill="#e8c94e" />
      <path d="M22 13 q2 -4 4 0" stroke="#e8c94e" strokeWidth="1.6" fill="none" />
      <Eye cx={22} cy={20} r={1.5} />
    </>
  ),

  // --- raw goods --------------------------------------------------------
  egg: (
    <>
      <ellipse cx="32" cy="26" rx="12" ry="15" fill="#f6ecd8" />
      <ellipse cx="27" cy="20" rx="4" ry="6" fill="#fffaf0" opacity={0.8} />
      <ellipse cx="32" cy="41" rx="11" ry="2.4" fill="#000" opacity={0.1} />
    </>
  ),
  milk: (
    <>
      <path d="M26 12 h12 v4 l4 6 v18 a3 3 0 0 1 -3 3 h-14 a3 3 0 0 1 -3 -3 v-18 l4 -6 z" fill="#f6f4ef" />
      <path d="M22 26 h20 v10 h-20 z" fill="#dfe6ee" />
      <rect x="26" y="10" width="12" height="4" rx="1.4" fill="#9fb3c8" />
      <circle cx="32" cy="31" r="3.6" fill="#fff" />
      <path d="M29.5 31 q2.5 -3 5 0 q-2.5 3 -5 0" fill="#9fb3c8" />
    </>
  ),
  'goat milk': (
    <>
      <path d="M26 12 h12 v4 l4 6 v18 a3 3 0 0 1 -3 3 h-14 a3 3 0 0 1 -3 -3 v-18 l4 -6 z" fill="#f6f4ef" />
      <path d="M22 26 h20 v10 h-20 z" fill="#e3dcc8" />
      <rect x="26" y="10" width="12" height="4" rx="1.4" fill="#b3a686" />
      <path d="M28 30 q-2 -5 2 -6 q-1 4 2 4 q3 0 2 -4 q4 1 2 6 z" fill="#8d7f68" />
    </>
  ),
  wheat: (
    <>
      <path d="M32 44 L32 20" stroke="#c9a24b" strokeWidth="2.4" />
      <path d="M32 34 Q24 32 22 26 Q30 26 32 31 Z" fill="#d9b45c" />
      <path d="M32 34 Q40 32 42 26 Q34 26 32 31 Z" fill="#d9b45c" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <ellipse cx={28} cy={24 - i * 5} rx="3.4" ry="5" fill="#e3c169" transform={`rotate(-18 28 ${24 - i * 5})`} />
          <ellipse cx={36} cy={24 - i * 5} rx="3.4" ry="5" fill="#d6b055" transform={`rotate(18 36 ${24 - i * 5})`} />
        </g>
      ))}
      <ellipse cx="32" cy="6" rx="3.2" ry="5.4" fill="#e9cd7f" />
    </>
  ),
  corn: (
    <>
      <path d="M20 20 Q16 34 26 43 Q26 30 30 22 Z" fill="#5f8f3f" />
      <path d="M44 20 Q48 34 38 43 Q38 30 34 22 Z" fill="#6f9f4a" />
      <ellipse cx="32" cy="24" rx="10" ry="18" fill="#e8c33f" />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}-${c}`} cx={27 + c * 5} cy={12 + r * 7} r="2.1" fill="#f2d868" />
        ))
      )}
      <path d="M32 6 q3 -5 6 -4 q-2 4 -5 5 z" fill="#a8b86a" />
    </>
  ),

  // --- cooked dishes ----------------------------------------------------
  bread: (
    <>
      <ellipse cx="32" cy="43" rx="20" ry="3" fill="#000" opacity={0.1} />
      <path d="M12 34 Q10 18 32 16 Q54 18 52 34 Q52 40 32 40 Q12 40 12 34 Z" fill="#c98f4e" />
      <path d="M14 30 Q14 20 32 19 Q50 20 50 30 Q40 26 32 26 Q22 26 14 30 Z" fill="#dda765" />
      {[22, 30, 38].map((x, i) => (
        <path key={i} d={`M${x} 20 q3 4 1 8`} stroke="#a8703a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ))}
    </>
  ),
  cheese: (
    <>
      <ellipse cx="32" cy="43" rx="19" ry="3" fill="#000" opacity={0.1} />
      <path d="M12 38 L12 24 L52 16 L52 30 Z" fill="#e8bb3f" />
      <path d="M12 24 L52 16 L48 12 L14 20 Z" fill="#f2d068" />
      <circle cx="22" cy="30" r="3" fill="#d6a52c" />
      <circle cx="34" cy="27" r="2.4" fill="#d6a52c" />
      <circle cx="44" cy="24" r="2" fill="#d6a52c" />
    </>
  ),
  omelette: (
    <>
      <ellipse cx="32" cy="42" rx="20" ry="3" fill="#000" opacity={0.1} />
      <path d="M10 36 Q12 20 32 20 Q52 20 54 36 Q40 42 32 42 Q24 42 10 36 Z" fill="#f0c94a" />
      <path d="M14 32 Q20 24 32 24 Q44 24 50 32 Q38 28 32 28 Q26 28 14 32 Z" fill="#f7dd7e" />
      <path d="M22 34 q4 -3 8 0" stroke="#c99a2c" strokeWidth="1.6" fill="none" />
      <circle cx="40" cy="33" r="2" fill="#7fa64a" />
      <circle cx="27" cy="37" r="1.8" fill="#c05a45" />
    </>
  ),
  cornbread: (
    <>
      <ellipse cx="32" cy="43" rx="18" ry="3" fill="#000" opacity={0.1} />
      <path d="M14 38 L14 22 L50 22 L50 38 Z" fill="#dcae52" />
      <path d="M14 22 L20 15 L56 15 L50 22 Z" fill="#e8c377" />
      <path d="M50 22 L56 15 L56 31 L50 38 Z" fill="#c9993f" />
      {[[22, 28], [32, 32], [40, 27], [28, 34]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#f2d868" />
      ))}
    </>
  ),
  cake: (
    <>
      <ellipse cx="32" cy="43" rx="20" ry="3" fill="#000" opacity={0.1} />
      <path d="M13 40 L13 30 L51 30 L51 40 Z" fill="#d8a05e" />
      <path d="M13 30 L13 22 L51 22 L51 30 Z" fill="#f2e0cc" />
      <path d="M13 22 L13 16 L51 16 L51 22 Z" fill="#d8a05e" />
      <path d="M11 16 Q16 10 22 15 Q28 9 34 15 Q40 9 46 15 Q50 11 53 16 L53 19 L11 19 Z" fill="#f6f0e6" />
      <circle cx="22" cy="13" r="2.2" fill="#c9455a" />
      <circle cx="40" cy="13" r="2.2" fill="#c9455a" />
      <circle cx="32" cy="10" r="2.4" fill="#c9455a" />
    </>
  ),
}

const GENERIC: ReactNode = (
  <>
    <rect x="18" y="18" width="28" height="20" rx="4" fill="#b9a98f" />
    <rect x="18" y="18" width="28" height="7" rx="3" fill="#cdbfa6" />
  </>
)

export function FarmArt({ subject, size = 40 }: { subject: string; size?: number }) {
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
