import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import React from 'react';
import {Scene} from './Scene';
import {CUE, VO_DELAY} from './cue';
import {MUSIC, STYLE} from './style-brief';

/**
 * The timeline.
 *
 * Audio lives HERE, not inside Scene. Measured bug: an <Audio> inside a
 * component mounted once per <Sequence> restarts the file at every beat, so the
 * narration played from second 0 three times and was silent between beats.
 *
 * Two more facts measured on this scaffold:
 *
 * 1. <Series.Sequence> stacks children back to back and ignores a start time,
 *    so a 1 s lead-in has to be its own <Sequence> or every beat shifts early.
 *    Use <Sequence from=...> instead.
 * 2. useCurrentFrame() inside a <Sequence> is already sequence-local.
 *    Subtracting beat.start again makes the reveal never fire.
 */
export const Timeline: React.FC = () => {
  const {durationInFrames, fps} = useVideoConfig();

  const music = MUSIC;
  const leadIn = Math.round(VO_DELAY * fps);

  const beats = CUE.map((beat, i) => {
    const from = Math.round(beat.start * fps);
    const to = i + 1 < CUE.length ? Math.round(CUE[i + 1].start * fps) : durationInFrames;
    return {beat, from, duration: Math.max(1, to - from)};
  });

  return (
    <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
      {/* one narration track for the whole film */}
      <Audio src={staticFile('voiceover.wav')} volume={1} />

      {/* one music bed, ducked under speech */}
      {music ? (
        <Audio
          src={staticFile('music.wav')}
          volume={(f) =>
            interpolate(f, [0, fps, fps * 2], [0, music.volume, music.volume], {
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}

      {/* the lead-in: title card while nothing is narrated */}
      <Sequence durationInFrames={leadIn}>
        <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
          <div
            data-qc="title"
            style={{
              position: 'absolute',
              left: 128,
              top: 560,
              color: STYLE.palette.ink,
              fontFamily: STYLE.type.displayFamily,
              fontWeight: STYLE.type.displayWeight,
              fontSize: 72,
              lineHeight: 1.08,
              letterSpacing: -1,
              whiteSpace: 'pre-line',
            }}
          >
            {STYLE.title}
          </div>
        </AbsoluteFill>
      </Sequence>

      {beats.map(({beat, from, duration}) => (
        <Sequence key={beat.id} from={from} durationInFrames={duration}>
          <Scene beat={beat} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};