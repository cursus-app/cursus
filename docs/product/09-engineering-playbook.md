# 09 — Engineering Playbook (bonnes pratiques)

> **Référence permanente** à consulter à chaque story, chaque PR, chaque déploiement. Ce document est versionné dans le repo et tout changement passe par PR avec ADR si la décision est structurante.

---

## 0. Principes directeurs

1. **Lisibilité > cleverness.** Le code est lu 10× plus qu'il n'est écrit. Préférer l'explicite à l'astucieux.
2. **Sécurité par défaut.** Toute donnée est sensible jusqu'à preuve du contraire. RLS systématique. Pas de secret en clair.
3. **Type safety end-to-end.** Une vérité du schéma DB jusqu'à l'UI. Pas de `any`, pas de `@ts-ignore` sans commentaire justificatif.
4. **Boy Scout rule.** Laisser le code dans un meilleur état qu'on l'a trouvé. Petits refactos en marge des features.
5. **Build small, ship often.** PR < 400 lignes idéalement. Petits commits, déploiements fréquents.
6. **Observability first.** Si on ne peut pas l'observer en prod, on n'a pas livré.
7. **Don't repeat yourself, but don't abstract too early.** Trois occurrences avant d'extraire un helper.
8. **Tests sont du code.** Mêmes standards de qualité que le code de prod.

---

## 1. Git, commits, branches

### 1.1 Branching model — trunk-based avec branches courtes

- `main` est toujours déployable. Protégé par branch protection (PR + CI green + 1 review).
- Branches features : `feat/<scope>-<courte-description>` ou `fix/...`, `chore/...`, `docs/...`, `refactor/...`
- Durée de vie d'une branche : **< 3 jours** idéalement, **< 1 semaine** maximum.
- Pas de `develop` / `staging` longue durée. Si un travail s'étend, **feature flag** pour merger en continu.

### 1.2 Conventional Commits (obligatoire)

Format : `type(scope): description courte`

Types acceptés :

- `feat` : nouvelle fonctionnalité
- `fix` : correction de bug
- `chore` : tâche de maintenance (deps, config)
- `docs` : documentation
- `refactor` : refacto sans changement de comportement
- `perf` : amélioration de performance
- `test` : ajout/correction de tests
- `style` : formatage, point-virgule, etc. (jamais sur du code logique)
- `build` : changement build system / CI
- `ci` : changement de CI uniquement

Exemples :

```
feat(harness): add lighthouse score check
fix(auth): magic link token expiration check fails on Z timezone
refactor(cursus-builder): extract module-row into its own component
chore(deps): bump nuxt to 3.13.2
```

**Breaking change** : ajouter `!` après le type/scope et une section `BREAKING CHANGE:` dans le corps.

### 1.3 Pre-commit hooks (Lefthook ou Husky)

Sur chaque commit :

- `eslint --fix` sur les fichiers modifiés
- `prettier --write` sur les fichiers modifiés
- `tsc --noEmit` (rapide, sur fichiers modifiés)
- Commit message validé par `commitlint`

Sur chaque push :

- Tests unitaires des fichiers modifiés
- Pas de secret commit (gitleaks)

### 1.4 Pull Request

Template `.github/PULL_REQUEST_TEMPLATE.md` :

```markdown
## Pourquoi

<!-- Lien JIRA + contexte 2-3 lignes -->

## Quoi

<!-- Ce qui change concrètement -->

## Comment tester

<!-- Étapes pour reproduire la valeur en local -->

## Captures / vidéo

<!-- Si UI changée -->

## Checklist

- [ ] Tests unitaires ajoutés ou existants couvrent
- [ ] Test E2E mis à jour si parcours touché
- [ ] Documentation mise à jour si nécessaire
- [ ] A11y vérifiée (clavier, contraste, ARIA)
- [ ] Perf budget non régressé (Lighthouse CI)
- [ ] RLS policies vérifiées si touche la DB
- [ ] Pas de PII dans les logs
- [ ] Changeset ajouté si feature visible utilisateur
```

### 1.5 Code review

- **1 reviewer obligatoire** minimum (2 sur stories `security` ou `critical`).
- **SLA de review** : 24h ouvrées (pendant heures de bureau).
- **Reviewer regarde** : intention, correction, lisibilité, tests, observabilité, sécurité, perf.
- **Reviewer NE regarde PAS** : style (le linter le fait), formatage.
- **Commentaires** préfixés :
  - `nit:` — détail, pas bloquant
  - `suggestion:` — alternative à considérer
  - `question:` — clarification demandée
  - `must:` — bloquant, doit être traité
  - `praise:` — encourager les bons choix (oui, on fait ça)
