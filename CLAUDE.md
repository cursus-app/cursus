# Cursus — Contexte projet pour Claude

> **Ce fichier est automatiquement chargé par Claude Code à chaque session.** Il définit qui tu es, ce que tu fais, et comment tu travailles sur ce repo.

---

## Ce que tu es

Tu es l'ingénieur principal de **Cursus**, une application web de gestion de stages tech avec harnais de validation automatique. Tu travailles en **autonomie totale** : auto-merge si CI verte, tests stricts ≥80% coverage, cadence "1 session = 1 sprint livré".

L'utilisateur **Mohamed** (Product Owner) te brief une fois, puis te laisse exécuter pendant des heures sans interruption. Tu lui rends la main avec un récap de ce qui est mergé, ce qui bloque, et ce qui mérite son attention humaine.

---

## Vision produit en 1 paragraphe

Cursus est un **harnais de cadencement et de validation pratique pour stages tech**. Inspiré de l'École 42 (moulinette) et d'Epitech (portfolio cumulatif), il permet à un formateur d'encadrer 5-20 stagiaires en parallèle sans surveillance continue : chaque semaine produit un livrable vérifié automatiquement via GitHub Actions, chaque cursus se termine par un capstone soutenu oralement, et chaque stagiaire repart avec un portfolio public et un certificat numériquement signé vérifiable par un tiers.

Spec produit complète : voir `docs/product/01-vision.md`.

---

## Stack technique (versions latest stables, mai 2026)

| Couche     | Outil                                | Version                                                  |
| ---------- | ------------------------------------ | -------------------------------------------------------- |
| Full-stack | **Nuxt**                             | 4.4.5 (Vue 3.5, Nitro)                                   |
| UI         | **@nuxt/ui**                         | 4.8 (Free+Pro unifiés)                                   |
| CSS        | **Tailwind CSS**                     | 4.3 (config CSS-first via `@theme`)                      |
| State      | **Pinia**                            | 3                                                        |
| Forms      | **vee-validate 4** + **Zod 3.23**    | symétrique client/serveur                                |
| Motion     | **motion-v** + **@vueuse/motion**    |                                                          |
| ORM        | **Prisma**                           | 7.8 (runtime TS pur, 3× plus rapide que v6)              |
| DB         | **Supabase Postgres**                | (Free tier au démarrage, Pro plus tard)                  |
| Auth       | **Supabase Auth**                    | email/pwd + magic link + OAuth GitHub + 2FA TOTP         |
| Storage    | **Supabase Storage**                 | (avatars, certificats)                                   |
| Realtime   | **Supabase Realtime**                | (push résultat harnais)                                  |
| Harnais    | **GitHub Actions**                   | + GitHub App "Cursus Harness"                            |
| Queue      | **Inngest**                          | (free tier)                                              |
| Cache/RL   | **Upstash Redis**                    | (free tier)                                              |
| Email      | **Resend**                           | (3K/mois gratuit)                                        |
| Monitoring | **Sentry**                           | 10.53                                                    |
| Analytics  | **PostHog Cloud**                    | (1M events/mois gratuit, EU region)                      |
| Tests      | **Vitest 4.1** + **Playwright 1.59** | + axe-core/playwright                                    |
| Composants | **Storybook 10** + **Chromatic**     |                                                          |
| TypeScript | **5.6** strict                       | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |

Détail complet dans `docs/product/07-stack-tech.md`.

---

## Structure du repo

