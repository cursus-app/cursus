# ADR-001 : Stack technique Cursus

- **Statut** : Accepté
- **Date** : 2026-06-21
- **Auteurs** : @ousmanesadjad
- **Reviewers** : @ousmanesadjad (tech lead)
- **Story / Epic JIRA** : [CUR-29](https://ousmanesadjad.atlassian.net/browse/CUR-29)

---

## Contexte

Cursus est une application web de gestion de stages tech (5–20 stagiaires, 1–3 formateurs) avec validation automatique de livrables via un harnais GitHub Actions et délivrance de certificats numériquement signés.

Contraintes structurantes :

- **Équipe** : 1 dev (Mohamed), solo au démarrage, contributions ponctuelles possibles.
- **Budget** : Free tiers uniquement au démarrage. Pas de serveur dédié.
- **Délai** : MVP en 5 semaines (Sprint 1–2). Pas de temps pour une infra complexe.
- **Exigences** : SSR (SEO certificat public), Realtime (résultats harnais push), Auth robuste (2FA TOTP, OAuth GitHub), RLS Supabase pour isolation des données inter-cohortes.
- **Qualité** : TypeScript strict, tests ≥ 80%, a11y AA/AAA, Lighthouse ≥ 85.

---

## Options envisagées

### 1. Framework full-stack

#### Option A — Nuxt 4.4 + Vue 3.5 ✅

**Description** : Framework SSR Vue. Nitro (serveur universel), auto-imports, file-based routing, modules officiels (Supabase, i18n, SEO, UI).

**Pros** :

- Écosystème Vue 3.5 mature (Composition API, `useTemplateRef`, reactive props destructuring)
- Modules Nuxt couvrent 80% des besoins sans config : auth, i18n, SEO, UI, Color Mode
- Nitro = serveur API, middleware, Vercel Edge Runtime sans code supplémentaire
- `@nuxt/ui 4.8` (Free + Pro open source) = composants accessibles prêts à l'emploi

**Cons** :

- Écosystème React plus large en communauté
- Nuxt 4 encore récent (avril 2025), quelques rough edges

**Coût** : 0 $ · maîtrise immédiate

#### Option B — Next.js 15 + React

**Pros** : Communauté massive, shadcn/ui, Vercel first-class.
**Cons** : Équipe Vue-first. Pas de raison stratégique de migrer. React Server Components complexifient l'interactivité Realtime.
**Coût** : 0 $ · courbe d'apprentissage 3–4 semaines

#### Option C — SvelteKit

**Pros** : Performance bundle, ergonomie DX.
**Cons** : Moins de modules pour nos besoins (Supabase SDK, i18n, composants accessibles). Communauté plus restreinte.

---

**Décision** : **Option A — Nuxt 4.4.5 + Vue 3.5**.
Équipe Vue-first, écosystème de modules covering 80 % du besoin, Nitro serveur API inclus. Nuxt 3 est EOL juillet 2026 — autant partir sur Nuxt 4 directement.

---

### 2. ORM

#### Option A — Prisma 7.8 ✅

**Description** : ORM TypeScript avec runtime 100% TS (nov 2025, abandon du Rust query engine). Schema déclaratif, migrations SQL versionnées, Client TS généré.

**Pros** :

- **Runtime TypeScript pur** : pas de binaire natif Rust → zéro problème ARM/x86 sur Vercel
- **3× plus rapide** que Prisma 6 sur la majorité des queries (benchmark nov 2025)
- **Bundles ~90% plus petits** côté serveur
- **Cold start drastiquement réduit** : critique pour Vercel serverless (fonctions edge)
- Schema `schema.prisma` = source de vérité unique → génère Client TS + migrations SQL + ERD
- DX : autocomplétion sur toutes les relations, `include`/`select` fully typed
- Prisma Studio en local pour l'exploration des données

**Cons** :

- Bypass RLS Supabase par défaut (connexion pooler en mode `session`, pas `row`) → **mitigé** : rôle PostgreSQL `cursus_app` non-superuser + RBAC applicatif en middleware Nuxt + tests RLS négatifs obligatoires en CI
- Coexistence avec Supabase JS client (Auth, Storage, Realtime) à documenter

**Coût** : 0 $

#### Option B — Drizzle ORM

**Pros** : Excellent typage, très léger, SQL-first.
**Cons** : Écosystème moins mature (pas de Studio stable, migration tooling moins complet). DX inférieure sur les relations complexes imbriquées (cursus → modules → submissions → harness_runs). Plus de boilerplate sur les requêtes métier.

#### Option C — Kysely

**Pros** : Query builder bas niveau, très bien typé.
**Cons** : Pas de migrations intégrées, pas de schema déclaratif, pas adapté pour une équipe solo.

#### Option D — TypeORM

**Pros** : Mûr, decorators-first, migrations.
**Cons** : Decorators rendent les types moins inférables. DX inférieure à Prisma.

#### Option E — Prisma 6 (Rust engine)

**Rejet** : Cold start lents (500ms+) sur Vercel serverless, binaires natifs à vendoriser, bundles serveur volumineux. Prisma 7 résout tout ça.

---

**Décision** : **Option A — Prisma 7.8**.
Runtime TS pur = zéro friction Vercel. 3× plus rapide. Schema déclaratif = DX supérieure. La coexistence avec Supabase JS est documentée et encadrée (cf. `server/utils/prisma.ts` singleton).

---

### 3. Base de données & Auth

#### Option A — Supabase (Postgres hébergé + Auth + Storage + Realtime) ✅

**Pros** :

- Postgres managed + Auth (email, magic link, OAuth, TOTP 2FA) dans un seul produit
- **RLS natif** : politiques de sécurité au niveau ligne dans PostgreSQL
- **Realtime** (WebSocket) pour pousser les résultats du harnais au client
- **Storage** pour avatars et certificats PDF
- Free tier généreux (500MB, 50k MAU, 2GB storage)
- SDK JS officiel pour Auth/Storage/Realtime, utilisé côté client

**Cons** :

- Vendor lock-in Supabase pour les fonctionnalités Auth/Realtime/Storage (mais Postgres reste exportable)
- Free tier limité en connexions DB simultanées → contourné par Prisma 7 (connection pooling natif)

#### Option B — PlanetScale + Auth custom

**Cons** : MySQL uniquement, pas de RLS natif, Auth à construire from scratch.

#### Option C — Neon + NextAuth

**Cons** : Neon = Postgres serverless mais sans Realtime ni Storage. NextAuth nécessite configuration importante.

---

**Décision** : **Option A — Supabase**.
Couvre Auth + DB + Storage + Realtime dans un seul free tier. RLS natif = isolation multi-tenant sans code custom. SDK JS pour Auth/Realtime, Prisma pour les requêtes métier.

---

### 4. UI / Design System

#### Option A — @nuxt/ui 4.8 + Tailwind CSS 4.3 ✅

**Pros** :

- `@nuxt/ui 4.8` : Free + Pro open source depuis mars 2026. Composants accessibles (a11y AA+), dark mode natif, Tailwind 4 compatible.
- **Tailwind 4.3 CSS-first** : configuration dans `@theme` CSS (plus de `tailwind.config.js`). Tokens design en OKLCH natif.
- Design system Cursus importé depuis Claude Design : tokens primitifs (indigo + neutral warm-cool) + rôles sémantiques (`bg-app`, `text-text-default`, `bg-accent`, etc.)
- Icônes Tabler Outline via `@nuxt/icon` : 5000+ icônes, tree-shaken

**Cons** :

- Dépendance forte à l'écosystème @nuxt/ui (changements breaking possibles)

#### Option B — shadcn-vue

**Cons** : Modèle "copy-paste" — trop de boilerplate, chaque composant est une décision unitaire. DX inférieure pour une équipe solo.

#### Option C — PrimeVue 4

**Cons** : Style Material Design + corporate ne colle pas au branding sobre de Cursus. A11y moins propre.

#### Option D — Vuetify 3

**Cons** : Material Design trop prononcé, personnalisation complexe du thème.

---

**Décision** : **Option A — @nuxt/ui 4.8 + Tailwind 4.3**.
Composants accessibles prêts à l'emploi, design system sur mesure via CSS `@theme`, dark mode sans conditionnel. Tabler icons uniquement.

---

### 5. Hébergement & CI/CD

#### Option A — Vercel + GitHub Actions ✅

**Pros** :

- Vercel : déploiement Nuxt/Nitro first-class, preview deployments automatiques par PR, Edge Network, Analytics intégré
- GitHub Actions : CI gratuite (2000 min/mois), workflows YAML, intégration native GitHub (PR checks, status API)
- GitHub App "Cursus Harness" : webhooks vers Inngest pour déclencher les checks harnais

**Cons** :

- Vercel free tier : 100GB bandwidth/mois, serverless avec cold starts (mitigés par Prisma 7)
- Lock-in Vercel pour les Edge functions

#### Option B — Fly.io + GitHub Actions

**Pros** : Containers, pas de cold start.
**Cons** : Configuration ops plus complexe, pas de preview deployments natifs.

---

**Décision** : **Option A — Vercel + GitHub Actions**.
Preview deployments automatiques par PR = QA facile. Nuxt first-class. Intégration GitHub native pour le harnais.

---

### 6. Observabilité

#### Option A — Sentry 10.53 + Pino + Plausible ✅

- **Sentry 10.53** : error tracking + performance monitoring, free tier 5k errors/mois
- **Pino** : logger JSON structuré ultra-performant côté Nitro serveur. Format : `{level, time, service, env, ...context}`. PII-free obligatoire.
- **Plausible** : analytics privacy-first (RGPD compliant), 1M events/mois gratuit, EU region

**Alternatives rejetées** :

- PostHog Cloud : utilisé pour les métriques produit (feature flags, funnels) — distinct de l'analytics visiteurs Plausible
- Datadog : trop cher pour un free tier solo
- LogRocket : session replay coûteux, privacy concerns

---

### 7. Jobs asynchrones

#### Option A — Inngest ✅

**Pros** : Queue + cron + retry + fan-out en TypeScript natif. Free tier 50k runs/mois. Intégration Vercel serverless directe. Dashboard de debug.

**Cons** : Vendor lock-in.

**Alternative rejetée** : Bull/BullMQ (nécessite Redis self-hosted, ops supplémentaires). Temporal (trop complexe pour le besoin).

---

### 8. Cache / Rate Limiting

#### Option A — Upstash Redis ✅

**Pros** : Serverless Redis pay-per-request, free tier 10k commands/jour. SDK HTTP (compatible Edge). Rate limiting via `@upstash/ratelimit`.

**Alternative rejetée** : Vercel KV (même technologie, mais moins flexible hors Vercel).

---

### 9. Email transactionnel

#### Option A — Resend ✅

**Pros** : 3000 emails/mois gratuit, templates Vue Email (composants Vue), API simple, logs de livraison.

**Alternative rejetée** : SendGrid (UI complexe, free tier limité), Mailgun (moins de DX TypeScript).

---

## Coexistence Prisma ↔ RLS Supabase

```
Client HTTP (browser)
  └── @nuxtjs/supabase (Auth, Realtime, Storage)  ←→  Supabase Auth / Storage / Realtime

Nitro serveur (API routes)
  └── Prisma 7.8 (ORM) ──────────────────────────  ←→  Supabase Postgres (via pooler)
       rôle: cursus_app (non-superuser, SET ROLE)

Politiques RLS activées sur tables sensibles :
  users, memberships, submissions, harness_runs, quiz_attempts

RBAC applicatif :
  middleware Nuxt vérifie le JWT Supabase Auth → extrait role/cohorteId
  → applique les filtres Prisma correspondants
```

Le rôle PostgreSQL `cursus_app` n'a pas de droits superuser. Les politiques RLS sont un backstop (défense en profondeur), pas la seule protection. Le RBAC applicatif est la première ligne de défense.

---

## Conséquences

### Positives

- Stack TypeScript de bout en bout (frontend + backend + DB schema + migrations)
- Zéro serveur à opérer (Vercel + Supabase + Upstash managed)
- Free tier couvre le MVP complet (5–20 stagiaires)
- Preview deployments automatiques par PR → QA sans effort
- Auth robuste out-of-the-box (2FA TOTP, OAuth GitHub, magic link)
- Realtime sans WebSocket custom → résultats harnais pushés au client instantanément

### Négatives / Trade-offs assumés

- **Vendor lock-in** : Supabase (Auth/Realtime), Vercel (Edge), Inngest (queue). Mitigé : Postgres exportable, Nitro peut tourner anywhere, Inngest peut être remplacé par BullMQ.
- **Bypass RLS par Prisma** : mitigé par rôle non-superuser + RBAC + tests négatifs en CI.
- **Cold start Vercel** : mitigé par Prisma 7 (bundle 90% plus petit) + `vite.optimizeDeps.include` en dev.
- **Free tiers** : montée en charge → upgrade Supabase Pro, Vercel Pro, Inngest Starter au moment opportun.

### Actions de suivi

- [x] Bootstrap projet (ST-01.1)
- [x] Pipeline CI/CD (ST-01.2)
- [ ] Migration DB initiale (ST-01.4)
- [ ] ADR-002 : Harnais GitHub Actions (ST-01.6)

---

## Références

- [Prisma 7 announcement (nov 2025)](https://www.prisma.io/blog/prisma-7)
- [Nuxt 4 release notes](https://nuxt.com/blog/v4)
- [@nuxt/ui 4.8 changelog](https://ui.nuxt.com/getting-started/changelog)
- [Tailwind CSS v4 (CSS-first config)](https://tailwindcss.com/blog/tailwindcss-v4)
- [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Inngest docs](https://www.inngest.com/docs)
- ADRs liés : ADR-002 (harnais GitHub Actions — à venir avec ST-01.6)
