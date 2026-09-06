import type { ReactNode } from 'react'
import { BREED_BY_KEY, COAT_BY_KEY, type Age } from './horseData'

/**
 * Horses, standing still and drawn properly, for the stable.
 *
 * The game itself paints them into a 3D scene as billboards, which is
 * right when they are two hundred yards off and running - but useless
 * for looking at one. These are portraits: the same coats and patterns,
 * held still so you can see what you caught.
 */

const W = 150
const H = 110

/** Legs, barrel and neck, sized by how grown she is. */
function build(age: Age) {
  if (age === 'foal') {
    // All legs and forehead, the way foals are.
    return { body: 0.62, leg: 1.16, head: 1.24, neck: 0.78, belly: 60 }
  }
  if (age === 'yearling') return { body: 0.82, leg: 1.06, head: 1.1, neck: 0.9, belly: 56 }
  return { body: 1, leg: 1, head: 1, neck: 1, belly: 52 }
}

export function HorsePortrait({
  breed,
  coat,
  age = 'grown',
  size = 150,
}: {
  breed: string
  coat: string
  age?: Age
  size?: number
}) {
  const b = BREED_BY_KEY[breed] ?? Object.values(BREED_BY_KEY)[0]
  const c = COAT_BY_KEY[coat] ?? Object.values(COAT_BY_KEY)[0]
  const m = build(age)

  // A Shire is a different shape from an Arabian, so let the breed push
  // the barrel and the leg a little either way.
  const heavy = b.wary < 0.3 ? 1.14 : b.wary > 0.7 ? 0.9 : 1
  const bodyW = 44 * m.body * heavy
  const bodyH = 24 * m.body * heavy
  const legLen = 34 * m.leg
  const groundY = m.belly + legLen

  const pattern: ReactNode =
    c.pattern === 'patches' ? (
      <>
        {/* Irregular patches rather than neat circles - piebald is a map,
            not a polka dot. */}
        <path
          d={`M52 ${m.belly - 20} q10 -8 20 -2 q8 6 2 12 q-12 6 -20 0 q-6 -5 -2 -10 Z`}
          fill={c.mane}
        />
        <path
          d={`M86 ${m.belly - 16} q9 -6 14 2 q3 8 -6 10 q-9 1 -10 -6 Z`}
          fill={c.mane}
        />
      </>
    ) : c.pattern === 'spots' ? (
      <>
        <ellipse cx={52} cy={48} rx={17 * m.body} ry={14 * m.body} fill="#efe6d2" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle
            key={i}
            cx={44 + ((i * 7) % 20)}
            cy={42 + ((i * 5) % 13)}
            r={1.8}
            fill={c.mane}
          />
        ))}
      </>
    ) : c.pattern === 'dapples' ? (
      <>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <circle
            key={i}
            cx={44 + ((i * 11) % 42)}
            cy={42 + ((i * 7) % 16)}
            r={2.6}
            fill="#ffffff"
            opacity={0.28}
          />
        ))}
      </>
    ) : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      role="img"
      aria-label={`${c.label} ${b.label}`}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <ellipse cx="72" cy={groundY + 3} rx={bodyW * 0.95} ry="4" fill="#000" opacity={0.15} />

      {/* legs */}
      {[
        [46, -1],
        [54, 1],
        [92, -1],
        [98, 1],
      ].map(([x, lean], i) => (
        <line
          key={i}
          x1={x}
          y1={m.belly}
          x2={x + lean * 3}
          y2={groundY}
          stroke={c.body}
          strokeWidth={5.5 * m.body}
          strokeLinecap="round"
        />
      ))}
      {/* hooves */}
      {[46, 54, 92, 98].map((x, i) => (
        <rect key={i} x={x - 3} y={groundY - 3} width="6.5" height="4" rx="1.4" fill={c.mane} />
      ))}

      {/* barrel */}
      <ellipse cx="72" cy={m.belly - bodyH * 0.35} rx={bodyW * 0.62} ry={bodyH * 0.78} fill={c.body} />
      {/* hindquarters */}
      <ellipse cx={96} cy={m.belly - bodyH * 0.4} rx={bodyW * 0.3} ry={bodyH * 0.82} fill={c.body} />
      {pattern}

      {/* neck - a proper wedge from the shoulder up to the throat */}
      <path
        d={`M${54} ${m.belly - bodyH * 0.55}
            Q${46} ${34} ${39} ${23}
            L${52} ${18}
            Q${56} ${32} ${66} ${m.belly - bodyH * 0.45} Z`}
        fill={c.body}
      />
      {/* head, carried at the angle a horse actually holds it */}
      <g transform={`rotate(-26 40 ${20 * m.head})`}>
        <ellipse cx={41} cy={20 * m.head} rx={13.5 * m.head} ry={8 * m.head} fill={c.body} />
        <ellipse cx={30} cy={22 * m.head} rx={5.6 * m.head} ry={4.6 * m.head} fill={c.body} />
        <ellipse cx={27} cy={23 * m.head} rx={3.4 * m.head} ry={2.6 * m.head} fill={c.mane} opacity={0.5} />
      </g>
      {/* ears */}
      <path d={`M44 ${13 * m.head} l-1.5 -8 l6 5.5 Z`} fill={c.body} />
      <path d={`M50 ${14 * m.head} l1.5 -8 l4.5 6.5 Z`} fill={c.body} />
      {/* eye */}
      <circle cx={41} cy={17 * m.head} r={1.9} fill="#1a1512" />
      <circle cx={41.6} cy={16.4 * m.head} r={0.6} fill="#fff" opacity={0.8} />

      {/* mane, lying along the crest of the neck */}
      <path
        d={`M48 ${11} Q54 ${24} 62 ${m.belly - bodyH * 0.75}`}
        stroke={c.mane}
        strokeWidth={7 * m.neck}
        fill="none"
        strokeLinecap="round"
      />
      {/* forelock */}
      <path d={`M46 ${12 * m.head} q-5 4 -7 8`} stroke={c.mane} strokeWidth="3.2" fill="none" strokeLinecap="round" />

      {/* tail */}
      <path
        d={`M${110} ${m.belly - bodyH * 0.7} q${age === 'foal' ? 9 : 13} ${14} ${age === 'foal' ? 4 : 7} ${28}`}
        stroke={c.mane}
        strokeWidth={age === 'foal' ? 5 : 8}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * One stall: boarded sides, a bit of straw, and the horse standing in it.
 */
