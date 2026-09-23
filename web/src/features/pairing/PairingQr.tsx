import { QRCodeSVG } from 'qrcode.react'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { color } from '@/styles/tokens.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * The pairing QR.
 *
 * The encoded payload is the bare token, not a URL — the tablet app scans this
 * and posts it to `redeem-pairing-token`. Wrapping it in a deep link would mean
 * a scan that "succeeds" into a browser, on a device whose whole point is that
 * it does not ask its user to deal with browsers.
 *
 * Error correction is `H` so the mark can sit in the middle without making the
 * code unreadable, and so a middling tablet camera in a room with one bulb
 * still reads it first time.
 */
export function PairingQr({ token, size = 220 }: { token: string; size?: number }) {
  const { t } = useTranslation()
  const markSize = Math.round(size * 0.17)

  return (
    <div className="relative inline-flex rounded-panel bg-ivory p-4 shadow-lift">
      <QRCodeSVG
        value={token}
        size={size}
        level="H"
        bgColor="#F9F4ED"
        fgColor={color.ink}
        marginSize={0}
        aria-label={t('pairing.codeAria', { code: token })}
      />
      <span
        className="pointer-events-none absolute inset-0 grid place-items-center"
        aria-hidden="true"
      >
        <span
          className="grid place-items-center rounded-xl bg-ivory"
          style={{ width: markSize * 1.7, height: markSize * 1.7 }}
        >
          <Logomark size={markSize} color={color.terracotta} decorative />
        </span>
      </span>
    </div>
  )
}
