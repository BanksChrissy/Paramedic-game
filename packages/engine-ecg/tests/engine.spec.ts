import { describe, it, expect } from "vitest";
import { load, sample, reset } from "../src/index";
import type { RhythmSpec } from "@paramedic/shared";

const tlSpec: RhythmSpec = {
  schema: "com.mama.rhythm/1",
  id: "bigeminy_tl",
  title: "PVC Bigeminy (timeline)",
  mode: "timeline",
  paperSpeed: 25,
  gain: 10,
  display: { layout: "12", defaultLead: "II" },
  quiz: {
    rate: "varies",
    regularity: "regularly irregular",
    p: "present on sinus beats",
    pr: "normal on sinus beats",
    qrs: "wide PVCs alternating with narrow",
    name: "PVC bigeminy",
    action: "Defibrillate" // label only, no gating
  },
  generator: {
    sampleRateHz: 240,
    durationSec: 10,
    noise: { baselineJitter: 0.003, wander: 0.01 },
    timeline: {
      loopSec: 2.0,
      events: [
        // beat #1 (narrow)
        { t: 0.00, lead: "*", type: "P",   amp: 0.3, widthMs: 90 },
        { t: 0.20, lead: "*", type: "QRS", amp: 1.6, widthMs: 80 },
        { t: 0.50, lead: "*", type: "T",   amp: 0.6, widthMs: 160 },
        // beat #2 PVC (wide)
        { t: 1.00, lead: "*", type: "QRS", amp: 2.2, widthMs: 160 },
        { t: 1.40, lead: "*", type: "T",   amp: 0.5, widthMs: 180 }
      ]
    },
    leads: { derivation: "template12" }
  }
};

describe("timeline mode", () => {
  it("generates 12 leads for timeline rhythms", () => {
    reset();
    load(tlSpec);
    const s = sample(2.0); // one loop
    expect(Object.keys(s.data).length).toBe(12);
    const n = s.data["II"].length;
    expect(n).toBe(480);
  });

  it("has noticeable variance (not flat)", () => {
    load(tlSpec);
    const s = sample(1.0);
    const arr = s.data["V2"];
    let sum=0, sumsq=0;
    for (let i=0;i<arr.length;i++){ sum+=arr[i]; sumsq+=arr[i]*arr[i]; }
    const mean = sum/arr.length;
    const v = sumsq/arr.length - mean*mean;
    expect(v).toBeGreaterThan(0.0005);
  });
});

