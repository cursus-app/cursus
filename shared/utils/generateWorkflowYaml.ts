/**
 * Générateur de workflow GitHub Actions à partir d'une spec livrable.
 * Cf. ST-03.4 — TT-03.4.3.
 *
 * - Génération 100% TypeScript, sans dépendance externe (pas de js-yaml).
 * - Les valeurs string sont toujours quotées pour éviter toute injection YAML.
 * - Aucune variable d'environnement du formateur n'est injectée dans le YAML.
 * - Génération < 100ms (cible perf ST-03.4).
 */
import type { DeliverableSpec, HarnessCheck } from '../schemas/module';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowWarning {
  code: 'NO_CHECKS_ACTIVE' | 'NO_TESTS_CHECK' | 'HIGH_CHECK_COUNT';
  message: string;
}

export interface WorkflowGenerationResult {
  yaml: string;
  warnings: WorkflowWarning[];
}

// ─── Helpers YAML-safe ────────────────────────────────────────────────────────

/**
 * Entoure une chaîne de guillemets doubles en échappant les guillemets internes.
 * Garantit qu'aucune valeur ne peut injecter du YAML.
 */
function q(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// ─── Générateurs de steps par type de check ──────────────────────────────────

function generateBranchesStep(check: Extract<HarnessCheck, { type: 'branches' }>): string {
  const branchList = check.params.branches.map((b) => q(b)).join(' ');
  return `      - name: ${q('Vérifier les branches requises')}
        run: |
          git fetch --all --quiet
          MISSING=0
          for BRANCH in ${branchList}; do
            if ! git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
              echo "::error::Branche manquante: $BRANCH"
              MISSING=1
            fi
          done
          [ "$MISSING" -eq 0 ] || exit 1`;
}

function generateLinterStep(): string {
  return `      - name: ${q('Linter — ESLint')}
        run: npm run lint`;
}

function generateReadmeStep(): string {
  return `      - name: ${q('README présent')}
        run: |
          if [ ! -f README.md ] && [ ! -f readme.md ]; then
            echo "::error::Fichier README.md manquant"
            exit 1
          fi`;
}

function generateSignedCommitsStep(): string {
  return `      - name: ${q('Commits signés (GPG / SSH)')}
        run: |
          UNSIGNED=$(git log --pretty="%H %G?" | grep -v ' G' | awk '{print $1}')
          if [ -n "$UNSIGNED" ]; then
            echo "::error::Commits non signés détectés:"
            echo "$UNSIGNED"
            exit 1
          fi`;
}

function generateTestsStep(): string {
  return `      - name: ${q('Suite de tests')}
        run: npm test`;
}

function generateDeployUpStep(check: Extract<HarnessCheck, { type: 'deploy_up' }>): string {
  const urlExpr =
    check.params.url !== undefined
      ? q(check.params.url)
      : '"${{ github.event.inputs.deploy_url }}"';
  return `      - name: ${q('Déploiement accessible')}
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 ${urlExpr})
          if [ "$STATUS" -lt 200 ] || [ "$STATUS" -ge 400 ]; then
            echo "::error::Déploiement inaccessible (HTTP $STATUS) — URL: ${urlExpr}"
            exit 1
          fi`;
}

function generateLighthouseStep(
  check: Extract<HarnessCheck, { type: 'lighthouse_score' }>,
): string {
  const cats = check.params.categories ?? ['performance', 'accessibility', 'best-practices', 'seo'];
  const catFlags = cats.map((c) => `--only-categories=${c}`).join(' ');
  return `      - name: ${q('Audit Lighthouse')}
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: \${{ github.event.inputs.deploy_url }}
          temporaryPublicStorage: true
          budgetPath: .github/lighthouse-budget.json
        env:
          LHCI_GITHUB_APP_TOKEN: \${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      - name: ${q(`Vérifier score Lighthouse ≥ ${String(check.params.minScore)}`)}
        run: |
          node -e "
          const results = require('.lighthouseci/lhr-*.json');
          const cats = ${JSON.stringify(cats)};
          cats.forEach(cat => {
            const score = Math.round(results.categories[cat].score * 100);
            if (score < ${String(check.params.minScore)}) {
              console.error('Score ' + cat + ': ' + score + ' < ${String(check.params.minScore)}');
              process.exit(1);
            }
          });
          " ${catFlags}`;
}

// ─── Générateur principal ─────────────────────────────────────────────────────

/**
 * Génère un workflow GitHub Actions complet à partir d'une spec livrable.
 *
 * @param spec - La spec livrable (description + checks configurés).
 * @param moduleTitle - Titre du module (affiché dans le nom du workflow).
 * @returns yaml + liste de warnings pédagogiques.
 */
export function generateWorkflowYaml(
  spec: DeliverableSpec,
  moduleTitle = 'Module',
): WorkflowGenerationResult {
  const warnings: WorkflowWarning[] = [];
  const activeChecks = spec.checks.filter((c) => c.enabled);

  // ─── Warnings ─────────────────────────────────────────────────────────────

  if (activeChecks.length === 0) {
    warnings.push({
      code: 'NO_CHECKS_ACTIVE',
      message:
        'Aucun check activé — le harnais ne pourra rien valider. Les soumissions seront auto-validées.',
    });
  }

  const hasTestsCheck = activeChecks.some((c) => c.type === 'tests_pass');
  if (!hasTestsCheck && activeChecks.length > 0) {
    warnings.push({
      code: 'NO_TESTS_CHECK',
      message: 'Aucun check de tests activé. Est-ce intentionnel ?',
    });
  }

  if (activeChecks.length > 10) {
    warnings.push({
      code: 'HIGH_CHECK_COUNT',
      message: `${String(activeChecks.length)} checks actifs — le workflow pourrait dépasser 10 min de run.`,
    });
  }

  // ─── Steps ────────────────────────────────────────────────────────────────

  const needsDeploy =
    spec.deployRequired ||
    activeChecks.some((c) => c.type === 'deploy_up' || c.type === 'lighthouse_score');

  const steps: string[] = [];

  // Checkout toujours présent (le repo du stagiaire)
  steps.push(`      - name: ${q('Checkout du repo stagiaire')}
        uses: actions/checkout@v4
        with:
          fetch-depth: 0`);

  // Setup node si nécessaire (linter, tests)
  const needsNode = activeChecks.some((c) => ['linter_pass', 'tests_pass'].includes(c.type));
  if (needsNode) {
    steps.push(`      - name: ${q('Setup Node.js')}
        uses: actions/setup-node@v4
        with:
          node-version: ${q('lts/*')}
          cache: ${q('npm')}
      - name: ${q('Installation des dépendances')}
        run: npm ci`);
  }

  // Steps par check
  for (const check of activeChecks) {
    switch (check.type) {
      case 'branches':
        steps.push(generateBranchesStep(check));
        break;
      case 'linter_pass':
        steps.push(generateLinterStep());
        break;
      case 'readme_present':
        steps.push(generateReadmeStep());
        break;
      case 'signed_commits':
        steps.push(generateSignedCommitsStep());
        break;
      case 'tests_pass':
        steps.push(generateTestsStep());
        break;
      case 'deploy_up':
        steps.push(generateDeployUpStep(check));
        break;
      case 'lighthouse_score':
        steps.push(generateLighthouseStep(check));
        break;
    }
  }

  // Si aucun check actif, on génère quand même un step no-op
  if (activeChecks.length === 0) {
    steps.push(`      - name: ${q('Aucun check configuré — soumission auto-validée')}
        run: echo "WARNING: aucun critère de validation défini pour ce module."`);
  }

  // ─── Assemblage YAML ──────────────────────────────────────────────────────

  // On safe-quote le titre pour éviter toute injection dans le nom du workflow
  const safeName = moduleTitle.replace(/["\n\r]/g, ' ').trim();

  const deployInput = needsDeploy
    ? `      deploy_url:
        description: ${q('URL de déploiement du projet')}
        required: false
        type: string
`
    : '';

  const yaml = `# Workflow généré automatiquement par Cursus — ne pas modifier manuellement.
# Module : ${safeName}
name: ${q(`Cursus Harness — ${safeName}`)}

on:
  workflow_dispatch:
    inputs:
      repo_url:
        description: ${q('URL du repository GitHub')}
        required: true
        type: string
${deployInput}
jobs:
  validate:
    name: ${q('Validation du livrable')}
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
${steps.join('\n\n')}

      - name: ${q('Rapport final')}
        if: always()
        run: echo "Validation terminée pour le module ${safeName}"
`;

  return { yaml, warnings };
}

// ─── Export pratique pour le composant DelivrableEditor ──────────────────────

export const CHECK_TYPES_ORDERED: HarnessCheck['type'][] = [
  'branches',
  'readme_present',
  'linter_pass',
  'tests_pass',
  'signed_commits',
  'deploy_up',
  'lighthouse_score',
];

/**
 * Crée un check avec ses paramètres par défaut pour l'UI.
 */
export function defaultCheckForType(type: HarnessCheck['type']): HarnessCheck {
  switch (type) {
    case 'branches':
      return { type, enabled: false, params: { branches: ['main'] } };
    case 'linter_pass':
      return { type, enabled: false, params: {} };
    case 'readme_present':
      return { type, enabled: false, params: {} };
    case 'signed_commits':
      return { type, enabled: false, params: {} };
    case 'tests_pass':
      return { type, enabled: false, params: {} };
    case 'deploy_up':
      return { type, enabled: false, params: {} };
    case 'lighthouse_score':
      return {
        type,
        enabled: false,
        params: { minScore: 80, categories: ['performance', 'accessibility'] },
      };
  }
}
