import type { ReactNode } from 'react'
import { REMEDY_BY_ID } from './doctorData'

/**
 * Patients and remedies, in the same 64x48 box as the other sets.
 *
 * Faces are generated from a palette rather than hand-drawn: one figure,
 * varied in skin, hair and clothes. That keeps the waiting room visibly
 * mixed without turning a handful of drawings into caricatures of
 * particular people, and a seventh face costs one line.
 */

interface Look {
  skin: string
  hair: string
  shirt: string
  /** Long hair reads differently enough to be worth the extra shape. */
  long: boolean
}

const LOOKS: Look[] = [
  { skin: '#f0c9a4', hair: '#5a3a22', shirt: '#6f8fa8', long: false },
  { skin: '#8a5a3a', hair: '#241a14', shirt: '#a86f5c', long: true },
  { skin: '#e8b98a', hair: '#c9a24b', shirt: '#7fa8a0', long: true },
  { skin: '#5f3d28', hair: '#1a1410', shirt: '#8fa86f', long: false },
  { skin: '#f2d6bb', hair: '#8a8f96', shirt: '#b08ea8', long: false },
  { skin: '#c98f63', hair: '#3a2418', shirt: '#c9a24b', long: true },
]

function person(look: Look): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="45" rx="14" ry="2.6" fill="#000" opacity={0.12} />
      {/* shoulders */}
      <path d="M16 45 Q17 32 32 30 Q47 32 48 45 Z" fill={look.shirt} />
      <path d="M27 30 L37 30 L36 34 L28 34 Z" fill={look.skin} />
      {look.long && (
        <path d="M18 24 Q17 40 21 45 L26 45 Q21 38 22 24 Z" fill={look.hair} />
      )}
      {look.long && (
        <path d="M46 24 Q47 40 43 45 L38 45 Q43 38 42 24 Z" fill={look.hair} />
      )}
      <ellipse cx="32" cy="20" rx="11" ry="12" fill={look.skin} />
      <path
        d={
          look.long
            ? 'M21 20 Q20 6 32 6 Q44 6 43 20 Q41 12 32 12 Q23 12 21 20 Z'
            : 'M21 19 Q21 7 32 7 Q43 7 43 19 Q40 13 32 13 Q24 13 21 19 Z'
        }
        fill={look.hair}
      />
      <circle cx="28" cy="21" r="1.5" fill="#2b2118" />
      <circle cx="36" cy="21" r="1.5" fill="#2b2118" />
      <path d="M29.5 26 q2.5 1.6 5 0" stroke="#8a5f45" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  )
}

function bottle(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="43" rx="10" ry="2.4" fill="#000" opacity={0.14} />
      <rect x="28" y="10" width="8" height="5" rx="1.2" fill="#9aa6b0" />
      <path d="M26 15 L38 15 L40 21 L40 39 Q32 42 24 39 L24 21 Z" fill="#dfe8ee" opacity={0.85} />
      <path d="M25 23 L39 23 L39 38 Q32 40.5 25 38 Z" fill={tint} />
      <rect x="26.5" y="27" width="11" height="7" rx="1" fill="#fbf6e8" opacity={0.9} />
      <path d="M29 30 h6 M29 32 h4" stroke="#9aa6b0" strokeWidth="1.1" />
    </>
  )
}

function box(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="42" rx="15" ry="2.6" fill="#000" opacity={0.14} />
      <path d="M17 22 L41 22 L41 40 L17 40 Z" fill={tint} />
      <path d="M41 22 L49 17 L49 35 L41 40 Z" fill="#00000022" />
      <path d="M17 22 L25 17 L49 17 L41 22 Z" fill="#ffffff33" />
      <rect x="21" y="27" width="16" height="8" rx="1.4" fill="#fbf6e8" opacity={0.9} />
      <path d="M24 30 h10 M24 32.5 h7" stroke="#9aa6b0" strokeWidth="1.2" />
    </>
  )
}

function jar(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="42" rx="13" ry="2.6" fill="#000" opacity={0.14} />
      <rect x="20" y="16" width="24" height="5" rx="1.6" fill="#b8bfc4" />
      <path d="M21 21 L43 21 L42 39 Q32 42 22 39 Z" fill="#e6eef2" opacity={0.7} />
      <path d="M22 25 L42 25 L41.4 38 Q32 40.6 22.6 38 Z" fill={tint} />
      <ellipse cx="27" cy="27" rx="3" ry="1.4" fill="#fff" opacity={0.3} />
    </>
  )
}

function note(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="43" rx="14" ry="2.4" fill="#000" opacity={0.12} />
      <path d="M18 10 L46 10 L46 41 L18 41 Z" fill="#fbf6e8" />
      <path d="M18 10 L46 10 L46 15 L18 15 Z" fill={tint} />
      {[21, 25, 29, 33].map((y, i) => (
        <path key={i} d={`M23 ${y} h${i === 3 ? 10 : 18}`} stroke="#c3b79c" strokeWidth="1.6" />
      ))}
      <path d="M34 36 q4 -4 7 0" stroke={tint} strokeWidth="1.8" fill="none" />
    </>
  )
}

const FORM: Record<string, (tint: string) => ReactNode> = { bottle, box, jar, note }

export function FaceArt({ face, size = 44 }: { face: number; size?: number }) {
  const look = LOOKS[face % LOOKS.length]
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 48) / 64}
      role="img"
      aria-label="patient"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {person(look)}
    </svg>
  )
}

export function RemedyArt({ id, size = 36 }: { id: string; size?: number }) {
  const r = REMEDY_BY_ID[id]
  const draw = r ? FORM[r.art] : undefined
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 48) / 64}
      role="img"
      aria-label={r?.label ?? id}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {draw ? draw(r!.tint) : bottle('#9aa6b0')}
    </svg>
  )
}