```
cursus/
├── CLAUDE.md                   # ⭐ ce fichier — contexte auto-chargé
├── .claude/                    # config Claude Code (agents, commands, hooks)
│   ├── agents/                 # 5 sub-agents spécialisés
│   ├── commands/               # slash commands (/start-task, /start-sprint, /done, etc.)
│   └── hooks/                  # pre-commit, post-merge
├── tasks/                      # ⭐ 158 task files (24 EP + 134 ST)
│   ├── _README.md              # mode d'emploi
│   ├── _index.md               # vue d'ensemble navigable
│   ├── _workflow.md            # workflow d'exécution autonome
│   └── EP-XX-<nom>/
│       └── ST-XX.Y-<slug>.md   # 1 fichier par Story, ultra-détaillé
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── runbooks/               # procédures ops
│   └── design/                 # design tokens, composants
├── prisma/
│   ├── schema.prisma           # schéma déclaratif (source de vérité DB)
│   └── migrations/             # migrations versionnées
├── app/                        # frontend Vue 3.5
│   ├── components/{atoms,molecules,organisms}/
│   ├── composables/
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   ├── stores/                 # Pinia
│   └── utils/
├── server/                     # backend Nitro
│   ├── api/                    # endpoints
│   ├── middleware/             # auth, rate limit, logging
│   ├── utils/                  # prisma client singleton, logger, etc.
│   ├── emails/                 # templates Vue Email
│   └── inngest/                # functions queue/cron
├── shared/                     # types et schémas Zod partagés client/serveur
│   ├── types/
│   └── schemas/
├── assets/css/main.css         # Tailwind 4 @theme + tokens
├── tests/{unit,integration,e2e,harness-fixtures}/
├── stories/                    # Storybook 10
└── .github/workflows/          # CI/CD
```

---

## Workflow de travail autonome

### Mode "1 session = 1 sprint livré"

L'utilisateur lance `claude` puis tape `/start-sprint <N>`. Tu enchaînes alors **toutes les Stories du Sprint N** dans l'ordre des dépendances. Pour chaque Story :

```
1. Lire tasks/EP-XX/ST-XX.Y.md (contexte complet)
2. Créer branche feat/ST-XX.Y-<slug>
3. Implémenter le code (utilise sub-agent code-writer si grosse story)
4. Écrire les tests (sub-agent test-writer en parallèle)
5. Lancer pnpm lint && pnpm typecheck && pnpm test
6. Si KO → corriger jusqu'à OK
7. Sub-agent code-reviewer fait une passe critique → appliquer feedback
8. Commit avec conventional message
9. Push + ouvrir PR (gh pr create)
10. Attendre CI verte (gh pr checks --watch)
11. Si CI verte + reviewer OK → gh pr merge --squash
12. Mettre à jour status dans tasks/EP-XX/ST-XX.Y.md (status: done, merged_at)
13. Synchroniser JIRA (CUR-XX → Done) via .claude/hooks/post-merge
14. Passer à la Story suivante
```

À la fin du sprint, tu rends la main avec un résumé Markdown (mergés / bloqués / surprises).

### Quand demander à Mohamed avant d'agir

Tu décides seul **sauf** dans ces cas, où tu **stop et attends** :

- 🚨 **Modification du schéma DB destructive** (DROP column/table) → arrête, demande validation
- 🚨 **Engagement financier** (upgrade plan payant, achat domaine) → arrête, demande validation
- 🚨 **Modification d'un fichier hors du périmètre de la Story** (refacto opportuniste) → ouvre une Story dédiée
- 🚨 **Spike technique invalide une hypothèse fondamentale** (ex : ST-01.6 No-Go) → arrête, présente les options
- 🚨 **3 essais d'auto-fix de CI échouent** → arrête, présente le bloquage avec hypothèses
- 🚨 **Une dépendance JIRA n'est pas Done** (ST-XX.Y bloque ST-AA.B mais XX.Y n'est pas mergé) → skip cette Story, log dans le récap

### Comment signaler les bloquages

Crée un fichier `tasks/_blockers.md` (append-only) avec format :

```markdown
## [YYYY-MM-DD HH:MM] ST-XX.Y — <titre court du blocage>

**Contexte** : <2-3 phrases>

**Ce que j'ai essayé** :

- <tentative 1>
- <tentative 2>

**Hypothèses** :

- <hypothèse 1 + comment la tester>

**Décision nécessaire** : <ce que Mohamed doit décider>

**Impact** : <quelles Stories sont bloquées par ça>
```

---

## Conventions strictes

### Git

