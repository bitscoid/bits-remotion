import {PRESETS, resolvePreset, TYPE_PRESET} from './type-presets';

/**
 * STYLE BRIEF — the ten lines read from the reference (RENDER.md §4).
 * Replace every value. A brief that could describe any motion-graphics video
 * has not been read.
 *
 * The beat table is NOT here: it comes from `cue.ts`, which reads the ASR
 * output so the reveal times cannot drift from the words actually spoken.
 */
const preset = resolvePreset(TYPE_PRESET);

export const STYLE = {
  title: 'Kenapa kopi\nbikin ngantuk?',
  palette: {
    ground: '#0B0B0F',   // 70% of frame
    ink: '#F5F1EA',      // 20%
    accent: '#C6492B',   // 10%, one word per frame
  },
  /**
   * Three type roles, three registers. The pairing comes from
   * `src/type-presets.ts`, chosen from the topic in stage 4 — not from a default
   * that ships in this file.
   *
   * Why: a scaffold that shipped one pairing produced that pairing on every
   * topic, because keeping the default is the cheapest path. The preset is
   * required and `qc/type-gate.mjs` fails until it is set.
   */
  type: {
    get displayFamily() {
      return preset.display;
    },
    get displayWeight() {
      return preset.displayWeight;
    },
    get metaFamily() {
      return preset.meta;
    },
    get metaWeight() {
      return preset.metaWeight;
    },
    get accentFamily() {
      return preset.accent;
    },
    get accentWeight() {
      return preset.accentWeight;
    },
    titleToMeta: 6,
    capTrackingPx: 6,
    /** 2.5% of a 1080 short side is 27 px of cap height; at 0.72x that is 38 px. */
    metaSizePx: 38,
    accentSizePx: 58,
  },
  /**
   * Safe margins as fractions of the frame — the one organic content box.
   *
   * On 1080x1920: x 54..1026, y 250..1536 (972x1286, 60% of the frame).
   * Horizontally centred (box centre x 540 = frame centre); vertically 67 px
   * high, because the platforms stack their UI at the bottom. Readable text
   * above y 1382 (28% from the bottom).
   *
   * Organic short-form numbers; see GUIDE.md §2 for the sources.
   *
   * `safeEdge` and `safeReadEdge` are the landscape numbers; the box does not
   * apply to a 16:9 frame.
   */
  layout: {
    massSide: 'left',
    emptyPercent: 55,
    safeTop: 0.13,
    safeBottom: 0.20,
    safeLeft: 0.05,
    safeRight: 0.05,
    safeReadBottom: 0.28,
    /** Action rail: below this height the right edge pulls to 1 - railInsetRight. */
    railFromY: 0.55,
    railInsetRight: 0.12,
    safeEdge: 0.04,
    safeReadEdge: 0.10,
  },
  graphics: {
    radius: 16,
    stroke: 2,
    grainPercent: 4,
    iconGrid: 24,
  },
  motion: {
    entryFramesMin: 8,
    entryFramesMax: 12,
    easing: 'ease-out',
    overshoot: false,
    textGranularity: 'word',
  },
  rhythm: {
    cutMinS: 0.9,
    cutMaxS: 1.4,
    holds: [{at: 'close', seconds: 2.0}],
  },
  sound: {
    sfxOnMaskTransition: true,
    musicDropUnderVerdict: true,
  },
  attention: {
    hookElements: 2,
    chapterCount: 3,
    callback: 'circle',
  },
  /** The one device this build takes from the reference, as a principle. */
  device: 'text enters from behind an object',
  /** The one decision not taken from the reference. */
  floor: 'the ledger line recurs three times, none of them in the reference',
} as const;

/** The music bed. `null` when the film has no music. */
export const MUSIC: {volume: number} | null = null;