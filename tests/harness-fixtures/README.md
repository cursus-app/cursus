# Tests d'intégration harnais — Repos fixtures

Ce dossier contient la suite de tests d'intégration qui valide le comportement du harnais
Cursus contre des repos GitHub de référence ("fixtures") hébergés dans l'organisation
`cursus-fixtures`.

## Pourquoi ces tests existent

Le harnais est le coeur du produit : il valide chaque livrable de stagiaire de manière
automatique via GitHub Actions. Pour garantir sa fiabilité face aux évolutions (nouveaux
types de checks, refonte des YAML de déclenchement), il faut une suite de tests qui exécute
le harnais réel contre des scénarios connus et stables.

Ces tests sont intentionnellement **hors PR** (nightly uniquement) car ils sollicitent
l'API GitHub et peuvent durer plusieurs minutes par fixture.

## Fixtures disponibles

| Nom                     | Repo GitHub                             | Scénario attendu                       |
| ----------------------- | --------------------------------------- | -------------------------------------- |
| `pass-all-checks`       | `cursus-fixtures/pass-all-checks`       | Tous les checks verts → `validated`    |
| `missing-branch`        | `cursus-fixtures/missing-branch`        | `branch_exists` rouge → `failed`       |
| `missing-signed-commit` | `cursus-fixtures/missing-signed-commit` | `signed_commits` rouge → `failed`      |
| `deploy-down`           | `cursus-fixtures/deploy-down`           | `deploy_url_responds` rouge → `failed` |
| `linter-fails`          | `cursus-fixtures/linter-fails`          | `linter` rouge → `failed`              |
| `tests-fail`            | `cursus-fixtures/tests-fail`            | `tests` rouge → `failed`               |
| `no-readme`             | `cursus-fixtures/no-readme`             | `readme_exists` rouge → `failed`       |
| `lighthouse-low`        | `cursus-fixtures/lighthouse-low`        | `lighthouse_score` rouge → `failed`    |

## Créer les repos fixtures dans l'org

Pour chaque fixture manquante, créer un repo **public** dans l'org `cursus-fixtures` :

```bash
# Exemple pour missing-branch
gh repo create cursus-fixtures/missing-branch --public --description "Fixture: branche feature/login absente"
```

Chaque repo doit contenir :

- Un `README.md` interne décrivant le cas illustré (pour les futurs mainteneurs)
- Le code minimal faisant échouer le check ciblé, sans PII ni secret

## Configurer les variables d'environnement

Les tests sont automatiquement **skippés** si `CURSUS_GITHUB_APP_ID` n'est pas défini.
Pour les exécuter en local :

```bash
export CURSUS_GITHUB_APP_ID="123456"           # ID de la GitHub App harnais
export CURSUS_API_BASE_URL="http://localhost:3000"  # URL de l'API Cursus locale
export CURSUS_TEST_JWT="eyJ..."                # JWT de test (scope: harness:trigger)
```

Puis lancer :

```bash
pnpm vitest run tests/harness-fixtures/specs/
```

Pour vérifier que les repos fixtures sont accessibles avant de lancer les tests :

```bash
GITHUB_TOKEN="ghp_..." pnpm tsx scripts/verify-fixtures.ts
```

## Structure des fichiers

```
tests/harness-fixtures/
├── README.md                        # Ce fichier
├── fixtures.config.ts               # Définition des 8 fixtures (URLs, checks attendus)
└── specs/
    ├── helpers.ts                   # runHarnessAgainst() — déclenche + poll
    ├── pass-all-checks.spec.ts
    ├── missing-branch.spec.ts
    ├── missing-signed-commit.spec.ts
    ├── deploy-down.spec.ts
    ├── linter-fails.spec.ts
    ├── tests-fail.spec.ts
    ├── no-readme.spec.ts
    └── lighthouse-low.spec.ts
```

## Procédure de maintenance des fixtures

Les repos fixtures doivent rester stables (jamais de push accidentel qui ferait passer
un check censé échouer). Recommandations :

1. Activer la **branch protection** sur `main` de chaque repo fixture (pas de push direct).
2. Ne jamais stocker de secret dans les fixtures (repos publics).
3. Si un repo fixture est accidentellement supprimé, le recréer en suivant le guide ci-dessus
   et relancer `scripts/verify-fixtures.ts` pour valider.
4. Les fixtures sont **read-only** du point de vue du harnais : aucun workflow ou action
   ne modifie le contenu des repos fixtures.
5. Documenter tout changement de comportement attendu dans ce README et dans `fixtures.config.ts`.

## Observabilité

Chaque run de fixture émet un log structuré :

```json
{
  "event": "harness.fixture.test.completed",
  "fixture_name": "pass-all-checks",
  "result": "validated",
  "duration_ms": 45230
}
```

En CI nightly, une notification Slack est envoyée dans `#ops` en cas d'échec
(cf. `.github/workflows/harness-fixtures-nightly.yml`).
