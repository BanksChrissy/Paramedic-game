import { describe, it, expect } from 'vitest';
import { zRhythmSpec, validateRhythmSpec, zCasepackManifest } from '../src/zod';

describe('Zod validators', () => {
  it('accepts a valid minimal parametric rhythm', () => {
    const obj = {
      schema: 'com.mama.rhythm/1',
      id: 'nsr_80',
      title: 'NSR 80',
      mode: 'parametric',
      paperSpeed: 25,
      gain: 10,
      display: { layout: '12', defaultLead: 'II' },
      quiz: {
        rate: '60-100',
        regularity: 'Regular',
        p: 'Present',
        pr: '0.12-0.20',
        qrs: 'Narrow (<0.12)',
        name: 'NSR',
        action: 'No_Shock_Asystole'
      },
      generator: {
        sampleRateHz: 240,
        durationSec: 10,
        parametric: {
          bpm: 80,
          pWave: { present: true, amp: 0.3, widthMs: 90 },
          qrs: { widthMs: 80, amp: 2.0, shape: 'triangle' },
          tWave: { amp: 0.6, widthMs: 140 }
        },
        leads: { derivation: 'template12' }
      }
    };
    expect(() => validateRhythmSpec(obj)).not.toThrow();
    expect(zRhythmSpec.safeParse(obj).success).toBe(true);
  });

  it('rejects mismatched mode/generator', () => {
    const bad = {
      schema: 'com.mama.rhythm/1',
      id: 'oops',
      title: 'bad',
      mode: 'parametric',
      paperSpeed: 25,
      gain: 10,
      display: { layout: '12', defaultLead: 'II' },
      quiz: { rate:'',regularity:'',p:'',pr:'',qrs:'',name:'',action:'' },
      generator: {
        sampleRateHz: 240,
        durationSec: 10,
        // missing parametric, has only timeline -> should fail
        timeline: { loopSec: 10, events: [] },
        leads: { derivation: 'template12' }
      }
    };
    expect(zRhythmSpec.safeParse(bad).success).toBe(false);
  });

  it('accepts a basic casepack manifest', () => {
    const ok = {
      schema: 'com.mama.casepack/1',
      id: 'base-pack',
      title: 'Base',
      version: '1.0.0',
      rhythms: ['nsr_80.json']
    };
    expect(zCasepackManifest.safeParse(ok).success).toBe(true);
  });
});
