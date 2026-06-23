# 05 — Backlog JIRA détaillé (v3 — synchronisé depuis JIRA mai 2026)

> **Source de vérité** : ce fichier est synchronisé depuis le projet JIRA `CUR` sur ousmanesadjad.atlassian.net. Toute modification doit être faite dans JIRA, puis re-synchronisée vers ce fichier (et non l'inverse). Les 158 tickets respectent la méthodologie d'audit du document `11-ticket-quality-checklist.md`.

> **Stack technique de référence** : Nuxt 4.4 + Vue 3.5 + @nuxt/ui 4.8 + Tailwind CSS 4.3 + Prisma 7.8 + Supabase + GitHub Actions + Inngest + Resend + Sentry 10.53.

> **Format du document** : EP-01 est présenté en version intégralement détaillée (Epic + 7 stories : contexte, AC Gherkin, sous-tâches techniques, sécurité, performance, DoD) comme **référence canonique du niveau d'audit attendu**. Pour EP-02 à EP-24, ce document expose la description complète de chaque Epic (objectif, valeur, critères de complétion, risques, dépendances, non-goals) avec la table des stories rattachées. Le détail complet de chaque story (descriptions enrichies de 150-300 lignes par story, conformes au niveau d'EP-01) est consultable directement dans JIRA via le lien fourni pour chaque ticket. Cette répartition reflète la taille du backlog enrichi (~600 KB sur JIRA, soit ~750 pages markdown) et permet de garder un fichier de référence local lisible tout en pointant vers la source de vérité.

---

## Conventions

### Format des identifiants

