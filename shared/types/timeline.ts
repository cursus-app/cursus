/**
 * Types partagés pour la timeline et le panneau d'actions de la fiche stagiaire 360.
 * Cf. ST-13.3 — Fiche stagiaire détaillée (vue 360).
 */

export type TimelineEventType = 'submission' | 'harness_run' | 'alert' | 'audit';

export interface SubmissionEventData {
  moduleId: string;
  moduleName?: string | null;
  status: string;
  repoUrl: string;
  overriddenById?: string | null;
  overrideReason?: string | null;
}

export interface HarnessRunEventData {
  submissionId: string;
  status: string;
  githubWorkflowUrl?: string | null;
  errorMessage?: string | null;
}

export interface AlertEventData {
  kind: string;
  severity: string;
  resolvedAt?: string | null;
}

export interface AuditEventData {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  diff?: unknown;
}

/**
 * Union discriminée — le champ `type` narrow automatiquement `data` après
 * un `if (event.type === 'submission')` ou `switch (event.type)`.
 * Évite tout `as XxxEventData` dans les composants consommateurs.
 */
export type TimelineEvent =
  | { id: string; type: 'submission'; timestamp: string; data: SubmissionEventData }
  | { id: string; type: 'harness_run'; timestamp: string; data: HarnessRunEventData }
  | { id: string; type: 'alert'; timestamp: string; data: AlertEventData }
  | { id: string; type: 'audit'; timestamp: string; data: AuditEventData };

export interface TimelineResponse {
  events: TimelineEvent[];
  nextCursor: string | null;
}

export interface OverrideRequest {
  cohorteId: string;
  submissionId: string;
  action: 'validate' | 'extend';
  reason: string;
  extendDays?: number;
}

export interface StagiaireProfile {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  isDisabled: boolean;
  kpis: {
    cursusProgress: number;
    activeAlerts: number;
    lastActivity: string | null;
  };
}