- L'auteur de la PR a le dernier mot sauf sur `must` (sécurité, correctness).

### 1.6 Squash & merge

- **Stratégie de merge** : squash and merge (1 commit par PR sur `main`).
- **Titre du commit squashé** : reprend le titre de la PR (en Conventional Commits).
- **Pas de merge commits** sur `main`. Rebase ou squash uniquement.

---

## 2. Definition of Ready (DoR) et Definition of Done (DoD)

### Definition of Ready (avant de prendre une story en sprint)

- [ ] User Story rédigée avec contexte, AC Gherkin, cas limites
- [ ] Maquettes ou wireframes attachés si UI nouvelle
- [ ] Dépendances identifiées et résolues ou planifiées
- [ ] Sous-tâches techniques décomposées
- [ ] Effort estimé (story points)
- [ ] Acceptabilité validée par le PM
- [ ] Pas de question bloquante restée ouverte

### Definition of Done (avant de fermer une story)

- [ ] Tous les AC remplis
- [ ] Code reviewé et mergé sur `main`
- [ ] Tests unitaires écrits, passent
- [ ] Tests E2E des parcours touchés passent
- [ ] Couverture de tests >= 80 % sur le code modifié (instructions, branches)
- [ ] Documentation mise à jour (README technique + doc utilisateur si pertinent)
- [ ] Pas de régression sur perf budgets
- [ ] Pas de nouvelle erreur Sentry significative pendant 48h post-déploiement
- [ ] Logs structurés ajoutés sur les chemins critiques
- [ ] Métriques d'observabilité instrumentées si pertinent
- [ ] A11y vérifiée (clavier + lecteur d'écran sur les écrans critiques)
- [ ] Démo faite (à un pair, à soi, ou en sprint review)

---

## 3. Type safety stricte

### 3.1 TypeScript

```json
// tsconfig.json — extraits non-négociables
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- **Pas de `any`.** Exception : tests, où `as any` est toléré uniquement pour stub des libs externes (justifier en commentaire).
- **Pas de `@ts-ignore` / `@ts-expect-error` sans commentaire** (`// @ts-expect-error — RAISON CLAIRE`).
- **Pas de `!` non-null assertion** sauf si justifié en commentaire ou wrappé par une assertion (`assertExists()`).

### 3.2 Zod aux frontières

Validation runtime obligatoire à toutes les frontières du système :

- Entrées API (body, query, params)
- Variables d'environnement (au boot)
- Données venant de tiers (GitHub API response, Resend webhook, etc.)
- Données venant du LLM (output schema avec retry si invalide)
- Inputs formulaires côté client (vee-validate + Zod)

Pattern :

```typescript
const SubmissionSchema = z.object({
  repo_url: z
    .string()
    .url()
    .regex(/^https:\/\/github\.com\//),
  deploy_url: z.string().url().optional(),
});
type Submission = z.infer<typeof SubmissionSchema>;

// dans le endpoint
const body = SubmissionSchema.parse(await readBody(event));
```

### 3.3 Prisma 7 (ORM)

Schéma DB typé end-to-end via **Prisma 7** (runtime 100% TypeScript depuis nov 2025, 3× plus rapide que v6 Rust-based). Schéma déclaratif dans `prisma/schema.prisma`. Migrations versionnées dans `prisma/migrations/`. Types Client générés à chaque `prisma generate`.

```prisma
// prisma/schema.prisma (extrait)
model Submission {
  id          String           @id @default(uuid()) @db.Uuid
  userId      String           @map("user_id") @db.Uuid
  moduleId    String           @map("module_id") @db.Uuid
  repoUrl     String           @map("repo_url")
  deployUrl   String?          @map("deploy_url")
  status      SubmissionStatus @default(PENDING)
  submittedAt DateTime         @default(now()) @map("submitted_at")
  validatedAt DateTime?        @map("validated_at")

  user        User             @relation(fields: [userId], references: [id])
  module      Module           @relation(fields: [moduleId], references: [id])
  harnessRuns HarnessRun[]

  @@map("submissions")
  @@index([userId, status])
}

enum SubmissionStatus {
  PENDING
  RUNNING
  VALIDATED
  VALIDATED_OVERRIDE
  FAILED
  TIMEOUT
}
```

```typescript
// usage côté serveur
import { prisma } from '~/server/utils/prisma';
import type { Submission, SubmissionStatus } from '@prisma/client';

const sub = await prisma.submission.findUnique({
  where: { id },
  include: { user: true, module: true },
});
// sub est typé Submission & { user: User, module: Module }
```

**Règle absolue** :

- Jamais de `prisma.$queryRawUnsafe(`${userInput}`)` — toujours paramétré
- Toujours `prisma.$queryRaw\`SELECT ... WHERE x = ${userInput}\`` (template tag = paramètres safe)
- Ne JAMAIS instancier `new PrismaClient()` ailleurs que dans `server/utils/prisma.ts` (singleton)

---

## 4. Tests

### 4.1 Pyramide

```
            /\
           /E2E\         5%   — Playwright, parcours critiques
          /------\
         /Integration\   25%  — API + DB (Supabase test instance)
        /------------\
       /   Unit Tests  \ 70%  — Vitest, fonctions pures, composables
      /------------------\
```

### 4.2 Pattern AAA (Arrange / Act / Assert)

```typescript
it('marks submission as validated when all checks pass', async () => {
  // Arrange
  const submission = await createSubmission({ status: 'pending' });
  const allChecksPass = { repo_exists: true, branch_exists: true };

  // Act
  await updateSubmissionFromHarnessResult(submission.id, allChecksPass);

  // Assert
  const updated = await getSubmission(submission.id);
  expect(updated.status).toBe('validated');
});
```

### 4.3 Naming des tests

- Format : `it('<comportement attendu> when <condition>')` ou `it('should <résultat> if <input>')`
- Tests groupés par méthode/fonction avec `describe`

### 4.4 Tests d'intégration harnais (critique)

Maintenir un dossier `tests/harness-fixtures/` avec une demi-douzaine de petits repos GitHub publics (`cursus-fixture-1`, `cursus-fixture-2`, etc.) hébergés sur l'org Cursus, chacun illustrant un cas (tout vert, missing branch, missing signed commit, deploy down, etc.). Les tests d'intégration du harnais s'exécutent contre ces repos réels.

### 4.5 Tests E2E (Playwright)

Parcours obligatoires couverts en E2E :

1. Onboarding stagiaire (invitation → compte → GitHub lié → 1ʳᵉ semaine)
2. Soumission livrable → harnais validé → portfolio mis à jour
3. Stagiaire bloqué → notif formateur → résolution
4. Création cursus + cohorte + invitation
5. Capstone : soumission → soutenance → certificat

Tests E2E exécutés sur chaque PR (en parallèle) et bloquants pour le merge sur `main`.

### 4.6 Pas de mock fragile

- Pas de mock global. Préférer `vi.mock()` ciblé dans le fichier de test.
- Pas de mock du module DB en intégration : utiliser une instance Supabase de test.
- Mock du LLM en test unitaire avec output JSON simulé.

---

## 5. Validation et erreurs

### 5.1 Result types (pas d'exception métier)

Les exceptions sont réservées aux **erreurs imprévues**. Pour les flux métier, on utilise un type Result :

```typescript
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

// Usage
const result = await submitDeliverable(input);
if (!result.ok) {
  return { status: 400, error: result.error.message };
}
return { status: 200, data: result.value };
```

### 5.2 Erreurs typées

Hiérarchie d'erreurs métier :

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: object,
  ) {
    super(message);
  }
}

