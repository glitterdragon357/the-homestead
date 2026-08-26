import type { ReactNode } from 'react'

/**
 * Salon pets and tools, in the same 64x48 box as the other sets.
 *
 * Pets are drawn scruffy on purpose - this is the before, not the after -
 * and each one leans on a different silhouette so a rabbit is never
 * mistaken for a cat at 44px.
 */

const PETS: Record<string, ReactNode> = {
  dog: (
    <>
      <ellipse cx="32" cy="44" rx="16" ry="2.6" fill="#000" opacity={0.12} />
      <rect x="22" y="34" width="4" height="10" rx="1.6" fill="#a8763f" />
      <rect x="30" y="34" width="4" height="10" rx="1.6" fill="#b8854a" />
      <rect x="39" y="34" width="4" height="10" rx="1.6" fill="#a8763f" />
      <rect x="46" y="34" width="4" height="10" rx="1.6" fill="#b8854a" />
      <ellipse cx="35" cy="27" rx="16" ry="9.5" fill="#c08d50" />
      {/* scruff */}
      {[24, 31, 38, 45].map((x, i) => (
        <path key={i} d={`M${x} 18 l2 5 l3 -4 l1 5`} stroke="#a8763f" strokeWidth="1.6" fill="none" />
      ))}
      <path d="M50 22 q7 -4 8 3 q-4 4 -8 1 Z" fill="#a8763f" />
      <ellipse cx="16" cy="22" rx="10" ry="9" fill="#cf9a5c" />
      <path d="M8 14 q-3 9 1 13 q4 -5 3 -12 Z" fill="#8a6134" />
      <path d="M24 14 q3 9 -1 13 q-4 -5 -3 -12 Z" fill="#8a6134" />
      <ellipse cx="10" cy="27" rx="6" ry="4.6" fill="#e6c795" />
      <circle cx="6" cy="26" r="2" fill="#2e2822" />
      <circle cx="13" cy="19" r="1.7" fill="#2e2822" />
      <circle cx="21" cy="19" r="1.7" fill="#2e2822" />
    </>
  ),
  cat: (
    <>
      <ellipse cx="32" cy="44" rx="14" ry="2.6" fill="#000" opacity={0.12} />
      <path d="M20 44 Q17 28 26 22 Q32 18 38 22 Q47 28 44 44 Z" fill="#9aa2ab" />
      <path d="M24 23 L21 13 L31 18 Z" fill="#9aa2ab" />
      <path d="M40 23 L43 13 L33 18 Z" fill="#9aa2ab" />
      <path d="M25 22 L23.5 16 L29 19.5 Z" fill="#e0b6bd" />
      <path d="M39 22 L40.5 16 L35 19.5 Z" fill="#e0b6bd" />
      <path d="M44 44 q9 -3 7 -13 l-3.4 1.2 q1.6 7.4 -3.6 9.4 Z" fill="#8a929b" />
      {[25, 32, 39].map((x, i) => (
        <path key={i} d={`M${x} 30 q-2 5 0 10`} stroke="#7d858e" strokeWidth="1.6" fill="none" opacity={0.7} />
      ))}
      <ellipse cx="27" cy="27" rx="2" ry="2.6" fill="#3f4a3a" />
      <ellipse cx="37" cy="27" rx="2" ry="2.6" fill="#3f4a3a" />
      <path d="M30 32 q2 1.8 4 0" stroke="#3a332c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M20 29 h-6 M20 31 h-6 M44 29 h6 M44 31 h6" stroke="#c9d0d6" strokeWidth="1" />
    </>
  ),
  rabbit: (
    <>
      <ellipse cx="32" cy="44" rx="13" ry="2.6" fill="#000" opacity={0.12} />
      <ellipse cx="34" cy="32" rx="15" ry="12" fill="#b8a894" />
      <circle cx="48" cy="30" r="5" fill="#d6cabb" />
      <ellipse cx="19" cy="24" rx="10" ry="9" fill="#c9b9a5" />
      <path d="M13 16 Q10 2 16 3 Q21 5 19 17 Z" fill="#c9b9a5" />
      <path d="M25 16 Q28 2 22 3 Q17 5 19 17 Z" fill="#c9b9a5" />
      <path d="M14 15 Q12 5 16 6 Q19 8 18 16 Z" fill="#e0b6bd" />
      <path d="M24 15 Q26 5 22 6 Q19 8 20 16 Z" fill="#e0b6bd" />
      <circle cx="15" cy="24" r="1.7" fill="#2b2118" />
      <circle cx="23" cy="24" r="1.7" fill="#2b2118" />
      <path d="M19 28 l-2 2 M19 28 l2 2" stroke="#8a6f5c" strokeWidth="1.2" />
      <ellipse cx="19" cy="27.5" rx="1.8" ry="1.3" fill="#e0b6bd" />
    </>
  ),
  poodle: (
    <>
      <ellipse cx="32" cy="44" rx="15" ry="2.6" fill="#000" opacity={0.12} />
      <rect x="24" y="35" width="4" height="9" rx="1.6" fill="#e8e2d6" />
      <rect x="40" y="35" width="4" height="9" rx="1.6" fill="#e8e2d6" />
      {[[26, 30], [34, 27], [42, 30], [30, 34], [38, 34]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8.5" fill="#f2ece0" />
      ))}
      <circle cx="49" cy="24" r="5.5" fill="#f2ece0" />
      <ellipse cx="17" cy="22" rx="9" ry="8.5" fill="#f7f2e8" />
      {[[12, 13], [19, 11], [25, 15]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5.5" fill="#f2ece0" />
      ))}
      <path d="M9 22 q-5 3 -3 9 q4 -1 5 -7 Z" fill="#e2dbcd" />
      <ellipse cx="11" cy="26" rx="4" ry="3" fill="#3a332c" />
      <circle cx="14" cy="20" r="1.6" fill="#2b2118" />
      <circle cx="21" cy="20" r="1.6" fill="#2b2118" />
    </>
  ),
}

