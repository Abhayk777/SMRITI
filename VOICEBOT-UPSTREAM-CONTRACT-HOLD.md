# VoiceBot upstream authorisation — pending contract confirmation

Status: **do not enable any patient or send patient content upstream** until this
single live-contract question is answered by the VoiceBot owner.

## Why this exists

The SMRITI-side sync worker was originally prepared for a narrowly scoped dynamic
patient-provisioning endpoint. The VoiceBot owner reports that the deployed service
instead uses `POST /v1/memory/sync` plus `SMRITI_API_KEYS`, with no admin router.
Those are materially different authorisation models. This note prevents us from
silently choosing one or forgetting to reconcile the difference.

## Awaiting from the VoiceBot owner

For a **brand-new random patient UUID** that is not preconfigured, confirm whether
an ordinary backend credential can successfully call:

```text
POST /v1/memory/sync
{ user_id: <new UUID>, active: true, ...complete explicit snapshot arrays }
```

They must state whether that operation succeeds without changing
`SMRITI_API_KEYS`, editing server environment variables, or restarting VoiceBot.
No keys, patient information, or request bodies are needed in the reply.

## Resume decision

### If a new UUID is dynamically accepted

Adapt the SMRITI worker to the deployed VoiceBot contract:

- remove the upstream provisioning/revocation endpoint dependency;
- use `memory/sync` with a full explicit snapshot and `active: true` to enable;
- immediately block access locally on disable, then synchronise `active: false`;
- preserve existing SMRITI RLS, consent, queue, idempotency, redaction, and
  gateway ownership boundaries;
- update fake-upstream tests to the confirmed endpoint and payload contract;
- keep the VoiceBot integration kill switch off until staging acceptance.

### If a new UUID needs an allow-list change or restart

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