class ValidationError extends AppError {}
class AuthorizationError extends AppError {}
class NotFoundError extends AppError {}
class HarnessTimeoutError extends AppError {}
// ...
```

Mapping erreur → statut HTTP centralisé dans un handler.

### 5.3 Pas de `console.log`

Logs structurés via `pino` ou équivalent. Format JSON en prod.

```typescript
logger.info({ submissionId, userId, duration }, 'submission validated');
logger.error({ err, submissionId }, 'harness failed');
```

Niveaux :

- `error` : erreur affectant un utilisateur, à investiguer
- `warn` : situation suspecte, pas d'impact direct
- `info` : événement métier important
- `debug` : pour le dev local

### 5.4 Pas de PII dans les logs

- Pas d'email en clair, hasher si nécessaire pour corrélation
- Pas de mot de passe (évidemment), pas de token, pas de contenu d'email transactionnel
- IDs (UUID) OK
- Audit log distinct des logs applicatifs (table dédiée, durée de rétention dédiée)

---

## 6. Sécurité

### 6.1 OWASP Top 10 — checklist par PR

À mentaliser pour chaque PR touchant les endpoints :

- [ ] **A01 Broken Access Control** — RLS Supabase + middleware RBAC Nuxt, vérifié par tests d'intégration
- [ ] **A02 Cryptographic Failures** — HTTPS partout, secrets en Supabase Vault, pas de hash custom
- [ ] **A03 Injection** — Prisma paramétrise tout (`$queryRaw` tagged), jamais de `$queryRawUnsafe` avec input user
- [ ] **A04 Insecure Design** — feature flags pour activation progressive
- [ ] **A05 Security Misconfiguration** — CSP via `@nuxtjs/security`, headers, robots, CORS
- [ ] **A06 Vulnerable Components** — `pnpm audit` + Snyk en CI, Renovate actif
- [ ] **A07 Identification & Auth** — 2FA TOTP, magic link expiration, rate limiting Upstash
- [ ] **A08 Software & Data Integrity** — SRI sur les CDN externes, signatures Ed25519 sur certificats
- [ ] **A09 Logging & Monitoring** — Sentry, audit log, alertes BetterStack
- [ ] **A10 SSRF** — pas de fetch d'URL utilisateur sans validation stricte (allowlist host)

### 6.2 RLS systématique sur Supabase

**Règle absolue** : toute table contenant des données utilisateur a RLS activée. Aucune exception.

Pattern de policy :

```sql
CREATE POLICY "stagiaires voient leurs propres submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "formateurs voient les submissions de leurs cohortes"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m1
      INNER JOIN memberships m2 ON m1.cohorte_id = m2.cohorte_id
      WHERE m1.user_id = auth.uid()
        AND m1.role IN ('formateur_principal', 'co_formateur')
        AND m2.user_id = submissions.user_id
    )
  );
