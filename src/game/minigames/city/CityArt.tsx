import type { ReactNode } from 'react'

/**
 * Inside the buildings.
 *
 * The city outside is drawn in perspective by the engine; in here it is
 * a flat little stage instead, because what you want indoors is to see
 * the room rather than to fly through it.
 */

const W = 320
const H = 180

function Room({ wall, floor, children }: { wall: string; floor: string; children: ReactNode }) {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill={wall} />
      <rect x="0" y={H - 44} width={W} height="44" fill={floor} />
      <rect x="0" y={H - 46} width={W} height="3" fill="rgba(0,0,0,0.22)" />
      {children}
    </>
  )
}

const SCENES: Record<string, ReactNode> = {
  cafe: (
    <Room wall="#6b5744" floor="#8a6f52">
      <rect x="14" y="26" width="78" height="62" rx="3" fill="#a8c8d8" />
      <rect x="14" y="26" width="78" height="62" rx="3" fill="none" stroke="#4a3a2c" strokeWidth="4" />
      <path d="M18 78 h70" stroke="#cfe2ec" strokeWidth="8" opacity={0.5} />
      <rect x="120" y="96" width="120" height="10" fill="#5a4634" />
      <rect x="126" y="106" width="8" height="30" fill="#4a3a2c" />
      <rect x="226" y="106" width="8" height="30" fill="#4a3a2c" />
      <rect x="150" y="74" width="16" height="22" rx="2" fill="#e8e2d6" />
      <rect x="182" y="78" width="13" height="18" rx="2" fill="#d9a24b" />
      <ellipse cx="262" cy="120" rx="26" ry="12" fill="#4a3a2c" />
      <ellipse cx="262" cy="112" rx="20" ry="10" fill="#9a8878" />
      <circle cx="256" cy="108" r="2" fill="#2b2620" />
      <path d="M272 104 q10 -4 8 6" stroke="#9a8878" strokeWidth="4" fill="none" />
      <rect x="0" y="0" width={W} height="18" fill="#4a3a2c" />
    </Room>
  ),
  library: (
    <Room wall="#5a4c3c" floor="#6f5a42">
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={12 + i * 96} y="18" width="80" height="112" fill="#3f3226" />
          {[0, 1, 2, 3].map((r) => (
            <rect key={r} x={16 + i * 96} y={24 + r * 27} width="72" height="20" fill="#7a6a52" />
          ))}
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={18 + i * 96 + c * 12}
                y={26 + r * 27}
                width="9"
                height="16"
                fill={['#8a3f3a', '#3f5a7a', '#4a7a52', '#8a7a3a', '#6a4a7a', '#7a5a3a'][(i + r + c) % 6]}
              />
            ))
          )}
        </g>
      ))}
      <ellipse cx="160" cy="150" rx="120" ry="16" fill="#4a3a2c" />
      <rect x="140" y="118" width="40" height="14" rx="3" fill="#2f4a3a" />
      <rect x="156" y="132" width="8" height="14" fill="#c9b06a" />
    </Room>
  ),
  arcade: (
    <Room wall="#2b2438" floor="#3f2f4a">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={16 + i * 76} y="40" width="56" height="96" rx="5" fill={['#c2452f', '#2f7ac2', '#c2a02f', '#7a2fc2'][i]} />
          <rect x={24 + i * 76} y="52" width="40" height="30" rx="3" fill="#101018" />
          <rect x={28 + i * 76} y="56" width="8" height="8" fill="#7cf2b8" />
          <rect x={44 + i * 76} y="64" width="10" height="6" fill="#f2e07c" />
          <circle cx={34 + i * 76} cy="98" r="5" fill="#f2f2f2" />
          <circle cx={54 + i * 76} cy="98" r="5" fill="#f26c6c" />
        </g>
      ))}
      <rect x="0" y="0" width={W} height="14" fill="#4a2f6a" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle key={i} cx={20 + i * 42} cy="7" r="4" fill={['#f2e07c', '#7cf2b8', '#f26c6c'][i % 3]} />
      ))}
    </Room>
  ),
  bakery: (
    <Room wall="#8a6f52" floor="#a8896b">
      <rect x="16" y="34" width="120" height="100" rx="4" fill="#5a4634" />
      <rect x="24" y="44" width="104" height="38" rx="3" fill="#2b2018" />
      <circle cx="76" cy="63" r="13" fill="#e0a03a" opacity={0.65} />
      <rect x="24" y="90" width="104" height="36" rx="3" fill="#2b2018" />
      <rect x="160" y="92" width="146" height="12" fill="#6f5a42" />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={176 + i * 28} cy="86" rx="12" ry="7" fill={['#d9a24b', '#c98f3a', '#e0b45f'][i % 3]} />
      ))}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={186 + i * 44} cy="112" rx="16" ry="6" fill="#c98f3a" />
      ))}
    </Room>
  ),
  records: (
    <Room wall="#3a3348" floor="#4a4054">
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={18 + i * 100} y="70" width="82" height="60" fill="#2b2438" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
            <rect key={c} x={22 + i * 100 + c * 9.6} y="74" width="7" height="50" fill={['#c2452f', '#e0c04a', '#3f7ac2', '#4fa87a'][(i + c) % 4]} />
          ))}
        </g>
      ))}
      <circle cx="160" cy="40" r="26" fill="#181420" />
      <circle cx="160" cy="40" r="9" fill="#c2452f" />
      <circle cx="160" cy="40" r="2" fill="#efe6d2" />
      <rect x="256" y="24" width="48" height="30" rx="4" fill="#2b2438" />
      <path d="M262 54 v14 h36 v-14" stroke="#8d949a" strokeWidth="3" fill="none" />
    </Room>
  ),
  museum: (
    <Room wall="#8d8a84" floor="#a8a49c">
      <rect x="0" y="0" width={W} height="16" fill="#6f6c66" />
      {[40, 160, 280].map((x, i) => (
        <rect key={i} x={x - 12} y="16" width="24" height="112" fill="#c2bfb6" />
      ))}
      <path d="M60 44 q100 -22 200 0 q-100 40 -200 0 Z" fill="#d9d2c0" />
      <path d="M60 44 q100 -22 200 0" stroke="#b8b0a0" strokeWidth="3" fill="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${96 + i * 28} 46 q6 20 -2 26`} stroke="#c2bba8" strokeWidth="3" fill="none" />
      ))}
      <rect x="120" y="120" width="80" height="8" fill="#8a857c" />
      <rect x="136" y="128" width="48" height="8" fill="#8a857c" />
      <rect x="152" y="136" width="16" height="8" fill="#8a857c" />
    </Room>
  ),
  cinema: (
    <Room wall="#4a2b30" floor="#3a2126">
      <rect x="30" y="18" width="260" height="86" fill="#1a1418" />
      <rect x="36" y="24" width="248" height="74" fill="#d8d2c4" />
      <rect x="36" y="24" width="248" height="74" fill="#8a9aa8" opacity={0.35} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <g key={i}>
          <rect x={16 + i * 38} y="122" width="28" height="22" rx="4" fill="#7a2f38" />
          <rect x={16 + i * 38} y="116" width="28" height="10" rx="4" fill="#8f3a44" />
        </g>
      ))}
      <path d="M0 18 q40 30 0 60" fill="#6b2f38" />
      <path d={`M${W} 18 q-40 30 0 60`} fill="#6b2f38" />
    </Room>
  ),
  tower: (
    <Room wall="#5a6470" floor="#6f7a86">
      <rect x="14" y="14" width="292" height="104" fill="#a8ccdd" />
      <rect x="14" y="14" width="292" height="104" fill="none" stroke="#3f4a54" strokeWidth="6" />
      {[1, 2, 3].map((i) => (
        <rect key={i} x={14 + i * 73} y="14" width="4" height="104" fill="#3f4a54" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect
          key={i}
          x={22 + i * 32}
          y={70 - (i % 4) * 14}
          width="22"
          height={48 + (i % 4) * 14}
          fill="#7d94a8"
          opacity={0.75}
        />
      ))}
      <rect x="120" y="128" width="90" height="8" fill="#4a5460" />
      <rect x="150" y="136" width="30" height="10" fill="#3f4a54" />
    </Room>
  ),
}

export function InteriorScene({ which, height = 190 }: { which: string; height?: number }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={which}
      style={{ display: 'block', borderRadius: 8 }}
    >
      {SCENES[which] ?? SCENES.cafe}
    </svg>
  )
}