const TOOLS: Record<string, ReactNode> = {
  demat: (
    <>
      <path d="M18 34 L34 26 L37 32 L21 40 Z" fill="#6b4f36" />
      <path d="M34 26 L46 20 L49 26 L37 32 Z" fill="#b8bfc4" />
      {[36, 40, 44].map((x, i) => (
        <path key={i} d={`M${x} 20 l-2 -6`} stroke="#8d99a4" strokeWidth="2" strokeLinecap="round" />
      ))}
    </>
  ),
  brush: (
    <>
      <path d="M16 36 L30 28 L33 34 L19 41 Z" fill="#a8763f" />
      <path d="M30 28 L46 20 L50 28 L34 35 Z" fill="#d0a870" />
      {[34, 38, 42, 46].map((x, i) => (
        <path key={i} d={`M${x} 22 l-2 -6`} stroke="#5f5039" strokeWidth="2" strokeLinecap="round" />
      ))}
    </>
  ),
  bath: (
    <>
      <path d="M14 24 L50 24 L46 40 Q32 43 18 40 Z" fill="#cfd8de" />
      <path d="M16 28 L48 28 L46 36 Q32 39 18 36 Z" fill="#7fb6d9" />
      {[[24, 22], [32, 19], [40, 22]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#fff" opacity={0.75} />
      ))}
      <circle cx="28" cy="15" r="2" fill="#fff" opacity={0.55} />
    </>
  ),
  dry: (
    <>
      <path d="M14 22 L34 18 L34 34 L14 30 Z" fill="#8d99a4" />
      <path d="M34 18 L44 14 L44 38 L34 34 Z" fill="#b8bfc4" />
      <path d="M20 30 L24 42 L30 42 L26 31 Z" fill="#6b7680" />
      {[20, 26, 32].map((y, i) => (
        <path key={i} d={`M46 ${y} q7 2 12 0`} stroke="#9fc9e0" strokeWidth="2" fill="none" strokeLinecap="round" />
      ))}
    </>
  ),
  clip: (
    <>
      <path d="M16 30 L34 24 L36 30 L18 36 Z" fill="#4a5560" />
      <path d="M34 24 L48 22 L48 30 L36 30 Z" fill="#c2cbd4" />
      {[38, 42, 46].map((x, i) => (
        <path key={i} d={`M${x} 22 l0 -4`} stroke="#8d99a4" strokeWidth="2" />
      ))}
      <circle cx="22" cy="33" r="1.6" fill="#2b3138" />
    </>
  ),
  nails: (
    <>
      <path d="M18 34 q10 -10 22 -12" stroke="#8d99a4" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M18 26 q10 6 22 8" stroke="#c2cbd4" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="19" cy="30" r="3" fill="#6b7680" />
      <path d="M42 20 l6 2 l-5 3 Z" fill="#e8eef2" />
    </>
  ),
  bow: (
    <>
      <path d="M32 28 L18 20 Q12 26 18 34 Z" fill="#d9587f" />
      <path d="M32 28 L46 20 Q52 26 46 34 Z" fill="#d9587f" />
      <path d="M30 24 L34 24 L36 32 L28 32 Z" fill="#b8436a" />
      <path d="M30 32 l-3 10 M34 32 l3 10" stroke="#d9587f" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  soothe: (
    <>
      <path d="M32 40 Q16 30 16 22 Q16 14 24 14 Q30 14 32 20 Q34 14 40 14 Q48 14 48 22 Q48 30 32 40 Z" fill="#d9587f" />
      <path d="M24 18 Q21 20 21 24" stroke="#fff" strokeWidth="2" fill="none" opacity={0.5} strokeLinecap="round" />
    </>
  ),
}

const ART: Record<string, ReactNode> = { ...PETS, ...TOOLS }

export function SalonArt({ subject, size = 44 }: { subject: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 48) / 64}
      role="img"
      aria-label={subject}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {ART[subject] ?? PETS.dog}
    </svg>
  )
}
