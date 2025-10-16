import type { RhythmSpec, Samples, LeadName } from "@paramedic/shared";

/**
 * Minimal parametric ECG synthesizer:
 * - P/QRS/T primitives (gauss or triangle for QRS)
 * - 12-lead derivation via per-lead scale/invert/offset template
 * - Ring-style time progression with sample() returning contiguous chunks
 *
 * This is intentionally deterministic and allocation-light (one Float32Array
 * per lead per call).
 */

type Ctx = {
  spec: RhythmSpec | null;
  t: number; // seconds since load/reset
};

const ctx: Ctx = { spec: null, t: 0 };

export function load(spec: RhythmSpec): void {
  if (spec.mode !== "parametric" || !spec.generator.parametric) {
    throw new Error("engine-ecg: only parametric mode is supported in Phase 2");
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
  const prm = gen.parametric!;
  const sr = gen.sampleRateHz;
  const N = Math.max(1, Math.floor(seconds * sr));
  const dt = 1 / sr;

  // Defaults / guards
  const bpm = clamp(prm.bpm, 20, 300);
  const pPresent = prm.pWave?.present ?? true;
  const pAmp = prm.pWave?.amp ?? 0.25; // mV baseline-ish
  const pWidth = msToSec(prm.pWave?.widthMs ?? 90);

  const qrsAmp = prm.qrs.amp;
  const qrsWidth = msToSec(prm.qrs.widthMs);
  const qrsShape = prm.qrs.shape; // "triangle" | "gauss"

  const tAmp = prm.tWave.amp;
  const tWidth = msToSec(prm.tWave.widthMs);

  const jitter = gen.noise?.baselineJitter ?? 0; // small random additive noise (mV)
  const wander = gen.noise?.wander ?? 0; // very slow baseline drift (mV)

  const beatPeriod = 60 / bpm;

  // Timing landmarks (fractions of the beat)
  // crude textbook-ish placements: P center at -0.2s from QRS, T at +0.25s
  const qrsCenterOffset = 0; // beat time anchors QRS at phase 0
  const pCenterOffset = -0.20; // seconds relative to QRS
  const tCenterOffset = +0.25;

  // 12-lead derivation template
  const leads: LeadName[] = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];
  const tmpl = buildLeadTemplate(spec);

  // Allocate output arrays
  const out: Record<LeadName, Float32Array> = Object.create(null);
  for (const L of leads) out[L] = new Float32Array(N);

  // Slow wander oscillator
  // A super slow sine to shift baseline slightly over time if enabled
  const wanderFreq = 0.08; // Hz (very slow)
  const twoPi = 2 * Math.PI;

  for (let i = 0; i < N; i++) {
    const tAbs = ctx.t + i * dt;
    // Phase time within beat, centered at QRS around 0
    const beatIndex = Math.floor((tAbs - qrsCenterOffset) / beatPeriod);
    const tQRS0 = beatIndex * beatPeriod + qrsCenterOffset;
    const phaseT = tAbs - tQRS0; // seconds relative to QRS center ~ 0 each beat

    // Component waveforms (single-lead base) in mV
    let v = 0;

    // P-wave
    if (pPresent) {
      const tP = phaseT - pCenterOffset; // when zero => at P center
      v += pAmp * gauss(tP, pWidthToSigma(pWidth));
    }

    // QRS complex
    {
      const tQRS = phaseT; // center at 0
      if (qrsShape === "gauss") {
        v += qrsAmp * gauss(tQRS, widthToSigma(qrsWidth));
      } else {
        v += qrsAmp * triangle(tQRS, qrsWidth);
      }
    }

    // T-wave
    {
      const tT = phaseT - tCenterOffset; // peak after QRS
      v += tAmp * gauss(tT, tWidthToSigma(tWidth));
    }

    // Slow baseline wander
    if (wander > 0) {
      const w = wander * Math.sin(twoPi * wanderFreq * tAbs);
      v += w;
    }

    // Map base v into all 12 leads
    for (const L of leads) {
      const m = tmpl[L];
      // small random jitter per sample if enabled
      const n = jitter > 0 ? (rand2(i, L) * 2 - 1) * jitter : 0;
      out[L][i] = (m.invert ? -1 : 1) * v * m.scale + m.offset + n;
    }
  }

  const res: Samples = {
    tStart: ctx.t,
    dt,
    data: out,
  };

  // advance engine time
  ctx.t += N * dt;
  return res;
}

/* ----------------------- helpers ------------------------ */

function msToSec(ms: number): number { return ms / 1000; }
function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }

/** Gaussian primitive: exp(-(t^2)/(2*sigma^2)) */
function gauss(t: number, sigma: number): number {
  const s2 = sigma * sigma;
  return Math.exp(-(t * t) / (2 * s2));
}

/** Symmetric triangle pulse centered at 0 with base width w (seconds) */
function triangle(t: number, width: number): number {
  const half = width / 2;
  const u = 1 - Math.abs(t) / half;
  return u > 0 ? u : 0;
}

/** Convert desired "width" notion to sigma fits (tuned roughly by eye). */
function widthToSigma(w: number): number { return w / 4.5; }
function pWidthToSigma(w: number): number { return w / 2.5; }
function tWidthToSigma(w: number): number { return w / 3.0; }

/** Deterministic pseudo-random in [0,1) based on index+lead */
function rand2(i: number, lead: string): number {
  // xorshift-ish hash
  let h = 2166136261 ^ i;
  for (let k = 0; k < lead.length; k++) h = (h ^ lead.charCodeAt(k)) * 16777619;
  // Map to 0..1
  return ((h >>> 0) % 10000) / 10000;
}

type LeadTemplate = Record<LeadName, { scale: number; invert: boolean; offset: number }>;

function buildLeadTemplate(spec: RhythmSpec): LeadTemplate {
  const leads: LeadName[] = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];
  const out: LeadTemplate = Object.create(null);

  // sensible defaults for amplitude/polarity (approximate textbook look)
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
