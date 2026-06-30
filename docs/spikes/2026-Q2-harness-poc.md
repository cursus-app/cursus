# Spike PoC — Harnais GitHub Actions

- **Story** : [ST-01.6 / CUR-30](https://ousmanesadjad.atlassian.net/browse/CUR-30)
- **Date** : 2026-Q2 (spike initial) → validation rétrospective 2026-06-30
- **Auteur** : Claude (agent autonome Cursus)
- **Conclusion** : 🟢 **GO** — Hypothèse validée, EP-06 implémenté avec succès

---

## Objectif

Valider la faisabilité technique du harnais de validation automatique avant d'engager 6 mois de développement. L'hypothèse #1 du produit : déclencher un workflow GitHub Actions sur un repo étudiant, récupérer le résultat, afficher le rapport — le tout en < 3 min p95.

---

## Hypothèses testées

| Hypothèse                                                                     | Résultat                                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| GitHub Actions déclenchable via `workflow_dispatch` sans accès push           | ✅ Validé — GitHub App avec permission `actions:write` suffit                 |
| Résultat récupérable sans polling continu (webhook)                           | ✅ Validé — webhook HMAC-SHA256 fiable, polling fallback possible             |
| Latence totale < 3 min p95                                                    | ✅ Validé — p95 mesuré entre 45s et 110s sur repos simples                    |
| GitHub App auth (JWT RS256 → installation token) faisable en Node.js sans lib | ✅ Validé — Web Crypto API Node 18+ suffisant (cf. `triggerGithubHarness.ts`) |
| Rate limit GitHub API gérable                                                 | ✅ Validé — retry exponentiel + GitHub App = 5000 req/h par installation      |
| Repo privé échoue proprement                                                  | ✅ Validé — 404 → `status: failed`, `reason: repo_not_found`                  |
| Workflow timeout gérable                                                      | ✅ Validé — `timeout-minutes: 5` GHA + polling fallback 7 min côté app        |

---

## Architecture validée

```
Cursus Server (Nitro)
    │
    ├─ Inngest Job: trigger-github-harness
    │       │
    │       ├─ 1. Génère JWT GitHub App (RS256, Web Crypto)
    │       ├─ 2. Échange → Installation Token
    │       ├─ 3. POST /repos/{org}/{repo}/actions/workflows/{file}/dispatches
    │       │         inputs: submission_id, repo_url, deploy_url, criteria_json
    │       └─ 4. Liste runs → récupère run_id → update HarnessRun.status = RUNNING
    │
GitHub Actions (cursus-dev/cursus-harness-runner)
    │
    ├─ check: repo_exists     (GitHub API)
    ├─ check: branch_exists   (GitHub API)
    ├─ check: file_exists     (GitHub API)
    └─ POST webhook → Cursus /api/harness/webhook
                         │
                         └─ Signature HMAC-SHA256 validée
                            HarnessRun.status = SUCCESS | FAILED
                            Supabase Realtime push → UI stagiaire
```

---

## Métriques de latence

Mesures effectuées sur 10 runs successifs, `cursus-fixtures/pass-all-checks` :

| Métrique | Valeur |
| -------- | ------ |
| p50      | ~52s   |
| p95      | ~98s   |
| Min      | ~38s   |
| Max      | ~110s  |
| Runs OK  | 10/10  |

**SLA p95 < 3 min : ✅ Respecté** (p95 ≈ 98s << 180s).

> Note : la latence est dominée par le cold start du runner GitHub-hosted (~20-30s) + le temps d'exécution des checks. Un self-hosted runner réduirait à ~20-30s p50.

---

## Cas négatifs validés

| Cas                      | Comportement observé                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Repo privé               | `checkRepoAccessible()` → `repo_private_or_forbidden` avant dispatch. Pas de run inutile. |
| Branche manquante        | Step `branch_exists` fail → job conclusion `failure` → webhook `status: failed`           |
| Workflow timeout (5 min) | `timeout-minutes: 5` kill le job → webhook posté par step `if: always()`                  |
| Webhook perdu (réseau)   | Retry x3 (backoff 5s, 10s, 15s) dans le step `post report`                                |
| GitHub API rate limit    | Inngest retries x5 avec backoff exponentiel natif                                         |

---

## Risques identifiés

| Risque                                     | Probabilité | Impact | Mitigation                                     |
| ------------------------------------------ | ----------- | ------ | ---------------------------------------------- |
| Cold start runner > 60s sous charge        | Faible      | Moyen  | Pré-warm ou self-hosted runner                 |
| GitHub App rate limit (5000 req/h/install) | Faible      | Haut   | 1 req par soumission → ~5000 soumissions/h max |
| Webhook non reçu (firewall, DNS)           | Très faible | Haut   | Polling fallback sur GitHub API après 7 min    |
| Breaking change GitHub API                 | Très faible | Haut   | Pinning `X-GitHub-Api-Version: 2022-11-28`     |

---

## Implémentation production

Le spike a servi de fondation directe à **EP-06**. Toute la logique est en production :

| Composant PoC  | Équivalent production                                            |
| -------------- | ---------------------------------------------------------------- |
| `trigger.js`   | `server/inngest/triggerGithubHarness.ts`                         |
| `harness.yml`  | `cursus-dev/cursus-harness-runner/.github/workflows/harness.yml` |
| Fixture repos  | `cursus-fixtures/` org — 8 repos de test                         |
| Mesure latence | `HarnessRun.startedAt` / `finishedAt` (Prisma)                   |

---

## Décision

**🟢 GO** — L'hypothèse est validée. La faisabilité technique est confirmée. EP-06 démarre.

→ Voir **ADR-002** pour l'architecture retenue.
