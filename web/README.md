# Smriti - caregiver web app

The complete frontend: the public marketing site and the authenticated product,
in one Vite build sharing one design system.

Built against `docs/frontend.md` (structure, routing, data layer, page
requirements, non-negotiables, build order) and `docs/backend-spec.md` (schema,
RPCs, views, storage). The backend is live; this is a client for a working
server, not a mock.

## Running it

```bash
npm install                 # from the repo root - this is an npm workspace
npm run dev  --workspace web
npm run build --workspace web
npm run lint  --workspace web
```

`web/.env.local` needs two lines:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / publishable key>
```

The **anon** key only. The service-role key must never appear anywhere under
`web/` - it bypasses RLS, and RLS is the entire authorization layer.

**Without those two variables the app runs against fixtures** rather than
crashing (`src/lib/mockData.ts`), so a fresh clone is demoable: any phone number
and any six digits sign you in, two patients exist, and every screen has content.
A banner on the sign-in page and a console warning say so. Empty strings count as
absent, which is what a `.env.local` looks like after someone strips their keys.

## Where things are

```
src/
  lib/         db.ts - every query the app makes, and the only Supabase import site
  auth/        session context over Supabase Auth
  patients/    the patient in scope, from the URL; role; cross-patient guards
  routes/      route table, guards, the adaptive landing
  pages/       one folder per route in frontend.md §2
  features/    per-domain hooks and forms
  hooks/       useContentMutation (the content-write choke point), media upload
  components/  brand, ui primitives, layout, media, the setup loader
  marketing/   the public site
  styles/      tokens.ts - brand colour and type, mirrored into src/index.css
