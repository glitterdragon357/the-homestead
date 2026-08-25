import type { ReactNode } from 'react'
import { FarmArt } from '../farm/FarmArt'
import { TREATMENT_BY_ID } from './vetData'

/**
 * Patients and medicines, in the same 64x48 box as the other sets.
 *
 * Cows, goats and chickens are already drawn for the barn, so the surgery
 * borrows them rather than keeping a second set that could drift out of
 * step. Only the animals the farm does not keep are drawn here.
 *
 * Medicines are built from four form helpers tinted per treatment - a
 * bottle of eye wash and a bottle of tonic are the same bottle, and a new
 * remedy costs one line in the data table rather than a new drawing.
 */

function bottle(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="43" rx="11" ry="2.6" fill="#000" opacity={0.14} />
      <rect x="28" y="9" width="8" height="6" rx="1.4" fill="#9aa6b0" />
      <path d="M26 15 L38 15 L40 22 L40 39 Q32 42 24 39 L24 22 Z" fill="#dfe8ee" opacity={0.85} />
      <path d="M25 24 L39 24 L39 38 Q32 40.5 25 38 Z" fill={tint} />
      <path d="M25 24 L39 24 L39 27 L25 27 Z" fill="#fff" opacity={0.25} />
      <rect x="26.5" y="28" width="11" height="7" rx="1" fill="#fbf6e8" opacity={0.9} />
      <path d="M29 31 h6 M29 33 h4" stroke="#9aa6b0" strokeWidth="1.1" />
      <path d="M27 17 q-1 10 0 20" stroke="#fff" strokeWidth="2" fill="none" opacity={0.5} />
    </>
  )
}

function tin(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="42" rx="15" ry="3" fill="#000" opacity={0.14} />
      <path d="M17 26 L47 26 L45 40 L19 40 Z" fill="#b8bfc4" />
      <ellipse cx="32" cy="26" rx="15" ry="5.4" fill="#d4dade" />
      <ellipse cx="32" cy="26" rx="11.5" ry="4" fill={tint} />
      <ellipse cx="28" cy="24.5" rx="3.4" ry="1.4" fill="#fff" opacity={0.35} />
      <path d="M19 33 L45 33" stroke="#9aa6b0" strokeWidth="1.4" opacity={0.7} />
    </>
  )
}

function splint(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="43" rx="13" ry="2.6" fill="#000" opacity={0.12} />
      <rect x="21" y="10" width="6" height="30" rx="2" fill={tint} />
      <rect x="37" y="10" width="6" height="30" rx="2" fill={tint} />
      <rect x="27" y="12" width="10" height="26" rx="2" fill="#e8e0cc" />
      {[16, 24, 32].map((y, i) => (
        <rect key={i} x="18" y={y} width="28" height="4.5" rx="2" fill="#f4ece0" />
      ))}
      {[16, 24, 32].map((y, i) => (
        <path key={i} d={`M18 ${y + 2.2} h28`} stroke="#cfc4ad" strokeWidth="1" />
      ))}
    </>
  )
}

function knife(tint: string): ReactNode {
  return (
    <>
      <ellipse cx="32" cy="42" rx="14" ry="2.6" fill="#000" opacity={0.12} />
      <path d="M14 34 L30 30 L32 36 L16 39 Z" fill="#6b4f36" />
      <path d="M30 30 Q44 24 50 14 Q48 26 38 34 Q34 36 32 36 Z" fill={tint} />
      <path d="M32 31 Q42 26 47 18 Q42 27 34 33 Z" fill="#e8eef2" />
      <circle cx="19" cy="36" r="1.2" fill="#4a3524" />
      <circle cx="25" cy="34.5" r="1.2" fill="#4a3524" />
    </>
  )
}

const FORM: Record<string, (tint: string) => ReactNode> = { bottle, tin, splint, knife }

