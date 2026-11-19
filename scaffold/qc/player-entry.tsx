/**
 * The sync-gate host. Bundled by qc/make-player-host.mjs with esbuild into
 * work/player.js, then mounted by work/player-host.html.
 *
 * It exposes exactly two globals:
 *   window.__ready       true once mounted
 *   window.__seekTo(s)   seek to a VIDEO second, wait for the DOM to settle
 *
 * The Player seeks synchronously; the 120 ms wait lets React commit the new
 * frame before getBoundingClientRect() is read.
 */
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {Timeline} from '../src/Timeline';

const params = new URLSearchParams(location.search);
const durationInFrames = Number(params.get('frames') ?? 1800);
const width = Number(params.get('w') ?? 1080);
const height = Number(params.get('h') ?? 1920);
const FPS = 30;

const App: React.FC = () => {
  const ref = React.useRef<PlayerRef>(null);

  React.useEffect(() => {
    (window as unknown as {__seekTo: (s: number) => Promise<void>}).__seekTo = async (seconds: number) => {
      ref.current?.seekTo(Math.round(seconds * FPS));
      await new Promise((resolve) => setTimeout(resolve, 120));
    };
    (window as unknown as {__ready: boolean}).__ready = true;
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
  }
}