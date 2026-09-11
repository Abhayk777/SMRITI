# Smriti — Frontend Polish & Northeast India Theme: Implementation Plan

> Status: **DRAFT — waiting for approval.** No code changes until this is approved.
> Scope: `web/` frontend only. No schema, no `db.ts`, no hooks/queries, no route
> changes, no Edge Functions. Every page keeps its current layout skeleton and the
> data it renders. What changes is how the pages look and move.

---

## 1. The idea behind it

The Smriti logo is **four strands drawn into a knot**. Weaving is the natural
metaphor to build on: in every Northeast state, handloom is how a family passes
memory from one generation to the next. A mother weaves the mekhela, the gamosa
or the puan her daughter will wear, and the motifs say where you come from.
*Smriti* means memory, and the product is about staying close to an ageing
parent from far away, so the fit is direct.

The design direction in one line:

> **Woven, not decorated.** Things on the page are *woven in* (threads draw,
> bands weave across, borders hem the sections) instead of fading in. The textile
> motifs come from the eight Northeast states, and the colour comes from their
> natural dyes.

This also covers the real audience. Many NER families have children working in
Bengaluru, Delhi and Pune while the parents stay in Shillong, Jorhat, Kohima or
Aizawl. The reference clips show exactly that: an elder in her doorway, a
figure in a red shawl walking through paddy fields.

---

## 2. Hard rules I will follow

| Rule | How |
|---|---|
| No change to the skeleton | Same routes, same components in the same order, same props into data components. Only styling, motion, decorative SVG and copy change. |
| No backend coupling | Nothing under `lib/db.ts`, `lib/supabase.ts`, `hooks/`, `features/*/use*.ts`, `patients/`, `auth/` changes. |
| **No "AI look"** | No neon, no dark palette, no glassmorphism, no neumorphism or "paper" styling, no glow shadows, no gradient blobs, no purple. I will also **remove** the `backdrop-blur` that exists today on the marketing nav, the app header and the dialog overlay, and use solid surfaces instead. |
| Light, warm, earthy | The palette stays on the existing cream/terracotta/sage base, with accents taken from NER natural dyes (section 4). |
| Accessibility | Every animation respects `prefers-reduced-motion`. Contrast stays at AA or better. Motifs are `aria-hidden`. The intro video can be skipped and pauses under reduced motion. |
| Performance | Motifs are inline SVG and `<pattern>`, a few KB each. Animations use only transform and opacity. Loops pause when off-screen. The video is compressed to about 3–5 MB and is **not** added to the PWA precache. |
| Project rules (AGENTS.md) | No new files outside `web/src` and `web/public` (plus this plan). The one new dependency is `lenis` and needs your sign-off (section 10, Q1). |

---

## 3. What I found in the codebase (current state)

- **Stack:** React 19, Vite 8, Tailwind v4 (`@theme` tokens in `src/index.css`, mirrored in `src/styles/tokens.ts`), Framer Motion 13, Radix UI, Recharts.
- **Marketing** (`src/marketing/`): Nav → Hero (with `<LogoReveal/>`) → HowItWorks → FeatureSlider → StatBand → ProductPreview → Stories → FinalCta → Footer. Uses the `Reveal` on-scroll component. Smooth scrolling today is a `scroll-behavior: smooth` hack in `MarketingPage.tsx`.
- **App** (`AppShell`, `PageHeader`, `ui/*`, 14 pages): a clean, calm, card-based layout. The problem is that it is static: no route transitions, and hover and entrance motion are minimal.
- **Loaders:** `FullPageLoading` (a pulsing logomark), a post-sign-in `LogoReveal` splash in `RootRedirect`, and `SetupCompleteLoader` with `SkylineArtwork`. The skyline is currently a temple hall, lions and **chedis**, which read as Southeast Asian, not Northeast Indian.
- **Unused assets:** `web/public/frames/logo/*`, `web/public/frames/loading/*` and `web/public/loading-screen.mp4` are not referenced anywhere in `src/`. I will leave them alone unless you say otherwise.
- **Reference clips** (`fontend references/`). I pulled stills from each one:
  | File | What it shows | Size / format |
  |---|---|---|
  | `13884810_…mp4` | Adi/Galo-style festival dance, Arunachal (woven sashes, cane hats, yak-tail whisks) | 20 s, 4K, 85 MB |
  | `15051060_…mp4` | Elderly woman in a doorway wrapping a **red check shawl** | 19 s, 1080p, 14 MB |
  | `15860003_…mp4` | Figure in a red shawl walking a bridge through **green paddy fields**, hills behind | 42 s, 1080p, 140 MB |
  | `ner1.mp4` | **Clouds rolling over hills at dawn** (Meghalaya-like) | 17 s, 4K 60 fps, 78 MB |
  | `NER2.mp4` | Tall **waterfall into a turquoise pool** (portrait 9:16) | 11 s, 4K, 109 MB |

