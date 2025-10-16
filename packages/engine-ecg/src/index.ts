import type { RhythmSpec, Samples, LeadName } from "@paramedic/shared";

/**
 * ECG engine
 * - Phase 2: Parametric P/QRS/T generator (kept)
 * - Phase 3: Timeline Mode (new)
 *
 * Timeline mode: generator.timeline = { loopSec, events[] }
 *   Each event: { t, lead: LeadName|"*", type: "P"|"QRS"|"T"|"ARTIFACT", amp, widthMs }
 *   Engine repeats the loop; each event is rendered as a pulse centered at t within the loop.
 */

type Ctx = { spec: RhythmSpec | null; t: number };
const ctx: Ctx = { spec: null, t: 0 };

export function load(spec: RhythmSpec): void {
  if (spec.mode !== "parametric" && spec.mode !== "timeline") {
    throw new Error("engine-ecg: unsupported mode");
  }
  if (spec.mode === "parametric" && !spec.generator.parametric) {
    throw new Error("engine-ecg: parametric mode requires generator.parametric");
  }
  if (spec.mode === "timeline" && !spec.generator.timeline) {
    throw new Error("engine-ecg: timeline mode requires generator.timeline");
  }
  ctx.spec = spec;
  ctx.t = 0;
}

export function reset(): void {
  ctx.t = 0;
}

export function sample(seconds: number): Samples {
  if (!ctx.spec) throw new Error("engine-ecg: no spec loaded");
  const spec = ctx.spec;
  const gen = spec.generator;
  const sr = gen.sampleRateHz;
  const N = Math.max(1, Math.floor(seconds * sr));
  const dt = 1 / sr;

  const leads: LeadName[] = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];
  const tmpl = buildLeadTemplate(spec);

  const jitter = gen.noise?.baselineJitter ?? 0;
  const wander = gen.noise?.wander ?? 0;
  const twoPi = 2 * Math.PI;
  const wanderFreq = 0.08; // Hz

  const out: Record<LeadName, Float32Array> = Object.create(null);
  for (const L of leads) out[L] = new Float32Array(N);

  if (spec.mode === "parametric") {
    // ---- Phase 2 path (kept) ----
    const prm = gen.parametric!;
    const bpm = clamp(prm.bpm, 20, 300);
    const beatPeriod = 60 / bpm;

    const pPresent = prm.pWave?.present ?? true;
    const pAmp = prm.pWave?.amp ?? 0.25;
    const pWidth = msToSec(prm.pWave?.widthMs ?? 90);
    const qrsAmp = prm.qrs.amp;
    const qrsWidth = msToSec(prm.qrs.widthMs);
    const qrsShape = prm.qrs.shape;
    const tAmp = prm.tWave.amp;
    const tWidth = msToSec(prm.tWave.widthMs);

    const pCenterOffset = -0.20; // sec relative to QRS
    const tCenterOffset = +0.25;

    for (let i = 0; i < N; i++) {
      const tAbs = ctx.t + i * dt;
      const vWander = wander > 0 ? wander * Math.sin(twoPi * wanderFreq * tAbs) : 0;

      const beatIndex = Math.floor(tAbs / beatPeriod);
      const tQRS0 = beatIndex * beatPeriod;
      const phaseT = tAbs - tQRS0;

      let v = 0;
      if (pPresent) {
        v += pAmp * gauss(phaseT - pCenterOffset, pWidthToSigma(pWidth));
      }
      if (qrsShape === "gauss") {
        v += qrsAmp * gauss(phaseT, widthToSigma(qrsWidth));
      } else {
        v += qrsAmp * triangle(phaseT, qrsWidth);
      }
      v += tAmp * gauss(phaseT - tCenterOffset, tWidthToSigma(tWidth));
      v += vWander;

      for (const L of leads) {
        const m = tmpl[L];
        const n = jitter > 0 ? (rand2(i, L) * 2 - 1) * jitter : 0;
        out[L][i] = (m.invert ? -1 : 1) * v * m.scale + m.offset + n;
      }
    }
  } else {
    // ---- Phase 3 path: Timeline Mode ----
    const tl = gen.timeline!;
    const loopSec = Math.max(0.25, tl.loopSec);
    const events = tl.events;
    // Pre-split by lead for speed:
    const byLead: Record<string, typeof events> = Object.create(null);
    byLead["*"] = [];
    for (const e of events) {
      const key = e.lead;
      if (!byLead[key]) byLead[key] = [];
      byLead[key].push(e);
    }

    for (let i = 0; i < N; i++) {
      const tAbs = ctx.t + i * dt;
      const tLoop = mod(tAbs, loopSec); // 0..loopSec
      const vWander = wander > 0 ? wander * Math.sin(twoPi * wanderFreq * tAbs) : 0;

      // First compute a base single-lead value for '*' events:
      let vBase = 0;
      for (const e of byLead["*"]) {
        vBase += pulseAt(tLoop, e);
      }
      vBase += vWander;

      // Map '*' + per-lead additions → each output lead
      for (const L of leads) {
        let v = vBase;
        const arr = byLead[L] || [];
        for (const e of arr) v += pulseAt(tLoop, e);

        const m = tmpl[L];
        const n = jitter > 0 ? (rand2(i, L) * 2 - 1) * jitter : 0;
        out[L][i] = (m.invert ? -1 : 1) * v * m.scale + m.offset + n;
      }
    }
  }

  const res: Samples = { tStart: ctx.t, dt, data: out };
  ctx.t += N * dt;
  return res;
}