/** Animals the barn does not already draw. */
const EXTRA_PATIENTS: Record<string, ReactNode> = {
  sheep: (
    <>
      <rect x="21" y="33" width="3.4" height="10" rx="1.5" fill="#6b5a45" />
      <rect x="29" y="33" width="3.4" height="10" rx="1.5" fill="#6b5a45" />
      <rect x="38" y="33" width="3.4" height="10" rx="1.5" fill="#7a6a55" />
      <rect x="45" y="33" width="3.4" height="10" rx="1.5" fill="#7a6a55" />
      {[[24, 24], [31, 21], [39, 22], [45, 26], [28, 29], [36, 28], [43, 31]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" fill="#f2efe6" />
      ))}
      <ellipse cx="16" cy="25" rx="7.5" ry="8" fill="#4a4038" />
      <path d="M9 20 q-4 -2 -5 2 q3 3 6 1 Z" fill="#3a322c" />
      <path d="M23 20 q4 -2 5 2 q-3 3 -6 1 Z" fill="#3a322c" />
      <circle cx="13" cy="24" r="1.6" fill="#12100e" />
      <circle cx="19" cy="24" r="1.6" fill="#12100e" />
      <ellipse cx="16" cy="29" rx="3" ry="2" fill="#2e2822" />
    </>
  ),
  dog: (
    <>
      <rect x="22" y="33" width="3.6" height="10" rx="1.5" fill="#a8763f" />
      <rect x="30" y="33" width="3.6" height="10" rx="1.5" fill="#b8854a" />
      <rect x="39" y="33" width="3.6" height="10" rx="1.5" fill="#a8763f" />
      <rect x="46" y="33" width="3.6" height="10" rx="1.5" fill="#b8854a" />
      <ellipse cx="35" cy="27" rx="16" ry="9" fill="#c08d50" />
      <path d="M50 22 q7 -4 8 3 q-4 4 -8 1 Z" fill="#a8763f" />
      <ellipse cx="16" cy="22" rx="10" ry="9" fill="#cf9a5c" />
      <path d="M8 14 q-3 8 1 12 q4 -5 3 -11 Z" fill="#8a6134" />
      <path d="M24 14 q3 8 -1 12 q-4 -5 -3 -11 Z" fill="#8a6134" />
      <ellipse cx="10" cy="27" rx="6" ry="4.6" fill="#e6c795" />
      <circle cx="6" cy="26" r="2" fill="#2e2822" />
      <circle cx="13" cy="19" r="1.7" fill="#2e2822" />
      <circle cx="21" cy="19" r="1.7" fill="#2e2822" />
      <path d="M8 30 q3 2 6 0" stroke="#8a6134" strokeWidth="1.3" fill="none" />
    </>
  ),
  cat: (
    <>
      <ellipse cx="32" cy="43" rx="14" ry="3" fill="#000" opacity={0.12} />
      <path d="M20 43 Q17 28 26 22 Q32 18 38 22 Q47 28 44 43 Z" fill="#9aa2ab" />
      <path d="M24 23 L21 13 L31 18 Z" fill="#9aa2ab" />
      <path d="M40 23 L43 13 L33 18 Z" fill="#9aa2ab" />
      <path d="M25 22 L23.5 16 L29 19.5 Z" fill="#e0b6bd" />
      <path d="M39 22 L40.5 16 L35 19.5 Z" fill="#e0b6bd" />
      <path d="M44 43 q8 -3 6 -12 l-3.4 1.2 q1.4 6.4 -3.6 8.4 Z" fill="#8a929b" />
      {[26, 32, 38].map((x, i) => (
        <path key={i} d={`M${x} 30 q0 6 0 10`} stroke="#7d858e" strokeWidth="1.6" opacity={0.6} />
      ))}
      <ellipse cx="27" cy="27" rx="2" ry="2.6" fill="#3f4a3a" />
      <ellipse cx="37" cy="27" rx="2" ry="2.6" fill="#3f4a3a" />
      <path d="M30 32 q2 1.8 4 0" stroke="#3a332c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M20 29 h-6 M20 31 h-6 M44 29 h6 M44 31 h6" stroke="#c9d0d6" strokeWidth="1" />
    </>
  ),
}

export function PatientArt({ animal, size = 44 }: { animal: string; size?: number }) {
  const extra = EXTRA_PATIENTS[animal]
  if (!extra) return <FarmArt subject={animal} size={size} />
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 48) / 64}
      role="img"
      aria-label={animal}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {extra}
    </svg>
  )
}

export function TreatmentArt({ id, size = 38 }: { id: string; size?: number }) {
  const t = TREATMENT_BY_ID[id]
  const draw = t ? FORM[t.art] : undefined
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 48) / 64}
      role="img"
      aria-label={t?.label ?? id}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {draw ? draw(t!.tint) : bottle('#9aa6b0')}
    </svg>
  )
}
