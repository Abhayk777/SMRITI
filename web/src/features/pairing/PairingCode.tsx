import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { formatPairingToken } from '@/lib/utils.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * The token as readable text: `SMRT-K4PQ`.
 *
 * This is the path that gets used more than the QR. Half of these setups happen
 * over a phone call — one sibling is with the parent and the other is reading
 * the code out from a laptop in another timezone — so the code has to survive
 * being spoken aloud. The alphabet the server generates it from already excludes
 * the characters that get misheard; the hyphen is here so it is read as two
 * short groups rather than one eight-character run.
 */
export function PairingCode({ token }: { token: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission refused, or an insecure origin. The code is on
      // screen and readable either way, so there is nothing to recover from.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p
        className="numeral rounded-2xl bg-sand px-5 py-3 text-[clamp(26px,4vw,34px)] tracking-[0.12em]"
        aria-label={t('pairing.codeAria', { code: token.split('').join(' ') })}
      >
        {formatPairingToken(token)}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex items-center gap-2 rounded-pill border border-ink/15 px-4 py-2.5 text-sm font-semibold text-body transition-colors hover:bg-ink/[0.05]"
      >
        {copied ? <Check className="size-4 text-sage" /> : <Copy className="size-4" />}
        {copied ? t('pairing.copied') : t('pairing.copy')}
      </button>
    </div>
  )
}
