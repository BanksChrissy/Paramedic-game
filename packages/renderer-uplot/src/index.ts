import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { Samples, LeadName } from '@paramedic/shared';

/**
 * This adapter wraps uPlot to provide a simple API for mounting and
 * updating ECG waveforms. Phase 4 implements a single-lead sweep (Lead II)
 * and stores plumbing for multi-lead layouts (12/6/single) for later.
 */

export interface EcgRenderer {
  /** Mount the renderer into the specified container. */
  mount(
    container: HTMLElement,
    opts?: {
      layout?: '12' | '6' | 'single';
      lead?: LeadName;        // active lead when layout==='single'
      seconds?: number;       // visible window seconds (default 6)
      heightPx?: number;      // chart height (default 280)
      widthPx?: number;       // chart width  (default container.clientWidth)
    }
  ): void;

  /** Draw new sample data (append to the sweep window). */
  draw(samples: Samples): void;

  /** Change the layout or selected lead. */
  setLayout(layout: '12' | '6' | 'single', lead?: LeadName): void;

  /** Destroy the renderer and free resources. */
  destroy(): void;
}

type SeriesBuffers = {
  x: number[];     // time axis, seconds
  y: number[];     // amplitude (mV)
  cap: number;     // ring capacity
  idx: number;     // write index
};

export class UPlotRenderer implements EcgRenderer {
  private u?: uPlot;
  private container?: HTMLElement;
  private layout: '12' | '6' | 'single' = 'single';
  private lead: LeadName = 'II';
  private seconds = 6;
  private heightPx = 280;
  private widthPx?: number;
  private buf?: SeriesBuffers;

  mount(container: HTMLElement, opts?: {
    layout?: '12' | '6' | 'single';
    lead?: LeadName;
    seconds?: number;
    heightPx?: number;
    widthPx?: number;
  }): void {
    this.container = container;
    this.layout = opts?.layout ?? 'single';
    this.lead = opts?.lead ?? 'II';
    this.seconds = Math.max(2, Math.floor(opts?.seconds ?? 6));
    this.heightPx = opts?.heightPx ?? 280;
    this.widthPx = opts?.widthPx;

    // Start with empty ring buffers; size finalized on first draw() when dt is known
    this.buf = undefined;

    // Create an empty uPlot instance with placeholder data; we’ll set real data on first draw()
    const width = this.widthPx ?? container.clientWidth || 900;
    const u = new uPlot(
      {
        width,
        height: this.heightPx,
        // Disable mouse pan/zoom for now; we want a continuous sweep
        plugins: [],
        legend: { show: false },
        axes: [
          // x axis (time) — we hide grid labels for now; gridlines come later
          { show: false },
          // y axis (mV)
          {
            show: true,
            label: 'mV',
            values: (_, vals) => vals.map(v => v.toFixed(1)),
          },
        ],
        series: [
          {}, // x
          {
            label: `Lead ${this.lead}`,
            width: 1,
            // keep default color; you can style via CSS later
          },
        ],
      },
      // placeholder arrays; will be resized at first draw()
      [[], []],
      container
    );

    this.u = u;
  }

  draw(samples: Samples): void {
    if (!this.u) return;
    if (!this.buf) {
      // Initialize ring capacity from desired visible seconds and dt
      const cap = Math.max(32, Math.floor(this.seconds / samples.dt));
      this.buf = {
        x: Array(cap).fill(0),
        y: Array(cap).fill(0),
        cap,
        idx: 0,
      };
    }

    const { x, y, cap } = this.buf;
    const leadArr = samples.data[this.lead];
    const dt = samples.dt;

    // Append chunk into ring buffer
    for (let i = 0; i < leadArr.length; i++) {
      const pos = this.buf.idx % cap;
      x[pos] = samples.tStart + i * dt;
      y[pos] = leadArr[i];
      this.buf.idx++;
    }

    // Reorder ring into chronological order for uPlot
    const start = this.buf.idx >= cap ? (this.buf.idx % cap) : 0;
    const outX: number[] = new Array(cap);
    const outY: number[] = new Array(cap);
    for (let k = 0; k < cap; k++) {
      const s = (start + k) % cap;
      outX[k] = x[s];
      outY[k] = y[s];
    }

    this.u.setData([outX, outY]);
  }

  setLayout(layout: '12' | '6' | 'single', lead?: LeadName): void {
    // For Phase 4 we only render single-lead, but we keep the API and
    // hot-swap the lead label + buffers so you can call this live.
    this.layout = layout;
    if (lead) this.lead = lead;
    if (!this.u) return;
    // Update series label
    const s = this.u.series[1];
    // @ts-expect-error uPlot types do not expose runtime label setter; we rebuild options by hack:
    (s as any).label = `Lead ${this.lead}`;
  }

  destroy(): void {
    if (this.u) this.u.destroy();
    this.u = undefined;
    this.buf = undefined;
    this.container = undefined;
  }
}
