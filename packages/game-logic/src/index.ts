import type { RhythmSpec } from '@paramedic/shared';

/**
 * Basic game state enumeration.  Additional states may be added as the
 * project evolves (e.g. reveal, debrief, next case loading).
 */
export enum GameState {
  Idle = 'idle',
  Showing = 'showing',
  Answering = 'answering',
  Scoring = 'scoring',
  Reveal = 'reveal',
  Next = 'next',
}

/**
 * Placeholder for the core game logic.  This module will implement the
 * finite state machine that orchestrates the question flow, scoring,
 * timing and streak logic.  For now it contains minimal scaffolding.
 */
export class GameManager {
  private state: GameState = GameState.Idle;
  private rhythm?: RhythmSpec;

  /** Load a new rhythm into the game manager. */
  loadCase(spec: RhythmSpec): void {
    this.rhythm = spec;
    this.state = GameState.Showing;
    // TODO: start timer and generate waveform via engine
  }

  /** Proceed to the next step in the Q&A flow. */
  nextStep(): void {
    // TODO: handle transition through 7 steps, scoring and reveal
  }
}