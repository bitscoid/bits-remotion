import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import React from 'react';
import type {Beat} from './cue';
import {STYLE} from './style-brief';
import './fonts';

/**
 * BEAT C — "figure", the third example shape.
 *
 * Sometimes the beat is not a word at all: it is a shape, a diagram, a number
 * counting, or an image. A scaffold that only ships word layouts quietly tells
 * the model that every beat is a word — and a film of fourteen words is a
 * caption reel.
 *
 * This shape draws a code-built figure and, if the beat has a label, one small
 * label. No display word. Use it when the narration describes something with a
 * form: a machine, a place, a process, a count.
 *
 * Same mechanics as every shape: pure function of the frame, motion across the
 * whole beat, anything readable inside the safe box.
 */
export const SceneFigure: React.FC<{beat: Beat}> = ({beat}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  // the figure assembles across the first third of the beat, then breathes
  const build = interpolate(frame, [0, Math.max(1, durationInFrames * 0.32)], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const breathe = interpolate(frame, [0, durationInFrames], [1, 1.05], {
    easing: Easing.inOut(Easing.quad),
  });
  const drift = interpolate(frame, [0, durationInFrames], [0, -28], {
    easing: Easing.inOut(Easing.quad),
  });

  // a ring of ticks: cheap, always moving, and readable as "a machine"
  const ticks = Array.from({length: 16}, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + frame * 0.01;
    return {
      x: 540 + Math.cos(angle) * 260,
      y: 780 + Math.sin(angle) * 260,
      o: 0.25 + 0.75 * Math.abs(Math.sin(angle * 2)),
    };
  });

  return (
    <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: drift,
          width: 1080,
          height: 1920,
          transform: `scale(${breathe})`,
          transformOrigin: '50% 40%',
        }}
      >
        {/* core */}
        <div
          style={{
            position: 'absolute',
            left: 420,
            top: 660,
            width: 240,
            height: 240,
            borderRadius: 48 * build,
            border: `5px solid ${STYLE.palette.accent}`,
            backgroundColor: `rgba(255,255,255,${0.04 * build})`,
            opacity: build,
          }}
        />
        {/* the ring of ticks */}
        {ticks.map((t, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: t.x,
              top: t.y,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: STYLE.palette.accent,
              opacity: t.o * build,
            }}
          />
        ))}
      </div>

      {beat.label ? (
        <div
          data-qc="meta"
          style={{
            position: 'absolute',
            left: 140,
            top: 1180,
            color: STYLE.palette.ink,
            fontFamily: `${STYLE.type.metaFamily}, monospace`,
            fontWeight: STYLE.type.metaWeight,
            fontSize: STYLE.type.metaSizePx,
            letterSpacing: STYLE.type.capTrackingPx,
            textTransform: 'uppercase',
            opacity: interpolate(frame, [8, 20], [0, 1], {extrapolateRight: 'clamp'}),
          }}
        >
          {beat.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};