---

## 4. Colour: NER natural dyes added to the current palette

The existing tokens already sit close to NER dye colours, so I **keep them all**
(nothing that uses them breaks) and add six accent tokens, each tied to a real
source. I will add them to `@theme` in `index.css` and to `tokens.ts` in the
same change, as the existing header comment asks.

| New token | Hex (approx.) | Source | Used for |
|---|---|---|---|
| `lac` | `#9E2B25` | Lac-insect red, the red of the Assamese **gamosa** border | Motif threads, woven borders |
| `osak` | `#24303B` | Assam indigo (*Strobilanthes*, "osak" to the Ao Naga), the blue-black of Naga shawls | Motif threads only. **Never used as a surface.** |
| `muga` | `#C99A3E` | The natural gold of **Muga silk** | Motif highlights, sits next to the existing `gold` |
| `eri` | `#F1E8D6` | Undyed **Eri / Ryndia** "peace silk" | Warm off-white for motif grounds |
| `paddy` | `#6B7F3A` | Paddy green, from the reference clips | Hill silhouettes, a sage variant |
| `mist` | `#E4E6E0` | Dawn cloud over the Khasi hills (`ner1`) | The very soft ground behind hill layers |

**Motif rule:** motifs use the two- or three-colour logic real NER weaves use
(red + white + black, or red + gold on off-white) at low visual weight. They
decorate edges and grounds and never sit behind body text at full strength.

---

## 5. Motif library: `web/src/components/ner/`

Each motif is a small, hand-drawn **geometric interpretation** in SVG, not a
copy of any single cloth. Each file has a header comment naming its source
tradition, so the credit sits with the code.

| Component | Tradition (state) | What it looks like | Where it goes |
|---|---|---|---|
| `GamosaBand` | **Gamosa** phool and pari (Assam) | Red stripes plus a row of small lozenges (kasori/sorai) on off-white | App header bottom edge, footer top, section dividers |
| `TempleHem` | **Moirang Phee** "Yarong" temple teeth, from Pakhangba's teeth (Manipur) | Stepped, pointed triangles in sequence | Hero bottom edge: a "hem" into the next section. Also the bottom of `PageHeader`. |
| `NagaBands` | **Naga shawl** banding (Nagaland) | Horizontal red, black and white bands with a stepped lozenge row | Top and bottom of the sage **StatBand** |
| `Siniar` | **Mizo Puanchei** siniar (Mizoram) | Triangles, zigzags and diamonds in one band | FeatureSlider card tops, Stories card edges |
| `TwinStar` | **Apatani** twin-diamond, "sisters turned into stars" (Arunachal) | Two joined diamonds | **Replaces the generic 4-point sparkles** in the Hero. Used as the bullet in lists. |
| `JapiRosette` | **Japi** bamboo hat (Assam) | Concentric radial weave | Slow-rotating ornament in FinalCta (next to the logomark), and the `FullPageLoading` ring |
| `CaneTwill` | Cane and bamboo **basketry** (whole NER) | Diagonal over-under twill | 4–6 % opacity texture on sand sections and skeletons |
| `RyndiaCheck` | Khasi **Ryndia** maroon-and-mustard check (Meghalaya), echoing the red check shawl in the reference | Fine plaid | Story quote cards, EmptyState ground |
| `RisaStripe` | **Tripura Risa** stripes (Tripura) | Narrow multicolour stripes | Progress bars (setup wizard, loader), the active nav indicator |
| `TharaStripe` | Lepcha **Thara** backstrap-loom stripes (Sikkim) | Stripe rows with small inset motifs | The "eight states" strip (optional, section 7.9) |

