/**
 * Shared shading for the drawn games.
 *
 * All of these are built out of flat SVG shapes - one fill per ear, per
 * apple, per roof tile - and flat fills are what makes them read as
 * paper cut-outs. Editing every shape in eleven files to carry its own
 * gradient would be a great deal of churn for the result.
 *
 * An SVG lighting filter does it in one place instead. `feSpecularLighting`
 * run over a blurred copy of the alpha channel treats the silhouette as a
 * height map: wherever the shape is solid it stands proud, wherever it
 * thins out it falls away, and the light picks out the difference. Any
 * shape put through it comes out rounded, whatever colour it is and
 * whoever drew it.
 *
 * Both filters are deliberately gentle. Pushed harder this trick stops
 * looking like light and starts looking like shrink-wrap.
 */

export const LIFT = 'art-lift'
export const LIFT_SOFT = 'art-lift-soft'
export const DROP = 'art-drop'

/**
 * Emit once inside each `<svg>` that wants the filters.
 *
 * Filter ids resolve document-wide, but every art component owns its own
 * `<svg>` and some of them are rendered on their own, so each carries its
 * own copy rather than depending on a sibling being mounted.
 */
export function ArtDefs() {
  return (
    <defs>
      <filter id={LIFT} x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="bump" />
        <feSpecularLighting
          in="bump"
          surfaceScale="3.2"
          specularConstant="0.5"
          specularExponent="18"
          lightingColor="#fffaf0"
          result="spec"
        >
          <fePointLight x="-60" y="-90" z="150" />
        </feSpecularLighting>
        {/* Keep the highlight inside the shape it belongs to. */}
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="clipped" />
        <feComposite
          in="SourceGraphic"
          in2="clipped"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
        />
      </filter>

      {/* The same thing for small art, where the full strength reads as glare. */}
      <filter id={LIFT_SOFT} x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="bump" />
        <feSpecularLighting
          in="bump"
          surfaceScale="2"
          specularConstant="0.34"
          specularExponent="20"
          lightingColor="#fff8ec"
          result="spec"
        >
          <fePointLight x="-40" y="-60" z="110" />
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="clipped" />
        <feComposite
          in="SourceGraphic"
          in2="clipped"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
        />
      </filter>

      <filter id={DROP} x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="1.6" stdDeviation="1.8" floodColor="#2b2318" floodOpacity="0.3" />
      </filter>
    </defs>
  )
}
