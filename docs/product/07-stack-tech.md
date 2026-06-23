# 07 — Stack technique (v3 — Prisma + Frontend UI complet, versions mai 2026)

> **Changements v3** :
>
> - **Drizzle → Prisma 7.8** (Prisma 7 a abandonné le Rust query engine en nov 2025, 3× plus rapide, bundles -90%)
> - **Nuxt 3 → Nuxt 4.4** (Nuxt 3 entre en EOL en juillet 2026)
> - **Frontend UI explicité** : Tailwind CSS 4.3, @nuxt/ui 4.8 (Free + Pro unifiés), Storybook 10
> - Versions épinglées sur les latest stables au 28 mai 2026

---

## Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌────────────────┐         ┌─────────────────────────────────┐    │
│   │                │         │                                 │    │
│   │   Nuxt 4 SSR   │ ◄─────► │   Supabase (Postgres + Auth +   │    │
│   │   Vue 3.5      │         │   Storage + Realtime + Vault)   │    │
│   │   Nitro server │         │   accédé via Prisma 7.8 ORM     │    │
│   │                │         │                                 │    │
│   └────────────────┘         └─────────────────────────────────┘    │
│         │ ▲                                  ▲                       │
│         │ │                                  │                       │
│         ▼ │                                  │                       │
│   ┌────────────────┐         ┌──────────────────────────────────┐   │
│   │                │         │                                  │   │
│   │   Resend       │         │   GitHub Actions (Harness)       │   │
│   │   transac.     │         │   - Workflow par cursus          │   │
│   │   emails       │         │   - GitHub App "Cursus Harness"  │   │
│   │                │         │                                  │   │
│   └────────────────┘         └──────────────────────────────────┘   │
│         │                                  │                         │
│         ▼                                  ▼                         │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  Inngest (queue)  +  Upstash Redis (rate limit, cache)       │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                            │                         │
│                                            ▼                         │
│                              ┌──────────────────────────────────┐   │
│                              │   Sentry 10.53  +  Plausible     │   │
│                              │   (monitoring + analytics RGPD)  │   │
│                              └──────────────────────────────────┘   │
│                                                                      │
│         Déployé sur : Vercel (Nuxt) + Supabase Cloud (eu-west)       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 1. Frontend & Backend applicatif — Nuxt 4

### Pourquoi Nuxt 4

- **Full-stack en TypeScript** : un seul projet, un seul déploiement
- **Vue 3.5 + Composition API + macros** (`defineProps`, `defineModel`, etc.)
- **Nitro server intégré** : endpoints API directement dans `server/api/`
- **SSR + hydratation sélective** : excellent SEO, performance perçue
- **Écosystème mûr** : Pinia 3, Vue Router intégré, devtools excellents
- **Compatible** Vercel, Netlify, Cloudflare, Node, Docker

**Décision Nuxt 4** : Nuxt 3 entrant en EOL en juillet 2026, on démarre directement sur Nuxt 4.4.5. La migration depuis Nuxt 3 est documentée mais éviter le rétrofit dès le départ.

### Modules Nuxt clés

| Module                  | Version                | Rôle                                    |
| ----------------------- | ---------------------- | --------------------------------------- |
| `nuxt`                  | `^4.4.5`               | Framework principal                     |
| `vue`                   | `^3.5.x`               | (Auto-installé par Nuxt)                |
| `@nuxtjs/supabase`      | `^2.x`                 | Wrapper Supabase Auth + Realtime        |
| `@nuxt/ui`              | `^4.8.0`               | Système de composants (voir section 2)  |
| `@nuxtjs/i18n`          | `^9.x`                 | Internationalisation FR + EN            |
| `@nuxt/image`           | `^1.x`                 | Optimisation images (AVIF/WebP, srcset) |
| `@nuxtjs/seo`           | `^2.x`                 | Meta, sitemap, robots.txt, OG           |
| `@nuxtjs/tailwindcss`   | (intégré via @nuxt/ui) | Tailwind CSS 4.3                        |
| `@pinia/nuxt`           | `^0.9.x`               | Pinia 3 (state management)              |
| `@vueuse/nuxt`          | `^12.x`                | Utilitaires Vue composables             |
| `@formkit/auto-animate` | `^0.8.x`               | Auto animations layouts                 |
| `@nuxtjs/security`      | `^2.x`                 | Headers de sécurité, CSP                |
| `@nuxtjs/web-vitals`    | `^0.x`                 | Core Web Vitals monitoring              |