**Motion primitives** (`web/src/components/motion/`):

- `WeaveIn`: an element enters as if woven. Warp lines draw vertically (`pathLength`), then the fill comes in with a horizontal clip wipe. It replaces `Reveal` where a section should feel woven. `Reveal` itself stays for smaller items.
- `ThreadLine`: an SVG path that draws itself **tied to scroll progress** (Framer `useScroll`, smoothed by Lenis). One thread runs along HowItWorks and links the three steps.
- `DriftPattern`: a very slow horizontal drift for a motif band (30–60 s loop, paused off-screen).
- `Parallax`: layered hill silhouettes that move at different scroll speeds.

---

## 6. Smooth scroll with Lenis

- **Dependency:** `lenis@^1.3.26`, the React wrapper from `lenis/react`. About 4 KB gzipped. *Needs your approval (Q1).*
- **New file** `src/components/motion/SmoothScroll.tsx`: `<ReactLenis root options={{ autoRaf: false, lerp: 0.1, anchors: { offset: -80 } }}>`, driven by **Framer Motion's `frame` loop** (`frame.update(({timestamp}) => lenis.raf(timestamp), true)`). This is the approach the Lenis and Motion maintainers recommend, so the two never run separate rAF loops.
- **Mounted once** in `main.tsx` around `<RouterProvider>`, so it covers marketing, sign-in and the app.
- **Guards:**
  - Not mounted under `prefers-reduced-motion`, which gives native scroll.
  - `syncTouch: false`, so phones and tablets keep native touch scrolling (better for older users).
  - `data-lenis-prevent` on Radix dialog, select and dropdown content, and on inner scrolling areas (`OcrReview` lists, the FeatureSlider track), so nested scroll keeps working.
  - Scrolls to the top without animation on every route change (a small `useLocation` effect).
  - Removes the `scroll-behavior: smooth` hack from `MarketingPage.tsx`, which would conflict with Lenis.

---

## 7. Marketing site, section by section

The order of sections, the copy structure and every link target stay the same.

### 7.1 Intro sequence: logo reveal, then the NER film (new behaviour in `Hero`)
1. **Logo reveal**, as today, on terracotta (`LogoReveal`, unchanged choreography).
2. **Handoff:** the finished lockup lifts and shrinks into the nav logo position with a Framer shared `layoutId`. The four strands carry on past the knot as threads and become the warp of a **gamosa band wipe** (lac red on eri) that sweeps across the screen like a curtain.
3. **NER film** plays full-bleed behind the wipe: muted, `playsInline`, no controls. Planned cut, about 14 s:
   `ner1` clouds over hills (3 s) → `15860003` walker through paddies (3.5 s) → `NER2` waterfall (2.5 s) → `13884810` festival dance (2.5 s) → `15051060` elder in doorway, wrapping the red shawl (2.5 s). **It ends on the elder**, so the film lands on what Smriti is about.
4. **Hero copy** (same `h1`, `p`, buttons, trust line) rises in over the film's last shot. For legibility there is a warm **terracotta-to-transparent scrim at the bottom only**: solid colour, no blur and no dark wash.
5. After the film, the hero **loops a 6 s ambient cut** (the clouds) under a soft terracotta duotone grade, so it stays calm and on brand.
6. **Controls and rules:**
   - A "Skip intro" text button.
   - Plays once per session (`sessionStorage`); on return visits you land on the hero with the ambient loop.
   - Under reduced motion: no video, a still poster frame, and the copy shown straight away.
   - On mobile a **portrait cut** is served (the waterfall is already 9:16; the others are centre-cropped).
7. **Encoding** (done once with ffmpeg; the output goes into `web/public/media/`):
   - `ner-intro-1080.mp4` (H.264), `ner-intro-1080.webm` (VP9), `ner-intro-720-portrait.mp4`, `ner-ambient.mp4`, `ner-poster.webp`
   - Target: under 5 MB for the intro, under 1.5 MB for the ambient loop. No audio.
   - The source 4K files stay where they are and are **not** added to the build.

### 7.2 Hero details
- The generic 4-point `Sparkle`s become Apatani `TwinStar`s twinkling in cream.
- The bottom edge becomes a `TempleHem` in cream, so the hero is "hemmed" into HowItWorks instead of ending in a straight cut.
- The scroll-down arrow gets a small woven shuttle shape. Same link.

