/**
 * Utilitaires serveur pour le traitement des rapports HarnessRun.
 *
 * - parseHarnessReport  : valide et normalise le JSON stocké dans HarnessRun.checksJson
 * - getCheckLabel       : libellé court lisible par un humain (FR / EN)
 * - getCheckHelpMessage : message d'aide pour corriger un échec (FR / EN)
 */
import { z } from 'zod';
import type { HarnessReport, KnownCheckId } from '~~/shared/types/harness';
import { logger } from './logger';

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

const CheckStatusSchema = z.enum(['success', 'failure', 'error', 'skipped', 'pending']);

const CheckResultSchema = z.object({
  check_id: z.string().min(1),
  status: CheckStatusSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  durationMs: z.number().nonnegative().optional(),
});

const HarnessSummarySchema = z.object({
  passed: z.number().nonnegative().int(),
  failed: z.number().nonnegative().int(),
  skipped: z.number().nonnegative().int(),
  total: z.number().nonnegative().int(),
});

const HarnessReportSchema = z.object({
  checks: z.array(CheckResultSchema),
  summary: HarnessSummarySchema,
  completedAt: z.string().optional(),
});

// ─── Rapport vide (fallback en cas de données corrompues) ─────────────────────

function emptyReport(): HarnessReport {
  return {
    checks: [],
    summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
  };
}

// ─── Calcul du summary à partir des checks ────────────────────────────────────

function computeSummary(checks: HarnessReport['checks']): HarnessReport['summary'] {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const check of checks) {
    if (check.status === 'success') {
      passed++;
    } else if (check.status === 'skipped' || check.status === 'pending') {
      skipped++;
    } else {
      // failure | error
      failed++;
    }
  }

  return { passed, failed, skipped, total: checks.length };
}

// ─── Parsing / validation ─────────────────────────────────────────────────────

/**
 * Parse et valide le contenu de HarnessRun.checksJson.
 *
 * - Si la valeur est null / undefined → rapport vide.
 * - Si la valeur est un objet JSON valide mais malformé → rapport vide + log warn.
 * - Si la valeur contient des checks valides, le summary est recalculé à partir
 *   des checks pour garantir la cohérence (on ne fait pas confiance au summary
 *   envoyé par le runner).
 */
