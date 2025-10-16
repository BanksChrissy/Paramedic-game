import type { RhythmSpec } from '@paramedic/shared';

/**
 * Placeholder module implementing the intervention engine.  This engine
 * applies pacing, cardioversion, defibrillation and medication actions to
 * the ECG engine according to the rules defined in rhythm specifications.
 */

export type Action =
  | { type: 'SYNC_CARDIOVERT'; joules: number }
  | { type: 'DEFIB'; joules: number }
  | { type: 'PACE_START'; rate: number; mA: number }
  | { type: 'PACE_ADJUST'; rate?: number; mA?: number }
  | { type: 'MED'; name: string; dose: string };

/** Apply an intervention action to the current engine state. */
export function applyAction(_action: Action, _spec: RhythmSpec): void {
  // TODO: implement pacing capture, cardiovert/defib transitions, medication effects
}

/** Undo the last applied action. */
export function undo(): void {
  // TODO: restore previous engine state
}

/** Reset all interventions for the current case. */
export function resetInterventions(): void {
  // TODO: clear intervention state to match the beginning of the case
}