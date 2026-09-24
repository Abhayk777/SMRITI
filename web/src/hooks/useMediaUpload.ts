import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import imageCompression from 'browser-image-compression'

import * as db from '@/lib/db.ts'
import type { BucketName } from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { extensionOf } from '@/lib/utils.ts'

/**
 * Uploading a photo or a voice clip (frontend.md §13).
 *
 * Two rules, both of which have a failure behind them:
 *
 * **Compress before upload.** Whatever lands in the bucket has to come back
 * down to a tablet in a house on a slow connection. A 4 MB phone photo of a
 * grandchild is a minute of someone's day and a chunk of their data plan; at
 * 200 kB and 800 px it is indistinguishable on a 10-inch screen.
 *
 * **Confirm the upload, then write the row.** The tablet's content puller
 * downloads every referenced path and aborts the *entire* pull if one 404s. A
 * `people` row pointing at an upload that never finished does not degrade
 * gracefully into a missing photo - it stops the patient's tablet from getting
 * any content update at all. So `uploadPatientMedia` resolves only once the
 * object is committed, and callers write the row afterwards, never in parallel.
 *
 * The returned value is a **path**, not a URL. Signed URLs expire; the tablet
 * resolves paths with its own credentials.
 */
export async function uploadPatientMedia(
  patientId: string,
  file: File,
  kind: 'photo' | 'voice',
): Promise<string> {
  const processed =
    kind === 'photo'
      ? await imageCompression(file, {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        })
      : file

  const path = `${patientId}/${crypto.randomUUID()}.${extensionOf(file)}`
  const { data, error } = await db.uploadMedia(path, processed, file.type)
  if (error) throw error
  return data ?? path
}

export type UploadState = {
  uploading: boolean
  error: Error | null
}

/** The stateful wrapper components use, so each form can show its own state. */
export function useMediaUpload(patientId: string) {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null })

  const upload = useCallback(
    async (file: File, kind: 'photo' | 'voice') => {
      setState({ uploading: true, error: null })
      try {
        const path = await uploadPatientMedia(patientId, file, kind)
        setState({ uploading: false, error: null })
        return path
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        setState({ uploading: false, error: err })
        throw err
      }
    },
    [patientId],
  )

  return { ...state, upload }
}

/**
 * A signed URL for playback, minted on demand and never persisted.
 *
 * `enabled` matters: memo audio is fetched when the caregiver presses play, not
 * for all fifty rows on mount. Fifty signed-URL round trips to render a list
 * nobody has listened to yet is a slow page for no reason.
 */
export function useSignedUrl(
  patientId: string,
  bucket: BucketName,
  path: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: qk.signedUrl(patientId, path ?? ''),
    queryFn: () => db.unwrap(db.signedUrl(bucket, path as string)),
    enabled: Boolean(path) && enabled,
    // Signed for an hour; refetch a little before that so a long-open tab does
    // not hand the browser a dead URL.
    staleTime: 50 * 60_000,
    gcTime: 55 * 60_000,
    retry: 0,
  })
}
