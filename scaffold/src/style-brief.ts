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
  type: {
    displayFamily: 'Inter',
    metaFamily: 'JetBrains Mono',
    displayWeight: 900,
    metaWeight: 500,
    titleToMeta: 6,
    capTrackingPx: 6,
    /** 2.5% of a 1080 short side is 27 px of cap height; at 0.72x that is 38 px. */
    metaSizePx: 38,
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