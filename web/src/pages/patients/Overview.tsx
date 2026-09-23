import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Plus, Search, Trash2, WifiOff } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth.ts'
import { Logomark } from '@/components/brand/Logomark.tsx'
import { AppBackdrop } from '@/components/layout/AppBackdrop.tsx'
import { usePatientMinutes } from '@/components/layout/sky.ts'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { TwinStar } from '@/components/ner/TwinStar.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Avatar, AvatarFallback, Checkbox } from '@/components/ui/controls.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { ErrorState } from '@/components/ui/feedback.tsx'
import { SkeletonRow } from '@/components/ui/skeleton.tsx'
import { useTranslation } from '@/i18n/index.ts'
import { useCaregiverFeedRealtime } from '@/hooks/usePatientRealtime.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { initialsOf } from '@/lib/utils.ts'
import type { PatientOverview } from '@smriti/shared'

/**
 * The multi-patient landing (frontend.md §8).
 *
 * The ordering is the point of the page: **anything needing attention first**,
 * never alphabetical. Someone opening this screen is asking "does anyone need
 * me right now", and a list sorted by name makes them answer that themselves,
 * row by row, every time.
 */

/** Higher scores first. Mirrors what a caregiver would triage by hand. */
function urgency(row: PatientOverview): number {
  let score = 0
  if (row.active_flags > 0) score += 100 + row.active_flags * 10
  if (row.device_status === 'offline') score += 80
  if (row.device_status === 'stale') score += 40
  if (row.device_status === 'never') score += 30
  if (row.meds_scheduled > 0 && row.meds_confirmed < row.meds_scheduled) {
    score += 20 + (row.meds_scheduled - row.meds_confirmed) * 5
  }
  if (!row.played_today) score += 5
  score += row.unread_memos
  return score
}

