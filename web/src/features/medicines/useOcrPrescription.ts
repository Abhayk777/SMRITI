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
  { label: 'ocr.confidence.high' | 'ocr.confidence.low' | 'ocr.confidence.unrecognized'; help: 'ocr.confidence.highHelp' | 'ocr.confidence.lowHelp' | 'ocr.confidence.unrecognizedHelp'; tone: 'sage' | 'gold' | 'alert' }
> = {
  high: {
    label: 'ocr.confidence.high', help: 'ocr.confidence.highHelp',
    tone: 'sage',
  },
  low: {
    label: 'ocr.confidence.low', help: 'ocr.confidence.lowHelp',
    tone: 'gold',
  },
  unrecognized: {
    label: 'ocr.confidence.unrecognized', help: 'ocr.confidence.unrecognizedHelp',
    tone: 'alert',
  },
}

export function useOcrPrescription(patientId: string) {
  return useMutation<{ medications: OcrCandidate[] }, Error, OcrDocument>({
    mutationFn: ({ base64, mimeType }) =>
      db.unwrap(db.scanPrescription(patientId, base64, mimeType)),
  })
}