### 7.3 HowItWorks (cream)
- A thin vertical `GamosaBand` to the left of the heading block.
- A `ThreadLine` runs through the three step cards and draws as you scroll. Each step number chip "knots" (a small scale and stroke) when the thread reaches it.
- The step cards arrive with `WeaveIn`.

### 7.4 FeatureSlider (ivory)
- The four `SlideArt` placeholder scenes are **redrawn as NER scenes**. The same `art` keys, so no structural change:
  - `morning`: a bamboo stilt house (*chang ghar*) with the sun over layered hills
  - `pills`: a pill box on a woven cane tray
  - `siblings`: two figures in shawls, one holding a phone
  - `photograph`: a family photo of a tea-garden slope
- A `Siniar` band along the top edge of each card. The active dot indicator becomes a short `RisaStripe`.
- Drag, snap and the buttons stay exactly as they are.

### 7.5 StatBand (sage)
- `NagaBands` on the top and bottom edges, drifting very slowly (`DriftPattern`).
- The count-up stays.

### 7.6 ProductPreview (sand)
- A `CaneTwill` texture on the sand ground at 5 % opacity.
- Phone mockup copy localised (see 7.10). The phone floats slightly with scroll parallax.

### 7.7 Stories (ivory)
- Quote cards get a `RyndiaCheck` edge strip. The avatar ring gets a thin woven border.
- Cards weave in with a stagger.

### 7.8 FinalCta (terracotta)
- A `JapiRosette` sits beside the existing slow-rotating logomark.
- **Three layered hill silhouettes** in terracotta-deep, bark and bark-deep rise with parallax along the bottom edge (the misty ridges from `ner1`, drawn flat, not photographic).

### 7.9 Footer (cream)
- A `GamosaBand` top border.
- A credit line: *"Motifs drawn from the handloom traditions of Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim and Tripura."*
- *(Optional, Q5)* An **"Eight sisters, eight looms"** strip: one row of eight small motif tiles (one per state, with state and weave name) that drifts slowly. It would go inside the existing footer container or just above it.

### 7.10 Copy localisation *(Q4)*
Marketing copy only. Structure unchanged.
- Phone mockup: "Amma · Pune" becomes "Aita · Jorhat". "Grandfather's Ambassador, 1974" becomes a local memory, e.g. *"Deuta's first tea-garden bicycle, 1972."*
- Stories: locations become NER diaspora pairs, e.g. *Bengaluru, their mother is in Shillong*; *Delhi, his father is in Kohima*; *Pune, their mother is in Aizawl*. Names become regionally plausible.
- The stat figures stay as they are. I will not invent new claims.

---

## 8. The app (signed-in screens)

Same layout, same components, same data. These changes are polish only.

| Area | Change |
|---|---|
| `AppShell` header | Solid ivory, with **no backdrop-blur**. The bottom border becomes a 3 px `GamosaBand`. |
| Sidebar and mobile strip nav | The active item moves between links as a **sliding pill** (Framer `layoutId`) with a tiny `RisaStripe` at its edge. The "Manage" label gets a woven rule. |
| Route transitions | The `<main>` content is keyed on the pathname: fade and 8 px rise on enter, about 250 ms. **No exit delay**, so navigation never feels slower. |
| `PageHeader` | The eyebrow gets a `TwinStar` glyph. A thin `TempleHem` underline draws in under the title. |
| Cards (`ui/card.tsx`) | Grids stagger in. Interactive cards lift 2 px on hover with the existing `shadow-lift`. **Tone meanings stay exactly as documented** (sage = on track, warm = attention, alert = act now). |
| Dashboard `StatTile`s | Numbers ease in (count-up). A thin textile edge on top follows the tile's tone. |
| `Skeleton` | The shimmer becomes a soft `CaneTwill` "weaving" shimmer. It is still a skeleton and still never a spinner. |
| `EmptyState` | The dashed box becomes a `RyndiaCheck` hairline border with a motif glyph in the icon circle when no icon is passed. |
| `FullPageLoading` | The pulsing logomark becomes the logomark inside a slowly drawing `JapiRosette` ring. Same label. |
| Post-sign-in splash (`RootRedirect`) | Same `LogoReveal`, with a gamosa band wipe out at the end. Timing stays within about 1 s. |
| `SignIn` left panel | The static giant logomark becomes a slow `DriftPattern` field of woven bands at low opacity. *(Optional)* a greeting that rotates through *Nomoskar · Khublei · Chibai · Khurumjari · Tashi Delek*, to be checked with native speakers before shipping. |
| `Overview` (patients list) | Rows stagger in, get the hover lift, and the header gets the gamosa border. |
| Dialogs | The overlay loses its blur and becomes a plain `ink/40` scrim. The content scales in slightly. |
| Charts (`chartTheme.ts`) | Series colours stay in token order. Only gridline and tooltip styling is harmonised. |
| *(Optional, Q6)* `SkylineArtwork` | Redraw the setup-complete scene as the Northeast: **Rang Ghar** pavilion (Sivasagar), a **Naga morung** with a horned gable, **Khasi hills** with a living root bridge, **Apatani paddies**, a one-horned **rhino**. The loader mechanics (draw head, gold light band, progress, LOADING) do not change. It is a large SVG job, so it is optional. |

