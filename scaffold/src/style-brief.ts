/**
 * STYLE BRIEF — the ten lines read from the reference (RENDER.md §4).
 * Replace every value. A brief that could describe any motion-graphics video
 * has not been read.
 *
 * The beat table is NOT here: it comes from `cue.ts`, which reads the ASR
 * output so the reveal times cannot drift from the words actually spoken.
 */
export const STYLE = {
  title: 'Kenapa kopi\nbikin ngantuk?',
  palette: {
    ground: '#0B0B0F',   // 70% of frame
    ink: '#F5F1EA',      // 20%
    accent: '#C6492B',   // 10%, one word per frame
  },
  /**
   * Three type roles, three registers. A film that uses one family for all three
   * reads as a template; the pairing is the design.
   *
   * Pick by the topic, not by what is installed. The catalogue is in
   * `references/RENDER.md` §"Fonts ready to use" — playful, handwriting and
   * editorial registers are listed there, and `@remotion/google-fonts` ships a
   * loader for each family it names.
   *
   * Swap any of these for a different family and add its loader in
   * `src/fonts.ts`. Nothing else in the build assumes a specific face.
   */
  type: {
    /** Display: the word that fills the card. Heavy, rounded, friendly. */
    displayFamily: 'Fredoka',
    displayWeight: 600,
    /** Meta: labels, indices, chips. Small, tracked, technical. */
    metaFamily: 'JetBrains Mono',
    metaWeight: 500,
    /** Accent: a handwritten annotation beside the display word. */
    accentFamily: 'Caveat',
    accentWeight: 700,
    /** Cap-height ratio per family, measured once. Used by the geometry gate. */
    capRatio: {Fredoka: 0.71, 'JetBrains Mono': 0.73, Caveat: 0.66} as Record<string, number>,
    titleToMeta: 6,
    capTrackingPx: 6,
    /** 2.5% of a 1080 short side is 27 px of cap height; at 0.72x that is 38 px. */
    metaSizePx: 38,
    accentSizePx: 58,
  },
  layout: {
    massSide: 'left',
    emptyPercent: 55,
    safeBottom: 0.10,
    safeRight: 0.12,
    safeReadBottom: 0.15,
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