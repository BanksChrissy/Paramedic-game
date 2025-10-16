import { describe, it, expect } from "vitest";
import { load, sample, reset } from "../src/index";
import type { RhythmSpec } from "@paramedic/shared";

const baseSpec: RhythmSpec = {
  schema: "com.mama.rhythm/1",
  id: "nsr_80",
  title: "NSR 80",
  mode: "parametric",
  paperSpeed: 25,
  gain: 10,
  display: { layout: "12", defaultLead: "II" },
  quiz: {
    rate: "60-100",
    regularity: "Regular",
    p: "Present",
    pr: "0.12-0.20",
    qrs: "Narrow (<0.12)",
    name: "NSR",
    action: "No_Shock_Asystole"
  },
  generator: {
    sampleRateHz: 240,
    durationSec: 10,
    noise: { baselineJitter: 0.005, wander: 0.02 },
    parametric: {
      bpm: 80,
      pWave: { present: true, amp: 0.3, widthMs: 90 },
      qrs: { widthMs: 80, amp: 2.0, shape: "triangle" },
      tWave: { amp: 0.6, widthMs: 140 }
    },
    leads: { derivation: "template12" }
  }
};

describe("engine-ecg parametric sampler", () => {
  it("produces 12 leads with the expected length and dt", () => {
    load(baseSpec);
    const s = sample(2.0); // 2 seconds at 240 Hz => 480 samples
    expect(s.dt).toBeCloseTo(1 / 240, 6);
    for (const L of Object.keys(s.data)) {
      expect(s.data[L as keyof typeof s.data].length).toBe(480);
    }
  });

  it("advances time across calls", () => {
    reset();
    load(baseSpec);
    const a = sample(1.0);
    const b = sample(1.0);
    expect(b.tStart).toBeCloseTo(a.tStart + 1.0, 6);
  });

  it("signal is non-flat and finite", () => {
    load(baseSpec);
    const s = sample(1.0);
    const leadII = s.data["II"];
    let sum = 0, sumsq = 0;
    for (let i = 0; i < leadII.length; i++) {
      const v = leadII[i];
      expect(Number.isFinite(v)).toBe(true);
      sum += v; sumsq += v * v;
    }
    const mean = sum / leadII.length;
    const var_ = sumsq / leadII.length - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.5);
    expect(var_).toBeGreaterThan(0.001);
  });
});
