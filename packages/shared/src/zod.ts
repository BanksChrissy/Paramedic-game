import { z } from 'zod';
import type { LeadName } from './types';

export const zLeadName = z.enum(['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']);
export const zLayout = z.enum(['12','6','single']);
export const zRhythmMode = z.enum(['parametric','timeline']);

export const zRhythmQuiz = z.object({
  rate: z.string(),
  regularity: z.string(),
  p: z.string(),
  pr: z.string(),
  qrs: z.string(),
  name: z.string(),
  action: z.string()
});

export const zRhythmSpec = z.object({
  schema: z.literal('com.mama.rhythm/1'),
  id: z.string().min(1),
  title: z.string().min(1),
  mode: zRhythmMode,
  paperSpeed: z.union([z.literal(25), z.literal(50)]),
  gain: z.union([z.literal(5), z.literal(10)]),
  display: z.object({ layout: zLayout, defaultLead: zLeadName }),
  quiz: zRhythmQuiz,
  generator: z.object({
    sampleRateHz: z.number().int().min(120).max(1000),
    durationSec: z.number().min(4).max(30),
    noise: z.object({
      baselineJitter: z.number().min(0).max(0.2).optional(),
      wander: z.number().min(0).max(0.2).optional()
    }).optional(),
    parametric: z.object({
      bpm: z.number().min(20).max(300),
      pWave: z.object({
        present: z.boolean(),
        amp: z.number().min(0).max(5).optional(),
        widthMs: z.number().min(20).max(200).optional()
      }).optional(),
      qrs: z.object({
        widthMs: z.number().min(40).max(200),
        amp: z.number().min(0.2).max(5),
        shape: z.enum(['triangle','gauss'])
      }),
      tWave: z.object({
        amp: z.number().min(0).max(3),
        widthMs: z.number().min(60).max(300)
      })
    }).optional(),
    timeline: z.object({
      loopSec: z.number().min(4).max(30),
      events: z.array(z.object({
        t: z.number().min(0),
        lead: z.union([z.literal('*'), zLeadName]),
        type: z.enum(['P','QRS','T','ARTIFACT']),
        amp: z.number().min(0).max(5),
        widthMs: z.number().min(20).max(400)
      }))
    }).optional(),
    leads: z.object({
      derivation: z.literal('template12'),
      template: z.record(zLeadName, z.object({
        scale: z.number().min(0.1).max(3).optional(),
        invert: z.boolean().optional(),
        offset: z.number().min(-1).max(1).optional()
      })).partial().optional()
    })
  }),
  interventions: z.record(z.any()).optional()
})
.refine(o => (o.mode === 'parametric') === !!o.generator.parametric ||
             (o.mode === 'timeline') === !!o.generator.timeline,
         { message: 'mode must match generator.parametric or generator.timeline' });

export const zCasepackManifest = z.object({
  schema: z.literal('com.mama.casepack/1'),
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  rhythms: z.array(z.string().min(1)).min(1),
  actions: z.string().min(1).optional(),
  credits: z.array(z.string()).optional(),
  disclaimer: z.string().optional()
});

export const zMedBag = z.object({
  schema: z.literal('com.mama.medbag/1'),
  id: z.string().min(1),
  tabs: z.array(z.string().min(1)).min(1),
  drawers: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slots: z.array(z.object({
      medKey: z.string().min(1),
      label: z.string().min(1),
      doses: z.array(z.string().min(1)).min(1)
    })).min(1)
  })).min(1),
  tools: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).optional()
});

/** Small helpers */
export const validateRhythmSpec = (obj: unknown) => zRhythmSpec.parse(obj);
export const validateCasepackManifest = (obj: unknown) => zCasepackManifest.parse(obj);
export const validateMedBag = (obj: unknown) => zMedBag.parse(obj);
