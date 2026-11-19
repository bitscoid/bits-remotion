/**
 * Font loading, once, before the first frame.
 *
 * `@remotion/google-fonts` fetches at bundle time and caches, so the render has
 * no network dependency at capture time. Each import is ~14 KB of CSS plus the
 * woff2 it names — only import the families this film uses.
 *
 * Why a separate file: a font that is not loaded does not fail, it silently
 * falls back to a system face and every measured width changes. Loading belongs
 * in one place that runs before anything measures text.
 *
 * Measured: `measureText` on an unloaded family returns the fallback's metrics,
 * so the cap-height gate then passes type that is visibly wrong.
 */
import {loadFont as loadFredoka} from '@remotion/google-fonts/Fredoka';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadJetBrainsMono} from '@remotion/google-fonts/JetBrainsMono';

// Call once at module scope: the loader is idempotent and resolves when the
// face is ready to draw.
export const fontsReady = Promise.all([
  loadFredoka('normal', {weights: ['600'], subsets: ['latin']}),
  loadJetBrainsMono('normal', {weights: ['500'], subsets: ['latin']}),
  loadCaveat('normal', {weights: ['700'], subsets: ['latin']}),
]);

/**
 * Alternate pairings, ready to swap in. Uncomment one and change STYLE.type to
 * match — that is the whole change, because nothing else hardcodes a face.
 *
 *   playful, softer     display Baloo 2 · meta Nunito · accent Patrick Hand
 *   playful, bolder     display Shrikhand · meta Poppins · accent Caveat
 *   editorial           display Fraunces · meta JetBrains Mono · accent Caveat
 *   archival            display Libre Caslon Text · meta Space Mono · accent Kalam
 *
 * import {loadFont as loadBaloo} from '@remotion/google-fonts/Baloo2';
 * import {loadFont as loadNunito} from '@remotion/google-fonts/Nunito';
 * import {loadFont as loadPatrickHand} from '@remotion/google-fonts/PatrickHand';
 */