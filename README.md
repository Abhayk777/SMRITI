<div align="center">

<img src=".github/assets/banner.svg" alt="Smriti — be close to their day, from wherever you are" width="100%"/>

<br/>

<a href="#-the-idea"><img src="https://img.shields.io/badge/elder_care-Northeast_India-BC5A3C?style=for-the-badge&labelColor=201E1D" alt="Elder care for Northeast India"/></a>
<a href="#-languages"><img src="https://img.shields.io/badge/languages-6_voice_·_5_UI-E8A83F?style=for-the-badge&labelColor=201E1D" alt="Languages"/></a>
<a href="#-security-model"><img src="https://img.shields.io/badge/auth-row_level_security-56633F?style=for-the-badge&labelColor=201E1D" alt="Row-level security"/></a>

<br/>

<img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=474238" alt="React 19"/>
<img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white&labelColor=474238" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&labelColor=474238" alt="Vite"/>
<img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white&labelColor=474238" alt="Tailwind CSS"/>
<img src="https://img.shields.io/badge/Supabase-Postgres_17-3ECF8E?logo=supabase&logoColor=white&labelColor=474238" alt="Supabase"/>
<img src="https://img.shields.io/badge/Deno-Edge_Functions-000000?logo=deno&logoColor=white&labelColor=474238" alt="Deno"/>
<img src="https://img.shields.io/badge/Twilio-voice_·_SMS-F22F46?logo=twilio&logoColor=white&labelColor=474238" alt="Twilio"/>
<img src="https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white&labelColor=474238" alt="PWA"/>

<br/><br/>