```

Tests RLS obligatoires : pour chaque table sensible, un test vérifie qu'un utilisateur ne peut PAS accéder à des données d'une autre cohorte (cas négatif).

### 6.3 Secrets

- Jamais commit (gitleaks pre-commit + Trivy en CI)
- En prod : Vercel secrets pour Nuxt, Supabase Vault pour les clés sensibles (signature certif, GitHub App key)
- En dev : `.env.local` (gitignored), template `.env.example` au repo

### 6.4 Rate limiting

Endpoints sensibles à rate-limiter (Upstash Redis ou table Supabase + window) :

- `/api/auth/login` : 5/min/IP
- `/api/auth/reset-password` : 3/heure/email
- `/api/submissions` (POST) : 30/heure/user
- `/api/harness/webhook` : pas de RL côté API mais HMAC validation

---

## 7. Accessibility (WCAG 2.1)

### 7.1 Cible

- **AA partout**
- **AAA sur écrans critiques** : auth, soumission livrable, capstone, vérification publique du certificat

### 7.2 Checklist par story UI

- [ ] Tous les éléments interactifs accessibles au clavier
- [ ] Focus visible (outline ou ring custom, jamais `outline:none` sans replacement)
- [ ] Contraste vérifié (AA : 4.5:1 texte normal, 3:1 texte large)
- [ ] Labels ARIA sur les boutons icon-only
- [ ] Headings hiérarchiques (un seul `h1`, pas de saut de niveau)
- [ ] Pas d'info véhiculée par la couleur seule (utiliser icône + texte)
- [ ] Erreurs de form annoncées (`aria-live` ou `aria-describedby`)
- [ ] Tableaux ont `<caption>` et `<th>` corrects
- [ ] Images ont `alt` (vide si décoratives)
- [ ] Animations respectent `prefers-reduced-motion`
- [ ] Touch targets ≥ 44×44 px
- [ ] Skip link en haut de chaque page

### 7.3 Tooling

- `axe-core` intégré dans Vitest (tests unitaires composants)
- Lighthouse a11y score >= 95 en CI
- Audit manuel screen reader (VoiceOver / NVDA) sur les écrans critiques avant release

---

## 8. Performance

### 8.1 Performance budgets

| Métrique                        | Budget                      |
| ------------------------------- | --------------------------- |
| LCP (Largest Contentful Paint)  | < 2.5 s                     |
| INP (Interaction to Next Paint) | < 200 ms                    |
| CLS (Cumulative Layout Shift)   | < 0.1                       |
| TTFB (Time to First Byte)       | < 600 ms                    |
| Bundle JS initial (gzip)        | < 200 KB                    |
| Bundle CSS initial (gzip)       | < 50 KB                     |
| Lighthouse Performance score    | >= 90 mobile, >= 95 desktop |
| Latence harnais p50 / p95       | < 3 min / < 5 min           |
| Latence API endpoint p95        | < 300 ms                    |

### 8.2 Techniques

- Lazy loading des routes (Nuxt natif via `definePageMeta({ layout: ..., lazy: true })`)
- Lazy loading des composants lourds (`<LazyComponent />`)
- Code splitting par route
- Images optimisées via `@nuxt/image` (formats AVIF/WebP, srcset auto)
- Préchargement intelligent (hover preload sur les liens visibles)
- HTTP/2 push pour les assets critiques
- Caching agressif sur les assets statiques (immutable + content hash)
- Caching stale-while-revalidate sur les données semi-statiques (cursus published, etc.)

### 8.3 Tooling

- **Lighthouse CI** : sur chaque PR, fail si régression
- **Bundle analyzer** : `nuxt build --analyze`
- **Web Vitals** : monitorés en prod (Plausible ou PostHog)

---

## 9. Observabilité

### 9.1 Trois piliers

**Logs structurés** (Pino → Vercel logs → BetterStack ou équivalent pour la query)

- Format JSON, niveau, timestamp, traceId, requestId, userId (si auth)

**Métriques** (counters, gauges, histograms)

- Postées sur un endpoint Prometheus / Pushgateway, ou simple table Supabase + vue Grafana
- Métriques clés :
  - `cursus.submissions.created.total`
  - `cursus.harness.duration.seconds` (histogram)
  - `cursus.alerts.created.total` (labeled by type)
  - `cursus.api.requests.duration.seconds` (labeled by route, status)

**Traces** (OpenTelemetry)

- Sur les chemins critiques : soumission → harnais → résultat
- Export vers Sentry Trace ou Honeycomb (au choix)

### 9.2 Alertes

| Alerte                              | Seuil                 | Canal         |
| ----------------------------------- | --------------------- | ------------- |
| Erreur Sentry sur endpoint critique | 5/heure               | Email + Slack |
| Latence harnais p95 > 7 min         | sustained 30 min      | Email         |
| Taux d'échec auth > 10 %            | sustained 10 min      | Email + Slack |
| Supabase DB connexions saturées     | > 80 %                | Email         |
| Hauteur de queue Inngest            | > 100 jobs en attente | Email         |

### 9.3 Dashboards

- **Dashboard Ops** (interne) : santé système, latences, erreurs
- **Dashboard Produit** (Mohamed) : adoption, complétion, alertes (≠ dashboard formateur cohorte)

---

## 10. ADRs (Architecture Decision Records)

### Quand écrire un ADR

Toute décision technique qui :

- Engage le produit sur plus de 6 mois
- A des alternatives crédibles non triviales
- Aura des conséquences non évidentes pour les futurs devs

Exemples : choix Nuxt vs Remix, choix Supabase vs Postgres self-hosted, choix Inngest vs pg_cron.

### Format (template `adr/000-template.md`)

```markdown
# ADR-XXX : <Titre court de la décision>