---

## 2. Frontend UI — système de composants premium

### Stack UI

| Outil                                      | Version                             | Rôle                                                                               |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------- |
| **@nuxt/ui**                               | `^4.8.0`                            | Bibliothèque de composants (la version 4 unifie Nuxt UI Free + Pro en open source) |
| **Tailwind CSS**                           | `^4.3.x`                            | Framework CSS utility-first                                                        |
| **Tabler Icons**                           | `^3.x` (via `@iconify-json/tabler`) | 5800+ icônes outline (cohérent avec design system)                                 |
| **vee-validate**                           | `^4.x`                              | Formulaires avec validation                                                        |
| **zod**                                    | `^3.23+`                            | Schémas de validation runtime (avec vee-validate)                                  |
| **motion-v**                               | `^0.x` (port Vue de Framer Motion)  | Motion design premium                                                              |
| **@vueuse/motion**                         | `^2.x`                              | Alternative légère pour animations simples                                         |
| **cmdk-vue** OU `@nuxt/ui UCommandPalette` | latest                              | Command palette Cmd+K                                                              |
| **vue-draggable-plus**                     | `^0.4.x`                            | Drag & drop accessible (cursus builder)                                            |

### Pourquoi @nuxt/ui v4

- **Tout est open source et gratuit** depuis v4 (les composants Pro ex-payants sont intégrés)
- Intègre **Tailwind CSS 4.3** nativement, avec design tokens via CSS variables
- Plus de **70 composants** prêts à l'emploi (Button, Modal, Form, Table, CommandPalette, Toast, Tooltip, etc.)
- **Theme system** basé sur CSS variables → support dark/light natif + customisation org-level facile
- **Auto-imports** intégrés
- Maintenu par l'équipe Nuxt officielle

### Architecture des composants (atomic design)

```
app/components/
  ├── atoms/               # Boutons, inputs, badges, icons wrappers
  │   ├── Button.vue       (extends UButton)
  │   ├── Badge.vue        (extends UBadge)
  │   └── Skeleton.vue
  ├── molecules/           # Compositions d'atomes
  │   ├── FormField.vue    (label + input + error + helper)
  │   ├── Card.vue
  │   ├── EmptyState.vue
  │   └── HarnessReportCard.vue
  ├── organisms/           # Composants métier
  │   ├── ModuleEditor.vue
  │   ├── CohorteHeatmap.vue
  │   └── CommandPaletteGlobal.vue
  └── layouts/             # Layouts Nuxt par rôle
      ├── stagiaire.vue
      ├── formateur.vue
      └── public.vue
```

### Tailwind CSS v4 — configuration

Tailwind v4 utilise une **configuration CSS-first** (plus de `tailwind.config.js` obligatoire). Les design tokens sont déclarés en CSS dans `assets/css/main.css` :

```css
@import 'tailwindcss';

@theme {
  --color-accent-base: oklch(0.55 0.22 264); /* indigo-600 */
  --color-accent-hover: oklch(0.48 0.24 264);
  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', monospace;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  /* ... */
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-accent-base: oklch(0.7 0.18 264);
    /* ... */
  }
}
```

Voir `10-design-system.md` pour la liste complète des tokens.

### Formulaires : vee-validate + Zod

Pattern unifié pour les formulaires :

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

const schema = toTypedSchema(
  z.object({
    email: z.string().email(),
    password: z.string().min(12),
  }),
);

const { handleSubmit, errors } = useForm({ validationSchema: schema });
const onSubmit = handleSubmit(async (values) => {
  // values est typé strict
});
</script>

<template>
  <UForm @submit="onSubmit">
    <UFormField label="Email" name="email" :error="errors.email">
      <UInput v-model="email" type="email" />
    </UFormField>
    <UButton type="submit">Soumettre</UButton>
  </UForm>