function PatientRow({
  row,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  row: PatientOverview
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onDelete: (id: string, name: string) => void
}) {
  const { t, formatRelativeTime } = useTranslation()
  const missed = Math.max(0, row.meds_scheduled - row.meds_confirmed)

  return (
    <div className="stitched group relative flex items-center gap-3 rounded-card border-[#E7D9C2] bg-ivory p-3.5 transition-[translate,border-color,box-shadow] [--knot-ground:var(--color-ivory)] hover:-translate-y-0.5 hover:border-terracotta/35 motion-reduce:hover:translate-y-0 sm:gap-4 sm:p-5">
      <div className="flex flex-none items-center pl-0.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(row.patient_id)}
          aria-label={t('common.selectName', { name: row.display_name })}
        />
      </div>

      <Link
        to={`/p/${row.patient_id}/dashboard`}
        className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
      >
        <Avatar className="size-12 flex-none sm:size-14">
          <AvatarFallback className="text-base sm:text-lg">
            {initialsOf(row.display_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-[17px] font-bold transition-colors group-hover:text-terracotta sm:text-[18px]">
              {row.display_name}
            </p>
            {row.active_flags > 0 && (
              <Badge tone="alert" size="sm">
                {t('overview.flags', { count: row.active_flags })}
              </Badge>
            )}
            {row.unread_memos > 0 && (
              <Badge tone="gold" size="sm">
                {t('overview.newMessages', { count: row.unread_memos })}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-[13.5px] leading-snug text-body sm:text-[14px]">
            {row.played_today
              ? t('overview.playedToday', { minutes: Math.round(row.session_minutes) })
              : t('overview.noSession')}
            {row.meds_scheduled > 0 && (
              <>
                {' · '}
                {missed === 0
                  ? t('overview.allMedicines')
                  : t('overview.medicinesMissed', { missed, scheduled: row.meds_scheduled })}
              </>
            )}
          </p>

          <p
            className={`mt-0.5 flex items-center gap-1.5 text-[12px] sm:text-[12.5px] ${
              row.device_status === 'ok' ? 'text-muted' : 'text-alert'
            }`}
          >
            {row.device_status !== 'ok' && <WifiOff className="size-3.5" />}
            {row.device_status === 'never'
              ? t('device.health.never.label')
              : t('device.lastHeard', { time: formatRelativeTime(row.device_last_seen_at) })}
          </p>
        </div>

        <ChevronRight className="size-5 flex-none text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>

      <div className="flex-none pl-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted transition-colors hover:bg-alert/10 hover:text-alert"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(row.patient_id, row.display_name)
          }}
          aria-label={t('overview.deleteAria', { name: row.display_name })}
          title={t('overview.deleteTitle')}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function CareOverview({
  patientCount,
  needAttentionCount,
  offlineDeviceCount,
  newMessageCount,
  playedTodayCount,
}: {
  patientCount: number
  needAttentionCount: number
  offlineDeviceCount: number
  newMessageCount: number
  playedTodayCount: number
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-panel border border-[#E7D9C2] bg-ivory p-6">
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-bark">
        {t('overview.careOverview')}
      </p>
      <h2 className="mt-2.5 font-heading text-[24px] leading-tight">{t('overview.quickRead')}</h2>
      <p className="mt-3 max-w-[25ch] text-[15px] leading-relaxed text-body">
        {t('overview.overviewDescription')}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="min-h-[82px] rounded-[18px] bg-sand/75 p-3">
          <p className="text-[13px] text-body">{t('overview.offlineDevices')}</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-terracotta">
            {offlineDeviceCount}
          </p>
        </div>
        <div className="min-h-[82px] rounded-[18px] bg-clay/75 p-3">
          <p className="text-[13px] text-body">{t('overview.newMessagesTitle')}</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-terracotta">
            {newMessageCount}
          </p>
        </div>
        <div className="min-h-[82px] rounded-[18px] bg-ivory p-3 ring-1 ring-ink/[0.04]">
          <p className="text-[13px] text-body">{t('overview.needsAttention')}</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-terracotta">
            {needAttentionCount}
            <span className="ml-1 text-[16px] text-muted">/{patientCount}</span>
          </p>
        </div>
        <div className="min-h-[82px] rounded-[18px] bg-sage-soft p-3">
          <p className="text-[13px] text-body">{t('overview.playedTodayTitle')}</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-sage">{playedTodayCount}</p>
        </div>
      </div>

      <Button asChild variant="outline" size="md" className="mt-5 w-full border-ink/20 bg-transparent">
        <Link to="/patients/new">
          <Plus className="size-4" />
          {t('overview.addPatient')}
        </Link>
      </Button>
    </div>
  )
}

export default function Overview() {
  const { t } = useTranslation()
  const { session, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  // No single patient is in scope here, so the sky follows your own clock.
  const minutes = usePatientMinutes(undefined)
  useCaregiverFeedRealtime()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [targetToDelete, setTargetToDelete] = useState<{
    ids: string[]
    names: string[]
  } | null>(null)

  const { data, isPending, error, refetch } = useQuery({
    queryKey: qk.overview(),
    queryFn: () => db.unwrap(db.patientsOverview()),
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await db.unwrap(db.deletePatient(id))
      }
    },
    onSuccess: () => {
      setSelectedIds(new Set())
      setTargetToDelete(null)
      void queryClient.invalidateQueries({ queryKey: qk.overview() })
    },
  })

  const rows = [...(data ?? [])].sort((a, b) => urgency(b) - urgency(a))

  // If no patients exist, send to the patient creation wizard
  if (!isPending && !error && rows.length === 0) {
    return <Navigate to="/patients/new" replace />
  }

  // With one patient this page is not the right screen — §4 decides, once.
  if (!isPending && !error && rows.length < 2) {
    return <Navigate to="/" replace />
  }

  const needAttention = rows.filter((row) => urgency(row) >= 20)
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase()
  const matchesSearch = (row: PatientOverview) =>
    !normalizedSearch || row.display_name.toLocaleLowerCase().includes(normalizedSearch)
  const filteredRows = rows.filter(matchesSearch)
  const caregiverName =
    typeof session?.user.user_metadata?.full_name === 'string'
      ? session.user.user_metadata.full_name
      : typeof session?.user.user_metadata?.name === 'string'
        ? session.user.user_metadata.name
        : ''
  const firstName = caregiverName.trim().split(/\s+/)[0] || 'Sunanda'
  const greeting = minutes >= 300 && minutes < 720 ? t('overview.morning') : minutes >= 720 && minutes < 1020 ? t('overview.afternoon') : t('overview.evening')

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.patient_id)))
    }
  }

  const handleSingleDelete = (id: string, name: string) => {
    setTargetToDelete({ ids: [id], names: [name] })
  }

  const handleDeleteSelected = () => {
    const selectedRows = rows.filter((r) => selectedIds.has(r.patient_id))
    setTargetToDelete({
      ids: selectedRows.map((r) => r.patient_id),
      names: selectedRows.map((r) => r.display_name),
    })
  }

  return (
    <div className="relative isolate min-h-dvh bg-ivory">
      <AppBackdrop minutes={minutes} />
      <header className="bg-ivory">
        <div className="mx-auto flex max-w-[880px] items-center gap-3 px-5 py-4 sm:px-8">
          <Logomark size={24} color="var(--color-terracotta)" decorative />
          <Wordmark size={18} />
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void signOut()}>
            {t('account.signOut')}
          </Button>
        </div>
        <GamosaBand variant="rule" size={4} />
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
        <section aria-labelledby="family-heading" className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-bark">
            <TwinStar size={7} className="text-lac" />
            {t('overview.everyone')}
          </p>
          <h1 id="family-heading" className="text-[clamp(26px,3.4vw,34px)]">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-2 max-w-[52ch] text-[15.5px] leading-relaxed text-body">
            {isPending
              ? t('overview.loading')
              : needAttention.length > 0
                ? t('overview.attentionSummary', { attention: needAttention.length, total: rows.length })
                : t('overview.allOnTrack')}
          </p>

          <label className="relative mt-6 block">
            <span className="sr-only">{t('overview.searchAria')}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-terracotta"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('overview.searchPlaceholder')}
              className="h-11 w-full rounded-card border-[1.5px] border-[#E7D9C2] bg-ivory pl-11 pr-4 text-[15px] text-ink placeholder:text-muted/75 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/15"
            />
          </label>

          {filteredRows.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.08] pb-3">
              <label className="flex cursor-pointer select-none items-center gap-2.5 text-[14px] font-medium text-body">
                <Checkbox
                  checked={
                    selectedIds.size === filteredRows.length && filteredRows.length > 0
                      ? true
                      : selectedIds.size > 0
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={handleToggleSelectAll}
                />
                <span>{t('overview.selectAll', { count: filteredRows.length })}</span>
              </label>

              {selectedIds.size > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="shadow-xs"
                >
                  <Trash2 className="size-3.5" />
                  {t('overview.deleteChosen', { count: selectedIds.size })}
                </Button>
              )}
            </div>
          )}

          <div className="stagger mt-4 space-y-3">
            {isPending && [0, 1].map((i) => <SkeletonRow key={i} />)}
            {error && <ErrorState error={error} onRetry={() => void refetch()} />}
            {!isPending && !error && filteredRows.length === 0 && (
              <div className="rounded-card border-[1.5px] border-[#E7D9C2] bg-ivory px-5 py-6 text-center text-sm text-body">
                {t('overview.noMatches', { query: searchQuery })}
              </div>
            )}
            {filteredRows.map((row) => (
              <PatientRow
                key={row.patient_id}
                row={row}
                isSelected={selectedIds.has(row.patient_id)}
                onToggleSelect={handleToggleSelect}
                onDelete={handleSingleDelete}
              />
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:pt-[125px]">
          <CareOverview
            patientCount={rows.length}
            needAttentionCount={needAttention.length}
            offlineDeviceCount={rows.filter((row) => row.device_status === 'offline').length}
            newMessageCount={rows.reduce((total, row) => total + row.unread_memos, 0)}
            playedTodayCount={rows.filter((row) => row.played_today).length}
          />
        </aside>
      </main>

      {/* Confirmation Dialog for Patient Deletion */}
      <Dialog
        open={targetToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setTargetToDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-alert">
              <Trash2 className="size-5" />
              {targetToDelete && targetToDelete.ids.length === 1
                ? t('overview.deleteOneTitle', { name: targetToDelete.names[0] })
                : t('overview.deleteManyTitle', { count: targetToDelete?.ids.length ?? 0 })}
            </DialogTitle>
            <DialogDescription className="text-[14.5px] leading-relaxed">
              {targetToDelete && targetToDelete.ids.length === 1
                ? t('overview.deleteOneDescription', { name: targetToDelete.names[0] })
                : t('overview.deleteManyDescription', { count: targetToDelete?.ids.length ?? 0, names: targetToDelete?.names.join(', ') ?? '' })}
            </DialogDescription>
            <p className="mt-3 text-[13px] font-semibold text-alert">
              {t('overview.cannotUndo')}
            </p>
          </DialogHeader>

          {deleteMutation.error && <ErrorState error={deleteMutation.error} className="mb-4" />}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTargetToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (targetToDelete) {
                  deleteMutation.mutate(targetToDelete.ids)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('overview.deleting') : t('overview.deleteCompletely')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