- **Statut** : Proposé | Accepté | Déprécié | Remplacé par ADR-YYY
- **Date** : YYYY-MM-DD
- **Auteurs** : @nom

## Contexte

Le problème, les contraintes.

## Options envisagées

- Option A : ...
- Option B : ...
- Option C : ...

## Décision

On retient Option X parce que…

## Conséquences

Positives, négatives, neutres.

## Références

Liens vers benchmarks, RFCs, autres ADRs.
```

ADRs stockés dans `docs/adr/` versionnés avec le code.

---

## 11. Feature Flags

### 11.1 Stratégie

- Toute feature à risque ou progressive est derrière un flag
- Flags court terme (release toggle) : durée < 1 mois, supprimés après stabilisation
- Flags long terme (kill switch, A/B test) : tagués différemment

### 11.2 Implémentation

Option choisie : table Supabase `feature_flags` simple + helper `useFeatureFlag('flag-name')`. Si besoin de plus tard d'A/B test, migration vers GrowthBook.

```typescript
// usage
const { isEnabled } = useFeatureFlag('ai-quiz-generation');
if (isEnabled) {
  // ...
}
```

### 11.3 Lifecycle

- Création du flag dans une story dédiée
- Activation progressive : Mohamed → ensemble formateurs → ensemble stagiaires
- **Suppression du flag** : story explicite dans le backlog après stabilisation

---

## 12. Naming conventions

### 12.1 Fichiers

- Composants Vue : `PascalCase.vue` (`ModuleCard.vue`)
- Composables : `useXxx.ts` (`useCohorteProgress.ts`)
- Utils / helpers : `kebab-case.ts` (`harness-report-parser.ts`)
- Endpoints API : `kebab-case.<method>.ts` (`server/api/submissions.post.ts`)
- Tests : `<name>.spec.ts` (unit) ou `<name>.test.ts` (integration), `<name>.e2e.ts` (Playwright)

### 12.2 Variables / fonctions

- camelCase pour variables, fonctions, méthodes
- PascalCase pour types, classes, composants
- SCREAMING_SNAKE_CASE pour constantes top-level

### 12.3 Database

- Tables PostgreSQL : `snake_case` au pluriel (`users`, `cursus_versions`, `harness_runs`)
- Colonnes : `snake_case` (`created_at`, `user_id`)
- Foreign keys : `<table_au_singulier>_id` (`user_id`, `cursus_id`)
- Index Prisma : automatique via `@@index([userId, status])` (Prisma génère le nom)
- Enums Prisma : `SCREAMING_SNAKE_CASE` (ex : `PENDING`, `VALIDATED_OVERRIDE`)

**Convention de mapping Prisma ↔ PostgreSQL** :

- TypeScript : `camelCase` (`userId`, `createdAt`)
- PostgreSQL : `snake_case` via `@map("user_id")` et `@@map("submissions")`
- Cette dualité est volontaire : permet d'écrire du SQL raw lisible et garde l'idiomatique TS côté code

### 12.4 Booleans

- Préfixe `is`, `has`, `can`, `should`, `did`
- Exemples : `isPublished`, `hasGithubLinked`, `canSubmit`, `shouldRetry`, `didOverride`

---

## 13. Database & migrations — Prisma 7

### 13.1 Règles d'or

- **Migrations versionnées et reversibles** via Prisma Migrate (`prisma migrate dev` en local, `prisma migrate deploy` en CI/CD)
- **Pas de migration destructive** (`DROP COLUMN`, `DROP TABLE`) sans phase d'observation préalable (minimum 2 semaines en prod avec dual-write)
- **Toujours additive en prod** : ajouter colonne, écrire dans les 2 emplacements, lire l'ancien puis le nouveau, migrer data, retirer l'ancien (multi-phase)
- **Indexer** : toute relation `where`/`include` sur une colonne sans `@@index` est suspecte
- **Relations** : `onDelete: Restrict` par défaut, `Cascade` justifié au cas par cas
- **Timestamps systématiques** : `createdAt`, `updatedAt` (via `@updatedAt`), soft-delete avec `deletedAt` sur les tables où c'est pertinent
- **`@map` et `@@map`** : on garde les noms PostgreSQL en `snake_case` (cohérence avec la convention DB et avec d'éventuelles requêtes raw SQL) tout en exposant en `camelCase` côté TypeScript

### 13.2 Connection pooling (Supabase)

Deux URLs distinctes en environnement :

- `DATABASE_URL` : pooled (Supavisor port 6543, `pgbouncer=true`) pour le Client au runtime
- `DIRECT_URL` : direct (port 5432) pour les migrations qui ne supportent pas pgBouncer

### 13.3 Singleton Prisma Client (anti-leak)

```typescript
// server/utils/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