</template>
```

Le même schéma Zod sert côté serveur dans les endpoints Nitro → **validation symétrique client/serveur garantie**.

### Storybook 10

- **Storybook 10.x** + adapter `@storybook/vue3-vite`
- Une story par variant pour chaque composant atomique
- Tests visuels via **Chromatic** en CI (free tier suffisant)
- Storybook déployé en preview sur `stories.cursus.app/<branch>`
- Documentation des composants via **MDX**

### Iconographie

- **Tabler Icons v3** via `@iconify-json/tabler` (5800+ icônes)
- Mode **outline** uniquement (cohérence design system)
- Tailles : 16, 20, 24 px
- Couleur héritée du parent (`color: currentColor`)

### Motion design

- `motion-v` (port Vue de Motion / Framer Motion) pour animations complexes
- `@vueuse/motion` pour animations simples
- Tailwind v4 transitions pour micro-interactions
- Respect systématique de `prefers-reduced-motion`

---

## 3. Base de données & Backend services — Supabase + Prisma 7

### Pourquoi Supabase

- **Postgres managé** (extensions `pg_cron`, `pgvector`, `pg_jsonschema` disponibles)
- **Auth managée** : email/password, magic link, OAuth GitHub, 2FA TOTP — économise 2 semaines de dev
- **Storage** S3-compatible (avatars, certificats, exports)
- **Realtime** via Postgres replication — parfait pour le push du résultat harnais
- **Edge Functions** (Deno) si logique serveur hors Nuxt
- **Vault** pour stockage chiffré des secrets (clé GitHub App, clé de signature certif)
- Plan **Pro** (~25$/mois) dès le pilote : sauvegardes quotidiennes, support, pas de pause auto
- Région **eu-west** (Paris/Francfort) pour conformité RGPD

### Pourquoi Prisma 7

**Prisma 7** (sorti novembre 2025) a marqué un tournant majeur : abandon du Rust query engine au profit d'un runtime **100% TypeScript**. Résultat :

- **3× plus rapide** sur la majorité des queries
- **Bundles ~90% plus petits** côté serveur
- Démarrage à froid significativement plus rapide (critique pour Vercel serverless)
- Pas de binaire natif à déployer = compatibilité Vercel/Edge runtime améliorée
- Typage end-to-end DB → application
- Excellente DX : autocomplétion sur les relations, migrations versionnées, schema declarative

### Configuration

**Schéma déclaratif** dans `prisma/schema.prisma` :

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["typedSql", "fullTextSearchPostgres", "driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled connection (Supavisor)
  directUrl = env("DIRECT_URL")           // direct connection pour migrations
  shadowDatabaseUrl = env("SHADOW_URL")   // optionnel pour dev
}

model User {
  id           String        @id @default(uuid()) @db.Uuid
  email        String        @unique
  globalRole   UserRole?     @map("global_role")
  githubHandle String?       @unique @map("github_handle")
  avatarUrl    String?       @map("avatar_url")
  xpTotal      Int           @default(0) @map("xp_total")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  deletedAt    DateTime?     @map("deleted_at")

  memberships  Membership[]
  submissions  Submission[]
  badges       UserBadge[]

  @@map("users")
  @@index([email])
}

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
  @@index([moduleId])
}

enum UserRole {
  STAGIAIRE
  FORMATEUR_PRINCIPAL
  CO_FORMATEUR
  ADMIN
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

**Connection strings** (cohabitation avec Supabase) :

```bash
# .env
DATABASE_URL="postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[pwd]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
```

- **`DATABASE_URL`** : pooler Supavisor (port 6543, pgBouncer transaction mode) — utilisé par Prisma Client au runtime
- **`DIRECT_URL`** : connection directe (port 5432) — utilisé par `prisma migrate dev/deploy` (les migrations ne supportent pas pgBouncer)

### Migrations

```bash
# Dev : crée une migration + applique en local
pnpm prisma migrate dev --name add_submissions

# Prod : applique les migrations en attente (en CI)
pnpm prisma migrate deploy

