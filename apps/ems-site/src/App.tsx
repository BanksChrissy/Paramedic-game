import React, { useEffect, useRef } from 'react';
import { UPlotRenderer } from '@paramedic/renderer-uplot';
import { load, reset, sample } from '@paramedic/engine-ecg';
// demo rhythm
import nsr from '@paramedic/casepacks/base-pack/rhythms/nsr_80.json';

export default function App(): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<UPlotRenderer | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    // Set up engine + renderer
    reset();
    load(nsr as any);

    const r = new UPlotRenderer();
    r.mount(hostRef.current, { layout: 'single', lead: 'II', seconds: 6, heightPx: 300 });

    // Stream samples ~every 250ms
    const CHUNK_SEC = 0.25;
    const timer = setInterval(() => {
      const s = sample(CHUNK_SEC);
      r.draw(s);
    }, CHUNK_SEC * 1000);

    rendererRef.current = r;
    return () => {
      clearInterval(timer);
      r.destroy();
    };
  }, []);

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: 16 }}>
      <h2 style={{ margin: '8px 0 16px 0' }}>ECG Renderer Demo — Lead II</h2>
      <div ref={hostRef} />
    </div>
  );
}
