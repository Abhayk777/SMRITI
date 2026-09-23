import { useState, type ReactNode } from 'react'
import { Table2 } from 'lucide-react'

import { Card } from '@/components/ui/card.tsx'
import { cn, formatDayShort } from '@/lib/utils.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * The frame every chart in the app sits in: a title, an optional plain-language
 * reading of what the chart shows, the plot, a legend, and a table view.
 *
 * The table is not an accessibility box-tick. Contrast on a warm surface means
 * some marks sit near the 3:1 floor, and the rule there is that relief has to
 * exist — a legend, direct labels, and real numbers a caregiver can read out to
 * a doctor over the phone. That last one is the actual use case: nobody reads a
 * chart aloud, they read the numbers.
 */
export function ChartFrame({
  title,
  reading,
  legend,
  table,
  children,
  className,
}: {
  title: string
  /** One sentence saying what the chart says. Not a repeat of the title. */
  reading?: string
  legend?: ReactNode
  /** Rows for the table view: `[label, ...values]`, with a header row first. */
  table?: { head: string[]; rows: string[][] }
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const [showTable, setShowTable] = useState(false)

  return (
    <Card padding="md" className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-[17px] font-bold">{title}</h3>
          {reading && (
            <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-body">
              {reading}
            </p>
          )}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className={cn(
              'inline-flex flex-none items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
              showTable ? 'bg-ink text-ivory' : 'bg-sand text-body hover:bg-sand/70',
            )}
          >
            <Table2 className="size-3.5" />
            {showTable ? t('common.chart') : t('common.numbers')}
          </button>
        )}
      </div>

      {legend && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">{legend}</div>}

      <div className="mt-4">
        {showTable && table ? (
          <div className="max-h-80 overflow-auto rounded-xl border border-ink/[0.08]">
            <table className="w-full border-collapse text-[13.5px]">
              <thead className="sticky top-0 bg-sand">
                <tr>
                  {table.head.map((cell) => (
                    <th key={cell} className="px-3 py-2 text-left font-semibold">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-t border-ink/[0.06]">
                    {row.map((cell, j) => (
                      <td key={j} className={cn('px-3 py-1.5', j > 0 && 'numeral')}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}

/** A legend entry. The swatch carries identity; the text stays in ink. */
export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-body">
      <span
        className="size-2.5 flex-none rounded-[3px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}

/** Shared Recharts tooltip, so every chart in the app explains itself the same way. */
export function ChartTooltip({
  active,
  label,
  payload,
  formatter,
}: {
  active?: boolean
  label?: string | number
  payload?: Array<{ name?: string; value?: number | string; color?: string }>
  formatter?: (value: number | string, name?: string) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-ink/[0.08] bg-ivory px-3 py-2 shadow-panel">
      <p className="text-[12.5px] font-semibold">
        {typeof label === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(label)
          ? formatDayShort(label)
          : label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="mt-1 flex items-center gap-2 text-[13px] text-body">
          <span
            className="size-2 flex-none rounded-[2px]"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          {entry.name && <span>{entry.name}</span>}
          <span className="numeral ml-auto text-ink">
            {formatter && entry.value !== undefined
              ? formatter(entry.value, entry.name)
              : (entry.value ?? '—')}
          </span>
        </p>
      ))}
    </div>
  )
}
