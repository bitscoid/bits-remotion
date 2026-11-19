/**
 * STYLE BRIEF — the ten lines read from the reference (RENDER.md §4).
 * Replace every value. A brief that could describe any motion-graphics video
 * has not been read.
 */
export const STYLE = {
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
    titleToMeta: 6,      // ratio
    capTrackingPx: 6,
  },
  layout: {
    massSide: 'left',
    emptyPercent: 55,
    safeBottom: 0.10,    // portrait platform floor
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
    holds: [{at: 'close', seconds: 2.6}],
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
  device: 'text enters from behind an object',
  floor: 'the ledger line recurs three times, none of them in the reference',
} as const;

export type Beat = {
  id: string;
  /** Video seconds where the scene mounts. */
  start: number;
  /**
   * Video seconds where the spoken word lands. The display text must not be on
   * screen before this — the sync gate (RENDER.md §7) proves it is not.
   * Never equal to `start` unless the scene opens on the word itself.
   */
  wordAt: number;
  vo: string;
  text: string;
};

/**
 * The one absolute-time table. Every scene reads it; scene boundaries come from
 * ASR sentence boundaries, not typed by hand twice.
 *
 * `start` drives the cut. `wordAt` drives the text reveal. Keeping them apart is
 * what makes the sync gate meaningful.
 */
export const CUE: Beat[] = [
  {id: 'hook', start: 1.0, wordAt: 1.55, vo: 'Kenapa kopi bikin ngantuk?', text: 'ngantuk'},
  {id: 'b1', start: 4.2, wordAt: 4.72, vo: 'Kafein memblokir adenosin.', text: 'adenosin'},
  {id: 'close', start: 7.0, wordAt: 7.46, vo: 'Efeknya hilang enam jam.', text: '6 jam'},
];

/** The lead-in before speech starts, read from audio/words.json at build time. */
export const VO_DELAY = 1.0;