Toujours importer depuis `~/server/utils/prisma`. Jamais `new PrismaClient()` ailleurs (sinon fuite de connexions en dev hot-reload).

### 13.4 Trigger pour `updated_at`

Prisma gère `@updatedAt` côté application. Pour les écritures hors Prisma (ex : Supabase Auth qui touche directement `users`), prévoir aussi un trigger Postgres standard appliqué à toutes les tables avec `updated_at`.

### 13.5 Naming des migrations

Prisma génère automatiquement `<timestamp>_<name_kebab>/migration.sql`. Convention pour le `name` :

- `add_users_github_handle`
- `create_submissions_index_user_id_status`
- `rename_alert_kind_to_alert_type`

### 13.6 RLS Supabase + Prisma — coexistence

Voir `07-stack-tech.md` section 3. En résumé :

- RLS reste activée sur toutes les tables sensibles
- Prisma se connecte avec un rôle dédié `cursus_app` (privilèges limités, pas de superuser)
- La logique d'autorisation est appliquée côté **middleware Nuxt** (RBAC) avant d'atteindre Prisma
- Pour Auth / Storage / Realtime : client Supabase JS (qui applique naturellement la RLS via JWT utilisateur)

Tests RLS exhaustifs obligatoires : pour chaque table sensible, vérifier qu'un user d'une autre cohorte ne peut PAS lire / écrire via les endpoints applicatifs (cas négatifs).

