# SMRITI Caregiver Web Localisation — String Audit & Capability Matrix (LI-00–LI-02)

**Document Status:** LI-03 generated catalogues complete for Hindi, Assamese, Meitei Mayek, and Khasi; Bodo pending BHASHINI NMT access  
**Branch:** `feat/NER-language-support`  
**Base Commit:** `557209e16b3668aba31a98258481f06d6ee0b760`  
**Scope:** Historical LI-00 inventory plus the final LI-02 caregiver-web literal audit. No schema migrations, Edge Function changes, tablet/Flutter changes, provider credentials, or native translation review.

---

## 1. Executive Summary & Architectural Invariants

In accordance with [AGENTS.md](file:///Users/aditsingh/Documents/repos/SMRITI/AGENTS.md) and [docs/backend-spec.md](file:///Users/aditsingh/Documents/repos/SMRITI/docs/backend-spec.md) (§0, §1, §2, §5, §8, §10, §12):

1. **Two Completely Distinct Settings:**
   - **Caregiver Web UI Locale:** Governs browser labels, buttons, navigation, headers, forms, validation messages, and date/number presentations. Selected per caregiver/browser session.
   - **Patient Language (`patients.lang_code`):** Governs tablet audio playback, tablet content pack selection, conversational vs. DTMF escalation phone behavior, and VoiceBot gateway eligibility. A caregiver using an English or Hindi dashboard to care for an Assamese- or Khasi-speaking elder is a valid, standard configuration.
2. **Zero Inferred Voice Capabilities:**
   - Translating web UI copy to a regional language does **NOT** enable voice bot speech, ASR, TTS, or conversational telephony for that language.
3. **Strict Content Invariance (Never Translated):**
   - Stored clinical data, medications, dosages, doctor's prescription text, patient names, family relationships, memory prompts, memo recordings/transcripts, and internal identifiers must remain unmodified and must never be sent to automated translation services.
4. **BHASHINI Boundary:**
   - The web runtime must be 100% functional with zero network connection to BHASHINI. Translations are compiled into static catalogues (`web/src/i18n/locales/*.ts`). No `VITE_BHASHINI_*` keys or direct browser calls to BHASHINI are permitted.

---

## 2. String Classification Taxonomy

Every text token across `web/src/` belongs to exactly one of five categories:

| Category | Description | Handling Rule |
| :--- | :--- | :--- |
| **1. Static UI Copy** | Action buttons, navigation links, section titles, form field labels, placeholder hints, modal text, empty state messages, and system error explanations. | **Localise** into static locale catalogues. Available: `en`, `hi`, `as`, `mni`, and `kha`; Bodo (`brx`) is pending and is not selectable. |
| **2. Dynamic Format** | Timestamps, calendar dates, relative times (`timeAgo`), integer-minute conversions (`formatMinutes`), durations, list enumerations, and pluralized counts. | **Localise** using native `Intl` APIs (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.ListFormat`) and localized plural formatters. |
| **3. Stored Care Data** | Medication names (`med.name`), strengths/doses (`med.dose`), patient names (`patient.display_name`), person names and relationships (`person.name`, `person.relationship`), memory prompts (`person.memory_prompt`), audio transcripts (`memo.transcript`), and caregiver notes. | **NEVER TRANSLATE.** Display verbatim as stored in the database. |
| **4. Technical / Internal** | Route path literals (`/p/:patientId/medicines`), DB enum strings (`morning`, `evening`, `family_viewer`), storage bucket keys (`patient-media`, `voice-memos`), pairing tokens (`SMRT-K4PQ`), HTTP/PostgREST error codes (`PGRST116`). | **NEVER TRANSLATE.** Keep in original machine format. |
| **5. Brand & Regional Terms** | Product brands: `Smriti`, `Smriti Care`. Regional textile/cultural heritage motifs: `Gamosa`, `Japi`, `Ryndia`, `Risa`, `Thara`, `Siniar`. | **UNTRANSLATED.** Retain cultural and product names in all locales (transliterated only if explicitly mandated by native reviewer). |

---

## 3. Real String Audit of `web/src/` by Exact File Path

### 3.1 Authentication & Root Navigation

#### `web/src/pages/auth/SignIn.tsx`
- **Authentication Method:** Phone number + 6-digit SMS OTP, plus Google Sign-In button ([SignIn.tsx:L34-L47](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/pages/auth/SignIn.tsx#L34-L47)).
- **Static UI Text:**
  - Brand aside: `"Be close to their day, from wherever you are."`, `"Sign in with the mobile number your family uses. We will send a six-digit code."`, `"Smriti (स्मृति) is Sanskrit for memory — what is kept, and what is passed on."`
  - Demo notice: `"No Supabase credentials are configured, so this is a demo. Any number and any six digits will sign you in, and nothing you save is real."`
  - Step 1 (Phone): `"Sign in"`, `"Use Google or your mobile number. No password to remember."`, `"Continue with Google"`, `"Opening Google…"`, `"or use your mobile number"`, `"Mobile number"`, `"Include the country code."`, `"Send me a code"`, `"Sending…"`
  - Step 2 (OTP): `"Enter your code"`, `"We sent six digits to"`, `"Six-digit code"`, `"Sign in"`, `"Checking…"`, `"Use a different number"`, `"Send the code again"`
- **Validation Errors:** `"Enter the mobile number you signed up with"`, `"Include the country code, like +91 98765 43210"`, `"The code is six digits"`.
- **Runtime Error Strings:** `"Could not send the code"`, `"That code did not work. Try again."`, `"Could not start Google sign-in. Try again."`.
- **Dynamic Format:** `"Send again in ${cooldown}s"`.
- **Stored/Technical:** Phone number string, OTP code.

#### `web/src/routes/FullPageLoading.tsx` & `web/src/routes/RootRedirect.tsx`
- **Static UI Text:** `"Loading Smriti…"` ([FullPageLoading.tsx:L8](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/routes/FullPageLoading.tsx#L8)).

---

### 3.2 Public Marketing Pages (`web/src/marketing/`)

#### `web/src/marketing/MarketingNav.tsx`
- **Static UI Text:** `"How it works"`, `"Features"`, `"Stories"`, `"Get started"`.
- **Brand:** Logomark, Wordmark (`Smriti`).

#### `web/src/marketing/Hero.tsx` & `web/src/marketing/Sections.tsx`
- **Static UI Text:**
  - Hero headline: `"Dignity-first cognitive care for elders in Northeast India"`
  - Hero narrative: ambient memory support, daily routines, photo identification, gentle reminders.
  - Call to action: `"Explore Platform"`, `"Get Started"`, `"Sign In"`.
  - Feature highlights: tablet interface, caregiver companion, automated watchdog safety monitoring.

---

### 3.3 Application Shell, Layout & Identity (`web/src/components/layout/`)

#### `web/src/components/layout/AppShell.tsx`
- **Main Navigation Tabs ([AppShell.tsx:L45-L52](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/components/layout/AppShell.tsx#L45-L52)):**
  - `"Today"` (route: `dashboard`)
  - `"Trends"` (route: `trends`)
  - `"Engagement"` (route: `engagement`)
  - `"Messages"` (route: `messages`)
  - `"Report"` (route: `report`)
  - `"Care guide"` (route: `care-guide`)
- **Manage Submenu Tabs ([AppShell.tsx:L54-L61](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/components/layout/AppShell.tsx#L54-L61)):**
  - Section header: `"Manage"`
  - `"People"` (route: `manage/people`)
  - `"Medicines"` (route: `manage/medicines`)
  - `"Routine"` (route: `manage/routine`)
  - `"Alerts"` (route: `manage/alerts`)
  - `"Access"` (route: `manage/access`)
  - `"Tablet"` (route: `manage/device`)
- **Account Dropdown ([AppShell.tsx:L166-L198](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/components/layout/AppShell.tsx#L166-L198)):**
  - Trigger `aria-label`: `"Account"`
  - `"All patients"`
  - `"Add another patient"`
  - `"Sign out"`
- **Badges / Indicators:** Numeric count badges for unread flags and unread audio memos.

#### `web/src/components/layout/PatientIdentity.tsx`
- **Static UI Text:** `"View only"`, `"Switch patient"`.
- **Dynamic Format:** `"Synced ${timeAgo(lastSeenAt)}"` or fallback copy from `DEVICE_HEALTH_COPY.never.label`.
- **Stored Care Data:** Patient name (`patient.display_name`), patient avatar initials (`initialsOf(name)`).

#### `web/src/components/layout/TheirSky.tsx` & `PageHeader.tsx`
- **Static UI Text:** Time of day contextual descriptions ("Morning", "Afternoon", "Evening", "Night").
- **Dynamic Format:** Time and date strings formatted to the patient's local timezone.

---

### 3.4 Patient Setup & Onboarding (`web/src/pages/patients/`)

#### `web/src/pages/patients/CreatePatient.tsx`
- **Wizard Steps ([CreatePatient.tsx:L90-L98](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/pages/patients/CreatePatient.tsx#L90-L98)):**
  - `basics`: `"About them"`
  - `people`: `"People"`
  - `voices`: `"Voices"`
  - `medicines`: `"Medicines"`
  - `routine`: `"Routine"`
  - `alerts`: `"If a dose is missed"`
  - `pairing`: `"The tablet"`
- **Header & Navigation:** `"Step ${step + 1} of ${STEPS.length}"`, `"Back"`, `"Skip for now"`, `"Getting ${name}’s tablet ready"`, `"Getting their tablet ready"`.
- **Step 1 Basics:**
  - Header: `"Who are we looking after?"`
  - Subtitle: `"Smriti uses their age and schooling to pitch the games right — not to judge anything. Everything here can be changed later."`
  - Fields: `"Their name"` (hint: `"What the tablet will call them."`), `"Age"`, `"Years of schooling"`, `"Their language"`, `"Their timezone"` (hint: `"Reminder times are theirs, not yours. This is why."`).
  - Alert Section: `"If a dose is missed, who should Smriti call?"`, `"Usually you. This is a real phone call, placed only after the tablet has already chimed twice and they have not responded."`, `"Name"`, `"Phone"`.
- **Validation Messages:** `"A name is needed"`, `"Age must be between 30 and 120"`, `"Years of schooling must be between 0 and 25"`, `"Please select a timezone"`, `"Who should Smriti call first?"`, `"Include the country code, like +91 98765 43210"`.
- **Warning Notice:** `"The profile has not been created yet. Go back to the first step"`.

#### `web/src/pages/patients/Overview.tsx` (Multi-Patient Hub)
- **Static UI Text:**
  - Subtitle: `"Everyone you look after"`
  - Header greeting: `"Good morning"`, `"Good afternoon"`, `"Good evening"` + caregiver name.
  - Search placeholder: `"Search by name"`, `aria-label`: `"Search family members by name"`.
  - Empty search: `"No family members match “${searchQuery}”."`
  - Patient row summary: `"Played today · ${min} min"`, `"No session today"`, `"All medicines confirmed"`, `"${missed} of ${total} medicines not confirmed"`, `"${count} to look at"`, `"${count} new message(s)"`.
  - Batch actions: `"Select all (${count})"`, `"Delete chosen (${count})"`.
  - Care overview card: `"Care overview"`, `"A quick read"`, `"Everyone in your care is sorted by what needs you first."`, `"Offline devices"`, `"New messages"`, `"Needs attention"`, `"Played today"`, `"Add another patient"`.
  - Deletion Dialog: `"Delete ${name}"`, `"Delete ${count} patients"`, `"Are you sure you want to permanently delete..."`, `"This action is immediate and cannot be undone."`, `"Cancel"`, `"Delete completely"`, `"Deleting…"`.

---

### 3.5 Core Clinical & Engagement Pages (`web/src/pages/`)

#### `web/src/pages/dashboard/Dashboard.tsx` (Today View)
- **Header:** Title: `"${firstName}’s day"` or `"Today"`. Eyebrow: formatted date (`formatDayLong(today)`). Subtitle: `"What has happened so far, and what is still to come. Everything here comes from the tablet — nothing is inferred."`
- **Device Health Banner:** Warning notice with `DEVICE_HEALTH_COPY[health].label` and `detail`, link: `"Check the tablet"`.
- **Flag Section:** `aria-label`: `"Things to look at"`.
- **Stat Tiles:**
  - Tile 1: `"Medicines"` — detail: `"Nothing scheduled for today."` | `"All confirmed. Nothing needed from you."` | `"${count} not confirmed yet."`
  - Tile 2: `"Time together"` — value: `"${min} min"` | `"None yet"` — detail: `"${sessions} session(s) on the tablet."` | `"They have not opened the tablet today."`
  - Tile 3: `"Messages"` — value: count — detail: `"Waiting for you to listen."` | `"Nothing new since you last looked."`
- **Medicines Card:** Title: `"Medicines today"`, link: `"Manage"`. Empty state: `"No medicines set up"`, description: `"Add their medicines and Smriti will chime at the right hour, in their language."`, button: `"Add a medicine"`. Footer note: `"Times shown are when Smriti will chime. Whether each was confirmed rolls up into the count above."`
- **Routine Card:** Title: `"Their routine"`, link: `"Manage"`. Empty state: `"No routine yet"`, description: `"Tea at seven, a walk at half five — the small anchors of their day. The tablet shows these back to them."`, button: `"Add a routine item"`. Footer note: `"Ticks show what the hour has passed, not what they confirmed."`
- **Latest Memo Card:** Header: `"New from ${firstName}"`, fallback: `"A voice message is waiting."`, subtext: `"Recorded ${timeAgo}"`, button: `"Listen"`.
- **Sync Footer:** `"Last synced from the tablet ${timeAgo}."`

#### `web/src/pages/trends/Trends.tsx`
- **Header:** Eyebrow: `"Trends"`, Title: `"How things are moving"`, Subtitle: `"Smriti compares them against their own past, never against anyone else. Everything below is a change in a pattern — it is not a diagnosis, and there are many ordinary reasons for one."`
- **Controls:** Range tabs: `"30 days"`, `"90 days"`.
- **Empty State:** Title: `"Nothing to chart yet"`, description: `"Trends need a couple of weeks of sessions before they mean anything. Once they have been playing for a while, this page fills in on its own."`
- **Accuracy Chart Frame:** Title: `"How often they get it right"`, reading: `"Each point is a day; the darker line is a seven-day average, which is the one worth reading. Single days bounce around for reasons that have nothing to do with anything."`
  - Legend items: `"That day"`, `"Seven-day average"`, `"Where Smriti sees a change"`.
  - Accessible table headers: `['Day', 'Correct', '7-day average']`.
- **Domain Breakdown:** Title: `"By area of thinking"`, description: `"Five separate small charts rather than five lines on one, because the question is whether any single one is drifting — not which is highest."` Empty state: `"No per-area data yet"`, description: `"These fill in once they have played a few sessions across the different games."`
- **Domain Sparkcards:** `DOMAIN_LABEL` (`"Memory"`, `"Attention"`, `"Planning"`, `"Space & shapes"`, `"Words"`), delta: `"+X pts"`, tooltip: `"${percent}% correct"`.
- **Future Roadmap Callout:** Title: `"Coming to this page"`, notice: `"These need analysis views that are still being built. They are laid out here so you can see the shape of the finished page — nothing is being hidden from you."`
  - Card 1: `"Who they recognise, over time"` — `"A line per person in their circle, showing how readily they place each face. The most human signal Smriti has, and the one families ask for first."`
  - Card 2: `"How much they keep between sessions"` — `"Whether something learned on Monday is still there on Thursday. A better early signal than a single day's score."`
  - Card 3: `"Time of day"` — `"Whether their afternoons and evenings run differently from their mornings — the pattern behind what families call sundowning."`
  - Badge: `"Not available yet"`.

#### `web/src/pages/engagement/Engagement.tsx`
- **Header:** Eyebrow: `"Engagement"`, Title: `"Is Smriti actually being used?"`, Subtitle: `"Whether they are opening the tablet, and whether the medicines are getting taken. Two different questions — a bad week at one does not mean a bad week at the other."`
- **Controls:** Range tabs: `"30 days"`, `"90 days"`.
- **Summary Metrics:**
  - `"Days with a session"`: `"${played}/${total}"`, `"${percent}% of days in this period."` | `"No days in range."`
  - `"Time on the tablet"`: `"${min} min"`, `"Across ${sessions} session(s)."`
  - `"Left partway through"`: count, `"They finished everything they started."` | `"Sessions they started and did not finish."`
  - `"Medicines confirmed"`: percent, `"Nothing has been scheduled in this period."` | `"${confirmed} of ${scheduled} doses."`
- **Adherence Chart Frame:** Title: `"How each dose was confirmed"`, reading: `"Confirmed on the tablet is the quiet path. Confirmed after a call means Smriti had to reach someone — a few is normal, a rising run is worth a conversation about the reminder time."`
  - Legend items: `"On tablet"`, `"After a call"`, `"Not confirmed"`.
  - Accessible table headers: `['Week of', 'On tablet', 'After a call', 'Not confirmed']`.
- **Weekly Minutes Chart Frame:** Title: `"Minutes on the tablet, by week"`, reading: `"Total time each week. Steady matters more than high — twenty minutes most days beats an hour on a Sunday."`
- **Calendar Heatmap:** Title: `"Every day at a glance"`, reading: `"One square per day, darker for a longer session. The gaps are as informative as the colour."`, labels: `"No session"`, `"Less"`, `"More"`.

#### `web/src/pages/messages/Messages.tsx`
- **Header:** Eyebrow: `"Messages"`, Title: `"From ${firstName}"`, Subtitle: `"${unreadCount} you have not listened to yet."` | `"Voice notes and memories recorded on the tablet. The newest are first."`
- **Empty State:** Title: `"Nothing recorded yet"`, description: `"When ${firstName} answers a check-in or Smriti asks them about a photograph, what they say lands here. It usually takes a few days before the first one arrives."`
- **Memo Row:**
  - Context badges (`MEMO_TAG_COPY`): `"A memory"`, `"Check-in"`, `"A message for you"`, `"Answering a prompt"`.
  - Status badges: `"New"`.
  - Fallback text: `"No transcript for this one — press play to hear it."`
  - Dynamic status: `"Fetching the audio…"`.
  - Playback errors: `"That recording could not be loaded. It may have been removed."`, `"The recording loaded, but playback could not begin. It is still marked unread."`, `"The recording is playing, but Smriti could not mark it as read. Try again later."`
  - Role indicator: `"View-only access: listening will not change its unread status."`
- **Controls `aria-label`:** `"Play this message"`, `"Pause"`.

#### `web/src/pages/report/Report.tsx`
- **Header:** Eyebrow: `"Report"`, Title: `"Something to take to the doctor"`, Subtitle: `"A single page covering the period you choose — routines kept, medicines confirmed, what has changed, and the questions worth asking at the next appointment."`
- **Report Card:** Title: `"Generate a report"`, description: `"Covering ${name}. Shareable with siblings and with their doctor — it contains no game scores out of context, only patterns and dates."`, range tabs: `"1 month"`, `"3 months"`, `"6 months"`.
- **PDF State Notice:** Button: `"PDF report unavailable"`, warning notice: `"PDF report generation is not switched on yet. The figures below are live and use the selected calendar period; no report request will be sent."`
- **Preview Summary:** Title: `"What the report will say"`, description: `"These come straight from the tablet, for the period selected above. You can read them out at an appointment today."`
  - Medicines preview: percent adherence, `"${confirmed} of ${scheduled} doses confirmed. ${viaCall} needed a phone call."` | `"Nothing scheduled in this period."`
  - Sessions preview: `"${played}/${total} days"`, `"${min} minutes in total."`, `"Answers correct ${percent}% of the time on average."`

#### `web/src/pages/care-guide/CareGuide.tsx`
- **Header:** Eyebrow: `"Care guide"`, Title: `"How to read all this"`, Subtitle: `"Short, plain answers to the questions families ask us most — about what Smriti is telling you, and about looking after ${firstName} from wherever you are."`
- **Medical Disclaimer Notice:** `"Nothing here is medical advice, and Smriti does not diagnose anything. If you are worried about their health, speak to their doctor — and take the Report page with you."`
- **Article Accordion Sections:**
  1. `"What Smriti can and cannot tell you"` (comparisons against own past, not a diagnosis, early trend indicator).
  2. `"When something is flagged"` (examining evidence, eliminating ordinary causes, taking reports to doctors).
  3. `"Getting the reminders right"` (attaching to anchors, reminder windows, adjusting times before escalating).
  4. `"Talking to them about it"` (preserving trust, transparency, consent).
  5. `"Looking after yourself"` (flags prevent constant app checking, sharing with siblings, caring from a distance).
- **Contact Card:** Title: `"Still stuck?"`, description: `"There is a real person on the other end of this. If something on any of these screens does not make sense, or you are not sure what to do about a flag, get in touch and we will look at it with you."`

---

### 3.6 Care Management Subpages & Modals (`web/src/pages/manage/`)

#### `web/src/pages/manage/People.tsx` & `web/src/features/people/PersonForm.tsx`
- **Header:** Eyebrow: `"Manage"`, Title: `"People"`, Subtitle: `"The faces and voices ${firstName} sees on the tablet. These are what the recognition games are built from, so it is worth keeping them current."`, button: `"Add someone"`.
- **Permissions Notice:** `"You have view-only access to this profile. Ask whoever set it up if you need to change anything here."`
- **Empty State:** Title: `"Nobody added yet"`, description: `"The tablet needs at least one familiar face before it can ask ${firstName} about anyone."`, button: `"Add the first person"`.
- **Card Status Badges:** `"Passed away"`, `"Voice recorded"`.
- **Actions `aria-label`:** `"Edit ${person.name}"`, `"Remove ${person.name}"`.
- **Removal Dialog:** Title: `"Remove ${name}?"`, description: `"Their photograph and voice will stop appearing on the tablet, and ${firstName} will not be asked about them again. Sessions they have already played are unaffected."`, buttons: `"Keep them"`, `"Remove"`, `"Removing…"`.
- **Person Form (`PersonForm.tsx`):**
  - Section headers: `"Add someone"`, `"Edit ${name}"`.
  - Fields: `"Photo *"`, `"Name"` (placeholder: `"Divya"`), `"Relationship"` (placeholder: `"Daughter"`, hint: `"As they would say it."`), `"One thing to remember them by"` (placeholder: `"Divya calls every Sunday evening from Seattle."`, hint: `"Smriti uses this to start a conversation about them. A detail, not a biography."`), `"Their voice"`.
  - Deceased Switch: `"This person has passed away"`, hint: `"Please set this if it applies. Smriti will still show their photograph and talk about them warmly, but it will never ask them where they are or when they are coming."`
  - Validation: `"A first name is enough"`, `"What is their relationship to the patient?"`, `"A photo is needed — the tablet shows the face"`.
  - Buttons: `"Add this person"`, `"Save changes"`, `"Saving…"`, `"Cancel"`.

#### `web/src/pages/manage/Medicines.tsx`, `MedicineForm.tsx`, & `OcrReview.tsx`
- **Header:** Eyebrow: `"Manage"`, Title: `"Medicines"`, Subtitle: `"A gentle chime at their hour, in their language. If they do not respond, Smriti waits, chimes again, and only then calls you — one call covering everything due, never one per pill."`, buttons: `"Scan prescription"`, `"Add a medicine"`.
- **Caregiver Notice:** `"Scan a printed or handwritten prescription photo or PDF, then check every medicine before it reaches the tablet."`
- **Time Slots:** Section headers: `"Morning"`, `"Afternoon"`, `"Evening"`, `"Night"`.
- **Empty State:** Title: `"No medicines yet"`, description: `"Add the ones that matter most first, one at a time."`, buttons: `"Add by hand"`, `"Scan prescription"`.
- **Removal Dialog:** Title: `"Stop reminding about ${med.name}?"`, description: `"The chime stops and no more calls will be placed about this one. The record of doses already taken stays intact, so your reports do not change retrospectively."`, buttons: `"Keep it"`, `"Stop reminders"`, `"Stopping…"`.
- **Prescription OCR Review (`OcrReview.tsx`):**
  - Title: `"Read a prescription"`, description: `"Upload a clear photo or PDF of a printed or handwritten prescription. Smriti will pull out what it can, and you check every line before anything is saved."`, button: `"Close"`.
  - File picker button: `"Scan a photo or PDF"`, `"Reading…"`.
  - Safety Warning: `"Nothing here is scheduled yet. Smriti will not remind anyone about any of these until you have ticked every line individually. Check each one against the original prescription — the name, the dose, and the time Smriti proposes."`
  - Empty lines warning: `"No medicine lines were found. Try a clearer photo or PDF, or add the medicines by hand."`, button: `"Choose another file"`.
  - Confidence Badges (`CONFIDENCE_COPY`):
    - `high`: `"Clear"`, help: `"Read cleanly. Check it against the printed line anyway."`
    - `low`: `"Unclear"`, help: `"Some of this was hard to read. Compare every word with the prescription."`
    - `unrecognized`: `"Could not read"`, help: `"Almost none of this line was legible. Type it in yourself."`
    - Percentage label: `"${percent}% sure"`.
  - Form Fields: `"Medicine"` (placeholder: `"Type it in"`), `"Dose"` (placeholder: `"Type it in"`).
  - Proposal Copy: `"Smriti will chime at ${chosenTime}, ${days}, anywhere between ${windowStart} and ${windowEnd}."`, toggle: `"Change the time"` / `"Done"`.
  - Multiple Doses Warning: `"This line looks like ${dosesPerDay} doses a day, and Smriti can only propose one time per line. Save this one, then add the other ${dosesPerDay - 1} by hand — otherwise they will only be reminded once."`
  - Inline Pill Photo/Audio: `"Add this pill’s photo and voice reminder"`, prompt: `"Say the medicine’s name and what it is for, in their language. The tablet plays this with the reminder."`
  - Checkbox Confirmation: `"I have compared this line with the original prescription."` / `"Checked against the prescription."`
  - Submit Bar: Button: `"Save ${count} medicine(s)"`, progress status: `"Every line has been checked."` | `"${count} line(s) still to check."`, warning: `"${count} line(s) will not be saved — they still need a name, dose, and at least one day. Complete them, or discard them."`

#### `web/src/pages/manage/Routine.tsx` & `web/src/features/routine/RoutineForm.tsx`
- **Header:** Eyebrow: `"Manage"`, Title: `"Their routine"`, Subtitle: `"The small anchors of ${firstName}'s day. The tablet shows these back to them as a picture of what is coming — most families say it is the part they like best."`, button: `"Add to their day"`.
- **Scope Distinction Notice:** `"Routine items are for orientation, not reminders. They do not chime and they never trigger a phone call — anything that must not be missed belongs on the Medicines page."`
- **Empty State:** Title: `"Their day is empty"`, description: `"Three or four anchors is plenty — morning tea, lunch, a walk, bedtime. Enough that the day has a shape."`, button: `"Add the first one"`.
- **Routine Icons (`ROUTINE_ICON_LABEL`):** `"Tea or coffee"`, `"A meal"`, `"A walk"`, `"A phone call"`, `"Bath"`, `"Prayer"`, `"Rest"`, `"Exercise"`, `"A visitor"`, `"Bedtime"`.
- **Actions `aria-label`:** `"Edit ${item.label_key}"`, `"Remove ${item.label_key}"`.

#### `web/src/pages/manage/Alerts.tsx` & `web/src/features/escalation/useEscalationConfig.ts`
- **Header:** Eyebrow: `"Manage"`, Title: `"If a dose is missed"`, Subtitle: `"What Smriti does when ${firstName} does not respond to a reminder. It waits before it escalates, and one call covers everything due — never one call per pill."`
- **Read-Only Ladder Section:** Title: `"What happens, in order"`.
  - Step items: `"On time"` → `"The tablet chimes, in their language."`
  - Follow-up steps: `"+${min} min"` → `"If there is still no response, Smriti sends ${CHANNEL_COPY[channel]}."`
  - Channel descriptions (`CHANNEL_COPY`): `"a second chime on the tablet"`, `"a phone call to your contacts"`, `"a text message to your contacts"`, `"a text message to the primary contact"`, `"a text message to the secondary contact"`, `"an automatic safety check"`.
  - Clinical Immutability Notice: `"These timings are set by Smriti and cannot be changed here. They are what the missed-dose safety net is built on — stretching them out would quietly switch it off. If they genuinely do not suit them, get in touch and we will look at it with you."`
- **Editable Contacts Section:** Title: `"Who Smriti calls"`, Subtitle: `"Real phone calls, placed only after the tablet has already tried twice. Keep these current — an unanswered number is the same as no safety net."`
  - Card 1: `"First call"`, fields: `"Name"`, `"Phone"`.
  - Card 2: `"If that call is not answered"`, hint: `"Ideally someone who lives close enough to walk over."`, fields: `"Name"`, `"Phone"`.
  - Actions: `"Save contacts"`, `"Saving…"`, confirmation: `"Saved."`.

#### `web/src/pages/manage/Access.tsx` & `web/src/features/access/useMembers.ts`
- **Header:** Eyebrow: `"Manage"`, Title: `"Who can access this"`, Subtitle: `"Everyone here can see ${firstName}'s day, their trends and their messages. Only caregivers can change their medicines, people and routine."`
- **Role Cards (`ROLE_COPY`):**
  - `caregiver`: Label: `"Caregiver"`, description: `"Can change medicines, people, routine and alerts, and can invite others."`
  - `family_viewer`: Label: `"Family"`, description: `"Can see everything — today, trends, reports, messages — and change nothing."`
  - `health_worker`: Label: `"Health worker"`, description: `"Can see the reports and trends shared with them for clinical review."`
  - Badges: `"You"`.
  - Join date: `"Added ${formatDayShort(date)}"`.
- **Invite Form:**
  - Title: `"Add an existing Smriti user"`, description: `"This does not send a text or email. Use the number they already used to sign in to Smriti; access is added only to that existing account."`
  - Fields: `"Their mobile number"` (placeholder: `"+91 98765 43210"`), `"What they can do"` (select options: `"Family — can see everything"`, `"Caregiver — can also make changes"`).
  - Button: `"Add access"`, `"Adding…"`.
  - Feedback notices:
    - `"Nobody has signed up with ${phone} yet. Ask them to sign in to Smriti with that number once, then invite them again — they have not been given access yet."`
    - `"Added. They will see ${firstName} the next time they open Smriti."`
- **Permission Guard:** `"Only a caregiver can add people to this profile. Ask whoever set it up."`

#### `web/src/pages/manage/Device.tsx`, `PairingPanel.tsx`, & `VoicebotStatusCard.tsx`
- **Header:** Eyebrow: `"Manage"`, Title: `"The tablet"`, Subtitle: `"Whether ${firstName}'s tablet is reaching Smriti, and what it is currently running. Everything you see anywhere else in this app came through here."`, button: `"Check now"`.
- **Device Health Status Card:**
  - Status labels & details from `DEVICE_HEALTH_COPY`:
    - `ok`: `"Connected"` — `"The tablet is syncing normally."`
    - `stale`: `"Not synced today"` — `"Nothing has come through for over a day. What you're seeing may be out of date."`
    - `offline`: `"Offline"` — `"Nothing has come through for more than three days. Someone should check the tablet."`
    - `paired`: `"Paired"` — `"The tablet is connected and waiting for its first sync."`
    - `never`: `"Not paired yet"` — `"No tablet has connected to this profile."`
  - Timestamp: `"Last heard from ${timeAgo}."`
  - Telemetry Details: `"App version"`, `"Awaiting first sync"`, `"Content version"`, `"Waiting to upload"` (`"${count} event(s)"`), `"Clock difference"` (`"${sec}s"`).
  - Offline Advice Notice: `"Local scheduled reminders and chimes continue on the tablet while it is offline. Sync, remote visibility, and escalation updates stop until it reconnects, so the Today, Trends and Engagement pages may be out of date. Usually it is the charger or the wifi."`
  - Queue Notice: `"The tablet has ${count} thing(s) it has not managed to send yet. It will catch up on its own once it has a connection — nothing is lost in the meantime."`
- **Pairing Panel (`PairingPanel.tsx`):**
  - Title: `"Connect ${patientName}’s tablet"`
  - Description: `"Open Smriti on the tablet and choose Connect to my family. Then either point its camera at this code, or read the letters out to whoever is sitting with it."`
  - Button: `"Generate a pairing code"`, `"Generating…"`, `"Generate a new code"`.
  - Alternate instructions: `"Or read this out"`.
  - Expiry notices: `"Expires in ${countdown}. Codes are single-use."`, `"This code has expired. Codes last thirty minutes so a photograph of one cannot be used later — generate a fresh one and try again."`
- **Voice Assistant Status (`VoicebotStatusCard.tsx` & `voicebotStatusPresentation.ts`):**
  - Title: `"Voice Assistant"`
  - Status Headings & Descriptions:
    - `ready`: `"Ready on the tablet"` — `"The voice assistant has the latest approved people, medicines and routines."`
    - `pending`: `"Getting ready"` — `"Smriti is preparing the approved information for the tablet."`
    - `syncing`: `"Updating the assistant"` — `"The latest approved information is being sent safely."`
    - `error`: `"Needs another try"` — `"The tablet assistant could not update. Your care information is still saved normally."`
    - `unavailable`: `"Temporarily unavailable"` — `"The voice assistant is unavailable. Tablet reminders and all other care features continue."`
    - `default`: `"Not turned on"` — `"Turn this on only when you want the connected tablet to use the voice assistant."`
  - Actions: `"Turn on"`, `"Turn off"`, `"Try again"`.
  - Asynchronous Poll Notice: `"This page checks again automatically while it is getting ready."`
  - Safety Boundary Notice:
    - Ready: `"Available for ${Hindi/English} after the tablet integration is enabled."`
    - Unready: `"Language voice support has not been accepted for live use yet. Existing tablet reminders and care features are unchanged."`
  - Permission guard: `"Voice Assistant settings are available to caregivers only. Conversations and voice recordings stay private to the tablet."`

---

### 3.7 Shared Media & UI Feedback Components

#### `web/src/components/media/VoiceRecorder.tsx`
- **Static UI Text:** `"Record"`, `"Record again"`, `"Saved"`, `"Remove"`, `"Uploading…"`.
- **Dynamic Format:** `"Stop · ${formatDuration(elapsed)}"`.
- **Error Messages:**
  - Microphone access: `"Smriti could not reach your microphone. Check the browser has permission, then try again."`
  - Upload failure: `"That clip did not upload: ${error.message}"`.

#### `web/src/components/media/PhotoPicker.tsx`
- **Static UI Text:** `"Saved"`, `"Remove"`, `"Uploading…"`.
- **Dynamic Button Text:** `"Add a ${label}"` / `"Choose a ${label}"` / `"Change ${label}"`.
- **Fallback Hint:** `"A clear photo of their face. We shrink it before sending, so the tablet loads it fast."`
- **Error Message:** `"That photo did not upload: ${error.message}"`.

#### `web/src/components/ui/feedback.tsx`
- **`ErrorState`:**
  - Permission: `"You don't have access to this"` — `"Ask whoever set up this profile to add you, or check you are signed in with the right number."`
  - Technical error: `"This didn't load"`, button: `"Try again"`.

---

## 4. Factual Capability Matrix by Surface

> [!IMPORTANT]
> **Core Architectural Rule:** Never claim a language is voice-capable merely because its web UI is translated.

| Language | Code | Caregiver Web UI (Target) | Patient / Tablet Language (`patients.lang_code`) | Telephony Escalation (`escalation-worker`) | VoiceBot Gateway Speech (`voicebot_gateway`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **English** | `en` | **Full Support** (Source catalogue) | **Supported** ([languages.ts:L11](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L11)) | Pre-recorded audio + DTMF keypad fallback ([escalation-worker/index.ts:L286](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L286)) | **Supported** (`en` maps to `eng`, [voicebot_gateway_handler.ts:L20](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L20)) |
| **Hindi** | `hi` | **Full Support** (Target catalogue) | **Supported** ([languages.ts:L2](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L2)) | **Conversational voice** ([escalation-worker/index.ts:L51](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L51)) | **Supported** (`hi` maps to `hin`, [voicebot_gateway_handler.ts:L20](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L20)) |
| **Assamese** | `as` | **Full Support** (Target catalogue) | **Supported** ([languages.ts:L4](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L4)) | **Conversational voice with DTMF fallback** ([escalation-worker/index.ts:L51](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L51), [L260-L265](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L260-L265)) | **Unsupported** (Throws `UNSUPPORTED_LANGUAGE`, [voicebot_gateway_handler.ts:L107](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L107), [L121](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L121)) |
| **Meiteilon** | `mni` | **Full Support** (Target catalogue) | **Supported** ([languages.ts:L8](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L8)) | Pre-recorded audio + DTMF keypad fallback ([escalation-worker/index.ts:L286](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L286)) | **Unsupported** (Throws `UNSUPPORTED_LANGUAGE`, [voicebot_gateway_handler.ts:L107](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L107), [L121](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L121)) |
| **Bodo** | `brx` | **Pending** (not selectable until a complete static catalogue is generated) | **Absent** from `SUPPORTED_LANGUAGES` ([languages.ts:L1-L12](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L1-L12)) | Pre-recorded audio + DTMF keypad fallback ([escalation-worker/index.ts:L286](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L286)) | **Unsupported** (Throws `UNSUPPORTED_LANGUAGE`, [voicebot_gateway_handler.ts:L107](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L107), [L121](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L121)) |
| **Khasi** | `kha` | **Full Support** (Target catalogue) | **Supported** ([languages.ts:L9](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L9)) | Pre-recorded audio + DTMF keypad fallback ([escalation-worker/index.ts:L286](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L286)) | **Unsupported** (Throws `UNSUPPORTED_LANGUAGE`, [voicebot_gateway_handler.ts:L107](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L107), [L121](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L121)) |
| **Mizo** | `lus` | Out of scope for caregiver UI | **Supported** ([languages.ts:L10](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L10)) | Pre-recorded audio + DTMF keypad fallback ([escalation-worker/index.ts:L286](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L286)) | **Unsupported** (Throws `UNSUPPORTED_LANGUAGE`, [voicebot_gateway_handler.ts:L107](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L107), [L121](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L121)) |

### Exact Repository Citations:
1. **Patient Language Definitions ([web/src/lib/languages.ts:L1-L12](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts#L1-L12)):**
   ```typescript
   export const SUPPORTED_LANGUAGES = [
     { code: 'hi', label: 'Hindi', delivery: 'Conversational voice' },
     { code: 'as', label: 'Assamese', delivery: 'Conversational voice; recorded audio or keypad fallback' },
     { code: 'mni', label: 'Meiteilon', delivery: 'Recorded audio and keypad responses' },
     { code: 'kha', label: 'Khasi', delivery: 'Recorded audio and keypad responses' },
     { code: 'lus', label: 'Mizo', delivery: 'Recorded audio and keypad responses' },
     { code: 'en', label: 'English', delivery: 'Recorded audio and keypad responses' },
   ] as const
   ```
2. **Escalation Worker Dispatch ([supabase/functions/escalation-worker/index.ts:L51](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L51), [L257-L290](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/escalation-worker/index.ts#L257-L290)):**
   ```typescript
   const CONVERSATIONAL_LANGUAGES = new Set(['hi', 'as']);
   // ...
   if (CONVERSATIONAL_LANGUAGES.has(patient.lang_code)) {
     // places conversational call via Vapi; if 'as' and provider fails, falls back to DTMF via Twilio
   }
   const plan = await dtmfPlan(admin, patient, due, escalation, to);
   // all other languages execute dtmfPlan via Twilio
   ```
3. **VoiceBot Gateway Language Mapping ([supabase/functions/_shared/voicebot_gateway_handler.ts:L20](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L20), [L107](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L107), [L121](file:///Users/aditsingh/Documents/repos/SMRITI/supabase/functions/_shared/voicebot_gateway_handler.ts#L121)):**
   ```typescript
   const language = (value: unknown, patientLanguage: string) =>
     ({ en: "eng", hi: "hin" } as Record<string, string>)[patientLanguage] === value ? value as string : null;
   // ...
   const code = language(get("language"), state.patientLanguage);
   if (!code) return failure(requestId, "UNSUPPORTED_LANGUAGE");
   ```

---

## 5. BHASHINI Provider Status & Security Boundary

### 5.1 Credential & Capability Status
No BHASHINI API credentials are configured in this environment, and no live capability test has been executed. In accordance with strict engineering standards, language-pair availability is classified factually:

| Language Pair | Claimed Offline Spec | Production Live Status |
| :--- | :--- | :--- |
| `en` ↔ `hi` | Listed in specs | **UNVERIFIED — requires approved credential and live capability test** |
| `en` ↔ `as` | Listed in specs | **UNVERIFIED — requires approved credential and live capability test** |
| `en` ↔ `mni` | Script ambiguity (Bengali vs. Meitei Mayek) | **UNVERIFIED — requires approved credential and live capability test** |
| `en` ↔ `brx` | Listed in specs | **UNVERIFIED — requires approved credential and live capability test** |
| `en` ↔ `kha` | Latin script | **UNVERIFIED — requires approved credential and live capability test** |

### 5.2 Architectural Rules for BHASHINI
1. **Never in Browser:** No `VITE_BHASHINI_*` variables, browser requests, or client-side proxies.
2. **Never for Stored Data:** Do not pass patient names, medicines, prescriptions, notes, or transcripts to external translation APIs.
3. **Drafting Only (Work Package LI-03):** If approved credentials are provided, they will be executed purely via local offline developer scripts to produce draft translation files for native human review.
4. **Zero Runtime Dependency:** The web application will serve pre-compiled TypeScript catalogues independently of provider availability.

---

## 6. Flutter / Tablet Developer Decisions Required Before LI-04

Modifying patient-facing metadata in [web/src/pages/patients/CreatePatient.tsx](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/pages/patients/CreatePatient.tsx) or [web/src/lib/languages.ts](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts) is deferred to **Work Package LI-04**. The following explicit decisions are required from the Flutter/tablet app owner prior to commencing LI-04:

1. **Meiteilon / Manipuri (`mni`):**
   - **Script Selection:** Which script does the Flutter tablet application render and bundle fonts for?
     - *Bengali / Eastern Nagari script* (commonly read by current elder generation).
     - *Meitei Mayek script* (indigenous official state script).
   - **Database RPC Contract:** Does `patients.script` need to be explicitly passed during `create_patient` RPC calls, or does the tablet derive it from `lang_code = 'mni'` and `lang_pack_version`?
2. **Bodo (`brx`):**
   - **Tablet Asset Pack:** Does a tablet offline asset pack exist for Bodo?
   - **Schema & Client Compatibility:** `brx` is absent from [web/src/lib/languages.ts](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/lib/languages.ts). Confirm that the Flutter Drift database, sync worker, and audio engine accept `lang_code: 'brx'` without runtime exceptions before it is added to the web UI creation dropdown.
   - **Script:** Confirm that standard Devanagari script is expected for Bodo tablet UI.

---

## 7. Next Eligible Work Package

Following review and acceptance of Work Package **LI-00**:

- **Next Work Package:** **LI-01 (Localisation Foundation)**
- **Scope of LI-01:**
  1. Establish dependency-free i18n infrastructure under `web/src/i18n/`:
     - `config.ts`: Supported locales (`en`, `hi`, `as`, `mni`, `brx`, `kha`), directionality (all LTR), fallback logic.
     - `keys.ts`: Canonical typed translation key structure.
     - `locales/en.ts`: Complete source English translation catalogue.
     - `LocaleProvider.tsx`: Local storage persistence, HTML `lang` document attribute synchronization.
     - `useTranslation.ts`: Typed translation hook with parameter interpolation.
     - `format.ts`: `Intl.DateTimeFormat`, `Intl.NumberFormat`, and integer-minute formatting helpers.
  2. Mount `LocaleProvider` in [web/src/main.tsx](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/main.tsx) without altering router, auth, or query client bindings.
  3. Add the compact caregiver UI language switcher in [AppShell.tsx](file:///Users/aditsingh/Documents/repos/SMRITI/web/src/components/layout/AppShell.tsx) account menu.
  4. Localise core application shell, navigation items, account menu, and generic feedback dialogs into the source catalogue.

---

## 8. LI-02 Final Literal Audit (2026-09-19)

Sections 3–7 above preserve the original LI-00 discovery record. The final
LI-02 implementation pass extracted the active caregiver-web copy from the
Create Patient wizard (including reactive Zod validation), Dashboard, Trends,
Engagement, overview, route/role states, flags, shared media controls, chart
frames, and the public marketing surface. Chart titles, legends, accessible
tables, tooltips, range controls, empty states, status helpers, and form
placeholders now resolve through the typed `web/src/i18n/` catalogue.

At the close of LI-02, Hindi, Assamese, Manipuri, Bodo, and Khasi explicitly
referenced English source entries for newly extracted sections. Section 9
records the later LI-03 draft-generation state.

The final scan covered JSX text nodes, user-facing string attributes, template
literals, and capitalised TypeScript literals under `web/src/`. The only
intentional non-catalogue values remaining are:

- Product and cultural names: `Smriti`, `Smriti Care`, Northeast state names,
  and established textile/artwork terms such as `Gamosa`, `Moirang Phee`,
  `Ryndia`, `Puanchei`, `Naga shawl`, `Lepcha thara`, and `Risa`.
- Stored care data and local fixture records in `web/src/lib/mockData.ts`:
  patient/person names, relationships, medicine names/doses, routine labels,
  memory prompts, transcripts, phone numbers, dates, and media paths. The
  reviewer names in marketing stories are also content attribution, not UI.
- Technical contracts and diagnostics: database enums, routes, storage keys,
  API/RPC fields, UUIDs, pairing tokens, ISO/timezone identifiers, integer
  minute values, SVG data, CSS/font names, console-only fixture warnings, raw
  server/provider errors, and unused compatibility helpers covered by contract
  tests (`describeDays`/`timeAgo`).
- Patient/tablet language labels, delivery descriptions, and Voice Assistant
  language names in `web/src/lib/languages.ts` and
  `VoicebotStatusCard.tsx`. These describe existing patient-device capability;
  they are deliberately independent of the caregiver UI locale and remain
  unchanged until LI-04.
- Internal English time-slot enum values (`Morning`, `Afternoon`, `Evening`,
  `Night`) used only to select typed catalogue keys; rendered labels come from
  `format.*`.

No stored patient or clinical value is passed to a translation service or used
as a catalogue key. Dynamic care values are interpolated verbatim into catalogued
UI templates. LI-03 translation review and LI-04 Flutter/tablet work remain out
of scope.

---

## 9. LI-03 Generated Catalogue Status (2026-09-20)

The application owner authorised generated translations without a native-human
review gate. These catalogues are therefore complete generated drafts, not
claims of professional or native linguistic approval.

| Caregiver UI locale | Status | Script | Runtime availability |
| --- | --- | --- | --- |
| English (`en`) | Complete source catalogue | Latin | Available |
| Hindi (`hi`) | Complete generated static catalogue | Devanagari | Available |
| Assamese (`as`) | Complete generated static catalogue | Assamese/Bengali | Available |
| Meiteilon (`mni`) | Complete generated static catalogue | Meitei Mayek | Available |
| Khasi (`kha`) | Complete generated static catalogue | Latin | Available |
| Bodo (`brx`) | Pending English-to-Bodo NMT generation | Devanagari | Not selectable |

Only fixed English interface strings were sent for draft generation. No patient
record, name, medicine, dose, prescription, relationship, phone number, memory
prompt, transcript, recording, report content, identifier, or server payload
was submitted to a translation provider. Generated results are committed as
static TypeScript catalogues and the application has no runtime translation
request.

Automated catalogue checks verify that every available locale has the same 729
leaf strings as English, contains no empty entries, and preserves every named
interpolation placeholder. The few strings intentionally identical to English
are standard abbreviations, example names, or common borrowed UI words and are
enumerated in `web/tests/localisation.test.ts`.

The Meitei Mayek locale declares a `Noto Sans Meetei Mayek` font stack so its
glyphs do not depend solely on the caregiver device's system fonts.

The production build emits the static locale catalogues in a dedicated
`locale-catalogues` chunk. The chunk remains part of the offline precache, while
unrelated route bundles no longer carry the catalogue payload or trigger the
former 500 kB chunk-size warning.

The caregiver-locale selector is available before sign-in on both the welcome
navigation and the sign-in screen. It is a native keyboard-accessible select,
persists only the caregiver's browser preference, and does not read or mutate
patient/tablet language fields.

Automated localisation, type, lint, build, whitespace, and database-reset
checks are green. The remaining visual release check is intentionally recorded
as pending: this execution environment has no controllable browser surface, so
mobile-width, large-text, and screen-reader behaviour have not been represented
as a completed manual test. That limitation does not affect catalogue loading,
locale persistence, or patient-data invariance, all of which are covered by
automated checks.

Bodo remains outside `SUPPORTED_LOCALES`, so it cannot be selected and cannot
silently fall back to English. It can be enabled after an English-to-Bodo
Devanagari NMT catalogue is generated using approved BHASHINI access and passes
the same completeness and placeholder-integrity tests.

This work changes caregiver UI text only. It does not change patient-language
codes, tablet payloads, escalation behavior, Voice Assistant eligibility, or
any Flutter contract. LI-04 remains out of scope.
