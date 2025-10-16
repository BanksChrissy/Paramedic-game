import type { RhythmSpec, Samples } from '@paramedic/shared';

/**
 * Placeholder for the ECG engine.  A complete implementation will
 * synthesise 12‑lead ECG samples from parametric and timeline rhythm
 * definitions.  For now this module exports a few no‑op functions.
 */

/** Load a rhythm specification into the engine. */
export function load(_spec: RhythmSpec): void {
  // TODO: implement loading of parametric or timeline specifications
}

/** Sample the next segment of ECG data. */
export function sample(_seconds: number): Samples {
  // TODO: generate realistic data; return empty arrays for now
  return {
    tStart: 0,
    dt: 0,
    data: {
      I: new Float32Array(),
      II: new Float32Array(),
      III: new Float32Array(),
      aVR: new Float32Array(),
      aVL: new Float32Array(),
      aVF: new Float32Array(),
      V1: new Float32Array(),
      V2: new Float32Array(),
      V3: new Float32Array(),
      V4: new Float32Array(),
      V5: new Float32Array(),
      V6: new Float32Array(),
    },
  };
}

/** Reset the engine to its initial state. */
export function reset(): void {
  // TODO: reset internal state when implemented
}