/**
 * Utilitaires purs pour la CohorteHeatmap.
 * Séparés du composant Vue pour faciliter les tests unitaires.
 *
 * Cf. ST-13.2 — Dashboard formateur heatmap.
 */
import type { ProgressionStatus } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HeatmapTrainee {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  githubHandle: string | null;
}

export interface HeatmapModule {
  id: string;
  moduleId: string;
  position: number;
  dueDate: string;
  title: string;
  week: number;
}

export interface HeatmapCell {
  userId: string;
  cohortModuleId: string;
  status: ProgressionStatus;
  hasAlert: boolean;
}

// ─── Couleurs par statut (design tokens uniquement) ───────────────────────────

/**
 * Classes Tailwind CSS par statut, utilisant UNIQUEMENT des tokens de design system.
 * Aucune couleur en dur, aucun primitif (bg-green-500, etc.).
 */
export const STATUS_COLORS: Record<ProgressionStatus, string> = {
  VALIDE: 'bg-success-bg border-success-solid',
  VALIDE_OVERRIDE: 'bg-success-bg border-success-solid',
  EN_COURS: 'bg-accent border-accent',
  SOUMIS: 'bg-info-bg border-info-solid',
  EN_ALERTE: 'bg-warning-bg border-warning-solid',
  EN_RETARD: 'bg-danger-bg border-danger-solid',
  BLOQUE: 'bg-danger-bg border-danger-solid',
  A_VENIR: 'bg-muted border-border-subtle',
};

/**
 * Motifs CSS supplémentaires pour l'accessibilité daltonienne.
 * La couleur ne doit pas être le seul signal visuel.
 */
export const STATUS_PATTERNS: Record<ProgressionStatus, string> = {
  VALIDE: 'heatmap-pattern-solid',
  VALIDE_OVERRIDE: 'heatmap-pattern-solid heatmap-pattern-override',
  EN_COURS: 'heatmap-pattern-diagonal',
  SOUMIS: 'heatmap-pattern-dots',
  EN_ALERTE: 'heatmap-pattern-warning',
  EN_RETARD: 'heatmap-pattern-cross',
  BLOQUE: 'heatmap-pattern-cross heatmap-pattern-dense',
  A_VENIR: '',
};

/**
 * Icônes Tabler (i-tabler-*) par statut.
 * Complète la couleur pour les utilisateurs daltoniens.
 */
export const STATUS_ICONS: Record<ProgressionStatus, string> = {
  VALIDE: 'i-tabler-check',
  VALIDE_OVERRIDE: 'i-tabler-check-circle',
  EN_COURS: 'i-tabler-loader',
  SOUMIS: 'i-tabler-send',
  EN_ALERTE: 'i-tabler-alert-triangle',
  EN_RETARD: 'i-tabler-clock-x',
  BLOQUE: 'i-tabler-lock',
  A_VENIR: 'i-tabler-circle-dashed',
};

// ─── CSV export ───────────────────────────────────────────────────────────────

/**
 * Génère un CSV client-side avec colonnes : stagiaire, module, semaine, statut, date_limite.
 * Cf. ST-13.2 — TT-13.2.6.
 *
 * @param trainees Liste des stagiaires filtrés
 * @param modules Liste des modules du cursus
 * @param heatmap Cellules de la heatmap (peut être un sous-ensemble)
 */
export function generateCsvContent(
  trainees: HeatmapTrainee[],
  modules: HeatmapModule[],
  heatmap: HeatmapCell[],
): string {
  const escapeField = (s: string): string => {
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const cellIndex = new Map<string, HeatmapCell>();
  for (const cell of heatmap) {
    cellIndex.set(`${cell.userId}:${cell.cohortModuleId}`, cell);
  }

  const header = ['stagiaire', 'module', 'semaine', 'statut', 'date_limite']
    .map(escapeField)
    .join(',');

  const rows: string[] = [header];

  for (const trainee of trainees) {
    const name = trainee.fullName ?? trainee.githubHandle ?? trainee.id;
    for (const mod of modules) {
      const cell = cellIndex.get(`${trainee.id}:${mod.id}`);
      const status = cell?.status ?? 'A_VENIR';
      const row = [name, mod.title, String(mod.week), status, mod.dueDate.slice(0, 10)]
        .map(escapeField)
        .join(',');
      rows.push(row);
    }
  }

  return rows.join('\n');
}

// ─── Statuts helpers ──────────────────────────────────────────────────────────

export const LATE_STATUSES: ProgressionStatus[] = ['EN_RETARD', 'BLOQUE'];
export const ALERT_STATUSES: ProgressionStatus[] = ['EN_ALERTE', ...LATE_STATUSES];
export const VALIDATED_STATUSES: ProgressionStatus[] = ['VALIDE', 'VALIDE_OVERRIDE'];
export const SUBMITTED_STATUSES: ProgressionStatus[] = [
  'SOUMIS',
  ...VALIDATED_STATUSES,
];
