import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import React from 'react';
import type {Beat} from './cue';
import {STYLE} from './style-brief';
import './fonts';

/**
 * BEAT B — "stack", the second of three example shapes.
 *
 * A different frame from `Scene.tsx` on purpose: no accent block, the word sits
 * on the ground colour, three short lines stack under it, and a rule draws
 * itself across the width as the beat runs. Different zone (centre), different
 * density (medium), different mechanism (accumulation).
 *
 * It exists so the scaffold cannot be read as "the beat is a word on a block".
 * Replace it, keep it as variety, or delete it — a film with only shape A in
 * every beat is a film that never chose.
 *
 * Same mechanics as every shape: pure function of the frame, reveal on the
 * spoken word, motion across the whole beat, text inside the safe box.
 */
export const SceneStack: React.FC<{beat: Beat}> = ({beat}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const sinceWord = frame - Math.round((beat.wordAt - beat.start) * fps);
  const reveal = spring({
    frame: Math.max(0, sinceWord),
    fps,
    config: {damping: 180},
    durationInFrames: STYLE.motion.entryFramesMax,
  });
  const revealOpacity =
    sinceWord < 0 ? 0 : interpolate(sinceWord, [0, 3], [0, 1], {extrapolateRight: 'clamp'});

  // letters rise from below, one after another, and never reflow: the line is
  // laid out once at final width and the mask clips it
  const lines = beat.text.split(' ');

  const rule = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 700,
          width: 888,
          overflow: 'hidden',
        }}
      >
        {lines.map((line, i) => {
          const stagger = interpolate(
            Math.max(0, sinceWord - i * 3),
            [0, STYLE.motion.entryFramesMax],
            [0, 1],
            {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)},
          );
          return (
            <div key={i} style={{overflow: 'hidden'}}>
              <div
                data-qc={i === 0 ? 'display' : 'body'}
                style={{
                  color: i === 0 ? STYLE.palette.accent : STYLE.palette.ink,
                  fontFamily: `${STYLE.type.displayFamily}, sans-serif`,
                  fontWeight: STYLE.type.displayWeight,
                  fontSize: i === 0 ? 118 : 88,
                  lineHeight: 1.05,
                  letterSpacing: -1,
                  transform: `translateY(${(1 - stagger) * 110}%)`,
                  opacity: stagger,
                }}
              >
                {line}
              </div>
            </div>
          );
        })}
      </div>

      {/* a rule that draws itself — motion for the whole beat, and it belongs to
          this shape's idea rather than being a global progress bar */}
      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 1180,
          height: 6,
          width: 888,
          borderRadius: 3,
          backgroundColor: STYLE.palette.accent,
          opacity: 0.5,
          transformOrigin: 'left center',
          transform: `scaleX(${rule})`,
        }}
      />

      {beat.label ? (
        <div
          data-qc="meta"
          style={{
            position: 'absolute',
            right: 96,
            top: 300,
            color: STYLE.palette.ink,
            fontFamily: `${STYLE.type.metaFamily}, monospace`,
            fontWeight: STYLE.type.metaWeight,
            fontSize: STYLE.type.metaSizePx,
            letterSpacing: STYLE.type.capTrackingPx,
            textTransform: 'uppercase',
            opacity: interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'}),
          }}
        >
          {beat.label}
        </div>
      ) : null}

      <div style={{position: 'absolute', left: 96, top: 1240, opacity: revealOpacity * 0.001}}>
        {reveal}
      </div>
    </AbsoluteFill>
  );
};