export function Stall({
  children,
  label,
  sub,
  action,
}: {
  children: ReactNode
  label: string
  sub: string
  action?: ReactNode
}) {
  return (
    <div style={stall.box}>
      <div style={stall.inner}>
        <div style={stall.back} />
        <div style={stall.straw} />
        <div style={stall.horse}>{children}</div>
        <div style={stall.postLeft} />
        <div style={stall.postRight} />
        <div style={stall.rail} />
      </div>
      <div style={stall.plate}>
        <div style={stall.name}>{label}</div>
        <div style={stall.sub}>{sub}</div>
      </div>
      {action}
    </div>
  )
}

const stall: Record<string, React.CSSProperties> = {
  box: {
    background: '#4a3826',
    borderRadius: 8,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    border: '1px solid #2f241a',
  },
  inner: {
    position: 'relative',
    height: 96,
    borderRadius: 5,
    overflow: 'hidden',
    background: 'linear-gradient(#6b563c, #4a3a28)',
  },
  back: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 2px, transparent 2px 26px)',
  },
  straw: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    background: 'linear-gradient(#c9a850, #a8873a)',
    backgroundImage:
      'repeating-linear-gradient(74deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 7px)',
  },
  horse: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 6,
  },
  postLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, background: '#3a2c1e' },
  postRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 7, background: '#3a2c1e' },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 30,
    height: 6,
    background: '#3a2c1e',
    opacity: 0.85,
  },
  plate: { textAlign: 'center' },
  name: { fontSize: 13, fontWeight: 700, color: '#f6efdd' },
  sub: { fontSize: 10.5, color: '#c2b08a' },
}
