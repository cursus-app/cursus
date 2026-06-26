/**
 * Schémas Zod pour les modules de cursus — validation symétrique client/serveur.
 * Cf. ST-03.2 — Édition modules avec drag-and-drop.
 */
import { z } from 'zod';

export const resourceSchema = z.object({
  label: z.string().min(1, 'modules.errors.resourceLabelRequired'),
  url: z.string().url('modules.errors.resourceUrlInvalid'),
});

export const deliverableSpecSchema = z.object({
  description: z.string().default(''),
  repoRequired: z.boolean().default(true),
  deployRequired: z.boolean().default(false),
});

export const moduleSchema = z.object({
  title: z.string().min(1, 'modules.errors.titleRequired').max(100, 'modules.errors.titleTooLong'),
  week: z.number().int().min(1).max(52).optional(),
  objectives: z.string().max(5000, 'modules.errors.objectivesTooLong').default(''),
  resourcesJson: z.array(resourceSchema).default([]),
  deliverableSpecJson: deliverableSpecSchema.default({
    description: '',
    repoRequired: true,
    deployRequired: false,
  }),
  xpReward: z.number().int().min(0).max(10000).default(100),
});

export type ModuleInput = z.infer<typeof moduleSchema>;

export const updateModuleSchema = moduleSchema.partial();
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

export const moduleBulkOrderSchema = z.object({
  modules: z
    .array(
      z.object({
        id: z.string().uuid(),
        week: z.number().int().min(1).max(52),
      }),
    )
    .min(1)
    .max(100),
});

export type ModuleBulkOrderInput = z.infer<typeof moduleBulkOrderSchema>;