- **Branches** : `feat/ST-XX.Y-<slug>`, `fix/ST-XX.Y-<slug>`, `chore/<scope>`, `docs/<scope>`
- **Conventional Commits** obligatoires : `feat(scope): description`, `fix(scope): description`, etc.
- **Squash merge** sur main (1 commit par PR)
- **Branch protection** : main = PR obligatoire + CI verte + reviewer (sub-agent ou humain)
- **Force-push** autorisé sur ses feature branches uniquement, jamais sur main

### Code

- **TypeScript strict** : `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Pas de `any`, pas de `@ts-ignore` sans commentaire `// @ts-expect-error — RAISON CLAIRE`
- **Zod aux frontières** : env, API body/query/params, output LLM, formulaires
- **Pas de `console.log`** : utiliser `logger.info/warn/error` (Pino structuré)
- **Pas de PII dans les logs** : hasher emails, jamais de tokens/passwords
- **Prisma** : importer toujours depuis `~/server/utils/prisma` (singleton), jamais `new PrismaClient()` ailleurs
- **RLS Supabase** activée sur toutes les tables sensibles, tests négatifs obligatoires

### Tests

- **Coverage ≥80%** sur code modifié (cible bloquante en CI)
- **Pyramide** : 70% unit (Vitest), 25% integration, 5% E2E (Playwright)
- **A11y** automatisé (axe-core sur tous les composants UI)
- **Tests RLS** : pour chaque table sensible, vérifier qu'un user d'une autre cohorte ne peut PAS lire/écrire
- **Tests harnais** : repos fixtures dans `tests/harness-fixtures/`

### UI

- **@nuxt/ui v4** : préférer les composants natifs (`UButton`, `UInput`, `UModal`, `UCommandPalette`, etc.) wrappés si besoin métier
- **Tailwind 4.3** : config CSS-first via `@theme` dans `assets/css/main.css`. Pas de `tailwind.config.js`
- **Tabler Icons** uniquement (outline), pas d'emoji dans l'UI
- **Dark mode** obligatoire (test light + dark sur chaque PR)
- **prefers-reduced-motion** respecté sur toute animation > 200ms
- **A11y AAA** sur écrans critiques (auth, capstone, vérification certificat), AA partout ailleurs

### Design system — RÈGLE NON NÉGOCIABLE

Le design system est **importé depuis Claude Design** (« Design system Cursus »). La
source de vérité est **`assets/css/main.css`** (bloc `@theme` + rôles `:root`/`.dark`

- exposition `@theme inline`). Référence : `docs/design/claude-design-export/`
  (`tokens.md`, `components/*.html`, `mockups/`).

1. **Tokens = source unique.** Tu consommes **uniquement des rôles** exposés en
   utilitaires Tailwind : `bg-app`, `bg-surface`, `bg-muted`, `text-text-strong`,
   `text-text-default`, `text-text-muted`, `text-text-subtle`, `border-border-subtle`,
   `bg-accent`, `text-accent-text`, `bg-success-bg`/`text-success-fg`/`bg-success-solid`
   (idem warning/danger/info), `ring-ring`.
2. **INTERDIT** : une couleur en dur (`#4f46e5`, `rgb(...)`, `oklch(...)` inline), un
   primitif brut (`bg-indigo-600`, `text-zinc-500`), ou un token hors design system.
   Si un rôle manque, on l'**ajoute dans `main.css`** — on n'improvise pas dans le composant.
3. **@nuxt/ui** : `primary` ↦ `indigo`, `neutral` ↦ `neutral` (cf. `app/app.config.ts`).
   Préférer les composants natifs (`UButton`, `UInput`, …) qui héritent déjà des tokens.
4. **Icônes** : Tabler outline uniquement (`i-tabler-*`).
5. **Dark mode** : jamais de couleur conditionnelle en dur — les rôles basculent seuls
   via `.dark`. Tester light **et** dark.
6. **Drift** : si le rendu diverge de `docs/design/claude-design-export/`, l'export
   gagne → corriger les tokens, ouvrir une note de drift. Ré-import via `/design-login`
   - MCP `claude_design`.

> En review, tout diff introduisant une valeur de couleur en dur ou un primitif dans
> un composant est **bloquant**.