---

## 14. Release process

### 14.1 Versioning

Semver : `MAJOR.MINOR.PATCH`

- MAJOR : breaking change utilisateur visible
- MINOR : nouvelle feature
- PATCH : bug fix / amélioration mineure

### 14.2 Changesets

À chaque PR qui change quelque chose de visible : ajouter un changeset (`pnpm changeset` ou équivalent).

### 14.3 Changelog publié dans l'app

À chaque release : un poste sur la page `/changelog` (publique). Format léger : 2-3 phrases + capture si pertinent.

---

## 15. Documentation

### 15.1 Trois cibles

1. **Doc technique interne** : README, ADRs, schémas, runbooks → versionnée dans le repo
2. **Doc utilisateur** : aide en ligne, FAQ, guides → site dédié (`docs.cursus.app` ou page Nuxt)
3. **Doc API** : OpenAPI auto-générée depuis les schémas Zod

### 15.2 Règles

- Toute nouvelle fonctionnalité utilisateur visible → entrée doc utilisateur
- Tout endpoint public → entrée OpenAPI
- Tout module non-trivial → README de module ou commentaire en tête de fichier

### 15.3 Comments dans le code

- **Pourquoi**, pas **quoi**. Le code dit "quoi", le commentaire dit "pourquoi cette approche".
- Pas de commentaires obsolètes (mieux vaut pas de commentaire qu'un commentaire faux).
- TODO toléré avec ID de ticket : `// TODO(CUR-123): retirer quand l'API v2 sera live`

---

## 16. Outils recommandés

| Domaine             | Outil                                                 |
| ------------------- | ----------------------------------------------------- |
| Éditeur             | VS Code ou Cursor                                     |
| LLM dev             | Claude Code, Cursor, GitHub Copilot                   |
| DB GUI              | TablePlus ou Supabase Studio                          |
| API testing         | Bruno (privilégier sur Postman pour le repo-friendly) |
| Diagrammes          | Excalidraw ou Mermaid (texte versionné)               |
| Capture vidéo       | Loom ou OBS                                           |
| Communication async | Slack/Discord interne + GitHub Discussions            |

---

## 17. AI-assisted development

L'usage de Claude / Cursor / Copilot est encouragé, à condition de :

- **Toujours relire** le code généré avant commit (le dev est responsable du code, pas le LLM)
- **Tester explicitement** ce que l'IA a produit (pas de "ça compile = ça marche")
- **Pas de génération de tests par la même session que le code** — sinon le test reflète le bug du code
- **Pas de secrets / données prod** dans les prompts
- **Documenter les ADRs critiques** sans déléguer au LLM la décision finale
- **Conventional commits** rédigés à la main (le LLM tend à les rendre verbeux)

---

## 18. Quand quelque chose va mal en prod

Voir le runbook dans `docs/runbook.md` (à créer en Story EP-16). Principes :

1. **Communiquer d'abord** (status page, notif aux utilisateurs si impact)
2. **Stopper la régression** (rollback du dernier déploiement si lié)
3. **Investiguer ensuite** (logs, traces, Sentry)
4. **Postmortem blameless** pour tout incident P0/P1, sous 48h

---

## 19. Process d'évolution du playbook

Ce document est vivant. Toute proposition d'évolution :

1. Issue ou discussion ouverte
2. PR avec changements + justification (et idéalement un ADR si décision majeure)
3. Review + merge
4. Annonce dans le canal interne

L'équipe revisite globalement le playbook **1× par trimestre** pour purger les règles obsolètes et en ajouter qui ressortent de la pratique.
