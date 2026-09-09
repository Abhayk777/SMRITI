import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Notice } from '@/components/ui/feedback.tsx'
import { cn } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Care guide (frontend.md §8).
 *
 * Static content, no backend wiring — deliberately hardcoded rather than pulled
 * from a CMS, because it is short, it changes rarely, and a caregiver reading it
 * at midnight should not be waiting on a network request.
 *
 * The one editorial rule this page follows: **nothing here diagnoses anything.**
 * Smriti detects changes in patterns. It does not know why a pattern changed and
 * neither does this page, and telling a frightened adult child otherwise would
 * be both wrong and unkind.
 */

const SECTIONS = [
  {
    title: 'What Smriti can and cannot tell you',
    body: [
      'Smriti compares your parent against their own past — never against other people, and never against a clinical benchmark. When it flags something, it is saying "this is different from how they usually are", and nothing more than that.',
      'It cannot diagnose anything. A run of lower scores can mean a chest infection, a new tablet, a bad week of sleep, grief, a hot fortnight, or nothing at all. Those are all far more common than the thing you are afraid of.',
      'What it is good at is noticing a change earlier and more consistently than a weekly phone call can, and giving you dates and figures to take to a doctor instead of a feeling you cannot quite justify.',
    ],
  },
  {
    title: 'When something is flagged',
    body: [
      'Open the flag and read the evidence. It shows when the change appears to start, which areas are involved, and how many sessions it is based on. A flag from four sessions is a much weaker signal than one from thirty.',
      'Before assuming anything, check the ordinary explanations: have they been unwell, has a medicine changed, has someone been staying, has the tablet moved to a room they do not sit in.',
      'If it persists for more than two or three weeks, take the Report page to their doctor. Bring dates. "Since the middle of April they have been slower in the mornings" is something a GP can work with.',
    ],
  },
  {
    title: 'Getting the reminders right',
    body: [
      'The best reminder time is one already attached to something they do — after morning tea, before the evening serial. A time chosen because it looks tidy on a form gets ignored.',
      'The window matters as much as the chime. A wide window means they can take it when they get to it and still have it count; a narrow one produces missed doses that were not really missed.',
      'If Smriti is having to call you often, the reminder time is usually wrong rather than their memory. Move it before you escalate anything.',
    ],
  },
  {
    title: 'Talking to them about it',
    body: [
      'Tell them what it is. Almost everyone accepts a tablet that helps with medicines and shows photographs of the grandchildren; very few accept being monitored, and being told afterwards is what breaks trust.',
      'They can see everything you can see. Say so, and show them once.',
      'If they do not want a person in their circle, take them out. A face they resent is worse than no face.',
    ],
  },
  {
    title: 'Looking after yourself',
    body: [
      'You do not have to open this every day. If nothing is flagged, nothing needs you — that is the whole point of the flags existing.',
      'Share it with your siblings. The most common thing families tell us is that the weekly report ended an argument, because everyone was finally reading the same week.',
      'Distance is not neglect. Being four thousand miles away and knowing they took their tablets at nine is a real form of being there.',
    ],
  },
]

function Section({ title, body }: { title: string; body: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-sand/40 sm:px-6"
      >
        <h2 className="min-w-0 flex-1 font-heading text-[18px] font-bold">{title}</h2>
        <ChevronDown
          className={cn('size-5 flex-none text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-ink/[0.07] px-5 pb-5 pt-4 sm:px-6">
          {body.map((paragraph, i) => (
            <p key={i} className="max-w-[68ch] text-[15px] leading-relaxed text-body">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function CareGuide() {
  const { patient } = usePatientAccess()
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow="Care guide"
        title="How to read all this"
        description={`Short, plain answers to the questions families ask us most — about what Smriti is telling you, and about looking after ${firstName} from wherever you are.`}
      />

      <Notice className="mb-6">
        Nothing here is medical advice, and Smriti does not diagnose anything. If you are
        worried about their health, speak to their doctor — and take the Report page with you.
      </Notice>

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <Section key={section.title} {...section} />
        ))}
      </div>

      <Card tone="dark" padding="lg" className="mt-8">
        <h2 className="text-[19px] text-ivory">Still stuck?</h2>
        <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ivory/85">
          There is a real person on the other end of this. If something on any of these
          screens does not make sense, or you are not sure what to do about a flag, get in
          touch and we will look at it with you.
        </p>
      </Card>
    </>
  )
}
