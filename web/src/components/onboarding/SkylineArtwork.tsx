/**
 * The illustrated scene behind `<SetupCompleteLoader />`.
 *
 * ── What this is, honestly ────────────────────────────────────────────────
 * The reference film (`/brand/setup-loading-reference.mp4`) is a generated
 * illustration: a brick temple hall, a pair of guardian lions, a classical
 * dancer, a rank of gilded chedis and a mountain range, drawn as line art and
 * then washed with colour from left to right. The *mechanics* of that film —
 * composition, left-to-right draw order, the diagonal gold light band riding
 * the reveal edge, the progress bar and the LOADING label — are reproduced
 * exactly in `SetupCompleteLoader`. The **artwork below is a redraw, not a
 * trace.** Hand-authoring path data faithful to that illustration from video
 * frames is not something that can be done to brand standard, and a muddy
 * auto-trace of a compressed frame would look worse than an honest redraw.
 *
 * The geometry is isolated in this one file precisely so that is fixable: when
 * the illustrator's vector source is available, export it with the same
 * viewBox and the same `ELEMENTS` ordering and replace this file. Nothing in
 * `SetupCompleteLoader` needs to change.
 *
 * ── Why one component renders both layers ─────────────────────────────────
 * The loader stacks a colour layer and a line layer and reveals them behind
 * two different clip edges. If the two layers were drawn from separate
 * geometry they would drift apart by a pixel and the wash would look like a
 * misprint. So the same JSX renders twice, with `mode` deciding only how each
 * shape is painted.
 */

export const SKYLINE_VIEWBOX = { width: 1600, height: 660 } as const

/** Where the ground line sits. Everything stands on it. */
const GROUND = 566

const C = {
  line: '#3E3A36',
  lineSoft: '#6E6A64',
  brick: '#9A4B37',
  brickDeep: '#7E3C2C',
  brickDark: '#6E3323',
  gold: '#E3A82F',
  goldDeep: '#C98C1C',
  goldLight: '#F2C75A',
  stone: '#AEB3B8',
  stoneDeep: '#8B9197',
  red: '#C4372F',
  green: '#2F6B4F',
  skin: '#D9A279',
  ivory: '#F4EFE7',
} as const

export type ArtworkMode = 'line' | 'color'

type ShapeProps = {
  mode: ArtworkMode
  d: string
  /** Fill used in the colour layer. Omitted shapes stay unfilled in both. */
  fill?: string
  strokeWidth?: number
  stroke?: string
}

/**
 * One shape. In `line` mode it is an unfilled stroke; in `color` mode it is a
 * flat fill with no stroke, because the line layer sitting on top already
 * supplies every outline.
 */
function Shape({ mode, d, fill, strokeWidth = 2.4, stroke = C.line }: ShapeProps) {
  if (mode === 'color') {
    if (!fill) return null
    return <path d={d} fill={fill} />
  }
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  )
}

/* ────────────────────────────────────────────────────────────────────────
   A chedi / stupa, the shape that repeats across the scene at five sizes.
   Terraced base → bell → banded neck → tapering spire → finial.
   ──────────────────────────────────────────────────────────────────────── */

type StupaProps = {
  mode: ArtworkMode
  cx: number
  baseY?: number
  width: number
  height: number
  fill?: string
  /** Number of rings on the neck. Fewer on the small ones. */
  rings?: number
}