# Génère le Client TypeScript après tout changement de schéma
pnpm prisma generate
```

Migrations versionnées dans `prisma/migrations/<timestamp>_<name>/migration.sql`. Versionnées avec le code dans Git.

### Coexistence Prisma ↔ RLS Supabase

**Point critique** : Prisma bypass par défaut la RLS Supabase car il se connecte avec un rôle Postgres avec privilèges. **Notre stratégie** :

1. **RLS reste activée** sur toutes les tables sensibles (défense en profondeur)
2. **Prisma utilise un rôle dédié `cursus_app`** avec privilèges limités (pas de superuser)
3. Pour les requêtes nécessitant le contexte utilisateur :
   - Soit on passe par les **endpoints Nuxt** qui appliquent eux-mêmes la logique d'autorisation (via middleware RBAC)
   - Soit on utilise **`$queryRawUnsafe` avec `SET LOCAL`** pour propager le `auth.uid()` à Postgres :
     ```typescript
     await prisma.$executeRaw`SELECT set_config('request.jwt.claims', ${jwt}, true)`;
     ```
4. **Le client Supabase JS** reste utilisé pour : Auth, Storage, Realtime (où la RLS est naturellement appliquée car le client utilise l'anon key + JWT utilisateur)

### Tests RLS exhaustifs (toujours obligatoires)

Voir `09-engineering-playbook.md` section 6. Pour chaque table sensible : tests négatifs vérifiant qu'un user d'une autre cohorte ne peut PAS accéder aux données via les endpoints applicatifs.

---

## 4. Le harnais — GitHub Actions

### Pourquoi GitHub Actions

- Compatible avec le fait que les stagiaires utilisent déjà GitHub
- Runners cloud gratuits jusqu'à 2 000 min/mois (largement suffisant pour 5-20 stagiaires)
- Workflow YAML versionné et lisible
- Permet de chaîner clone → install → lint → test → lighthouse → deploy preview

### Architecture

1. **Template de workflow** par module (généré à partir des critères choisis par le formateur dans le builder cursus)
2. **GitHub App "Cursus Harness"** sur org GitHub dédiée `cursus-app` (scopes minimaux : read public repos, workflow_dispatch sur le runner)
3. À chaque soumission, Cursus déclenche le workflow via `workflow_dispatch` sur un **repo central** `cursus-harness-runner`
4. Le workflow récupère le repo du stagiaire, exécute la suite de checks, et **call back** vers Cursus via webhook authentifié HMAC SHA-256
5. Cursus enregistre le résultat (champ `checks_json` sur `HarnessRun`) et met à jour le statut de la `Submission`

### Optimisations prévues v1.1

- Cache des dépendances entre runs (npm/pnpm, pip)
- Runners self-hosted si dépassement des minutes GitHub Free
- Parallélisation des checks indépendants

---

## 5. Email transactionnel — Resend

- **DX excellent** (API simple, templates Vue Email supportés natif)
- **Free tier** : 3 000 emails/mois (suffisant pilote)
- DKIM/SPF/DMARC pré-configurés
- Logs de delivery clairs avec webhook
- Templates dans `server/emails/` (Vue Email components)

**Templates au MVP** :

- Invitation magic link
- Alerte stagiaire bloqué (au formateur)
- Livrable validé
- Capstone validé + certificat
- Rappel échéance hebdo

---

## 6. Queue async — Inngest

Pour les jobs asynchrones nécessitant retry, DLQ, observabilité :

- Déclenchement workflow GitHub (ST-06.1)
- Génération PDF certificat (ST-10.2)
- Envoi emails en batch
- Job nocturne de détection d'alertes (ST-08.2)
- Vérification liens cassés (ST-03.3)
- Archivage cohortes terminées (ST-04.1)

**Free tier généreux**. Migration vers Trigger.dev possible si besoin de plus de contrôle.

---

## 7. Cache & rate limiting — Upstash Redis

- **Rate limiting** sur endpoints sensibles (login, invitations, soumissions)
- **Cache éphémère** pour le résultat OG scraping de ressources externes
- **Idempotence keys** pour les webhooks (déduplication)
- Free tier : 10 000 requêtes/jour (suffisant pilote)

---

## 8. Génération PDF (certificats)

**Choix MVP** : **`@vue-email/render` + Puppeteer** dans une Nuxt server route (`server/api/certificate/generate.post.ts`).

- Template HTML signature en Vue Email
- Conversion en PDF via Puppeteer
- Signature numérique : OpenSSL Ed25519, clé privée stockée en **Supabase Vault**
- Stockage Supabase Storage avec ACL public-read

---

## 9. Observabilité

- **Sentry 10.53** : capture erreurs front (Vue) + back (Nitro). Source maps uploadées au build. Sentry Replay activable.
- **Plausible 2.x** ou **PostHog (self-hosted)** : analytics produit sans cookie ni tracking tiers
- **BetterStack/Logtail** : ingestion des logs structurés Pino depuis Vercel
- **Web Vitals** : monitorés en prod via `@nuxtjs/web-vitals`

---

## 10. CI/CD

- **GitHub Actions** pour la CI (lint + type-check + test + build + Lighthouse CI)
- **Vercel** pour le déploiement automatique (preview par PR, prod sur `main`)
- **Branch protection** : `main` protégé, requires PR review + CI green
- **Conventional commits** + **changesets** pour versionning et changelogs

---

## 11. Tests

| Tool                    | Version   | Usage                                            |
| ----------------------- | --------- | ------------------------------------------------ |
| **Vitest**              | `^4.1.7`  | Unit + integration. Browser mode pour composants |
| **@vue/test-utils**     | `^2.x`    | Tests composants Vue                             |
| **Playwright**          | `^1.59.0` | E2E. Intégration Vitest Browser Mode             |
| **axe-core/playwright** | `^4.x`    | Tests a11y automatisés                           |
| **MSW**                 | `^2.x`    | Mock Service Worker pour fixtures API            |

### Pyramide

```
            /\
           /E2E\         5%   — Playwright, parcours critiques (P1-P5)
          /------\
         /Integration\   25%  — API + DB (Supabase test instance)
        /------------\
       /   Unit Tests  \ 70%  — Vitest, fonctions pures, composables
      /------------------\
