import { useId, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'

/**
 * The renderer every textile band in `components/ner/` is built on.
 *
 * A band is one small tile, authored in its own coordinate space, repeated
 * along a strip. The tile is scaled so its height matches the band's, which
 * means a motif keeps its proportions at 4 px and at 40 px — a woven border
 * does not stretch, it repeats.
 *
 * `drift` slides the strip by exactly one tile on a loop. The strip is drawn
 * one tile wider than the box and translated by that tile's width, so the
 * loop point lands on an identical frame and the motion never visibly resets.
 * It is a transform animation on a single element, so it runs on the
 * compositor and costs nothing while the page is idle.
 */
export type PatternBandProps = {
  /** Tile size, in the tile's own units. */
  tileWidth: number
  tileHeight: number
  /** Rendered thickness of the band in px. */
  size: number
  vertical?: boolean
  /** Seconds per tile. Omit for a still band. */
  drift?: number
  /** Run the drift the other way — for stacked bands that counter-move. */
  reverse?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function PatternBand({
  tileWidth,
  tileHeight,
  size,
  vertical = false,
  drift,
  reverse = false,
  className,
  style,
  children,
}: PatternBandProps) {
  const id = `ner-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const scale = size / tileHeight
  const step = tileWidth * scale

  const transform = vertical
    ? `translate(${size} 0) rotate(90) scale(${scale})`
    : `scale(${scale})`

  const svg = (
    <svg
      aria-hidden="true"
      focusable="false"
      className="block"
      width={vertical ? size : drift ? `calc(100% + ${step}px)` : '100%'}
      height={vertical ? '100%' : size}
      style={
        drift && !vertical
          ? ({
              '--drift': `${step}px`,
              animation: `${reverse ? 'drift-reverse' : 'drift'} ${drift}s linear infinite`,
            } as CSSProperties)
          : undefined
      }
    >
      <defs>
        <pattern
          id={id}
          width={tileWidth}
          height={tileHeight}
          patternUnits="userSpaceOnUse"
          patternTransform={transform}
        >
          {children}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none overflow-hidden', className)}
      style={{ ...(vertical ? { width: size } : { height: size }), ...style }}
    >
      {svg}
    </div>
  )
}
