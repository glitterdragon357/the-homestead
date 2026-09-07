import type { ReactNode } from 'react'
import type { SlotKey, SpeciesKey } from './petData'

/**
 * Whole animals, not heads.
 *
 * Each one is drawn side-on in the same 80x56 box, standing on the floor
 * at the bottom edge, so a kitten and a tortoise can walk across the same
 * tiles without one of them floating. `coat` recolours the body and the
 * silhouettes are kept well apart - a ferret should never be mistaken for
 * a guinea pig at this size.
 */

export function PetBody({
  species,
  coat,
  trim,
  step = 0,
  asleep = false,
}: {
  species: SpeciesKey
  coat: string
  trim: string
  /** Where the legs are in their cycle, 0 to 1. */
  step?: number
  asleep?: boolean
}) {
  const swing = Math.sin(step * Math.PI * 2) * 4
  const leg = (x: number, phase: number, len = 12, w = 4.5) => (
    <line
      x1={x}
      y1={40}
      x2={x + Math.sin((step + phase) * Math.PI * 2) * 3.5}
      y2={40 + len}
      stroke={coat}
      strokeWidth={w}
      strokeLinecap="round"
    />
  )
  const eye = (x: number, y: number, r = 2.1) =>
    asleep ? (
      <path d={`M${x - 3} ${y} q3 2.4 6 0`} stroke="#2b2620" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    ) : (
      <>
        <circle cx={x} cy={y} r={r} fill="#2b2620" />
        <circle cx={x + 0.7} cy={y - 0.7} r={r * 0.32} fill="#fff" />
      </>
    )

  const shade = (
    <ellipse cx="40" cy="55" rx="24" ry="3.4" fill="#000" opacity={0.14} />
  )

  const bodies: Record<SpeciesKey, ReactNode> = {
    kitten: (
      <>
        {shade}
        {leg(26, 0)}
        {leg(36, 0.5)}
        {leg(48, 0.5)}
        {leg(56, 0)}
        <path d={`M58 38 q12 -2 10 -14 q-1 -5 -5 -3 q2 9 -6 13 Z`} fill={coat} />
        <ellipse cx="42" cy="32" rx="19" ry="11" fill={coat} />
        <circle cx="24" cy="24" r="10" fill={coat} />
        <path d="M17 17 l-2 -9 l8 5 Z" fill={coat} />
        <path d="M31 17 l2 -9 l-8 5 Z" fill={coat} />
        <path d="M18 16 l-1 -5 l4.5 3 Z" fill={trim} />
        <path d="M30 16 l1 -5 l-4.5 3 Z" fill={trim} />
        {eye(20, 23)}
        {eye(29, 23)}
        <path d="M24.5 27 l-2 1.6 M24.5 27 l2 1.6" stroke="#2b2620" strokeWidth="1.2" />
        <ellipse cx="24.5" cy="26.6" rx="1.7" ry="1.2" fill={trim} />
        <path d="M15 25 h-7 M15 27 h-7 M34 25 h7 M34 27 h7" stroke="#efe6d2" strokeWidth="0.9" opacity={0.8} />
      </>
    ),
    puppy: (
      <>
        {shade}
        {leg(26, 0, 13, 5)}
        {leg(37, 0.5, 13, 5)}
        {leg(50, 0.5, 13, 5)}
        {leg(59, 0, 13, 5)}
        <path d={`M60 36 q10 -6 8 -12 q-6 1 -6 8 Z`} fill={coat} transform={`rotate(${swing} 60 36)`} />
        <ellipse cx="44" cy="32" rx="20" ry="12" fill={coat} />
        <ellipse cx="24" cy="25" rx="12" ry="10" fill={coat} />
        <ellipse cx="15" cy="29" rx="7" ry="5.4" fill={trim} opacity={0.35} />
        <path d="M16 17 q-8 2 -6 13 q6 -1 7 -11 Z" fill={trim} />
        <path d="M31 17 q8 2 6 13 q-6 -1 -7 -11 Z" fill={trim} />
        {eye(19, 23)}
        {eye(28, 23)}
        <ellipse cx="12" cy="28" rx="3" ry="2.4" fill="#2b2620" />
      </>
    ),
    rabbit: (
      <>
        {shade}
        {leg(30, 0, 10)}
        {leg(40, 0.5, 10)}
        <ellipse cx="52" cy="40" rx="9" ry="7" fill={coat} />
        <circle cx="62" cy="34" r="5.5" fill="#efe6d2" />
        <ellipse cx="42" cy="30" rx="19" ry="13" fill={coat} />
        <circle cx="23" cy="24" r="10" fill={coat} />
        <path d="M18 15 q-4 -16 2 -15 q5 1 3 15 Z" fill={coat} />
        <path d="M27 15 q4 -16 -2 -15 q-5 1 -3 15 Z" fill={coat} />
        <path d="M19 14 q-2 -11 1.5 -10 q3 1 1.5 10 Z" fill={trim} />
        <path d="M26 14 q2 -11 -1.5 -10 q-3 1 -1.5 10 Z" fill={trim} />
        {eye(19, 23)}
        {eye(28, 23)}
        <ellipse cx="23.5" cy="27" rx="1.8" ry="1.3" fill={trim} />
      </>
    ),
    guineapig: (
      <>
        {shade}
        {leg(30, 0, 7, 4)}
        {leg(42, 0.5, 7, 4)}
        {leg(52, 0.5, 7, 4)}
        <ellipse cx="42" cy="34" rx="22" ry="13" fill={coat} />
        <ellipse cx="24" cy="30" rx="11" ry="10" fill={coat} />
        <ellipse cx="18" cy="24" rx="4.4" ry="3.4" fill={trim} transform="rotate(-25 18 24)" />
        <ellipse cx="30" cy="23" rx="4.4" ry="3.4" fill={trim} transform="rotate(25 30 23)" />
        {eye(18, 29)}
        {eye(29, 29)}
        <ellipse cx="15" cy="33" rx="2.6" ry="2" fill="#c98b7f" />
        <ellipse cx="50" cy="30" rx="10" ry="8" fill="#000" opacity={0.08} />
      </>
    ),
    duckling: (
      <>
        {shade}
        <line x1="34" y1="42" x2="34" y2="52" stroke={trim} strokeWidth="3" strokeLinecap="round" />
        <line x1="45" y1="42" x2="45" y2="52" stroke={trim} strokeWidth="3" strokeLinecap="round" />
        <path d="M30 52 l-6 3 h9 Z" fill={trim} />
        <path d="M41 52 l-6 3 h9 Z" fill={trim} />
        <ellipse cx="42" cy="34" rx="18" ry="14" fill={coat} />
        <ellipse cx="50" cy="32" rx="9" ry="8" fill={coat} opacity={0.75} />
        <circle cx="26" cy="21" r="10" fill={coat} />
        <path d="M17 21 q-9 1 -8 4 q1 3 9 2 Z" fill={trim} />
        {eye(25, 19)}
      </>
    ),
    parrot: (
      <>
        {shade}
        <line x1="38" y1="44" x2="38" y2="52" stroke={trim} strokeWidth="3" strokeLinecap="round" />
        <line x1="46" y1="44" x2="46" y2="52" stroke={trim} strokeWidth="3" strokeLinecap="round" />
        <path d={`M56 34 q16 6 18 20 q-12 -4 -20 -14 Z`} fill={coat} opacity={0.9} />
        <ellipse cx="44" cy="32" rx="15" ry="16" fill={coat} />
        <ellipse cx="48" cy="30" rx="8" ry="11" fill="#000" opacity={0.1} />
        <circle cx="31" cy="19" r="10" fill={coat} />
        <path d="M27 8 q4 -8 9 -4 q-3 3 -4 8 Z" fill={trim} />
        <path d="M22 20 q-8 1 -7 5 q2 4 8 1 q4 -2 2 -5 Z" fill="#3a332c" />
        {eye(29, 17)}
      </>
    ),
    ferret: (
      <>
        {shade}
        {leg(28, 0, 8, 4)}
        {leg(40, 0.5, 8, 4)}
        {leg(52, 0.5, 8, 4)}
        {leg(60, 0, 8, 4)}
        <path d={`M62 38 q14 0 16 -10 q-2 -4 -6 -1 q0 7 -10 8 Z`} fill={trim} />
        <ellipse cx="45" cy="35" rx="23" ry="9" fill={coat} />
        <ellipse cx="24" cy="30" rx="11" ry="8" fill={coat} />
        <circle cx="18" cy="25" r="3.4" fill={trim} />
        <circle cx="30" cy="24" r="3.4" fill={trim} />
        <path d="M13 31 q-6 0 -6 2 q1 2 6 1 Z" fill={trim} />
        {eye(18, 30, 1.8)}
        {eye(27, 29, 1.8)}
        <ellipse cx="24" cy="27" rx="9" ry="4" fill={trim} opacity={0.35} />
      </>
    ),
    tortoise: (
      <>
        {shade}
        <ellipse cx="30" cy="46" rx="6" ry="4" fill={trim} />
        <ellipse cx="54" cy="46" rx="6" ry="4" fill={trim} />
        <ellipse cx="42" cy="36" rx="26" ry="15" fill={trim} />
        <path d="M16 36 q26 -22 52 0 Z" fill={coat} />
        <path d="M16 36 q26 -22 52 0" stroke="#4a4a3a" strokeWidth="1.6" fill="none" />
        {[26, 34, 42, 50, 58].map((x, i) => (
          <path key={i} d={`M${x} 36 q0 -12 ${x < 42 ? 4 : -4} -14`} stroke="#4a4a3a" strokeWidth="1.3" fill="none" opacity={0.7} />
        ))}
        <ellipse cx="42" cy="26" rx="18" ry="7" fill={coat} opacity={0.35} />
        <ellipse cx="13" cy="38" rx="9" ry="7" fill={trim} />
        {eye(10, 36, 1.8)}
        <path d="M5 40 q3 1.6 6 0" stroke="#2b2620" strokeWidth="1.1" fill="none" />
      </>
    ),
  }

  return <>{bodies[species]}</>
}

