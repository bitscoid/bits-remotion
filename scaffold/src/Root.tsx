import {Composition} from 'remotion';
import React from 'react';
import {Timeline} from './Timeline';

/**
 * One Composition per orientation.
 *
 * The CLI argument is the `id`, never the component name:
 *   remotion render src/index.ts portrait out/video.mp4
 *
 * durationInFrames is the stage-4 number: last beat + ~1.5 s tail, rounded up,
 * then × 30. Replace both values below before the first real render.
 *
 * Measured failure of getting this wrong: the scaffold shipped 1800 frames
 * (60 s) against a 3-beat CUE ending at 7 s, so the closing beat held for 53 s.
 * The contact sheet showed nine near-identical thumbnails and the video was
 * 87% dead. Derive the number from CUE, never from the orientation cap.
 */
export const Root: React.FC = () => (
  <>
    <Composition
      id="portrait"
      component={Timeline}
      durationInFrames={270}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="landscape"
      component={Timeline}
      durationInFrames={270}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);