/**
 * Smriti brand tokens - the single source of truth for colour and type.
 *
 * These values are mirrored into CSS custom properties in `src/index.css`
 * (inside Tailwind v4's `@theme` block) so that they are reachable three ways:
 *
 *   - Tailwind utility classes  →  `bg-terracotta`, `text-ink`, `border-sand`
 *   - CSS custom properties     →  `var(--color-terracotta)`
 *   - TypeScript                →  `tokens.color.terracotta`
 *
 * Reach for a utility class first, the CSS variable second, and this module
 * only where a value has to cross into JavaScript - SVG `stroke` attributes,
 * Recharts series colours, Framer Motion `animate` targets. Raw hex literals
 * do not belong in components; if a colour is missing, add it here and to the
 * `@theme` block in the same change.
 */

export const color = {
  /** Primary brand. Backs every dark section and the primary button. */
  terracotta: '#BC5A3C',
  /** Pressed/hover state for terracotta surfaces, and the hero gradient floor. */
  terracottaDeep: '#AE4F34',
  /** Lifted terracotta - the hero gradient ceiling. */
  terracottaBright: '#C76547',
  /** The logo colour on dark, and the light-section ground. */
  cream: '#F5EAD8',
  /** Lightest surface. Cards on cream, page ground behind dark text. */
  ivory: '#F9F4ED',
  /** Card surface where the section itself is already cream. */
  sand: '#EBDDC5',
  /** Primary text on light surfaces. */
  ink: '#201E1D',
  /** Secondary/body text on light surfaces. */
  body: '#474238',
  /** Tertiary text, labels, timestamps. */
  muted: '#645C50',
  /** Warm accent - the leading edge of every gradient, and "attention" states. */
  gold: '#E8A83F',
  /** Warm accent - the trailing edge of every gradient. */
  coral: '#EF8B7C',
  /**
   * Secondary accent. Deliberately promoted from the single "gentle reminders"
   * tag in the reference landing page to a first-class accent, so the palette
   * reads as terracotta + gold/coral + sage rather than two colours doing
   * every job. Sage carries "calm / on track / nothing needed from you".
   */
  sage: '#56633F',
  /** Sage at surface weight - the ground for a sage-tagged card. */
  sageSoft: '#F0FAE1',
  /** Sage lifted for icon chips on a sage-soft ground. */
  sageBright: '#8FA073',
  /** Terracotta at surface weight - the ground for a warm-tagged card. */
  clay: '#FFF2EB',
  /** Link and eyebrow-label brown. Reads as terracotta but passes on cream. */
  bark: '#8C491A',
  /** Hover for `bark` links. */
  barkDeep: '#643312',
  /** Trouble. Used only where the caregiver must act. */
  alert: '#B3402F',

  /*
   * Northeast natural-dye accents. These colour the textile motifs in
   * `components/ner/` - threads, borders, grounds - and are never used as a
   * page or card surface, which stays on the cream/ivory/terracotta base.
   */
  /** Lac-insect red: the red of the Assamese gamosa border. */
  lac: '#9E2B25',
  /** Assam indigo ("osak" to the Ao Naga): the blue-black of Naga shawls. Threads only. */
  osak: '#24303B',
  /** The natural gold of Muga silk. */
  muga: '#C99A3E',
  /** Undyed Eri / Ryndia "peace silk". The ground motifs are woven on. */
  eri: '#F1E8D6',
  /** Paddy green, for hill and field silhouettes. */
  paddy: '#6B7F3A',
  /** Dawn cloud over the Khasi hills. The ground behind hill layers. */
  mist: '#E4E6E0',
} as const

/** The one gradient in the system. Buttons, progress fills, the wordmark sweep. */
export const gradient = {
  accent: 'linear-gradient(102deg, #E8A83F 0%, #EF9068 58%, #EF8B7C 100%)',
  /** The sweep that crosses the "S" of the wordmark on the last beat. */
  wordmark:
    'linear-gradient(196deg, #E2A03D 2%, #EAA864 20%, #F0917C 44%, rgba(245,234,216,0) 62%)',
  /** The hero's radial ground. */
  hero: 'radial-gradient(120% 90% at 50% 18%, #C76547 0%, #BC5A3C 48%, #AE4F34 100%)',
} as const

export const font = {
  /** Headings, the wordmark, and every numeral. */
  heading: "'Baloo 2', 'Figtree', system-ui, sans-serif",
  /** Body copy and all UI chrome. */
  body: "'Figtree', system-ui, -apple-system, sans-serif",
} as const

/**
 * Chart series order. Recharts and any other data visual pull colours from
 * here in order, so every chart in the app reads as one system.
 */
export const series = [
  color.terracotta,
  color.sage,
  color.gold,
  color.coral,
  color.bark,
  color.sageBright,
] as const

/** Severity → colour, shared by flag badges, device status, and adherence. */
export const statusColor = {
  ok: color.sage,
  info: color.bark,
  moderate: color.gold,
  high: color.alert,
  offline: color.alert,
  stale: color.gold,
  never: color.muted,
} as const

export const tokens = { color, gradient, font, series, statusColor }
export default tokens
