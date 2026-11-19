/**
 * Type presets — the register is chosen from the topic, and the build refuses to
 * run until it is.
 *
 * Why a table instead of three free-text fields: measured on this project, a
 * scaffold that shipped one pairing (Inter + JetBrains Mono) produced that
 * pairing on every topic, because the cheapest path is to keep the default. A
 * list of options does not change behaviour; a required choice with a failing
 * gate does.
 *
 * Read the topic's register first (stage 4), pick the preset, and say which one
 * in the delivery message. `qc/type-gate.mjs` fails on an empty or unknown key.
 *
 * Adding a preset is safe: append an entry, then point `fonts.ts` at its
 * families. Nothing else assumes a specific face.
 */

export type TypePreset = {
  display: string;
  displayWeight: number;
  meta: string;
  metaWeight: number;
  accent: string;
  accentWeight: number;
  /** Cap-height ratio per family, as a fraction of the font size. */
  capRatio: Record<string, number>;
  /** One line describing when this preset is right. */
  when: string;
};

export const PRESETS = {
  /** Light, friendly, children, food, everyday science. */
  'playful-rounded': {
    display: 'Fredoka',
    displayWeight: 600,
    meta: 'JetBrains Mono',
    metaWeight: 500,
    accent: 'Caveat',
    accentWeight: 700,
    capRatio: {Fredoka: 0.71, 'JetBrains Mono': 0.73, Caveat: 0.66},
    when: 'a light or friendly topic: food, habits, kids, everyday science',
  },

  /** Warmer and bolder than playful-rounded; still soft. */
  'playful-bold': {
    display: 'Baloo2',
    displayWeight: 700,
    meta: 'Nunito',
    metaWeight: 700,
    accent: 'PatrickHand',
    accentWeight: 400,
    capRatio: {Baloo2: 0.69, Nunito: 0.71, PatrickHand: 0.68},
    when: 'an energetic topic that still wants warmth: fitness, productivity, how-to',
  },

  /** High personality, one title per film. */
  'poster-display': {
    display: 'Shrikhand',
    displayWeight: 400,
    meta: 'Poppins',
    metaWeight: 600,
    accent: 'Caveat',
    accentWeight: 700,
    capRatio: {Shrikhand: 0.70, Poppins: 0.70, Caveat: 0.66},
    when: 'a culture, music or opinion piece where the headline is the design',
  },

  /** Editorial, magazine, history, long-form argument. */
  editorial: {
    display: 'Fraunces',
    displayWeight: 700,
    meta: 'JetBrains Mono',
    metaWeight: 500,
    accent: 'Caveat',
    accentWeight: 700,
    capRatio: {Fraunces: 0.70, 'JetBrains Mono': 0.73, Caveat: 0.66},
    when: 'an essay, history or analysis: the voice is written, not spoken',
  },

  /** Archival, documentary, legal, finance. */
  archival: {
    display: 'LibreCaslonText',
    displayWeight: 700,
    meta: 'SpaceMono',
    metaWeight: 700,
    accent: 'Kalam',
    accentWeight: 700,
    capRatio: {LibreCaslonText: 0.68, SpaceMono: 0.71, Kalam: 0.68},
    when: 'financial, legal or historical material that must feel sourced',
  },

  /** Hard, loud, statistics, hooks, sport. */
  'kinetic-impact': {
    display: 'Anton',
    displayWeight: 400,
    meta: 'JetBrains Mono',
    metaWeight: 500,
    accent: 'Caveat',
    accentWeight: 700,
    capRatio: {Anton: 0.73, 'JetBrains Mono': 0.73, Caveat: 0.66},
    when: 'a statistic, a record, a hook — the number is the argument',
  },

  /** Technical, data, developer, infrastructure. */
  technical: {
    display: 'SpaceGrotesk',
    displayWeight: 700,
    meta: 'IBMPlexMono',
    metaWeight: 500,
    accent: 'Kalam',
    accentWeight: 700,
    capRatio: {SpaceGrotesk: 0.72, IBMPlexMono: 0.72, Kalam: 0.68},
    when: 'systems, code, data or infrastructure: precision over warmth',
  },

  /** Personal, diary, mental health, reflective. */
  handwritten: {
    display: 'Caveat',
    displayWeight: 700,
    meta: 'Nunito',
    metaWeight: 600,
    accent: 'IndieFlower',
    accentWeight: 400,
    capRatio: {Caveat: 0.66, Nunito: 0.71, IndieFlower: 0.68},
    when: 'a first-person or reflective piece where the voice is a person, not a brand',
  },
} as const satisfies Record<string, TypePreset>;

export type PresetKey = keyof typeof PRESETS;

export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

/**
 * The chosen register. MUST be set before the first render.
 *
 * Left empty on purpose: an unset preset fails the build with the list of
 * valid keys, which is louder than a silent default and is the whole point of
 * this file. Set it from the topic in stage 4.
 */
export const TYPE_PRESET: PresetKey | '' = '';

export function resolvePreset(key: PresetKey | ''): TypePreset {
  if (!key) {
    throw new Error(
      'TYPE_PRESET is not set. Pick the topic\'s register in stage 4 and set it in src/type-presets.ts:\n  ' +
        PRESET_KEYS.join('\n  '),
    );
  }
  const hit = PRESETS[key as PresetKey];
  if (!hit) {
    throw new Error(`TYPE_PRESET "${key}" is not a preset. Valid keys:\n  ${PRESET_KEYS.join('\n  ')}`);
  }
  return hit;
}