/* ------------------------------------------------------------------ */
/* The things they walk over to                                        */
/* ------------------------------------------------------------------ */

export function SlotArt({ slot, tier }: { slot: SlotKey; tier: number }) {
  const posh = tier >= 2
  const mid = tier >= 1

  switch (slot) {
    case 'bowl':
      return (
        <>
          {posh && <rect x="-26" y="-6" width="52" height="8" rx="3" fill="#8a6f52" />}
          <ellipse cx="0" cy={posh ? -10 : 0} rx="24" ry="9" fill={mid ? '#c9754a' : '#9a938a'} />
          <ellipse cx="0" cy={posh ? -13 : -3} rx="19" ry="6.5" fill="#6b4a34" />
          <ellipse cx="0" cy={posh ? -14 : -4} rx="14" ry="4.4" fill="#d9a24b" />
          {mid && <ellipse cx="0" cy={posh ? -10 : 0} rx="24" ry="9" fill="none" stroke="#efe6d2" strokeWidth="1.6" />}
        </>
      )
    case 'trough':
      return (
        <>
          <ellipse cx="0" cy="0" rx="22" ry="8.4" fill={mid ? '#7fa8c2' : '#9a938a'} />
          <ellipse cx="0" cy="-2.4" rx="17" ry="6" fill="#5cb8e0" />
          {posh && (
            <>
              <path d="M0 -8 q-9 -18 0 -22 q9 4 0 22" fill="#bfe4f2" opacity={0.85} />
              <circle cx="-6" cy="-20" r="2.6" fill="#e8f6fb" />
              <circle cx="6" cy="-25" r="2" fill="#e8f6fb" />
            </>
          )}
        </>
      )
    case 'bed':
      return (
        <>
          {posh && (
            <>
              <path d="M-32 -18 L0 -46 L32 -18 Z" fill="#8a5a6f" />
              <rect x="-30" y="-20" width="6" height="22" fill="#6f4a58" />
              <rect x="24" y="-20" width="6" height="22" fill="#6f4a58" />
            </>
          )}
          <ellipse cx="0" cy="0" rx="30" ry="12" fill={mid ? '#8a6f9a' : '#a89a8a'} />
          <ellipse cx="0" cy="-3" rx="24" ry="9" fill={mid ? '#c2a8d4' : '#c9bfae'} />
          {mid && <ellipse cx="0" cy="-4" rx="17" ry="6" fill="#efe6d2" opacity={0.6} />}
        </>
      )
    case 'toy':
      return (
        <>
          {posh ? (
            <>
              <rect x="-16" y="-44" width="32" height="46" rx="4" fill="#4f8fb8" />
              <circle cx="0" cy="-32" r="7" fill="#e0c04a" />
              <circle cx="-8" cy="-16" r="5.4" fill="#c2452f" />
              <circle cx="8" cy="-16" r="5.4" fill="#4fa87a" />
            </>
          ) : mid ? (
            <>
              <line x1="-14" y1="2" x2="10" y2="-34" stroke="#8a6f52" strokeWidth="3.4" strokeLinecap="round" />
              <path d="M10 -34 q10 -8 14 -2 q-8 6 -14 2" fill="#d9587f" />
              <path d="M10 -34 q8 -14 14 -12 q-4 9 -14 12" fill="#e0995c" />
            </>
          ) : (
            <>
              <path d="M-14 2 q10 -22 22 -12 q-12 4 -14 14" stroke="#c2542f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <circle cx="10" cy="-12" r="3" fill="#c2542f" />
            </>
          )}
        </>
      )
    case 'brush':
      return (
        <>
          {posh && <rect x="-24" y="-12" width="48" height="14" rx="3" fill="#6f5a42" />}
          <rect x="-16" y={posh ? -20 : -8} width="30" height="8" rx="3" fill={mid ? '#c98f3a' : '#8a7f6a'} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={i}
              x1={-13 + i * 5.4}
              y1={posh ? -20 : -8}
              x2={-13 + i * 5.4}
              y2={posh ? -28 : -15}
              stroke="#5f5039"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
          <rect x="12" y={posh ? -18 : -6} width="16" height="5" rx="2.4" fill="#6f5a42" />
        </>
      )
    case 'perch':
      return (
        <>
          {posh ? (
            <>
              <rect x="-6" y="-70" width="12" height="72" fill="#8a6f52" />
              <ellipse cx="0" cy="2" rx="26" ry="9" fill="#6f5a42" />
              <rect x="-24" y="-74" width="48" height="10" rx="3" fill="#a8896b" />
              <rect x="-20" y="-44" width="38" height="9" rx="3" fill="#a8896b" />
              <path d="M6 -64 q16 8 12 22" stroke="#c9b08a" strokeWidth="3" fill="none" />
            </>
          ) : mid ? (
            <>
              <rect x="-26" y="-14" width="52" height="10" rx="3" fill="#a8896b" />
              <rect x="-22" y="-4" width="8" height="8" fill="#8a6f52" />
              <rect x="14" y="-4" width="8" height="8" fill="#8a6f52" />
              <rect x="-20" y="-22" width="40" height="9" rx="3" fill="#cfe2ec" opacity={0.6} />
            </>
          ) : (
            <>
              <path d="M-22 2 L-18 -20 L18 -20 L22 2 Z" fill="#b8956b" />
              <path d="M-18 -20 L-12 -26 L14 -26 L18 -20 Z" fill="#cfae82" />
            </>
          )}
        </>
      )
  }
}
