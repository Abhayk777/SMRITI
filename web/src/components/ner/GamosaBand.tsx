import { color } from '@/styles/tokens.ts'
import { PatternBand } from './PatternBand.tsx'

/**
 * Gamosa border — Assam.
 *
 * The gamosa is a white cloth with a red border; the woven end carries the
 * *phool* (flower) and the plain stripes are the *pari*. This band is a
 * geometric reading of that end: two pari lines framing a row of hollow
 * lozenges (the *kasori* / diamond family of gamosa motifs), with short weft
 * floats between them.
 *
 * `rule` is the hairline version — just the pari with woven notches — for
 * places a full motif would be too loud, like under the app header.
 *
 * Source: Gamosa (Wikipedia); IJTK, "Gamosa: unique symbol of Assamese
 * culture"; assamgamosa.com, motifs of the Assamese gamosa.
 */
export function GamosaBand({
  size = 14,
  variant = 'full',
  thread = color.lac,
  ground = color.eri,
  vertical,
  drift,
  className,
}: {
  size?: number
  variant?: 'full' | 'rule'
  /** The red. Swap for cream when the band sits on terracotta. */
  thread?: string
  /** Pass `'transparent'` to let the section ground show through. */
  ground?: string
  vertical?: boolean
  drift?: number
  className?: string
}) {
  if (variant === 'rule') {
    return (
      <PatternBand
        tileWidth={16}
        tileHeight={4}
        size={size}
        vertical={vertical}
        drift={drift}
        className={className}
      >
        <rect width="16" height="4" fill={ground} />
        <rect y="0" width="16" height="1.2" fill={thread} />
        <rect y="2.8" width="16" height="1.2" fill={thread} />
        <rect x="2" y="1.2" width="5" height="1.6" fill={thread} />
        <rect x="10" y="1.6" width="2" height="0.8" fill={thread} />
      </PatternBand>
    )
  }

  return (
    <PatternBand
      tileWidth={28}
      tileHeight={14}
      size={size}
      vertical={vertical}
      drift={drift}
      className={className}
    >
      <rect width="28" height="14" fill={ground} />
      {/* The pari: a heavy outer stripe and a fine inner one, top and bottom. */}
      <rect y="0" width="28" height="1.6" fill={thread} />
      <rect y="2.8" width="28" height="0.7" fill={thread} />
      <rect y="10.5" width="28" height="0.7" fill={thread} />
      <rect y="12.4" width="28" height="1.6" fill={thread} />
      {/* The lozenge, hollow at its heart. */}
      <path d="M14 4.3 L16.7 7 L14 9.7 L11.3 7 Z" fill={thread} />
      <path d="M14 5.9 L15.1 7 L14 8.1 L12.9 7 Z" fill={ground} />
      {/* Half lozenges at the seams, so the repeat reads as continuous. */}
      <path d="M0 5.4 L1.6 7 L0 8.6 L-1.6 7 Z" fill={thread} />
      <path d="M28 5.4 L29.6 7 L28 8.6 L26.4 7 Z" fill={thread} />
      {/* Weft floats between. */}
      <rect x="4.6" y="6.5" width="3.6" height="1" fill={thread} />
      <rect x="19.8" y="6.5" width="3.6" height="1" fill={thread} />
    </PatternBand>
  )
}

export default GamosaBand
