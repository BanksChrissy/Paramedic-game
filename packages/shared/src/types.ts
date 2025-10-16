/** 12-lead names */
export type LeadName =
  | 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF'
  | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

/** Rhythm authoring “quiz” answers (the 7 steps) */
export interface RhythmQuiz {
  rate: string;
  regularity: string;
  p: string;
  pr: string;
  qrs: string;
  name: string;
  action: string;
}

export type RhythmMode = 'parametric' | 'timeline';

/** Engine output buffer (all leads share uniform dt) */
export interface Samples {
  /** absolute start time (s) of this chunk relative to engine start */
  tStart: number;
  /** seconds between adjacent samples */
  dt: number;
  /** waveform arrays per lead (same length) */
  data: Record<LeadName, Float32Array>;
}

/** RhythmSpec = single source of truth for a rhythm */
export interface RhythmSpec {
  schema: 'com.mama.rhythm/1';
  id: string;
  title: string;
  mode: RhythmMode;
  paperSpeed: 25 | 50;    // mm/s
  gain: 5 | 10;           // mm/mV
  display: { layout: '12' | '6' | 'single'; defaultLead: LeadName };
  quiz: RhythmQuiz;
  generator: {
    sampleRateHz: number;
    durationSec: number;
    noise?: { baselineJitter?: number; wander?: number };
    parametric?: {
      bpm: number;
      pWave?: { present: boolean; amp?: number; widthMs?: number };
      qrs: { widthMs: number; amp: number; shape: 'triangle' | 'gauss' };
      tWave: { amp: number; widthMs: number };
    };
    timeline?: {
      loopSec: number;
      events: Array<{
        t: number;
        lead: LeadName | '*';
        type: 'P' | 'QRS' | 'T' | 'ARTIFACT';
        amp: number;
        widthMs: number;
      }>
    };
    leads: {
      derivation: 'template12';
      template?: Partial<Record<LeadName, { scale?: number; invert?: boolean; offset?: number }>>;
    };
  };
  interventions?: {
    syncCardioversion?: { enabled: boolean; successOn?: ('R' | 'QRS')[]; joules?: number[] };
    defibrillation?: { enabled: boolean; joules?: number[] };
    pacing?: {
      enabled: boolean;
      captureThresholdmA?: number;
      defaultmA?: number;
      defaultRate?: number;
      onCapture?: TransitionRule;
    };
    medications?: Array<{ key: string; doses: string[]; effect: string; latencyMs?: number }>;
    effects?: Record<string, TransitionRule | ModifyRule>;
  };
}

export interface TransitionRule {
  transition: { to: string; prob?: number };
  fallback?: { to: string };
  durationSec?: number;
}

export interface ModifyRule {
  modify: { bpmDelta?: number; ventricularBpmDelta?: number; noiseDelta?: number };
  durationSec?: number;
}

/** Casepack manifest (a bundle of rhythms + labels) */
export interface CasepackManifest {
  schema: 'com.mama.casepack/1';
  id: string;
  title: string;
  version: string;
  rhythms: string[];
  actions?: string; // path to actions JSON within pack
  credits?: string[];
  disclaimer?: string;
}

/** Med bag layout file (neutral – no indications/contraindications) */
export interface MedBag {
  schema: 'com.mama.medbag/1';
  id: string;
  tabs: string[];
  drawers: Array<{
    id: string;
    name: string;
    slots: Array<{ medKey: string; label: string; doses: string[] }>;
  }>;
  tools?: Array<{ id: string; label: string }>;
}

/** Game / engine actions for the interventions system */
export type Action =
  | { type: 'SYNC_CARDIOVERT'; joules: number }
  | { type: 'DEFIB'; joules: number }
  | { type: 'PACE_START'; rate: number; mA: number }
  | { type: 'PACE_ADJUST'; rate?: number; mA?: number }
  | { type: 'PACE_STOP' }
  | { type: 'MED'; medKey: string; dose: string };

/** Intervention state (read by the ECG engine to modify output) */
export interface InterventionState {
  pacing?: { active: boolean; rate: number; mA: number; captured: boolean };
  lastMed?: { medKey: string; dose: string; atMs: number };
  syncEnabled?: boolean;
}
