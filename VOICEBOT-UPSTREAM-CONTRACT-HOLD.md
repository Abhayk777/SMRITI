# VoiceBot upstream authorisation — pending contract confirmation

Status: **contract resolved; keep the integration disabled** until the VoiceBot
owner confirms the live backend credential is configured as a dynamic key.

## Why this exists

The SMRITI-side sync worker originally expected a patient-provisioning endpoint.
The confirmed VoiceBot contract instead uses `POST /v1/memory/sync` and a backend
credential explicitly configured as `dynamic: true` in `SMRITI_API_KEYS`. A
successful first sync both provisions the patient and durably grants that dynamic
key access to the patient UUID. The worker now follows that contract.

## Remaining confirmation from the VoiceBot owner

Confirm the deployed backend credential is configured using the dynamic object
form—not a single-user key or fixed UUID list. Then, for a **brand-new random
patient UUID** that is not preconfigured, confirm this call succeeds:

```text
POST /v1/memory/sync
{ user_id: <new UUID>, active: true, ...complete explicit snapshot arrays }
```

```text
SMRITI_API_KEYS={"<backend-key>": {"dynamic": true, "id": "backend-primary", "user_ids": []}}
```

The deployment must expose that environment value to the running process. Do not
send a key or patient data in the confirmation.

## Resume decision

### Confirmed implementation path

SMRITI uses the deployed VoiceBot contract:

- no upstream provisioning/revocation endpoint dependency;
- use `memory/sync` with a full explicit snapshot and `active: true` to enable;
- immediately block access locally on disable, then synchronise `active: false`;
- preserve existing SMRITI RLS, consent, queue, idempotency, redaction, and
  gateway ownership boundaries;
- update fake-upstream tests to the confirmed endpoint and payload contract;
- keep the VoiceBot integration kill switch off until staging acceptance.

### Contingency if the live key is not dynamic

The live service is static-per-patient. Choose one before enabling real patients:

1. VoiceBot owner provides a supported, secure dynamic patient-access mechanism
   (the narrow provisioning route already modelled locally is suitable); or
2. VoiceBot owner owns the operational allow-list/restart step for every patient.

Option 1 is recommended for a multi-patient product. Option 2 can support a small,
fixed pilot only and must not be represented as self-service enablement.

## Work that can continue now

- SMRITI gateway, caregiver status UI, Flutter-ready contract, local security
  tests, and regression testing;
- deployment checks with `VOICEBOT_INTEGRATION_ENABLED=false`;
- no upstream patient sync, real voice request, or per-patient enablement.

## Other upstream acceptance still needed later

- measured end-to-end language capability before enabling English/Hindi;
- real device WAV, TTS polling, playback, interruption, and re-pairing tests;
- confirmation that disabled VoiceBot tools cannot claim call/reminder/medicine/
  game side effects.
