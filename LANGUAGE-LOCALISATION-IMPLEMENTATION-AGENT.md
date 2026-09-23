# SMRITI Caregiver Web Localisation — Coding Agent Handoff

Status: planning handoff. No locale is release-ready until its review and acceptance gate passes.

Target branch: create and use `feat/NER-language-support` from the current approved SMRITI integration branch. Do not work in a VoiceBot branch or modify the separate ML-owned VoiceBot repository.

## 1. Goal

Make the caregiver web application genuinely usable in these UI languages:

| UI locale | Code | Notes |
| --- | --- | --- |
| English | `en` | Source/fallback locale |
| Hindi | `hi` | Devanagari |
| Assamese | `as` | Assamese/Bengali script; native review required |
| Meiteilon / Manipuri | `mni` | Script choice requires native-review and Flutter-owner confirmation |
| Bodo | `brx` | Add to shared metadata only after tablet/app compatibility is confirmed |
| Khasi | `kha` | Latin-script UI; native review required |

The outcome: a caregiver can select a UI language and complete every ordinary web flow — sign in, patient setup, navigation, people, medicines, routines, alerts, access, pairing, OCR review, reports, and errors — without the interface silently reverting to English.

This is caregiver UI localisation, not machine translation of patient data. It must continue to work when BHASHINI is offline.

## 2. Read before editing

Read these files completely before changing code:

1. `AGENTS.md`
2. `docs/INDEX.md`
3. `docs/backend-spec.md` §0, §1, §2, §5, §8, §10 and §12
4. `docs/frontend.md` in full
5. `TASKS.md`
6. This file in full
7. `web/src/lib/languages.ts`
8. `web/src/main.tsx`, `web/src/routes/router.tsx`, `web/src/components/layout/AppShell.tsx`
9. `web/src/pages/patients/CreatePatient.tsx`
10. `supabase/functions/escalation-worker/index.ts`
11. `supabase/functions/_shared/voicebot_gateway_handler.ts`

If the application owner has supplied Flutter language-pack documentation, read that too. Do not infer a tablet language pack, script, TTS, ASR, or VoiceBot capability from a translated caregiver screen.

## 3. Current repository facts

### 3.1 Existing patient-language model

- `patients.lang_code` is an existing patient/tablet field. It is returned by `get_patient_content` and pairing functions and must retain that meaning.
- `patients.script` and `patients.lang_pack_version` are tablet content fields. `create_patient` currently accepts `p_lang` but not an explicit script argument; do not alter its contract casually.
- `web/src/lib/languages.ts` currently lists Hindi (`hi`), Assamese (`as`), Meiteilon (`mni`), Khasi (`kha`), Mizo (`lus`) and English (`en`). Bodo is not currently listed.
- The escalation worker treats only Hindi and Assamese as conversational. Other patient languages use recorded audio/keypad behavior.
- The deployed VoiceBot gateway currently accepts only `en` → `eng` and `hi` → `hin`. A translated web UI must not claim that it enables VoiceBot speech for any other language.

### 3.2 Existing web architecture

- React 19 + Vite + TypeScript + Tailwind; no i18n package is installed.
- `web/src/lib/db.ts` is the only browser Supabase access module. Do not add Supabase access outside it.
- Patient identity remains URL-scoped (`/p/:patientId/...`). Localisation must never affect query keys, patient scope, or cache isolation.
- `web/src/` contains a substantial amount of literal English copy across pages, shared components, forms, dialogs, hooks, errors, and marketing.
- There is no frontend-test framework in `web/package.json`; do not add a dependency merely to make this task convenient without explicit owner approval.

## 4. Non-negotiable product boundaries

### 4.1 Two separate settings

Keep these concepts separate:

| Setting | Belongs to | Controls | Must not change |
| --- | --- | --- | --- |
| Caregiver UI locale | Signed-in caregiver/browser | Web labels, forms, validation, navigation, dates/numbers | Patient profile or tablet configuration |
| Patient language | One patient (`patients.lang_code`) | Tablet content, recordings, escalation behavior, future voice eligibility | Caregiver interface preference |

A caregiver may use an English dashboard while caring for an Assamese-speaking patient, or Hindi while caring for a Khasi-speaking patient. This is valid.

### 4.2 Never translate these automatically

Do not send these to BHASHINI or rewrite them in the browser:

- Medicine names, doses, schedules, instructions, or OCR candidates.
- Patient/person names, relationships, phone numbers, or identifiers.
- `memory_prompt`, memos, reports, event data, transcripts, or voice recordings.
- Media paths, pairing codes, URLs, secrets, auth tokens, error payloads, or audit-log content.
- Database enum values, API request keys, route parameters, or time values.

Display stored content exactly as entered. Translate only surrounding UI labels. Medical correctness is more important than apparent completeness.

### 4.3 No live page translation

