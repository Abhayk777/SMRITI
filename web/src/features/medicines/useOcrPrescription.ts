import { useMutation } from '@tanstack/react-query'


/**
 * Prescription OCR (frontend.md §9).
 *
 * The `ocr-prescription` Edge Function **is not built yet**. This hook fails
 * locally and performs no network request; its disabled UI remains as an
 * honest placeholder for the already-defined candidate contract.
 *
 * ── A note on the confidence type ─────────────────────────────────────────
 * frontend.md §9 types `confidence` as `'high' | 'low' | 'unrecognized'`;
 * `packages/shared`'s `ocrMedicationCandidateSchema` — which the backend team
 * owns and the real function will be validated against — types it as a
 * `number`. The number is the one that will actually arrive, so that is what
 * `OcrCandidate` uses, and `confidenceBand()` below derives the three-way band
 * the review UI needs. If the function ends up returning the string form
 * instead, `confidenceBand` is the single place that changes.
 */

export type OcrConfidenceBand = 'high' | 'low' | 'unrecognized'

export type OcrCandidate = {
  name: string
  dose: string
  frequency: string
  /** 0–1, as `packages/shared` defines it. */
  confidence: number
  raw_text: string
}

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
  return useMutation<{ medications: OcrCandidate[] }, Error, string>({
    mutationFn: async (): Promise<{ medications: OcrCandidate[] }> => {
      void patientId
      throw new Error('Prescription scanning is not available yet.')
    },
  })
}
