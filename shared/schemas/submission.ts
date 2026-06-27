// Schémas Zod partagés client/serveur pour les endpoints de soumission de livrable.
// Utilisés dans les endpoints API (validation body) et les formulaires Vue (toTypedSchema).
// Cf. ST-05.2 — Soumission livrable + rapport harnais temps réel.
import { z } from 'zod';

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Format attendu : https://github.com/<org-ou-user>/<repo> */
export const GITHUB_REPO_URL_REGEX =
  /^https:\/\/github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9_.+-]{1,100}\/?$/;

/** Tout URL de déploiement doit commencer par https:// */
export const HTTPS_URL_REGEX = /^https:\/\/.+/;

/** Nombre maximal de soumissions échouées autorisées par semaine glissante. */
export const SUBMISSION_SPAM_LIMIT = 10;

/** Durée de la fenêtre anti-spam (7 jours en ms). */
export const SUBMISSION_SPAM_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

/** Rate limit : 5 soumissions / module / heure. */
export const SUBMISSION_RATE_LIMIT = 5;

// ─── Schéma de soumission ────────────────────────────────────────────────────

export const SubmitDelivrableSchema = z.object({
  repoUrl: z
    .string({ required_error: 'submission.errors.repoUrlRequired' })
    .min(1, { message: 'submission.errors.repoUrlRequired' })
    .regex(GITHUB_REPO_URL_REGEX, { message: 'submission.errors.notGithubUrl' }),
  deployUrl: z
    .string()
    .regex(HTTPS_URL_REGEX, { message: 'submission.errors.deployNotHttps' })
    .optional()
    .or(z.literal('')),
});

export type SubmitDelivrableInput = z.infer<typeof SubmitDelivrableSchema>;

// ─── Réponses API ─────────────────────────────────────────────────────────────

export interface SubmitDelivrableResponse {
  submissionId: string;
  harnessRunId: string;
}

export interface SubmissionWithRun {
  id: string;
  moduleId: string;
  repoUrl: string;
  deployUrl: string | null;
  status: string;
  attemptNumber: number;
  submittedAt: string;
  validatedAt: string | null;
  latestHarnessRun: HarnessRunSummary | null;
}

export interface HarnessRunSummary {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  checksJson: unknown;
  errorMessage: string | null;
  createdAt: string;
}