Do not call BHASHINI from the browser, on every route render, or for every string. That would add latency, outages, inconsistent wording, cost, and privacy leakage to basic care work.

The release artefact must contain reviewed static locale catalogues and work with no provider connection. BHASHINI is a controlled drafting and quality-assurance tool, not the app runtime dependency.

## 5. BHASHINI use and credential boundary

BHASHINI's developer platform advertises translation through a pipeline API and requires an approved developer account/API credential. Exact model and language-pair availability can vary by environment and must be tested, not assumed — especially Khasi, Bodo, and Meiteilon.

Before any provider call, the owner must supply an approved non-browser credential through Supabase secret management or a separate local secure development environment. Never add it to:

- `web/.env.local`, `VITE_*`, source, fixtures, test output, logs, or commits;
- a browser request/header; or
- a patient record.

The core UI-localisation implementation proceeds without the key. Once available, use it only to produce draft translations and capability evidence; native reviewers approve final catalogues. Do not build a general-purpose translate-arbitrary-text proxy in this task.

## 6. Desired localisation design

Add a small dependency-free localisation layer under `web/src/i18n/`:

```text
web/src/i18n/
  config.ts                 # supported caregiver locales, labels, fallback rules
  LocaleProvider.tsx        # React context, persistence, HTML lang/dir
  useTranslation.ts         # typed t(key, values?) helper
  format.ts                 # Intl date/time/number/list helpers
  keys.ts                   # canonical translation-key/source shape
  locales/
    en.ts                   # complete source catalogue
    hi.ts
    as.ts
    mni.ts
    brx.ts
    kha.ts
```

Exact filenames may vary, but retain these responsibilities.

### 6.1 Translation rules

- English is the complete source catalogue. A missing non-English key falls back to English in development with a visible developer warning; it must fail the catalogue completeness check before release.
- Use semantic keys such as `nav.medicines`, `medicine.add.title`, and `error.saveFailed`, never English sentences as keys.
- Support named interpolation only (`t('pairing.expiresAt', { time })`), not string concatenation. Translators must be able to reorder words.
- Support plural needs with an intentionally small typed formatter or documented locale-specific helper. Do not hard-code English singular/plural logic in components.
- Set `<html lang>` whenever the locale changes. All requested locales are LTR, but retain direction in locale metadata.
- Use `Intl.DateTimeFormat`, `Intl.NumberFormat`, and `Intl.ListFormat` with the UI locale. Continue using the patient's timezone for patient-time meaning; locale changes presentation, not time meaning.
- Keep IDs, medication doses, `HH:MM`, ISO dates where deliberately displayed, and phone numbers unmodified.

### 6.2 Locale persistence and selection

- Persist the caregiver UI locale locally in the browser, keyed to the signed-in user where practical. It is not a patient mutation and needs no schema change for the first release.
- On first visit, use a supported browser preference; otherwise use English.
- Add a compact language selector in an existing account/menu surface in `AppShell`; it should be reachable without a patient selected where possible.
- Keep the selected locale through navigation, refresh, sign-in, and patient switch.
- A family viewer can choose their own interface language; this must not expose additional data or controls.

## 7. Work packages

One work package per coding session. Commit only after its acceptance gate.

### LI-00 — Audit and language contract

1. Start from a clean worktree and record branch/commit.
2. Inventory every user-visible string in `web/src/`, including pages, forms, hook-generated errors, shared UI, loading/error states, and `web/src/marketing/`.
3. Classify each string: static UI, dynamic format, stored patient content, technical/internal, or intentionally untranslated brand name.
4. Produce a capability matrix for caregiver UI, patient/tablet, escalation, and VoiceBot. Do not conflate the columns.
5. Confirm with the Flutter owner how Bodo (`brx`) and Meiteilon (`mni`) must appear in tablet payloads and which scripts/language packs exist. This is required only before modifying patient-language creation flow.
6. Obtain capability evidence for BHASHINI translation pairs `en` ↔ `hi`, `as`, `mni`, `brx`, `kha`; record unavailable pairs honestly.

Gate: reviewed string inventory and capability matrix; no production code, schema, or provider request yet.

### LI-01 — Localisation foundation

1. Add typed source catalogue, locale metadata, provider, translation hook, and `Intl` formatters.
2. Mount the provider in `web/src/main.tsx` without disrupting QueryClient, AuthProvider, MotionConfig, router, or smooth-scroll providers.
3. Add language selection in the account/menu area and update document `lang`.
4. Convert application shell, navigation, account menu, generic controls, loading, common errors, and empty states first.
5. Ensure default English output is visually identical except for the language selector.

Gate: locale switching works across routes and refresh; no Supabase, patient, query-key, or API behavior changes.

### LI-02 — Complete product-surface extraction

Convert all remaining caregiver-facing strings across:

