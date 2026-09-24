import { cn } from '@/lib/utils.ts'

/**
 * The Smriti mark: one endless knot, drawn as a single hand-authored stroke
 * repeated at 0°/90°/180°/270°.
 *
 * `LOGOMARK_PATH` is lifted verbatim from the approved brand artwork. Do not
 * re-derive it from the PNGs, do not "clean it up", and do not round the
 * numbers - the arc sweep and the two straight tails are what make the four
 * copies interlock into a closed knot rather than four separate loops.
 *
 * This component is the single source of truth for the mark. The nav, the
 * footer, the loading states, the favicon and `<LogoReveal />` all render from
 * here; nothing in the app renders the logo from a raster image. The PNGs in
 * `/brand` exist for favicon and OG-image generation and for places that
 * cannot take SVG at all, such as email.
 */
export const LOGOMARK_PATH =
  'M 58.04 48.44 L 38.3 28.7 A 16.5 16.5 0 1 1 61.7 28.7 L 51.62 38.78'

/** The four rotations, in the order the strands draw themselves in. */
export const LOGOMARK_ROTATIONS = [0, -90, 180, 90] as const

export type LogomarkProps = {
  /** Rendered width and height in px. The mark is square. */
  size?: number
  /** Any CSS colour. Defaults to `currentColor` so it inherits from context. */
  color?: string
  /** Stroke weight in the 100×100 viewBox. 8.5 is the brand weight. */
  strokeWidth?: number
  className?: string
  /** Set when the mark sits beside a visible wordmark, so it is not read twice. */
  decorative?: boolean
}

export function Logomark({
  size = 28,
  color = 'currentColor',
  strokeWidth = 8.5,
  className,
  decorative = false,
}: LogomarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('flex-none overflow-visible', className)}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'Smriti'}
    >
      <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="butt">
        {LOGOMARK_ROTATIONS.map((deg) => (
          <path
            key={deg}
            d={LOGOMARK_PATH}
            transform={deg === 0 ? undefined : `rotate(${deg} 50 50)`}
          />
        ))}
      </g>
    </svg>
  )
}

export default Logomark
