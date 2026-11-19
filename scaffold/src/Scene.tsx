import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import React from 'react';
import type {Beat} from './cue';
import {STYLE} from './style-brief';
import './fonts';

/**
 * BEAT A — "word on a field".
 *
 * This file used to be the only scene shape the scaffold shipped, and every
 * film copied it: an accent block at 1120, the word at 1158, a hand annotation
 * at 1060, a meta label at top-left. Content varied; the frame never did.
 *
 * Now `Scene.tsx` is one option, not the shape. Two more shapes live beside it
 * (`SceneStack.tsx`, `SceneFigure.tsx`), and `Timeline.tsx` picks per beat from
 * `beat.shape`. A film whose beats all use A is a film that never chose.
 *
 * The only things this file insists on are the mechanics every shape needs:
 *   - everything is a pure function of the frame (no clock, no randomness);
 *   - the word lands on the spoken word, from `cue.ts` (never a word count);
 *   - something moves for the whole beat, so no frame pair is identical;
 *   - text sits inside the safe box and clears its contrast floor.
 *
 * Where the word sits, how big it is, whether there is a block behind it and
 * whether a label exists at all — those are the film's decisions.
 *
 * The label is OPTIONAL (`beat.label`). Measured on a real build: a corner
 * label in every beat is one of the three tells that makes a film read as a
 * template. A beat without one is normal.
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

  // Separate opacity ramp: tying opacity to the spring left the text invisible
  // at word+0.10 s, which the sync gate caught.
  const revealOpacity =
    sinceWord < 0 ? 0 : interpolate(sinceWord, [0, 2], [0, 1], {extrapolateRight: 'clamp'});

  // Motion across the WHOLE beat. Drift that stops early leaves duplicate
  // frames and the encoder reports a freeze.
  const driftX = interpolate(frame, [0, durationInFrames], [0, 44], {
    easing: Easing.inOut(Easing.quad),
  });
  const driftY = interpolate(frame, [0, durationInFrames], [0, -18], {
    easing: Easing.inOut(Easing.quad),
  });

  const wordScale = interpolate(reveal, [0, 1], [0.92, 1]);

  /*
   * Placeholder geometry. Overwrite it per film, and vary the zone between
   * neighbours (left / centre / right / edge / full) — three beats parked in
   * the same place is what a slide deck looks like.
   */
  const BLOCK_TOP = 1120;
  const BLOCK_HEIGHT = 260;
  const TEXT_TOP = 1158;

  return (
    <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
      {/* the word sits on an accent field: one mechanism among many */}
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

      {/* the annotation hand — optional; skipped when the beat has none */}
      {beat.annotation ? (
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
            opacity:
              sinceWord < 6
                ? 0
                : interpolate(sinceWord, [6, 12], [0, 1], {extrapolateRight: 'clamp'}),
          }}
        >
          {beat.annotation}
        </div>
      ) : null}

      {/* OPTIONAL label. No label is a normal beat; a fixed corner in every
          beat is a template tell (GUIDE §6). */}
      {beat.label ? (
        <div
          data-qc="meta"
          style={{
            position: 'absolute',
            left: 84 + driftX * 0.4,
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
          {beat.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};