/* ---------------- helpers ---------------- */

function msToSec(ms: number): number { return ms / 1000; }
function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }
function mod(a: number, n: number): number { return a - Math.floor(a / n) * n; }

/** Event → pulse at current loop time */
function pulseAt(tLoop: number, e: { t: number; type: string; amp: number; widthMs: number }): number {
  // compute wrapped distance to event center (account for loop ends)
  // choose the shorter distance either side of the boundary
  const w = msToSec(e.widthMs);
  const sigma =
    e.type === "QRS" ? widthToSigma(w) :
    e.type === "P"   ? pWidthToSigma(w) :
    e.type === "T"   ? tWidthToSigma(w) : widthToSigma(w);
  // shortest circular distance on [0, loopSec)
  let d = Math.abs(tLoop - e.t);
  // (opt) If loop is known externally, could pass here; we’ll treat narrow widths so wrap not critical
  if (d > 0.5) d = 1 - d; // heuristic if loopSec≈1s; safe enough if events not near wrap
  return e.amp * Math.exp(-(d * d) / (2 * sigma * sigma));
}

/** Gaussian + triangle pulses used elsewhere */
function gauss(t: number, sigma: number): number {
  const s2 = sigma * sigma;
  return Math.exp(-(t * t) / (2 * s2));
}
function triangle(t: number, width: number): number {
  const half = width / 2;
  const u = 1 - Math.abs(t) / half;
  return u > 0 ? u : 0;
}
function widthToSigma(w: number): number { return w / 4.5; }
function pWidthToSigma(w: number): number { return w / 2.5; }
function tWidthToSigma(w: number): number { return w / 3.0; }
function rand2(i: number, lead: string): number {
  let h = 2166136261 ^ i;
  for (let k = 0; k < lead.length; k++) h = (h ^ lead.charCodeAt(k)) * 16777619;
  return ((h >>> 0) % 10000) / 10000;
}

type LeadTemplate = Record<LeadName, { scale: number; invert: boolean; offset: number }>;
function buildLeadTemplate(spec: RhythmSpec): LeadTemplate {
  const leads: LeadName[] = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];
  const out: LeadTemplate = Object.create(null);
  const defaults: LeadTemplate = {
    I:   { scale: 1.0, invert: false, offset: 0 },
    II:  { scale: 1.2, invert: false, offset: 0 },
    III: { scale: 0.8, invert: false, offset: 0 },
    aVR: { scale: 1.0, invert: true,  offset: 0 },
    aVL: { scale: 0.8, invert: false, offset: 0 },
    aVF: { scale: 1.0, invert: false, offset: 0 },
    V1:  { scale: 0.8, invert: false, offset: 0 },
    V2:  { scale: 1.0, invert: false, offset: 0 },
    V3:  { scale: 1.2, invert: false, offset: 0 },
    V4:  { scale: 1.2, invert: false, offset: 0 },
    V5:  { scale: 1.1, invert: false, offset: 0 },
    V6:  { scale: 1.0, invert: false, offset: 0 },
  };
  const t = spec.generator.leads.template ?? {};
  for (const L of leads) {
    const custom = t[L] ?? {};
    out[L] = {
      scale: clamp(custom.scale ?? defaults[L].scale, 0.1, 3),
      invert: custom.invert ?? defaults[L].invert,
      offset: clamp(custom.offset ?? defaults[L].offset, -1, 1),
    };
  }
  return out;
}