function Stupa({ mode, cx, baseY = GROUND, width, height, fill = C.gold, rings = 6 }: StupaProps) {
  const halfW = width / 2
  const terraceH = height * 0.1
  const bellH = height * 0.26
  const neckH = height * 0.16
  const spireH = height - terraceH * 2 - bellH - neckH

  const yTerrace2 = baseY - terraceH
  const yBell = yTerrace2 - terraceH
  const yNeck = yBell - bellH
  const ySpire = yNeck - neckH
  const yTip = ySpire - spireH

  const bellHalf = halfW * 0.66
  const neckHalf = halfW * 0.3

  return (
    <g>
      {/* two square terraces */}
      <Shape
        mode={mode}
        fill={fill}
        d={`M ${cx - halfW} ${baseY} L ${cx - halfW * 0.9} ${yTerrace2} L ${cx + halfW * 0.9} ${yTerrace2} L ${cx + halfW} ${baseY} Z`}
      />
      <Shape
        mode={mode}
        fill={fill}
        d={`M ${cx - halfW * 0.84} ${yTerrace2} L ${cx - halfW * 0.74} ${yBell} L ${cx + halfW * 0.74} ${yBell} L ${cx + halfW * 0.84} ${yTerrace2} Z`}
      />
      {/* the bell */}
      <Shape
        mode={mode}
        fill={fill}
        d={`M ${cx - bellHalf} ${yBell} C ${cx - bellHalf} ${yBell - bellH * 0.62}, ${cx - neckHalf * 1.5} ${yNeck}, ${cx - neckHalf} ${yNeck} L ${cx + neckHalf} ${yNeck} C ${cx + neckHalf * 1.5} ${yNeck}, ${cx + bellHalf} ${yBell - bellH * 0.62}, ${cx + bellHalf} ${yBell} Z`}
      />
      {/* banded neck */}
      <Shape
        mode={mode}
        fill={fill}
        d={`M ${cx - neckHalf} ${yNeck} L ${cx - neckHalf * 0.72} ${ySpire} L ${cx + neckHalf * 0.72} ${ySpire} L ${cx + neckHalf} ${yNeck} Z`}
      />
      {mode === 'line' &&
        Array.from({ length: rings }, (_, i) => {
          const t = (i + 1) / (rings + 1)
          const y = yNeck - neckH * t
          const w = neckHalf * (1 - 0.28 * t)
          return (
            <path
              key={i}
              d={`M ${cx - w} ${y} L ${cx + w} ${y}`}
              stroke={C.lineSoft}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          )
        })}
      {/* spire */}
      <Shape
        mode={mode}
        fill={fill}
        d={`M ${cx - neckHalf * 0.72} ${ySpire} L ${cx} ${yTip} L ${cx + neckHalf * 0.72} ${ySpire} Z`}
      />
      {/* finial */}
      {mode === 'color' ? (
        <circle cx={cx} cy={yTip - 6} r={halfW * 0.07 + 2} fill={C.goldLight} />
      ) : (
        <circle
          cx={cx}
          cy={yTip - 6}
          r={halfW * 0.07 + 2}
          fill="none"
          stroke={C.line}
          strokeWidth={2}
        />
      )}
    </g>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   A seated guardian lion (chinthe), in profile, facing right.
   Drawn in a local 0–170 × 0–190 box and placed with a transform, so the
   pair can be positioned without re-deriving every coordinate.
   ──────────────────────────────────────────────────────────────────────── */

function GuardianLion({ mode, x, scale = 1 }: { mode: ArtworkMode; x: number; scale?: number }) {
  /**
   * One confident profile silhouette rather than a stack of anatomical parts.
   *
   * Two earlier attempts — an outline with a large head, then overlapping
   * masses with a ring of mane lobes — both read as a bird at this size. What
   * actually makes a lion legible in a 150px skyline figure is a small head
   * with a pointed snout, a heavy chest above vertical foreleg columns, and a
   * spiked mane edge. Detail below that threshold is noise; anything above it
   * fights the flat colour wash.
   */
  const body =
    'M 18 176 L 18 142 ' +
    'C 12 112, 26 84, 54 74 ' + // haunch into the back
    'C 72 68, 86 56, 92 40 ' + // shoulder into the neck
    'C 96 26, 112 18, 126 24 ' + // over the skull
    'C 140 30, 146 42, 142 54 ' + // brow into the face
    'L 162 58 L 158 74 L 138 70 ' + // snout
    'C 130 84, 126 96, 126 110 ' + // chest
    'L 126 176 L 106 176 L 106 118 ' + // near foreleg
    'C 92 128, 74 132, 58 128 ' + // belly
    'L 58 176 Z'

  /** The far foreleg, offset so the figure has depth. */
  const farLeg = 'M 132 176 L 132 116 L 148 116 L 148 176 Z'

  /** A spiked edge down the back of the neck. */
  const mane =
    'M 86 52 L 98 40 L 94 56 L 108 42 L 104 60 L 118 48 L 114 66'

  const tail = 'M 18 148 C 2 140, 2 114, 18 108 C 32 103, 40 115, 35 126'

  return (
    <g transform={`translate(${x} ${GROUND - 190 * scale}) scale(${scale})`}>
      <Shape mode={mode} d={tail} strokeWidth={2.4} />
      <Shape mode={mode} d={farLeg} fill={C.stoneDeep} strokeWidth={2.4} />
      <Shape mode={mode} d={body} fill={C.stone} strokeWidth={2.6} />
      <Shape mode={mode} d={mane} strokeWidth={2.2} stroke={C.line} />

      {mode === 'color' && (
        <>
          {/* the haunch, a shade deeper so the mass reads */}
          <path
            d="M 22 172 C 16 140, 26 100, 54 82 C 68 74, 80 78, 84 90 C 74 116, 66 140, 62 172 Z"
            fill={C.stoneDeep}
            opacity={0.35}
          />
        </>
      )}

      {mode === 'line' && (
        <>
          <circle cx={132} cy={44} r={3} fill={C.line} />
          {/* jaw line */}
          <path
            d="M 140 62 L 156 65"
            stroke={C.line}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          {/* the shoulder curl chinthe carry */}
          <path
            d="M 84 92 C 94 86, 104 90, 106 100"
            stroke={C.lineSoft}
            strokeWidth={1.8}
            fill="none"
          />
        </>
      )}

      {/* plinth */}
      <Shape
        mode={mode}
        d="M 6 190 L 10 176 L 158 176 L 162 190 Z"
        fill={C.stoneDeep}
        strokeWidth={2.4}
      />
    </g>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   The dancer — the one figure in the scene, and the reason it reads as a
   place rather than a skyline. Local 0–150 × 0–250 box.
   ──────────────────────────────────────────────────────────────────────── */

function Dancer({ mode, x, scale = 1 }: { mode: ArtworkMode; x: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${GROUND - 250 * scale}) scale(${scale})`}>
      {/* shawl, sweeping out behind the figure */}
      <Shape
        mode={mode}
        fill={C.green}
        d="M 84 84 C 122 88, 150 112, 146 148 C 143 176, 120 190, 100 182 C 112 168, 116 140, 104 118 C 98 106, 90 96, 84 84 Z"
        strokeWidth={2.2}
      />
      {/* skirt */}
      <Shape
        mode={mode}
        fill={C.red}
        d="M 50 132 L 34 242 L 96 242 L 82 132 Z"
        strokeWidth={2.4}
      />
      {mode === 'line' && (
        <>
          <path d="M 58 150 L 48 240" stroke={C.lineSoft} strokeWidth={1.4} />
          <path d="M 70 150 L 68 240" stroke={C.lineSoft} strokeWidth={1.4} />
          <path d="M 80 152 L 84 240" stroke={C.lineSoft} strokeWidth={1.4} />
        </>
      )}
      {/* sash at the waist */}
      <Shape
        mode={mode}
        fill={C.gold}
        d="M 48 128 L 84 128 L 86 142 L 47 142 Z"
        strokeWidth={2}
      />
      {/* torso */}
      <Shape
        mode={mode}
        fill={C.red}
        d="M 56 70 C 48 88, 46 110, 48 130 L 84 130 C 86 110, 82 88, 74 70 Z"
        strokeWidth={2.4}
      />
      {/* raised arm */}
      <Shape
        mode={mode}
        fill={C.skin}
        d="M 74 76 C 92 68, 106 52, 112 32 L 122 36 C 116 60, 100 80, 80 90 Z"
        strokeWidth={2.2}
      />
      {/* the flexed hand at the top of the raised arm */}
      <Shape
        mode={mode}
        fill={C.skin}
        d="M 112 32 C 116 22, 124 18, 130 22 C 134 25, 132 32, 126 36 Z"
        strokeWidth={2}
      />
      {/* forward arm */}
      <Shape
        mode={mode}
        fill={C.skin}
        d="M 56 78 C 42 86, 32 100, 32 116 L 42 118 C 44 104, 52 94, 62 90 Z"
        strokeWidth={2.2}
      />
      <Shape
        mode={mode}
        fill={C.skin}
        d="M 32 116 C 26 120, 22 128, 26 132 C 30 136, 38 130, 40 122 Z"
        strokeWidth={2}
      />
      {/* head */}
      <Shape
        mode={mode}
        fill={C.skin}
        d="M 52 54 C 52 42, 60 34, 68 34 C 76 34, 82 42, 82 54 C 82 66, 76 72, 68 72 C 60 72, 52 66, 52 54 Z"
        strokeWidth={2.2}
      />
      {/* chada — the tapered headdress */}
      <Shape
        mode={mode}
        fill={C.gold}
        d="M 52 40 L 67 0 L 82 40 Z"
        strokeWidth={2.2}
      />
      {mode === 'line' && (
        <>
          <path d="M 57 28 L 77 28" stroke={C.lineSoft} strokeWidth={1.5} />
          <path d="M 60 18 L 74 18" stroke={C.lineSoft} strokeWidth={1.5} />
        </>
      )}
      {/* feet */}
      <Shape mode={mode} fill={C.skin} d="M 46 242 L 44 252 L 68 252 L 66 242 Z" strokeWidth={2} />
    </g>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   The brick hall on the left — the scene's anchor, and the first thing the
   colour wash reaches.
   ──────────────────────────────────────────────────────────────────────── */

function BrickHall({ mode }: { mode: ArtworkMode }) {
  return (
    <g>
      <Shape mode={mode} fill={C.brick} d={`M 96 ${GROUND} L 96 396 L 316 396 L 316 ${GROUND} Z`} />
      <Shape
        mode={mode}
        fill={C.brickDeep}
        d={`M 82 ${GROUND} L 86 528 L 326 528 L 330 ${GROUND} Z`}
      />
      {/* two roof tiers and a finial */}
      <Shape mode={mode} fill={C.brickDeep} d="M 84 396 L 206 340 L 328 396 Z" />
      <Shape mode={mode} fill={C.brickDark} d="M 126 340 L 206 294 L 286 340 Z" />
      <Shape mode={mode} fill={C.gold} d="M 198 294 L 206 256 L 214 294 Z" />
      {/* arched doorway */}
      <Shape
        mode={mode}
        fill={C.brickDark}
        d={`M 182 ${GROUND} L 182 470 A 24 24 0 0 1 230 470 L 230 ${GROUND} Z`}
      />
      {/* windows */}
      {[112, 150, 246, 284].map((wx) => (
        <Shape
          mode={mode}
          key={wx}
          fill={C.brickDark}
          d={`M ${wx} 494 L ${wx} 434 L ${wx + 24} 434 L ${wx + 24} 494 Z`}
          strokeWidth={2}
        />
      ))}
      {mode === 'line' && (
        <>
          <path d="M 96 418 L 316 418" stroke={C.lineSoft} strokeWidth={1.8} />
          <path d="M 96 512 L 316 512" stroke={C.lineSoft} strokeWidth={1.8} />
        </>
      )}
    </g>
  )
}

/**
 * The mountain range. Line only in both layers — in the reference the peaks
 * stay as outline while everything in front of them takes colour, which is
 * what gives the composition its depth.
 */
function Mountains({ mode }: { mode: ArtworkMode }) {
  if (mode === 'color') return null
  return (
    <g fill="none" stroke={C.lineSoft} strokeWidth={2.2} strokeLinejoin="round">
      <path d={`M 1096 ${GROUND} L 1268 236 L 1336 336 L 1392 268 L 1552 ${GROUND}`} />
      <path d={`M 1372 ${GROUND} L 1500 300 L 1548 366 L 1592 312 L 1600 ${GROUND}`} />
      {/* snow caps */}
      <path d="M 1236 284 L 1268 236 L 1300 284 L 1278 274 L 1258 290 Z" stroke={C.line} />
      <path d="M 1474 340 L 1500 300 L 1528 344 L 1506 334 L 1490 348 Z" stroke={C.line} />
    </g>
  )
}

/**
 * The whole scene.
 *
 * Order matters twice over: it is the painter's order, and it is the order the
 * colour wash reaches things, so it runs strictly left to right.
 */
export function SkylineArtwork({ mode }: { mode: ArtworkMode }) {
  return (
    <g>
      {/* two slim chedis rising behind the hall */}
      <Stupa mode={mode} cx={352} width={96} height={306} rings={5} />
      <Stupa mode={mode} cx={452} width={120} height={392} />

      <BrickHall mode={mode} />

      <GuardianLion mode={mode} x={556} scale={0.92} />
      <GuardianLion mode={mode} x={716} scale={0.92} />

      {/* The mountains sit behind everything on the right, drawn first so the
          chedis in front of them read as in front of them. */}
      <Mountains mode={mode} />

      {/* the great chedi at the centre */}
      <Stupa mode={mode} cx={862} width={88} height={272} rings={5} />
      <Stupa mode={mode} cx={968} width={196} height={476} rings={8} />

      <Dancer mode={mode} x={1076} scale={1} />

      {/* the right-hand cluster, smaller and further away */}
      <Stupa mode={mode} cx={1232} width={66} height={210} rings={4} />
      <Stupa mode={mode} cx={1310} width={52} height={162} rings={3} />
      <Stupa mode={mode} cx={1420} width={126} height={340} rings={7} />
      <Stupa mode={mode} cx={1522} width={58} height={186} rings={4} />

      {/* the ground line the whole scene stands on */}
      {mode === 'line' && (
        <path
          d={`M 40 ${GROUND} L 1560 ${GROUND}`}
          stroke={C.line}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </g>
  )
}

export default SkylineArtwork
