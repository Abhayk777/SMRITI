import { color } from '@/styles/tokens.ts'
import { PatternBand } from './PatternBand.tsx'

/**
 * Naga shawl banding — Nagaland.
 *
 * Naga shawls are built from horizontal bands — mostly red, white and a
 * blue-black from Assam indigo — with a motif band carrying lozenges, spear
 * lines and ritual forms. Many specific patterns mark status (a Lotha shawl
 * can record the feasts its wearer has given), so this deliberately uses only
 * the shared vocabulary: the band structure, a double lozenge and a spear
 * line. It does not reproduce any one tribe's cloth.
 *
 * Source: Naga shawl (Wikipedia); IGNCA, "Textiles of Nagaland"; Indian
 * Tribal Heritage, "Shawls worn among 16 major tribes".
 */
export function NagaBands({
  size = 20,
  drift,
  reverse,
  className,
}: {
  size?: number
  drift?: number
  reverse?: boolean
  className?: string
}) {
  return (
    <PatternBand
      tileWidth={32}
      tileHeight={20}
      size={size}
      drift={drift}
      reverse={reverse}
      className={className}
    >
      <rect width="32" height="20" fill={color.osak} />
      <rect y="3" width="32" height="1" fill={color.eri} />
      <rect y="4" width="32" height="2" fill={color.lac} />
      <rect y="14" width="32" height="2" fill={color.lac} />
      <rect y="16" width="32" height="1" fill={color.eri} />
      {/* The motif band: a double lozenge between two spear lines. */}
      <path d="M16 6.8 L19.2 10 L16 13.2 L12.8 10 Z" fill={color.lac} />
      <path d="M16 8.4 L17.6 10 L16 11.6 L14.4 10 Z" fill={color.eri} />
      <rect x="3" y="9.6" width="6.5" height="0.8" fill={color.eri} />
      <path d="M9.5 9.1 L11 10 L9.5 10.9 Z" fill={color.eri} />
      <rect x="22.5" y="9.6" width="6.5" height="0.8" fill={color.eri} />
      <path d="M22.5 9.1 L21 10 L22.5 10.9 Z" fill={color.eri} />
    </PatternBand>
  )
}

export default NagaBands
