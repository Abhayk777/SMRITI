# VoiceBot upstream authorisation — contract confirmed

Status: **resolved and accepted in staging on 2026-09-17**. The live backend
credential is configured as the dynamic `backend-primary` key, and the SMRITI
staging integration is enabled.

## Why this exists

The SMRITI-side sync worker originally expected a patient-provisioning endpoint.
The confirmed VoiceBot contract instead uses `POST /v1/memory/sync` and a backend
credential explicitly configured as `dynamic: true` in `SMRITI_API_KEYS`. A
successful first sync both provisions the patient and durably grants that dynamic
key access to the patient UUID. The worker now follows that contract.

## Live confirmation received

The VoiceBot owner confirmed the deployed backend credential uses the dynamic
object form rather than a single-user key or fixed UUID list. A brand-new
synthetic UUID passed the following lifecycle against the live service:

- `memory/sync` with `active: true` and explicit empty arrays returned success;
- conversation succeeded after the first sync;
- `memory/sync` with `active: false` returned success;
- conversation was denied while inactive;
- reactivation restored conversation access;
- the synthetic identity was disabled again after the test.

```text
SMRITI_API_KEYS={"<backend-key>": {"dynamic": true, "id": "backend-primary", "user_ids": []}}
```

The credential remains server-only and is not stored in this repository.

## Resume decision

### Confirmed implementation path

SMRITI uses the deployed VoiceBot contract:

- no upstream provisioning/revocation endpoint dependency;
- use `memory/sync` with a full explicit snapshot and `active: true` to enable;
- immediately block access locally on disable, then synchronise `active: false`;
- preserve existing SMRITI RLS, consent, queue, idempotency, redaction, and
  gateway ownership boundaries;
- update fake-upstream tests to the confirmed endpoint and payload contract;
- keep the VoiceBot integration behind its global and per-patient kill switches.

### Staging acceptance evidence

- the corrected server credential was installed through Supabase secret management;
- `voicebot-admin`, `voicebot-gateway`, and `voicebot-sync-worker` are deployed;
- the scheduled worker initially failed because the deployment-time
  `app_config.functions_base_url` value was absent;
- after configuring the staging HTTPS origin, an isolated caregiver/device/patient
  lifecycle reached `pending` then `ready` through the scheduled worker;
- authenticated device text conversation returned HTTP 200;
- an unowned job ID returned HTTP 404 with `JOB_NOT_FOUND`;
- caregiver disable completed without an upstream cleanup error;
- all synthetic SMRITI patients and authentication users were removed.

## Work now unblocked

- SMRITI gateway, caregiver status UI, Flutter-ready contract, local security
  tests, and regression testing;
- opt-in enable, complete snapshot synchronisation, disable, and text gateway use
  for specifically approved staging patients.

## Other upstream acceptance still needed later

- measured end-to-end language capability before claiming English/Hindi as
  validated (`/v1/health` currently reports zero validated languages);
- real device WAV, TTS polling, playback, interruption, and re-pairing tests;
- confirmation that disabled VoiceBot tools cannot claim call/reminder/medicine/
  game side effects.
