/**
 * Chart colour and geometry.
 *
 * ── Why these are not simply the brand colours ────────────────────────────
 * Smriti's palette is warm and deliberately low-chroma: terracotta, gold,
 * coral, a muted olive sage. That is right for a calm product surface and
 * *wrong* as a categorical data palette — run those five hex values through a
 * colour-vision check against the ivory chart surface and they fail four ways:
 * gold sits outside the usable lightness band, sage is chromatic enough to read
 * as grey, and coral↔gold are only ΔE 11 apart to a reader with normal colour
 * vision, let alone a protanope, where sage↔terracotta collapse to ΔE 4.
 *
 * Two decisions follow, and they are the reason the charts in this app are
 * legible:
 *
 * **1. Almost nothing here is categorical.** Where five things needed
 * comparing — the cognitive domains — they became five small multiples rather
 * than five lines in five colours. That is a better chart anyway, and it means
 * the app never needs a five-hue palette it cannot make safe.
 *
 * **2. The one multi-colour encoding is a status palette, not a series
 * palette.** Medicine outcomes are not arbitrary categories; they are good,
 * middling and bad. `STATUS` below is the validated trio — every check passes
 * against the ivory surface, with the worst adjacent pair at ΔE 8.1 under
 * protanopia. Because that clears the floor rather than the target, these are
 * always shipped with the secondary encoding that makes them safe regardless:
 * a legend, direct labels, and a 2px surface gap between stacked segments.
 *
 * Status colours are reserved. They never stand in for "series 3".
 */

/** The single hue every one-series chart uses. */
export const SERIES = {
  primary: '#BC5A3C',
  /**
   * The raw daily figure under a smoothed line: the same hue, stepped lighter.
   *
   * A flat tint rather than the primary drawn at low opacity, so the legend
   * swatch can be exactly the colour on the chart. An opacity-modified mark
   * whose legend key is the solid hue is a small lie that makes two series look
   * like one.
   */
  primarySoft: '#E0A891',
  /** The rolling-mean overlay. */
  trend: '#8C491A',
} as const

/**
 * Medicine outcome. Validated against surface `#F9F4ED`:
 * lightness band PASS · chroma floor PASS · CVD separation PASS (8.1 protan)
 * · normal-vision floor PASS (16.5) · contrast 3.0 (labels required, provided).
 */
export const STATUS = {
  onTablet: '#4E7A2E',
  byCall: '#B8850F',
  missed: '#B3402F',
} as const

/**
 * Sequential ramp for the calendar heatmap: one hue, light to dark.
 * Never a rainbow; index 0 is "nothing happened", not a colour on the ramp.
 */
export const SEQUENTIAL = ['#EFE7DA', '#EEC9B5', '#DFA189', '#CF7A5D', '#BC5A3C'] as const

/** Recessive chrome. The data is the only thing with weight. */
export const CHART = {
  grid: 'rgba(32, 30, 29, 0.07)',
  axis: 'rgba(32, 30, 29, 0.18)',
  tick: '#645C50',
  surface: '#F9F4ED',
  /** 2px, per the mark spec. Thicker lines read as decoration. */
  strokeWidth: 2,
  dotRadius: 4,
  activeDotRadius: 5,
} as const

export const axisProps = {
  stroke: CHART.axis,
  tickLine: false,
  axisLine: false,
  tick: { fill: CHART.tick, fontSize: 12, fontFamily: 'Figtree, system-ui, sans-serif' },
} as const
