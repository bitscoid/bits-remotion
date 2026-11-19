import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import React from 'react';
import type {Beat} from './cue';
import {STYLE} from './style-brief';
import './fonts';

/**
 * One beat. Everything is a pure function of the frame number: no Date.now(),
 * no unseeded Math.random(), no timers.
 *
 * Three type registers in one frame, and that is the design:
 *
 *   meta    the scene id        monospace, tiny, tracked   — words about the video
 *   display the keyword         heavy + rounded            — the word being said
 *   accent  a hand annotation   handwriting, tilted        — a human aside
 *
 * A film that uses one family for all three reads as a template. Pick the
 * pairing by the topic (STYLE.type), not by what happens to be installed.
 *
 * Inside a <Sequence>, useCurrentFrame() is already sequence-local. Do NOT
 * subtract beat.start again — measured: doing so made sinceWord hugely negative
 * and the reveal never fired.
 */
export const Scene: React.FC<{beat: Beat}> = ({beat}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const sinceWord = frame - Math.round((beat.wordAt - beat.start) * fps);

  const reveal = spring({
    frame: Math.max(0, sinceWord),
    fps,
    config: {damping: 200},
    durationInFrames: STYLE.motion.entryFramesMax,
  });

  // Short, separate opacity ramp. Tying opacity to the spring left the text
  // invisible at word+0.10 s, which the gate caught.
  const revealOpacity =
    sinceWord < 0 ? 0 : interpolate(sinceWord, [0, 2], [0, 1], {extrapolateRight: 'clamp'});

  // Continuous drift across the WHOLE beat, in position. A drift that stops
  // after 1 s leaves identical frames for the rest of the beat.
  const driftX = interpolate(frame, [0, durationInFrames], [0, 44], {
    easing: Easing.inOut(Easing.quad),
  });
  const driftY = interpolate(frame, [0, durationInFrames], [0, -18], {
    easing: Easing.inOut(Easing.quad),
  });

  const wordScale = interpolate(reveal, [0, 1], [0.92, 1]);

  const BLOCK_TOP = 1120;
  const BLOCK_HEIGHT = 260;
  const TEXT_TOP = 1158;

  return (
    <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
      {/* the signature device: the word sits on the accent block */}
      <div
        style={{
          position: 'absolute',
          left: 80 + driftX,
          top: BLOCK_TOP + driftY,
          width: 820,
          height: BLOCK_HEIGHT,
          borderRadius: STYLE.graphics.radius,
          backgroundColor: STYLE.palette.accent,
          opacity: sinceWord < 0 ? 0 : 1,
        }}
      />
      <div
        data-qc="display"
        style={{
          position: 'absolute',
          left: 112 + driftX,
          top: TEXT_TOP + driftY,
          color: STYLE.palette.ground,
          fontFamily: `${STYLE.type.displayFamily}, sans-serif`,
          fontWeight: STYLE.type.displayWeight,
          fontSize: 132,
          lineHeight: 1,
          letterSpacing: -2,
          transform: `scale(${wordScale})`,
          transformOrigin: 'left top',
          opacity: revealOpacity,
        }}
      >
        {beat.text}
      </div>

      {/* the annotation hand — tilted, because a hand does not write level */}
      <div
        data-qc="accent"
        style={{
          position: 'absolute',
          left: 140 + driftX,
          top: 1060 + driftY,
          color: STYLE.palette.accent,
          fontFamily: `${STYLE.type.accentFamily}, cursive`,
          fontWeight: STYLE.type.accentWeight,
          fontSize: STYLE.type.accentSizePx,
          lineHeight: 1,
          transform: 'rotate(-4deg)',
          transformOrigin: 'left center',
          // lands just after the card, so the frame is not empty at the cut
          opacity:
            sinceWord < 6 ? 0 : interpolate(sinceWord, [6, 12], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        {beat.annotation}
      </div>

      {/* meta layer — the scene id, present from the cut */}
      <div
        data-qc="meta"
        style={{
          position: 'absolute',
          left: 84,
          top: 220,
          color: STYLE.palette.ink,
          fontFamily: `${STYLE.type.metaFamily}, monospace`,
          fontWeight: STYLE.type.metaWeight,
          fontSize: STYLE.type.metaSizePx,
          letterSpacing: STYLE.type.capTrackingPx,
          textTransform: 'uppercase',
          opacity: interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        {beat.id}
      </div>
    </AbsoluteFill>
  );
};