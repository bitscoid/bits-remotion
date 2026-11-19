/**
 * Reads audio/words.json at bundle time and turns it into the CUE table.
 *
 * Why at bundle time: `src/` is compiled inside Remotion, which cannot read a
 * file at render time on the browser side. Importing the JSON keeps one source
 * of truth — the ASR output — instead of a hand-copied CUE that drifts from the
 * words the voiceover actually says.
 *
 * Measured trap this avoids: a hand-typed CUE said the word landed at 1.55 s
 * while the ASR put it at 1.65 s. The gate passed against the CUE and the video
 * was 0.1 s early against the audio.
 */
import words from '../audio/words.json';

export type Beat = {
  id: string;
  /** Video seconds where the scene mounts. */
  start: number;
  /** Video seconds where the spoken word lands. */
  wordAt: number;
  /** The whole sentence, for reference. Not drawn. */
  vo: string;
  /**
   * The keyword drawn on screen. ONE word by default, never the sentence.
   * Measured trap: a two-word keyword ("memblokir adenosin") produced a 925 px
   * wide box on a 1080 px canvas, crossing the platform band; the geometry gate
   * caught it. One word at 104 px stays inside 620 px.
   */
  text: string;
  /**
   * A handwritten aside, in the accent family. Two to four words, and it is an
   * annotation — the thing a person would scribble next to the keyword, not a
   * second sentence. Leave it empty and the layer is skipped.
   *
   * Set it in `audio/words.json` per segment as `annotation`.
   */
  annotation: string;
  /**
   * Which example shape this beat uses: 'word' | 'stack' | 'figure'.
   *
   * Default 'word'. A film whose beats are all 'word' is the template this
   * scaffold used to guarantee — mix the shapes when the content allows, or
   * write a fourth shape and add it to the switch in `Timeline.tsx`.
   *
   * Set it in `audio/words.json` per segment as `shape`.
   */
  shape: 'word' | 'stack' | 'figure';
  /**
   * OPTIONAL metainformation. A scene index, a chapter name, a source.
   *
   * Leave it empty and no label is drawn. Measured: a corner label in every
   * beat is one of the three tells that make a film read as a template
   * (GUIDE §6). Most beats do not need one.
   *
   * Set it in `audio/words.json` per segment as `label`.
   */
  label: string;
};

type Segment = {
  start: number;
  end: number;
  text: string;
  text_display?: string;
  /** Optional override for the drawn keyword, set by the human editing the file. */
  keyword?: string;
  /** Optional handwritten aside, drawn in the accent family. */
  annotation?: string;
  /** 'word' | 'stack' | 'figure' — which example shape this beat uses. */
  shape?: 'word' | 'stack' | 'figure';
  /** Optional label; omit it and nothing is drawn. */
  label?: string;
  words: {word: string; start: number; end: number}[];
};

type WordsFile = {vo_delay: number; segments: Segment[]};

const file = words as WordsFile;

/** The one lead-in constant. Never retype it in a scene. */
export const VO_DELAY = file.vo_delay;

/**
 * The drawn keyword for a sentence.
 *
 * `keyword` wins when the human set one. Otherwise the LAST word of the
 * sentence, which is where the reveal lands. One word, not a phrase: a phrase
 * is a caption, and captions belong in the subtitle track, not in the design.
 */
function keywordFor(seg: Segment): string {
  if (seg.keyword) return seg.keyword;
  const w = seg.words ?? [];
  if (!w.length) return seg.text_display ?? seg.text;
  return w[w.length - 1].word;
}

/**
 * Build the cue table from ASR.
 *
 * `start` is the sentence start plus the lead-in — where the cut lands.
 * `wordAt` is the last word's start, offset by the lead-in — where the reveal
 * belongs. The tail is added to the total duration, not to a beat.
 */
export const CUE: Beat[] = file.segments.map((seg, i) => ({
  id: i === 0 ? 'hook' : i === file.segments.length - 1 ? 'close' : `b${i}`,
  start: seg.start + file.vo_delay,
  wordAt: (seg.words?.at(-1)?.start ?? seg.start) + file.vo_delay,
  vo: seg.text,
  text: keywordFor(seg),
  annotation: seg.annotation ?? '',
  // no shape and no label by default: both are choices, not house style.
  // 'word' is the fallback shape only because a beat has to be rendered by
  // something — a film that never sets `shape` gets three of them and should
  // notice.
  shape: seg.shape ?? 'word',
  label: seg.label ?? '',
}));

/**
 * Total video duration in seconds: last word, plus the lead-in, plus a tail.
 * This is the number that goes into `durationInFrames` — never the cap.
 */
export const DURATION_SECONDS = (() => {
  const last = file.segments.at(-1);
  const lastEnd = last ? last.end : 0;
  return Math.ceil(lastEnd + file.vo_delay + 1.5);
})();