---

## 9. Files touched

**New**
- `web/src/components/ner/`: `GamosaBand.tsx`, `TempleHem.tsx`, `NagaBands.tsx`, `Siniar.tsx`, `TwinStar.tsx`, `JapiRosette.tsx`, `CaneTwill.tsx`, `RyndiaCheck.tsx`, `RisaStripe.tsx`, `TharaStripe.tsx`, `index.ts`
- `web/src/components/motion/`: `SmoothScroll.tsx`, `WeaveIn.tsx`, `ThreadLine.tsx`, `DriftPattern.tsx`, `Parallax.tsx`
- `web/src/marketing/IntroFilm.tsx`: the video stage, skip button, session flag and reduced-motion poster
- `web/public/media/`: the encoded clips and poster (section 7.1)

**Edited (styling, motion and copy only)**
- `index.css`, `styles/tokens.ts`, `main.tsx` (Lenis provider)
- `marketing/*`: `MarketingPage`, `Hero`, `MarketingNav`, `Sections`, `FeatureSlider`, `Reveal`
- `components/brand/LogoReveal.tsx`: an optional `layoutId` and exit hook only; the choreography does not change
- `components/layout/AppShell.tsx`, `PageHeader.tsx`
- `components/ui/`: `card.tsx`, `skeleton.tsx`, `feedback.tsx`, `dialog.tsx`, `button.tsx` (press feedback)
- `routes/FullPageLoading.tsx`, `routes/RootRedirect.tsx` (splash exit only)
- `pages/auth/SignIn.tsx` (left panel), `pages/dashboard/Dashboard.tsx` (the `StatTile` visual only), `pages/patients/Overview.tsx` (visual only)
- *(Optional)* `components/onboarding/SkylineArtwork.tsx`
- `web/package.json`: add `lenis`

**Not touched:** `lib/*`, `hooks/*`, `features/*/use*.ts`, `auth/*`, `patients/*`, `routes/router.tsx`, `supabase/`, `packages/`, `docs/`, `analysis/`.

---

## 10. Decisions I need from you

1. **Lenis dependency.** AGENTS.md says "do not add dependencies that are not in the spec." You asked for Lenis explicitly. OK to add `lenis`?
2. **Video rights.** The three numbered clips look like Pexels downloads (free licence). Where are `ner1.mp4` and `NER2.mp4` from? I need to know they are licensed for use on the site.
3. **Intro frequency.** My recommendation is **once per session, skippable**, and the ambient loop after that. Or should it play every visit?
4. **NER copy localisation** (section 7.10). Should I change the marketing locations, names and memory lines to NER ones?
5. **"Eight sisters, eight looms" strip** in the footer (section 7.9). Add it or skip it?
6. **Redraw the setup-loader skyline** as an NER scene (section 8, last row). Do it now or later?

---

## 11. Build order after approval

