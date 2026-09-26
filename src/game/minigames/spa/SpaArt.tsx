import type { ReactNode } from 'react'
import {
  GARMENT_BY_KEY,
  HAIR_COLOURS,
  LIPS,
  SHADOWS,
  type Client,
} from './spaData'
import { ArtDefs, LIFT } from '../../art/Shading'

/**
 * The client, drawn in layers.
 *
 * The whole point of this game is watching someone change, so the figure
 * is built back-to-front out of separate pieces - hair behind, body,
 * clothes, shoes, face, hair in front, then whatever they are wearing on
 * top - and every layer reads from the current look. Change a dye and
 * only the hair layers repaint.
 *
 * One deliberate omission: skin tone is never something the player picks.
 * It is who the client is, not a thing you do to them.
 */

const W = 120
const H = 212

/* ------------------------------------------------------------------ */
/* Body geometry, shared by every layer so nothing drifts              */
/* ------------------------------------------------------------------ */

const HEAD = { cx: 60, cy: 44, r: 21 }
const SHOULDER_Y = 76
const WAIST_Y = 118
const HEM_Y = 150
const ANKLE_Y = 188

function shade(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
  const out = rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * amount))))
  return `rgb(${out[0]},${out[1]},${out[2]})`
}

/* ------------------------------------------------------------------ */
/* Hair                                                                */
/* ------------------------------------------------------------------ */

