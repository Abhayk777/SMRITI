import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { JapiRosette } from '@/components/ner/JapiRosette.tsx'
import { NagaBands } from '@/components/ner/NagaBands.tsx'
import { Siniar } from '@/components/ner/Siniar.tsx'
import { TempleHem } from '@/components/ner/TempleHem.tsx'
import { TwinStar } from '@/components/ner/TwinStar.tsx'
import { Eyebrow } from '@/components/ui/card.tsx'
import { cn } from '@/lib/utils.ts'
import { color } from '@/styles/tokens.ts'

/**
 * The heading block at the top of every screen inside the app shell.
 *
 * The `description` is not decoration. Each screen in this product answers a
 * question a worried adult child is holding, and saying which question in one
 * plain sentence is most of what makes a data screen usable by someone who is
 * not a clinician.
 *
 * Each section of the app carries its own weave under the title, so the
 * screens stop reading as one page with different numbers on it: Today is
 * gamosa, Trends siniar, Engagement Naga banding, Messages Ryndia check, the
 * report Risa, the care guide Thara, and everything under Manage the Moirang
 * temple teeth. A japi crown turns very slowly behind the header's right side.
 */
function SectionWeave({ pathname }: { pathname: string }) {
  if (pathname.endsWith('/dashboard')) return <GamosaBand size={10} />
  if (pathname.endsWith('/trends')) return <Siniar size={10} />
  if (pathname.endsWith('/engagement')) return <NagaBands size={10} />
  if (pathname.endsWith('/messages')) return <div className="h-2.5 bg-ryndia" />
  if (pathname.endsWith('/report')) return <div className="h-2.5 bg-risa" />
  if (pathname.endsWith('/care-guide')) return <div className="h-2.5 bg-thara" />
  return <TempleHem size={10} fill={color.lac} accent={color.muga} />
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  const { pathname } = useLocation()

  return (
    <div className={cn('relative mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-16 hidden text-bark opacity-[0.07] md:block"
      >
        <div className="animate-spin-slow">
          <JapiRosette size={220} strokeWidth={1.2} />
        </div>
      </div>

      <div className="relative min-w-0">
        {eyebrow && (
          <Eyebrow className="mb-2 flex items-center gap-2">
            <TwinStar size={7} className="text-lac" />
            {eyebrow}
          </Eyebrow>
        )}
        <h1 className="text-[clamp(26px,3.2vw,34px)] leading-tight">{title}</h1>
        <motion.div
          aria-hidden="true"
          className="mt-3 w-36 overflow-hidden rounded-[3px] shadow-[0_1px_0_rgba(74,36,19,0.12)]"
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 0.8, 0.18, 1] }}
        >
          <SectionWeave pathname={pathname} />
        </motion.div>
        {description && (
          <p className="mt-3.5 max-w-[62ch] text-[15px] leading-relaxed text-body">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="relative flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
