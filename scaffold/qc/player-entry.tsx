/**
 * The in-page harness the gates drive.
 *
 * It exposes three globals:
 *   window.__ready       true once mounted
 *   window.__seekTo(s)   seek to a VIDEO second, wait for the DOM to settle
 *   window.__syncCases   [{text, wordAt}] straight from cue.ts, so the gate
 *                        can never check times the composition does not use
 *
 * The Player seeks synchronously; the short wait lets React commit the new
 * frame before getBoundingClientRect() is read.
 */
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {Timeline} from '../src/Timeline';
import {CUE} from '../src/cue';

const params = new URLSearchParams(location.search);
const durationInFrames = Number(params.get('frames') ?? 270);
const width = Number(params.get('w') ?? 1080);
const height = Number(params.get('h') ?? 1920);
const FPS = 30;

const App: React.FC = () => {
  const ref = React.useRef<PlayerRef>(null);

  React.useEffect(() => {
    window.__seekTo = async (seconds: number) => {
      ref.current?.seekTo(Math.round(seconds * FPS));
      await new Promise((resolve) => setTimeout(resolve, 120));
    };
    window.__syncCases = CUE.map((b) => ({text: b.text, wordAt: b.wordAt}));
    window.__ready = true;
  }, []);

  return (
    <Player
      ref={ref}
      component={Timeline}
      durationInFrames={durationInFrames}
      fps={FPS}
      compositionWidth={width}
      compositionHeight={height}
      style={{width, height}}
    />
  );
};

createRoot(document.getElementById('root')!).render(<App />);

declare global {
  interface Window {
    __ready: boolean;
    __seekTo: (seconds: number) => Promise<void>;
    __syncCases: {text: string; wordAt: number}[];
  }
}