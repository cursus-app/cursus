/**
 * Utilitaire de diff entre deux snapshots de versions de cursus.
 * Utilisé par la page /cursus/:id/versions pour afficher les changements.
 */

export type ModuleDiff = {
  id: string;
  title: string;
  week: number;
  change: 'added' | 'removed' | 'modified' | 'unchanged';
  fields?: string[]; // champs modifiés (uniquement pour change='modified')
};

export type CursusDiff = {
  titleChanged: boolean;
  descriptionChanged: boolean;
  durationChanged: boolean;
  modules: ModuleDiff[];
  modulesAdded: number;
  modulesRemoved: number;
  modulesModified: number;
};

interface SnapshotModule {
  id: string;
  week: number;
  title: string;
  objectives?: string;
  resourcesJson?: unknown;
  deliverableSpecJson?: unknown;
  xpReward?: number;
}

interface CursusSnapshot {
  title?: string;
  description?: string | null;
  durationWeeks?: number;
  modules?: SnapshotModule[];
}

/**
 * Champs de module comparés lors du diff.
 * L'ordre détermine l'ordre d'affichage dans `fields`.
 */
const MODULE_FIELDS: Array<keyof SnapshotModule> = [
  'title',
  'week',
  'objectives',
  'resourcesJson',
  'deliverableSpecJson',
  'xpReward',
];

function asSnapshot(raw: unknown): CursusSnapshot {
  if (raw === null || typeof raw !== 'object') {
    return {};
  }
  return raw as CursusSnapshot;
}

function asModules(raw: unknown): SnapshotModule[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as SnapshotModule[];
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare deux snapshots de versions de cursus et retourne les différences.
 *
 * @param v1Snapshot - Snapshot de la version de base (« ancienne »)
 * @param v2Snapshot - Snapshot de la version à comparer (« nouvelle »)
 */
export function diffCursusVersions(v1Snapshot: unknown, v2Snapshot: unknown): CursusDiff {
  const v1 = asSnapshot(v1Snapshot);
  const v2 = asSnapshot(v2Snapshot);

  const titleChanged = v1.title !== v2.title;
  const descriptionChanged = v1.description !== v2.description;
  const durationChanged = v1.durationWeeks !== v2.durationWeeks;

  const v1Modules = asModules(v1.modules);
  const v2Modules = asModules(v2.modules);

  // Indexer par id pour une comparaison O(n)
  const v1ById = new Map<string, SnapshotModule>(v1Modules.map((m) => [m.id, m]));
  const v2ById = new Map<string, SnapshotModule>(v2Modules.map((m) => [m.id, m]));

  const modules: ModuleDiff[] = [];

  // Parcourir les modules de v1 (unchanged, removed, modified)
  for (const mod of v1Modules) {
    const v2Mod = v2ById.get(mod.id);

    if (!v2Mod) {
      // Présent en v1, absent en v2 → supprimé
      modules.push({ id: mod.id, title: mod.title, week: mod.week, change: 'removed' });
      continue;
    }

    // Présent dans les deux → comparer champ par champ
    const changedFields = MODULE_FIELDS.filter((field) => !jsonEqual(mod[field], v2Mod[field]));

    if (changedFields.length === 0) {
      modules.push({ id: mod.id, title: mod.title, week: mod.week, change: 'unchanged' });
    } else {
      modules.push({
        id: mod.id,
        title: v2Mod.title, // afficher le nouveau titre en cas de renommage
        week: v2Mod.week,
        change: 'modified',
        fields: changedFields as string[],
      });
    }
  }

  // Parcourir les modules de v2 pour trouver les ajouts
  for (const mod of v2Modules) {
    if (!v1ById.has(mod.id)) {
      modules.push({ id: mod.id, title: mod.title, week: mod.week, change: 'added' });
    }
  }

  const modulesAdded = modules.filter((m) => m.change === 'added').length;
  const modulesRemoved = modules.filter((m) => m.change === 'removed').length;
  const modulesModified = modules.filter((m) => m.change === 'modified').length;

  return {
    titleChanged,
    descriptionChanged,
    durationChanged,
    modules,
    modulesAdded,
    modulesRemoved,
    modulesModified,
  };
}
