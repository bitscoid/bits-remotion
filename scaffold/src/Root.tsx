import {Composition} from 'remotion';
import React from 'react';
import {Timeline} from './Timeline';
import {DURATION_SECONDS} from './cue';

/**
 * One Composition per orientation.
 *
 * The CLI argument is the `id`, never the component name:
 *   remotion render src/index.ts portrait out/<slug>.mp4
 *
 * durationInFrames is derived from the ASR output in `cue.ts` — last word,
 * plus the lead-in, plus a 1.5 s tail — and never from the orientation cap.
 *
 * Measured failure of getting this wrong: an earlier scaffold used 1800 frames
 * (60 s) against a script ending at 7 s, so 87% of the video was one still frame
 * and the contact sheet came back with nine near-identical thumbnails.
 */
const FPS = 30;
const FRAMES = DURATION_SECONDS * FPS;

export const Root: React.FC = () => (
  <>
    <Composition
      id="portrait"
      component={Timeline}
      durationInFrames={FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="landscape"
      component={Timeline}
      durationInFrames={FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);