- Public marketing/welcome and authentication.
- Patient overview and create-patient setup.
- Dashboard, trends, engagement, messages, reports, and care guide.
- People, medicines, OCR review, routine, alerts, access, pairing, and device settings, including Voice Assistant status copy.
- Dialogs, labels, placeholders, help text, validation errors, success messages, loading/skeleton labels, and empty/error states.

Do not extract CSS class strings, route path segments, database field names, analytics/event names, test IDs, API payload keys, or stored care data.

Gate: no user-visible English literals remain in target caregiver routes except intentional brand names, names/data, standard abbreviations, or reviewed fallback copy listed in the inventory.

### LI-03 — Reviewed language catalogues

1. Produce BHASHINI-assisted drafts only through approved secure workflow.
2. Put reviewed translations in versioned source files; never fetch them at runtime.
3. Have a competent native reader review each target locale in context, particularly medication, consent, alert, pairing, and safety wording.
4. Verify text length, Indic glyph rendering, wrapping, inputs, tables, dialogs, mobile width, and screen-reader labels for each locale.
5. Do not market a locale as voice-capable merely because its UI catalogue is complete.

Gate: every target catalogue has all keys and a reviewer approval record outside source if team process requires it.

### LI-04 — Patient-language metadata, only after app confirmation

This is optional and separate from caregiver UI localisation.

1. Preserve existing `en`, `hi`, `as`, `mni`, `kha`, and `lus` entries.
2. Add `brx` to `web/src/lib/languages.ts` only when Flutter owner confirms its handling and tablet language-pack behavior.
3. Do not claim Bodo/Khasi/Meiteilon conversational calls, VoiceBot ASR/TTS, or live voice translation without explicit tested evidence.
4. If script selection needs an RPC/schema change, stop. Read owner specification, propose a forward-only migration, and obtain approval before changing an applied migration or `create_patient` contract.

Gate: selected patient language is truthful for tablet/escalation/VoiceBot capabilities and stays compatible with existing paired devices.

### LI-05 — Accessibility, regression, and release

Run all existing checks and the manual matrix below. Do not introduce a test dependency without owner approval; use an existing project convention if one becomes available.

```sh
npm run verify
npm run lint --workspace web
npm run build --workspace web
git diff --check
```

Manual matrix for every UI locale:

1. Signed-out marketing and sign-in.
2. Caregiver and family-viewer role behavior.
3. Create patient; switch patient; refresh; deep link.
4. Create/edit/delete people, medicines, and routines.
5. Media upload followed by save; upload-first invariant remains intact.
6. Pairing and tablet/device screen.
7. Voice Assistant status wording; security and availability remain unchanged.
8. Validation, provider/network error, loading, and empty states.
9. Compact mobile width, large text, keyboard-only navigation, and screen-reader labels.
10. BHASHINI unavailable: navigation and CRUD remain fully operational.

Gate: all commands pass, no patient data mutates because of locale change, and caregivers complete core care workflows in every accepted UI locale.

## 8. Required capability presentation

| Area | Requirement |
| --- | --- |
| Caregiver UI | Locale available only after catalogue review |
| Patient creation | Language label describes actual current delivery behavior |
| Escalation | Preserve current Hindi/Assamese conversational and other recorded/keypad behavior until separately changed/tested |
| Voice Assistant | Preserve current English/Hindi gateway eligibility and live-validation warning |
| BHASHINI | Never imply it provides device voice, emergency calling, medication editing, or offline translation |

## 9. Security and privacy checks

- Never use a `VITE_BHASHINI_*` variable or direct browser `fetch` to BHASHINI.
- Never add a service-role key to `web/`.
- Do not create a translation database table, log translated care content, or persist provider responses in patient records.
- Do not weaken RLS, alter query keys, or create a cross-patient locale cache.
- Do not translate raw server errors; map them to safe product error codes/messages first, then translate the safe message.
- Do not change doses, integer-minute values, weekdays, deadlines, consent, or reminder semantics through formatting or translation.

## 10. Definition of complete

This is complete when:

- Target caregiver UI locales are bundled, complete, and reviewed.
- Locale selection is independent per caregiver/browser and never changes patient/tablet state.
- Ordinary web flows remain functional with BHASHINI disconnected.
- Care content remains original, untransmitted, and unmodified.
- Bodo is selectable as a patient language only if Flutter/tablet contract confirms it.
- Patient language, escalation language, and VoiceBot capability remain truthful.
- Existing security, media-upload, RLS, lint, and build checks still pass.

## 11. Stop conditions

Stop and ask the owner before proceeding if:

- A request requires translating patient, medicine, report, or transcript data.
- BHASHINI credentials are proposed for browser code.
- Exact BHASHINI support for a requested language pair is absent or fails.
- Bodo/Meiteilon script and tablet language-pack semantics are unclear.
- A change needs a database schema/RPC contract not documented in the backend specification.
- A core-care flow fails after string extraction or locale switching.

