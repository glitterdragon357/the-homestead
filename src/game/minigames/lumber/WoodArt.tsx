import type { ReactNode } from 'react'
import { SPECIES_ORDER, logKey } from './lumberData'

/**
 * Wood art, in the same 64x48 box as the other sets.
 *
 * Logs are generated rather than hand-drawn: they share one billet shape
 * and differ only in bark, heartwood and ring colour, which is exactly how
 * you tell species apart at a glance anyway. Everything made *from* a log
 * is drawn individually, since a stool and a chess set have nothing in
 * common but the material.
 */

interface WoodTone {
  bark: string
  barkDark: string
  end: string
  ring: string
}

const TONES: Record<string, WoodTone> = {
  pine: { bark: '#9a7b52', barkDark: '#7c6141', end: '#e6cfa4', ring: '#c9ac77' },
  birch: { bark: '#e8e4dc', barkDark: '#c4bdb1', end: '#f2e6cf', ring: '#cbbb99' },
  oak: { bark: '#7a6247', barkDark: '#5c4936', end: '#d6b483', ring: '#a8875c' },
  maple: { bark: '#a68a63', barkDark: '#856e4e', end: '#f0dcb6', ring: '#cdb083' },
  walnut: { bark: '#4f3a2a', barkDark: '#3a2a1e', end: '#8a6142', ring: '#5f4230' },
}

/** One log, side-on with the cut end toward the viewer. */
function logArt(tone: WoodTone, species: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="41" rx="19" ry="3" fill="#000" opacity={0.14} />
      <path d="M16 16 L44 16 L44 36 L16 36 Z" fill={tone.bark} />
      <path d="M16 30 L44 30 L44 36 L16 36 Z" fill={tone.barkDark} opacity={0.7} />
      {species === 'birch' && (
        <>
          <path d="M20 18 l0 16" stroke={tone.barkDark} strokeWidth="2" opacity={0.7} />
          <path d="M28 20 l0 6" stroke={tone.barkDark} strokeWidth="2" opacity={0.7} />
          <path d="M36 24 l0 9" stroke={tone.barkDark} strokeWidth="2" opacity={0.7} />
        </>
      )}
      {species !== 'birch' && (
        <>
          <path d="M22 18 q2 8 0 16" stroke={tone.barkDark} strokeWidth="1.5" fill="none" opacity={0.6} />
          <path d="M31 18 q-2 8 0 16" stroke={tone.barkDark} strokeWidth="1.5" fill="none" opacity={0.5} />
          <path d="M39 18 q2 8 0 16" stroke={tone.barkDark} strokeWidth="1.5" fill="none" opacity={0.6} />
        </>
      )}
      <ellipse cx="44" cy="26" rx="7" ry="10" fill={tone.end} />
      <ellipse cx="44" cy="26" rx="4.6" ry="6.6" fill="none" stroke={tone.ring} strokeWidth="1.3" />
      <ellipse cx="44" cy="26" rx="2.2" ry="3.2" fill="none" stroke={tone.ring} strokeWidth="1.1" />
      <ellipse cx="16" cy="26" rx="6" ry="10" fill={tone.barkDark} />
    </>
  )
}