- `EP-XX` → Epic (JIRA : CUR-1 à CUR-24)
- `ST-XX.Y` → Story (Y = numéro dans l'Epic ; JIRA : CUR-25 à CUR-158)
- `TT-XX.Y.Z` → Tâche technique (sous-tâche d'une story, listée dans la description)

### Priorités JIRA

- **Highest** = P0, bloquant MVP, sans ça le produit ne fonctionne pas
- **High** = P1, MVP, contribue significativement à la valeur
- **Medium** = P2, post-MVP v1.x, nice-to-have
- **Low** = P3, v2+, parked

### Tier produit (différent de la priorité)

- **Core** = pilier fondamental du produit
- **Premium** = polish premium (i18n, design, perf, a11y)
- **Differentiator** = différenciateur stratégique (AI, intégrations, reporting)

### T-shirt size → Story Points (Fibonacci)

- XS = 1, S = 2, M = 3, L = 5, XL = 8, XXL = 13

### Labels JIRA recommandés

`mvp` `core` `premium` `differentiator` `harness` `auth` `cursus` `cohorte` `stagiaire` `formateur` `ai` `i18n` `a11y` `perf` `security` `rgpd` `realtime` `observability` `pilote`

### Definition of Ready / Done

Voir `09-engineering-playbook.md` section 2.

---

## Vue d'ensemble des Epics

| ID JIRA | Epic                                    |      Tier      | Priorité | Story Points | Sprint cible |
| ------- | --------------------------------------- | :------------: | :------: | :----------: | :----------: |
| CUR-1   | EP-01 Fondations techniques & DevOps    |      Core      | Highest  |      18      |  Sprint 0-1  |
| CUR-2   | EP-02 Identity & Access                 |      Core      | Highest  |      26      |  Sprint 1-2  |
| CUR-3   | EP-03 Cursus Builder                    |      Core      | Highest  |      39      |  Sprint 2-3  |
| CUR-4   | EP-04 Cohorte & Enrôlement              |      Core      | Highest  |      21      |   Sprint 2   |
| CUR-5   | EP-05 Parcours stagiaire (semaine type) |      Core      | Highest  |      23      |   Sprint 3   |
| CUR-6   | EP-06 Harness de validation             |      Core      | Highest  |      39      |  Sprint 3-4  |
| CUR-7   | EP-07 Quiz                              |      Core      |   High   |      13      |   Sprint 4   |
| CUR-8   | EP-08 Progress Tracking & Alertes       |      Core      | Highest  |      21      |  Sprint 3-4  |
| CUR-9   | EP-09 Capstone & Soutenance             |      Core      |   High   |      21      |   Sprint 5   |
| CUR-10  | EP-10 Portfolio & Certification         |      Core      |   High   |      24      |   Sprint 5   |
| CUR-11  | EP-11 Gamification (XP & Badges)        |    Premium     |   High   |      13      |  Sprint 4-5  |
| CUR-12  | EP-12 Notifications                     |      Core      | Highest  |      16      |  Sprint 3-4  |
| CUR-13  | EP-13 Dashboards                        |      Core      | Highest  |      21      |  Sprint 3-4  |
| CUR-14  | EP-14 Admin & Reporting                 |      Core      |  Medium  |      13      |     v1.1     |
| CUR-15  | EP-15 Conformité, sécurité, RGPD        |      Core      | Highest  |      18      |  Transverse  |
| CUR-16  | EP-16 Observabilité & QA                |      Core      | Highest  |      18      |  Transverse  |
| CUR-17  | EP-17 Pilote & déploiement              |      Core      | Highest  |      13      |  Sprint 5-6  |
| CUR-18  | EP-18 Design System & Motion (premium)  |    Premium     | Highest  |      21      |  Sprint 1-4  |
| CUR-19  | EP-19 Internationalisation FR + EN      |    Premium     |   High   |      13      |  Sprint 1-4  |
| CUR-20  | EP-20 Command Palette & Search global   |    Premium     |   High   |      13      |   Sprint 4   |
| CUR-21  | EP-21 AI Assist                         | Differentiator |  Medium  |      21      |     v1.1     |
| CUR-22  | EP-22 Integrations & Webhooks sortants  | Differentiator |  Medium  |      18      |     v1.1     |
| CUR-23  | EP-23 Premium Reporting                 | Differentiator |  Medium  |      18      |     v1.2     |
| CUR-24  | EP-24 PWA & Offline lite                |    Premium     |   Low    |      13      |     v1.2     |

**Total estimé** : ~470 points. Le MVP en couvre ~280.

---

## EP-01 — Fondations techniques & DevOps (CUR-1)

## Objectif business

Poser une fondation technique propre (Nuxt 4 + Supabase + Prisma 7 + Vercel + CI/CD + observabilité) pour permettre à tous les autres Epics de démarrer sans dette précoce, et désamorcer le risque #1 du produit (faisabilité du harnais) via un spike technique avant tout investissement.

## Valeur métier (Business value)

Sans cette Epic, **aucune autre story ne peut démarrer**. C'est le passage critique zéro du projet. Une fondation propre évite à elle seule plusieurs semaines de refonte ultérieure (dette technique précoce). Le spike harnais (ST-01.6) est de loin l'investissement le plus rentable du projet : 3 jours pour valider ou invalider une hypothèse qui conditionne 6 mois de développement.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Sprint 0 + Sprint 1
- **Story points cumulés** : 18

## Stories rattachées

| Key       | Titre                                                  | Story Points | Priorité |
| --------- | ------------------------------------------------------ | ------------ | -------- |
| CUR-25    | ST-01.1 — Bootstrap projet Nuxt 4 + Supabase + Prisma  | 2            | Highest  |
| CUR-26    | ST-01.2 — Pipeline CI/CD GitHub Actions                | 2            | Highest  |
| CUR-27    | ST-01.3 — Déploiement preview & prod sur Vercel        | 3            | Highest  |
| CUR-28    | ST-01.4 — Schéma DB initial + Prisma migrations        | 3            | Highest  |
| CUR-29    | ST-01.5 — ADR-001 Stack technique                      | 1            | Highest  |
| CUR-30    | ST-01.6 — Spike PoC harnais GitHub Actions             | 5            | Highest  |
| CUR-31    | ST-01.7 — Setup observabilité minimale (Sentry + Pino) | 2            | Highest  |
| **Total** |                                                        | **18**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done (DoD validée).
- Un dev sur poste neuf peut cloner le repo, exécuter `pnpm install && pnpm prisma generate && pnpm dev` et démarrer le serveur en moins de 10 minutes.
- La CI GitHub Actions tourne vert sur main (lint + type-check + tests + build), avec un temps de build cible < 5 min.
- Une PR génère automatiquement une URL preview Vercel ; le merge sur main déclenche un déploiement prod stable.
- Le schéma DB initial (Prisma `schema.prisma`) est appliqué sur Supabase (local + cloud) via `prisma migrate deploy` avec RLS activée par défaut sur toutes les tables sensibles.
- Sentry 10.53 remonte une erreur volontaire (frontend + backend) avec source maps résolues.
- L'ADR-001 (stack technique : Nuxt 4, Prisma 7, @nuxt/ui 4, Supabase) et l'ADR-002 (faisabilité harnais issue du spike) sont commités dans `docs/adr/`.
- Le spike a livré une note Go/No-Go avec mesure de latence p50/p95 sur 10 runs.

## Risques identifiés

| Risque                                                                                                                       | Probabilité | Impact | Mitigation                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Le PoC harnais (ST-01.6) révèle une latence > 5 min p95, invalidant l'hypothèse H1 de la vision                              | Moyenne     | Élevé  | Spike dédié 3 jours avant tout sprint 1 ; plan B documenté (runners self-hosted, queue Inngest, pré-warming) ; décision Go/No-Go formalisée avant d'entrer en sprint 1                        |
| Mauvais choix de stack ou de schéma DB initial coûteux à corriger (ex : oubli `organization_id` pour migration multi-tenant) | Moyenne     | Élevé  | ADR-001 documente alternatives et raisons de rejet (Kysely, Prisma 6 Rust, Next.js) ; schéma initial prévoit `organization_id` NULL en MVP (pré-multi-tenant) ; revue par un pair avant merge |
| Variables d'env sensibles exposées en preview (clé GH App, signature certif)                                                 | Faible      | Élevé  | Séparation stricte preview/prod via Vercel env scoping ; secrets prod jamais injectés en preview ; audit RLS exhaustif (couvert par EP-15)                                                    |
| Indisponibilité Vercel pendant le pilote                                                                                     | Faible      | Moyen  | Runbook de rollback documenté (ST-01.3) ; fallback déploiement manuel via CLI documenté                                                                                                       |

## Dépendances inter-Epics

- **Bloqué par** : aucun — c'est l'Epic racine.
- **Bloque** : **TOUS** les autres Epics. En particulier EP-02 (Identity), EP-06 (Harness, dépend du spike ST-01.6), EP-15 (RGPD/sécurité, dépend du schéma DB et de la RLS de base), EP-16 (Observabilité, étend l'instrumentation de ST-01.7).
- **Parallèle à** : EP-18 (Design System) peut démarrer en parallèle dès ST-01.1 livré (design tokens découplés du domaine).

## Périmètre exclu de cet Epic (non-goals)

- Pas de design system ni de composants UI (couverts par EP-18 ; @nuxt/ui 4.8 et Tailwind 4.3 sont installés mais customisation reportée).
- Pas d'authentification ni de RBAC (couverts par EP-02).
- Pas de RLS policies métier détaillées : seulement la RLS activée par défaut (les policies fines viennent avec chaque Epic métier).
- Pas de tests E2E ni de Lighthouse CI (couverts par EP-16).
- Pas d'analytics produit (Plausible/PostHog couvert par EP-16).

### Stories de cet Epic

---

#### CUR-25 — ST-01.1 Bootstrap projet Nuxt 4 + Supabase + Prisma

## Contexte business

Avant tout, il faut un squelette de projet fonctionnel sur lequel les autres devs/agents peuvent travailler. **Nuxt 4.4 + Vue 3.5 + Supabase + Prisma 7.8 ORM** sont les choix actés (voir ADR-001). Cette story est la **toute première brique** du projet : sans elle, aucune autre story ne peut démarrer. C'est l'investissement de fondation.

Valeur livrée : un dev peut cloner le repo et lancer le projet en < 5 min sur un poste neuf. Aucun mystère, aucune surprise. Ce niveau de soin sur le bootstrap conditionne la vélocité de tous les sprints suivants.

## Description fonctionnelle

Initialiser le projet **Nuxt 4.4.5** (TypeScript 5.6 strict), configurer les modules Nuxt essentiels (Supabase, @nuxt/ui 4.8, i18n, Pinia 3, Image, VueUse 12, motion-v), installer **Prisma 7.8** (`@prisma/client` + `prisma` CLI + Prisma Migrate), mettre en place ESLint 9 + Prettier 3 + Lefthook, valider les variables d'environnement via Zod au démarrage, écrire un README clair. Vérifier que l'environnement de développement local est opérationnel sur un poste vierge.

## Critères d'acceptation (Gherkin)

**Scénario 1 — Setup local sur poste vierge**

```gherkin
Given un développeur clone le repo sur un poste vierge
When il exécute `pnpm install && pnpm prisma generate && pnpm dev` en suivant le README
Then le serveur démarre sur http://localhost:3000
And la page d'accueil affiche "Cursus" et un indicateur de santé Supabase
And TypeScript 5.6 en mode strict ne signale aucune erreur
And ESLint 9 + Prettier 3 sont configurés et lancés sur les fichiers modifiés via Lefthook
```

**Scénario 2 — Variable d'environnement invalide**

```gherkin
Given le développeur ajoute une variable d'env mal nommée ou manquante (ex: DATABASE_URL absent)
When il démarre le serveur
Then une erreur lisible apparaît au démarrage (validation Zod sur les env)
And le process exit avec code 1
And le message indique précisément la variable fautive
```

**Scénario 3 — Version Node trop ancienne**

```gherkin
Given un dev a Node 18 installé
When il lance `pnpm install`
Then un warning clair indique "Node >= 20 requis"
And le README documente la procédure (nvm / volta)
```

## Cas limites à traiter

- **Variables d'env manquantes** (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`) : message clair + exit 1.
- **Version Node < 20** : warning au boot (engines dans package.json + check runtime).
- **Conflit de port 3000 occupé** : Nuxt bascule sur 3001 avec message clair.
- **pnpm absent** : README documente l'installation via corepack.
- `prisma generate` non lancé : message d'erreur explicite au boot (`@prisma/client` introuvable).

## Sous-tâches techniques

- **TT-01.1.1** — `pnpm create nuxt@latest cursus` (Nuxt 4.4.5) + setup TypeScript 5.6 strict (`strict: true`, `noUncheckedIndexedAccess: true`)
- **TT-01.1.2** — Ajout des modules Nuxt : `@nuxtjs/supabase` ^2, `@nuxt/ui` ^4.8 (intègre Tailwind CSS 4.3), `@vueuse/nuxt` ^12, `@pinia/nuxt` ^0.9 (avec Pinia 3), `@nuxtjs/i18n` ^9, `@nuxt/image` ^1, `@nuxtjs/seo` ^2, `@nuxtjs/security` ^2
- **TT-01.1.3** — Installation **Prisma 7.8** : `prisma` (devDependency CLI) + `@prisma/client` (runtime TS pur, plus de binaire Rust). Initialisation via `pnpm prisma init` (créé `prisma/schema.prisma` vide + `.env`)
- **TT-01.1.4** — Setup ESLint 9 (`@nuxt/eslint` ^0.7) + Prettier 3 + Lefthook 1.10 (pre-commit lint + type-check sur staged files, gitleaks scan)
- **TT-01.1.5** — Validation d'env via Zod (`server/utils/env.ts`) avec runtime check au boot : `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **TT-01.1.6** — Stack frontend UI : `vee-validate` ^4 + `@vee-validate/zod` ^4, `zod` ^3.23, `motion-v` ^0, `@vueuse/motion` ^2, `@iconify-json/tabler` ^3
- **TT-01.1.7** — README avec instructions de setup local (Node ≥ 20, pnpm via corepack, `.env.example`, commandes `pnpm prisma generate`, `pnpm prisma migrate dev`, `pnpm dev`)

## Stack utilisée (versions épinglées mai 2026)

- **Runtime** : Nuxt 4.4.5 · Vue 3.5 · Nitro · TypeScript 5.6 (strict)
- **UI** : @nuxt/ui 4.8 (Free + Pro unifiés, open source) · Tailwind CSS 4.3 (config CSS-first via `@theme` dans `assets/css/main.css`) · Tabler Icons via `@iconify-json/tabler` (outline only)
- **State** : Pinia 3
- **Formulaires** : vee-validate 4 + `@vee-validate/zod` + Zod 3.23 (schéma symétrique client/serveur)
- **Motion** : motion-v (port Vue de Framer Motion) + `@vueuse/motion`
- **DB / ORM** : Prisma 7.8 (Prisma Client TS pur, 3× plus rapide que v6, bundles -90%) + Prisma Migrate + Prisma CLI
- **Utils** : `@vueuse/nuxt` ^12
- **DX** : Lefthook 1.10 · ESLint 9 (@nuxt/eslint) · Prettier 3 · gitleaks

## Dépendances

- **Bloqué par** : Aucune. Doit être livrée en **premier**.
- **Bloque** : toutes les autres stories (ST-01.2, ST-01.4, ST-01.7, EP-02, etc.).

## Non-goals (hors scope)

- Pas de design system poussé (vient avec EP-18 — design tokens, composants atomiques).
- Pas d'authentification (vient avec EP-02).
- Pas de schéma DB applicatif (vient avec ST-01.4).
- Pas de CI/CD ni déploiement (ST-01.2 / ST-01.3).
- Pas de Storybook (vient avec ST-16.10).

## Tests à écrire

- **Unit** : validation Zod des env (cas OK avec toutes les vars, cas erreur sur var manquante, cas erreur sur var mal typée).
- **Integration / smoke** : la page d'accueil retourne un 200 HTTP en local.
- **Lint/type-check** : `pnpm lint && pnpm typecheck` passent sur la baseline.
- **Prisma** : `pnpm prisma generate` produit `@prisma/client` sans erreur.

## Observabilité

- N/A à ce stade — l'instrumentation Sentry 10.53 + Pino arrive avec ST-01.7. Le README mentionne que les logs de boot apparaissent en stdout.

## Considérations sécurité

- `.env` ne doit jamais être commité (`.gitignore` strict + Lefthook check + gitleaks).
- `.env.example` documente toutes les variables avec valeurs factices (incluant `DATABASE_URL`, `DIRECT_URL`).
- Aucun secret dans le bundle client (validation Zod sépare `public` vs `private` env ; `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur).
- Prisma Client v7 étant 100% TypeScript, plus de binaire natif à vendoriser → surface d'attaque réduite.

## Considérations performance

- Pas de chemin critique en MVP — c'est une story de bootstrap. Mais on vise `pnpm install` < 60s sur connexion correcte (cache pnpm activé).
- Prisma 7 cold start mesurablement plus rapide (critère important pour Vercel serverless).

## Definition of Done spécifique

- Un dev externe peut cloner et lancer en < 5 min en suivant le README.
- Le repo est public et le README contient le badge de version Node requis.
- Une PR "Hello World" passe lint + type-check + smoke test.
- `pnpm prisma generate` exécuté avec succès (génère `node_modules/@prisma/client`).

---

#### CUR-26 — ST-01.2 Pipeline CI/CD GitHub Actions

## Contexte business

Toute PR doit déclencher lint + type-check + tests + build avant merge. Sans CI, la qualité du code dérive au rythme des sprints et la confiance dans le main s'effrite. Branch protection sur `main` exige une CI verte avant tout merge.

Valeur livrée : un dev reçoit un feedback rapide (< 5 min) avant merge. Aucun code cassé n'atterrit en prod. C'est le filet de sécurité minimal d'une équipe qui délivre vite.

## Description fonctionnelle

Workflow GitHub Actions qui s'exécute sur chaque PR ouverte vers `main` et sur chaque push sur `main`. Jobs en parallèle : lint (ESLint 9 + Prettier 3 check), type-check (`tsc --noEmit`, TypeScript 5.6), tests unitaires (Vitest 4.1.7), build (`nuxt build` sur Nuxt 4.4). Cache pnpm pour accélérer les runs successifs. Étape `pnpm prisma generate` avant le typecheck (nécessaire pour types Prisma Client). Badge de statut dans le README.

## Critères d'acceptation (Gherkin)

**Scénario 1 — PR ouverte déclenche tous les jobs**

```gherkin
Given une PR est ouverte vers main
When la CI s'exécute
Then les jobs suivants tournent en parallèle : lint, type-check, tests-unit, build
And le statut de chaque job est visible sur la PR
And un badge "build passing" est affiché dans le README
And le temps total CI est < 5 min (cible)
```

**Scénario 2 — Erreur de lint bloque le merge**

```gherkin
Given un dev push une PR avec une erreur de lint
When la CI tourne
Then le job lint échoue avec un message indiquant le fichier et la ligne
And la PR ne peut pas être mergée (branch protection active)
And l'auteur peut re-run le job après correction sans rouvrir la PR
```

**Scénario 3 — Cache pnpm + Prisma restauré entre runs**

```gherkin
Given une PR a déjà installé les deps une fois
When une nouvelle commit pousse une mise à jour
Then le job `install` réutilise le cache pnpm (key = pnpm-lock.yaml hash)
And Prisma Client généré est caché (key = schema.prisma hash)
And le temps install + prisma generate < 45s (vs ~120s sans cache)
```

## Cas limites à traiter

- **Re-run d'un job en échec** : doit être possible sans rouvrir la PR (UI GitHub native).
- **Cache pnpm corrompu** : key invalidée à chaque modif de `pnpm-lock.yaml`.
- **Modification de** `prisma/schema.prisma` : invalide le cache Prisma Client → regen.
- **Workflow modifié dans une PR** : la CI utilise la version de la branche source (attention aux risques sécurité).
- **Dependabot PR** : la CI tourne mais nous limitons les permissions du token (pas de push).

## Sous-tâches techniques

- **TT-01.2.1** — `.github/workflows/ci.yml` avec matrix de jobs (lint, typecheck, test, build)
- **TT-01.2.2** — Setup cache pnpm via `actions/cache` (key = `pnpm-${{ hashFiles('pnpm-lock.yaml') }}`)
- **TT-01.2.3** — Cache Prisma Client (key = `prisma-${{ hashFiles('prisma/schema.prisma') }}`) ; étape `pnpm prisma generate` avant typecheck
- **TT-01.2.4** — Branch protection sur `main` via repo settings (require status checks, require review)
- **TT-01.2.5** — Badge CI dans le README
- **TT-01.2.6** — Concurrency group pour annuler les runs obsolètes sur la même PR

## Dépendances

- **Bloqué par** : ST-01.1 (CUR-25) — besoin du squelette projet Nuxt 4 et du `package.json`.
- **Bloque** : ST-01.3 (CUR-27) — le déploiement Vercel dépend de la CI verte.

## Non-goals (hors scope)

- Pas de tests E2E ici (couverts par EP-16 / ST-16.4 en CI séparée car plus lents).
- Pas de déploiement (vient avec ST-01.3).
- Pas de notifications Slack en MVP (vient post-EP-22).
- Pas de Lighthouse CI (EP-16).

## Tests à écrire

- **Manuel** : vérifier que la CI échoue bien sur une erreur volontaire (lint, type, test) via une PR de test.
- **Manuel** : vérifier que la branch protection bloque le merge tant que la CI rouge.
- **Smoke** : workflow valide via `act` localement (optionnel).

## Observabilité

- **Logs** : logs natifs GitHub Actions par job, conservés 90 jours.
- **Métriques** : temps de build moyen visible dans l'onglet Insights GitHub.
- **Notifications Slack** en cas d'échec sur `main` (post-EP-22, hors scope MVP).
- **Cible** : temps CI total < 5 min, cache hit rate > 80%.

## Considérations sécurité

- Token GitHub Actions avec permissions minimales (`contents: read`, pas d'écriture).
- Pas de secrets exfiltrables : `GITHUB_TOKEN` jamais logé.
- PRs depuis forks : workflows en mode `pull_request` (sans accès aux secrets) jusqu'à review humaine.

## Considérations performance

- Cache pnpm + cache Prisma Client obligatoires pour rester sous 5 min CI total.
- Jobs en parallèle (pas séquentiel).
- Concurrency group `pr-${{ github.event.pull_request.number }}` pour annuler les runs obsolètes (économie minutes).

## Definition of Done spécifique

- Une PR test avec une erreur volontaire est bloquée par la CI.
- Le badge CI dans le README pointe vers la bonne branche.
- Branch protection sur main est documentée dans le README ou un runbook.

---

#### CUR-27 — ST-01.3 Déploiement preview & prod sur Vercel

## Contexte business

Chaque PR doit avoir une URL de preview pour validation visuelle (PM, designer, formateur testeur). Chaque merge sur `main` doit déclencher un déploiement prod automatique. Sans preview, les revues sont aveugles et la rétroaction trop lente.

Valeur livrée : feedback visuel sur chaque PR + déploiement prod en 1-clic merge. Rollback possible en < 1 min via le dashboard Vercel.

## Description fonctionnelle

Intégration Vercel + Nuxt 4. Variables d'environnement séparées par stage (preview / production), incluant `DATABASE_URL` et `DIRECT_URL` pointant sur Supabase. Hook `vercel-build` exécute `prisma generate && prisma migrate deploy && nuxt build`. Domaine de prod à définir avec Mohamed. Notifications de déploiement (Slack / email). Runbook de rollback documenté.

## Critères d'acceptation (Gherkin)

**Scénario 1 — PR génère une URL preview**

```gherkin
Given une PR est ouverte
When les checks CI passent
Then Vercel déploie une URL preview unique (format cursus-pr-XXX.vercel.app)
And l'URL est commentée automatiquement dans la PR
And la preview utilise les env vars du stage "preview" (jamais les secrets prod)
And `prisma generate` s'exécute avec succès pendant le build
```

**Scénario 2 — Merge sur main déploie en prod**

```gherkin
Given une PR est mergée sur main
When le merge est confirmé
Then Vercel déploie en prod sur le domaine configuré
And les migrations Prisma en attente sont appliquées (`prisma migrate deploy`) AVANT que le nouveau code prenne le trafic
And un rollback est possible en 1 clic depuis le dashboard Vercel
And une notification est envoyée (Slack ou email)
```

**Scénario 3 — Variables d'env isolées par stage**

```gherkin
Given des variables d'env diffèrent entre preview et prod
When le déploiement preview tourne
Then il utilise les variables preview, jamais les secrets prod
And les secrets sensibles (clé GitHub App, signature certif) ne sont pas injectés en preview
And `DATABASE_URL` preview pointe sur la DB Supabase preview (jamais prod)
```

## Cas limites à traiter

- **Vercel down** : fallback documenté (déploiement manuel via `vercel CLI` depuis une machine de l'équipe).
- **Variables d'env sensibles** (clé GH App, signature certif) jamais en preview, isolées en prod.
- **Migration Prisma qui échoue en deploy prod** : Vercel arrête le déploiement, ancien code reste actif → alerte critique.
- **Build qui dépasse 3 min** : monitor + investiguer (potentielle régression).
- **Limite quota Vercel** : monitor consommation, alerte si > 80%.
- **Rollback urgent** : runbook documenté dans `docs/runbooks/rollback.md` (incluant stratégie rollback migration Prisma : down-migration manuelle si nécessaire).

## Sous-tâches techniques

- **TT-01.3.1** — Connecter le repo GitHub à Vercel (Vercel Git Integration)
- **TT-01.3.2** — Configurer les variables d'env par stage (preview / production) dans Vercel dashboard, incluant `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_*`
- **TT-01.3.3** — Configurer le script `build` dans `package.json` : `"vercel-build": "prisma generate && prisma migrate deploy && nuxt build"`
- **TT-01.3.4** — Configurer le domaine de prod (à choisir avec Mohamed) + DNS + SSL
- **TT-01.3.5** — Configurer les notifications Vercel (Slack ou email) sur deploy success/fail
- **TT-01.3.6** — Documenter la procédure de rollback dans `docs/runbooks/rollback.md` (incluant rollback Prisma migrations)
- **TT-01.3.7** — Configurer le commentaire auto sur PR avec lien preview (Vercel bot)

## Dépendances

- **Bloqué par** : ST-01.2 (CUR-26) — CI doit être verte pour permettre le déploiement.
- **Bloque** : ST-01.7 (CUR-31) — Sentry doit s'intégrer aux déploiements Vercel.

## Non-goals (hors scope)

- Pas d'auto-hébergement / Docker au MVP (à évaluer en v1.x si besoin de souveraineté hosting).
- Pas de CDN custom (Vercel Edge suffit).
- Pas de multi-région (Vercel route automatiquement vers la région la plus proche).
- Pas de feature flags d'environnement avancés en MVP.

## Tests à écrire

- **Manuel** : validation manuelle sur la 1ʳᵉ PR — vérifier que l'URL preview s'affiche.
- **Manuel** : merge sur main déploie bien en prod et le domaine répond.
- **Manuel** : tester un rollback depuis Vercel dashboard — doit prendre < 1 min.
- **Manuel** : vérifier que `prisma migrate deploy` s'exécute bien en pré-build.

## Observabilité

- **Logs** : statut Vercel via webhooks exportés vers Sentry / Slack.
- **Métriques** : temps de build (cible : < 3 min p95), taux de déploiement réussi (> 95%).
- **Alertes** : notification équipe si build > 5 min ou échec sur main.

## Considérations sécurité

- Secrets sensibles (clés privées, tokens prod, `SUPABASE_SERVICE_ROLE_KEY`) **uniquement en prod**, jamais en preview.
- Headers de sécurité configurés (CSP, HSTS, X-Frame-Options) via `@nuxtjs/security` ^2.
- Variables d'env preview n'incluent **aucun accès en écriture aux services tiers** (GitHub App = repo de test, Resend = sender sandbox).
- Logs Vercel : retention 7 jours en preview, 30 jours en prod, pas de PII.
- `DIRECT_URL` (port 5432 sans pgBouncer) utilisé uniquement pour migrations → pas dans le runtime du worker Nuxt.

## Considérations performance

- Build time cible : < 3 min p95 (incluant Prisma generate + migrate deploy).
- Prisma 7 bundle -90% vs v6 → cold start Vercel serverless mesurablement plus rapide.
- Cache HTTP correctement configuré sur les assets statiques (immutable, 1 an).

## Definition of Done spécifique

- Une PR test génère bien une URL preview et le bot Vercel commente la PR.
- Le domaine de prod répond en HTTPS avec certificat valide.
- Le runbook de rollback est testé au moins une fois (rollback puis re-deploy).
- `prisma migrate deploy` confirmé fonctionnel en pre-deploy hook.

---

#### CUR-28 — ST-01.4 Schéma DB initial + Prisma migrations

## Contexte business

Le schéma de données est la **fondation de tout**. Une mauvaise architecture initiale coûte cher à corriger (migrations destructives, downtime, perte de données). On investit du temps en amont pour éviter une dette structurelle.

Valeur livrée : un modèle de données cohérent, versé dans Git, applicable de manière reproductible sur n'importe quel environnement, avec RLS activée par défaut. Pré-multi-tenant grâce à `organization_id` NULL en MVP.

## Description fonctionnelle

Créer les tables principales du domaine (utilisateurs, cursus, cohortes, modules, memberships, submissions, harness_runs, quizzes, alerts, notifications, badges, audit_log, feature_flags) **dans** `prisma/schema.prisma` (schéma déclaratif Prisma 7), générer la migration SQL via `prisma migrate dev`, appliquer sur Supabase (local et cloud configuré). Activer RLS sur toutes les tables sensibles. Préparer un seed file pour le dev local.

## Configuration Prisma (rappel ADR-001)

- `DATABASE_URL` : pooler Supavisor port 6543 (`?pgbouncer=true&connection_limit=1`) — utilisé par Prisma Client au runtime
- `DIRECT_URL` : connexion directe port 5432 — utilisé par `prisma migrate dev/deploy` (les migrations ne supportent pas pgBouncer)
- Generator `prisma-client-js` avec `previewFeatures = ["typedSql", "fullTextSearchPostgres", "driverAdapters"]`
- Mapping snake_case ↔ camelCase via `@map("...")` et `@@map("...")` (convention DB en snake_case, code en camelCase)

## Critères d'acceptation (Gherkin)

**Scénario 1 — Génération et application de la migration**

```gherkin
Given le schéma DB est défini dans `prisma/schema.prisma`
When le développeur exécute `pnpm prisma migrate dev --name init`
Then une migration SQL est générée dans `prisma/migrations/<timestamp>_init/migration.sql`
And les tables sont créées sur Supabase (local et cloud)
And `prisma generate` est exécuté automatiquement → types TypeScript inférés depuis le schéma Prisma
And RLS est activée sur toutes les tables sensibles (via SQL post-migration)
```

**Scénario 2 — SQL brut non paramétré refusé en review**

```gherkin
Given un dev essaie d'écrire une requête SQL brute non paramétrée
When la review est faite
Then la PR est rejetée (règle ESLint custom : `$queryRawUnsafe` interdit hors cas justifié par ADR)
And un message indique d'utiliser `prisma.<model>.findMany()` / `$queryRaw` paramétré
```

**Scénario 3 — Migration partielle = rollback complet**

```gherkin
Given une migration contient 3 instructions et la 2ᵉ échoue
When `prisma migrate dev` est appliquée
Then la transaction est rollbackée entièrement (Prisma Migrate utilise une transaction implicite)
And la DB reste dans l'état précédent
And un log clair indique l'erreur et la migration est marquée failed dans `_prisma_migrations`
```

## Cas limites à traiter

- **Migration partielle qui échoue** : doit être atomique (transaction unique gérée par Prisma Migrate).
- **Re-run d'une migration déjà appliquée** : idempotent (Prisma track les migrations dans la table `_prisma_migrations`).
- **Conflit de migration entre devs** : merge order strict, naming `YYYYMMDDHHMMSS_description/migration.sql`.
- **Drop de colonne accidentel** : revue obligatoire + flag explicite (`prisma migrate dev` interdit drop sans `--accept-data-loss`).
- **Données existantes incompatibles** : migration en 2 étapes (add nullable → backfill → NOT NULL) via `prisma migrate dev --create-only` puis édition manuelle SQL.
- **Drift de schéma** détecté par `prisma migrate status` en CI.

## Sous-tâches techniques

- **TT-01.4.1** — Définir le schéma dans `prisma/schema.prisma` : models `User`, `Cursus`, `CursusVersion`, `Module`, `Cohorte`, `Membership`, `Submission`, `HarnessRun`, `Quiz`, `QuizAttempt`, `Alert`, `Notification`, `Badge`, `UserBadge`, `AuditLog`, `FeatureFlag` + enums (`UserRole`, `SubmissionStatus`, etc.)
- **TT-01.4.2** — Ajouter `organizationId String? @map("organization_id")` (préparée multi-tenant) sur les entités racine, NULL en MVP
- **TT-01.4.3** — Trigger SQL `updated_at` automatique sur toutes les tables avec ce champ (post-migration script)
- **TT-01.4.4** — RLS policies de base sur toutes les tables (RLS active par défaut ; policies fines viennent en EP-02) — appliquées via SQL brut dans une migration dédiée
- **TT-01.4.5** — Indexes via `@@index([...])` sur les FK et colonnes filtrées (`status`, `userId`, `cohorteId`, etc.)
- **TT-01.4.6** — Seed file `prisma/seed.ts` pour le dev local (1 admin, 1 formateur, 3 stagiaires fictifs), branché via `package.json` (`prisma.seed = "tsx prisma/seed.ts"`)
- **TT-01.4.7** — Documenter le schéma dans `docs/db-schema.md` (généré via `prisma generate` + `prisma-erd-generator` ou similaire)
- **TT-01.4.8** — Règle ESLint custom : interdit `$queryRawUnsafe` hors cas listés dans ADR
- **TT-01.4.9** — Créer le rôle Postgres applicatif `cursus_app` (non-superuser) utilisé par Prisma Client au runtime → RLS reste effective défense en profondeur

## Stack utilisée

- **Prisma 7.8** (`@prisma/client` runtime TS pur, `prisma` CLI) — schéma déclaratif unique source de vérité
- **Prisma Migrate** — versions SQL versionnées avec le code dans `prisma/migrations/`
- **Supabase Postgres 16** — extensions `uuid-ossp`, `pgcrypto`
- **Supabase RLS** — défense en profondeur (Prisma utilise rôle `cursus_app` non-superuser)

## Dépendances

- **Bloqué par** : ST-01.1 (CUR-25) — squelette projet + Prisma installé.
- **Bloque** : ST-02.1 (CUR-32), ST-02.4 (CUR-35), tous les Epics métier (EP-03 à EP-13).

## Non-goals (hors scope)

- Pas de données métier précises (juste les coquilles de tables).
- Pas de RLS policies métier détaillées (viennent avec les Epics correspondants).
- Pas de partitionnement (à évaluer en v1.x pour `audit_log` et `harness_runs`).
- Pas d'extension PostgreSQL exotique (juste `uuid-ossp`, `pgcrypto` standards Supabase).

## Tests à écrire

- **Unit / type** : les types Prisma générés (`@prisma/client`) sont cohérents avec les attentes métier (test compile-time via `tsc --noEmit`).
- **Integration** : appliquer la migration sur DB de test → vérifier que toutes les tables existent + colonnes typées correctement (via `prisma db pull` et diff).
- **Integration** : `prisma db seed` se charge sans erreur sur DB vierge.
- **Security** : RLS bloque les SELECT par un utilisateur non authentifié sur les tables sensibles (test négatif via client Supabase JS avec anon key).
- **Property-based** : générer N rows fictives via fast-check, vérifier que les contraintes FK / NOT NULL tiennent.

## Observabilité

- **Logs** : logs de migration apparaissent dans Supabase Logs et `_prisma_migrations`.
- **Métriques** : compteur de migrations appliquées, durée moyenne.
- **Alertes** : si `prisma migrate deploy` de prod échoue en CI, alerte critique au tech lead.

## Considérations sécurité

- **RLS activée par défaut** sur toutes les tables (même si pas de policy métier finale) — fail closed.
- **Pas de colonne password en clair** — Supabase Auth gère le hash bcrypt.
- **Audit log immuable** : RLS policy refuse UPDATE/DELETE.
- **Clés service Supabase** : uniquement côté serveur, jamais exposées au client.
- **Backup automatique Supabase** : vérifier que les daily snapshots sont actifs.
- **Rôle Prisma** `cursus_app` : privilèges minimums (SELECT/INSERT/UPDATE/DELETE sur tables app uniquement, pas de superuser).

## Considérations performance

- **Indexes** via `@@index` sur toutes les FK et colonnes filtrées (métier : `status`, `dueDate`, `cohorteId`).
- **EXPLAIN ANALYZE** sur les requêtes prévues (évaluer cardinalité).
- Pas de N+1 attendu : Prisma `include`/`select` pousse vers le batching, et le runtime TS pur de v7 a un overhead très faible.
- Pool de connexions Supavisor port 6543 en transaction mode → pas de bloat de connexions Vercel serverless.

## Definition of Done spécifique

- `pnpm prisma migrate dev && pnpm prisma db seed` fonctionnent sur DB vierge en < 30s.
- Documentation du schéma générée et commitée dans `docs/db-schema.md`.
- Au moins 1 test RLS négatif passe (un user lambda ne peut PAS lire `audit_log` via Supabase client anon).
- `prisma migrate status` retourne "Database schema is up to date" en CI.

---

#### CUR-29 — ST-01.5 ADR-001 Stack technique

## Contexte business

Pour ne pas avoir à re-discuter les choix de fond plus tard (et risquer le syndrome "on aurait dû prendre X"), on les consigne dans un Architecture Decision Record (ADR) dès le début. Sans ADR, chaque nouveau dev rouvre les débats et le projet stagne.

Valeur livrée : un dev qui arrive peut lire en 10 minutes les raisons de chaque choix structurant. Les alternatives évaluées sont documentées avec leur raison de rejet.

## Description fonctionnelle

Rédiger ADR-001 dans `docs/adr/001-stack-technique.md`. L'ADR explicite les choix structurants : **Nuxt 4.4**, **Vue 3.5**, **Supabase**, **Prisma 7.8 ORM**, **@nuxt/ui 4.8 + Tailwind 4.3**, Vercel, GitHub Actions, Resend, Sentry 10.53, Pino, Plausible. Pour chaque choix : contexte, décision, alternatives considérées (avec raison de rejet), conséquences (positives et négatives).

## Sections critiques de l'ADR

### Choix ORM : Prisma 7.8

**Décision** : Prisma 7.8 (sorti nov 2025, runtime TypeScript pur).

**Alternatives évaluées** :

- **Drizzle ORM** — rejeté : excellent en typage mais écosystème moins mûr (Studio, migration tooling), DX inférieure sur les relations complexes (cursus, modules, submissions imbriqués), pas de generator d'ERD natif. Aurait nécessité plus de boilerplate sur les requêtes métier.
- **Kysely** — rejeté : query builder bas niveau, pas de gestion de migrations intégrée, équipe pas familière.
- **Prisma 6 (Rust engine)** — rejeté : cold start lents sur Vercel serverless, binaires natifs à vendoriser (problèmes ARM/x86), bundles serveur trop gros.
- **TypeORM** — rejeté : actively maintained mais DX inférieure, decorators-first qui rend les types moins inférables.

**Pourquoi Prisma 7** :

- Runtime **100% TypeScript** (abandon du Rust query engine en nov 2025)
- **3× plus rapide** sur la majorité des queries vs v6
- **Bundles ~90% plus petits** côté serveur
- Cold start drastiquement réduit (critique pour Vercel serverless)
- Pas de binaire natif → compatibilité Vercel/Edge runtime améliorée, déploiement simplifié
- Schema declarative (`schema.prisma`) = source de vérité unique, génère Client TS + migrations SQL
- Excellente DX : autocomplétion sur relations, `include`/`select` typés, Studio en local

**Conséquences** :

- (+) DX moderne, sécurité du typage end-to-end, communauté massive
- (+) Migrations SQL versionnées dans Git, idempotentes
- (−) Bypass RLS Supabase par défaut → mitigé par rôle `cursus_app` non-superuser + RBAC applicatif (voir section sécurité)
- (−) Coexistence avec client Supabase JS (Auth, Storage, Realtime) à documenter

### Choix framework : Nuxt 4.4

**Décision** : Nuxt 4.4.5 + Vue 3.5.

**Alternatives évaluées** :

- **Nuxt 3** — rejeté : EOL en juillet 2026, autant démarrer directement sur Nuxt 4 (migration documentée mais inutile de la subir 6 mois après le launch).
- **Next.js 15** — rejeté : équipe Vue-first, écosystème Vue 3 mature et performant, pas de raison stratégique de switcher React.
- **SvelteKit** — rejeté : écosystème plus restreint sur les modules nécessaires (Supabase, i18n, SEO).

### Choix UI : @nuxt/ui 4.8 + Tailwind 4.3

**Décision** : @nuxt/ui v4 (Free + Pro unifiés en open source) + Tailwind CSS 4.3 (config CSS-first via `@theme`).

**Alternatives** : shadcn-vue (rejeté : trop de boilerplate, choix unitaires à chaque composant), PrimeVue (rejeté : style et a11y moins propres), Vuetify 3 (rejeté : Material Design ne colle pas au branding).

## Critères d'acceptation (Gherkin)

**Scénario 1 — Nouveau dev lit l'ADR**

```gherkin
Given le fichier docs/adr/001-stack-technique.md existe
When un nouveau dev arrive
Then il peut lire en 10 minutes les raisons de chaque choix
And les alternatives envisagées (Drizzle, Kysely, Nuxt 3, Next.js, etc.) sont listées avec leur raison de rejet
And l'ADR suit le template MADR (Markdown ADR)
```

**Scénario 2 — ADR versé dans Git**

```gherkin
Given l'ADR-001 est rédigé
When il est mergé sur main
Then il est accessible à tous depuis le repo
And il est référencé dans le README
```

**Scénario 3 — Mise à jour ultérieure**

```gherkin
Given un choix initial doit être révisé
When un nouvel ADR (ex: ADR-002) est créé
Then l'ADR-001 reste figé (historique imuable)
And l'ADR-002 référence ADR-001 ("supersedes")
```

## Cas limites à traiter

- **Décision contestée en cours de projet** : ne pas modifier l'ADR-001, en créer un nouveau qui le "supercède".
- **Choix non-structurant** : ne pas l'inclure (l'ADR doit rester court et focused).
- **Conflit entre 2 contributeurs** : section "Débat" qui liste les arguments + décision finale.

## Sous-tâches techniques

- **TT-01.5.1** — Rédiger ADR-001 selon le template MADR (Context, Decision, Alternatives, Consequences) couvrant : framework (Nuxt 4), ORM (Prisma 7), DB (Supabase), UI (@nuxt/ui 4 + Tailwind 4), hosting (Vercel), CI (GH Actions), mail (Resend), observability (Sentry 10.53 + Pino), analytics (Plausible)
- **TT-01.5.2** — Créer le dossier `docs/adr/` avec un README expliquant la convention
- **TT-01.5.3** — Référencer l'ADR-001 depuis le README principal
- **TT-01.5.4** — Inclure schéma de coexistence Prisma ↔ RLS Supabase (rôle `cursus_app`, RBAC middleware Nuxt)

## Dépendances

- **Bloqué par** : Aucune. Peut être livré en parallèle de ST-01.1.
- **Bloque** : Aucune (mais influence toutes les futures décisions techniques).

## Non-goals (hors scope)

- Pas une justification de chaque lib (juste les choix structurants : runtime, DB, ORM, UI, hosting, CI, mail, observability).
- Pas un livre blanc — doit rester < 5 pages.
- Pas d'ADR-002+ ici (ADR-002 vient avec le spike harnais ST-01.6).

## Tests à écrire

- N/A — c'est un document, validation par revue de pair (Mohamed + 1 dev).

## Observabilité

- N/A — document statique.

## Considérations sécurité

- L'ADR ne doit pas contenir de secrets ou de clés.
- Mention explicite des points de sécurité liés à chaque choix (ex : Supabase RLS, Vercel env scoping, rôle Prisma `cursus_app` limité).

## Definition of Done spécifique

- ADR-001 reviewé par Mohamed et mergé.
- Lien depuis le README.
- Template MADR respecté.
- Section Prisma 7 justifie explicitement le rejet de Drizzle et Prisma 6 (Rust).

---

#### CUR-30 — ST-01.6 Spike PoC harnais GitHub Actions

## Contexte business

Le harnais est **l'hypothèse #1 risquée du produit**. Sans validation préalable, on engage 6 mois de développement sur une fonctionnalité dont la faisabilité est incertaine (latence GitHub Actions, fiabilité webhooks, cost). Avant de construire l'app autour, on valide en 3 jours que c'est faisable. C'est l'investissement le plus rentable du projet.

Valeur livrée : une réponse Go/No-Go sur la faisabilité technique du harnais. Si No-Go, on adapte la stratégie produit. Si Go, on a une preuve concrète et une mesure de latence baseline.

## Description fonctionnelle

PoC à part dans `spikes/harness-poc/` (code jeté en fin de spike, juste pour valider le concept). Le PoC déclenche un workflow GitHub Actions sur un repo fictif via `workflow_dispatch`, attend le résultat via webhook, et l'affiche. 3 checks implémentés : `repo_exists`, `branch_exists`, `file_exists`. Mesure de latence p50/p95 sur 10 runs.

## Critères d'acceptation (Gherkin)

**Scénario 1 — Déclenchement et récupération du résultat**

```gherkin
Given un repo de test GitHub avec une structure connue
When on déclenche le PoC harnais
Then le workflow GitHub Actions s'exécute
And il vérifie 3 checks (repo_exists, branch_exists, file_exists)
And il poste le résultat via webhook au PoC
And le PoC affiche le résultat structuré
And la latence totale est mesurée et documentée (cible : < 3 min p95)
```

**Scénario 2 — Repo privé (cas d'erreur)**

```gherkin
Given un repo cible est privé et inaccessible à la GitHub App
When on déclenche le PoC
Then le workflow échoue proprement avec un message clair
And le webhook est tout de même posté avec statut "failed" et raison
```

**Scénario 3 — Workflow timeout**

```gherkin
Given le workflow dépasse le timeout configuré (5 min)
When GitHub Actions atteint le timeout
Then le job est tué
And le PoC détecte l'absence de webhook après 7 min
And il marque le run comme "timeout"
```

## Cas limites à traiter

- **Repo privé** : doit échouer proprement avec message clair, pas crash silencieux.
- **Workflow qui timeout** : timeout configuré côté GH Actions (5 min) + détection côté PoC.
- **GitHub API rate limit** : retry exponentiel, documenté dans la note de spike.
- **Webhook perdu** (panne réseau) : polling fallback sur l'API GitHub.
- **Repo qui n'existe plus** : webhook avec status "error".

## Sous-tâches techniques

- **TT-01.6.1** — Créer org GitHub `cursus-app` (ou équivalent)
- **TT-01.6.2** — Créer GitHub App "Cursus Harness" + permissions (lecture repos publics, déclenchement workflow_dispatch, post webhook)
- **TT-01.6.3** — Créer 3-4 repos fixtures sur l'org (un OK, un avec branche manquante, un avec file manquant, un privé pour test négatif)
- **TT-01.6.4** — Écrire workflow YAML générique avec 3 checks (composite actions)
- **TT-01.6.5** — Écrire petit script Node qui déclenche le workflow et écoute le webhook
- **TT-01.6.6** — Mesurer latence p50/p95 sur 10 runs (logs exportés en CSV)
- **TT-01.6.7** — Rédiger note de fin de spike : "OK / KO / OK avec ajustements" + ADR-002 si OK

## Dépendances

- **Bloqué par** : Aucune (peut être lancé en parallèle des autres ST-01.X).
- **Bloque** : tous les Epics qui dépendent du harnais (EP-06 surtout). Sans Go sur ce spike, EP-06 ne démarre pas.

## Non-goals (hors scope)

- Pas de UI, pas d'auth, pas d'intégration Supabase à ce stade.
- Le code du PoC sera **jeté** (juste pour apprendre).
- Pas de catalogue complet de checks (juste 3).
- Pas d'optimisation de latence (mesure brute, optimisation en EP-06).

## Tests à écrire

- N/A formel — c'est un spike, on apprend en faisant.
- **Mesure** : 10 runs successifs avec mesure latence p50/p95.
- **Mesure** : tester 1 cas négatif (repo privé) et 1 cas de timeout.

## Observabilité

- **Logs** : chaque run du PoC écrit dans `spikes/harness-poc/logs/` (timestamp, duration, status).
- **Note de spike** rédigée en fin avec : conclusion (Go/No-Go), métriques, risques identifiés, recommandations pour EP-06.

## Considérations sécurité

- Clé privée GitHub App stockée localement (jamais commitée), suppression après spike.
- Webhook HTTP local (ngrok ou pareil) avec validation HMAC pour valider la démarche.
- Repos fixtures : aucune donnée sensible.

## Considérations performance

- Cible : p95 < 3 min sur l'ensemble du run (déclenchement → résultat reçu).
- Si > 5 min p95 : alerte rouge, l'hypothèse #1 est invalidée, retour vision produit.

## Definition of Done spécifique

- Note de spike commitée dans `docs/spikes/2026-Q2-harness-poc.md` avec conclusion Go/No-Go.
- ADR-002 créé si Go (architecture cible du harnais).
- Métriques p50/p95 documentées.

---

#### CUR-31 — ST-01.7 Setup observabilité minimale (Sentry + Pino)

## Contexte business

Avant de livrer quoi que ce soit en production, on doit pouvoir **observer** les erreurs. Une erreur silencieuse en prod = utilisateur perdu + perte de confiance. Sentry 10.53 + Pino sont l'observabilité minimale viable.

Valeur livrée : toute erreur en prod est capturée, sourcemappée, contextualisée (userId, requestId) et visible dans Sentry. Les logs serveur sont structurés, sans PII, et ingérés par Vercel.

## Description fonctionnelle

Intégrer Sentry 10.53 côté client (Vue 3.5) + serveur (Nitro) via `@sentry/nuxt` ^10.53. Logger Pino ^9 côté serveur avec format JSON structuré. Logs ingérés par Vercel. Middleware Nitro qui logue chaque requête avec contexte (method, path, status, duration_ms, userId). Source maps uploadées à Sentry au build (Nuxt 4 build).

## Critères d'acceptation (Gherkin)

**Scénario 1 — Erreur client capturée**

```gherkin
Given une erreur survient côté client (composant Vue 3.5)
When elle n'est pas capturée par un try/catch local
Then elle apparaît dans Sentry avec source map résolue (fichier .vue, ligne)
And elle inclut le breadcrumb des actions récentes
And elle est associée au userId si l'utilisateur est connecté
```

**Scénario 2 — Exception serveur captée + log structuré**

```gherkin
Given un endpoint serveur (Nitro) lève une exception
When elle n'est pas capturée
Then elle est loguée par Pino avec stack trace + contexte (requestId, userId)
And elle apparaît dans Sentry serveur avec tags (route, method)
And le client reçoit une 500 générique sans détail technique
```

**Scénario 3 — Log structuré par requête**

```gherkin
Given un endpoint serveur reçoit une requête
When il termine (success ou error)
Then une log structurée est émise au format JSON : {method, path, status, duration_ms, userId, requestId}
And elle est visible dans Vercel Logs en < 5s
And elle ne contient AUCUNE PII (password, token, email en clair)
```

## Cas limites à traiter

- **Pas de PII dans les logs** (email, password, token) — helper de redaction obligatoire (champ `password` → `[REDACTED]`).
- **Sample rate Sentry** configurable : 100 % en dev, 25 % en prod (cost control).
- **Erreur dans Sentry lui-même** : ne doit pas crasher l'app (try/catch autour de Sentry.captureException).
- **Charge élevée** : logs en mode batch (Pino transport async) pour ne pas bloquer le request.
- **Erreur 4xx** (validation) : loguée en `warn`, pas en `error` (pas de bruit Sentry).

## Sous-tâches techniques

- **TT-01.7.1** — Setup `@sentry/nuxt` ^10.53 (client + serveur, compatible Nuxt 4.4)
- **TT-01.7.2** — Wrapper Pino ^9 dans `server/utils/logger.ts` avec serializers (redaction PII)
- **TT-01.7.3** — Middleware Nitro pour logger les requêtes entrantes + sortantes
- **TT-01.7.4** — Source maps uploadées à Sentry au build (plugin Sentry Nuxt 4)
- **TT-01.7.5** — Test : provoquer une erreur (route `/__test-error`), vérifier qu'elle remonte dans Sentry
- **TT-01.7.6** — RequestId généré par middleware (UUID v4) et propagé dans tous les logs

## Dépendances

- **Bloqué par** : ST-01.1 (CUR-25), ST-01.3 (CUR-27) — besoin Nuxt 4 + Vercel déployé.
- **Bloque** : EP-02 et au-delà — toutes les features qui ont besoin d'observabilité minimale en prod.

## Non-goals (hors scope)

- Pas de métriques détaillées (vient avec EP-16).
- Pas d'alertes config (vient avec EP-16).
- Pas de tracing distribué (Sentry Traces optionnel en EP-16).
- Pas de log search avancé (Vercel Logs natifs suffisent au MVP).

## Tests à écrire

- **Unit** : logger sanitise bien les PII (champ `password` → `[REDACTED]`, `email` masqué partiel `j***@example.com`).
- **Unit** : requestId est bien propagé dans tous les logs d'une même requête.
- **Integration** : une erreur synthétique apparaît bien dans Sentry (avec source map résolue).

## Observabilité

- **Sentry projet créé** (1 projet client, 1 projet serveur, ou 1 unifié selon plan).
- **Logs structurés** visibles dans Vercel logs.
- **DSN Sentry** dans les env vars Vercel (séparées preview / prod).
- **Source maps** uploadées au build (release tagging).

## Considérations sécurité

- **Redaction PII obligatoire** : password, token, email plain, GitHub secrets — helper centralisé + tests.
- **DSN Sentry client** est public OK (c'est l'usage normal), mais le DSN serveur ne doit pas leak.
- **Stack traces en prod** : pas affichées au client (500 générique), uniquement dans Sentry / Vercel logs.
- **Rétention logs** : 30j en prod (configurable Vercel), pas de PII conservée au-delà.

## Considérations performance

- Pino transport async — pas de blocage request.
- Sentry sample rate 25% en prod pour rester sous le quota.
- Source maps upload async au build (pas de blocage CI).

## Definition of Done spécifique

- Une erreur volontaire dans `/__test-error` remonte bien dans Sentry avec source map résolue.
- Un endpoint sain produit un log structuré visible dans Vercel logs en < 5s.
- Test unit redaction PII passe.

---

## EP-02 — Identity & Access (CUR-2)

## Objectif business

Fournir un système d'identité et d'accès robuste (email/mot de passe, magic link d'invitation, OAuth GitHub obligatoire pour les stagiaires, RBAC + RLS Supabase, 2FA TOTP premium, gestion de profil) afin que chaque utilisateur accède uniquement aux ressources qui le concernent et que l'organisation puisse émettre des certificats avec une garantie d'identité.

## Valeur métier (Business value)

C'est la pierre angulaire de la confiance produit : sans elle, aucun écran authentifié ne peut exister, et un certificat émis n'aurait aucune valeur. Le 2FA TOTP dès le MVP est un axe **premium** non négociable pour un produit qui émet des certificats interopérables (anti-fraude). L'OAuth GitHub obligatoire pour les stagiaires conditionne le pilier #2 du produit (harnais auto sur repo public).

## Tier et priorité

- **Tier** : Core (ST-02.5 = Premium)
- **Priorité** : Highest
- **Sprint cible** : Sprint 1 + Sprint 2
- **Story points cumulés** : 26

## Stories rattachées

| Key                                                                              | Titre                                                                 | Story Points | Priorité |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------ | -------- |
| CUR-32                                                                           | ST-02.1 — Authentification email + mot de passe avec validation forte | 3            | Highest  |
| CUR-33                                                                           | ST-02.2 — Magic link (invitation par token signé JWT)                 | 3            | Highest  |
| CUR-34                                                                           | ST-02.3 — OAuth GitHub pour les stagiaires (obligatoire)              | 3            | Highest  |
| CUR-35                                                                           | ST-02.4 — Système de rôles (RBAC) avec RLS Supabase                   | 5            | Highest  |
| CUR-36                                                                           | ST-02.5 — 2FA TOTP (Premium MVP)                                      | 3            | High     |
| CUR-37                                                                           | ST-02.6 — Gestion du profil utilisateur                               | 2            | High     |
| **Total Stories listées**                                                        |                                                                       | **19**       |          |
| Réserve technique / hardening (audit RLS, recovery codes, edge cases multi-rôle) |                                                                       | **7**        |          |
| **Total Epic**                                                                   |                                                                       | **26**       |          |

_Note : la réserve couvre les sous-tâches d'hardening sécurité non détaillées en stories autonomes (politique mdp avancée, lockout, recovery codes 2FA, tests pénétration RLS de base) — détaillées dans le playbook ingénierie._

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done (DoD validée).
- Un stagiaire invité par magic link peut créer son compte, lier son GitHub et atteindre sa page "Cette semaine".
- Un formateur peut activer son 2FA TOTP et stocker des recovery codes.
- L'audit RLS exhaustif passe (cf. ST-15.6) : un user d'une autre cohorte ne peut JAMAIS lire ou écrire les données d'une cohorte qui n'est pas la sienne.
- Latence p95 auth/login < 500 ms en prod.
- 0 erreur critique Sentry sur les flux auth pendant 7 jours.

## Risques identifiés

| Risque                                                                                   | Probabilité | Impact   | Mitigation                                                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mauvaise configuration RLS qui expose des données entre cohortes                         | Moyenne     | Critique | ST-15.6 (audit RLS exhaustif avec tests négatifs) en transverse ; revue obligatoire de toute policy par un second dev ; tests automatisés couvrant chaque table sensible |
| Stagiaires sans compte GitHub bloqués à l'onboarding                                     | Moyenne     | Élevé    | Briefing préalable, étape onboarding "Crée un compte GitHub" + tutoriel inline ; fallback option "je n'ai pas encore de compte" avec deadline à J+2                      |
| Magic link expiré ou réutilisé (replay attack)                                           | Moyenne     | Élevé    | Token JWT signé HS256 avec expiration 7 jours + flag `used_at` côté DB pour idempotence ; rate limit 5 tentatives/h par email                                            |
| 2FA TOTP qui bloque un user qui perd son téléphone                                       | Moyenne     | Moyen    | Recovery codes générés à l'activation (10 codes one-shot) ; procédure de reset documentée côté admin                                                                     |
| Bug RBAC : un formateur secondaire qui pourrait éditer un cursus dont il n'est pas owner | Moyenne     | Élevé    | Tests d'intégration spécifiques par combinaison rôle × ressource × action ; matrice RBAC documentée dans le playbook                                                     |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (besoin du schéma DB + Supabase configuré).
- **Bloque** : EP-03, EP-04, EP-05, EP-13 (toute UI authentifiée) ; EP-06 (l'OAuth GitHub conditionne la soumission stagiaire) ; EP-09 et EP-10 (le certificat nécessite une identité prouvée par 2FA).
- **Parallèle à** : EP-15 (sécurité/RGPD partage la RLS et la matrice de droits) ; EP-18 (les écrans login doivent respecter le design system dès le départ).

## Périmètre exclu de cet Epic (non-goals)

- Pas de SSO entreprise (SAML/OIDC entreprise) — parqué v2+.
- Pas de gestion d'organisations multiples (multi-tenant) — colonne `organization_id` préparée mais non utilisée au MVP.
- Pas de fédération d'identité (Google, Microsoft) — uniquement email/mdp + GitHub au MVP.
- Pas d'audit log unifié (couvert par ST-08.4 et EP-15).

### Stories de cet Epic

Le contenu détaillé de chaque story (contexte, AC Gherkin, sous-tâches, DoD) est disponible sur JIRA — voir liens ci-dessous.

- [CUR-32 — ST-02.1 Authentification email + mot de passe avec validation forte](https://ousmanesadjad.atlassian.net/browse/CUR-32)
- [CUR-33 — ST-02.2 Magic link (invitation par token signé JWT)](https://ousmanesadjad.atlassian.net/browse/CUR-33)
- [CUR-34 — ST-02.3 OAuth GitHub pour les stagiaires (obligatoire)](https://ousmanesadjad.atlassian.net/browse/CUR-34)
- [CUR-35 — ST-02.4 Système de rôles (RBAC) avec RLS Supabase](https://ousmanesadjad.atlassian.net/browse/CUR-35)
- [CUR-36 — ST-02.5 2FA TOTP (Premium MVP)](https://ousmanesadjad.atlassian.net/browse/CUR-36)
- [CUR-37 — ST-02.6 Gestion du profil utilisateur](https://ousmanesadjad.atlassian.net/browse/CUR-37)

---

## EP-03 — Cursus Builder (CUR-3)

## Objectif business

Donner au formateur un outil de construction de cursus structurés (métadonnées, modules drag-and-drop, ressources, spécifications de livrables avec critères harnais, versionning, clonage, import roadmap.sh, prévisualisation stagiaire) afin de matérialiser le pilier #1 du produit : **cadencement structuré**.

## Valeur métier (Business value)

C'est le cœur de la valeur formateur : sans Cursus Builder, le produit n'a pas de matière à cadrer. Le formateur crée une fois, réutilise pour chaque cohorte (clonage, versionning). L'import roadmap.sh divise par 5 le temps de création d'un cursus initial. La spécification fine du livrable conditionne ce que le harnais peut vérifier : c'est le contrat entre EP-03 et EP-06.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Sprint 2 + Sprint 3
- **Story points cumulés** : 39

## Stories rattachées

| Key                                                                                                                | Titre                                                           | Story Points | Priorité |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------ | -------- |
| CUR-38                                                                                                             | ST-03.1 — CRUD cursus (métadonnées) avec brouillon/publié       | 3            | Highest  |
| CUR-39                                                                                                             | ST-03.2 — Édition des modules avec drag-and-drop                | 5            | Highest  |
| CUR-40                                                                                                             | ST-03.3 — Gestion des ressources d'un module                    | 3            | Highest  |
| CUR-41                                                                                                             | ST-03.4 — Spécification du livrable hebdo avec critères harnais | 5            | Highest  |
| CUR-42                                                                                                             | ST-03.5 — Versionning des cursus (snapshot par version)         | 3            | High     |
| CUR-43                                                                                                             | ST-03.6 — Clonage d'un cursus                                   | 2            | Medium   |
| CUR-44                                                                                                             | ST-03.7 — Import depuis roadmap.sh                              | 3            | High     |
| CUR-45                                                                                                             | ST-03.8 — Prévisualisation cursus en mode stagiaire             | 2            | Medium   |
| **Total Stories listées**                                                                                          |                                                                 | **26**       |          |
| Réserve technique (research juridique roadmap.sh, modélisation diff cursus_versions, conflit drag-drop optimistic) |                                                                 | **13**       |          |
| **Total Epic**                                                                                                     |                                                                 | **39**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Mohamed peut créer un cursus complet (métadonnées + 6 modules + 6 livrables + ressources) en moins de 90 minutes.
- Le formateur peut cloner un cursus existant en 1 clic et obtenir une copie modifiable indépendamment.
- L'import roadmap.sh d'1 cursus simple aboutit en moins de 60 secondes à un cursus brouillon éditable.
- La prévisualisation stagiaire montre exactement ce que verra le stagiaire (parité visuelle 100 %).
- La spécification d'un livrable produit un "contrat harnais" parsable par EP-06 (schéma JSON validé par Zod).

## Risques identifiés

| Risque                                                                                                 | Probabilité | Impact | Mitigation                                                                                                               |
| ------------------------------------------------------------------------------------------------------ | ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Recherche juridique roadmap.sh non concluante (licence) bloque ST-03.7                                 | Moyenne     | Moyen  | Recherche juridique préalable obligatoire ; fallback : import générique JSON/YAML, l'utilisateur télécharge manuellement |
| Modèle de versionning trop rigide qui rend l'édition cauchemardesque (chaque modif = nouvelle version) | Moyenne     | Élevé  | Brouillon éditable + snapshot à la publication uniquement ; ADR "stratégie de versionning" avant ST-03.5                 |
| Drag-drop modules avec races conditions sur position si 2 formateurs éditent le même cursus            | Faible      | Moyen  | Optimistic UI + Conflict-free positions (LexoRank-like) ; lock soft 5 min sur la ressource pendant l'édition             |
| Spécification livrable trop libre rend EP-06 impossible à implémenter                                  | Moyenne     | Élevé  | Schéma JSON fermé (Zod) co-construit avec EP-06 dès la story ST-03.4 ; validation au save                                |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (schéma DB), EP-02 (auth + RBAC).
- **Bloque** : EP-04 (une cohorte attache un cursus publié), EP-05 (parcours stagiaire lit le cursus), EP-06 (le harnais exécute les critères définis dans ST-03.4), EP-07 (les quiz vivent dans des modules).
- **Parallèle à** : EP-18 (composants drag-drop, formulaires) ; EP-19 (UI multilingue), EP-21 (suggestion IA de ressources, post-MVP).

## Périmètre exclu de cet Epic (non-goals)

- Pas de marketplace de cursus (anti-pilier).
- Pas de génération IA d'un cursus complet (anti-pilier ; suggestion de ressources reste légère et v1.1 via EP-21).
- Pas d'éditeur WYSIWYG complexe pour les ressources (Markdown ou liens externes uniquement au MVP).
- Pas d'imports SCORM/xAPI (parqué v2+).

### Stories de cet Epic

- [CUR-38 — ST-03.1 CRUD cursus (métadonnées) avec brouillon/publié](https://ousmanesadjad.atlassian.net/browse/CUR-38)
- [CUR-39 — ST-03.2 Édition des modules avec drag-and-drop](https://ousmanesadjad.atlassian.net/browse/CUR-39)
- [CUR-40 — ST-03.3 Gestion des ressources d'un module](https://ousmanesadjad.atlassian.net/browse/CUR-40)
- [CUR-41 — ST-03.4 Spécification du livrable hebdo avec critères harnais](https://ousmanesadjad.atlassian.net/browse/CUR-41)
- [CUR-42 — ST-03.5 Versionning des cursus (snapshot par version)](https://ousmanesadjad.atlassian.net/browse/CUR-42)
- [CUR-43 — ST-03.6 Clonage d'un cursus](https://ousmanesadjad.atlassian.net/browse/CUR-43)
- [CUR-44 — ST-03.7 Import depuis roadmap.sh](https://ousmanesadjad.atlassian.net/browse/CUR-44)
- [CUR-45 — ST-03.8 Prévisualisation cursus en mode stagiaire](https://ousmanesadjad.atlassian.net/browse/CUR-45)

---

## EP-04 — Cohorte & Enrôlement (CUR-4)

## Objectif business

Permettre au formateur de créer une cohorte rattachée à un cursus, d'y inviter des stagiaires (single + bulk CSV), d'attribuer des co-formateurs (globaux ou par module), de gérer l'échéancier et de décaler le planning en cas d'imprévu, afin que la cohorte soit le conteneur opérationnel de tout le suivi.

## Valeur métier (Business value)

La cohorte est l'unité opérationnelle du produit : tout (suivi, alertes, certificats) se rattache à une cohorte. Sans cette Epic, le formateur ne peut pas démarrer un pilote, ni démarrer la 2ᵉ promotion sans recopier tout. L'invitation bulk CSV économise un formateur sur l'opérationnel quand il ouvre une promotion de 15-20 stagiaires. La gestion fine des co-formateurs (par module) reconnaît la réalité d'équipes pédagogiques multi-compétences.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Sprint 2
- **Story points cumulés** : 21

## Stories rattachées

| Key                                                                                                  | Titre                                                          | Story Points | Priorité |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------ | -------- |
| CUR-46                                                                                               | ST-04.1 — CRUD cohorte avec cycle de vie                       | 3            | Highest  |
| CUR-47                                                                                               | ST-04.2 — Invitation de stagiaires (single + bulk CSV)         | 3            | Highest  |
| CUR-48                                                                                               | ST-04.3 — Attribution de co-formateurs (globaux ou par module) | 2            | High     |
| CUR-49                                                                                               | ST-04.4 — Échéancier et décalage de planning                   | 3            | High     |
| **Total Stories listées**                                                                            |                                                                | **11**       |          |
| Réserve technique (gestion CSV en erreur partielle, cycle de vie statuts, droits fins co-formateurs) |                                                                | **10**       |          |
| **Total Epic**                                                                                       |                                                                | **21**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Mohamed peut ouvrir une cohorte de 5 stagiaires en moins de 10 minutes via bulk CSV.
- Un co-formateur attribué à un module peut commenter les livrables de ce module mais pas d'un autre (RBAC fin vérifié).
- Un décalage de planning (ex : +1 semaine à partir du module 4) recalcule automatiquement toutes les deadlines aval, sans casser les progressions existantes.
- La cohorte peut transitionner brouillon → active → terminée → archivée avec contraintes vérifiées.

## Risques identifiés

| Risque                                                                                                    | Probabilité | Impact | Mitigation                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bulk CSV invalide (mauvaise colonne, doublons, emails malformés) provoque imports partiels                | Élevée      | Moyen  | Validation pré-import (preview avec lignes valides/rejetées) ; transaction atomique ou import en mode "par batch avec rapport" ; template CSV téléchargeable |
| Décalage de planning casse les progressions stagiaires en cours (deadlines passées soudain dans le futur) | Moyenne     | Élevé  | Règles claires : décalage à partir d'une date pivot, jamais rétroactif ; confirmation explicite + preview avant application                                  |
| Conflit de droits co-formateur global vs co-formateur module (qui gagne ?)                                | Moyenne     | Moyen  | Matrice RBAC documentée ; tests d'intégration spécifiques ; règle : le plus permissif gagne avec log d'audit                                                 |
| Invitations envoyées par erreur à des emails partis en spam                                               | Élevée      | Moyen  | SPF/DKIM/DMARC sur le domaine d'envoi (Resend) ; piste audit "invitation envoyée/reçue/ouverte" via webhooks Resend                                          |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (schéma DB), EP-02 (auth, RBAC), EP-03 (un cursus publié doit exister), EP-12 (emails d'invitation).
- **Bloque** : EP-05 (parcours stagiaire dépend de l'appartenance à une cohorte), EP-08 (progressions par stagiaire × module), EP-13 (dashboards par cohorte), EP-17 (pilote = 1 cohorte).
- **Parallèle à** : EP-15 (la rotation des données se définit à la cohorte).

## Périmètre exclu de cet Epic (non-goals)

- Pas de gestion de groupes/sous-groupes au sein d'une cohorte (parqué v1.x).
- Pas de tarification / facturation par cohorte (hors scope MVP).
- Pas d'interface de recrutement public (les stagiaires sont invités nominativement).
- Pas de leaderboard / classement inter-cohortes (anti-pilier).

### Stories de cet Epic

- [CUR-46 — ST-04.1 CRUD cohorte avec cycle de vie](https://ousmanesadjad.atlassian.net/browse/CUR-46)
- [CUR-47 — ST-04.2 Invitation de stagiaires (single + bulk CSV)](https://ousmanesadjad.atlassian.net/browse/CUR-47)
- [CUR-48 — ST-04.3 Attribution de co-formateurs (globaux ou par module)](https://ousmanesadjad.atlassian.net/browse/CUR-48)
- [CUR-49 — ST-04.4 Échéancier et décalage de planning](https://ousmanesadjad.atlassian.net/browse/CUR-49)

---

## EP-05 — Parcours stagiaire (semaine type) (CUR-5)

## Objectif business

Fournir au stagiaire son interface du quotidien : une page "Cette semaine" (timeline + compte à rebours), la soumission d'un livrable avec rapport harnais en temps réel, un bouton "Je suis bloqué" pour escalader sans hésitation, un historique de ses soumissions et un onboarding interactif premium.

## Valeur métier (Business value)

C'est l'interface où le stagiaire passe 90 % de son temps. Si elle est confuse, le produit échoue. Le bouton "Je suis bloqué" matérialise le pilier #4 (suivi async) : escalade sans hésitation, friction zéro. Le rapport harnais temps réel est le moment de vérité perceptif ("a-t-il validé ?") et conditionne la confiance dans le produit. L'onboarding interactif réduit le temps avant la première soumission (métrique d'activation clé du pilote).

## Tier et priorité

- **Tier** : Core (ST-05.5 = Premium)
- **Priorité** : Highest
- **Sprint cible** : Sprint 3 (ST-05.4 et 05.5 en Sprint 4)
- **Story points cumulés** : 23

## Stories rattachées

| Key                                                                   | Titre                                                                 | Story Points | Priorité |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------ | -------- |
| CUR-50                                                                | ST-05.1 — Page "Cette semaine" avec timeline + compte à rebours       | 3            | Highest  |
| CUR-51                                                                | ST-05.2 — Soumission d'un livrable avec rapport harnais en temps réel | 3            | Highest  |
| CUR-52                                                                | ST-05.3 — Bouton "Je suis bloqué" (escalade ciblée)                   | 2            | Highest  |
| CUR-53                                                                | ST-05.4 — Historique de mes soumissions                               | 2            | High     |
| CUR-54                                                                | ST-05.5 — Onboarding interactif premium (product tour)                | 3            | High     |
| **Total Stories listées**                                             |                                                                       | **13**       |          |
| Réserve technique (Realtime, fallback hors-ligne, polish UX critique) |                                                                       | **10**       |          |
| **Total Epic**                                                        |                                                                       | **23**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Un stagiaire pilote, sans aucune formation, peut accomplir sa première soumission valide en moins de 10 minutes (onboarding compris).
- Le bouton "Je suis bloqué" génère une alerte + notification formateur en moins de 5 secondes (mesuré).
- Le rapport harnais s'affiche en temps réel (Supabase Realtime) sans rafraîchissement manuel.
- L'historique des soumissions est consultable et filtrable par module.
- LCP < 2.5s, INP < 200ms sur la page "Cette semaine" sur p75 (vraies conditions réseau).

## Risques identifiés

| Risque                                                             | Probabilité | Impact | Mitigation                                                                                               |
| ------------------------------------------------------------------ | ----------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Le Realtime Supabase est trop lent ou peu fiable côté stagiaire    | Moyenne     | Élevé  | Polling de fallback toutes les 5s si pas de message Realtime en 10s ; tests en conditions réseau dégradé |
| Le stagiaire trouve l'onboarding trop long ou intrusif             | Moyenne     | Moyen  | Skippable à tout moment, sauvegardé "vu une fois" ; max 3 écrans ; A/B testable post-MVP                 |
| Soumission concurrente / multi-clic génère des doublons            | Moyenne     | Moyen  | Idempotence côté serveur (clé composée user_id + module_id + commit_sha) ; debounce client 2s            |
| Stagiaire qui appuie sur "Je suis bloqué" en boucle (spam)         | Faible      | Moyen  | Rate limit 5 alertes/h par stagiaire (Upstash Redis) ; détection alerte déjà ouverte sur ce module       |
| Compte à rebours qui désynchronise sur différents fuseaux horaires | Moyenne     | Faible | Stockage deadlines en UTC, formatage côté client selon fuseau navigateur ; tests E2E avec faux fuseau    |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (DB), EP-02 (auth, OAuth GH pour soumission), EP-03 (cursus publié), EP-04 (cohorte), EP-06 (harnais opérationnel pour ST-05.2), EP-08 (state machine pour ST-05.3), EP-12 (notifs pour bouton bloqué).
- **Bloque** : EP-09 (capstone démarre après validation du dernier module), EP-13 (dashboard stagiaire réutilise la timeline), EP-17 (pilote sans cette UI = impossible).
- **Parallèle à** : EP-11 (XP affiché sur la page), EP-18 (composants UI, motion), EP-19 (i18n des strings).

## Périmètre exclu de cet Epic (non-goals)

- Pas de chat ou forum interne (anti-pilier ; Slack/Discord externes).
- Pas de leaderboard de la cohorte (anti-pilier).
- Pas de mode mobile-first (PWA suffit, EP-24 v1.2).
- Pas d'upload de pièces jointes en commentaire au MVP (uniquement URL repo + champ texte).

### Stories de cet Epic

- [CUR-50 — ST-05.1 Page "Cette semaine" avec timeline + compte à rebours](https://ousmanesadjad.atlassian.net/browse/CUR-50)
- [CUR-51 — ST-05.2 Soumission d'un livrable avec rapport harnais en temps réel](https://ousmanesadjad.atlassian.net/browse/CUR-51)
- [CUR-52 — ST-05.3 Bouton "Je suis bloqué" (escalade ciblée)](https://ousmanesadjad.atlassian.net/browse/CUR-52)
- [CUR-53 — ST-05.4 Historique de mes soumissions](https://ousmanesadjad.atlassian.net/browse/CUR-53)
- [CUR-54 — ST-05.5 Onboarding interactif premium (product tour)](https://ousmanesadjad.atlassian.net/browse/CUR-54)

---

## EP-06 — Harness de validation (CUR-6)

## Objectif business

Livrer **la primitive centrale** du produit : un harnais automatique qui vérifie chaque livrable hebdo via GitHub Actions (worker + bibliothèque de checks réutilisables + rapport lisible + notification temps réel + override formateur + queue Inngest), inspiré de la moulinette École 42, afin de valider la compréhension réelle des stagiaires sans intervention manuelle.

## Valeur métier (Business value)

**C'est la primitive centrale du produit, sans elle Cursus est juste un Trello déguisé.** Cette Epic justifie à elle seule l'existence du produit : automatiser 60-80 % du travail de vérification du formateur, et donner au stagiaire un signal objectif immédiat ("ça passe / ça ne passe pas"). C'est l'Epic qui matérialise la North Star Metric (capacité à reproduire). Hypothèse H1 (la plus risquée du produit) : désamorcée en spike S0 (ST-01.6).

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Sprint 3 + Sprint 4
- **Story points cumulés** : 39

## Stories rattachées

| Key                                                                                           | Titre                                                             | Story Points | Priorité |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ | -------- |
| CUR-55                                                                                        | ST-06.1 — GitHub App + Worker de déclenchement workflow           | 5            | Highest  |
| CUR-56                                                                                        | ST-06.2 — Bibliothèque de checks réutilisables                    | 8            | Highest  |
| CUR-57                                                                                        | ST-06.3 — Rapport harnais lisible (cartes par check)              | 3            | Highest  |
| CUR-58                                                                                        | ST-06.4 — Notification temps réel du résultat (Supabase Realtime) | 3            | Highest  |
| CUR-59                                                                                        | ST-06.5 — Override manuel par le formateur                        | 2            | Highest  |
| CUR-60                                                                                        | ST-06.6 — Queue Inngest pour les jobs Harness                     | 3            | Highest  |
| **Total Stories listées**                                                                     |                                                                   | **24**       |          |
| Réserve technique (sécurité GitHub App, idempotence runs, retry strategy, observabilité fine) |                                                                   | **15**       |          |
| **Total Epic**                                                                                |                                                                   | **39**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Le harnais valide **9 checks différents** (repo_exists_public, branch_exists, file_exists, url_responds, commits_signed, lint_passes, tests_pass, lighthouse_min, a11y_min) sur un repo réel de bout en bout.
- Latence harnais **p95 < 5 min** en production (mesurée sur 50 runs consécutifs).
- Le rapport est lisible par un stagiaire débutant en 30 secondes (test utilisateur validé sur 3 personnes).
- L'override manuel est tracé dans l'audit log (raison obligatoire, user_id, timestamp).
- 0 race condition détectée sur 100 runs simultanés en test de charge.
- Le rapport temps réel s'affiche en moins de 2 secondes après la fin du workflow GH Actions.

## Risques identifiés

| Risque                                                                               | Probabilité | Impact   | Mitigation                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Latence GH Actions p95 > 5 min (hypothèse H1 invalidée)                              | Moyenne     | Critique | Spike S0 (ST-01.6) avec mesure réelle ; plan B : runners self-hosted GitHub ; pré-warming des images Docker ; ADR-002 avec décision Go/No-Go avant Sprint 1              |
| Quotas GitHub Actions dépassés (plan free trop limité à grande échelle)              | Moyenne     | Élevé    | Compte org GitHub dédié (`cursus-app`) avec plan Team dès ouverture publique ; monitoring usage minutes ; queue Inngest pour lisser les pics                             |
| Stagiaire qui pousse un workflow malveillant dans son repo (RCE via GH Actions)      | Moyenne     | Critique | GitHub App avec scopes minimaux (read-only sur le repo cible) ; jamais d'exécution de code stagiaire dans nos workflows ; sandbox dédiée ; révision sécurité sur ST-06.1 |
| Faux négatif harnais (livrable bon mais check qui plante) qui décourage le stagiaire | Moyenne     | Élevé    | Override formateur disponible (ST-06.5) ; logs détaillés par check ; retry automatique 1 fois si erreur infra                                                            |
| Spécification livrable (EP-03) trop libre rend les checks inimplémentables           | Moyenne     | Élevé    | Schéma JSON fermé co-construit entre EP-03 et EP-06 ; validation Zod au save côté builder                                                                                |
| Webhook GH Actions perdu (delivery failure) → run "fantôme"                          | Moyenne     | Moyen    | Job de réconciliation toutes les 5 min qui repolle l'API GH pour les runs > 10 min sans webhook reçu                                                                     |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (ST-01.6 spike est conditionnant), EP-02 (OAuth GitHub pour accéder aux repos stagiaires), EP-03 (spécification du livrable = contrat d'exécution du harnais).
- **Bloque** : EP-05 (ST-05.2 soumission), EP-08 (la state machine consomme les événements harness_run.completed), EP-09 (le capstone réutilise les checks), EP-11 (XP attribué au pass harnais), EP-17 (pilote inutile sans harnais).
- **Parallèle à** : EP-12 (notifications consomment les events harnais), EP-21 (AI Assist résume le rapport en v1.1).

## Périmètre exclu de cet Epic (non-goals)

- Pas de génération de checks par IA (parqué v2+).
- Pas d'exécution de code stagiaire dans nos serveurs (sécurité ; tout passe par GH Actions hostile-friendly).
- Pas de checks personnalisés avec script exécutable par le formateur au MVP (seulement choix dans la bibliothèque ST-06.2).
- Pas de runners self-hosted au MVP (plan B activable si latence dérape).

### Stories de cet Epic

- [CUR-55 — ST-06.1 GitHub App + Worker de déclenchement workflow](https://ousmanesadjad.atlassian.net/browse/CUR-55)
- [CUR-56 — ST-06.2 Bibliothèque de checks réutilisables](https://ousmanesadjad.atlassian.net/browse/CUR-56)
- [CUR-57 — ST-06.3 Rapport harnais lisible (cartes par check)](https://ousmanesadjad.atlassian.net/browse/CUR-57)
- [CUR-58 — ST-06.4 Notification temps réel du résultat (Supabase Realtime)](https://ousmanesadjad.atlassian.net/browse/CUR-58)
- [CUR-59 — ST-06.5 Override manuel par le formateur](https://ousmanesadjad.atlassian.net/browse/CUR-59)
- [CUR-60 — ST-06.6 Queue Inngest pour les jobs Harness](https://ousmanesadjad.atlassian.net/browse/CUR-60)

---

## EP-07 — Quiz (CUR-7)

## Objectif business

Permettre au formateur de créer des quiz dans le builder de cursus, au stagiaire de les passer (avec score affiché et tentatives limitées), et au formateur de consulter des stats agrégées par quiz — afin de mesurer la compréhension déclarative en complément du harnais (compréhension pratique).

## Valeur métier (Business value)

Le quiz n'est pas la primitive centrale (le harnais l'est), mais il complète la mesure : le harnais dit "ça marche" ; le quiz dit "il a compris pourquoi ça marche". Les stats agrégées par quiz permettent au formateur d'identifier des notions globalement mal comprises et d'ajuster sa pédagogie. La politique anti-triche reste légère (3 tentatives max) car le capstone et sa soutenance orale font office d'anti-triche définitif.

## Tier et priorité

- **Tier** : Core
- **Priorité** : High
- **Sprint cible** : Sprint 4
- **Story points cumulés** : 13

## Stories rattachées

| Key                                                                             | Titre                                                | Story Points | Priorité |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------ | -------- |
| CUR-61                                                                          | ST-07.1 — Création de quiz dans le builder de cursus | 3            | High     |
| CUR-62                                                                          | ST-07.2 — Passage d'un quiz par le stagiaire         | 3            | High     |
| CUR-63                                                                          | ST-07.3 — Stats agrégées d'un quiz pour le formateur | 2            | Medium   |
| **Total Stories listées**                                                       |                                                      | **8**        |          |
| Réserve technique (modélisation questions multi-type, tentatives, prep AI v1.1) |                                                      | **5**        |          |
| **Total Epic**                                                                  |                                                      | **13**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Le formateur peut créer un quiz de 10 questions QCM en moins de 5 minutes.
- Le stagiaire passe le quiz, voit son score, peut refaire jusqu'à 3 fois (la meilleure tentative compte).
- Le formateur voit les stats : taux de réussite par question, distribution des scores, questions problématiques surlignées.
- L'identifiant de question est anonymisé dans les stats agrégées (pas d'exposition croisée des réponses individuelles).

## Risques identifiés

| Risque                                                                                     | Probabilité | Impact | Mitigation                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modélisation question trop spécifique à QCM, blocant l'ajout de texte court ultérieurement | Moyenne     | Moyen  | Schéma extensible (champ `question_type` enum) dès ST-07.1, même si QCM seul livré au MVP                                                                            |
| Tricherie via partage de réponses entre stagiaires                                         | Élevée      | Faible | Politique anti-triche assumée légère ; soutenance capstone est l'anti-triche définitif ; ordre aléatoire des réponses ; pool de questions éventuelles si besoin v1.1 |
| Stagiaire qui épuise ses 3 tentatives par erreur (mauvaise UX)                             | Moyenne     | Moyen  | Confirmation explicite avant chaque tentative ; affichage tentatives restantes ; possibilité reset par formateur                                                     |
| Stats agrégées qui exposent des données individuelles si <5 répondants                     | Moyenne     | Moyen  | Seuil minimum de 5 répondants pour afficher les stats ; sinon message "trop peu de répondants"                                                                       |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (DB), EP-02 (auth + RBAC), EP-03 (les quiz vivent dans des modules).
- **Bloque** : EP-08 (la state machine peut bloquer la progression sans quiz passé), EP-13 (stats consultées depuis dashboards formateur).
- **Parallèle à** : EP-21 (AI génère des quiz à partir d'un module en v1.1) ; EP-18 (composants UI quiz).

## Périmètre exclu de cet Epic (non-goals)

- Pas de proctoring vidéo (anti-pilier, anti-éthique au MVP).
- Pas de questions à texte court ou code-review au MVP (parqué v1.x).
- Pas de génération IA des quiz au MVP (parqué à EP-21 v1.1).
- Pas de leaderboard de scores entre stagiaires (anti-pilier).

### Stories de cet Epic

- [CUR-61 — ST-07.1 Création de quiz dans le builder de cursus](https://ousmanesadjad.atlassian.net/browse/CUR-61)
- [CUR-62 — ST-07.2 Passage d'un quiz par le stagiaire](https://ousmanesadjad.atlassian.net/browse/CUR-62)
- [CUR-63 — ST-07.3 Stats agrégées d'un quiz pour le formateur](https://ousmanesadjad.atlassian.net/browse/CUR-63)

---

## EP-08 — Progress Tracking & Alertes (CUR-8)

## Objectif business

Modéliser la progression du stagiaire par module sous forme de machine à états stricte, détecter les alertes (notamment via un job nocturne), permettre au formateur de gérer ses alertes et tracer toute la vie du système dans un audit log unifié, pour matérialiser le pilier #4 (suivi async) avec rigueur.

## Valeur métier (Business value)

La progression est le tissu conjonctif entre toutes les autres Epics : sans elle, le dashboard formateur n'a rien à afficher, les notifications n'ont pas de déclencheur, les badges et XP n'ont pas de pivot. La state machine évite les bugs subtils (statuts incohérents). Les alertes sont **la valeur formateur n°1** : intervenir uniquement quand nécessaire, ne pas surveiller en continu. L'audit log est non-négociable pour un produit qui émet des certificats.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Sprint 3 + Sprint 4
- **Story points cumulés** : 21

## Stories rattachées

| Key                                                                                     | Titre                                                             | Story Points | Priorité |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ | -------- |
| CUR-64                                                                                  | ST-08.1 — Machine à états de progression (par stagiaire × module) | 3            | Highest  |
| CUR-65                                                                                  | ST-08.2 — Job nocturne de détection d'alertes                     | 3            | Highest  |
| CUR-66                                                                                  | ST-08.3 — Gestion des alertes côté formateur                      | 3            | Highest  |
| CUR-67                                                                                  | ST-08.4 — Audit log unifié des changements                        | 3            | High     |
| **Total Stories listées**                                                               |                                                                   | **12**       |          |
| Réserve technique (state machine library, scheduling Inngest, indexes audit log, perfs) |                                                                   | **9**        |          |
| **Total Epic**                                                                          |                                                                   | **21**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Toutes les transitions illégales sont rejetées (test de couverture exhaustive sur 5 statuts et 8 transitions valides).
- Le job nocturne détecte au moins 3 types d'alertes (pas de soumission > 48h, taux échec quiz > seuil, retard sur deadline) et génère les notifs avant 7h du matin (horaire formateur).
- Le formateur peut filtrer, prendre en charge, résoudre une alerte avec commentaire.
- L'audit log capture **toutes** les transitions d'état et override harnais ; consultable via SQL (UI dans EP-14 v1.1).
- Délai d'intervention formateur (alerte créée → acquittée) médiane < 24h ouvrées pendant le pilote.

## Risques identifiés

| Risque                                                                                 | Probabilité | Impact | Mitigation                                                                                                                |
| -------------------------------------------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| State machine mal conçue : transitions oubliées ou illégales acceptées                 | Moyenne     | Élevé  | Library XState ou équivalent ; tests de couverture exhaustive (matrice état × transition) ; diagramme dans le playbook    |
| Job nocturne qui s'exécute en double (queue Inngest) et génère des alertes en doublons | Moyenne     | Moyen  | Idempotence par clé (date + alert_kind + user_id + module_id) ; lock distribué côté Inngest                               |
| Audit log non-purgeable, table qui explose en taille (> 10 M rows en 6 mois)           | Moyenne     | Moyen  | Politique de rétention 12 mois (ST-15.8) avec job de purge ; partitionnement par mois ; archivage S3 si besoin            |
| Trop d'alertes émises (bruit) qui fait que le formateur les ignore                     | Élevée      | Élevé  | Seuils ajustables par cohorte ; préférences notifs fines (ST-12.5) ; rapport hebdo de qualité des alertes (faux positifs) |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (DB), EP-02 (RBAC sur alertes), EP-04 (cohorte), EP-05 (soumissions = source d'événement).
- **Bloque** : EP-11 (XP attribué sur transition `validated`), EP-12 (notifs sur transitions critiques), EP-13 (dashboards lisent les statuts agrégés), EP-14 (audit log explorer en v1.1), EP-17 (pilote = test de la détection d'alertes).
- **Parallèle à** : EP-06 (les events harness_run.completed déclenchent des transitions).

## Périmètre exclu de cet Epic (non-goals)

- Pas d'UI graphique de la state machine au MVP (diagramme statique en doc suffit).
- Pas d'audit log explorer UI (parqué EP-14 v1.1).
- Pas de notifications push browser au MVP (parqué EP-24).
- Pas de SLA visible côté stagiaire (informel au MVP).

### Stories de cet Epic

- [CUR-64 — ST-08.1 Machine à états de progression (par stagiaire × module)](https://ousmanesadjad.atlassian.net/browse/CUR-64)
- [CUR-65 — ST-08.2 Job nocturne de détection d'alertes](https://ousmanesadjad.atlassian.net/browse/CUR-65)
- [CUR-66 — ST-08.3 Gestion des alertes côté formateur](https://ousmanesadjad.atlassian.net/browse/CUR-66)
- [CUR-67 — ST-08.4 Audit log unifié des changements](https://ousmanesadjad.atlassian.net/browse/CUR-67)

---

## EP-09 — Capstone & Soutenance (CUR-9)

## Objectif business

Mettre en œuvre le **5e pilier du produit** : le capstone (projet final qui combine tous les modules), sa planification de soutenance, sa grille d'évaluation et la possibilité de re-tentative — afin de prouver définitivement que le stagiaire "sait reproduire" ce qu'il a appris.

## Valeur métier (Business value)

Le capstone est la **preuve définitive de compréhension** et la raison pour laquelle on peut se permettre une politique anti-triche légère sur les quiz (le capstone ne se triche pas). Sans capstone, le certificat émis perd sa crédibilité. La grille d'évaluation structurée évite le biais formateur et permet la comparabilité entre stagiaires/cohortes. La planification (Google Calendar via EP-22 en v1.1) lisse l'opérationnel pour le formateur.

## Tier et priorité

- **Tier** : Core
- **Priorité** : High
- **Sprint cible** : Sprint 5 (différé du pilote 3 semaines)
- **Story points cumulés** : 21

## Stories rattachées

| Key                                                                                        | Titre                                                      | Story Points | Priorité |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------ | -------- |
| CUR-68                                                                                     | ST-09.1 — Déblocage et soumission du capstone              | 3            | High     |
| CUR-69                                                                                     | ST-09.2 — Planification de la soutenance                   | 2            | High     |
| CUR-70                                                                                     | ST-09.3 — Grille d'évaluation et notation de la soutenance | 3            | High     |
| CUR-71                                                                                     | ST-09.4 — Re-tentative du capstone                         | 2            | High     |
| **Total Stories listées**                                                                  |                                                            | **10**       |          |
| Réserve technique (planification slots, grille paramétrable, gestion re-tentatives + cert) |                                                            | **11**       |          |
| **Total Epic**                                                                             |                                                            | **21**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Le capstone se débloque automatiquement quand le dernier module du cursus est validé par le stagiaire.
- Le formateur peut proposer 3 créneaux de soutenance, le stagiaire en choisit un.
- La grille d'évaluation produit une note finale agregée (somme pondérée des critères) avec commentaires par critère.
- Une re-tentative remet à zéro le statut sans effacer l'historique (audit log).
- L'évaluation validée déclenche EP-10 (génération du certificat PDF).

## Risques identifiés

| Risque                                                               | Probabilité | Impact | Mitigation                                                                                                                                      |
| -------------------------------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Grille d'évaluation trop rigide ou trop libre (biais formateur)      | Moyenne     | Élevé  | Grille paramétrable par cursus (modèles par défaut) ; rubrique "justification" obligatoire ; calibrage inter-formateurs documenté               |
| Conflit de créneaux si plusieurs stagiaires choisissent le même slot | Moyenne     | Moyen  | Soft lock optimiste ; transactions DB ; réservation = first-come-first-served avec confirmation                                                 |
| Soutenance à distance qui rate (lien Zoom KO)                        | Faible      | Élevé  | Le lien externe (visio) reste de la responsabilité du formateur ; ce n'est pas notre scope ; backup téléphone documenté                         |
| Re-tentative qui invalide un certificat déjà émis                    | Moyenne     | Élevé  | Règle : pas de certificat émis avant la note définitive ; re-tentative possible uniquement si pas encore émis ou révocation explicite formateur |

## Dépendances inter-Epics

- **Bloqué par** : EP-01, EP-02, EP-03 (cursus), EP-04 (cohorte), EP-05 (ST-05.2 soumission), EP-06 (harnais peut vérifier le capstone), EP-08 (state machine = transition `capstone_unlocked`).
- **Bloque** : EP-10 (génération certificat sur capstone validé).
- **Parallèle à** : EP-22 (intégration Google Calendar en v1.1 pour les soutenances), EP-11 (XP attribué à la validation capstone).

## Périmètre exclu de cet Epic (non-goals)

- Pas de visio embarquée (anti-pilier ; lien Zoom/Meet externe).
- Pas de notation relative à la cohorte (XP individuel oui, classement non).
- Pas de jury multiple synchrone au MVP (un formateur évalue, co-formateur peut commenter offline).
- Pas d'enregistrement vidéo de la soutenance au MVP.

### Stories de cet Epic

- [CUR-68 — ST-09.1 Déblocage et soumission du capstone](https://ousmanesadjad.atlassian.net/browse/CUR-68)
- [CUR-69 — ST-09.2 Planification de la soutenance](https://ousmanesadjad.atlassian.net/browse/CUR-69)
- [CUR-70 — ST-09.3 Grille d'évaluation et notation de la soutenance](https://ousmanesadjad.atlassian.net/browse/CUR-70)
- [CUR-71 — ST-09.4 Re-tentative du capstone](https://ousmanesadjad.atlassian.net/browse/CUR-71)

---

## EP-10 — Portfolio & Certification (CUR-10)

## Objectif business

Livrer le **pilier #3 du produit** (portfolio cumulatif inspiré d'Epitech) et la certification interopérable : profil public du stagiaire, génération du certificat PDF signé, page publique de vérification (avec Open Badges 3.0) et un design dédié "Persona Recruteur" pour que le portfolio soit immédiatement lisible par un recruteur.

## Valeur métier (Business value)

Le portfolio est **la preuve qu'il sait reproduire** : son CV technique. Le certificat signé + Open Badges 3.0 le rend importable LinkedIn / Mozilla Backpack / Credly — crédibilise la formation hors de l'écosystème Cursus. La page publique de vérification est l'outil de confiance pour un recruteur : il scanne un QR, voit le certif signé cryptographiquement, sans avoir besoin de créer un compte. Le persona Recruteur transforme une page tech en outil de recrutement.

## Tier et priorité

- **Tier** : Core (ST-10.4 = Premium)
- **Priorité** : High
- **Sprint cible** : Sprint 5 (différé du pilote 3 semaines)
- **Story points cumulés** : 24

## Stories rattachées

| Key                                                                               | Titre                                                 | Story Points | Priorité |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------ | -------- |
| CUR-72                                                                            | ST-10.1 — Profil public du stagiaire                  | 3            | High     |
| CUR-73                                                                            | ST-10.2 — Génération du certificat PDF signé          | 5            | High     |
| CUR-74                                                                            | ST-10.3 — Page publique de vérification du certificat | 3            | High     |
| CUR-75                                                                            | ST-10.4 — Persona Recruteur — design dédié            | 3            | High     |
| **Total Stories listées**                                                         |                                                       | **14**       |          |
| Réserve technique (Open Badges 3.0, signature cryptographique, QR, SEO portfolio) |                                                       | **10**       |          |
| **Total Epic**                                                                    |                                                       | **24**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Le portfolio public est accessible via une URL stable (`/u/<slug>`) sans authentification, lighthouse score >= 95 sur a11y/perf.
- Le certificat PDF est signé cryptographiquement (clé RS256), contient un QR pointant vers la page de vérification.
- La page de vérification publique affiche le badge et la signature valides, fonctionne sans JS (SSR).
- Le format Open Badges 3.0 est valide (test avec validateur officiel W3C).
- Le persona Recruteur permet d'exporter au format LinkedIn ("Add to Profile") en 1 clic.
- L'a11y AAA est atteint sur la page de vérification (écran critique premium).

## Risques identifiés

| Risque                                                                       | Probabilité | Impact   | Mitigation                                                                                                                             |
| ---------------------------------------------------------------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Compromission de la clé privée de signature des certificats                  | Faible      | Critique | Clé stockée dans Vercel env vars (jamais en preview) ; rotation annuelle ; révocation publique possible via liste sur la page de vérif |
| Format Open Badges 3.0 mal implémenté, certificats non importés par LinkedIn | Moyenne     | Élevé    | Tests avec validateur officiel W3C ; tests manuels d'import sur LinkedIn + Mozilla Backpack + Credly avant livraison                   |
| Profil public expose des informations qui ne devraient pas (email, tél)      | Moyenne     | Élevé    | Champs publics explicitement opt-in ; RLS publique = uniquement champs `is_public=true` ; tests négatifs (ST-15.6)                     |
| Stagiaire qui souhaite révoquer son profil public                            | Moyenne     | Moyen    | Toggle profil public on/off dans paramètres ; suppression complète via ST-15.2 (droit à l'oubli)                                       |

## Dépendances inter-Epics

- **Bloqué par** : EP-02 (auth + 2FA), EP-05 (soumissions validées = livrables du portfolio), EP-06 (badges harnais), EP-09 (capstone validé = condition pour cert).
- **Bloque** : EP-17 (le pilote v1.0 finale doit montrer un certificat émis).
- **Parallèle à** : EP-11 (badges affichés sur profil), EP-18 (design dédié persona recruteur), EP-19 (certificat bilingue FR/EN).

## Périmètre exclu de cet Epic (non-goals)

- Pas de blockchain/NFT pour les certificats (anti-pilier, mode passagère).
- Pas de portfolio personnalisable au-delà du template (parqué v1.x).
- Pas d'export PDF du portfolio entier au MVP (juste certificat).
- Pas d'analytique détaillée "qui a vu mon profil" (parqué v1.x).

### Stories de cet Epic

- [CUR-72 — ST-10.1 Profil public du stagiaire](https://ousmanesadjad.atlassian.net/browse/CUR-72)
- [CUR-73 — ST-10.2 Génération du certificat PDF signé](https://ousmanesadjad.atlassian.net/browse/CUR-73)
- [CUR-74 — ST-10.3 Page publique de vérification du certificat](https://ousmanesadjad.atlassian.net/browse/CUR-74)
- [CUR-75 — ST-10.4 Persona Recruteur — design dédié](https://ousmanesadjad.atlassian.net/browse/CUR-75)

---

## EP-11 — Gamification (XP & Badges) (CUR-11)

## Objectif business

Introduire une gamification **non toxique** : attribution automatique d'XP sur livrable validé, système de badges (règles JSON + déblocage) et un feed cohorte uniquement positif (validations, badges, milestones), afin de créer des micro-moments de satisfaction sans tomber dans les anti-patterns (leaderboard, streaks, score relatif).

## Valeur métier (Business value)

La gamification délicate (XP individuel, badges, feed positif) augmente la rétention et la satisfaction sans créer les effets toxiques d'un Duolingo (streaks abandonnés, leaderboards décourageants). Le feed cohorte renforce la cohésion ("Sarah a validé son module Docker") sans comparer. Les badges Open Badges 3.0 sont **réutilisables hors Cursus** (LinkedIn, Mozilla Backpack) — valeur durable pour le stagiaire.

## Tier et priorité

- **Tier** : Premium
- **Priorité** : High
- **Sprint cible** : Sprint 4 + Sprint 5
- **Story points cumulés** : 13

## Stories rattachées

| Key                                                                    | Titre                                                 | Story Points | Priorité |
| ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------ | -------- |
| CUR-76                                                                 | ST-11.1 — Attribution XP automatique                  | 2            | High     |
| CUR-77                                                                 | ST-11.2 — Système de badges (règles JSON + déblocage) | 3            | High     |
| CUR-78                                                                 | ST-11.3 — Feed cohorte (positif uniquement)           | 2            | High     |
| **Total Stories listées**                                              |                                                       | **7**        |          |
| Réserve technique (DSL règles badges, moderation feed, perfs requêtes) |                                                       | **6**        |          |
| **Total Epic**                                                         |                                                       | **13**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- L'XP est attribué automatiquement à chaque transition `validated` (harnais OK + override OK).
- Au moins 5 badges sont définis et déblocables via règles JSON sans redéploiement (configuration).
- Le feed cohorte n'affiche que des événements positifs (validations, badges, milestones) avec micro-animation respectant `prefers-reduced-motion`.
- 0 fonctionnalité "streak" ou "classement relatif" (anti-pilier).
- L'export d'un badge en Open Badges 3.0 est possible (lien depuis profil).

## Risques identifiés

| Risque                                                                          | Probabilité | Impact | Mitigation                                                                                                                   |
| ------------------------------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Règles de badges trop généreuses ou trop avares (mauvaise calibration)          | Élevée      | Moyen  | Configuration règles via JSON sans redéploiement ; tuning post-pilote ; métriques de distribution badges à suivre            |
| Feed cohorte spammant (un stagiaire prolifique éclipse les autres)              | Moyenne     | Moyen  | Agrégation par 24h ("Sarah a validé 3 modules cette semaine") ; limites côté backend                                         |
| Risque toxique : un stagiaire compare son XP à celui des autres et se décourage | Moyenne     | Élevé  | XP individuel uniquement visible par le user et le formateur ; pas de classement (anti-pilier) ; messaging produit explicite |
| Bug attribuant XP en double (event émis 2 fois)                                 | Moyenne     | Faible | Idempotence par clé (user_id + event_type + source_id) ; tests d'intégration                                                 |

## Dépendances inter-Epics

- **Bloqué par** : EP-01, EP-02, EP-06 (validations harnais = source d'XP), EP-08 (transitions = triggers).
- **Bloque** : EP-10 (badges affichés sur profil public + portfolio).
- **Parallèle à** : EP-12 (notif "badge débloqué"), EP-18 (composants UI badges), EP-13 (XP affiché sur dashboards).

## Périmètre exclu de cet Epic (non-goals)

- Pas de leaderboard public (anti-pilier).
- Pas de streak "X jours consécutifs" (anti-pilier Duolingo).
- Pas de boutique / monnaie virtuelle (anti-pilier).
- Pas de notation/classement relatif entre stagiaires (anti-pilier).
- Pas d'animations Lottie sound design au MVP (parqué v2+).

### Stories de cet Epic

- [CUR-76 — ST-11.1 Attribution XP automatique](https://ousmanesadjad.atlassian.net/browse/CUR-76)
- [CUR-77 — ST-11.2 Système de badges (règles JSON + déblocage)](https://ousmanesadjad.atlassian.net/browse/CUR-77)
- [CUR-78 — ST-11.3 Feed cohorte (positif uniquement)](https://ousmanesadjad.atlassian.net/browse/CUR-78)

---

## EP-12 — Notifications (CUR-12)

## Objectif business

Fournir un système de notifications complet : centre in-app, emails transactionnels (Resend), digest quotidien formateur, web push (prép PWA) et préférences notifs fines, afin que chaque utilisateur soit prévenu **au bon moment, au bon endroit, sans bruit**.

## Valeur métier (Business value)

Les notifications sont le **canal nerveux** du produit : invitations, validations, alertes, badges, deadlines. Sans elles, le formateur découvrirait les blocages en se connectant, perdant l'avantage du "suivi async". Le digest quotidien (1 email matinal récapitulatif) évite le spam tout en gardant le formateur informé. Les préférences fines respectent l'utilisateur (anti-pattern : notif intempestive).

## Tier et priorité

- **Tier** : Core (ST-12.4 = Premium)
- **Priorité** : Highest
- **Sprint cible** : Sprint 3 + Sprint 4
- **Story points cumulés** : 16

## Stories rattachées

| Key                                                                 | Titre                                             | Story Points | Priorité |
| ------------------------------------------------------------------- | ------------------------------------------------- | ------------ | -------- |
| CUR-79                                                              | ST-12.1 — Centre de notifications in-app          | 2            | Highest  |
| CUR-80                                                              | ST-12.2 — Envoi d'emails transactionnels (Resend) | 3            | Highest  |
| CUR-81                                                              | ST-12.3 — Digest quotidien formateur              | 2            | High     |
| CUR-82                                                              | ST-12.4 — Web Push (PWA prep) — Premium           | 3            | Medium   |
| CUR-83                                                              | ST-12.5 — Préférences notifications (fines)       | 2            | High     |
| **Total Stories listées**                                           |                                                   | **12**       |          |
| Réserve technique (templates email, queue, webhook handling, retry) |                                                   | **4**        |          |
| **Total Epic**                                                      |                                                   | **16**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- 8 templates emails sont opérationnels (invitation, magic link, alerte form, livrable validé, capstone voté, badge débloqué, digest, reset mdp), testés sur Gmail + Outlook + Apple Mail.
- Le centre in-app remonte les notifs en temps réel (Supabase Realtime) avec compteur badge.
- Le digest quotidien part à 7h heure formateur, agrège alertes + nouvelles soumissions + KPI cohorte.
- Préférences notifs : par canal (email/in-app/push) × par type d'événement, persistées.
- Taux de délivrabilité email > 97 % (DKIM/SPF/DMARC validés).

## Risques identifiés

| Risque                                                   | Probabilité | Impact | Mitigation                                                                                                                        |
| -------------------------------------------------------- | ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Emails marqués comme spam (mauvaise réputation domaine)  | Élevée      | Élevé  | SPF/DKIM/DMARC configurés dès J0 ; Resend = bonne réputation native ; lien de désabonnement systematique ; monitoring bounce rate |
| Surcharge de notifs (spam) qui décourage l'utilisateur   | Élevée      | Élevé  | Préférences fines (ST-12.5) ; digest quotidien plutôt que temps réel par défaut sur les alertes ; "silent hours" 22h-7h           |
| Resend down ou rate-limité, emails non délivrés          | Moyenne     | Élevé  | Queue Inngest pour les emails avec retry exponentiel ; fallback provider documenté (Postmark) si Resend HS prolongé               |
| Web push exige autorisation user, peu activé en pratique | Élevée      | Faible | Onboarding non-bloquant : web push opt-in après 1ʳᵉ alerte ; rester compatible mobile via PWA (EP-24)                             |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (DB notifications), EP-02 (auth).
- **Bloque** : EP-04 (invitations stagiaires), EP-05 (notif sur bouton bloqué), EP-08 (notif sur alertes détectées), EP-09 (notif soutenance planifiée), EP-11 (notif badge débloqué), EP-17 (pilote = test des emails).
- **Parallèle à** : EP-22 (webhooks externalisent les notifs vers Slack/Discord/Teams en v1.1), EP-24 (web push complète la PWA).

## Périmètre exclu de cet Epic (non-goals)

- Pas de SMS notifications au MVP (parqué v1.x).
- Pas de chat interne pour discussions sur notifs (anti-pilier).
- Pas de notification push toutes les heures (anti-pilier vision).

### Stories de cet Epic

- [CUR-79 — ST-12.1 Centre de notifications in-app](https://ousmanesadjad.atlassian.net/browse/CUR-79)
- [CUR-80 — ST-12.2 Envoi d'emails transactionnels (Resend)](https://ousmanesadjad.atlassian.net/browse/CUR-80)
- [CUR-81 — ST-12.3 Digest quotidien formateur](https://ousmanesadjad.atlassian.net/browse/CUR-81)
- [CUR-82 — ST-12.4 Web Push (PWA prep) — Premium](https://ousmanesadjad.atlassian.net/browse/CUR-82)
- [CUR-83 — ST-12.5 Préférences notifications (fines)](https://ousmanesadjad.atlassian.net/browse/CUR-83)

---

## EP-13 — Dashboards (CUR-13)

## Objectif business

Livrer les **3 dashboards** centraux : dashboard stagiaire (sections personnalisées), dashboard formateur à heatmap cohorte (sa vue principale), et fiche stagiaire détaillée (vue 360 pour intervention ciblée), afin de donner à chaque persona une vue d'ensemble actionnable de son contexte.

## Valeur métier (Business value)

Le dashboard formateur est **l'écran qu'il regarde 5 fois par jour** : c'est la matérialisation du pilier #4 (suivi async) et l'économie de temps formateur n°1. La heatmap (15 stagiaires × 8 modules en 1 écran) lui permet de repérer en 2 secondes qui décroche. La fiche stagiaire 360 lui donne tout le contexte pour intervenir efficacement quand il clique sur une alerte. Le dashboard stagiaire l'aide à se repérer dans son parcours.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Sprint 3 + Sprint 4
- **Story points cumulés** : 21

## Stories rattachées

| Key                                                            | Titre                                                   | Story Points | Priorité |
| -------------------------------------------------------------- | ------------------------------------------------------- | ------------ | -------- |
| CUR-84                                                         | ST-13.1 — Dashboard stagiaire (sections personnalisées) | 3            | Highest  |
| CUR-85                                                         | ST-13.2 — Dashboard formateur — vue cohorte (heatmap)   | 5            | Highest  |
| CUR-86                                                         | ST-13.3 — Fiche stagiaire détaillée (vue 360)           | 3            | Highest  |
| **Total Stories listées**                                      |                                                         | **11**       |          |
| Réserve technique (perfs requêtes agrégées, cache, drill-down) |                                                         | **10**       |          |
| **Total Epic**                                                 |                                                         | **21**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Heatmap formateur : 20 stagiaires × 10 modules affichés en moins de 1.5s (LCP).
- Drill-down depuis une cellule de heatmap vers la fiche stagiaire en 1 clic, conserve filtre cohorte.
- Dashboard stagiaire = page d'accueil par défaut, charge sa progression + alertes + prochain livrable en moins de 1s (données mises en cache via SWR/React Query).
- Fiche stagiaire 360 affiche : progression module-par-module, soumissions, alertes ouvertes, quiz passés, XP, badges, commentaires.
- Aucune requête N+1, perfs DB monitorées.

## Risques identifiés

| Risque                                                                | Probabilité | Impact | Mitigation                                                                                                                                               |
| --------------------------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requêtes agregées lentes sur grande cohorte (>30 stagiaires)          | Élevée      | Élevé  | Indexes DB sur (cohorte_id, module_id, user_id) ; vues matérialisées si besoin ; pagination ; cache côté client SWR ; tests de charge sur 100 stagiaires |
| Heatmap illisible sur petit écran (problème UX)                       | Moyenne     | Moyen  | Responsive : passage en vue liste sur < 1024 px ; tooltip explicatif sur découverte                                                                      |
| Dashboard formateur qui devient un fourre-tout (overload information) | Élevée      | Moyen  | Design libérale (Linear-like sobre) ; sections collapsibles ; widget alerts épinglé en haut                                                              |
| Données affichées périmées (cache trop agressif)                      | Moyenne     | Moyen  | TTL court (30s) sur les agrégats ; invalidation événementielle sur transitions critiques                                                                 |

## Dépendances inter-Epics

- **Bloqué par** : EP-01, EP-02, EP-04 (cohorte), EP-05 (parcours stagiaire), EP-06 (harnais source), EP-08 (state machine = source des statuts).
- **Bloque** : EP-17 (pilote = formateur observe via dashboard), EP-14 (admin v1.1 étend la heatmap), EP-23 (Premium Reporting réutilise ces vues).
- **Parallèle à** : EP-18 (composants charts, motion), EP-19 (i18n), EP-11 (XP affiché sur dashboards).

## Périmètre exclu de cet Epic (non-goals)

- Pas de personnalisation drag-and-drop des widgets (parqué v1.x).
- Pas de visualisations avancées (heatmap suffit, courbes/comparaisons → EP-23 v1.2).
- Pas d'export PDF des dashboards au MVP (parqué EP-14 v1.1 + EP-23 v1.2).
- Pas de vue admin multi-cohortes au MVP (parqué EP-14).

### Stories de cet Epic

- [CUR-84 — ST-13.1 Dashboard stagiaire (sections personnalisées)](https://ousmanesadjad.atlassian.net/browse/CUR-84)
- [CUR-85 — ST-13.2 Dashboard formateur — vue cohorte (heatmap)](https://ousmanesadjad.atlassian.net/browse/CUR-85)
- [CUR-86 — ST-13.3 Fiche stagiaire détaillée (vue 360)](https://ousmanesadjad.atlassian.net/browse/CUR-86)

---

## EP-14 — Admin & Reporting (CUR-14)

## Objectif business

Livrer en v1.1 des outils d'administration et de reporting : gestion comptes formateurs (CRUD + désactivation), export reporting CSV agrégé, branding/template du certificat, audit log explorer UI, page admin de monitoring système, afin de scaler l'organisation au-delà du formateur unique.

## Valeur métier (Business value)

Au MVP, Mohamed est seul et a tous les droits — pas besoin d'UI admin dédiée. En v1.1, multi-formateurs nécessite : gérer les comptes, exporter les KPI pour présenter à sa hiérarchie, personnaliser le branding (logo entreprise sur certificat), avoir un audit log consultable hors SQL, et monitorer la santé du système. Sans cette Epic, le passage à plusieurs cohortes parallèles devient opérationnellement difficile.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Medium
- **Sprint cible** : v1.1
- **Story points cumulés** : 13

## Stories rattachées

| Key                                                                 | Titre                                                                         | Story Points | Priorité |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------ | -------- |
| CUR-87                                                              | ST-14.1 — Gestion utilisateurs admin (CRUD comptes formateurs, désactivation) | 3            | Medium   |
| CUR-88                                                              | ST-14.2 — Export reporting CSV (agrégés cohortes/complétions/certif)          | 2            | Medium   |
| CUR-89                                                              | ST-14.3 — Branding / template certificat (logo, choix template)               | 2            | Medium   |
| CUR-90                                                              | ST-14.4 — Audit log explorer (UI consultable au-delà du SQL)                  | 3            | Medium   |
| CUR-91                                                              | ST-14.5 — Page admin de monitoring (santé système basique)                    | 2            | Medium   |
| **Total Stories listées**                                           |                                                                               | **12**       |          |
| Réserve technique (pagination audit log volumineux, design uploads) |                                                                               | **1**        |          |
| **Total Epic**                                                      |                                                                               | **13**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Un admin peut créer, désactiver, réactiver un compte formateur via UI sans toucher à la DB.
- L'export CSV agrégé contient (par cohorte) : taux complétion, taux validation 1er essai, nombre alertes, nombre certif émis.
- Le template certificat affiche le logo de l'organisation, modifiable via UI (upload PNG/SVG).
- L'audit log explorer permet de filtrer par user / action / date avec pagination performante.
- La page monitoring montre statut Sentry, latence p95 harnais, taux erreur API ; mise à jour toutes les 60s.

## Risques identifiés

| Risque                                                                            | Probabilité | Impact | Mitigation                                                                                                                                              |
| --------------------------------------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suppression accidentelle d'un compte formateur actif (perte de données associées) | Moyenne     | Élevé  | Soft delete uniquement (flag `disabled_at`) ; confirmation explicite ; réactivation possible ; transfert d'ownership obligatoire avant suppression dure |
| Export CSV trop lourd qui timeout sur cohortes massives                           | Moyenne     | Moyen  | Streaming export (Server-Sent Events) ; pagination par cohorte ; job async pour > 1000 lignes                                                           |
| Audit log UI lente sur tables > 1M rows                                           | Élevée      | Moyen  | Pagination cursor-based ; indexes sur (created_at, user_id) ; filtres côté server avant load                                                            |
| Upload de logo malveillant (XXE, SVG avec script)                                 | Moyenne     | Élevé  | Validation MIME stricte ; sanitization SVG (DOMPurify) ; scan antivirus côté Supabase Storage                                                           |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (DB), EP-02 (auth + RBAC admin), EP-08 (audit log source), EP-10 (template certificat), EP-13 (vues cohorte source des KPI), EP-16 (métriques santé source du monitoring).
- **Bloque** : passage à plusieurs cohortes parallèles en opérationnel fluide.
- **Parallèle à** : EP-23 (Premium Reporting complète en v1.2 avec graphes).

## Périmètre exclu de cet Epic (non-goals)

- Pas d'admin multi-tenant au MVP (parqué v2+).
- Pas de billing / facturation intégré (hors scope).
- Pas d'UI pour modifier les RLS policies (admin tech reste en SQL).
- Pas de graphes avancés d'évolution (parqué EP-23 v1.2).

### Stories de cet Epic

- [CUR-87 — ST-14.1 Gestion utilisateurs admin (CRUD comptes formateurs, désactivation)](https://ousmanesadjad.atlassian.net/browse/CUR-87)
- [CUR-88 — ST-14.2 Export reporting CSV (agrégés cohortes/complétions/certif)](https://ousmanesadjad.atlassian.net/browse/CUR-88)
- [CUR-89 — ST-14.3 Branding / template certificat (logo, choix template)](https://ousmanesadjad.atlassian.net/browse/CUR-89)
- [CUR-90 — ST-14.4 Audit log explorer (UI consultable au-delà du SQL)](https://ousmanesadjad.atlassian.net/browse/CUR-90)
- [CUR-91 — ST-14.5 Page admin de monitoring (santé système basique)](https://ousmanesadjad.atlassian.net/browse/CUR-91)

---

## EP-15 — Conformité, sécurité, RGPD (CUR-15)

## Objectif business

Garantir la conformité RGPD, la sécurité produit et la rigueur opérationnelle : export des données personnelles, droit à l'oubli, CGU et politique de confidentialité, politique mot de passe, bandeau cookies, **audit RLS exhaustif**, plan de réponse à incident, politique de rétention. C'est une Epic **transverse** qui touche toutes les autres.

## Valeur métier (Business value)

Cette Epic est non-négociable avant toute ouverture publique : un certificat émis sans rigueur sécurité n'a pas de valeur, un produit qui stocke des données étudiants sans RGPD risque CNIL et perte de confiance. L'audit RLS exhaustif (ST-15.6) est le seul rempart contre les fuites inter-cohortes. La politique de rétention contrôle la dette de données et limite l'exposition en cas de breach.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Transverse (CGU + RLS au MVP, autres en v1.1 avant ouverture publique)
- **Story points cumulés** : 18

## Stories rattachées

| Key                                                             | Titre                                                                     | Story Points | Priorité |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------ | -------- |
| CUR-92                                                          | ST-15.1 — Export données personnelles (ZIP JSON + livrables)              | 2            | High     |
| CUR-93                                                          | ST-15.2 — Droit à l'oubli (suppression sous 30j, certificat anonymisé)    | 3            | High     |
| CUR-94                                                          | ST-15.3 — CGU + Politique de confidentialité                              | 2            | Highest  |
| CUR-95                                                          | ST-15.4 — Politique mot de passe + verrouillage compte                    | 2            | Highest  |
| CUR-96                                                          | ST-15.5 — Cookies banner (uniquement cookies essentiels au MVP)           | 1            | Highest  |
| CUR-97                                                          | ST-15.6 — Audit RLS exhaustif (tests négatifs sur toutes tables)          | 3            | Highest  |
| CUR-98                                                          | ST-15.7 — Plan de réponse à incident sécurité (runbook)                   | 2            | High     |
| CUR-99                                                          | ST-15.8 — Politique de rétention (audit log 12 mois, soumissions 24 mois) | 1            | High     |
| **Total Stories listées**                                       |                                                                           | **16**       |          |
| Réserve technique (review juridique, tests pénétration de base) |                                                                           | **2**        |          |
| **Total Epic**                                                  |                                                                           | **18**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- L'export ZIP d'un user contient (JSON) : profil, progressions, soumissions, alertes, badges, audit log; téléchargeable en moins de 60s.
- La demande de droit à l'oubli est tracée, exécutée sous 30 jours, le certificat (s'il existe) reste valide mais avec ID anonymisé.
- CGU + politique de confidentialité publiées et acceptées à l'inscription (checkbox bloquante).
- Politique mdp : minimum 12 caractères, complexité, anti-pwned (HIBP API), verrouillage compte après 5 échecs.
- Audit RLS : tests automatisés couvrant **100 % des tables sensibles** avec scénarios négatifs (un user d'une autre cohorte ne lit/écrit jamais).
- Runbook incident sécurité livré dans `docs/runbooks/` avec liste de notification légale (CNIL si breach).
- Job de purge audit log fonctionnel ; soumissions archives à 24 mois post-cohorte.

## Risques identifiés

| Risque                                                                    | Probabilité | Impact   | Mitigation                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug RLS critique non détecté par les tests automatisés (données exposées) | Moyenne     | Critique | Audit RLS exhaustif (ST-15.6) avec tests négatifs systématiques par rôle × table × action ; review obligatoire de toute policy par 2 dev ; tests de pénétration externes en v1.1 |
| Demande CNIL avant que la conformité ne soit complete                     | Faible      | Critique | CGU + politique de confidentialité signées par avocat avant ouverture publique ; trace de consentement persistée ; DPO désigné                                                   |
| Incident sécurité (breach, ransomware) sans plan pré-défini               | Moyenne     | Critique | Runbook (ST-15.7) avec arbres de décision : containment, notification, communication, légal ; répétition incident annuelle                                                       |
| Suppression définitive d'un user qui casse l'intégrité référentielle      | Moyenne     | Élevé    | Soft delete avec période de grâce 30j ; anonymisation plutôt que suppression DB sur les entités historisables (audit log, soumissions)                                           |
| Cookies banner mal configuré qui interdit l'analytics ou la connexion     | Moyenne     | Moyen    | MVP = uniquement cookies essentiels (pas de tracking) → pas de banner bloquant ; révision en v1.1 si Plausible/PostHog ajouté                                                    |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (schéma DB + RLS de base), EP-02 (auth, identité), EP-08 (audit log source).
- **Bloque** : ouverture publique du produit (sans cette Epic, on n'invite que des stagiaires internes au pilote).
- **Parallèle à** : toutes les autres Epics (RLS à chaque feature ; rétention à définir par type de donnée).

## Périmètre exclu de cet Epic (non-goals)

- Pas de certification SOC 2 / ISO 27001 (parqué v2+).
- Pas de chiffrement E2E (TLS at-transit + Supabase at-rest suffit au MVP).
- Pas de SSO/MFA imposable globalement (2FA TOTP opt-in via EP-02).
- Pas de bug bounty program (parqué v1.x).

### Stories de cet Epic

- [CUR-92 — ST-15.1 Export données personnelles (ZIP JSON + livrables)](https://ousmanesadjad.atlassian.net/browse/CUR-92)
- [CUR-93 — ST-15.2 Droit à l'oubli (suppression sous 30j, certificat anonymisé)](https://ousmanesadjad.atlassian.net/browse/CUR-93)
- [CUR-94 — ST-15.3 CGU + Politique de confidentialité](https://ousmanesadjad.atlassian.net/browse/CUR-94)
- [CUR-95 — ST-15.4 Politique mot de passe + verrouillage compte](https://ousmanesadjad.atlassian.net/browse/CUR-95)
- [CUR-96 — ST-15.5 Cookies banner (uniquement cookies essentiels au MVP)](https://ousmanesadjad.atlassian.net/browse/CUR-96)
- [CUR-97 — ST-15.6 Audit RLS exhaustif (tests négatifs sur toutes tables)](https://ousmanesadjad.atlassian.net/browse/CUR-97)
- [CUR-98 — ST-15.7 Plan de réponse à incident sécurité (runbook)](https://ousmanesadjad.atlassian.net/browse/CUR-98)
- [CUR-99 — ST-15.8 Politique de rétention (audit log 12 mois, soumissions 24 mois)](https://ousmanesadjad.atlassian.net/browse/CUR-99)

---

## EP-16 — Observabilité & QA (CUR-16)

## Objectif business

Mettre en place une observabilité et une QA premium : logs structurés, Sentry, métriques produit (Plausible/PostHog), tests E2E Playwright sur les parcours critiques, tests d'intégration harnais, Lighthouse CI + perf budget, alertes ops, dashboard ops, runbooks, Storybook + Chromatic, afin de **mesurer la qualité réelle** et réagir vite en cas de dérive.

## Valeur métier (Business value)

L'observabilité est ce qui transforme "l'app marche" en "l'app marche, je le sais, et je le prouve". Sans elle, on rate les régressions perf, on découvre les bugs par retour utilisateur, on ne peut pas savoir si la latence harnais respecte la cible. Les performance budgets (Premium 6) sont un axe différenciateur visible : Core Web Vitals dans le vert = signal de qualité perceptible. Storybook + Chromatic verrouillent la non-régression visuelle.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Transverse (ST-16.1, 16.2 dès S1 ; ST-16.4, 16.5, 16.6 en S5 ; reste en v1.1)
- **Story points cumulés** : 18

## Stories rattachées

| Key                                                       | Titre                                                            | Story Points      | Priorité |
| --------------------------------------------------------- | ---------------------------------------------------------------- | ----------------- | -------- |
| CUR-100                                                   | ST-16.1 — Logs structurés Pino (couvert ST-01.7)                 | 0 (done via 01.7) | Highest  |
| CUR-101                                                   | ST-16.2 — Monitoring Sentry frontend + backend (couvert ST-01.7) | 0 (done via 01.7) | Highest  |
| CUR-102                                                   | ST-16.3 — Métriques produit (Plausible / PostHog)                | 2                 | High     |
| CUR-103                                                   | ST-16.4 — Tests E2E Playwright sur 5 parcours critiques          | 5                 | Highest  |
| CUR-104                                                   | ST-16.5 — Tests intégration harnais sur repos fixtures           | 3                 | Highest  |
| CUR-105                                                   | ST-16.6 — Lighthouse CI sur chaque PR + budget                   | 2                 | Highest  |
| CUR-106                                                   | ST-16.7 — Alertes opérationnelles (Sentry, latence, taux erreur) | 2                 | High     |
| CUR-107                                                   | ST-16.8 — Dashboard ops Grafana / equivalent                     | 3                 | Medium   |
| CUR-108                                                   | ST-16.9 — Runbook incident                                       | 2                 | High     |
| CUR-109                                                   | ST-16.10 — Storybook + Chromatic pour tests visuels              | 3                 | High     |
| **Total Stories listées**                                 |                                                                  | **22**            |          |
| _Ajustement : -4 (ST-16.1/16.2 déjà inclus dans ST-01.7)_ |                                                                  | **-4**            |          |
| **Total Epic**                                            |                                                                  | **18**            |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- 5 parcours critiques sont couverts en E2E Playwright : inscription, soumission livrable, alerte formé, capstone soumission, certif consultation publique.
- Les tests intégration harnais passent sur 5 repos fixtures (valid, missing branch, dead URL, lint fail, perfect run).
- Lighthouse CI bloque toute PR sous le budget (LCP < 2.5s, INP < 200ms, a11y >= 95).
- Alertes ops configurées : Sentry > 5 erreurs/min, latence harnais p95 > 5 min, taux erreur API > 1 %.
- Runbook incident documenté dans `docs/runbooks/incident-response.md`.
- Chromatic détecte 100 % des régressions visuelles sur Storybook.
- Erreurs Sentry par 1k sessions < 5 en production (cible vision).

## Risques identifiés

| Risque                                                            | Probabilité | Impact | Mitigation                                                                                                                                     |
| ----------------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests E2E flaky qui dégradent la confiance dans la CI             | Élevée      | Élevé  | Best practices Playwright (waits explicites, isolation des tests, fixtures) ; retry 1x max ; quarantaine tests flaky ; revue ratio flaky/total |
| Lighthouse CI faux positifs qui bloquent des PR légitimes         | Moyenne     | Moyen  | Budget initial généreux puis serrage progressif ; mesure sur 3 runs et médiane ; bypass par label si justifé                                   |
| Coût outils observabilité qui dérape (Sentry, PostHog, Chromatic) | Moyenne     | Faible | Plan free / hobby au MVP ; alerte usage > 80 % quota mensuel ; monitoring du coût                                                              |
| Trop d'alertes ops (écran de bruit)                               | Élevée      | Moyen  | Seuils calibrés avant production ; alertes hiérarchisées P1/P2/P3 ; review hebdo des faux positifs                                             |
| Storybook devient désynchronisé du code (drift)                   | Moyenne     | Moyen  | Stories écrites en même temps que le composant (DoD) ; Chromatic visual diff bloque les drift involontaires                                    |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (ST-01.7 = base observabilité), EP-06 (tests intégration harnais), EP-18 (Storybook = composants UI).
- **Bloque** : EP-17 (pilote sans observabilité = aveugle), v1.0 release.
- **Parallèle à** : toutes les Epics (chaque feature livrée doit s'instrumenter).

## Périmètre exclu de cet Epic (non-goals)

- Pas de chaos engineering au MVP (parqué v2+).
- Pas de bug bounty (parqué v1.x).
- Pas d'APM complet (Datadog/New Relic) au MVP — Sentry suffit.
- Pas de tests de charge automatisés en CI (manual k6 sur jalons).

### Stories de cet Epic

- [CUR-100 — ST-16.1 Logs structurés Pino (couvert ST-01.7)](https://ousmanesadjad.atlassian.net/browse/CUR-100)
- [CUR-101 — ST-16.2 Monitoring Sentry frontend + backend (couvert ST-01.7)](https://ousmanesadjad.atlassian.net/browse/CUR-101)
- [CUR-102 — ST-16.3 Métriques produit (Plausible / PostHog)](https://ousmanesadjad.atlassian.net/browse/CUR-102)
- [CUR-103 — ST-16.4 Tests E2E Playwright sur 5 parcours critiques](https://ousmanesadjad.atlassian.net/browse/CUR-103)
- [CUR-104 — ST-16.5 Tests intégration harnais sur repos fixtures](https://ousmanesadjad.atlassian.net/browse/CUR-104)
- [CUR-105 — ST-16.6 Lighthouse CI sur chaque PR + budget](https://ousmanesadjad.atlassian.net/browse/CUR-105)
- [CUR-106 — ST-16.7 Alertes opérationnelles (Sentry, latence, taux erreur)](https://ousmanesadjad.atlassian.net/browse/CUR-106)
- [CUR-107 — ST-16.8 Dashboard ops Grafana / equivalent](https://ousmanesadjad.atlassian.net/browse/CUR-107)
- [CUR-108 — ST-16.9 Runbook incident](https://ousmanesadjad.atlassian.net/browse/CUR-108)
- [CUR-109 — ST-16.10 Storybook + Chromatic pour tests visuels](https://ousmanesadjad.atlassian.net/browse/CUR-109)

---

## EP-17 — Pilote & déploiement (CUR-17)

## Objectif business

Lancer et accompagner le **pilote en conditions réelles** (3-5 stagiaires, 3 semaines) : recrutement de la cohorte pilote, préparation du cursus pilote par Mohamed, pré-vol QA interne, accompagnement actif, mesure des métriques pilote, décision Go/No-Go v1.0, communication officielle de lancement.

## Valeur métier (Business value)

Cette Epic matérialise la **stratégie de validation** du produit : valider sur le terrain les 3 hypothèses critiques (harnais auto, repo public accepté, temps formateur économisé). Sans pilote, on construit 6 mois en aveugle. La décision Go/No-Go v1.0 est le **gate** entre MVP et industrialisation : si 4/6 critères atteints → Go ; sinon Reload ou Pivot. La communication officielle marque le "début de Cursus" et structure les attentes.

## Tier et priorité

- **Tier** : Core
- **Priorité** : Highest
- **Sprint cible** : Sprint 5 + Sprint 6 (pilote en semaines 6-8)
- **Story points cumulés** : 13

## Stories rattachées

| Key                       | Titre                                                   | Story Points | Priorité |
| ------------------------- | ------------------------------------------------------- | ------------ | -------- |
| CUR-110                   | ST-17.1 — Recrutement cohorte pilote (3-5 stagiaires)   | 2            | Highest  |
| CUR-111                   | ST-17.2 — Préparation cursus pilote (effort Mohamed)    | 3            | Highest  |
| CUR-112                   | ST-17.3 — Pré-vol : tests internes 2 jours              | 2            | Highest  |
| CUR-113                   | ST-17.4 — Lancement et accompagnement actif 3 semaines  | 3            | Highest  |
| CUR-114                   | ST-17.5 — Mesure métriques pilote + rétrospective       | 2            | Highest  |
| CUR-115                   | ST-17.6 — Décision Go/No-Go v1.0 + plan d'ajustement    | 1            | Highest  |
| CUR-116                   | ST-17.7 — Communication officielle ("Cursus est lancé") | 1            | High     |
| **Total Stories listées** |                                                         | **14**       |          |
| _Ajustement : -1_         |                                                         | **-1**       |          |
| **Total Epic**            |                                                         | **13**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- 3 à 5 stagiaires pilotes sont recrutés, briefs signés sur le caractère pilote.
- Le cursus pilote (1 cursus, 3-4 modules) est créé, publié, livrables spécifiés.
- Le pré-vol QA interne de 2 jours valide : 0 bug bloquant, le tour stagiaire fonctionne de bout en bout.
- 3 livrables au moins ont été soumis et traités par le harnais en production réelle.
- 6 métriques pilote mesurées : taux validation 1er essai, latence harnais médiane, blocages hors timing prévu, temps formateur économisé déclaré, bugs bloquants, satisfaction stagiaire (entretien).
- Décision Go/No-Go formalisée par Mohamed avec plan d'ajustement documenté.
- Communication officielle publiée (email interne + page changelog).

## Risques identifiés

| Risque                                                                   | Probabilité | Impact   | Mitigation                                                                                                                                             |
| ------------------------------------------------------------------------ | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mohamed n'a pas le temps de créer le cursus pilote en parallèle du build | Élevée      | Élevé    | Bloquer 2 demi-journées dans son calendrier en S2 et S3 ; matérial de roadmap.sh comme inspiration pour éviter de partir d'une page blanche            |
| Bug critique pendant le pilote qui décourage les stagiaires              | Moyenne     | Élevé    | Astreinte légère pendant les 3 semaines ; hotfix path documenté ; communication transparente avec les pilotes ("vous êtes pilotes, on itére ensemble") |
| Stagiaires sans compte GitHub bloqués à J1                               | Moyenne     | Élevé    | Briefing préalable, onboarding inclut "Crée un compte GitHub" + tutoriel inline ; Mohamed vérifie en amont                                             |
| Recrutement de 3-5 volontaires échoue (engagement insuffisant)           | Moyenne     | Critique | Briefing motivant ; incitation : badge "pionnier Cursus" + commit dans le portfolio ; prévoir 2 backup si désistement                                  |
| Hypothèses produit invalidées : Go/No-Go = Pivot                         | Faible      | Critique | Plan B documenté (cf. vision.md) : si 0-1 critère atteint, réunion rétrospective et plan de pivot à valider                                            |

## Dépendances inter-Epics

- **Bloqué par** : **toutes** les Epics MVP (EP-01 à EP-13, EP-15, EP-16, EP-18, EP-19, EP-20).
- **Bloque** : passage en v1.0 industrialisée, ouverture à plusieurs cohortes parallèles (EP-14).
- **Parallèle à** : hotfixes uniquement (pas de nouvelles features pendant le pilote).

## Périmètre exclu de cet Epic (non-goals)

- Pas de nouvelles features pendant les 3 semaines de pilote (focus stabilisation).
- Pas de communication marketing externe (pilote interne uniquement).
- Pas de pricing/billing au pilote (gratuit pour stagiaires).
- Pas de SLA contractuel au pilote (engagement informel).

### Stories de cet Epic

- [CUR-110 — ST-17.1 Recrutement cohorte pilote (3-5 stagiaires)](https://ousmanesadjad.atlassian.net/browse/CUR-110)
- [CUR-111 — ST-17.2 Préparation cursus pilote (effort Mohamed)](https://ousmanesadjad.atlassian.net/browse/CUR-111)
- [CUR-112 — ST-17.3 Pré-vol : tests internes 2 jours](https://ousmanesadjad.atlassian.net/browse/CUR-112)
- [CUR-113 — ST-17.4 Lancement et accompagnement actif 3 semaines](https://ousmanesadjad.atlassian.net/browse/CUR-113)
- [CUR-114 — ST-17.5 Mesure métriques pilote + rétrospective](https://ousmanesadjad.atlassian.net/browse/CUR-114)
- [CUR-115 — ST-17.6 Décision Go/No-Go v1.0 + plan d'ajustement](https://ousmanesadjad.atlassian.net/browse/CUR-115)
- [CUR-116 — ST-17.7 Communication officielle ("Cursus est lancé")](https://ousmanesadjad.atlassian.net/browse/CUR-116)

---

## EP-18 — Design System & Motion (Premium) (CUR-18)

## Objectif business

Livrer le **premier axe premium** : design system complet (tokens Tailwind 4.3 via `@theme` CSS-first, composants atomes/molécules construits sur `@nuxt/ui` 4.8, dark/light mode, motion design avec `motion-v` et `@vueuse/motion`, skeleton loaders, empty states illustrés) afin que chaque écran du produit ait une qualité perceptible immédiate (sobre, professionnel, sans friction).

## Valeur métier (Business value)

Le design system est **le premier signal de qualité perçu** par l'utilisateur. Un Trello sans design = un Trello mort. Un produit avec design system = un produit qui se distingue. Inspiration assumée : Linear (sobriété), Vercel (sobriété motion). Le dark mode natif est devenu standard en 2026. Storybook 10 + Chromatic + tokens découplent design et code : si le branding change (en v2 multi-tenant), un seul fichier de tokens à modifier (`assets/css/main.css`).

## Tier et priorité

- **Tier** : Premium
- **Priorité** : Highest
- **Sprint cible** : Sprint 1 → Sprint 4 (en parallèle des Epics métier)
- **Story points cumulés** : 21

## Stories rattachées

| Key                                                                    | Titre                                                                                                            | Story Points | Priorité |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ | -------- |
| CUR-117                                                                | ST-18.1 — Design tokens (couleurs, typo, espacement, radius, shadow, motion) via `@theme` Tailwind 4.3           | 2            | Highest  |
| CUR-118                                                                | ST-18.2 — Setup @nuxt/ui 4.8 + Tailwind 4.3 (CSS-first config)                                                   | 3            | Highest  |
| CUR-119                                                                | ST-18.3 — Atomes composants (extension `UButton`, `UInput`, `UBadge`, `UAvatar`, etc.) avec Storybook 10         | 5            | Highest  |
| CUR-120                                                                | ST-18.4 — Molécules composants (Card, FormField, Alert, EmptyState, etc.)                                        | 5            | Highest  |
| CUR-121                                                                | ST-18.5 — Dark / Light mode (toggle + détection système via `useColorMode` de @vueuse/nuxt)                      | 3            | Highest  |
| CUR-122                                                                | ST-18.6 — Motion design (`motion-v` + `@vueuse/motion`, transitions, micro-interactions, prefers-reduced-motion) | 3            | Highest  |
| CUR-123                                                                | ST-18.7 — Skeleton loaders sur les écrans clés (USkeleton @nuxt/ui)                                              | 2            | High     |
| CUR-124                                                                | ST-18.8 — Empty states illustrés (10 écrans)                                                                     | 2            | High     |
| **Total Stories listées**                                              |                                                                                                                  | **25**       |          |
| _Ajustement : -4 (mutualisations Storybook / illustrations partagées)_ |                                                                                                                  | **-4**       |          |
| **Total Epic**                                                         |                                                                                                                  | **21**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- 100 % des écrans MVP utilisent des composants `@nuxt/ui` 4.8 + design tokens du DS (lint custom rejette les classes Tailwind ad-hoc à valeurs magiques).
- Dark mode parfaitement supporté sur toutes les pages (Chromatic visual diff valide).
- Tous les composants atomes + molécules ont une story Storybook 10 avec variants documentées.
- Motion respecte `prefers-reduced-motion` sur 100 % des animations (test axe-core).
- Skeleton loaders apparaissent sur tous les écrans à chargement > 200ms.
- 10 empty states illustrés livrés (no cohorte, no alerte, etc.) avec call-to-action clair.
- Lighthouse a11y >= 95 sur les écrans clés.

## Stack UI utilisée (référence pour toutes les stories rattachées)

- **Tailwind CSS 4.3** : config CSS-first via `@theme` dans `assets/css/main.css`, plus de `tailwind.config.js` obligatoire. Tokens en CSS vars (`--color-accent-base`, `--font-sans`, `--radius-md`, etc.) avec variantes dark via `@media (prefers-color-scheme: dark)`.
- **@nuxt/ui 4.8** : Free + Pro unifiés en open source. >70 composants accessibles (`UButton`, `UInput`, `UModal`, `UForm`, `UFormField`, `UCommandPalette`, `UToast`, `UTooltip`, `USkeleton`, etc.). Theme via CSS vars.
- **Vue 3.5** + Nuxt 4.4 + TypeScript 5.6 strict.
- **vee-validate ^4** + `@vee-validate/zod` + Zod ^3.23 pour formulaires (schéma symétrique client/serveur).
- **motion-v** (port Vue de Framer Motion) pour animations complexes + **@vueuse/motion** ^2 pour micro-interactions.
- **Tabler Icons** (5800+ icones outline) via `@iconify-json/tabler` ^3, tailles 16/20/24px.
- **Storybook 10.4** + `@storybook/vue3-vite` + **Chromatic** (free tier) pour tests visuels en CI.

## Risques identifiés

| Risque                                                  | Probabilité | Impact | Mitigation                                                                                                                                                       |
| ------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sur-design : trop d'animations, app lente               | Moyenne     | Moyen  | Budget motion ; respect `prefers-reduced-motion` ; profilage perfs ; inspiration Linear (sobriété)                                                               |
| Composants ad-hoc créés par devs pressés                | Élevée      | Élevé  | Lint rule custom qui rejette les classes Tailwind ad-hoc en faveur de composants `U*` ou DS ; revue PR ; documenter "comment ajouter un nouveau composant au DS" |
| Mauvais contraste / a11y en dark mode                   | Moyenne     | Élevé  | Tokens dark/light testés avec axe-core ; tests visuels Chromatic ; contraste AAA sur écrans critiques (Premium 7)                                                |
| Storybook devient un cimetière (stories non maintenues) | Moyenne     | Moyen  | DoD : toute nouvelle story = story Storybook ; Chromatic CI bloque les drift ; révisions trimestrielles                                                          |
| Illustrations empty states inhomogènes (style mélangé)  | Moyenne     | Faible | Charte illustration documentée ; usage d'une bib unique (unDraw ou custom)                                                                                       |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (ST-01.1 bootstrap Nuxt 4 + @nuxt/ui 4.8 + Tailwind 4.3, ST-01.2 CI pour Chromatic).
- **Bloque** : **toutes les UI** (EP-02 à EP-14, EP-19, EP-20). Les Stories UI ne devraient pas être Done sans utiliser les composants DS.
- **Parallèle à** : EP-16 (Storybook + Chromatic testé dans EP-16 ST-16.10).

## Périmètre exclu de cet Epic (non-goals)

- Pas de theming multi-tenant (parqué v2+).
- Pas d'illustrations animees Lottie au MVP (parqué v1.x si demande).
- Pas de redesign après pilote tant que les retours ne le justifient pas.
- Pas de sound design (anti-bruit, anti-pilier).

### Stories de cet Epic

- [CUR-117 — ST-18.1 Design tokens (couleurs, typo, espacement, radius, shadow, motion) via @theme Tailwind 4.3](https://ousmanesadjad.atlassian.net/browse/CUR-117)
- [CUR-118 — ST-18.2 Setup @nuxt/ui 4.8 + Tailwind 4.3 (CSS-first config)](https://ousmanesadjad.atlassian.net/browse/CUR-118)
- [CUR-119 — ST-18.3 Atomes composants avec Storybook 10](https://ousmanesadjad.atlassian.net/browse/CUR-119)
- [CUR-120 — ST-18.4 Molécules composants (Card, FormField, Alert, EmptyState, etc.)](https://ousmanesadjad.atlassian.net/browse/CUR-120)
- [CUR-121 — ST-18.5 Dark / Light mode (toggle + détection système)](https://ousmanesadjad.atlassian.net/browse/CUR-121)
- [CUR-122 — ST-18.6 Motion design (motion-v + @vueuse/motion, prefers-reduced-motion)](https://ousmanesadjad.atlassian.net/browse/CUR-122)
- [CUR-123 — ST-18.7 Skeleton loaders sur les écrans clés](https://ousmanesadjad.atlassian.net/browse/CUR-123)
- [CUR-124 — ST-18.8 Empty states illustrés (10 écrans)](https://ousmanesadjad.atlassian.net/browse/CUR-124)

---

## EP-19 — Internationalisation FR + EN (CUR-19)

## Objectif business

Livrer l'**axe premium #2** : internationalisation FR par défaut + EN dès le MVP, avec une source unique de vérité pour les chaînes (locales/fr.json, locales/en.json), extraction systématique des strings, i18n côté serveur (emails, PDF), détection navigateur + sélecteur, lint qui rejette les strings codées en dur.

## Valeur métier (Business value)

L'i18n dès le MVP est l'axe avec **le coût marginal le plus faible et le coût de rétrofit le plus élevé**. Investir 13 pts au MVP = économiser des semaines de migration ultérieure. Élargit immédiatement le marché cible (EN). Crédibilise le produit comme "international by design" plutôt que "FR avec EN bricolé".

## Tier et priorité

- **Tier** : Premium
- **Priorité** : High
- **Sprint cible** : Sprint 1 → Sprint 4
- **Story points cumulés** : 13

## Stories rattachées

| Key                                             | Titre                                                                                 | Story Points | Priorité |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ------------ | -------- |
| CUR-125                                         | ST-19.1 — Setup `@nuxtjs/i18n` avec FR par défaut + EN                                | 2            | High     |
| CUR-126                                         | ST-19.2 — Extraction de toutes les strings UI dans locales/fr.json et locales/en.json | 3            | High     |
| CUR-127                                         | ST-19.3 — Traduction EN initiale (Mohamed + reviewer EN)                              | 3            | High     |
| CUR-128                                         | ST-19.4 — i18n côté serveur (emails, certificats, PDF)                                | 3            | High     |
| CUR-129                                         | ST-19.5 — Détection navigateur + sélecteur de langue UI                               | 2            | High     |
| CUR-130                                         | ST-19.6 — Tests : aucune string codée en dur (linter rule)                            | 2            | High     |
| **Total Stories listées**                       |                                                                                       | **15**       |          |
| _Ajustement : -2 (mutualisation setup tooling)_ |                                                                                       | **-2**       |          |
| **Total Epic**                                  |                                                                                       | **13**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- 100 % des strings UI sont extraites dans les locales (lint rule custom passe en CI).
- FR + EN ont chacune une couverture 100 % (FR par défaut, EN traduit et revu).
- Emails et certificat PDF générés dans la langue de l'utilisateur (test des 2 sur Gmail).
- Sélecteur de langue UI persiste le choix par user (DB) ou cookie (anonyme).
- Détection navigateur fonctionne sur première visite anonyme.
- Pluralisation gérée correctement ("1 alerte", "3 alertes").

## Risques identifiés

| Risque                                                              | Probabilité | Impact | Mitigation                                                                                |
| ------------------------------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------- |
| Strings codées en dur qui passent les reviews                       | Élevée      | Élevé  | Linter rule custom + check en CI ; revue PR active ; messaging équipe                     |
| Traduction EN approximative (faux amis, ton non-pro)                | Moyenne     | Moyen  | Reviewer natif EN ; relecture par Mohamed ; outil DeepL en assistance + relecture humaine |
| Mauvaise gestion de la pluralisation (FR vs EN)                     | Moyenne     | Moyen  | Utilisation des features ICU MessageFormat ; tests sur cas 0, 1, 2, plusieurs             |
| Coût initial sous-estimé (re-découverte de strings tard)            | Élevée      | Moyen  | Linter activé dès Sprint 1 ; pas de feature mergée sans i18n                              |
| Certificat PDF qui rend mal selon la langue (longueurs différentes) | Faible      | Moyen  | Tests visuels FR/EN sur le template ; flex layout                                         |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (ST-01.1 setup module).
- **Bloque** : **toutes les UI** ; en particulier EP-10 (certificat bilingue), EP-12 (emails bilingues).
- **Parallèle à** : EP-18 (DS = composants ; i18n = textes), EP-21 (output IA en langue user).

## Périmètre exclu de cet Epic (non-goals)

- Pas de langues additionnelles au MVP (ES, DE, IT parquées v1.x sur demande).
- Pas de RTL au MVP (parqué v2+).
- Pas de traduction automatique runtime (out of scope, qualité insuffisante).

### Stories de cet Epic

- [CUR-125 — ST-19.1 Setup @nuxtjs/i18n avec FR par défaut + EN](https://ousmanesadjad.atlassian.net/browse/CUR-125)
- [CUR-126 — ST-19.2 Extraction de toutes les strings UI dans locales/](https://ousmanesadjad.atlassian.net/browse/CUR-126)
- [CUR-127 — ST-19.3 Traduction EN initiale (Mohamed + reviewer EN)](https://ousmanesadjad.atlassian.net/browse/CUR-127)
- [CUR-128 — ST-19.4 i18n côté serveur (emails, certificats, PDF)](https://ousmanesadjad.atlassian.net/browse/CUR-128)
- [CUR-129 — ST-19.5 Détection navigateur + sélecteur de langue UI](https://ousmanesadjad.atlassian.net/browse/CUR-129)
- [CUR-130 — ST-19.6 Tests : aucune string codée en dur (linter rule)](https://ousmanesadjad.atlassian.net/browse/CUR-130)

---

## EP-20 — Command Palette & Search global (CUR-20)

## Objectif business

Livrer l'**axe premium #3 et #4** : Command Palette (Cmd+K) construite sur `UCommandPalette` de @nuxt/ui v4 + recherche globale Postgres FTS, avec index searchable (cursus, cohortes, stagiaires, alertes, modules), actions contextuelles (créer cursus, inviter stagiaire), shortcuts clavier, et aide intégrée.

## Valeur métier (Business value)

La command palette est **un signal de qualité à la Linear/Vercel** : pour Mohamed qui passe son temps dans l'app, c'est 30+ % de productivité réelle (naviguer + agir en 2 frappes au lieu de 5 clics). La recherche globale couplée à la palette = trouver un stagiaire, une alerte, un module en 2 secondes. Différenciateur visible immédiatement à la découverte du produit.

## Tier et priorité

- **Tier** : Premium
- **Priorité** : High
- **Sprint cible** : Sprint 4
- **Story points cumulés** : 13

## Stories rattachées

| Key                       | Titre                                                                                       | Story Points | Priorité |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------ | -------- |
| CUR-131                   | ST-20.1 — Setup Command Palette via `UCommandPalette` de @nuxt/ui v4 (alternative cmdk-vue) | 3            | High     |
| CUR-132                   | ST-20.2 — Index searchable : cursus, cohortes, stagiaires, alertes, modules (Prisma + RLS)  | 3            | High     |
| CUR-133                   | ST-20.3 — Actions contextuelles dans la palette (créer cursus, inviter stagiaire)           | 2            | High     |
| CUR-134                   | ST-20.4 — Recherche globale Postgres FTS (full-text-search index, Prisma + `$queryRaw`)     | 3            | High     |
| CUR-135                   | ST-20.5 — Shortcuts clavier global (Cmd+K, /, etc.)                                         | 2            | High     |
| CUR-136                   | ST-20.6 — Aide intégrée dans la palette (lien doc)                                          | 1            | Medium   |
| **Total Stories listées** |                                                                                             | **14**       |          |
| _Ajustement : -1_         |                                                                                             | **-1**       |          |
| **Total Epic**            |                                                                                             | **13**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Cmd+K (Mac) / Ctrl+K (Windows) ouvre la palette (`UCommandPalette` @nuxt/ui v4) depuis n'importe quelle page en < 100ms.
- Recherche globale FTS Postgres retourne résultats en < 200ms p95 sur 1000 entités (index GIN tsvector, requête via Prisma `$queryRaw` avec preview feature `fullTextSearchPostgres`).
- 6+ actions contextuelles disponibles : créer cursus, inviter stagiaire, ouvrir alertes, voir profil X, basculer langue, basculer dark/light.
- A11y : navigation clavier complète (↑↓ + Enter + Esc), focus trap, annonces ARIA (géré nativement par `UCommandPalette`).
- Shortcuts list visible via `?` (aide intégrée).
- RLS appliqué à la recherche (un user ne voit que ce qu'il a droit de voir, grâce au rôle Postgres `cursus_app` utilisé par Prisma).

## Stack UI utilisée

- `@nuxt/ui` 4.8 : `UCommandPalette` (composant central), `UKbd` (raccourcis affichés), `UIcon`, `UModal` (aide)
- **Tailwind CSS 4.3**
- **Tabler Icons** (`@iconify-json/tabler`) : icônes par section (Cursus, Cohortes, Stagiaires, Modules, Alertes, Actions)
- `@vueuse/nuxt` ^12 : `useEventListener`, `useDebounceFn`, `useMagicKeys` (raccourcis globaux)
- **Prisma 7.8** : queries de recherche avec preview feature `fullTextSearchPostgres`
- **Storybook 10** : stories pour chaque variant de la palette (Empty, Recent, Searching, Results, NoResults, Help)

## Risques identifiés

| Risque                                                               | Probabilité | Impact   | Mitigation                                                                                                                                          |
| -------------------------------------------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recherche FTS qui expose des données non autorisées (RLS contournée) | Moyenne     | Critique | Recherche via rôle `cursus_app` (non-superuser) + RLS policies actives ; tests négatifs (audit RLS ST-15.6) ; pas de bypass admin sauf via UI admin |
| Conflit shortcuts avec d'autres app (ex : Cmd+K Slack desktop)       | Moyenne     | Moyen    | Convention industrie standard ; doc claire ; possibilité de redéfinir en v1.x                                                                       |
| Index FTS lourd qui ralentit les écritures                           | Moyenne     | Moyen    | Update via triggers Postgres dans la même transaction ; partitionnement si nécessaire ; monitoring lat. écriture                                    |
| Palette qui devient un fourre-tout (UX polluée)                      | Moyenne     | Moyen    | Catégorisation claire (Naviguer / Créer / Actions / Aide) ; tri par fréquence d'usage                                                               |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (Prisma schema + index), EP-02 (auth + RBAC pour scoping de la recherche), EP-04 (cohortes), EP-05 (stagiaires).
- **Bloque** : aucune (Premium indépendant fonctionnellement).
- **Parallèle à** : EP-18 (composants @nuxt/ui), EP-19 (i18n des labels).

## Périmètre exclu de cet Epic (non-goals)

- Pas de recherche par vector embedding sémantique (parqué v2+ avec AI).
- Pas d'historique de recherche au MVP (parqué v1.x).
- Pas de recherche cross-organization (single-tenant).

### Stories de cet Epic

- [CUR-131 — ST-20.1 Setup Command Palette via UCommandPalette de @nuxt/ui v4](https://ousmanesadjad.atlassian.net/browse/CUR-131)
- [CUR-132 — ST-20.2 Index searchable : cursus, cohortes, stagiaires, alertes, modules](https://ousmanesadjad.atlassian.net/browse/CUR-132)
- [CUR-133 — ST-20.3 Actions contextuelles dans la palette](https://ousmanesadjad.atlassian.net/browse/CUR-133)
- [CUR-134 — ST-20.4 Recherche globale Postgres FTS](https://ousmanesadjad.atlassian.net/browse/CUR-134)
- [CUR-135 — ST-20.5 Shortcuts clavier global (Cmd+K, /, etc.)](https://ousmanesadjad.atlassian.net/browse/CUR-135)
- [CUR-136 — ST-20.6 Aide intégrée dans la palette (lien doc)](https://ousmanesadjad.atlassian.net/browse/CUR-136)

---

## EP-21 — AI Assist (Differentiator v1.1) (CUR-21)

## Objectif business

Livrer le **différenciateur #1** : AI Assist en v1.1 — génération assistée de quiz depuis un module, résumé intelligent du rapport harnais ("3 raisons du rejet"), suggestion automatique de ressources, détection de patterns dans résultats quiz (notions mal comprises), garde-fous IA, métriques d'usage + coût.

## Valeur métier (Business value)

Le marché EdTech est plutôt manuel. Un AI Assist intelligent (pas génératif de cursus, ce qui est anti-pilier) qui **économise du temps formateur** sur les tâches répétitives (créer des QCM, lire un rapport d'échec) est un différenciateur radical. Coût raisonnable via API LLM (Claude Haiku au choix). Risque IA contrôlé via garde-fous Zod + validation humaine systématique (le formateur valide avant publication).

## Tier et priorité

- **Tier** : Differentiator
- **Priorité** : Medium
- **Sprint cible** : v1.1
- **Story points cumulés** : 21

## Stories rattachées

| Key            | Titre                                                                              | Story Points | Priorité |
| -------------- | ---------------------------------------------------------------------------------- | ------------ | -------- |
| CUR-137        | ST-21.1 — Génération assistée de quiz depuis un module (LLM)                       | 5            | Medium   |
| CUR-138        | ST-21.2 — Résumé intelligent du rapport harnais ("3 raisons du rejet")             | 3            | Medium   |
| CUR-139        | ST-21.3 — Suggestion automatique de ressources (lors création module)              | 3            | Medium   |
| CUR-140        | ST-21.4 — Détection patterns dans résultats quiz (notions mal comprises)           | 5            | Medium   |
| CUR-141        | ST-21.5 — Garde-fous IA (output validation Zod, hallucination detection, fallback) | 3            | Medium   |
| CUR-142        | ST-21.6 — Métriques d'usage AI + coût                                              | 2            | Medium   |
| **Total Epic** |                                                                                    | **21**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- La génération de quiz fournit 10 questions QCM acceptables (taux d'acceptation formateur > 60 % sans modification).
- Le résumé de rapport harnais est compris en moins de 30 secondes par un stagiaire débutant (test utilisateur).
- Les suggestions de ressources sont pertinentes dans > 50 % des cas (évaluation formateur).
- Les garde-fous Zod rejettent 100 % des outputs LLM mal formés (parsing fail).
- Coût API LLM mesurable, monitoré ; alerte si > 100 €/mois.
- Aucune réponse IA n'est publiée sans validation humaine explicite (anti-hallucination).

## Risques identifiés

| Risque                                                      | Probabilité | Impact   | Mitigation                                                                                                                              |
| ----------------------------------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| LLM hallucine (génère fausses ressources, fausses réponses) | Élevée      | Élevé    | Garde-fous Zod stricts ; validation humaine obligatoire avant publication ; messages "vérifie avant publier" ; pas de mode auto-publish |
| Coût LLM qui dérape (usage massif non contrôlé)             | Moyenne     | Moyen    | Rate limit par formateur (X requêtes/jour) ; alerte coût mensuel ; Haiku par défaut (low-cost)                                          |
| Données stagiaires envoyées au LLM (RGPD risque)            | Moyenne     | Critique | Anonymisation systématique avant présence pré-prompt ; pas de PII dans le prompt ; ADR "données envoyées à l'IA" validé par DPO         |
| Provider LLM (Anthropic) indisponible                       | Faible      | Moyen    | Fallback : feature dégradée (formateur crée quiz manuellement) ; pas d'erreur bloquante                                                 |
| Qualité IA insuffisante après PoC (H5 invalidée)            | Moyenne     | Moyen    | PoC en 1 jour avant build complet ; évaluation manuelle de 20 quiz générés ; ajustement prompts ; pivot si KO                           |

## Dépendances inter-Epics

- **Bloqué par** : EP-03 (modules existants), EP-06 (rapports harnais source), EP-07 (quiz cible).
- **Bloque** : aucune (Differentiator indépendant).
- **Parallèle à** : EP-19 (output IA en langue user), EP-16 (métriques coût LLM).

## Périmètre exclu de cet Epic (non-goals)

- Pas de génération IA d'un cursus complet (anti-pilier vision).
- Pas d'IA en mode auto-publish (validation humaine obligatoire).
- Pas de chatbot tutor au MVP (parqué v2+).
- Pas de fine-tuning d'un modèle custom (coup + complexité, pas justifié à ce volume).

### Stories de cet Epic

- [CUR-137 — ST-21.1 Génération assistée de quiz depuis un module (LLM)](https://ousmanesadjad.atlassian.net/browse/CUR-137)
- [CUR-138 — ST-21.2 Résumé intelligent du rapport harnais ("3 raisons du rejet")](https://ousmanesadjad.atlassian.net/browse/CUR-138)
- [CUR-139 — ST-21.3 Suggestion automatique de ressources (lors création module)](https://ousmanesadjad.atlassian.net/browse/CUR-139)
- [CUR-140 — ST-21.4 Détection patterns dans résultats quiz](https://ousmanesadjad.atlassian.net/browse/CUR-140)
- [CUR-141 — ST-21.5 Garde-fous IA (output validation Zod, hallucination detection, fallback)](https://ousmanesadjad.atlassian.net/browse/CUR-141)
- [CUR-142 — ST-21.6 Métriques d'usage AI + coût](https://ousmanesadjad.atlassian.net/browse/CUR-142)

---

## EP-22 — Integrations & Webhooks (Differentiator v1.1) (CUR-22)

## Objectif business

Livrer le **différenciateur #4** : intégrations & webhooks sortants en v1.1 — connecteurs Slack, Discord, MS Teams pour les notifs cohorte, intégration Google Calendar pour planifier les soutenances, webhooks sortants configurables (events → URL custom HMAC-signed), UI de configuration des intégrations.

## Valeur métier (Business value)

**Vivre dans l'écosystème de l'utilisateur, pas s'imposer en silo.** Les notifs vers Slack/Discord/Teams évitent de forcer le formateur à surveiller un canal de plus. Google Calendar évite la double saisie de créneaux de soutenance. Les webhooks sortants ouvrent le produit à l'écosystème custom (Zapier, Make, n8n, système RH interne) : valeur clé pour les organisations qui ont déjà un stack d'outils.

## Tier et priorité

- **Tier** : Differentiator
- **Priorité** : Medium
- **Sprint cible** : v1.1
- **Story points cumulés** : 18

## Stories rattachées

| Key                                                        | Titre                                                                       | Story Points | Priorité |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- | ------------ | -------- |
| CUR-143                                                    | ST-22.1 — Connecteur Slack (notifications cohorte → canal)                  | 3            | Medium   |
| CUR-144                                                    | ST-22.2 — Connecteur Discord (idem)                                         | 3            | Medium   |
| CUR-145                                                    | ST-22.3 — Connecteur MS Teams (idem)                                        | 3            | Medium   |
| CUR-146                                                    | ST-22.4 — Intégration Google Calendar (planification soutenances)           | 3            | Medium   |
| CUR-147                                                    | ST-22.5 — Webhooks sortants configurables (events → URL custom HMAC-signed) | 3            | Medium   |
| CUR-148                                                    | ST-22.6 — UI de configuration des intégrations                              | 2            | Medium   |
| **Total Stories listées**                                  |                                                                             | **17**       |          |
| _Réserve technique (gestion tokens OAuth, retry strategy)_ |                                                                             | **1**        |          |
| **Total Epic**                                             |                                                                             | **18**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Slack/Discord/Teams reçoivent les notifications cohorte (livrable validé, capstone planifié, alerte) sur un canal configuré.
- Google Calendar crée l'event de soutenance avec lien visio (généré par formateur), invite stagiaire automatiquement.
- Webhooks sortants sont HMAC-signés (header `X-Cursus-Signature`), retry exponentiel sur échec.
- UI de configuration permet d'ajouter/retirer une intégration en moins de 3 minutes (testable avec un canal de test).
- Les events distincts disponibles en webhook : `submission.validated`, `submission.rejected`, `alert.created`, `certificate.issued`, `cohort.completed`.
- Documentation publique des payloads webhooks dans `/docs/webhooks`.

## Risques identifiés

| Risque                                                      | Probabilité | Impact   | Mitigation                                                                                                        |
| ----------------------------------------------------------- | ----------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| OAuth tokens stockés en clair (Slack, Google)               | Moyenne     | Critique | Encryption at-rest dans Supabase Vault (ou équivalent) ; rotation automatique des refresh tokens ; audit sécurité |
| Webhook sortant en boucle (mauvaise URL qui retry) qui spam | Moyenne     | Moyen    | Retry max 3 fois avec backoff exponentiel ; circuit breaker après 10 échecs ; notif au formateur "webhook KO"     |
| Changement API Slack/Discord/Teams qui casse                | Élevée      | Moyen    | Tests d'intégration automatisés ; versioning des SDK ; monitoring des dépréciations                               |
| Surcharge de notifs Slack (spam du canal)                   | Élevée      | Moyen    | Filtrage des events activables granulairement ; mode digest possible ; quiet hours respecté                       |

## Dépendances inter-Epics

- **Bloqué par** : EP-12 (notifications interne = source des events), EP-09 (soutenances = trigger Google Cal).
- **Bloque** : aucune (Differentiator).
- **Parallèle à** : EP-15 (sécurité des tokens), EP-16 (monitoring des webhooks).

## Périmètre exclu de cet Epic (non-goals)

- Pas de webhooks entrants (one-way out seulement, parqué v2+).
- Pas de connecteurs RH (Workday, BambooHR) au MVP (parqué v2+).
- Pas de chat embarqué dans Cursus (anti-pilier ; on intègre Slack/Discord externes).
- Pas de visio embarquée (anti-pilier ; lien Zoom externe stocké).

### Stories de cet Epic

- [CUR-143 — ST-22.1 Connecteur Slack (notifications cohorte → canal)](https://ousmanesadjad.atlassian.net/browse/CUR-143)
- [CUR-144 — ST-22.2 Connecteur Discord](https://ousmanesadjad.atlassian.net/browse/CUR-144)
- [CUR-145 — ST-22.3 Connecteur MS Teams](https://ousmanesadjad.atlassian.net/browse/CUR-145)
- [CUR-146 — ST-22.4 Intégration Google Calendar (planification soutenances)](https://ousmanesadjad.atlassian.net/browse/CUR-146)
- [CUR-147 — ST-22.5 Webhooks sortants configurables (HMAC-signed)](https://ousmanesadjad.atlassian.net/browse/CUR-147)
- [CUR-148 — ST-22.6 UI de configuration des intégrations](https://ousmanesadjad.atlassian.net/browse/CUR-148)

---

## EP-23 — Premium Reporting (Differentiator v1.2) (CUR-23)

## Objectif business

Livrer le **différenciateur #3** : Premium Reporting en v1.2 — graphes d'évolution cohorte (avancement vs temps), heatmap d'activité (jour × heure), comparaison inter-cohortes (taux complétion, mention), export PDF des rapports (en plus du CSV), rapport annuel par formateur.

## Valeur métier (Business value)

**Mohamed peut montrer la valeur à sa hiérarchie**. Les rapports CSV de EP-14 sont opérationnels mais peu sexy. Les graphes Premium Reporting sont la version présentation : un dirigeant peut comprendre en 30 secondes que les promotions 2026 ont +30 % de validation 1ʳᵉ essai vs 2025. C'est l'argumentaire qui justifie de pérenniser le produit. Comparaison inter-cohortes = outil d'amélioration pédagogique ("quelle promo réussit le mieux ?").

## Tier et priorité

- **Tier** : Differentiator
- **Priorité** : Medium
- **Sprint cible** : v1.2
- **Story points cumulés** : 18

## Stories rattachées

| Key                                                                      | Titre                                                           | Story Points | Priorité |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------ | -------- |
| CUR-149                                                                  | ST-23.1 — Graphes d'évolution cohorte (avancement vs temps)     | 3            | Medium   |
| CUR-150                                                                  | ST-23.2 — Heatmap d'activité par cohorte (jour × heure)         | 3            | Medium   |
| CUR-151                                                                  | ST-23.3 — Comparaison inter-cohortes (taux complétion, mention) | 3            | Medium   |
| CUR-152                                                                  | ST-23.4 — Export PDF des rapports (en plus du CSV)              | 3            | Medium   |
| CUR-153                                                                  | ST-23.5 — Rapport annuel par formateur                          | 2            | Medium   |
| **Total Stories listées**                                                |                                                                 | **14**       |          |
| _Réserve technique (lib charts, agrégations cross-cohort, template PDF)_ |                                                                 | **4**        |          |
| **Total Epic**                                                           |                                                                 | **18**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- Graphes d'évolution interactifs (tooltip, zoom, filtre période), rendus en < 1s.
- Heatmap activité lisible à l'œil, exportable en image PNG.
- Comparaison inter-cohortes protégée par RBAC (seul l'admin/owner cohorte voit).
- Export PDF respecte le branding (logo, couleurs cohorte) et est imprimable A4.
- Rapport annuel automatisé envoyé par email en janvier de chaque année.
- Rendu charts conforme au design system (couleurs tokens, dark mode).

## Risques identifiés

| Risque                                                                                 | Probabilité | Impact | Mitigation                                                                                               |
| -------------------------------------------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Agrégations cross-cohortes lentes sur volumes importants (> 100 cohortes)              | Moyenne     | Élevé  | Vues matérialisées Postgres ; pré-calcul nocturne ; cache ; pagination                                   |
| Export PDF lourd qui timeout côté server                                               | Moyenne     | Moyen  | Génération async via queue Inngest ; notif quand prêt ; téléchargement signed URL                        |
| Comparaison inter-cohortes qui pointe une cohorte "mauvaise" → effet de stigmatisation | Moyenne     | Moyen  | Paramétrage de l'affichage (avec/sans nom) ; messaging produit : "outil d'amélioration, pas de jugement" |
| Lib charts (Apex/Recharts) trop lourde au bundle                                       | Moyenne     | Moyen  | Lazy loading ; tree shaking ; budget bundle                                                              |

## Dépendances inter-Epics

- **Bloqué par** : EP-08 (audit log + state machine = sources), EP-13 (vues cohorte de base), EP-14 (export CSV existant en v1.1).
- **Bloque** : aucune.
- **Parallèle à** : EP-18 (composants charts dans DS), EP-19 (i18n des labels), EP-22 (export PDF via webhook à un BI externe).

## Périmètre exclu de cet Epic (non-goals)

- Pas de dashboard analytics temps réel au MVP (parqué v2+).
- Pas d'export Excel natif (CSV suffit + PDF ; Excel via conversion side).
- Pas de prédiction IA des décrochages futurs (parqué v2+, hors scope différenciateur).
- Pas d'embedding charts dans des pages externes (parqué v2+).

### Stories de cet Epic

- [CUR-149 — ST-23.1 Graphes d'évolution cohorte (avancement vs temps)](https://ousmanesadjad.atlassian.net/browse/CUR-149)
- [CUR-150 — ST-23.2 Heatmap d'activité par cohorte (jour × heure)](https://ousmanesadjad.atlassian.net/browse/CUR-150)
- [CUR-151 — ST-23.3 Comparaison inter-cohortes (taux complétion, mention)](https://ousmanesadjad.atlassian.net/browse/CUR-151)
- [CUR-152 — ST-23.4 Export PDF des rapports (en plus du CSV)](https://ousmanesadjad.atlassian.net/browse/CUR-152)
- [CUR-153 — ST-23.5 Rapport annuel par formateur](https://ousmanesadjad.atlassian.net/browse/CUR-153)

---

## EP-24 — PWA & Offline lite (Premium v1.2) (CUR-24)

## Objectif business

Livrer en v1.2 une **Progressive Web App + Offline lite** : manifest PWA + install prompt, service worker (stale-while-revalidate), lecture des modules en offline lite, soumission en différé (queued offline), indicateur d'état réseau dans l'UI — afin de couvrir le besoin mobile **sans app native**, conformément à l'anti-pilier "PWA suffit".

## Valeur métier (Business value)

Le travail réel se fait sur ordinateur (anti-pilier mobile-first), mais le formateur veut consulter ses alertes / progressions en mobilité (dans les transports, en réunion). Une PWA installée évite d'engager dans une app native (coût + complexité stores). L'offline lite permet à un stagiaire de lire un module dans le train sans connexion. La soumission différée améliore la résilience aux conditions réseau dégradées.

## Tier et priorité

- **Tier** : Premium
- **Priorité** : Low
- **Sprint cible** : v1.2
- **Story points cumulés** : 13

## Stories rattachées

| Key                                                 | Titre                                                            | Story Points | Priorité |
| --------------------------------------------------- | ---------------------------------------------------------------- | ------------ | -------- |
| CUR-154                                             | ST-24.1 — Manifest PWA + install prompt                          | 2            | Low      |
| CUR-155                                             | ST-24.2 — Service worker (cache strategy stale-while-revalidate) | 3            | Low      |
| CUR-156                                             | ST-24.3 — Lecture des modules en offline lite                    | 3            | Low      |
| CUR-157                                             | ST-24.4 — Soumission en différé (queued offline)                 | 3            | Low      |
| CUR-158                                             | ST-24.5 — Indicateur d'état réseau dans l'UI                     | 1            | Low      |
| **Total Stories listées**                           |                                                                  | **12**       |          |
| _Réserve technique (Workbox config, tests offline)_ |                                                                  | **1**        |          |
| **Total Epic**                                      |                                                                  | **13**       |          |

## Critères de complétion de l'Epic

L'Epic est considéré comme **livré** quand :

- Toutes les Stories rattachées sont en statut Done.
- L'app peut être installée comme PWA sur iOS, Android, Chrome desktop, Edge desktop.
- Manifest passe l'audit Lighthouse PWA (icon, theme color, display standalone).
- Stale-while-revalidate sert les pages en < 100ms sur connexion lente.
- Un stagiaire offline peut lire les 3 derniers modules consultés.
- Une soumission tentée offline est mise en file et envoyée dès reconnexion (avec notif "envoyé").
- Indicateur d'état réseau visible (banner ou icon discrète) sans être intrusif.
- Aucune régression sur les Web Vitals (cache ne dégrade pas LCP).

## Risques identifiés

| Risque                                                                              | Probabilité | Impact | Mitigation                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Service worker mal configuré qui sert des données périmées (alertes obsolètes)      | Moyenne     | Élevé  | Stale-while-revalidate avec TTL court (60s) ; données critiques (alertes) bypass cache ; tests E2E offline |
| Update SW qui ne se propage pas (user voit l'ancienne version pendant des semaines) | Moyenne     | Moyen  | Skipping waiting + claim clients ; banner "nouvelle version disponible, rafraîchir"                        |
| Stockage offline qui dépasse quotas navigateur                                      | Faible      | Moyen  | Limite explicite par cache ; nettoyage LRU ; monitoring usage                                              |
| Soumission queue offline qui se perd (browser fermé)                                | Moyenne     | Élevé  | Stockage en IndexedDB persistant ; reprise au reload ; notif explicite si non envoyé après 24h             |
| PWA peu installée en pratique (effort opt-in)                                       | Élevée      | Faible | Install prompt non-bloquant, proposé après 3 sessions ; messaging clair des bénéfices                      |

## Dépendances inter-Epics

- **Bloqué par** : EP-01 (build prod), EP-05 (soumission à mettre en queue), EP-12 (ST-12.4 Web Push prép PWA déjà fait).
- **Bloque** : aucune.
- **Parallèle à** : EP-16 (perfs SW à monitorer), EP-18 (composants offline-aware), EP-19 (chaînes "offline" multilingues).

## Périmètre exclu de cet Epic (non-goals)

- Pas d'application native iOS/Android (anti-pilier ; PWA suffit).
- Pas de soumission de capstone en offline (trop critique, nécessite connexion).
- Pas de mode totalement offline-first (lite seulement : lecture cache + queue submissions).
- Pas de sync conflictuel élaboré (last-write-wins suffit au MVP de PWA).

### Stories de cet Epic

- [CUR-154 — ST-24.1 Manifest PWA + install prompt](https://ousmanesadjad.atlassian.net/browse/CUR-154)
- [CUR-155 — ST-24.2 Service worker (cache strategy stale-while-revalidate)](https://ousmanesadjad.atlassian.net/browse/CUR-155)
- [CUR-156 — ST-24.3 Lecture des modules en offline lite](https://ousmanesadjad.atlassian.net/browse/CUR-156)
- [CUR-157 — ST-24.4 Soumission en différé (queued offline)](https://ousmanesadjad.atlassian.net/browse/CUR-157)
- [CUR-158 — ST-24.5 Indicateur d'état réseau dans l'UI](https://ousmanesadjad.atlassian.net/browse/CUR-158)

---

## Annexe — Notes de re-synchronisation

Ce fichier représente la version 3 (mai 2026) du backlog Cursus, re-synchronisée depuis la source de vérité JIRA après plusieurs cycles d'enrichissement majeurs :

- **Migration ORM** : Drizzle → Prisma 7.8 (runtime TS pur, sans Rust engine) — voir ADR-001.
- **Migration framework** : Nuxt 3 → Nuxt 4.4 + Vue 3.5 (Nuxt 3 EOL juillet 2026).
- **UI Stack** : @nuxt/ui 4.8 (Free + Pro unifiés open source) + Tailwind CSS 4.3 (CSS-first via `@theme`) + motion-v.
- **Enrichissement EP-14 à EP-24** : initialement en mode résumé (~3 lignes par story), désormais entièrement enrichis sur JIRA (~150-300 lignes par story incluant contexte, AC Gherkin, sous-tâches techniques, dépendances, sécurité, perfs, DoD).

Le format détaillé d'EP-01 reflète le standard d'audit qualité documenté dans `11-ticket-quality-checklist.md`. La même qualité est appliquée sur JIRA pour les 134 stories CUR-25 à CUR-158 ; chaque story expose contexte business, description fonctionnelle, ≥3 scénarios Gherkin, cas limites, sous-tâches techniques (TT-XX.Y.Z), dépendances, non-goals, tests, observabilité, considérations sécurité/performance et DoD.

Pour exporter le backlog complet (Epic + Stories en version intégrale) dans un format auto-portant, utiliser le script de synchronisation Python à venir (ou l'API JIRA REST `/rest/api/3/issue/{key}` avec `responseContentFormat=markdown`).
