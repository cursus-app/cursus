# ADR-002 : Architecture du Harnais de Validation Automatique

- **Statut** : Accepté
- **Date** : 2026-Q2 (issu du spike ST-01.6)
- **Auteurs** : @ousmane (PO) / Claude (agent)
- **Reviewers** : —
- **Story / Epic JIRA** : [ST-01.6 / CUR-30](https://ousmanesadjad.atlassian.net/browse/CUR-30) → [EP-06](https://ousmanesadjad.atlassian.net/browse/CUR-55)

---

## Contexte

Cursus doit valider automatiquement les livrables hebdomadaires de 5 à 20 stagiaires sans surveillance continue. Chaque soumission (dépôt GitHub + URL de déploiement) doit être vérifiée contre un ensemble de critères configurables (structure de repo, branche, fichiers, linter, tests, Lighthouse, deploy URL), et le résultat doit être disponible en < 3 min avec affichage temps réel dans l'interface.

La contrainte principale : les soumissions sont des **repos GitHub publics ou privés appartenant aux stagiaires** — on ne peut pas runner le code localement sur notre infra (risque sécurité, variabilité d'env). GitHub Actions résout ce problème en offrant un environnement isolé géré par GitHub.

---

## Options envisagées

### Option A — GitHub Actions + GitHub App (retenu)

**Description** : Un repo central `cursus-harness-runner` contient un workflow `harness.yml` déclenché via `workflow_dispatch`. Le serveur Cursus (via Inngest) dispatche le workflow avec les inputs (repo_url, criteria_json), puis reçoit le résultat via webhook HMAC.

**Pros** :

- Environnement isolé et reproductible (ubuntu-latest managed by GitHub)
- GitHub App = auth fine-grained, pas de PAT partagé
- `workflow_dispatch` = déclenchement précis sans accès push au repo étudiant
- Webhook bidirectionnel fiable ; polling fallback si webhook perdu
- Latence p95 validée < 2 min (spike ST-01.6)
- Logs d'exécution natifs dans GitHub UI (débogage)
- Free tier GitHub Actions : 2000 min/mois (suffisant MVP)

**Cons** :

- Cold start runner 20-30s incompressible (runners GitHub-hosted)
- Dépendance à la disponibilité de GitHub Actions
- Rate limit 5000 req/h par installation GitHub App

**Coût** : 0€ MVP (free tier) ; ~$0.008/min si quota dépassé

---

### Option B — CI/CD auto-hébergée (Gitea + Woodpecker CI)

**Description** : Self-hosted Gitea + Woodpecker CI sur VPS. On mirroite les repos étudiants et on exécute les checks.

**Pros** :

- Pas de rate limit, latence contrôlée
- Coût fixe (VPS ~15€/mois)

**Cons** :

- Infra à maintenir (uptime, sécurité, backups)
- Mirroring repos étudiants = copie de code, problème RGPD
- Complexité opérationnelle trop haute pour un MVP

**Coût** : ~15€/mois VPS + temps ops

---

### Option C — Validation serverless (Vercel/Cloudflare Workers)

**Description** : Un edge worker clone le repo étudiant et exécute les checks inline.

**Cons** :

- Timeout Workers = 30s (insuffisant pour `pnpm install && pnpm test`)
- Isolation inexistante (code non fiable dans notre process)
- **Éliminé** dès l'analyse préliminaire

---

## Décision

> On retient **Option A — GitHub Actions + GitHub App** parce que :
>
> - Latence p95 < 2 min validée par le spike ST-01.6
> - Isolation native et reproductible sans infrastructure propre
> - GitHub App auth est la pratique standard (pas de PAT partagé)
> - Coût 0€ sur le MVP (free tier)

---

## Architecture retenue

```
Cursus Server (Nitro / Vercel)
    │
    └─ Inngest: trigger-github-harness
            │
            ├─ Auth : JWT RS256 (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY)
            │          → Installation Token (via /app/installations/{id}/access_tokens)
            │
            ├─ Dispatch : POST /repos/cursus-dev/cursus-harness-runner
            │              /actions/workflows/harness.yml/dispatches
            │              inputs: { submission_id, repo_url, deploy_url, criteria_json }
            │
            └─ Update DB : HarnessRun { status=RUNNING, githubRunId, githubWorkflowUrl }

GitHub Actions (cursus-dev/cursus-harness-runner)
    │
    ├─ Checks configurables via criteria_json :
    │   ├─ repo_exists          (GitHub API)
    │   ├─ branch_exists        (GitHub API)
    │   ├─ file_exists          (GitHub API + ref)
    │   ├─ signed_commits       (GitHub API commits)
    │   ├─ linter               (pnpm lint in student repo)
    │   ├─ tests                (pnpm test)
    │   ├─ readme_exists        (GitHub API)
    │   ├─ deploy_url_responds  (curl HEAD)
    │   └─ lighthouse_score     (Lighthouse CI)
    │
    └─ POST webhook → Cursus /api/harness/webhook
            │   Headers: X-Cursus-Signature: sha256=<HMAC-SHA256>
            │   Body: { submission_id, status, checks, github_run_id, github_run_url }
            │
            └─ Server valide HMAC → Update HarnessRun → Supabase Realtime push
```

### Flux complet (happy path)

1. Stagiaire soumet → `POST /api/submissions` → crée `Submission` + `HarnessRun(QUEUED)`
2. Inngest event `harness/trigger` dispatché
3. GitHub App JWT → installation token → `workflow_dispatch`
4. `HarnessRun` → `RUNNING`, `githubRunId` sauvegardé
5. GitHub Actions exécute les checks (45-90s typique)
6. Step `post report` → webhook Cursus avec HMAC
7. `/api/harness/webhook` valide, update `HarnessRun` → `SUCCESS|FAILED`
8. Supabase Realtime push → `HarnessStatus.vue` mise à jour en temps réel

### Gestion des échecs

| Scénario                 | Traitement                                              |
| ------------------------ | ------------------------------------------------------- |
| Workflow dispatch échoue | Inngest retry x5 exponential backoff                    |
| Webhook perdu            | Retry x3 côté GHA (backoff 5/10/15s)                    |
| Retries épuisées         | DLQ Inngest → `HarnessRun.status = TIMEOUT`             |
| GitHub Actions down      | Inngest retries → TIMEOUT après 5 essais                |
| Rate limit API           | Inngest backoff déclenche naturellement après refus 429 |

---

## Conséquences

### Positives

- Aucune infrastructure propre à maintenir pour le runner
- Chaque check est un step GitHub Actions = logs natifs, débogage simple
- Critères configurables via JSON (pas de redéploiement pour ajouter un check)
- HMAC-SHA256 garantit l'authenticité du résultat webhook
- Supabase Realtime permet un affichage live sans polling côté client

### Négatives / Trade-offs assumés

- Cold start 20-30s incompressible (acceptable : SLA = 3 min, pas temps réel)
- Dépendance à la disponibilité de GitHub Actions (SLA GitHub 99.9%)
- Les checks `linter` / `tests` nécessitent un `pnpm install` dans le runner (+30-60s)

### Neutres

- Le repo `cursus-harness-runner` est public (workflows lisibles) — par design, les checks sont transparents

### Actions de suivi

- [x] Implémenter `triggerGithubHarness.ts` (ST-06.1)
- [x] Implémenter webhook receiver `POST /api/harness/webhook` (ST-06.2)
- [x] Créer repos fixtures `cursus-fixtures/*` (ST-06.3)
- [x] Implémenter `useHarnessRunRealtime` (ST-06.4)
- [x] Composant `HarnessStatus.vue` + rapport (ST-06.5)

---

## Références

- [Spike note ST-01.6](../spikes/2026-Q2-harness-poc.md)
- [GitHub Docs — workflow_dispatch](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch)
- [GitHub Docs — GitHub Apps authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app)
- ADR liés : ADR-001 (stack technique)