**[The idea](#-the-idea)** ·
**[Features](#-what-it-does)** ·
**[Architecture](#-architecture)** ·
**[Escalation](#-the-missed-dose-ladder)** ·
**[Data model](#-data-model)** ·
**[Security](#-security-model)** ·
**[Languages](#-languages)** ·
**[Getting started](#-getting-started)** ·
**[Project layout](#-project-layout)**

</div>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🪢 The idea

> _Smriti_ (स्मृति) means **memory**.

Many families in Northeast India live far from their ageing parents. Smriti is how they stay close. A tablet in the parent's home runs memory games, shows photos of family, and reminds them about medicine in their own language. On the other side, the family uses a caregiver web app that answers one question every morning: **is Ma okay today?**

The logo is **four strands woven into a knot**. Across the Northeast, handloom is how one generation hands memory to the next: the _mekhela_, the _gamosa_, the _puan_. The whole product is built on that idea: warm terracotta and cream, woven pattern bands, hill layers, and a sky that follows the parent's local time.

<table>
<tr>
<td width="33%" valign="top">

### 👵 For the parent

A Flutter tablet that works offline. Medicine alarms with recorded voice and a pill photo. Memory games. Faces of family with the voice of the person who recorded them.

</td>
<td width="33%" valign="top">

### 👨‍👩‍👧 For the family

A caregiver web app and PWA. A daily picture of routine, medicine and mood. Trends over weeks. Voice notes. Alerts only when something actually needs attention.

</td>
<td width="33%" valign="top">

### 🛟 For the bad day

If a dose is missed, Smriti escalates: a phone call in the parent's language, then SMS to family. A server-side watchdog checks that this still happens when the tablet itself is offline.

</td>
</tr>
</table>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## ✨ What it does

|     | Feature              | What the caregiver gets                                                                                                                                                         |
| :-: | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🏠  | **Today dashboard**  | Whether she played, took her medicine and was engaged today, computed in _her_ timezone rather than the viewer's                                                                |
| 📈  | **Trends**           | Cognitive-domain trajectories as small multiples, plus change-point flags (`decline`, `engagement_drop`, `adherence_drop`, `device_offline`)                                    |
| 📑  | **Deep report**      | A report page with seven sections, built on `daily_*` report views and never on raw events                                                                                      |
| 📅  | **Engagement**       | Calendar heatmap and adherence over time                                                                                                                                        |
| 💊  | **Medicines**        | Dose windows set on a slider, a pill photo and a recorded voice prompt for each medicine                                                                                        |
| 📸  | **Prescription OCR** | Photograph a prescription and it proposes medicines to add. Names are matched against a catalogue of Indian medicines, and you tick every row yourself before anything is saved |
| 🧑‍🤝‍🧑  | **People**           | Family photos, voices and memory prompts that the tablet shows in its recognition games                                                                                         |
| 🗓️  | **Routine**          | The daily routine, shown on the tablet                                                                                                                                          |
| 🎙️  | **Messages**         | Voice memos from the parent, with transcripts and read state                                                                                                                    |
| 🔔  | **Alerts**           | Primary and secondary contacts for the escalation ladder                                                                                                                        |
| 🔐  | **Access**           | Invite siblings as `caregiver` or as read-only `family_viewer`                                                                                                                  |
| 📟  | **Tablet**           | Pairing by QR code or short code, with live heartbeat and sync status                                                                                                           |
| 🗣️  | **VoiceBot**         | An opt-in conversational voice agent for each patient, synced through a queued worker                                                                                           |
| 🌐  | **Localised UI**     | Caregiver interface in English, Hindi, Assamese, Meiteilon (Meetei Mayek) and Khasi                                                                                             |
| 🌗  | **Their sky**        | The app's backdrop follows day and night at the parent's location                                                                                                               |

<details>
<summary><b>🧭 Every route in the web app</b> (click to expand)</summary>

<br/>

| Route                      | Page                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                        | Marketing site when signed out; when signed in, goes to the dashboard or the patient overview depending on how many patients you have |
| `/auth`                    | Phone OTP · Google sign-in                                                                                                            |
| `/patients`                | Overview (only shown when there is more than one patient)                                                                             |
| `/patients/new`            | Create a patient + setup wizard                                                                                                       |
| `/p/:pid/dashboard`        | _"Is Ma okay today?"_                                                                                                                 |
| `/p/:pid/trends`           | Domain trajectories and flags                                                                                                         |
| `/p/:pid/report`           | The deep report                                                                                                                       |
| `/p/:pid/engagement`       | Heatmap and adherence                                                                                                                 |
| `/p/:pid/messages`         | Voice memo inbox                                                                                                                      |
| `/p/:pid/manage/people`    | Family faces and voices                                                                                                               |
| `/p/:pid/manage/medicines` | Medicines and OCR                                                                                                                     |
| `/p/:pid/manage/routine`   | Daily routine                                                                                                                         |
| `/p/:pid/manage/alerts`    | Escalation contacts                                                                                                                   |
| `/p/:pid/manage/access`    | Invite family                                                                                                                         |
| `/p/:pid/manage/device`    | Pairing and sync                                                                                                                      |
| `/p/:pid/care-guide`       | Care guide                                                                                                                            |

The patient id always lives in the URL. This keeps pages bookmarkable, and it is also a safety guard against showing one patient's data on another patient's screen.

</details>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🏛 Architecture

There is **no custom REST server**. Postgres _is_ the API: PostgREST generates CRUD endpoints from the schema, and row-level security is the entire authorisation layer. The only hand-written HTTP endpoints are Deno Edge Functions.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F5EAD8','primaryBorderColor':'#BC5A3C','primaryTextColor':'#201E1D','lineColor':'#8C491A','secondaryColor':'#F0FAE1','tertiaryColor':'#FFF2EB','fontFamily':'Segoe UI, Helvetica, sans-serif'}}}%%
flowchart LR
    subgraph HOME["🏠 Parent's home"]
        TAB["📱 Elder tablet<br/><i>Flutter · SQLite · offline-first</i>"]
    end

    subgraph FAMILY["👨‍👩‍👧 Family, anywhere"]
        WEB["💻 Caregiver web · PWA<br/><i>React 19 · Vite · TanStack Query</i>"]
    end

    subgraph SUPA["☁️ Supabase · ap-south-1"]
        direction TB
        PG[("🐘 Postgres 17<br/>RLS · triggers · views")]
        RT["⚡ Realtime"]
        ST["🗂 Storage<br/>patient-media · patient-memos · lang-packs"]
        CRON["⏰ pg_cron"]
        subgraph EF["🦕 Edge Functions"]
            PAIR["pairing ×3"]
            ESC["escalation-worker"]
            WD["watchdog"]
            TW["twilio-webhook"]
            OCR["ocr-prescription"]
            VB["voicebot-gateway<br/>voicebot-sync-worker<br/>voicebot-admin"]
        end
    end

    subgraph EXT["🌍 Outside world"]
        TWILIO["📞 Twilio<br/>voice · SMS"]
        VAPI["🗣 Vapi<br/>voice agent"]
        GEM["🔎 Gemini<br/>document vision"]
    end

    TAB -- "events · sessions · memos<br/>upsert on client UUID" --> PG
    PG -- "content snapshot" --> TAB
    WEB -- "PostgREST · RLS" --> PG
    RT -. "live invalidation" .-> WEB
    PG --> RT
    WEB --> ST
    TAB --> ST
    CRON --> WD & ESC & VB
    PG -- "db webhook" --> ESC
    ESC --> TWILIO
    TWILIO --> TW --> PG
    TWILIO <--> VAPI
    WEB --> OCR --> GEM
    WEB --> PAIR
    TAB --> PAIR
    TAB --> VB
```

### Two invariants hold the whole system together

<table>
<tr>
<td width="50%" valign="top">

#### 1 · Single-writer ownership

Every table has **exactly one writer**. The web app writes content, the tablet writes events, and the server writes derived data. Because no two writers ever touch the same table, the codebase has no conflict-resolution code at all.

</td>
<td width="50%" valign="top">

#### 2 · Idempotency by primary key

Every row the tablet sends carries a **client-generated UUID** and is inserted with `ON CONFLICT DO NOTHING`. If the tablet goes offline and re-uploads the same batch, nothing changes.

</td>
</tr>
</table>

| Table                                                         | ✍️ Writer                             | 👀 Readers    |
| ------------------------------------------------------------- | ------------------------------------- | ------------- |
| `patients`, `patient_members`                                 | 💻 web (caregiver)                    | all members   |
| `people`, `medications`, `routine_items`, `escalation_config` | 💻 **web only**                       | web, tablet   |
| `events`, `sessions`, `reminder_events`, `memos`              | 📱 **tablet only**                    | web, analysis |
| `escalations`                                                 | 📱 tablet creates · ☁️ server updates | server        |
| `flags`, `ability_mirror`, `bandit_state`                     | ☁️ **server only**                    | web           |
| `reports`, `audit_log`                                        | ☁️ server only                        | web           |

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🛟 The missed-dose ladder

<p align="center"><img src=".github/assets/ladder.svg" width="100%" alt="Escalation ladder"/></p>

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F5EAD8','primaryBorderColor':'#BC5A3C','primaryTextColor':'#201E1D','lineColor':'#8C491A','actorBkg':'#F5EAD8','actorBorder':'#BC5A3C','noteBkgColor':'#F0FAE1','noteBorderColor':'#56633F','activationBkgColor':'#FFF2EB','fontFamily':'Segoe UI, Helvetica, sans-serif'}}}%%
sequenceDiagram
    autonumber
    participant T as 📱 Tablet
    participant DB as 🐘 Postgres
    participant EW as 🦕 escalation-worker
    participant TW as 📞 Twilio / Vapi
    participant WH as 🦕 twilio-webhook
    participant F as 👨‍👩‍👧 Family

    T->>T: Alarm at chosen time (works offline)
    Note over T: No confirmation within the window
    T->>DB: insert escalation {reminderEventId}_2
    DB-->>EW: database webhook
    EW->>DB: Re-check: was it confirmed after a late sync?
    alt already confirmed
        EW->>DB: status = cancelled (already_confirmed)
    else still due
        EW->>DB: Gather every unconfirmed med in [now−15, now+30]
        EW->>TW: ONE call for all due medicines
        alt Parent presses a key or says yes
            TW->>WH: signed callback
            WH->>WH: Verify HMAC-SHA1 signature
            WH->>DB: reminder_events confirmed · cancel the rest of the ladder
        else No answer
            EW->>F: SMS primary contact, then secondary
        end
    end
```

<details>
<summary><b>🐕 The watchdog: what happens when the tablet itself is dead</b></summary>

<br/>

The tablet can fail without anyone noticing: a dead battery, days without internet, or an OEM battery manager that kills the alarm. When that happens the tablet writes no escalation, so the parent would get nothing. The **watchdog** covers this case. Every 10 minutes it works out which reminders _should_ have fired, checks whether each one did, and raises a server-side escalation `wd_{patient}_{date}_{slot}` when one did not.

The watchdog waits a **45-minute grace period**, longer than the tablet's own T+30 escalation, so the two paths never race each other.

| Rule                                                            | Why                                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| One call per patient for **all** due medicines                  | An elder should never get three calls in five minutes                        |
| Deterministic escalation IDs                                    | Retries and duplicate webhooks collapse into a single row                    |
| Time is stored as integer minutes and compared modulo 1440      | Comparing `time` strings breaks every night at 23:55                         |
| Missing Twilio or Vapi credentials mark the escalation `failed` | The problem shows up in the response instead of passing as a silent `200 OK` |
| `Promise.allSettled` dispatch                                   | One failing patient never blocks the others                                  |

</details>

<details>
<summary><b>⏰ Scheduled jobs (pg_cron)</b></summary>

<br/>

| Job                       | Schedule          | Purpose                                               |
| ------------------------- | ----------------- | ----------------------------------------------------- |
| `smriti-watchdog`         | every 10 min      | Server-side missed-dose safety net                    |
| `smriti-escalation-sweep` | every 5 min       | Retry escalations that got stuck                      |
| `smriti-analysis`         | 02:00 IST nightly | Trajectory and change-point analysis                  |
| `smriti-bandit-decay`     | Sunday 03:00 IST  | Decays the game-difficulty bandit's posteriors ×0.99  |
| `smriti-keepalive`        | every 6 h         | Keeps the free-tier project from pausing              |
| VoiceBot sync             | scheduled         | Drains `voicebot_sync_queue` with locking and retries |

Every internal endpoint checks the `x-internal-secret` header.

</details>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 📸 Prescription OCR, with a human in the loop

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F5EAD8','primaryBorderColor':'#BC5A3C','primaryTextColor':'#201E1D','lineColor':'#8C491A','fontFamily':'Segoe UI, Helvetica, sans-serif'}}}%%
flowchart LR
    A["📷 Photo / PDF<br/>≤ 10 MB"] --> B["🦕 ocr-prescription<br/>caregiver-only"]
    B --> C["🔎 Gemini vision<br/>strict JSON schema"]
    C --> D["📚 Catalogue match<br/>685 gzip shards of<br/>Indian medicine names"]
    D --> E["🧾 Candidates<br/>name · dose · frequency · confidence"]
    E --> F{"👀 Caregiver ticks<br/>every row"}
    F -- "all confirmed" --> G[("💊 medications")]
    F -- "any unticked" --> H["⛔ Save disabled"]

    style F fill:#FFF2EB,stroke:#BC5A3C
    style G fill:#F0FAE1,stroke:#56633F
    style H fill:#FFF2EB,stroke:#B3402F
```

> [!IMPORTANT]
> `ocr-prescription` **never writes to `medications`**. It only returns candidates, and each one is saved only after a caregiver confirms it. The model prompt treats the document as untrusted input, and the model never guesses at text it cannot read.

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🗣 VoiceBot lifecycle

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F5EAD8','primaryBorderColor':'#BC5A3C','primaryTextColor':'#201E1D','lineColor':'#8C491A','fontFamily':'Segoe UI, Helvetica, sans-serif'}}}%%
stateDiagram-v2
    direction LR
    [*] --> disabled
    disabled --> pending: caregiver opts in
    pending --> syncing: sync worker claims queue row
    syncing --> ready: applied_revision = desired_revision
    syncing --> error: upstream failure (retried)
    error --> syncing: backoff elapsed
    ready --> pending: content changed
    ready --> disabled: opted out
    syncing --> unavailable: upstream down
    unavailable --> pending: recovered
```

Each patient is bound to their own upstream resources, and every gateway request is rate-limited. A valid tablet therefore cannot probe another patient's data.

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🗃 Data model

<details open>
<summary><b>Core entities</b> (21 tables in total across 25 migrations)</summary>

<br/>

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F5EAD8','primaryBorderColor':'#BC5A3C','primaryTextColor':'#201E1D','lineColor':'#8C491A','fontFamily':'Segoe UI, Helvetica, sans-serif'}}}%%
erDiagram
    patients ||--o{ patient_members : "has"
    patients ||--o{ people : "remembers"
    patients ||--o{ medications : "takes"
    patients ||--o{ routine_items : "follows"
    patients ||--|| escalation_config : "alerts via"
    patients ||--o{ sessions : "plays"
    sessions ||--o{ events : "contains"
    medications ||--o{ reminder_events : "fires"
    reminder_events ||--o{ escalations : "escalates"
    patients ||--o{ memos : "records"
    patients ||--o{ flags : "raises"
    patients ||--o| voicebot_patient_state : "opts into"

    patients {
        uuid id PK
        text display_name
        text lang_code
        text timezone
        int content_version
        timestamptz device_last_seen_at
    }
    patient_members {
        uuid patient_id PK
        uuid user_id PK
        text role "caregiver | family_viewer"
    }
    medications {
        uuid id PK
        text name
        text dose
        int window_start_min "0..1439"
        int chosen_time_min "0..1439"
        int window_end_min "0..1439"
        text days_of_week
    }
    people {
        uuid id PK
        text name
        text relationship
        text photo_path "storage path, never a URL"
        text voice_path
    }
    reminder_events {
        uuid id PK "client-generated"
        bigint scheduled_at
        text outcome
        text channel "in_app | call | sms"
        int ladder_step
    }
    escalations {
        text id PK "deterministic"
        int step
        text status
        text source "device | watchdog"
    }
    flags {
        uuid id PK
        text type
        text severity
        jsonb z_scores
        text status
    }
```

</details>

<details>
<summary><b>📜 Migration timeline</b></summary>

<br/>

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#F5EAD8','primaryBorderColor':'#BC5A3C','primaryTextColor':'#201E1D','lineColor':'#8C491A','cScale0':'#F5EAD8','cScale1':'#FFF2EB','cScale2':'#F0FAE1','cScale3':'#EBDDC5','fontFamily':'Segoe UI, Helvetica, sans-serif'}}}%%
timeline
    title 25 numbered migrations, applied in order and never edited
    Schema : 0001 extensions : 0002 core : 0003 content : 0004 events : 0005 derived
    Security : 0006 RLS helpers : 0007 RLS policies
    Logic : 0008 RPCs : 0009 triggers : 0010 views : 0011 storage : 0012 cron
    Hardening : 0013 app config : 0014 escalation scheduling : 0015–0019 cron URLs · adherence · realtime · media
    Lifecycle : 0020–0021 delete patient
    VoiceBot : 0022 gateway : 0023 WV01 corrections : 0024 rate limits : 0025 sync schedule
```

</details>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🔐 Security model

Row-level security is the entire authorisation layer, so the codebase treats every rule below as a hard requirement. `npm run verify` checks the ones marked 🤖 automatically.

|  #  | Rule                                                                                                                |     |
| :-: | ------------------------------------------------------------------------------------------------------------------- | :-: |
|  1  | Every table has RLS enabled                                                                                         | 🤖  |
|  2  | `auth.uid()` is always wrapped as `(select auth.uid())`, so it is evaluated once per statement and not once per row | 🤖  |
|  3  | Time of day is stored as integer minutes (0–1439), never as a `time` column                                         | 🤖  |
|  4  | Migrations are unique, sequential, and never edited after they are applied                                          | 🤖  |
|  5  | No trigger on `events` writes back to `events`                                                                      | 🤖  |
|  6  | Every view is `security_invoker = true`, so views cannot bypass RLS                                                 | 🤖  |
|  7  | The service-role key never appears under `web/`                                                                     | 🤖  |
|  8  | Only `web/src/lib/db.ts` imports `@supabase/supabase-js` (plus the `lib/supabase.ts` initialiser)                   | 🤖  |
|  9  | No `.env` file is committed                                                                                         | 🤖  |
| 10  | Every webhook verifies its signature before writing anything                                                        | 👤  |
| 11  | Media uploads finish before their storage path is written to a row                                                  | 👤  |
| 12  | Device writes never use `.select()` / `RETURNING`, because the device has insert-only access                        | 👤  |
| 13  | The `family_viewer` role never sees a control that edits data                                                       | 👤  |
| 14  | Every patient-scoped query key includes the patient id                                                              | 👤  |

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🌏 Languages

Smriti uses two separate language settings: the **parent's** language, used by the tablet and the phone calls, and the **caregiver's** interface language.

<table>
<tr><th>Parent voice language</th><th>How escalation calls are delivered</th><th>Caregiver UI</th></tr>
<tr><td>🇮🇳 Hindi · <code>hi</code></td><td>🗣 Conversational voice (Vapi)</td><td>✅ हिन्दी</td></tr>
<tr><td>Assamese · <code>as</code></td><td>🗣 Conversational · recorded audio / keypad fallback</td><td>✅ অসমীয়া</td></tr>
<tr><td>Meiteilon · <code>mni</code></td><td>🔢 Recorded audio + keypad</td><td>✅ ꯃꯤꯇꯩꯂꯣꯟ</td></tr>
<tr><td>Khasi · <code>kha</code></td><td>🔢 Recorded audio + keypad</td><td>✅ Ka Ktien Khasi</td></tr>
<tr><td>Mizo · <code>lus</code></td><td>🔢 Recorded audio + keypad</td><td>n/a</td></tr>
<tr><td>English · <code>en</code></td><td>🔢 Recorded audio + keypad</td><td>✅ English</td></tr>
</table>

> [!NOTE]
> Keypad (DTMF) is a deliberate design choice. It works in any language and on any feature phone, which is the phone most elders in the region actually own.

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 📊 By the numbers

<table>
<tr>
<td width="55%">

```mermaid
%%{init: {'theme':'base','themeVariables':{'pie1':'#BC5A3C','pie2':'#E8A83F','pie3':'#56633F','pie4':'#EF8B7C','pie5':'#8C491A','pie6':'#8FA073','pie7':'#645C50','pieStrokeColor':'#F9F4ED','pieSectionTextColor':'#201E1D','pieOuterStrokeColor':'#F9F4ED','fontFamily':'Segoe UI, Helvetica, sans-serif'}}}%%
pie showData
    title Lines of code by area
    "Web app UI (TS/TSX)" : 15304
    "i18n catalogues" : 4729
    "Edge Functions (Deno)" : 3474
    "SQL migrations" : 1460
    "Tests" : 1377
    "Shared types + zod" : 1082
    "Styles" : 489
```

</td>
<td width="45%" valign="top">

|                     |          |
| ------------------- | -------: |
| 🗄 Tables           |   **21** |
| 📜 Migrations       |   **25** |
| 🦕 Edge Functions   |   **10** |
| 🧭 Web routes       |   **16** |
| 🌐 UI locales       |    **5** |
| 🗣 Parent languages |    **6** |
| 🔑 i18n keys        | **~400** |
| 🧪 Test suites      |   **17** |
| 📚 Catalogue shards |  **685** |

</td>
</tr>
</table>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🚀 Getting started

> [!TIP]
> **No backend needed to try it.** If the Supabase env vars are missing, the web app runs on built-in fixtures: any phone number and any six digits will sign you in, two patients exist, and every screen has content.

```bash
git clone https://github.com/Abhayk777/SMRITI.git
cd SMRITI
npm install                     # npm workspaces: web + packages/shared
npm run dev --workspace web     # → http://localhost:5173
```

<details>
<summary><b>🔌 Connect to a real Supabase project</b></summary>

<br/>

**1 · Web env:** create `web/.env.local`:

```ini
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

> [!CAUTION]
> Use the **anon** key only. The service-role key bypasses RLS, and RLS is the only thing between one family's data and another's.

**2 · Local database**

```bash
npx supabase start              # local Postgres 17 + Auth + Storage
npx supabase db reset           # apply all 25 migrations + seed
```

**3 · Edge Function secrets:** set these with `supabase secrets set` and never commit them to files. The functions read Twilio, Vapi, Gemini and the internal cron secret (`INTERNAL_CRON_SECRET`). See `docs/backend-spec.md` §1.2.

```bash
npx supabase functions deploy <name>
```

</details>

<details>
<summary><b>🧪 Verify &amp; test</b></summary>

<br/>

```bash
npm run verify                          # guardrail script + clean db reset
npm run lint  --workspace web
npm run build --workspace web           # tsc -b && vite build

node --test web/tests/*.test.ts                     # web unit tests (Node ≥ 23.6)
node --test supabase/tests/functions/*.test.mts     # Edge Function logic
node --test supabase/tests/realtime/*.mjs           # realtime (needs local stack)
npx supabase test db                                # pgTAP database tests
```

</details>

<details>
<summary><b>☁️ Deploy</b></summary>

<br/>

The web app is a static Vite build with an SPA rewrite in [`web/vercel.json`](web/vercel.json), so any static host will serve it. The backend is a Supabase project in `ap-south-1` (Mumbai). The region is chosen when the project is created and cannot be changed afterwards.

</details>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

## 🗂 Project layout

```text
SMRITI/
├── web/                         React 19 caregiver app + marketing site (one Vite build)
│   ├── src/
│   │   ├── lib/db.ts            ← the only place that talks to Supabase
│   │   ├── auth/  patients/     session context · patient in scope · cross-patient guards
│   │   ├── routes/  pages/      route table, guards, one folder per route
│   │   ├── features/            per-domain hooks and forms (medicines, OCR, pairing, voicebot…)
│   │   ├── hooks/               useContentMutation · useMediaUpload · usePatientRealtime
│   │   ├── components/          brand · ui · layout · media · motion · ner (woven motifs)
│   │   ├── i18n/                en · hi · as · mni · kha catalogues
│   │   ├── marketing/           public landing site
│   │   └── styles/tokens.ts     the brand palette, single source of truth
│   ├── public/                  logomark, intro film frames, media
│   └── tests/                   node:test unit tests
├── packages/shared/             types + zod schemas shared by web and functions
├── supabase/
│   ├── migrations/              0001 → 0025, sequential, never edited
│   ├── functions/               10 Deno Edge Functions + _shared/ (manual type mirror)
│   ├── tests/                   pgTAP · function · realtime tests
│   └── seed.sql
├── scripts/
│   ├── verify.sh                guardrails, run before every commit
│   └── build-medicine-index.mjs builds the OCR catalogue shards
└── docs/
    ├── backend-spec.md          schema, RLS, RPCs, functions, cron (the backend source of truth)
    ├── frontend.md              routing, data layer, page requirements
    ├── INDEX.md                 map of the specs
    └── rls-test.sql             manual two-tenant RLS test
```

<details>
<summary><b>🎨 Brand palette</b></summary>

<br/>

|                                  Swatch                                  | Token        | Hex       | Role                         |
| :----------------------------------------------------------------------: | ------------ | --------- | ---------------------------- |
| ![](https://img.shields.io/badge/-%20%20%20%20-BC5A3C?style=flat-square) | `terracotta` | `#BC5A3C` | Primary brand                |
| ![](https://img.shields.io/badge/-%20%20%20%20-F5EAD8?style=flat-square) | `cream`      | `#F5EAD8` | Logo on dark, light sections |
| ![](https://img.shields.io/badge/-%20%20%20%20-F9F4ED?style=flat-square) | `ivory`      | `#F9F4ED` | Lightest surface             |
| ![](https://img.shields.io/badge/-%20%20%20%20-E8A83F?style=flat-square) | `gold`       | `#E8A83F` | Warm accent, attention       |
| ![](https://img.shields.io/badge/-%20%20%20%20-EF8B7C?style=flat-square) | `coral`      | `#EF8B7C` | Gradient trailing edge       |
| ![](https://img.shields.io/badge/-%20%20%20%20-56633F?style=flat-square) | `sage`       | `#56633F` | Calm, on track               |
| ![](https://img.shields.io/badge/-%20%20%20%20-201E1D?style=flat-square) | `ink`        | `#201E1D` | Primary text                 |
| ![](https://img.shields.io/badge/-%20%20%20%20-B3402F?style=flat-square) | `alert`      | `#B3402F` | Only where action is needed  |

Type: **Baloo 2** for display text, **Figtree** for body text, and **Noto Sans Meetei Mayek** for Meiteilon.

</details>

<img src=".github/assets/divider.svg" width="100%" alt=""/>

<div align="center">

<img src="web/public/favicon.svg" width="56" alt="Smriti logomark"/>

**Smriti** · _built for families who live far from home, and for the parents who raised them._

<sub>Specs live in <a href="docs/INDEX.md"><code>docs/</code></a> · contributor rules in <a href="AGENTS.md"><code>AGENTS.md</code></a> · web app details in <a href="web/README.md"><code>web/README.md</code></a></sub>

</div>
