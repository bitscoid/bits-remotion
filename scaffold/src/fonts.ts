/**
 * Font loading, driven by the chosen preset.
 *
 * `@remotion/google-fonts` fetches at bundle time and caches, so a render has no
 * network dependency at capture time. Every family in `PRESETS` has a loader
 * here; only the chosen preset's three are called.
 *
 * Why a separate file: a font that is not loaded does not fail, it silently
 * falls back to a system face and every measured width changes. Loading belongs
 * in one place that runs before anything measures text.
 *
 * The loader signature is generated per family (`Variants[T]`), so the table is
 * typed loosely on purpose — a stricter type would need 16 hand-written
 * generics for no gain. Measured: casting to a Promise-returning type fails,
 * because `loadFont` returns an object with `fontFamily`, `fonts` and
 * `waitUntilDone`, not a promise.
 */
import {loadFont as loadFredoka} from '@remotion/google-fonts/Fredoka';
import {loadFont as loadBaloo} from '@remotion/google-fonts/Baloo2';
import {loadFont as loadShrikhand} from '@remotion/google-fonts/Shrikhand';
import {loadFont as loadFraunces} from '@remotion/google-fonts/Fraunces';
import {loadFont as loadLibreCaslon} from '@remotion/google-fonts/LibreCaslonText';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadSpaceGrotesk} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';

import {loadFont as loadJetBrainsMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadNunito} from '@remotion/google-fonts/Nunito';
import {loadFont as loadPatrickHand} from '@remotion/google-fonts/PatrickHand';
import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import {loadFont as loadSpaceMono} from '@remotion/google-fonts/SpaceMono';
import {loadFont as loadIBMPlexMono} from '@remotion/google-fonts/IBMPlexMono';
import {loadFont as loadKalam} from '@remotion/google-fonts/Kalam';
import {loadFont as loadIndieFlower} from '@remotion/google-fonts/IndieFlower';

import {PRESETS, resolvePreset, TYPE_PRESET} from './type-presets';

/** Every generated loader returns this shape. */
type LoadedFont = {
  fontFamily: string;
  waitUntilDone: () => Promise<void>;
};

type Loader = (style?: string, options?: {weights?: string[]; subsets?: string[]}) => LoadedFont;

const LOADERS = {
  Fredoka: loadFredoka,
  Baloo2: loadBaloo,
  Shrikhand: loadShrikhand,
  Fraunces: loadFraunces,
  LibreCaslonText: loadLibreCaslon,
  Anton: loadAnton,
  SpaceGrotesk: loadSpaceGrotesk,
  Caveat: loadCaveat,
  'JetBrains Mono': loadJetBrainsMono,
  Nunito: loadNunito,
  PatrickHand: loadPatrickHand,
  Poppins: loadPoppins,
  SpaceMono: loadSpaceMono,
  'IBM Plex Mono': loadIBMPlexMono,
  Kalam: loadKalam,
  IndieFlower: loadIndieFlower,
} as unknown as Record<string, Loader>;

const preset = resolvePreset(TYPE_PRESET);

const wanted: [string, number][] = [
  [preset.display, preset.displayWeight],
  [preset.meta, preset.metaWeight],
  [preset.accent, preset.accentWeight],
];

const loaded = wanted.map(([family, weight]) => {
  const loader = LOADERS[family];
  if (!loader) {
    throw new Error(
      `No loader for "${family}". Add its import and a LOADERS entry in src/fonts.ts.\n` +
        `Presets available: ${Object.keys(PRESETS).join(', ')}`,
    );
  }
  return loader('normal', {weights: [String(weight)], subsets: ['latin']});
});

/** Resolves when every face the preset names is ready to draw. */
export const fontsReady: Promise<unknown> = Promise.all(loaded.map((f) => f.waitUntilDone()));