function hairBack(style: string, c: string, dark: string): ReactNode {
  switch (style) {
    case 'loose':
      return <path d={`M32 44 Q30 108 40 132 L80 132 Q90 108 88 44 Z`} fill={dark} />
    case 'beachy':
      return (
        <>
          <path d="M32 46 Q28 104 40 126 L80 126 Q92 104 88 46 Z" fill={dark} />
          <path d="M36 70 q8 8 0 16 q8 8 0 16" stroke={c} strokeWidth="2.4" fill="none" opacity={0.5} />
          <path d="M84 70 q-8 8 0 16 q-8 8 0 16" stroke={c} strokeWidth="2.4" fill="none" opacity={0.5} />
        </>
      )
    case 'waves':
      return (
        <path
          d="M33 46 Q26 80 34 96 Q28 112 38 136 L82 136 Q92 112 86 96 Q94 80 87 46 Z"
          fill={dark}
        />
      )
    case 'curls':
      return (
        <>
          {[[34, 62], [86, 62], [32, 84], [88, 84], [38, 104], [82, 104], [44, 118], [76, 118]].map(
            ([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="14" fill={dark} />
            )
          )}
        </>
      )
    case 'afro':
      return <circle cx="60" cy="40" r="36" fill={dark} />
    case 'braids':
      return (
        <>
          <path d="M34 50 L28 140" stroke={dark} strokeWidth="11" strokeLinecap="round" />
          <path d="M86 50 L92 140" stroke={dark} strokeWidth="11" strokeLinecap="round" />
          {[62, 80, 98, 116, 132].map((y, i) => (
            <g key={i}>
              <circle cx={33 - i * 1.2} cy={y} r="5.4" fill={c} />
              <circle cx={87 + i * 1.2} cy={y} r="5.4" fill={c} />
            </g>
          ))}
        </>
      )
    case 'ponytail':
      return (
        <path
          d="M74 40 Q98 54 96 84 Q95 112 84 126 Q92 104 88 82 Q86 58 70 48 Z"
          fill={dark}
        />
      )
    case 'garland':
      return <path d="M34 48 Q32 96 42 120 L78 120 Q88 96 86 48 Z" fill={dark} />
    case 'chignon':
      return (
        <>
          <path d="M36 48 Q34 78 42 92 L78 92 Q86 78 84 48 Z" fill={dark} />
          <ellipse cx="60" cy="88" rx="19" ry="13" fill={c} />
        </>
      )
    case 'bob':
      return <path d="M34 44 Q32 78 40 88 L80 88 Q88 78 86 44 Z" fill={dark} />
    default:
      return null
  }
}

function hairFront(style: string, c: string, dark: string, frizzy: boolean): ReactNode {
  const cap = (
    <path
      d={`M${HEAD.cx - HEAD.r - 2} 46 Q60 12 ${HEAD.cx + HEAD.r + 2} 46 Q60 30 ${HEAD.cx - HEAD.r - 2} 46 Z`}
      fill={c}
    />
  )

  let art: ReactNode
  switch (style) {
    case 'bun':
      art = (
        <>
          <path d="M37 46 Q60 14 83 46 Q60 34 37 46 Z" fill={c} />
          <circle cx="60" cy="18" r="12" fill={c} />
          <circle cx="60" cy="18" r="12" fill={dark} opacity={0.25} />
        </>
      )
      break
    case 'topknot':
      art = (
        <>
          <path d="M37 46 Q60 16 83 46 Q60 32 37 46 Z" fill={c} />
          <circle cx="60" cy="16" r="11" fill={c} />
          <path d="M52 12 q8 -8 16 0" stroke={dark} strokeWidth="2" fill="none" />
        </>
      )
      break
    case 'buns':
      art = (
        <>
          <path d="M37 46 Q60 16 83 46 Q60 32 37 46 Z" fill={c} />
          <circle cx="34" cy="24" r="11" fill={c} />
          <circle cx="86" cy="24" r="11" fill={c} />
        </>
      )
      break
    case 'updo':
      art = (
        <>
          <path d="M37 46 Q60 12 83 46 Q60 30 37 46 Z" fill={c} />
          <path d="M42 26 Q60 2 78 26 Q60 16 42 26 Z" fill={c} />
          <ellipse cx="60" cy="14" rx="17" ry="10" fill={dark} opacity={0.3} />
        </>
      )
      break
    case 'chignon':
      art = <path d="M37 46 Q60 16 83 46 Q60 30 37 46 Z" fill={c} />
      break
    case 'garland':
      art = (
        <>
          <path d="M37 46 Q60 16 83 46 Q60 30 37 46 Z" fill={c} />
          <path d="M34 40 Q60 20 86 40" stroke={dark} strokeWidth="6" fill="none" strokeLinecap="round" />
          {[40, 50, 60, 70, 80].map((x, i) => (
            <circle key={i} cx={x} cy={30 + Math.abs(x - 60) * 0.22} r="3.4" fill={c} />
          ))}
        </>
      )
      break
    case 'crop':
      art = (
        <>
          <path d="M36 48 Q60 12 84 48 Q76 30 60 30 Q44 30 36 48 Z" fill={c} />
          <path d="M44 34 q10 -6 22 -2" stroke={dark} strokeWidth="2.4" fill="none" />
        </>
      )
      break
    case 'afro':
      art = <path d="M36 44 Q60 18 84 44 Q60 34 36 44 Z" fill={c} />
      break
    case 'bob':
      art = (
        <>
          <path d="M34 48 Q60 12 86 48 Q60 28 34 48 Z" fill={c} />
          <path d="M34 46 L34 74 Q46 78 48 52 Z" fill={c} />
          <path d="M86 46 L86 74 Q74 78 72 52 Z" fill={c} />
        </>
      )
      break
    case 'braids':
      art = <path d="M36 46 Q60 14 84 46 Q60 30 36 46 Z" fill={c} />
      break
    case 'ponytail':
      art = (
        <>
          <path d="M36 46 Q60 14 84 46 Q60 30 36 46 Z" fill={c} />
          <circle cx="76" cy="40" r="5" fill={dark} />
        </>
      )
      break
    default:
      art = (
        <>
          {cap}
          <path d="M34 46 L34 62 Q42 60 44 48 Z" fill={c} />
          <path d="M86 46 L86 62 Q78 60 76 48 Z" fill={c} />
        </>
      )
  }

  return (
    <>
      {art}
      {frizzy && (
        <g opacity={0.85}>
          {[[38, 26], [50, 16], [70, 16], [82, 26], [33, 40], [87, 40]].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y} l${i % 2 ? 5 : -5} -7 l3 6 l${i % 2 ? 4 : -4} -5`}
              stroke={dark}
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Clothes                                                             */
/* ------------------------------------------------------------------ */

function outfitArt(art: string, hex: string, accent: string): ReactNode {
  switch (art) {
    case 'separates':
      return (
        <>
          <path d={`M40 ${SHOULDER_Y} Q60 68 80 ${SHOULDER_Y} L82 ${WAIST_Y} L38 ${WAIST_Y} Z`} fill={hex} />
          <path d={`M38 ${WAIST_Y} L82 ${WAIST_Y} L79 ${ANKLE_Y - 4} L63 ${ANKLE_Y - 4} L60 ${WAIST_Y + 26} L57 ${ANKLE_Y - 4} L41 ${ANKLE_Y - 4} Z`} fill={accent} />
        </>
      )
    case 'suit':
      return (
        <>
          <path d={`M38 ${WAIST_Y - 4} L82 ${WAIST_Y - 4} L79 ${ANKLE_Y - 4} L63 ${ANKLE_Y - 4} L60 ${WAIST_Y + 24} L57 ${ANKLE_Y - 4} L41 ${ANKLE_Y - 4} Z`} fill={hex} />
          <path d={`M40 ${SHOULDER_Y} Q60 68 80 ${SHOULDER_Y} L84 ${WAIST_Y + 10} L36 ${WAIST_Y + 10} Z`} fill={hex} />
          <path d={`M56 ${SHOULDER_Y - 4} L60 ${WAIST_Y + 6} L64 ${SHOULDER_Y - 4} Z`} fill={accent} />
        </>
      )
    case 'jumpsuit':
      return (
        <>
          <path d={`M40 ${SHOULDER_Y} Q60 68 80 ${SHOULDER_Y} L80 ${WAIST_Y} L40 ${WAIST_Y} Z`} fill={hex} />
          <path d={`M40 ${WAIST_Y} L80 ${WAIST_Y} L86 ${ANKLE_Y - 2} L62 ${ANKLE_Y - 2} L60 ${WAIST_Y + 30} L58 ${ANKLE_Y - 2} L34 ${ANKLE_Y - 2} Z`} fill={hex} />
          <rect x="40" y={WAIST_Y - 4} width="40" height="6" fill={accent} />
        </>
      )
    case 'aline':
      return (
        <path
          d={`M40 ${SHOULDER_Y} Q60 68 80 ${SHOULDER_Y} L80 ${WAIST_Y - 6} L92 ${HEM_Y + 12} L28 ${HEM_Y + 12} L40 ${WAIST_Y - 6} Z`}
          fill={hex}
        />
      )
    case 'shift':
      return (
        <>
          <path d={`M40 ${SHOULDER_Y} Q60 68 80 ${SHOULDER_Y} L82 ${HEM_Y + 8} L38 ${HEM_Y + 8} Z`} fill={hex} />
          <rect x="38" y={WAIST_Y - 3} width="44" height="5" fill={accent} opacity={0.7} />
        </>
      )
    case 'wrap':
      return (
        <>
          <path d={`M40 ${SHOULDER_Y} Q60 68 80 ${SHOULDER_Y} L84 ${HEM_Y + 10} L36 ${HEM_Y + 10} Z`} fill={hex} />
          <path d={`M46 ${SHOULDER_Y - 2} L60 ${WAIST_Y - 4} L74 ${SHOULDER_Y - 2} L74 ${SHOULDER_Y + 6} L60 ${WAIST_Y + 4} L46 ${SHOULDER_Y + 6} Z`} fill={accent} />
        </>
      )
    case 'gown':
      return (
        <>
          <path d={`M42 ${SHOULDER_Y} Q60 68 78 ${SHOULDER_Y} L80 ${WAIST_Y} L40 ${WAIST_Y} Z`} fill={hex} />
          <path d={`M40 ${WAIST_Y} L80 ${WAIST_Y} Q92 ${ANKLE_Y} 88 ${ANKLE_Y + 8} L32 ${ANKLE_Y + 8} Q28 ${ANKLE_Y} 40 ${WAIST_Y} Z`} fill={hex} />
          <path d={`M52 ${WAIST_Y + 6} Q60 ${ANKLE_Y - 20} 56 ${ANKLE_Y + 6}`} stroke={accent} strokeWidth="3" fill="none" opacity={0.6} />
        </>
      )
    default:
      return null
  }
}

function shoeArt(art: string, hex: string, accent: string): ReactNode {
  const y = ANKLE_Y + 8
  switch (art) {
    case 'heels':
      return (
        <>
          <path d={`M46 ${y - 6} l10 0 l2 10 l-12 0 Z`} fill={hex} />
          <path d={`M64 ${y - 6} l10 0 l2 10 l-12 0 Z`} fill={hex} />
          <rect x="53" y={y + 3} width="3" height="8" fill={accent} />
          <rect x="71" y={y + 3} width="3" height="8" fill={accent} />
        </>
      )
    case 'boots':
      return (
        <>
          <rect x="45" y={y - 18} width="13" height="22" rx="3" fill={hex} />
          <rect x="63" y={y - 18} width="13" height="22" rx="3" fill={hex} />
          <rect x="44" y={y + 2} width="15" height="4" rx="2" fill={accent} />
          <rect x="62" y={y + 2} width="15" height="4" rx="2" fill={accent} />
        </>
      )
    case 'trainers':
      return (
        <>
          <path d={`M44 ${y - 6} h14 v8 h-16 Z`} fill={hex} />
          <path d={`M62 ${y - 6} h14 v8 h-16 Z`} fill={hex} />
          <rect x="42" y={y + 1} width="17" height="4" rx="2" fill={accent} />
          <rect x="60" y={y + 1} width="17" height="4" rx="2" fill={accent} />
        </>
      )
    case 'sandals':
      return (
        <>
          <rect x="44" y={y} width="15" height="4" rx="2" fill={hex} />
          <rect x="62" y={y} width="15" height="4" rx="2" fill={hex} />
          <path d={`M46 ${y} l8 -8 M75 ${y} l-8 -8`} stroke={accent} strokeWidth="2.4" />
        </>
      )
    default:
      return (
        <>
          <ellipse cx="52" cy={y + 1} rx="8.5" ry="4.5" fill={hex} />
          <ellipse cx="69" cy={y + 1} rx="8.5" ry="4.5" fill={hex} />
        </>
      )
  }
}

function extraArt(art: string, hex: string, accent: string): ReactNode {
  switch (art) {
    case 'studs':
      return (
        <>
          <circle cx="39" cy="50" r="3" fill={hex} />
          <circle cx="81" cy="50" r="3" fill={hex} />
        </>
      )
    case 'hoops':
      return (
        <>
          <circle cx="38" cy="54" r="7.5" stroke={hex} strokeWidth="2.6" fill="none" />
          <circle cx="82" cy="54" r="7.5" stroke={hex} strokeWidth="2.6" fill="none" />
        </>
      )
    case 'glasses':
      return (
        <>
          <circle cx="51" cy="45" r="9" stroke={hex} strokeWidth="2.4" fill="none" />
          <circle cx="69" cy="45" r="9" stroke={hex} strokeWidth="2.4" fill="none" />
          <path d="M60 45 h0" stroke={hex} strokeWidth="2.4" />
          <path d="M42 44 h-4 M78 44 h4" stroke={hex} strokeWidth="2.4" />
        </>
      )
    case 'flowers':
      return (
        <>
          {[38, 48, 60, 72, 82].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={26 + Math.abs(x - 60) * 0.2} r="5" fill={hex} />
              <circle cx={x} cy={26 + Math.abs(x - 60) * 0.2} r="2" fill={accent} />
            </g>
          ))}
        </>
      )
    case 'sunhat':
      return (
        <>
          <ellipse cx="60" cy="30" rx="42" ry="10" fill={hex} />
          <path d="M42 30 Q60 4 78 30 Z" fill={hex} />
          <path d="M42 26 Q60 20 78 26" stroke={accent} strokeWidth="4" fill="none" />
        </>
      )
    case 'pearls':
      return (
        <>
          {[-18, -12, -6, 0, 6, 12, 18].map((dx, i) => (
            <circle key={i} cx={60 + dx} cy={74 + Math.abs(dx) * 0.16} r="3" fill={hex} />
          ))}
        </>
      )
    case 'choker':
      return <rect x="48" y="66" width="24" height="5" rx="2.5" fill={hex} />
    case 'bandana':
      return (
        <>
          <path d="M36 40 Q60 26 84 40 L84 33 Q60 20 36 33 Z" fill={hex} />
          <path d="M84 36 l9 5 l-8 3 Z" fill={accent} />
        </>
      )
    case 'beads':
      return (
        <>
          {[70, 78].map((y, r) =>
            [-16, -10, -4, 2, 8, 14].map((dx, i) => (
              <circle key={`${r}-${i}`} cx={60 + dx} cy={y + Math.abs(dx) * 0.14} r="2.4" fill={r ? accent : hex} />
            ))
          )}
        </>
      )
    case 'scarf':
      return (
        <>
          <path d="M46 70 Q60 82 74 70 L74 76 Q60 88 46 76 Z" fill={hex} />
          <path d="M70 76 l8 18 l-7 -2 Z" fill={accent} />
        </>
      )
    case 'brooch':
      return (
        <>
          <circle cx="74" cy="86" r="5" fill={hex} />
          <circle cx="74" cy="86" r="2" fill={accent} />
        </>
      )
    case 'cuff':
      return <rect x="26" y="112" width="9" height="7" rx="3" fill={hex} />
    case 'shawl':
      return (
        <path d={`M40 ${SHOULDER_Y} Q60 92 80 ${SHOULDER_Y} L86 ${WAIST_Y + 8} L34 ${WAIST_Y + 8} Z`} fill={hex} opacity={0.85} />
      )
    case 'ribbon':
      return (
        <>
          <path d="M52 24 L60 30 L44 32 Z" fill={hex} />
          <path d="M68 24 L60 30 L76 32 Z" fill={hex} />
          <circle cx="60" cy="30" r="3" fill={accent} />
        </>
      )
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* The figure                                                          */
/* ------------------------------------------------------------------ */

export function Person({
  client,
  size = 250,
  masked = false,
}: {
  client: Client
  size?: number
  /** Mid-treatment, with the mud mask on. */
  masked?: boolean
}) {
  const look = client.look
  const dye = HAIR_COLOURS.find((c) => c.key === look.dye) ?? HAIR_COLOURS[0]
  const lip = LIPS.find((l) => l.key === look.lip) ?? LIPS[0]
  const eye = SHADOWS.find((s) => s.key === look.eye) ?? SHADOWS[0]
  const outfit = GARMENT_BY_KEY[look.outfit]
  const shoes = GARMENT_BY_KEY[look.shoes]
  const extra = GARMENT_BY_KEY[look.extra]

  const skin = client.skin
  const skinDark = shade(skin, 0.86)
  const frizzy = client.tangled && !client.done.includes('detangle')
  const rested = client.needs.filter((n) => client.done.includes(n)).length
  const tired = client.needs.length > 0 && rested === 0
  const glowing = client.needs.length > 0 && rested === client.needs.length

  // A dress covers the legs; separates leave them showing.
  const longSkirt = outfit?.art === 'gown'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      role="img"
      aria-label={`${client.name}, made over`}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <ArtDefs />
      {/* A soft patch on the floor rather than a hard oval. */}
      <ellipse cx="60" cy={ANKLE_Y + 18} rx="38" ry="6.4" fill="#2b2318" opacity={0.08} />
      <ellipse cx="60" cy={ANKLE_Y + 18} rx="26" ry="4.4" fill="#2b2318" opacity={0.1} />
      <ellipse cx="60" cy={ANKLE_Y + 17.4} rx="14" ry="2.8" fill="#2b2318" opacity={0.12} />

      {/* One filter over the whole figure, so every flat panel of her -
          skin, hair, cloth - comes out with some roundness on it. */}
      <g filter={`url(#${LIFT})`}>
      {hairBack(look.hair, dye.hex, dye.shade)}

      {/* legs */}
      {!longSkirt && (
        <>
          <rect x="49" y={WAIST_Y} width="10" height={ANKLE_Y - WAIST_Y} fill={skin} />
          <rect x="61" y={WAIST_Y} width="10" height={ANKLE_Y - WAIST_Y} fill={skinDark} />
        </>
      )}

      {/* torso and arms */}
      <path d={`M40 ${SHOULDER_Y} Q60 66 80 ${SHOULDER_Y} L79 ${WAIST_Y + 4} L41 ${WAIST_Y + 4} Z`} fill={skin} />
      <rect x="54" y="60" width="12" height="18" fill={skinDark} />
      <rect x="29" y={SHOULDER_Y - 2} width="10" height={WAIST_Y - SHOULDER_Y + 10} rx="5" fill={skin} />
      <rect x="81" y={SHOULDER_Y - 2} width="10" height={WAIST_Y - SHOULDER_Y + 10} rx="5" fill={skinDark} />

      {outfit && outfitArt(outfit.art, outfit.hex, outfit.accent)}
      {shoes && shoeArt(shoes.art, shoes.hex, shoes.accent)}

      {/* head */}
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={skin} />
      <ellipse cx="38" cy="48" rx="4" ry="5" fill={skinDark} />
      <ellipse cx="82" cy="48" rx="4" ry="5" fill={skinDark} />

      {masked ? (
        <>
          <path d="M40 42 Q60 22 80 42 Q80 66 60 70 Q40 66 40 42 Z" fill="#7d8f6a" />
          <ellipse cx="51" cy="46" rx="6" ry="3.5" fill="#f2ece0" />
          <ellipse cx="69" cy="46" rx="6" ry="3.5" fill="#f2ece0" />
          <circle cx="51" cy="46" r="2" fill="#2b2620" />
          <circle cx="69" cy="46" r="2" fill="#2b2620" />
        </>
      ) : (
        <>
          {/* eyeshadow */}
          {eye.hex !== 'none' && (
            <>
              <path d="M44 42 q7 -5 14 0 q-7 4 -14 0 Z" fill={eye.hex} opacity={0.8} />
              <path d="M62 42 q7 -5 14 0 q-7 4 -14 0 Z" fill={eye.hex} opacity={0.8} />
            </>
          )}
          {/* tired or glowing */}
          {tired && (
            <>
              <ellipse cx="51" cy="51" rx="5" ry="2.4" fill={shade(skin, 0.82)} opacity={0.8} />
              <ellipse cx="69" cy="51" rx="5" ry="2.4" fill={shade(skin, 0.82)} opacity={0.8} />
            </>
          )}
          {glowing && (
            <>
              <circle cx="45" cy="50" r="5" fill="#e08a8a" opacity={0.28} />
              <circle cx="75" cy="50" r="5" fill="#e08a8a" opacity={0.28} />
            </>
          )}
          {/* brows */}
          <path
            d="M45 37 q6 -3 12 -1"
            stroke={dye.shade}
            strokeWidth={client.done.includes('brows') ? 2.2 : 3.2}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M75 37 q-6 -3 -12 -1"
            stroke={dye.shade}
            strokeWidth={client.done.includes('brows') ? 2.2 : 3.2}
            fill="none"
            strokeLinecap="round"
          />
          {/* eyes */}
          <ellipse cx="51" cy="45" rx="4.4" ry="3.4" fill="#f7f3ec" />
          <ellipse cx="69" cy="45" rx="4.4" ry="3.4" fill="#f7f3ec" />
          <circle cx="51" cy="45" r="2.3" fill="#3a3128" />
          <circle cx="69" cy="45" r="2.3" fill="#3a3128" />
          <circle cx="52" cy="44" r="0.8" fill="#fff" />
          <circle cx="70" cy="44" r="0.8" fill="#fff" />
          {/* nose and mouth */}
          <path d="M60 48 q2 4 -1 5" stroke={skinDark} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M54 58 q6 5 12 0 q-6 2 -12 0 Z" fill={lip.hex} />
        </>
      )}

      {hairFront(look.hair, dye.hex, dye.shade, frizzy)}
      {extra && extra.key !== 'none' && extraArt(extra.art, extra.hex, extra.accent)}
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Treatment icons                                                     */
/* ------------------------------------------------------------------ */

const TOOLS: Record<string, ReactNode> = {
  facial: (
    <>
      <circle cx="32" cy="24" r="13" fill="#e8c9a8" />
      <path d="M24 20 q8 -6 16 0" stroke="#c99a7a" strokeWidth="2" fill="none" />
      <circle cx="27" cy="24" r="2" fill="#3a3128" />
      <circle cx="37" cy="24" r="2" fill="#3a3128" />
      <path d="M46 14 q8 6 0 12" stroke="#7fc2d8" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  mask: (
    <>
      <path d="M18 18 Q32 6 46 18 Q46 36 32 40 Q18 36 18 18 Z" fill="#7d8f6a" />
      <ellipse cx="26" cy="22" rx="4" ry="2.4" fill="#f2ece0" />
      <ellipse cx="38" cy="22" rx="4" ry="2.4" fill="#f2ece0" />
    </>
  ),
  massage: (
    <>
      <ellipse cx="32" cy="30" rx="20" ry="8" fill="#e8c9a8" />
      <path d="M20 22 q6 -8 12 0" stroke="#c98b7f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M36 22 q6 -8 12 0" stroke="#c98b7f" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  sauna: (
    <>
      <rect x="16" y="24" width="32" height="16" rx="3" fill="#a8763f" />
      {[24, 32, 40].map((x, i) => (
        <path key={i} d={`M${x} 20 q4 -6 0 -12`} stroke="#cfd8de" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ))}
    </>
  ),
  manicure: (
    <>
      <path d="M16 30 q10 -10 24 -8 l2 8 q-12 4 -26 4 Z" fill="#e8c9a8" />
      {[22, 28, 34, 40].map((x, i) => (
        <circle key={i} cx={x} cy={24 - (i % 2)} r="2.6" fill="#d9587f" />
      ))}
    </>
  ),
  pedicure: (
    <>
      <ellipse cx="30" cy="28" rx="14" ry="9" fill="#e8c9a8" />
      {[22, 28, 34, 40].map((x, i) => (
        <circle key={i} cx={x} cy={20} r="2.4" fill="#d9587f" />
      ))}
    </>
  ),
  brows: (
    <>
      <path d="M14 26 q10 -8 20 -3" stroke="#5e4a38" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M40 18 l12 -8 l3 5 l-12 8 Z" fill="#b8bfc4" />
    </>
  ),
  soak: (
    <>
      <path d="M14 22 L50 22 L46 38 Q32 41 18 38 Z" fill="#cfd8de" />
      <path d="M16 26 L48 26 L46 34 Q32 37 18 34 Z" fill="#7fb6d9" />
      <circle cx="26" cy="20" r="3" fill="#fff" opacity={0.7} />
      <circle cx="36" cy="18" r="2.4" fill="#fff" opacity={0.6} />
    </>
  ),
  detangle: (
    <>
      <path d="M16 36 L30 28 L33 34 L19 41 Z" fill="#a8763f" />
      <path d="M30 28 L46 20 L50 28 L34 35 Z" fill="#d0a870" />
      {[34, 38, 42, 46].map((x, i) => (
        <path key={i} d={`M${x} 22 l-2 -6`} stroke="#5f5039" strokeWidth="2" strokeLinecap="round" />
      ))}
    </>
  ),
  wash: (
    <>
      <path d="M18 26 Q32 12 46 26 Q46 40 32 42 Q18 40 18 26 Z" fill="#7fb6d9" />
      {[[26, 18], [34, 14], [42, 18]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill="#fff" opacity={0.8} />
      ))}
    </>
  ),
}

export function SpaTool({ tool, size = 44 }: { tool: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={(size * 48) / 64}
      role="img"
      aria-label={tool}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <ArtDefs />
      <g filter={`url(#${LIFT})`}>{TOOLS[tool] ?? TOOLS.facial}</g>
    </svg>
  )
}
