import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { VoicebotAdminResponse } from '@smriti/shared'

import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'

import { voicebotStatusPollInterval } from './voicebotStatusPresentation.ts'

export { voicebotStatusCopy, voicebotStatusPollInterval } from './voicebotStatusPresentation.ts'

type VoicebotStatus = NonNullable<VoicebotAdminResponse['data']>
type Operation = 'enable' | 'disable' | 'retry_sync'

export function useVoicebotStatus(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.voicebotStatus(patientId),
    queryFn: () => db.unwrap(db.voicebotAdmin(patientId, 'status')),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    // While synchronising, status is allowed to change without a patient-row
    // change, so keep this caregiver-visible progress honest.
    refetchInterval: (query) => {
      return voicebotStatusPollInterval(query.state.data?.status)
    },
  })
}

export function useVoicebotOperation(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<VoicebotStatus, Error, Operation>({
    mutationFn: (operation) => db.unwrap(db.voicebotAdmin(patientId, operation)),
    onSuccess: (status) => {
      queryClient.setQueryData(qk.voicebotStatus(patientId), status)
      void queryClient.invalidateQueries({ queryKey: qk.voicebotStatus(patientId) })
    },
  })
}
