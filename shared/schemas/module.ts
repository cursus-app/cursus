/**
 * Schémas Zod pour les modules de cursus — validation symétrique client/serveur.
 * Cf. ST-03.2 — Édition modules avec drag-and-drop.
 * Cf. ST-03.4 — Spécification livrable hebdo + critères harnais.
 */
import { z } from 'zod';

export const resourceSchema = z.object({
  label: z.string().min(1, 'modules.errors.resourceLabelRequired'),
  url: z.string().url('modules.errors.resourceUrlInvalid'),
});

// ─── Checks harnais ───────────────────────────────────────────────────────────

/**
 * Paramètres du check "branches" : liste de noms de branches attendues dans le repo.
 * Validation stricte des noms (pas de chemin absolu, pas de caractères dangereux).
 */
export const branchesCheckParamsSchema = z.object({
  branches: z
    .array(
      z
        .string()
        .min(1, 'modules.checks.params.branchNameRequired')
        .max(100, 'modules.checks.params.branchNameTooLong')
        .regex(/^[a-zA-Z0-9._/-]+$/, 'modules.checks.params.branchNameInvalid'),
    )
    .min(1, 'modules.checks.params.branchesRequired')
    .max(20, 'modules.checks.params.branchesTooMany'),
});

/**
 * Paramètres du check "lighthouse_score" : score minimal (0–100) et catégories.
 */
export const lighthouseCheckParamsSchema = z.object({
  minScore: z
    .number()
    .int()
    .min(0, 'modules.checks.params.minScoreMin')
    .max(100, 'modules.checks.params.minScoreMax'),
  categories: z
    .array(z.enum(['performance', 'accessibility', 'best-practices', 'seo']))
    .min(1, 'modules.checks.params.categoriesRequired')
    .max(4),
});

/**
 * Paramètres du check "deploy_up" : URL de déploiement optionnelle.
 * Si absente, le harnais récupère l'URL depuis le payload de soumission.
 */
export const deployUpCheckParamsSchema = z.object({
  url: z.string().url('modules.checks.params.urlInvalid').optional(),
});

/**
 * Check discriminé par type. Chaque type impose ses propres paramètres.
 * Les checks sans paramètres utilisent `params: z.object({})` pour homogénéité.
 */
export const harnessCheckSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('branches'),
    enabled: z.boolean(),
    params: branchesCheckParamsSchema,
  }),
  z.object({
    type: z.literal('linter_pass'),
    enabled: z.boolean(),
    params: z.object({}),
  }),
  z.object({
    type: z.literal('readme_present'),
    enabled: z.boolean(),
    params: z.object({}),
  }),
  z.object({
    type: z.literal('signed_commits'),
    enabled: z.boolean(),
    params: z.object({}),
  }),
  z.object({
    type: z.literal('tests_pass'),
    enabled: z.boolean(),
    params: z.object({}),
  }),
  z.object({
    type: z.literal('deploy_up'),
    enabled: z.boolean(),
    params: deployUpCheckParamsSchema,
  }),
  z.object({
    type: z.literal('lighthouse_score'),
    enabled: z.boolean(),
    params: lighthouseCheckParamsSchema,
  }),
]);

export type HarnessCheckType =
  | 'branches'
  | 'linter_pass'
  | 'readme_present'
  | 'signed_commits'
  | 'tests_pass'
  | 'deploy_up'
  | 'lighthouse_score';

export type HarnessCheck = z.infer<typeof harnessCheckSchema>;
export type BranchesCheckParams = z.infer<typeof branchesCheckParamsSchema>;
export type LighthouseCheckParams = z.infer<typeof lighthouseCheckParamsSchema>;
export type DeployUpCheckParams = z.infer<typeof deployUpCheckParamsSchema>;

// ─── Spec livrable ────────────────────────────────────────────────────────────

/**
 * Spécification complète du livrable d'un module.
 *
 * - `description` : consignes en Markdown (sanitizées avant affichage).
 * - `repoRequired` : soumission doit inclure une URL GitHub.
 * - `deployRequired` : soumission doit inclure une URL de déploiement.
 * - `checks` : liste des critères harnais. Max 15 (au-delà : warning temps de run).
 *
 * Cf. ST-03.4 — ST-06.2 pour la bibliothèque de checks complète.
 */
export const deliverableSpecSchema = z.object({
  description: z.string().max(10_000, 'modules.errors.deliverableDescTooLong').default(''),
  repoRequired: z.boolean().default(true),
  deployRequired: z.boolean().default(false),
  checks: z
    .array(harnessCheckSchema)
    .max(15, 'modules.checks.errors.tooMany')
    .default([]),
});

export type DeliverableSpec = z.infer<typeof deliverableSpecSchema>;

// ─── Module ───────────────────────────────────────────────────────────────────

export const moduleSchema = z.object({
  title: z.string().min(1, 'modules.errors.titleRequired').max(100, 'modules.errors.titleTooLong'),
  week: z.number().int().min(1).max(52).optional(),
  objectives: z.string().max(5000, 'modules.errors.objectivesTooLong').default(''),
  resourcesJson: z.array(resourceSchema).default([]),
  deliverableSpecJson: deliverableSpecSchema.default({
    description: '',
    repoRequired: true,
    deployRequired: false,
    checks: [],
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