const MADE: Record<string, ReactNode> = {
  // --- the fire ---
  firewood: (
    <>
      <ellipse cx="32" cy="41" rx="19" ry="3" fill="#000" opacity={0.14} />
      <path d="M14 22 L28 18 L30 34 L16 38 Z" fill="#9a7b52" />
      <path d="M28 18 L42 18 L42 34 L30 34 Z" fill="#ab8b5f" />
      <path d="M42 18 L52 22 L50 38 L42 34 Z" fill="#8a6d46" />
      <path d="M20 26 L46 26 L46 29 L20 29 Z" fill="#6b4f34" opacity={0.55} />
      {[20, 34, 46].map((x, i) => (
        <ellipse key={i} cx={x} cy={20 + i} rx="3.4" ry="2" fill="#e6cfa4" opacity={0.85} />
      ))}
    </>
  ),
  charcoal: (
    <>
      <ellipse cx="32" cy="41" rx="17" ry="3" fill="#000" opacity={0.18} />
      <path d="M16 34 L22 20 L32 24 L30 38 Z" fill="#2e2a27" />
      <path d="M32 24 L42 17 L50 28 L42 38 Z" fill="#3b3633" />
      <path d="M30 38 L42 38 L40 40 L30 40 Z" fill="#211e1c" />
      <path d="M24 24 l4 2 M38 22 l4 3" stroke="#6e5a4a" strokeWidth="1.4" opacity={0.7} />
      <circle cx="27" cy="31" r="1.6" fill="#c2542c" opacity={0.8} />
      <circle cx="40" cy="30" r="1.3" fill="#c2542c" opacity={0.6} />
    </>
  ),
  'pine tar': (
    <>
      <ellipse cx="32" cy="42" rx="13" ry="3" fill="#000" opacity={0.14} />
      <path d="M22 18 L42 18 L44 38 Q32 42 20 38 Z" fill="#5a4a33" />
      <path d="M22 18 L42 18 L41.6 21 L22.4 21 Z" fill="#7a6647" />
      <path d="M23 26 Q32 30 43 26 L43.6 36 Q32 39 20.5 36 Z" fill="#2b2118" />
      <ellipse cx="32" cy="26.5" rx="10" ry="2.6" fill="#1d1610" />
      <path d="M26 22 q-1 4 0 7" stroke="#a08a63" strokeWidth="1.4" fill="none" opacity={0.5} />
    </>
  ),
  potash: (
    <>
      <ellipse cx="32" cy="42" rx="14" ry="3" fill="#000" opacity={0.14} />
      <path d="M19 20 L45 20 L42 40 L22 40 Z" fill="#8d7f6c" />
      <path d="M19 20 L45 20 L44.4 23 L19.6 23 Z" fill="#a89a86" />
      <ellipse cx="32" cy="20" rx="13" ry="3.4" fill="#c9bfae" />
      <ellipse cx="32" cy="20" rx="10" ry="2.4" fill="#e4ddd0" />
      {[[27, 19], [34, 20], [31, 21.5]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="#fff" opacity={0.8} />
      ))}
      <path d="M24 30 L40 30" stroke="#6f6355" strokeWidth="2" opacity={0.6} />
    </>
  ),

  // --- the bench ---
  spoon: (
    <>
      <ellipse cx="32" cy="43" rx="11" ry="2.5" fill="#000" opacity={0.12} />
      <path d="M30 40 L34 40 L35 20 L29 20 Z" fill="#c9a874" />
      <ellipse cx="32" cy="15" rx="9" ry="7" fill="#dbbd8c" />
      <ellipse cx="32" cy="15.5" rx="6" ry="4.6" fill="#b78f5e" />
      <path d="M30 36 L31 22" stroke="#a8865a" strokeWidth="1.2" opacity={0.6} />
    </>
  ),
  whistle: (
    <>
      <ellipse cx="32" cy="40" rx="14" ry="3" fill="#000" opacity={0.12} />
      <path d="M14 24 L48 22 L50 32 L14 34 Z" fill="#cbb083" />
      <path d="M14 24 L48 22 L48.4 25 L14.2 27 Z" fill="#ddc79c" />
      <path d="M22 26 l4 -4 l0 5 Z" fill="#6f5637" />
      <circle cx="34" cy="28" r="2" fill="#6f5637" />
      <circle cx="41" cy="27.6" r="2" fill="#6f5637" />
      <path d="M48 22 L54 24 L54 31 L50 32 Z" fill="#a8875c" />
    </>
  ),
  'wooden bowl': (
    <>
      <ellipse cx="32" cy="41" rx="16" ry="3" fill="#000" opacity={0.14} />
      <path d="M14 24 Q32 20 50 24 Q47 39 32 40 Q17 39 14 24 Z" fill="#c19a63" />
      <ellipse cx="32" cy="24" rx="18" ry="5" fill="#d8b783" />
      <ellipse cx="32" cy="24" rx="14" ry="3.4" fill="#8d6c43" />
      <path d="M17 28 Q32 33 47 28 Q45 35 32 36 Q19 35 17 28 Z" fill="#a8875c" opacity={0.55} />
    </>
  ),
  'toy horse': (
    <>
      <ellipse cx="32" cy="43" rx="15" ry="3" fill="#000" opacity={0.12} />
      <rect x="20" y="30" width="4" height="12" rx="1.6" fill="#b08e5e" />
      <rect x="28" y="30" width="4" height="12" rx="1.6" fill="#c19a68" />
      <rect x="36" y="30" width="4" height="12" rx="1.6" fill="#b08e5e" />
      <rect x="43" y="30" width="4" height="12" rx="1.6" fill="#c19a68" />
      <path d="M17 22 L44 22 Q50 22 50 28 L50 32 L18 32 Q15 32 15 27 Z" fill="#d0a870" />
      <path d="M15 24 L20 10 L27 12 L24 24 Z" fill="#d0a870" />
      <path d="M18 12 L21 6 L24 12 Z" fill="#b08e5e" />
      <path d="M22 11 q6 4 4 12" stroke="#8d6c43" strokeWidth="2" fill="none" />
      <circle cx="19" cy="16" r="1.6" fill="#4a3520" />
      <path d="M50 24 q7 2 5 10" stroke="#8d6c43" strokeWidth="2.4" fill="none" />
    </>
  ),
  'decoy duck': (
    <>
      <ellipse cx="32" cy="42" rx="16" ry="3" fill="#000" opacity={0.12} />
      <path d="M14 34 Q12 24 24 22 Q38 19 48 26 Q54 31 46 37 Q30 41 14 34 Z" fill="#7d6a4e" />
      <path d="M20 26 Q30 22 42 26 Q34 31 22 30 Z" fill="#a08a63" />
      <ellipse cx="20" cy="18" rx="8" ry="7" fill="#3f4a3a" />
      <path d="M12 18 L4 20 L12 22 Z" fill="#d9a24b" />
      <path d="M20 24 q2 4 0 6" stroke="#e8e0cc" strokeWidth="2" fill="none" />
      <circle cx="17" cy="16" r="1.6" fill="#1e1a14" />
      <path d="M46 30 L56 27 L52 34 Z" fill="#5f5039" />
    </>
  ),
  stool: (
    <>
      <ellipse cx="32" cy="44" rx="16" ry="3" fill="#000" opacity={0.14} />
      <path d="M20 24 L23 43 L27 43 L26 24 Z" fill="#8a6d46" />
      <path d="M44 24 L41 43 L37 43 L38 24 Z" fill="#8a6d46" />
      <path d="M31 25 L31 43 L34 43 L34 25 Z" fill="#7a5f3d" />
      <ellipse cx="32" cy="22" rx="20" ry="7" fill="#c19a63" />
      <ellipse cx="32" cy="20.5" rx="20" ry="6.4" fill="#d6ad74" />
      <ellipse cx="32" cy="20.5" rx="13" ry="3.6" fill="#c19a63" opacity={0.5} />
    </>
  ),
  'chess set': (
    <>
      <ellipse cx="32" cy="43" rx="19" ry="3" fill="#000" opacity={0.14} />
      <path d="M10 34 L54 34 L54 40 L10 40 Z" fill="#8a6d46" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={10 + i * 5.5} y={34} width="5.5" height="6" fill={i % 2 ? '#f0dcb6' : '#5f4630'} />
      ))}
      <path d="M20 32 q-3 0 -3 -3 q4 -2 3 -7 l4 0 q-1 5 3 7 q0 3 -3 3 Z" fill="#f0dcb6" />
      <circle cx="22" cy="18" r="3.4" fill="#f0dcb6" />
      <path d="M38 32 q-3 0 -3 -3 q4 -2 3 -8 l4 0 q-1 6 3 8 q0 3 -3 3 Z" fill="#4a3524" />
      <path d="M38 21 q2 -6 6 -4 q-2 2 -1 4 Z" fill="#4a3524" />
      <circle cx="30" cy="30" r="2.6" fill="#8d6c43" />
    </>
  ),
  'jewellery box': (
    <>
      <ellipse cx="32" cy="42" rx="17" ry="3" fill="#000" opacity={0.14} />
      <path d="M14 26 L50 26 L50 40 L14 40 Z" fill="#4f3a2a" />
      <path d="M14 26 L20 20 L56 20 L50 26 Z" fill="#6b4f36" />
      <path d="M50 26 L56 20 L56 34 L50 40 Z" fill="#3a2a1e" />
      <path d="M18 30 L46 30 L46 36 L18 36 Z" fill="#5f4530" />
      <path d="M20 22 L54 22" stroke="#8a6642" strokeWidth="1.4" opacity={0.7} />
      <circle cx="32" cy="33" r="2.4" fill="#d9b45e" />
      <path d="M29 26 L35 26 L35 29 L29 29 Z" fill="#d9b45e" />
    </>
  ),
  'rocking chair': (
    <>
      <ellipse cx="32" cy="44" rx="19" ry="3" fill="#000" opacity={0.12} />
      <path d="M12 40 Q32 47 52 38" stroke="#8a6d46" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M18 8 L22 8 L24 34 L20 34 Z" fill="#a8875c" />
      <path d="M40 14 L44 14 L44 34 L40 34 Z" fill="#a8875c" />
      {[12, 18, 24].map((y, i) => (
        <path key={i} d={`M20 ${y} L43 ${y + 1.5}`} stroke="#c19a63" strokeWidth="2.6" strokeLinecap="round" />
      ))}
      <path d="M18 30 L48 28 L50 33 L20 35 Z" fill="#c19a63" />
      <path d="M22 34 L24 41 M44 33 L45 40" stroke="#8a6d46" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  'carved chest': (
    <>
      <ellipse cx="32" cy="43" rx="20" ry="3" fill="#000" opacity={0.16} />
      <path d="M10 24 L50 24 L50 41 L10 41 Z" fill="#4f3a2a" />
      <path d="M10 24 Q30 12 50 24 Z" fill="#6b4f36" />
      <path d="M50 24 L58 19 L58 36 L50 41 Z" fill="#3a2a1e" />
      <path d="M10 24 Q30 12 50 24 L58 19 Q34 6 10 24 Z" fill="#7d5c3f" />
      <path d="M14 28 L46 28 L46 38 L14 38 Z" fill="#5f4530" />
      {[[20, 33], [30, 33], [40, 33]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 4} q4 4 0 8 q-4 -4 0 -8`} fill="#8a6642" opacity={0.9} />
      ))}
      <path d="M28 24 L36 24 L36 30 L28 30 Z" fill="#c9a24b" />
      <circle cx="32" cy="27" r="1.5" fill="#4a3524" />
    </>
  ),
}

const ART: Record<string, ReactNode> = {
  ...MADE,
  ...Object.fromEntries(
    SPECIES_ORDER.map((s) => [logKey(s), logArt(TONES[s], s)])
  ),
}

const GENERIC: ReactNode = logArt(TONES.pine, 'pine')

export function WoodArt({ subject, size = 40 }: { subject: string; size?: number }) {
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
