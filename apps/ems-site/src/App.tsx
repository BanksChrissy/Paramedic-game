import { ECGPlot } from "@paramedic/renderer-uplot";
import nsr from "@paramedic/casepacks/base-pack/rhythms/nsr_80.json";

export default function App() {
  return (
    <div style={{ background: "black", color: "white", padding: 16 }}>
      <h2>ECG Renderer Demo — NSR 80</h2>
      <ECGPlot rhythm={nsr as any} seconds={6} />
    </div>
  );
}
