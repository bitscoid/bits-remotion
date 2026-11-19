import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import React from 'react';
import {Scene} from './Scene';
import {CUE, STYLE, VO_DELAY} from './style-brief';

/**
 * The timeline.
 *
 * Two facts measured on this scaffold, both easy to get wrong:
 *
 * 1. <Series.Sequence> stacks children back to back. It does not honour a start
 *    time, so a 1 s lead-in has to be its own <Sequence> or every beat shifts
 *    one second early. Measured symptom: text revealed at 4.72 s appeared at
 *    3.72 s.
 *
 * 2. useCurrentFrame() inside a <Sequence> is ALREADY local to that sequence.
 *    Subtracting `beat.start` again produced a large negative frame, so the
 *    reveal never fired. Measured symptom: opacity stayed 0 for the whole beat.
 *
 * So: durations come from CUE, and each Scene receives the local frame it needs.
 */
export const Timeline: React.FC = () => {
  const {durationInFrames, fps} = useVideoConfig();

  const leadIn = Math.round(VO_DELAY * fps);

  // The title card during the lead-in. Without it the opening second is an
  // empty canvas — measured on the contact sheet: two blank thumbnails.
  const TITLE = 'Kenapa kopi\nbikin ngantuk?';

  // Durations only — Sequence places them consecutively.
  const beats = CUE.map((beat, i) => {
    const from = Math.round(beat.start * fps);
    const to = i + 1 < CUE.length ? Math.round(CUE[i + 1].start * fps) : durationInFrames;
    return {beat, duration: Math.max(1, to - from)};
  });

  return (
    <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
      {/* the lead-in: title card while nothing is narrated */}
      <Sequence durationInFrames={leadIn}>
        <AbsoluteFill style={{backgroundColor: STYLE.palette.ground}}>
          <div
            style={{
              position: 'absolute',
              left: 80,
              top: 860,
              color: STYLE.palette.ink,
              fontFamily: STYLE.type.displayFamily,
              fontWeight: STYLE.type.displayWeight,
              fontSize: 84,
              lineHeight: 1.05,
              letterSpacing: -1,
              whiteSpace: 'pre-line',
            }}
          >
            {TITLE}
          </div>
        </AbsoluteFill>
      </Sequence>

      {beats.map(({beat, duration}) => (
        <Sequence key={beat.id} from={Math.round(beat.start * fps)} durationInFrames={duration}>
          <Scene beat={beat} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};