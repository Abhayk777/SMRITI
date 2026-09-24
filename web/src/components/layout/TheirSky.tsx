import { motion } from 'framer-motion'

import { useTranslation } from '@/i18n/index.ts'
import { color } from '@/styles/tokens.ts'
import { arcProgress, skyPhase, type SkyPhase } from './sky.ts'

/**
 * "Their sky" - a small window onto the time where the patient is.
 *
 * The first thing most caregivers do before calling a parent is work out what
 * time it is there. This answers it without the arithmetic: the hour, the part
 * of the day, and the sun (or moon) sitting where it is over their hills right
 * now. It is drawn from the patient's timezone alone; nothing here is live
 * data from the tablet, which is why it carries no sync line.
 */
const GROUND: Record<SkyPhase, [string, string]> = {
  dawn: ['#F6D9A8', '#F3E6D2'],
  day: ['#DCE4DA', '#EEF0E8'],
  dusk: ['#F2BFA8', '#F3E2D4'],
  night: ['#C9CFD3', '#E4E6E0'],
}

export function TheirSky({ minutes, name }: { minutes: number; name: string }) {
  const { t, formatTimeMinutes } = useTranslation()
  const phase = skyPhase(minutes)
  const { body, t: arc } = arcProgress(minutes)
  const [top, bottom] = GROUND[phase]

  const cx = 14 + arc * 172
  const cy = 64 - Math.sin(Math.PI * arc) * 44

  return (
    <div className="stitched rounded-card border-[#E7D9C2] bg-ivory p-3 [--knot-ground:var(--color-ivory)] [--stitch:var(--color-bark)]">
      <div className="overflow-hidden rounded-[18px]">
        <svg viewBox="0 0 200 92" className="block w-full" aria-hidden="true">
          <defs>
            <linearGradient id="their-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={top} />
              <stop offset="100%" stopColor={bottom} />
            </linearGradient>
          </defs>
          <rect width="200" height="92" fill="url(#their-sky)" />
          <motion.circle
            r={body === 'sun' ? 9 : 7}
            initial={false}
            animate={{ cx, cy }}
            transition={{ duration: 2, ease: [0.22, 0.8, 0.18, 1] }}
            fill={body === 'sun' ? color.gold : color.cream}
            stroke={body === 'moon' ? color.osak : 'none'}
            strokeOpacity={0.25}
          />
          <path
            d="M0 70 C 30 56 50 64 76 58 S 120 46 146 58 S 180 66 200 56 V92 H0 Z"
            fill={color.paddy}
            fillOpacity={0.35}
          />
          <path
            d="M0 80 C 36 72 64 82 96 76 S 150 68 200 76 V92 H0 Z"
            fill={color.sage}
            fillOpacity={0.55}
          />
        </svg>
      </div>
      <div className="px-1.5 pb-1 pt-2.5">
        <p className="numeral text-[22px] leading-none text-ink">{formatTimeMinutes(minutes)}</p>
        <p className="mt-1 text-[12.5px] leading-snug text-muted">
          {t('sky.where', { phase: t(`sky.${phase}` as const), name })}
        </p>
      </div>
    </div>
  )
}

export default TheirSky
