import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils.ts'

/**
 * Twin star — Arunachal Pradesh.
 *
 * Apatani weavers work a twin-diamond into skirts and shawls, told as two
 * sisters who became stars. Two lozenges joined at a point, each with an open
 * heart. It stands in wherever the design used a generic sparkle, and as the
 * small glyph beside section eyebrows.
 *
 * Source: Chalo Hoppo, "Living textiles of Northeast India".
 */
export function TwinStar({
  size = 20,
  className,
  style,
}: {
  size?: number | string
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 40 20"
      width={typeof size === 'number' ? size * 2 : `calc(${size} * 2)`}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('flex-none fill-current', className)}
      style={style}
    >
      <path
        fillRule="evenodd"
        d="M0 10 L10 0 L20 10 L10 20 Z M5.5 10 L10 5.5 L14.5 10 L10 14.5 Z"
      />
      <path
        fillRule="evenodd"
        d="M20 10 L30 0 L40 10 L30 20 Z M25.5 10 L30 5.5 L34.5 10 L30 14.5 Z"
      />
    </svg>
  )
}

export default TwinStar
