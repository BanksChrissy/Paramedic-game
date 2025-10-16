import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { sample, load, reset } from "@paramedic/engine-ecg";
import type { RhythmSpec } from "@paramedic/shared";

interface ECGPlotProps {
  rhythm: RhythmSpec;
  seconds?: number;
}

export default function ECGPlot({ rhythm, seconds = 6 }: ECGPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    reset();
    load(rhythm);

    const sr = rhythm.generator.sampleRateHz;
    const N = seconds * sr;
    const dt = 1 / sr;

    const opts: uPlot.Options = {
      width: 900,
      height: 300,
      series: [
        {},
        {
          label: "Lead II",
          stroke: "#00ff66",
          width: 1,
        },
      ],
      axes: [
        {},
        { values: (u, vals) => vals.map(v => v.toFixed(1)) },
      ],
    };

    const data = [new Array(N).fill(0), new Array(N).fill(0)];
    const u = new uPlot(opts, data, containerRef.current!);
    plotRef.current = u;

    let idx = 0;
    const chunkSec = 0.25; // refresh every 250 ms
    const chunkSize = Math.floor(sr * chunkSec);

    const timer = setInterval(() => {
      const s = sample(chunkSec);
      const arr = s.data["II"];
      for (let i = 0; i < chunkSize; i++) {
        data[0][idx % N] = s.tStart + i * dt;
        data[1][idx % N] = arr[i];
        idx++;
      }
      u.setData(data);
    }, chunkSec * 1000);

    return () => {
      clearInterval(timer);
      u.destroy();
    };
  }, [rhythm]);

  return <div ref={containerRef} />;
}
