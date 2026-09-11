import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Activity,
  BookHeart,
  CalendarHeart,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  Pill,
  Settings2,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'

import { useAuth } from '@/auth/useAuth.ts'
import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { cn } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import { AppBackdrop } from './AppBackdrop.tsx'
import { PatientIdentity } from './PatientIdentity.tsx'
import { usePatientMinutes } from './sky.ts'
import { TheirSky } from './TheirSky.tsx'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Key of a live count to render as a badge, if any. */
  count?: 'flags' | 'memos'
}

const MAIN_NAV: NavItem[] = [
  { to: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { to: 'trends', label: 'Trends', icon: TrendingUp, count: 'flags' },
  { to: 'engagement', label: 'Engagement', icon: Activity },
  { to: 'messages', label: 'Messages', icon: MessageSquareHeart, count: 'memos' },
  { to: 'report', label: 'Report', icon: FileText },
  { to: 'care-guide', label: 'Care guide', icon: BookHeart },
]

const MANAGE_NAV: NavItem[] = [
  { to: 'manage/people', label: 'People', icon: Users },
  { to: 'manage/medicines', label: 'Medicines', icon: Pill },
  { to: 'manage/routine', label: 'Routine', icon: CalendarHeart },
  { to: 'manage/alerts', label: 'Alerts', icon: ShieldAlert },
  { to: 'manage/access', label: 'Access', icon: UserRound },
  { to: 'manage/device', label: 'Tablet', icon: Smartphone },
]

/**
 * The frame every patient-scoped screen renders inside.
 *
 * Two things it guarantees, both from frontend.md §12: the patient identity
 * block is present on every screen without exception, and the patient id in
 * every link is taken from the URL rather than from anything held in memory —
 * so the back button, a refresh and a bookmarked link all behave.
 *
 * The chrome: a solid ivory header hemmed with a slowly drifting gamosa rule,
 * a nav on its own stitched panel whose active pill slides between items, and
 * behind everything the patient's sky (`AppBackdrop`) following the time of
 * day where they are. Each screen fades in and its blocks rise one after
 * another — quickly, and with no exit delay, so navigating never feels slower.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { patientId, patient } = usePatientAccess()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const minutes = usePatientMinutes(patient?.timezone)
  const firstName = patient?.display_name.split(' ')[0] ?? 'they'

  const flags = useQuery({
    queryKey: qk.flags(patientId),
    queryFn: () => db.unwrap(db.activeFlags(patientId)),
  })
  const memos = useQuery({
    queryKey: qk.memos(patientId),
    queryFn: () => db.unwrap(db.memosFor(patientId)),
  })

  const counts = {
    flags: flags.data?.length ?? 0,
    memos: (memos.data ?? []).filter((m) => !m.read_at).length,
  }

  const renderNav = (items: NavItem[], variant: 'sidebar' | 'strip') =>
    items.map(({ to, label, icon: Icon, count }) => {
      const badge = count ? counts[count] : 0
      return (
        <NavLink
          key={to}
          to={`/p/${patientId}/${to}`}
          className={({ isActive }) =>
            cn(
              'group/nav relative flex items-center gap-3 rounded-pill font-body text-[14.5px] font-medium transition-colors',
              variant === 'sidebar' ? 'px-4 py-2.5' : 'flex-none px-4 py-2 whitespace-nowrap',
              isActive ? 'text-ivory' : 'text-body hover:bg-ink/[0.05] hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId={`nav-pill-${variant}`}
                  aria-hidden="true"
                  className="absolute inset-0 overflow-hidden rounded-pill bg-terracotta"
                  transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                >
                  {variant === 'sidebar' && (
                    <span className="absolute inset-y-2 right-3 w-[3px] rounded-full bg-risa-v opacity-80" />
                  )}
                </motion.span>
              )}
              <Icon
                className={cn(
                  'relative size-[18px] flex-none transition-transform duration-200',
                  !isActive && 'group-hover/nav:-rotate-6 group-hover/nav:scale-110',
                )}
              />
              <span className="relative">{label}</span>
              {badge > 0 && (
                // Something new breathes a soft ring, so it is noticed from
                // the corner of the eye without anything flashing.
                <span className="relative ml-auto grid place-items-center">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-pill bg-gold/50 animate-pulse-ring"
                  />
                  <Badge tone="gold" size="sm" className="relative bg-[#F6E3BD]">
                    {badge}
                  </Badge>
                </span>
              )}
            </>
          )}
        </NavLink>
      )
    })

  return (
    <div className="relative isolate min-h-dvh bg-ivory">
      <AppBackdrop minutes={minutes} />

      <header className="sticky top-0 z-40 bg-ivory">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex flex-none items-center gap-2 text-terracotta">
            <Logomark size={24} decorative />
            <Wordmark size={17} color="var(--color-ink)" className="hidden sm:inline-flex" />
          </NavLink>

          <div className="mx-auto flex min-w-0 flex-1 justify-center sm:justify-start sm:pl-4">
            <PatientIdentity />
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className="grid size-10 flex-none place-items-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Account"
            >
              <Settings2 className="size-[18px]" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-52 rounded-card border border-ink/[0.08] bg-ivory p-1.5 shadow-panel"
              >
                <DropdownMenu.Item
                  onSelect={() => navigate('/patients')}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-sand/70"
                >
                  All patients
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => navigate('/patients/new')}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-sand/70"
                >
                  Add another patient
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-ink/[0.08]" />
                <DropdownMenu.Item
                  onSelect={() => void signOut()}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-alert outline-none data-[highlighted]:bg-alert/[0.08]"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Mobile: the nav becomes a scrolling strip under the header. */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5 lg:hidden">
          {renderNav([...MAIN_NAV, ...MANAGE_NAV], 'strip')}
        </nav>

        <GamosaBand variant="rule" size={5} drift={14} />
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-8 px-4 sm:px-6">
        <aside className="hidden w-60 flex-none py-8 lg:block">
          <div className="sticky top-28 space-y-4">
            {/* The nav sits on its own length of cloth: a stitched panel with
                a gamosa selvedge down its left edge. */}
            <nav className="stitched overflow-hidden rounded-panel border-[#E7D9C2] bg-ivory py-3 pl-5 pr-2.5 [--knot-ground:var(--color-ivory)] [--stitch-radius:32px] [--stitch:var(--color-bark)]">
              <GamosaBand vertical size={7} className="absolute inset-y-0 left-0" />
              <div className="space-y-1">
                {renderNav(MAIN_NAV, 'sidebar')}
                <div className="flex items-center gap-3 px-4 pb-1 pt-5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Manage
                  </p>
                  <GamosaBand variant="rule" size={4} className="flex-1 opacity-50" />
                </div>
                {renderNav(MANAGE_NAV, 'sidebar')}
              </div>
            </nav>

            {/* Only where there is height to spare, so the nav never scrolls. */}
            <div className="hidden [@media(min-height:940px)]:block">
              <TheirSky minutes={minutes} name={firstName} />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 py-6 pb-24 sm:py-8">
          {/* Each screen fades in, and its top-level blocks — header, flags,
              tiles, cards — rise one after another. */}
          <motion.div
            key={location.pathname}
            className="stagger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
