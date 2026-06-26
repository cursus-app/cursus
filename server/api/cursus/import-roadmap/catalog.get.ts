/**
 * GET /api/cursus/import-roadmap/catalog — liste des roadmaps disponibles.
 *
 * Retourne le catalogue statique des roadmaps intégrées.
 * Pas d'authentification requise (lecture seule, données publiques).
 *
 * Cf. ST-03.7 — TT-03.7.3 (cache local des roadmaps).
 */
import { ROADMAP_CATALOG } from '~~/server/data/roadmap-catalog';

export default defineEventHandler(() => {
  // Retourne uniquement les métadonnées (id, title, category, sourceUrl, conceptCount).
  // On n'expose pas les concepts complets ici pour garder la réponse légère.
  return ROADMAP_CATALOG.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    sourceUrl: r.sourceUrl,
    conceptCount: r.concepts.length,
  }));
});
