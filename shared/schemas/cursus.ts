import { z } from 'zod';

/**
 * Validation symétrique client/serveur pour la gestion des cursus.
 * Cf. ST-03.1 — CRUD cursus avec brouillon/publié/archivé.
 *
 * Les messages sont des clés i18n : traduits côté client, renvoyés tels quels
 * côté serveur (le client les traduit à la réception).
 */

export const cursusDomainsEnum = z.enum(['dev-web', 'ingenierie-web', 'ia', 'cybersec', 'autre']);

export const cursusLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export const cursusStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const createCursusSchema = z.object({
  title: z.string().min(1, 'cursus.errors.titleRequired').max(200, 'cursus.errors.titleTooLong'),
  domain: cursusDomainsEnum,
  level: cursusLevelEnum,
  // z.coerce.number() : fonctionne aussi bien depuis un body JSON (déjà number)
  // que depuis un champ HTML input[type=number] (string → coercé en number).
  durationWeeks: z.coerce
    .number({
      required_error: 'cursus.errors.durationRequired',
      invalid_type_error: 'cursus.errors.durationInvalid',
    })
    .int()
    .min(1, 'cursus.errors.durationInvalid')
    .max(52, 'cursus.errors.durationInvalid'),
  description: z.string().max(5000).optional(),
  prerequisites: z.string().max(3000).optional(),
  slug: z
    .string()
    .min(3, 'cursus.errors.slugInvalid')
    .max(80, 'cursus.errors.slugInvalid')
    .regex(/^[a-z0-9-]+$/, 'cursus.errors.slugInvalid')
    .optional(),
});

export const updateCursusSchema = createCursusSchema.partial();

export const listCursusQuerySchema = z.object({
  status: cursusStatusEnum.optional(),
  domain: cursusDomainsEnum.optional(),
  level: cursusLevelEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCursusInput = z.infer<typeof createCursusSchema>;
export type UpdateCursusInput = z.infer<typeof updateCursusSchema>;
export type ListCursusQuery = z.infer<typeof listCursusQuerySchema>;

// ─── Import roadmap.sh (ST-03.7) ─────────────────────────────────────────────

/**
 * Schéma d'un concept roadmap.sh (nœud de la roadmap).
 * Chaque concept deviendra un Module vide avec son titre et l'URL de la source.
 */
export const roadmapConceptSchema = z.object({
  title: z
    .string()
    .min(1, 'cursus.importRoadmap.errors.conceptTitleRequired')
    .max(200, 'cursus.importRoadmap.errors.conceptTitleTooLong')
    .transform((s) =>
      // Sanitize : strip HTML tags, trim whitespace
      s.replace(/<[^>]*>/g, '').trim(),
    ),
  /** URL vers le concept sur roadmap.sh — conservée en métadonnée du module. */
  url: z.string().url().optional(),
});

/**
 * Schéma du body accepté par POST /api/cursus/:id/import-roadmap.
 *
 * Deux modes :
 *  - `roadmapId` : identifiant d'une roadmap du catalogue intégré (frontend, backend, …)
 *  - `concepts`  : liste personnalisée de concepts (JSON collé depuis roadmap.sh)
 *
 * L'un des deux est obligatoire (discriminant via z.union + raffinement).
 */
export const importRoadmapSchema = z
  .object({
    /** ID d'une roadmap du catalogue intégré. */
    roadmapId: z.string().min(1).max(50).optional(),
    /** Titre descriptif de la roadmap source (ex. "Frontend Developer Roadmap"). */
    title: z.string().max(200).optional(),
    /** URL source (pour l'attribution CC BY-SA 4.0). */
    sourceUrl: z.string().url().optional(),
    /** Liste ordonnée de concepts à importer comme modules. */
    concepts: z.array(roadmapConceptSchema).min(1).max(200).optional(),
    /**
     * Comportement si le cursus possède déjà des modules :
     *  - 'replace' : supprime les modules existants avant d'importer
     *  - 'append'  : ajoute à la suite (semaines incrémentées)
     */
    mode: z.enum(['replace', 'append']).default('replace'),
  })
  .refine((d) => d.roadmapId !== undefined || d.concepts !== undefined, {
    message: 'cursus.importRoadmap.errors.roadmapIdOrConceptsRequired',
    path: ['roadmapId'],
  });

export type RoadmapConcept = z.infer<typeof roadmapConceptSchema>;
export type ImportRoadmapInput = z.infer<typeof importRoadmapSchema>;

/** Catalogue intégré : identifiants des roadmaps disponibles sans import JSON. */
export const ROADMAP_CATALOG_IDS = [
  'frontend',
  'backend',
  'devops',
  'cybersecurity',
  'ai-data-scientist',
  'fullstack',
  'react',
  'nodejs',
  'python',
  'docker',
] as const;

export type RoadmapCatalogId = (typeof ROADMAP_CATALOG_IDS)[number];
