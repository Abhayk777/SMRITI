import { color } from '@/styles/tokens.ts'
import { PatternBand } from './PatternBand.tsx'

/**
 * Siniar — Mizoram.
 *
 * The siniar is the composite motif found on most Mizo Puanchei: triangles,
 * zigzags and diamonds woven together in one band, usually on a red, black and
 * white ground. This is that composite at its simplest: a row of triangles
 * pointing in from each edge, and diamonds alternating red and gold between.
 *
 * Source: Puanchei (Wikipedia); Incredible India, "Mizo Puanchei".
 */
export function Siniar({
  size = 12,
  ground = color.eri,
  thread = color.osak,
  className,
}: {
  size?: number
  ground?: string
  thread?: string
  className?: string
}) {
  return (
    <PatternBand tileWidth={24} tileHeight={12} size={size} className={className}>
      <rect width="24" height="12" fill={ground} />
      <path
        d="M0 0 H6 L3 3.2 Z M6 0 H12 L9 3.2 Z M12 0 H18 L15 3.2 Z M18 0 H24 L21 3.2 Z"
        fill={thread}
      />
      <path
        d="M0 12 H6 L3 8.8 Z M6 12 H12 L9 8.8 Z M12 12 H18 L15 8.8 Z M18 12 H24 L21 8.8 Z"
        fill={thread}
      />
      <path d="M6 3.9 L8.1 6 L6 8.1 L3.9 6 Z" fill={color.lac} />
      <path d="M18 3.9 L20.1 6 L18 8.1 L15.9 6 Z" fill={color.muga} />
      <path d="M12 5 L13 6 L12 7 L11 6 Z" fill={thread} />
      <path d="M0 5 L1 6 L0 7 L-1 6 Z M24 5 L25 6 L24 7 L23 6 Z" fill={thread} />
    </PatternBand>
  )
}

export default Siniar
