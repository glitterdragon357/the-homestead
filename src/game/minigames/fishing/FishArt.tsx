import type { ReactNode } from 'react'

/**
 * Hand-drawn SVG portraits for each species, keyed by name.
 *
 * All of them are drawn into the same 72x40 box facing left, so they can
 * be swapped inline without the layout shifting. Each fish is built from
 * a tail, a body, fins, markings and an eye, in that order - the aim is a
 * readable silhouette at ~48px rather than anatomical accuracy, so the
 * distinguishing feature of each species (a pike's duck-bill snout, a
 * catfish's barbels, a marlin's spear) is deliberately exaggerated.
 */

const EYE_DARK = '#16202a'

function Eye({ cx, cy, r = 2.2, ring }: { cx: number; cy: number; r?: number; ring?: string }) {
  return (
    <>
      {ring && <circle cx={cx} cy={cy} r={r + 1.4} fill={ring} />}
      <circle cx={cx} cy={cy} r={r} fill={EYE_DARK} />
      <circle cx={cx - 0.7} cy={cy - 0.7} r={r * 0.34} fill="#ffffff" opacity={0.85} />
    </>
  )
}

const ART: Record<string, ReactNode> = {
  // --- tiny -------------------------------------------------------------
  Minnow: (
    <>
      <path d="M44 20 L58 13 L55.5 20 L58 27 Z" fill="#8fa3b0" />
      <ellipse cx="27" cy="20" rx="17" ry="6" fill="#c6d4dc" />
      <path d="M25 14.5 Q29 9 35 14.5 Z" fill="#a9bcc7" />
      <ellipse cx="27" cy="22.5" rx="13" ry="3" fill="#e6eef2" opacity={0.7} />
      <Eye cx={15} cy={19} r={1.9} />
    </>
  ),
  Bluegill: (
    <>
      <path d="M46 20 L58 13 L55.5 20 L58 27 Z" fill="#4d6136" />
      <ellipse cx="28" cy="20" rx="16" ry="11" fill="#6f8a4a" />
      <path d="M28 9.5 Q34 3 42 10.5 Z" fill="#5a7340" />
      <path d="M20 27 Q26 33 33 28 Z" fill="#c9762f" />
      <ellipse cx="18" cy="23" rx="8" ry="6" fill="#c9762f" opacity={0.75} />
      <ellipse cx="21" cy="16" rx="3.4" ry="4.6" fill="#243447" />
      <Eye cx={14} cy={17} r={2.1} />
    </>
  ),
  Smelt: (
    <>
      <path d="M46 20 L59 14 L57 20 L59 26 Z" fill="#8fa8a0" />
      <ellipse cx="27" cy="20" rx="19" ry="5" fill="#bfd2cc" />
      <ellipse cx="27" cy="17.5" rx="17" ry="2.2" fill="#7f998f" opacity={0.8} />
      <path d="M27 15.5 Q31 11 36 15.5 Z" fill="#9fb5ad" />
      <Eye cx={13} cy={19.5} r={1.8} />
    </>
  ),

  // --- small ------------------------------------------------------------
  'Yellow Perch': (
    <>
      <path d="M46 20 L58 13 L55.5 20 L58 27 Z" fill="#b8912c" />
      <ellipse cx="28" cy="20" rx="17" ry="9.5" fill="#d9b23f" />
      <path d="M20 10 L24 4 L30 10 L34 4.5 L38 10.5 Z" fill="#a8842a" />
      {[20, 26, 32, 38].map((x, i) => (
        <path key={i} d={`M${x} 11.5 Q${x + 1.5} 20 ${x} 28.5`} stroke="#4f3d17" strokeWidth="2.6" fill="none" opacity={0.75} />
      ))}
      <path d="M22 27 Q27 32 32 27.5 Z" fill="#d2733a" />
      <Eye cx={15} cy={18} r={2.1} />
    </>
  ),
  Crappie: (
    <>
      <path d="M46 20 L58 13 L55.5 20 L58 27 Z" fill="#93a3ac" />
      <ellipse cx="28" cy="20" rx="16" ry="11" fill="#c3ced5" />
      <path d="M28 9.5 Q35 3.5 42 10.5 Z" fill="#a3b1ba" />
      {[[20, 15], [26, 12], [32, 17], [24, 24], [31, 26], [37, 21], [18, 21]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="#41525e" opacity={0.55} />
      ))}
      <Eye cx={15} cy={17.5} r={2.2} />
    </>
  ),
  'Rock Bass': (
    <>
      <path d="M46 20 L58 13.5 L55.5 20 L58 26.5 Z" fill="#6b6a3c" />
      <ellipse cx="28" cy="20" rx="16" ry="10" fill="#8d8a4e" />
      <path d="M27 10.5 Q34 4.5 41 11 Z" fill="#75733f" />
      {[[22, 16], [29, 14], [34, 19], [25, 25], [33, 25]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#3b3a1e" opacity={0.6} />
      ))}
      <Eye cx={15} cy={18} r={2.4} ring="#c2452f" />
    </>
  ),

  // --- medium -----------------------------------------------------------
  'Largemouth Bass': (
    <>
      <path d="M48 20 L60 12.5 L57.5 20 L60 27.5 Z" fill="#4e6b33" />
      <ellipse cx="29" cy="20" rx="18" ry="10.5" fill="#6f8f4a" />
      <path d="M27 9.8 L31 4 L37 10 L41 5 L45 11 Z" fill="#56742f" />
      <ellipse cx="29" cy="24.5" rx="16" ry="5" fill="#d3d8ad" opacity={0.6} />
      {[16, 22, 28, 34, 39].map((x, i) => (
        <ellipse key={i} cx={x} cy={20} rx="2.6" ry="2.2" fill="#2f4420" opacity={0.7} />
      ))}
      <path d="M11 21.5 Q15 25.5 21 24" stroke="#3d5226" strokeWidth="1.8" fill="none" />
      <Eye cx={15} cy={17.5} r={2.3} />
    </>
  ),
  'Rainbow Trout': (
    <>
      <path d="M48 20 L61 13 L58 20 L61 27 Z" fill="#8d9ba3" />
      <ellipse cx="29" cy="20" rx="19" ry="9" fill="#b9c6cd" />
      <ellipse cx="29" cy="16" rx="18" ry="3.6" fill="#7d8d97" opacity={0.85} />
      <path d="M29 20.5 Q40 19.5 47 20.5 Q40 22.5 29 21.5 Z" fill="#dd8098" />
      <path d="M13 20 Q22 18.6 29 20 Q22 22.4 13 21 Z" fill="#dd8098" />
      <path d="M28 11 Q33 6 39 11 Z" fill="#93a3ac" />
      {[[19, 15], [25, 13], [33, 15], [40, 16], [23, 18], [36, 12]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#2f3d47" opacity={0.7} />
      ))}
      <Eye cx={14} cy={19} r={2.1} />
    </>
  ),
  Walleye: (
    <>
      <path d="M48 20 L61 12.5 L58.5 20 L61 27.5 Z" fill="#7d6a34" />
      <ellipse cx="29" cy="20" rx="19" ry="8.5" fill="#a89250" />
      <ellipse cx="29" cy="16.5" rx="18" ry="3" fill="#6d5c2c" opacity={0.8} />
      <path d="M25 11.5 L29 5.5 L36 11.5 Z" fill="#8a7538" />
      <path d="M39 11.5 Q43 7 48 12 Z" fill="#8a7538" />
      <ellipse cx="29" cy="24" rx="16" ry="4" fill="#ddd0a3" opacity={0.55} />
      <Eye cx={14.5} cy={18.5} r={3} ring="#e8e2c9" />
    </>
  ),
  'Channel Catfish': (
    <>
      <path d="M48 20 L61 13 L58 20 L61 27 Z" fill="#5f6a76" />
      <ellipse cx="30" cy="20.5" rx="18" ry="9.5" fill="#7c8794" />
      <ellipse cx="30" cy="24.5" rx="16" ry="4.5" fill="#d5dbe0" opacity={0.55} />
      <path d="M28 11.5 L32 5.5 L38 12 Z" fill="#66717e" />
      <path d="M13 17 Q6 12 3 15" stroke="#5b6570" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M13 19 Q5 17 2 20" stroke="#5b6570" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M14 23 Q8 26 5 30" stroke="#5b6570" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M15 24.5 Q11 29 9 33" stroke="#5b6570" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Eye cx={17} cy={18} r={1.9} />
    </>
  ),

  // --- large ------------------------------------------------------------
  'Northern Pike': (
    <>
      <path d="M52 20 L64 13.5 L61.5 20 L64 26.5 Z" fill="#425a2c" />
      <path d="M4 21 Q10 16.5 18 17.5 L46 16 Q54 17.5 54 20 Q54 22.5 46 24 L18 22.8 Q10 24 4 21 Z" fill="#5f7d3d" />
      <path d="M40 16 L45 10.5 L52 16.5 Z" fill="#4c6631" />
      <path d="M38 24 Q43 29 49 24.5 Z" fill="#4c6631" />
      {[[16, 20], [22, 18], [28, 21.5], [34, 18.5], [40, 21], [25, 22.5], [37, 17]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="2.4" ry="1.7" fill="#cfd9a8" opacity={0.75} />
      ))}
      <path d="M4 21 Q9 21.5 13 21" stroke="#3a4f26" strokeWidth="1.4" fill="none" />
      <Eye cx={14} cy={19} r={1.9} />
    </>
  ),
  'Coho Salmon': (
    <>
      <path d="M50 20 L63 12.5 L60 20 L63 27.5 Z" fill="#7d909c" />
      <path d="M8 21.5 Q12 17 20 16 Q34 13.5 46 17 Q52 19 52 20.5 Q52 22 46 24.5 Q34 27.5 20 25.5 Q12 24.5 8 21.5 Z" fill="#aebdc6" />
      <path d="M20 15.6 Q34 12.6 46 16.4 Q34 18.4 20 18.6 Z" fill="#5f7b8c" />
      <path d="M30 13.4 L34 7.6 L41 13.8 Z" fill="#8fa1ac" />
      <path d="M8 21.5 Q11 24 15 24.5 Q11 22.6 9 21.4 Z" fill="#7d909c" />
      {[[24, 15.5], [31, 14.5], [38, 15.8]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.4" fill="#2c3b45" opacity={0.7} />
      ))}
      <Eye cx={14} cy={20} r={2} />
    </>
  ),
  'Red Snapper': (
    <>
      <path d="M48 20 L61 12 L58 20 L61 28 Z" fill="#9c3227" />
      <ellipse cx="29" cy="20" rx="18" ry="11" fill="#c4483a" />
      <path d="M25 9.4 L29 3.6 L36 9.6 L42 5 L46 11.6 Z" fill="#a83a2d" />
      <path d="M24 28.5 Q30 33.5 37 28.8 Z" fill="#a83a2d" />
      <ellipse cx="29" cy="25" rx="15" ry="5" fill="#e8938a" opacity={0.55} />
      <Eye cx={15} cy={17.5} r={2.8} ring="#f0d9a8" />
    </>
  ),
  'Common Carp': (
    <>
      <path d="M48 20 L61 12.5 L58 20 L61 27.5 Z" fill="#8a6a28" />
      <ellipse cx="29" cy="20" rx="18" ry="11" fill="#b08a3a" />
      <path d="M22 9.6 Q32 4.6 44 10.6 L44 13 Q32 8.6 22 12 Z" fill="#94722e" />
      {[[20, 16], [26, 15], [32, 16], [38, 17], [22, 22], [28, 22], [34, 23], [40, 22]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q3 2.4 0 4.8`} stroke="#7d5f24" strokeWidth="1.3" fill="none" opacity={0.8} />
      ))}
      <path d="M12 18.5 Q6 15.5 3 18" stroke="#8a6a28" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M12 22 Q7 23.5 4 26.5" stroke="#8a6a28" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Eye cx={16} cy={18} r={2.1} />
    </>
  ),

  // --- huge -------------------------------------------------------------
  'Yellowfin Tuna': (
    <>
      <path d="M52 20 Q60 11 64 12 Q59 20 64 28 Q60 29 52 20 Z" fill="#2e5f8f" />
      <path d="M8 20 Q14 12 26 11 Q42 10 52 20 Q42 30 26 29 Q14 28 8 20 Z" fill="#37699b" />
      <path d="M8 20 Q14 25 26 27.5 Q42 29.6 52 20 Q42 24.6 26 23 Q14 21.6 8 20 Z" fill="#d6dee4" />
      <path d="M26 11 L31 3 L40 11.6 Z" fill="#e0c23f" />
      <path d="M28 28.4 L33 35.6 L41 28.2 Z" fill="#e0c23f" />
      {[44, 47, 50].map((x, i) => (
        <path key={i} d={`M${x} 14.6 l3 -1.6 l0 2.4 Z`} fill="#e0c23f" />
      ))}
      <Eye cx={15} cy={19} r={2.2} />
    </>
  ),
  'Mahi-Mahi': (
    <>
      <path d="M52 20 L64 12 L61 20 L64 28 Z" fill="#2f7f6f" />
      <path d="M9 15 Q11 8 20 8 Q38 8 52 20 Q38 31 20 30 Q11 29 9 22 Z" fill="#3fa86f" />
      <path d="M9 22 Q20 27 34 28.6 Q45 29 52 20 Q40 24.6 24 23.4 Q14 22.6 9 22 Z" fill="#e3c64c" />
      <path d="M11 9 Q22 3.6 40 10 Q48 13.6 52 20 Q38 11.6 22 10.6 Q14 10 11 9 Z" fill="#2f7f9f" />
      {[[20, 15], [27, 13], [34, 17], [24, 20], [31, 22]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#1d5f7a" opacity={0.75} />
      ))}
      <Eye cx={14} cy={17.5} r={2.1} />
    </>
  ),
  Tarpon: (
    <>
      <path d="M50 20 L63 11.5 L60 20 L63 28.5 Z" fill="#94a4ae" />
      <ellipse cx="29" cy="20" rx="20" ry="10" fill="#ccd8de" />
      {[[18, 15], [24, 14], [30, 15], [36, 16], [20, 21], [26, 21], [32, 22], [38, 21], [24, 26], [31, 26]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q3.4 2.6 0 5.2`} stroke="#94a4ae" strokeWidth="1.2" fill="none" opacity={0.8} />
      ))}
      <path d="M30 10.4 Q34 5 39 11 L37 14 Z" fill="#aebcc4" />
      <path d="M9 22.5 Q13 17.5 18 16.5 L16 22 Z" fill="#b6c4cc" />
      <Eye cx={15} cy={18} r={2.8} ring="#eef3f5" />
    </>
  ),
  Sturgeon: (
    <>
      <path d="M52 20 Q62 10 65 11 L62 20 L65 30 Q60 28 52 20 Z" fill="#55584a" />
      <path d="M2 22 Q8 19 14 19.5 Q34 16 52 20 Q34 26 14 23.5 Q8 24 2 22 Z" fill="#6d715e" />
      {[16, 24, 32, 40].map((x, i) => (
        <path key={i} d={`M${x} 17.6 l3 -3 l3 3 Z`} fill="#8b8f78" />
      ))}
      {[18, 26, 34].map((x, i) => (
        <path key={i} d={`M${x} 23.4 l3 3 l3 -3 Z`} fill="#8b8f78" opacity={0.8} />
      ))}
      <path d="M8 21.5 Q4 19.5 1 20.5" stroke="#5b5f4e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M9 23 Q5 23.6 2 25.6" stroke="#5b5f4e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Eye cx={15} cy={21} r={1.7} />
    </>
  ),

  // --- legendary --------------------------------------------------------
  'Blue Marlin': (
    <>
      <path d="M54 20 Q63 9 67 10 Q62 20 67 30 Q63 31 54 20 Z" fill="#1f3f6f" />
      <path d="M18 20.5 Q26 12 40 12.5 Q50 13.6 54 20 Q50 26.4 40 27.5 Q26 28 18 20.5 Z" fill="#2a4f8f" />
      <path d="M18 20.5 Q26 25.6 40 26.2 Q50 25.6 54 20 Q46 23 34 23.4 Q24 23.4 18 20.5 Z" fill="#c8d4de" opacity={0.8} />
      <path d="M26 12.6 Q34 2.6 46 8 L44 13.6 Q34 10.6 27 14 Z" fill="#22447a" />
      <path d="M18 20.5 L1 17 L18 22 Z" fill="#22447a" />
      <path d="M24 27.4 L27 34 L34 27.2 Z" fill="#22447a" />
      {[24, 30, 36, 42].map((x, i) => (
        <path key={i} d={`M${x} 15 Q${x + 1} 20 ${x} 25`} stroke="#7fa6d6" strokeWidth="1.5" fill="none" opacity={0.7} />
      ))}
      <Eye cx={22} cy={19.5} r={2.1} />
    </>
  ),
  Swordfish: (
    <>
      <path d="M54 20 Q63 9.6 67 10.6 Q62 20 67 29.4 Q63 30.4 54 20 Z" fill="#3c3c50" />
      <path d="M20 20.5 Q28 12.6 40 13 Q50 14 54 20 Q50 26 40 27 Q28 27.4 20 20.5 Z" fill="#4d4d64" />
      <path d="M20 20.5 Q28 25.4 40 26 Q50 25.4 54 20 Q46 22.6 34 23 Q25 23 20 20.5 Z" fill="#c6c9d4" opacity={0.75} />
      <path d="M30 13.2 Q34 3 40 6.6 L39 13.6 Z" fill="#3c3c50" />
      <path d="M20 20.5 L0 18.6 L20 21.8 Z" fill="#43435a" />
      <path d="M20 20.5 L2 19.4 L20 21.2 Z" fill="#5c5c76" />
      <path d="M28 27.2 L31 33.6 L37 27 Z" fill="#3c3c50" />
      <Eye cx={24} cy={19.5} r={2.3} />
    </>
  ),
  'Great White Shark': (
    <>
      <path d="M54 20 Q62 8 66 9 Q61 20 66 31 Q62 32 54 20 Z" fill="#6f7a83" />
      <path d="M6 22 Q10 15.6 22 14 Q40 12.6 54 20 Q40 27.4 22 26 Q10 24.4 6 22 Z" fill="#8a949c" />
      <path d="M6 22 Q12 24.6 22 25.6 Q40 27 54 20 Q40 24 24 23 Q13 22.6 6 22 Z" fill="#e2e6e9" />
      <path d="M24 13.8 L30 3.6 L38 14.6 Z" fill="#78838b" />
      <path d="M22 26 L25 33 L33 26.4 Z" fill="#78838b" />
      <path d="M14 24 Q20 29.6 28 26.6 Z" fill="#78838b" />
      {[16, 19, 22].map((x, i) => (
        <path key={i} d={`M${x} 17.6 Q${x + 1} 21 ${x} 24`} stroke="#5f6a72" strokeWidth="1.3" fill="none" />
      ))}
      <path d="M6 22 Q11 23.6 15 23.4 L14 25.4 Q9 24.6 6 22 Z" fill="#ffffff" />
      <Eye cx={13} cy={19.6} r={1.8} />
    </>
  ),
}

/** Fallback so an unrecognised name still renders something fish-shaped. */
const GENERIC: ReactNode = (
  <>
    <path d="M46 20 L59 13 L56 20 L59 27 Z" fill="#6f8a9c" />
    <ellipse cx="28" cy="20" rx="17" ry="9" fill="#93aebe" />
    <path d="M27 11.5 Q32 6 38 12 Z" fill="#7e9aab" />
    <Eye cx={15} cy={18.5} r={2.1} />
  </>
)

export function FishArt({
  species,
  size = 48,
}: {
  species: string
  size?: number
}) {
  return (
    <svg
      viewBox="0 0 72 40"
      width={size}
      height={(size * 40) / 72}
      role="img"
      aria-label={species}
      style={{ display: 'block' }}
    >
      {ART[species] ?? GENERIC}
    </svg>
  )
}
