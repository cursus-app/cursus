# Cursus

> Application de gestion de parcours de stages tech — du onboarding à la délivrance du certificat, en passant par la validation automatique des livrables.

Cursus structure le parcours d'un stagiaire dev sur un cursus défini par un formateur (cursus = succession de modules hebdomadaires avec ressources, livrable, quiz, badge). Chaque livrable est validé automatiquement par un **harnais GitHub Actions** qui exécute une suite de checks (repo public, branches, tests, Lighthouse, déploiement up, etc.). Au bout du cursus : un capstone soutenu → un **certificat PDF signé** publié sur un portfolio public.

---

## Stack

- **Framework** : Nuxt 4.4.5 (Vue 3.5, Nitro server, SSR)
- **DB** : Supabase Postgres (eu-west-3) + Prisma 7.8 (runtime TS, sans Rust engine)
- **UI** : @nuxt/ui 4.8 + Tailwind CSS 4.3 (config CSS-first)
- **State** : Pinia 3
- **Validation** : vee-validate 4 + Zod 3.23 (symétrique client/serveur)
- **Tests** : Vitest 4.1 + Playwright 1.59 + axe-core
- **Components** : Storybook 10 + Chromatic
- **Observabilité** : Sentry 10.53 + Pino + Plausible
- **Jobs async** : Inngest
- **Email** : Resend (templates Vue Email)
- **Cache / rate limit** : Upstash Redis
- **CI/CD** : GitHub Actions → Vercel

Détail complet dans `docs/product/07-stack-tech.md`.

---

## Démarrage rapide

### Prérequis

- Node.js **20** (cf. `.nvmrc`) — `nvm use`
- pnpm **9+** — `corepack enable && corepack prepare pnpm@latest --activate`
- Un projet Supabase (region eu-west-3 recommandée)
- Un compte Resend, Sentry, Upstash, Inngest (free tier suffit au pilote)

### Installation

```bash
# 1. Cloner et installer
git clone <repo>
cd cursus
pnpm install

# 2. Configurer l'environnement
cp .env.example .env
# Renseigne DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SENTRY_DSN, UPSTASH_REDIS_*, etc.

# 3. Générer le Prisma Client + appliquer les migrations en local
pnpm prisma generate
pnpm prisma migrate dev

# 4. (Optionnel) Seed dev
pnpm prisma db seed

# 5. Démarrer
pnpm dev
```

L'app tourne sur `http://localhost:3000`. Le endpoint santé : `http://localhost:3000/api/health`.

### Scripts utiles

```bash
pnpm dev                  # Nuxt dev server (HMR)
pnpm build                # Build prod
pnpm preview              # Prévisualisation du build
pnpm lint                 # ESLint (auto-fix avec --fix)
pnpm typecheck            # vue-tsc strict
pnpm test                 # Vitest watch
pnpm test:run             # Vitest single-run + coverage
pnpm test:e2e             # Playwright E2E
pnpm storybook            # Storybook dev
pnpm prisma studio        # GUI DB
```

---

## Structure du repo

```
cursus/
├── app/                  Code applicatif Nuxt (pages, components, composables, layouts, stores)
├── server/               Nitro server (API endpoints, middleware, jobs Inngest, emails)
├── prisma/               Schéma + migrations + seed
├── shared/               Types et schémas Zod partagés client/serveur
├── assets/               CSS (Tailwind v4 @theme), icônes, fonts
├── public/               Assets statiques exposés tel quel
├── stories/              Storybook
├── tests/                Tests unitaires, integration, E2E, fixtures harnais
├── docs/                 ADRs, runbooks, doc design
├── tasks/                Task files (1 par ST-X.Y) — méthodologie spec-driven
├── .claude/              Configuration Claude Code (agents, commands, hooks)
└── .github/workflows/    CI : ci.yml, lighthouse.yml, chromatic.yml
```

---

## Documentation

### Repo

- **`CLAUDE.md`** : contexte projet auto-chargé par Claude Code (à lire en premier)
- **`tasks/_README.md`** : méthodologie de spec-driven tasks (1 fichier par story JIRA)
- **`docs/adr/`** : Architecture Decision Records
- **`docs/runbooks/`** : runbooks ops (incident, rollback, etc.)
- **`docs/db/`** : schémas DB et politiques RLS

### Documentation produit complète — [`docs/product/`](./docs/product/README.md)

- **Cadrage stratégique** (00-13) : vision, personas, parcours, archi, MVP, stack, playbook, design system, checklists qualité, ressources externes
- **`curriculums/`** : cursus complets prêts à l'emploi (Cybersec L1 disponible)
- **`pilot-pack/`** : pack communication pilote (email, FAQ, onboarding, brief kick-off)
- **`legal-templates/`** : drafts CGU + Privacy + Mentions + DPA (à valider par avocat)

### Assets de marque — [`public/branding/`](./public/branding/README.md)

- Logo SVG (full, icon, monochrome) + favicon dark/light auto
- Palette OKLCH + brand guidelines

### Landing page pré-lancement — [`public/landing/`](./public/landing/README.md)

- Page HTML statique autonome, prête à déployer sur Vercel/Cloudflare Pages

---

## Engineering playbook (à lire avant la première PR)

Toutes les règles d'ingénierie (commits, PR, tests, sécurité, perf, a11y) sont dans le dépôt `docs/product/09-engineering-playbook.md`. Résumé non négociable :

- **TypeScript strict** (pas de `any`, pas de `@ts-ignore` sans raison)
- **Validation Zod aux frontières** (API, env vars, webhooks, LLM)
- **Pas de `new PrismaClient()`** ailleurs que dans `server/utils/prisma.ts` (singleton)
- **Conventional Commits** obligatoires (validés par commitlint)
- **PR < 400 lignes** + 1 review minimum
- **Tests** : 80% couverture sur le code modifié
- **A11y** : WCAG 2.1 AA partout, AAA sur écrans critiques
- **Pas de PII dans les logs** (Pino + redaction)

---

## Roadmap

- **MVP** (en cours) : pilote 5-20 stagiaires sur 1-2 cursus pilotés par Mohamed
- **v1.0** : capstone, certificat PDF, portfolio public
- **v1.1** : 2FA Passkeys, AI Assist (Claude Haiku), import roadmap.sh
- **v2.0** : multi-tenant, marketplace de cursus, peer-review

Détail dans `docs/product/07-stack-tech.md` section 18.

---

## Licence

Propriétaire — © Mohamed & équipe Cursus, 2026. Tous droits réservés.
