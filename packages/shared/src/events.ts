import mitt from 'mitt';
import type { Action, Samples } from './types';

export type GameStepEvent = { step: 1|2|3|4|5|6|7; remainingMs: number };
export type TimerTickEvent = { remainingMs: number };
export type SamplesEvent = Samples;
export type ActionEvent = Action;

export type Events = {
  'ENGINE/SAMPLES': SamplesEvent;
  'ACTION/APPLIED': ActionEvent;
  'GAME/STEP': GameStepEvent;
  'TIMER/TICK': TimerTickEvent;
};

/** Create a typed emitter instance */
export const createEventBus = () => mitt<Events>();

/** Global (optional) singleton if you want a shared bus */
export const bus = createEventBus();
