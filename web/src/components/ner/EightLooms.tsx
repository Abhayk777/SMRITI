import type { ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import { color } from '@/styles/tokens.ts'
import { GamosaBand } from './GamosaBand.tsx'
import { NagaBands } from './NagaBands.tsx'
import { Siniar } from './Siniar.tsx'
import { TempleHem } from './TempleHem.tsx'
import { TwinStar } from './TwinStar.tsx'

/**
 * "Eight sisters, eight looms" - one swatch for each Northeast state.
 *
 * The row is the whole motif library shown once, with each weave named and
 * placed, so the borders used across the site are credited to where they come
 * from rather than left as anonymous decoration. It drifts slowly and pauses
 * under the pointer, so any swatch can be read.
 */
type Loom = { state: string; weave: string; swatch: ReactNode }

const LOOMS: Loom[] = [
  {
    state: 'Assam',
    weave: 'Gamosa',
    swatch: <GamosaBand size={40} className="w-full" />,
  },
  {
    state: 'Arunachal Pradesh',
    weave: 'Apatani twin star',
    swatch: (
      <div className="flex h-10 items-center justify-center gap-2 bg-eri text-lac">
        <TwinStar size={14} />
        <TwinStar size={14} className="text-osak" />
        <TwinStar size={14} />
      </div>
    ),
  },
  {
    state: 'Manipur',
    weave: 'Moirang Phee',
    swatch: (
      <div className="flex h-10 items-end bg-eri">
        <TempleHem size={26} fill={color.lac} accent={color.osak} className="w-full" />
      </div>
    ),
  },
  {
    state: 'Meghalaya',
    weave: 'Ryndia check',
    swatch: <div className="h-10 bg-ryndia" />,
  },
  {
    state: 'Mizoram',
    weave: 'Puanchei siniar',
    swatch: <Siniar size={40} className="w-full" />,
  },
  {
    state: 'Nagaland',
    weave: 'Naga shawl',
    swatch: <NagaBands size={40} className="w-full" />,
  },
  {
    state: 'Sikkim',
    weave: 'Lepcha thara',
    swatch: <div className="h-10 bg-thara" />,
  },
  {
    state: 'Tripura',
    weave: 'Risa',
    swatch: <div className="h-10 bg-risa" />,
  },
]

function Swatch({ loom }: { loom: Loom }) {
  return (
    <figure className="w-[172px] flex-none">
      <div className="overflow-hidden rounded-[10px] ring-1 ring-ink/10">{loom.swatch}</div>
      <figcaption className="mt-2 leading-tight">
        <span className="block text-[13px] font-semibold text-ink">{loom.weave}</span>
        <span className="block text-[12px] text-muted">{loom.state}</span>
      </figcaption>
    </figure>
  )
}

export function EightLooms({ className }: { className?: string }) {
  return (
    <div className={cn('group relative overflow-hidden', className)}>
      {/* Two copies back to back; the track slides by exactly one copy. */}
      <div
        className="flex w-max gap-6 group-hover:[animation-play-state:paused]"
        style={{ animation: 'eight-looms 60s linear infinite' }}
      >
        {[...LOOMS, ...LOOMS].map((loom, i) => (
          <div key={`${loom.state}-${i}`} aria-hidden={i >= LOOMS.length || undefined}>
            <Swatch loom={loom} />
          </div>
        ))}
      </div>
      {/* Soft edges so swatches enter and leave rather than being cut. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-cream to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-cream to-transparent" />
    </div>
  )
}

export default EightLooms