1. Tokens and the Lenis provider, plus removing the blur surfaces.
2. The motif library and motion primitives.
3. Encode the video, then build the intro sequence in the Hero.
4. The remaining marketing sections.
5. App shell, page header and route transitions.
6. The UI kit (cards, skeleton, empty state, loading, dialog), then Dashboard, Overview and SignIn visuals.
7. Optional items you approve.
8. **Checks:**
   - `npm run lint` and `npm run build` in `web/`, plus `npm run verify` at the root (full output pasted, as AGENTS.md requires; I will report it if the Supabase reset step can't run locally).
   - Manual passes: reduced motion, mobile width, keyboard navigation and focus rings, and Lighthouse performance for the video.

---

## 12. Sources and references

**Your reference clips:** `fontend references/` (5 clips, described in section 3).

**Textiles and motifs**
- Gamosa (Assam): [Wikipedia](https://en.wikipedia.org/wiki/Gamosa) · [Assam Gamosa: motifs](https://assamgamosa.com/various-design-or-patterns-or-motifs-of-assamese-gamosa-assam/) · [IJTK paper](https://or.niscpr.res.in/index.php/IJTK/article/view/17210)
- Naga shawls (Nagaland): [Wikipedia](https://en.wikipedia.org/wiki/Naga_shawl) · [Tribal Cultural Heritage in India](https://indiantribalheritage.org/?p=19937) · [IGNCA: Textiles of Nagaland](https://ignca.gov.in/divisionss/janapada-sampada/northeastern-regional-centre/textiles-of-nagaland/)
- Puanchei / Ngotekherh (Mizoram): [Wikipedia: Puanchei](https://en.wikipedia.org/wiki/Puanchei) · [Incredible India](https://www.incredibleindia.gov.in/en/mizoram/mizo-puanchei)
- Moirang Phee (Manipur): [Wikipedia](https://en.wikipedia.org/wiki/Moirang_phee) · [Imphal Review: Lashing Phee & Rani Phee](https://imphalreviews.in/lashing-phee-and-rani-phee-in-manipuri-textile-history/)
- Risa (Tripura): [Wikipedia](https://en.wikipedia.org/wiki/Tripura_Risa_Textile)
- Ryndia / Eri silk (Meghalaya): [Selvedge](https://www.selvedge.org/blogs/selvedge/ryndia-eri-silk) · [Ryndia: motifs of Meghalaya](https://ryndia.in/motifs-and-textiles-patterns-of-meghalaya/)
- Apatani weaving and overview: [Chalo Hoppo: Living Textiles of NE India](https://chalohoppo.com/loom-to-legacy-the-living-textiles-of-north-east-india/)
- Lepcha Thara (Sikkim): [Incredible India](https://www.incredibleindia.gov.in/en/sikkim/thara-ancient-craft) · [Asia InCH](https://asiainch.org/craft/lepcha-weaving-of-sikkim/)
- Bodo Aronai / Agor (Assam): [Wikipedia: Aronai](https://en.wikipedia.org/wiki/Aronai) · [IIAD: Bodo textiles](https://www.iiad.edu.in/the-circle/bodo-textiles-living-tradition-assam/)
- Muga silk, Japi, Mekhela sador (Assam): [Wikipedia: Muga silk](https://en.wikipedia.org/wiki/Muga_silk) · [Wikipedia: Mekhela sador](https://en.wikipedia.org/wiki/Mekhela_sador) · [IIAD: Assam weaving](https://www.iiad.edu.in/the-circle/tribal-textiles-of-assam-cotton-silk-weaving-handlooms/)

**Natural dyes (the palette)**
- [Garland Magazine: India's natural dyes](https://garlandmag.com/indias-natural-dyes/) · [Sahapedia: Ao dyeing](http://www.sahapedia.org/the-traditional-dyeing-processes-of-the-aos) · [Jamini: natural dyeing](https://www.jaminidesign.com/en/blog/the-art-of-natural-dyeing-in-india-b95.html)

**Lenis**
- [lenis on npm](https://www.npmjs.com/package/lenis) · [lenis/react README](https://github.com/darkroomengineering/lenis/blob/main/packages/react/README.md) · [Motion + Lenis integration discussion](https://github.com/motiondivision/motion/discussions/2913)

**Cultural care note:** some NER motifs carry specific meaning. Lotha shawl
patterns record feasts given; the Aronai is a warrior's honour cloth. So the
library uses the **general geometric vocabulary** of each tradition rather than
reproducing any status-specific cloth, and it credits the source traditions in
the footer and in code comments.