```

## The rules this codebase enforces

`frontend.md` §15, all ten, and each is checkable:

| Rule | How it is held |
|---|---|
| 1. Supabase imported only in `lib/` | `grep -rn "@supabase/supabase-js" src \| grep -v "^src/lib/"` → empty |
| 2. Never query `events` / `sessions` / `reminder_events` | no such `.from()` exists; every figure comes from a `daily_*` view |
| 3. All content writes via `useContentMutation` | `db.ts` is the only file calling `.insert`/`.update`/`.delete` |
| 4. Patient id in every scoped query key | keys are built in `lib/queryKeys.ts`, never inline |
| 5. Media confirmed before the row referencing it | `PhotoPicker`/`VoiceRecorder` only return a path once the upload commits |
| 6. Store paths, never signed URLs | `uploadMedia` returns a path; `signedUrl` is minted per playback |
| 7. OCR needs per-row confirmation | save is disabled until every readable line is individually ticked |
| 8. `family_viewer` sees no write affordances | `canEdit` from `usePatientAccess`, checked at every control |
| 9. Realtime unsubscribed on unmount | one channel per patient, torn down by `usePatientRealtime` |
| 10. Patient id lives in the URL | `/p/:patientId/*`; nothing reads it from memory |

## What is wired to real infrastructure, and what is not

**Live and wired:** auth, `my_patients_overview`, `create_patient`,
`invite_member`, all content tables, `daily_report` / `daily_domain`, flags,
memos, device status, storage, realtime, and pairing (`create-pairing-token`) -
which is the milestone where this app and the tablet can be tested together on
entirely real infrastructure.

**Built against a stub, one line from being wired:**

- **OCR** (`ocr-prescription`, not deployed). The whole flow - capture, extract,
  per-row review, save - is complete and usable against a fixed mock. When the
  function ships, delete the mock branch in
  `features/medicines/useOcrPrescription.ts`. Nothing else changes.
- **Report generation** (`generate-report`, not deployed). Trigger, generating
  state and result panel are real; the call throws a `NotImplementedError` that
  the page renders as a plain "not switched on yet" panel rather than a raw
  function error. The live `daily_report` figures are shown underneath, so the
  page is useful today.
- **Deep report views** (ML engineer's `0013_report_views.sql`). The Trends page
  shows domain-level trends now and lays out the three missing sections -
  per-person recognition, savings, time-of-day - as labelled empty states, so
  the shape of the finished page is visible.

## Judgment calls the spec left open

Each is commented at the point it was made; collected here so they can be
overruled easily.

1. **`/` is the marketing site when signed out, the §4 redirect when signed in.**
   `frontend.md` §2 defines `/` as the patient-count redirect; the marketing site
   also has to live at the root. The session decides. The §4 logic itself is
   still in exactly one place (`routes/RootRedirect.tsx`).
   → `routes/RootEntry.tsx`

2. **The escalation `steps` ladder is read-only.** §8 leaves this open. Contacts
   are editable; the timings are shown as plain sentences and cannot be changed
   in the UI. Stretching step 2 out is how a caregiver silently disables the
   missed-dose safety net, and nothing in the interface would tell them.
   → `features/escalation/useEscalationConfig.ts`

3. **`membersFor` does not embed `users(*)`.** §5 sketches
   `.select('*, users(*)')`, but accounts live in `auth.users`, which PostgREST
   does not expose - that embed would 400 against the live server. The Access
   page shows role, join date and which row is you. Names need a
   `public.profiles` view server-side.
   → `lib/db.ts`

4. **Memo audio is signed from `patient-memos`, not `patient-media`.** §13's
   playback snippet uses `patient-media`; `0011_storage.sql` puts memos in
   `patient-memos`. The bucket policies are the live truth.
   → `lib/db.ts`

5. **OCR `confidence` is a number, not a string union.** §9 types it
   `'high' | 'low' | 'unrecognized'`; `packages/shared` - which the real function
   will be validated against - types it as a number. The number is what will
   arrive; `confidenceBand()` derives the three-way band the review UI needs, and
   is the single place to change if that flips.
   → `features/medicines/useOcrPrescription.ts`

6. **OCR proposes a reminder time per line, and says when it cannot.** A
   `medications` row is one dose at one time, but a prescription line can say
   "1-0-1". The row detects that, states it in place, and tells the caregiver to
   add the others by hand - rather than inventing a second time nobody checked,
   inside a flow whose whole point is that a human checks every time.
   → `features/medicines/OcrReview.tsx`

7. **Medicine windows cannot cross midnight.** The slider makes the DB's
   `chosen_time_min BETWEEN start AND end` constraint structurally unreachable,
   which also means a 22:00–02:00 window cannot be expressed. A genuine overnight
   window needs a server-side decision first.
   → `features/medicines/MedicineWindow.tsx`

8. **View row types are declared in the web app.** `@smriti/shared` still has
   `Views: Record<string, never>`. `lib/database.types.ts` mirrors §6 of the
   backend spec column-for-column; delete it once `packages/shared` grows real
   view types.

9. **Dates are computed in the patient's timezone, not the viewer's.** Every
   view's `day` column is her local date. A daughter in Seattle opening this at
   4pm is looking at a woman in Pune for whom it is already tomorrow - comparing
   against the browser's date makes today's row fail to match, and the dashboard
   then reports "no session today" on a day she has already played.
   → `lib/utils.ts` `isoDateDaysAgoInZone`

10. **Chart colours are not the brand colours.** Smriti's palette is warm and
    low-chroma; run those five hues through a colour-vision check against the
    ivory chart surface and they fail four ways. So the five cognitive domains
    became five small multiples in one hue, and the one multi-colour encoding is
    a validated *status* trio. Reasoning and the validation result are in
    `features/reports/chartTheme.ts`.

## The brand assets

- **`components/brand/Logomark.tsx`** is the single source of truth for the mark.
  The path data is lifted verbatim from the approved artwork - do not re-derive
  it from the PNGs. Everything renders from this component; the PNGs in `/brand`
  exist for favicon and OG-image generation only.
- **`components/brand/LogoReveal.tsx`** reproduces the reveal film's
  choreography - four strands, sparks, an overshoot settle, letters rising, the
  gold sweep across the "S" last - at product pace, with `speed` scaling the
  whole sequence uniformly. Used in exactly two places: the marketing hero, and
  the first load after a fresh sign-in.
- **`components/onboarding/SetupCompleteLoader.tsx`** reproduces the loading
  film's mechanics exactly: one normalised value drives the drawing head, the
  trailing gold wash, the progress bar and the LOADING label together, and can be
  driven by real async progress.

  **The scene artwork itself is a redraw, not a trace** - see the note at the top
  of `SkylineArtwork.tsx`. Hand-authoring path data faithful to that generated
  illustration from video frames cannot be done to brand standard, and an
  auto-trace of a compressed frame would look worse. The geometry is isolated in
  that one file so the illustrator's vector source can replace it wholesale, with
  the same viewBox and element ordering, and nothing in the loader changes.

Both respect `prefers-reduced-motion` by settling immediately rather than
freezing mid-transition.
