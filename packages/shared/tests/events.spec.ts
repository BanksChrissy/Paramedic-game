import { describe, it, expect } from 'vitest';
import { createEventBus } from '../src/events';

describe('Typed event bus', () => {
  it('emits and receives typed events', () => {
    const bus = createEventBus();
    let got = 0;

    bus.on('TIMER/TICK', (p) => { got = p.remainingMs; });
    bus.emit('TIMER/TICK', { remainingMs: 4200 });

    expect(got).toBe(4200);
  });
});