export function parseHarnessReport(checksJson: unknown): HarnessReport {
  if (checksJson === null || checksJson === undefined) {
    return emptyReport();
  }

  const result = HarnessReportSchema.safeParse(checksJson);

  if (!result.success) {
    logger.warn(
      {
        event: 'harness.report.parse_error',
        issues: result.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      'checksJson invalide — rapport vide retourné',
    );
    return emptyReport();
  }

  // Recalculer le summary depuis les checks pour garantir la cohérence
  const checks = result.data.checks;
  const summary = computeSummary(checks);

  return {
    checks,
    summary,
    completedAt: result.data.completedAt,
  };
}

// ─── Libellés et messages d'aide (FR / EN) ───────────────────────────────────

type SupportedLocale = 'fr' | 'en';

type CheckI18n = {
  label: Record<SupportedLocale, string>;
  help: Record<SupportedLocale, string>;
};

const CHECK_I18N: Record<KnownCheckId, CheckI18n> = {
  repo_exists_public: {
    label: {
      fr: 'Dépôt public accessible',
      en: 'Public repository accessible',
    },
    help: {
      fr: "Assurez-vous que votre dépôt GitHub est bien public et que l'URL correspond exactement à celle indiquée dans votre soumission.",
      en: 'Make sure your GitHub repository is public and that the URL exactly matches the one provided in your submission.',
    },
  },
  branch_exists: {
    label: {
      fr: 'Branches requises présentes',
      en: 'Required branches present',
    },
    help: {
      fr: "Vérifiez que toutes les branches demandées existent dans votre dépôt (ex : main, feature/login). Vous pouvez les créer avec `git checkout -b <nom-branche>` puis `git push origin <nom-branche>`.",
      en: 'Check that all required branches exist in your repository (e.g. main, feature/login). Create them with `git checkout -b <branch-name>` then `git push origin <branch-name>`.',
    },
  },
  pr_merged: {
    label: {
      fr: 'Pull Request fusionnée',
      en: 'Pull Request merged',
    },
    help: {
      fr: 'Assurez-vous que la Pull Request attendue a bien été fusionnée (statut « Merged ») sur GitHub. Les PR en attente ou fermées sans merge ne sont pas acceptées.',
      en: 'Make sure the expected Pull Request has been merged (status "Merged") on GitHub. Pending or closed-without-merge PRs are not accepted.',
    },
  },
  file_exists: {
    label: {
      fr: 'Fichier obligatoire présent',
      en: 'Required file present',
    },
    help: {
      fr: "Vérifiez que le fichier attendu est présent dans votre dépôt au chemin exact indiqué dans le livrable. N'oubliez pas de committer et pousser le fichier.",
      en: 'Check that the expected file is present in your repository at the exact path specified in the deliverable. Remember to commit and push the file.',
    },
  },
  tests_pass: {
    label: {
      fr: 'Tests unitaires',
      en: 'Unit tests',
    },
    help: {
      fr: 'Lancez vos tests localement avec la commande indiquée dans le livrable. Assurez-vous que tous les tests passent avant de soumettre. Consultez la sortie du harnais pour les détails des échecs.',
      en: 'Run your tests locally using the command specified in the deliverable. Ensure all tests pass before submitting. Check the harness output for failure details.',
    },
  },
  linter_pass: {
    label: {
      fr: 'Linter (qualité du code)',
      en: 'Linter (code quality)',
    },
    help: {
      fr: 'Lancez le linter localement (ex : `npm run lint`) et corrigez toutes les erreurs signalées avant de soumettre. Un avertissement traité comme erreur peut faire échouer ce check.',
      en: 'Run the linter locally (e.g. `npm run lint`) and fix all reported errors before submitting. A warning treated as error can fail this check.',
    },
  },
  url_responds: {
    label: {
      fr: 'URL de déploiement accessible',
      en: 'Deployment URL accessible',
    },
    help: {
      fr: "Vérifiez que votre application est bien déployée et accessible publiquement à l'URL fournie. Attendez quelques minutes si vous venez de déployer, puis re-soumettez.",
      en: 'Verify your application is deployed and publicly accessible at the provided URL. Wait a few minutes if you just deployed, then resubmit.',
    },
  },
  lighthouse_min: {
    label: {
      fr: 'Score Lighthouse minimum',
      en: 'Minimum Lighthouse score',
    },
    help: {
      fr: 'Votre application doit atteindre les seuils Lighthouse indiqués (Performance, Accessibilité, Bonnes pratiques, SEO). Utilisez DevTools Chrome → Onglet Lighthouse pour analyser et corriger les points en échec.',
      en: 'Your application must reach the specified Lighthouse thresholds (Performance, Accessibility, Best Practices, SEO). Use Chrome DevTools → Lighthouse tab to analyse and fix failing points.',
    },
  },
  commits_signed: {
    label: {
      fr: 'Commits signés (GPG)',
      en: 'Signed commits (GPG)',
    },
    help: {
      fr: "Configurez la signature GPG de vos commits : `git config commit.gpgsign true`. Assurez-vous que votre clé GPG est bien liée à votre compte GitHub. Le nombre minimum de commits signés est indiqué dans le livrable.",
      en: 'Configure GPG commit signing: `git config commit.gpgsign true`. Make sure your GPG key is linked to your GitHub account. The minimum number of signed commits is specified in the deliverable.',
    },
  },
};

/**
 * Retourne le libellé court d'un check dans la locale demandée.
 * Si l'identifiant n'est pas reconnu, retourne l'identifiant brut.
 */
export function getCheckLabel(checkId: string, locale: SupportedLocale): string {
  const entry = CHECK_I18N[checkId as KnownCheckId];
  if (!entry) {
    return checkId;
  }
  return entry.label[locale];
}

/**
 * Retourne le message d'aide pour corriger un échec dans la locale demandée.
 * Si l'identifiant n'est pas reconnu, retourne une chaîne vide.
 */
export function getCheckHelpMessage(checkId: string, locale: SupportedLocale): string {
  const entry = CHECK_I18N[checkId as KnownCheckId];
  if (!entry) {
    return '';
  }
  return entry.help[locale];
}

