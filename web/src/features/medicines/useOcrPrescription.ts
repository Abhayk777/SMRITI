import { useMutation } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'

/**
 * Prescription OCR (frontend.md §9).
 *
 * ── A note on the confidence type ─────────────────────────────────────────
 * The shared Edge Function contract represents catalogue-match confidence as
 * a number. `confidenceBand()` derives the three labels shown by the review UI.
 */

export type OcrConfidenceBand = 'high' | 'low' | 'unrecognized'

export type { OcrMedicationCandidate as OcrCandidate } from '@smriti/shared'
import type { OcrMedicationCandidate as OcrCandidate } from '@smriti/shared'

export type OcrDocument = { base64: string; mimeType: string }

/** Thresholds are a product call, not a spec one — stated here rather than buried. */
export function confidenceBand(confidence: number): OcrConfidenceBand {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.5) return 'low'
  return 'unrecognized'
}

export const CONFIDENCE_COPY: Record<
  OcrConfidenceBand,
  { label: string; help: string; tone: 'sage' | 'gold' | 'alert' }
> = {
  high: {
    label: 'Clear',
    help: 'Read cleanly. Check it against the printed line anyway.',
    tone: 'sage',
  },
  low: {
    label: 'Unclear',
    help: 'Some of this was hard to read. Compare every word with the prescription.',
    tone: 'gold',
  },
  unrecognized: {
    label: 'Could not read',
    help: 'Almost none of this line was legible. Type it in yourself.',
    tone: 'alert',
  },
}

export function useOcrPrescription(patientId: string) {
  return useMutation<{ medications: OcrCandidate[] }, Error, OcrDocument>({
    mutationFn: ({ base64, mimeType }) =>
      db.unwrap(db.scanPrescription(patientId, base64, mimeType)),
  })
}