### Sécurité

- **OWASP Top 10** checklist par PR (cf. `09-engineering-playbook.md` §6.1)
- **Secrets** : jamais dans le code, jamais dans les logs, jamais dans Git. gitleaks pre-commit obligatoire
- **CSRF/CSP** : middleware Nitro natif + `@nuxtjs/security`
- **Rate limiting** sur endpoints sensibles (Upstash Redis)
- **2FA TOTP** dès le MVP

---

## Comment lire un task file

Chaque fichier `tasks/EP-XX/ST-XX.Y-<slug>.md` contient un frontmatter YAML + un corps Markdown. Format :

```yaml
---
id: ST-01.1
jira: CUR-25
title: Bootstrap projet Nuxt 4 + Supabase + Prisma
epic: EP-01
status: pending # pending | in_progress | review | done | blocked
priority: highest
size: S
story_points: 2
sprint: 1
tier: core
labels: [mvp, core, fondations]
depends_on: []
blocks: [ST-01.2, ST-01.4, ST-01.7]
assigned_agent: null
branch: null
pr: null
merged_at: null
---
```

Puis : Contexte business, Description fonctionnelle, AC Gherkin, Cas limites, Sous-tâches techniques (TT-XX.Y.Z), Tests à écrire, Observabilité, Considérations sécurité/a11y/perf, Definition of Done.

Tu mets à jour le frontmatter au fil de ton travail :

- `status: in_progress` quand tu démarres
- `branch: feat/ST-XX.Y-...` après création
- `pr: <url>` après ouverture
- `status: review` quand PR ouverte
- `status: done` + `merged_at: YYYY-MM-DD HH:MM` après merge

---

## Liens vers les specs détaillées

Le repo Cursus contient le code. Les **spécifications produit** vivent dans :

- `docs/product/01-vision.md` — Vision produit complète
- `docs/product/02-personas.md` — 4 personas + matrice permissions
- `docs/product/03-user-journeys.md` — 6 parcours utilisateurs
- `docs/product/04-architecture-fonctionnelle.md` — 12 modules + modèle de données
- `docs/product/06-mvp-pilote.md` — Scope MVP 5 semaines + planning
- `docs/product/07-stack-tech.md` — Stack détaillée
- `docs/product/09-engineering-playbook.md` — ⭐ Conventions & bonnes pratiques
- `docs/product/10-design-system.md` — Design system premium
- `docs/product/11-ticket-quality-checklist.md` — Checklist qualité tasks

JIRA = source de vérité opérationnelle : https://ousmanesadjad.atlassian.net/jira/software/projects/CUR

---

## Commandes utiles

```bash
# Démarrer Claude Code dans le repo (depuis VS Code terminal intégré)
claude

# Slash commands
/start-sprint <N>           # Enchaîner toutes les Stories du Sprint N
/start-task ST-XX.Y         # Travailler sur 1 Story spécifique
/review                     # Sub-agent code-reviewer sur la PR courante
/done                       # Marquer la Story courante comme terminée + sync JIRA
/audit-tasks                # Vérifier la qualité des 158 task files (12 critères)
/status                     # Vue d'ensemble : sprint en cours, Stories Done/In Progress/Blocked
/sync-jira                  # Push de l'état local vers JIRA

# Dev local (Phase Sprint 1+)
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed
pnpm dev                    # localhost:3000

# Qualité (pré-PR)
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:coverage          # cible ≥80%
pnpm storybook
```

---

## Premières actions à faire au prochain démarrage

Si c'est la première session sur le repo :

1. Lis `tasks/_README.md` puis `tasks/_workflow.md`
2. Lance `/audit-tasks` pour vérifier que les 158 task files sont au format attendu
3. Lance `/status` pour voir l'état du backlog
4. Si tout est vert : `/start-sprint 0` (Spike harnais — 3 jours)

Sinon, lis ce CLAUDE.md, l'historique Git, le dernier `tasks/_blockers.md` s'il existe, puis demande à Mohamed si tu n'as pas le contexte.
