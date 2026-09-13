import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Plus, Trash2, WifiOff } from 'lucide-react'
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
import { useCaregiverFeedRealtime } from '@/hooks/usePatientRealtime.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { DEVICE_HEALTH_COPY, initialsOf, timeAgo } from '@/lib/utils.ts'
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
  const missed = Math.max(0, row.meds_scheduled - row.meds_confirmed)

  return (
    <div className="stitched group relative flex items-center gap-3 rounded-card border-[#E7D9C2] bg-ivory p-3.5 transition-[translate,border-color,box-shadow] [--knot-ground:var(--color-ivory)] hover:-translate-y-0.5 hover:border-terracotta/35 motion-reduce:hover:translate-y-0 sm:gap-4 sm:p-5">
      <div className="flex flex-none items-center pl-0.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(row.patient_id)}
          aria-label={`Select ${row.display_name}`}
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
                {row.active_flags} to look at
              </Badge>
            )}
            {row.unread_memos > 0 && (
              <Badge tone="gold" size="sm">
                {row.unread_memos} new message{row.unread_memos === 1 ? '' : 's'}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-[13.5px] leading-snug text-body sm:text-[14px]">
            {row.played_today
              ? `Played today · ${Math.round(row.session_minutes)} min`
              : 'No session today'}
            {row.meds_scheduled > 0 && (
              <>
                {' · '}
                {missed === 0
                  ? 'All medicines confirmed'
                  : `${missed} of ${row.meds_scheduled} medicines not confirmed`}
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
              ? DEVICE_HEALTH_COPY.never.label
              : `Tablet synced ${timeAgo(row.device_last_seen_at)}`}
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
          aria-label={`Delete ${row.display_name}`}
          title="Delete patient completely"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export default function Overview() {
  const { signOut } = useAuth()
  const queryClient = useQueryClient()
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

  // If no patients exist, send to the patient creation wizard
  if (!isPending && !error && (data?.length ?? 0) === 0) {
    return <Navigate to="/patients/new" replace />
  }

  const rows = [...(data ?? [])].sort((a, b) => urgency(b) - urgency(a))
  const needAttention = rows.filter((row) => urgency(row) >= 20)

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rows.map((r) => r.patient_id)))
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
            Sign out
          </Button>
        </div>
        <GamosaBand variant="rule" size={4} />
      </header>

      <main className="mx-auto max-w-[880px] px-5 py-10 sm:px-8">
        <p className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-bark">
          <TwinStar size={7} className="text-lac" />
          Everyone you look after
        </p>
        <h1 className="text-[clamp(26px,3.4vw,34px)]">Your family</h1>
        <p className="mt-2 max-w-[52ch] text-[15.5px] leading-relaxed text-body">
          {isPending
            ? 'Loading…'
            : needAttention.length > 0
              ? `${needAttention.length} of ${rows.length} could use a look. They are at the top.`
              : 'Everyone is on track today. Nothing needs you right now.'}
        </p>

        {rows.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.08] pb-3">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-[14px] font-medium text-body">
              <Checkbox
                checked={
                  selectedIds.size === rows.length && rows.length > 0
                    ? true
                    : selectedIds.size > 0
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={handleToggleSelectAll}
              />
              <span>Select all ({rows.length})</span>
            </label>

            {selectedIds.size > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSelected}
                className="shadow-xs"
              >
                <Trash2 className="size-3.5" />
                Delete chosen ({selectedIds.size})
              </Button>
            )}
          </div>
        )}

        <div className="stagger mt-4 space-y-3">
          {isPending && [0, 1].map((i) => <SkeletonRow key={i} />)}
          {error && <ErrorState error={error} onRetry={() => void refetch()} />}
          {rows.map((row) => (
            <PatientRow
              key={row.patient_id}
              row={row}
              isSelected={selectedIds.has(row.patient_id)}
              onToggleSelect={handleToggleSelect}
              onDelete={handleSingleDelete}
            />
          ))}
        </div>

        <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
          <Link to="/patients/new">
            <Plus className="size-4" />
            Add another patient
          </Link>
        </Button>
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
                ? `Delete ${targetToDelete.names[0]}`
                : `Delete ${targetToDelete?.ids.length ?? 0} patients`}
            </DialogTitle>
            <DialogDescription className="text-[14.5px] leading-relaxed">
              {targetToDelete && targetToDelete.ids.length === 1 ? (
                <>
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-ink">{targetToDelete.names[0]}</strong>? All associated
                  records — including medications, routine schedules, people contacts, audio memos,
                  and activity logs — will be wiped completely.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete the following {targetToDelete?.ids.length}{' '}
                  patients: <strong className="text-ink">{targetToDelete?.names.join(', ')}</strong>?
                  All associated records, medications, routines, and audio files will be wiped
                  completely from the database and storage.
                </>
              )}
            </DialogDescription>
            <p className="mt-3 text-[13px] font-semibold text-alert">
              This action is immediate and cannot be undone.
            </p>
          </DialogHeader>

          {deleteMutation.error && <ErrorState error={deleteMutation.error} className="mb-4" />}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTargetToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
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
              {deleteMutation.isPending ? 'Deleting…' : 'Delete completely'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
