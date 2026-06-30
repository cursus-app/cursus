# Cursus Harness PoC — ST-01.6

Spike de validation de faisabilité du harnais GitHub Actions.
Code **jetable** — sert uniquement à valider l'hypothèse #1 du produit.

## Prérequis

- Node.js 18+
- `gh` CLI authentifié
- Un PAT GitHub avec `repo` + `workflow` (pour le spike ; la prod utilise une GitHub App)
- Le repo `cursus-dev/cursus-harness-runner` doit exister avec `harness.yml` déployé

## Setup

```bash
cd spikes/harness-poc
npm install
```

## Lancer un run unique

```bash
export GITHUB_TOKEN=ghp_xxxx
export TARGET_REPO=cursus-fixtures/pass-all-checks

node trigger.js
```

### Variables d'environnement

| Variable           | Défaut                                                                  | Description                    |
| ------------------ | ----------------------------------------------------------------------- | ------------------------------ |
| `GITHUB_TOKEN`     | —                                                                       | PAT GitHub (requis)            |
| `TARGET_REPO`      | `cursus-fixtures/pass-all-checks`                                       | Repo étudiant cible (org/repo) |
| `CHECKS`           | `{"repo_exists":true,"branch_exists":"main","file_exists":"README.md"}` | Critères JSON                  |
| `HARNESS_ORG`      | `cursus-dev`                                                            | Org du repo harness-runner     |
| `HARNESS_REPO`     | `cursus-harness-runner`                                                 | Repo harness-runner            |
| `HARNESS_WORKFLOW` | `harness.yml`                                                           | Fichier workflow à déclencher  |

## Mesure latence (10 runs)

```bash
export GITHUB_TOKEN=ghp_xxxx
export TARGET_REPO=cursus-fixtures/pass-all-checks
export N=10

node bench.js
```

Produit :

- `logs/bench-<timestamp>.csv` — durée par run
- `logs/bench-<timestamp>-summary.json` — p50/p95/avg + verdict Go/No-Go

## Cas de test

```bash
# ✅ Nominal — tout OK
TARGET_REPO=cursus-fixtures/pass-all-checks node trigger.js

# ❌ Branche manquante
TARGET_REPO=cursus-fixtures/missing-branch node trigger.js

# ❌ Fichier manquant
TARGET_REPO=cursus-fixtures/no-readme node trigger.js

# ❌ Repo privé / inaccessible
TARGET_REPO=cursus-fixtures/private-test node trigger.js
```

## Déployer harness.yml sur le runner

```bash
gh repo clone cursus-dev/cursus-harness-runner /tmp/harness-runner
cp harness.yml /tmp/harness-runner/.github/workflows/harness.yml
cd /tmp/harness-runner && git add -A && git commit -m "chore: update harness workflow (spike ST-01.6)"
git push
```

## Secrets à configurer sur cursus-harness-runner

| Secret                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `CURSUS_WEBHOOK_URL`    | URL du endpoint Cursus qui reçoit les résultats |
| `CURSUS_WEBHOOK_SECRET` | Secret HMAC pour valider la signature           |

## Logs

Chaque run écrit dans `logs/runs.jsonl` (une entrée JSON par ligne).
Ce dossier est `.gitignore`d — ne jamais commiter les logs.

## Conclusion spike

Voir `docs/spikes/2026-Q2-harness-poc.md` pour le Go/No-Go et l'ADR-002.
