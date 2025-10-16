import type { Samples, LeadName } from '@paramedic/shared';

/**
 * This adapter wraps uPlot to provide a simple API for mounting and
 * updating ECG waveforms in a variety of lead layouts.  The full
 * implementation will allow switching between 12‑lead, 6‑lead and
 * single‑lead views, adjusting gain and paper speed, and handling
 * responsive resizing.  For now this module contains a minimal stub.
 */

export interface EcgRenderer {
  /** Mount the renderer into the specified container. */
  mount(container: HTMLElement, opts?: { layout?: '12' | '6' | 'single'; lead?: LeadName }): void;
  /** Draw new sample data. */
  draw(samples: Samples): void;
  /** Change the layout or selected lead. */
  setLayout(layout: '12' | '6' | 'single', lead?: LeadName): void;
  /** Destroy the renderer and free any associated resources. */
  destroy(): void;
}

// Minimal no‑op renderer implementation
export class UPlotRenderer implements EcgRenderer {
  mount(_container: HTMLElement): void {
    // TODO: instantiate uPlot and set up scales/series
  }
  draw(_samples: Samples): void {
    // TODO: update the chart with new data
  }
  setLayout(_layout: '12' | '6' | 'single', _lead?: LeadName): void {
    // TODO: switch views or leads
  }
  destroy(): void {
    // TODO: cleanup chart instance
  }
}