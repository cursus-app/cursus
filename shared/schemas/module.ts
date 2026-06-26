/**
 * Schémas Zod pour les modules de cursus — validation symétrique client/serveur.
 * Cf. ST-03.2 — Édition modules avec drag-and-drop.
 * Cf. ST-03.3 — Gestion ressources d'un module.
 * Cf. ST-03.4 — Spécification livrable hebdo + critères harnais.
 */
import { z } from 'zod';

// ─── Resource ────────────────────────────────────────────────────────────────

export const resourceTypeEnum = z.enum(['link', 'video', 'pdf', 'article', 'doc', 'course']);
export type ResourceType = z.infer<typeof resourceTypeEnum>;

export const resourceStatusEnum = z.enum(['active', 'broken', 'checking']);
export type ResourceStatus = z.infer<typeof resourceStatusEnum>;

/**
 * Schéma d'une ressource stockée dans `Module.resourcesJson`.
 * L'id est un uuid v4 généré côté client à la création.
 */
export const resourceSchema = z.object({
  id: z.string().uuid('module.errors.resource.idInvalid'),
  url: z
    .string()
    .url('module.errors.resource.urlInvalid')
    .max(2000, 'module.errors.resource.urlTooLong'),
  title: z
    .string()
    .min(1, 'module.errors.resource.titleRequired')
    .max(100, 'module.errors.resource.titleTooLong'),
  type: resourceTypeEnum,
  /** Durée estimée en minutes (0 = non renseignée). */
  duration: z.number().int().min(0).max(600).optional(),
  /** Ordre d'affichage (0-based). */
  position: z.number().int().min(0),
  /** Statut de disponibilité, mis à jour par le job nocturne. */
  status: resourceStatusEnum.default('active'),
  // OG metadata (récupérée de manière asynchrone via l'endpoint /og)
  ogTitle: z.string().max(500).nullable().optional(),
  ogImage: z.string().url().max(2000).nullable().optional(),
  ogDescription: z.string().max(1000).nullable().optional(),
});

export type Resource = z.infer<typeof resourceSchema>;

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
  checks: z.array(harnessCheckSchema).max(15, 'modules.checks.errors.tooMany').default([]),
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

// ─── Module update ────────────────────────────────────────────────────────────

/**
 * PATCH /api/cursus/:id/modules/:moduleId
 * Mise à jour partielle d'un module.
 */
export const updateModuleSchema = z.object({
  title: z
    .string()
    .min(1, 'module.errors.titleRequired')
    .max(200, 'module.errors.titleTooLong')
    .optional(),
  week: z.coerce
    .number({ invalid_type_error: 'module.errors.weekInvalid' })
    .int()
    .min(1, 'module.errors.weekInvalid')
    .max(52, 'module.errors.weekInvalid')
    .optional(),
  objectives: z.string().max(10_000, 'module.errors.objectivesTooLong').optional(),
  resources: z.array(resourceSchema).max(20, 'module.errors.tooManyResources').optional(),
  deliverableSpecJson: deliverableSpecSchema.optional(),
  xpReward: z.coerce
    .number({ invalid_type_error: 'module.errors.xpRewardInvalid' })
    .int()
    .min(0)
    .max(10_000)
    .optional(),
});

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

// ─── OG scraping ─────────────────────────────────────────────────────────────

/**
 * POST /api/cursus/:id/modules/:moduleId/og
 * Déclenche le scraping des métadonnées OG pour une URL.
 */
export const ogScrapeRequestSchema = z.object({
  url: z
    .string()
    .url('module.errors.resource.urlInvalid')
    .max(2000, 'module.errors.resource.urlTooLong'),
});

export type OgScrapeRequest = z.infer<typeof ogScrapeRequestSchema>;

export const ogMetadataSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable(),
  image: z.string().url().nullable(),
  description: z.string().nullable(),
});

export type OgMetadata = z.infer<typeof ogMetadataSchema>;
