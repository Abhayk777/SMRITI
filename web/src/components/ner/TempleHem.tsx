import { color } from '@/styles/tokens.ts'
import { PatternBand } from './PatternBand.tsx'

/**
 * Temple hem — Manipur.
 *
 * The Moirang Phee border is a run of stepped, sharp-topped triangles woven
 * along the length of the cloth. Locally it is *yarong phi* — "ya", tooth,
 * "rong", long — said to be the teeth of Pakhangba, the python deity of Meitei
 * belief. Here it is the edge where one section is hemmed into the next: the
 * teeth are painted in the colour of the section *below*, rising into the one
 * above, so the join reads as the finished edge of a cloth rather than a cut.
 *
 * Source: Moirang phee (Wikipedia); Fibre2Fashion, "Moirang Phee of Manipur";
 * Imphal Review of Arts and Politics, "Lashing Phee and Rani Phee".
 */
export function TempleHem({
  size = 18,
  fill = color.cream,
  accent = color.muga,
  flip = false,
  className,
}: {
  size?: number
  /** The colour of the section the teeth belong to. */
  fill?: string
  /** The small lozenges between the teeth. `'transparent'` to hide them. */
  accent?: string
  /** Point the teeth down, for a hem hanging from the top of a section. */
  flip?: boolean
  className?: string
}) {
  return (
    <PatternBand
      tileWidth={24}
      tileHeight={12}
      size={size}
      className={className}
      style={flip ? { transform: 'scaleY(-1)' } : undefined}
    >
      <path
        d="M0 12 V10 H3 V8 H6 V6 H9 V4 H10.6 L12 0.4 L13.4 4 H15 V6 H18 V8 H21 V10 H24 V12 Z"
        fill={fill}
      />
      <path d="M0 5.2 L1.3 6.5 L0 7.8 L-1.3 6.5 Z" fill={accent} />
      <path d="M24 5.2 L25.3 6.5 L24 7.8 L22.7 6.5 Z" fill={accent} />
    </PatternBand>
  )
}

export default TempleHem