```

### Tests d'intégration harnais (critique)

Maintenir un dossier `tests/harness-fixtures/` avec une demi-douzaine de petits repos GitHub publics (`cursus-fixture-1`, etc.) hébergés sur `cursus-app`, chacun illustrant un cas (tout vert, missing branch, missing signed commit, deploy down, etc.). Les tests d'intégration du harnais s'exécutent contre ces repos réels.

---

## 12. Sécurité

- HTTPS partout (Vercel + Supabase l'imposent)
- CSRF protection : Nuxt 4 a un middleware natif
- Rate limiting sur les endpoints sensibles (Upstash)
- Headers de sécurité (CSP, X-Frame-Options, etc.) via `@nuxtjs/security`
- Audit `npm audit` + **Snyk** en CI
- Secrets : `.env` jamais commit, Vercel secrets pour prod, Supabase Vault pour clés critiques

---

## 13. Conformité RGPD

- Hébergement EU : Supabase région `eu-west-3` (Paris), Vercel Frankfurt
- Pas de cookies tiers
- Politique de rétention : audit log 12 mois, soumissions 24 mois après clôture cohorte
- Export données utilisateur en ZIP (JSON + fichiers)
- Suppression effective sous 30 jours (job Inngest de purge)

---

## 14. Coût d'exploitation estimé (mensuel, pilote 5-20 stagiaires)

| Service                  | Plan                       | Coût             |
| ------------------------ | -------------------------- | ---------------- |
| Vercel                   | Hobby ou Pro 20$/mois      | 0 - 20$          |
| Supabase                 | Pro                        | 25$              |
| Resend                   | Free (<3 000 emails)       | 0                |
| Sentry                   | Free                       | 0                |
| Plausible                | Solo 9$/mois               | 9$               |
| Inngest                  | Free                       | 0                |
| Upstash Redis            | Pay-as-you-go              | ~1$              |
| Chromatic                | Free (5000 snapshots/mois) | 0                |
| Domaine                  | .com ou .app               | ~1$              |
| GitHub Actions           | Free (2 000 min/mois)      | 0                |
| Claude API (v1.1, EP-21) | Pas avant v1.1             | 0                |
| **Total MVP**            |                            | **~36-56$/mois** |

---

## 15. Structure du repo

```
cursus/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── lighthouse.yml
│       └── chromatic.yml
├── app/
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   └── organisms/
│   ├── composables/
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   ├── stores/                     # Pinia 3
│   └── utils/
├── server/
│   ├── api/
│   ├── middleware/
│   ├── utils/
│   └── emails/                     # Vue Email templates
├── prisma/
│   ├── schema.prisma               # Schéma déclaratif
│   ├── migrations/                 # Migrations versionnées
│   └── seed.ts                     # Seed dev local
├── shared/
│   └── types/                      # Types partagés client/serveur
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── harness-fixtures/
├── stories/                        # Storybook 10
├── public/
├── assets/
│   ├── css/
│   │   └── main.css                # Tailwind 4 @theme + imports
│   └── icons/
├── docs/
│   └── adr/
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
└── README.md
```

---

## 16. Versions pinning (extrait `package.json` cible)

```json
{
  "dependencies": {
    "nuxt": "^4.4.5",
    "vue": "^3.5.0",
    "@nuxt/ui": "^4.8.0",
    "@nuxt/image": "^1.8.0",
    "@nuxtjs/i18n": "^9.0.0",
    "@nuxtjs/seo": "^2.0.0",
    "@nuxtjs/supabase": "^2.0.0",
    "@nuxtjs/security": "^2.0.0",
    "@nuxtjs/web-vitals": "^0.6.0",
    "@pinia/nuxt": "^0.9.0",
    "pinia": "^3.0.0",
    "@vueuse/nuxt": "^12.0.0",
    "@vueuse/motion": "^2.2.0",
    "motion-v": "^0.4.0",
    "vee-validate": "^4.13.0",
    "@vee-validate/zod": "^4.13.0",
    "zod": "^3.23.0",
    "vue-draggable-plus": "^0.4.0",
    "@prisma/client": "^7.8.0",
    "@iconify-json/tabler": "^3.0.0",
    "@vue-email/render": "^0.0.10",
    "@sentry/nuxt": "^10.53.0",
    "pino": "^9.0.0",
    "resend": "^4.0.0",
    "inngest": "^3.0.0",
    "@upstash/ratelimit": "^2.0.0",
    "@upstash/redis": "^1.34.0"
  },
  "devDependencies": {
    "prisma": "^7.8.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.7",
    "@vue/test-utils": "^2.4.0",
    "playwright": "^1.59.0",
    "@playwright/test": "^1.59.0",
    "@axe-core/playwright": "^4.10.0",
    "storybook": "^10.4.0",
    "@storybook/vue3-vite": "^10.3.0",
    "chromatic": "^11.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "@nuxt/eslint": "^0.7.0",
    "prettier": "^3.4.0",
    "lefthook": "^1.10.0",
    "gitleaks": "*",
    "pino-pretty": "^11.0.0",
    "vue-tsc": "^2.1.0"
  }
}
```

> Note : `^` autorise les patches et minors. Renovate Bot configuré pour PR automatiques sur les minor updates.

---

## 17. Décisions techniques validées vs à valider

| Sujet                     | Décision                                             | Statut             |
| ------------------------- | ---------------------------------------------------- | ------------------ |
| Framework full-stack      | Nuxt 4.4                                             | ✅ Validé          |
| Frontend UI               | @nuxt/ui v4 + Tailwind 4.3                           | ✅ Validé          |
| ORM                       | Prisma 7.8                                           | ✅ Validé (v3)     |
| DB                        | Supabase Pro eu-west-3                               | À valider (région) |
| Auth                      | Supabase Auth + Magic link + GitHub OAuth + 2FA TOTP | ✅ Validé          |
| Hébergement front         | Vercel                                               | À valider          |
| Queue                     | Inngest                                              | ✅ Validé          |
| Cache/Rate limit          | Upstash Redis                                        | ✅ Validé          |
| Email                     | Resend                                               | À valider          |
| Analytics                 | Plausible                                            | À valider          |
| Tests                     | Vitest 4.1 + Playwright 1.59                         | ✅ Validé          |
| Composants                | Storybook 10 + Chromatic                             | ✅ Validé          |
| Monitoring                | Sentry 10.53                                         | ✅ Validé          |
| Versionning               | semver + changesets + conventional commits           | ✅ Validé          |
| Provider LLM (EP-21 v1.1) | Claude Haiku via API Anthropic                       | À valider          |

---

## 18. Roadmap technique post-MVP

**v1.0 (après pilote validé)** : capstone, portfolio public, cert PDF, multi-formateurs, badges complets.

**v1.1** : 2FA WebAuthn/Passkeys, import roadmap.sh, runners GH Actions self-hosted si latence, AI Assist (EP-21).

**v1.2** : Admin UI, reporting CSV avancé, branding personnalisable, intégration calendar OAuth, PWA + offline lite (EP-24), Premium reporting (EP-23).

**v2.0** : Multi-tenant (organisations isolées), IA générative pour exercices personnalisés, peer-review entre stagiaires, marketplace de cursus.

---

## Sources versions

- [Prisma Changelog & releases](https://releases.sh/prisma/prisma-changelog) — v7.8.0 (avril 2026)
- [Nuxt releases (npm)](https://www.npmjs.com/package/nuxt) — v4.4.5
- [Nuxt UI releases](https://ui.nuxt.com/releases) — v4.8.0
- [Tailwind CSS](https://tailwindcss.com/blog) — v4.3
- [Vitest releases](https://github.com/vitest-dev/vitest/releases) — v4.1.7
- [Sentry for Nuxt](https://www.npmjs.com/package/@sentry/nuxt) — v10.53+
- [Storybook](https://storybook.js.org/docs/releases) — v10
- [Supabase + Prisma docs](https://supabase.com/docs/guides/database/prisma)
