// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2026-06-01',
  future: { compatibilityVersion: 4 },

  devtools: { enabled: true },

  srcDir: 'app/',
  serverDir: 'server/',

  modules: [
    // @nuxt/eslint génère `.nuxt/eslint.config.mjs` consommé par eslint.config.js.
    // Sans ce module, `pnpm lint` plante (module introuvable).
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
    '@nuxtjs/supabase',
    'nuxt-security',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@sentry/nuxt/module',
  ],

  // `~~` = rootDir. `assets/` vit à la racine (pas sous srcDir app/), donc on
  // utilise l'alias rootDir, sinon Nuxt cherche app/assets/css/main.css (absent).
  css: ['~~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false, // typecheck via `pnpm typecheck` (vue-tsc) en CI
    shim: false,
    // Options strictes additionnelles propagées dans TOUS les tsconfig générés
    // (.nuxt/tsconfig.{app,server,shared,node}.json). Le tsconfig racine n'étant
    // plus qu'un fichier de `references` (cf. tsconfig.json), ces options doivent
    // vivre ici pour s'appliquer à chaque contexte.
    tsConfig: {
      compilerOptions: {
        exactOptionalPropertyTypes: true,
        noPropertyAccessFromIndexSignature: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        allowUnusedLabels: false,
        allowUnreachableCode: false,
        useUnknownInCatchVariables: true,
      },
    },
  },

  experimental: {
    typedPages: true,
    payloadExtraction: true,
    asyncContext: true,
  },

  // i18n — FR par défaut (sans préfixe), EN avec préfixe /en/
  // Stratégie prefix_except_default : /cursus (FR), /en/cursus (EN)
  i18n: {
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    langDir: '../locales/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
    compilation: {
      strictMessage: false,
      escapeHtml: false,
    },
  },

  // Supabase — l'auth/storage/realtime continuent de passer par le client JS,
  // les requêtes data lourdes passent par Prisma côté server.
  supabase: {
    // Clés fournies explicitement depuis NOS noms d'env (cf. server/utils/env.ts)
    // pour éviter toute divergence avec les noms attendus par défaut du module.
    url: process.env['NUXT_PUBLIC_SUPABASE_URL'],
    key: process.env['NUXT_PUBLIC_SUPABASE_ANON_KEY'],
    serviceKey: process.env['SUPABASE_SERVICE_ROLE_KEY'],
    redirect: false, // on gère la redirection auth nous-mêmes
    // `~~` = rootDir : shared/ vit à la racine, pas sous app/.
    types: '~~/shared/types/supabase.ts',
  },

  // Security headers + CSP — cf. 09-engineering-playbook §6.1
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://*.sentry.io', 'https://plausible.io'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': [
          "'self'",
          'https://*.supabase.co',
          'wss://*.supabase.co',
          'https://*.sentry.io',
          'https://*.ingest.sentry.io',
          'https://plausible.io',
          'https://*.upstash.io',
        ],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
      },
      strictTransportSecurity: {
        maxAge: 63072000,
        includeSubdomains: true,
        preload: true,
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
    },
    corsHandler: {
      origin: process.env['NUXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
    rateLimiter: false, // on délègue à Upstash, voir server/middleware/rate-limit
  },

  // Web Vitals — trackés nativement via Sentry et PostHog au runtime
  // (le module @nuxtjs/web-vitals n'est pas encore compatible Nuxt 4)

  // Sentry — DSN runtime + source maps upload au build
  sentry: {
    sourceMapsUploadOptions: {
      org: process.env['SENTRY_ORG'],
      project: process.env['SENTRY_PROJECT'],
      authToken: process.env['SENTRY_AUTH_TOKEN'],
    },
  },

  image: {
    // Option @nuxt/image : `format` (singulier), pas `formats`.
    format: ['avif', 'webp'],
    quality: 80,
    densities: [1, 2],
  },

  // runtimeConfig : les secrets server-only sont lus ET validés via
  // server/utils/env.ts (process.env), pas via runtimeConfig — car Nuxt n'injecte
  // au runtime que les variables préfixées `NUXT_`. Mettre `databaseUrl: ''` ici
  // ne serait JAMAIS rempli par `DATABASE_URL` (seulement par `NUXT_DATABASE_URL`),
  // d'où la suppression du bloc privé trompeur. On n'expose que la config publique
  // (préfixe NUXT_PUBLIC_, auto-bindée par Nuxt).
  // La validation Zod fail-fast au boot est déclenchée par server/plugins/00.env.ts.
  runtimeConfig: {
    // exposé client (public)
    public: {
      siteUrl: '', // NUXT_PUBLIC_SITE_URL
      supabaseUrl: '', // NUXT_PUBLIC_SUPABASE_URL
      supabaseAnonKey: '', // NUXT_PUBLIC_SUPABASE_ANON_KEY
      sentryDsn: '', // NUXT_PUBLIC_SENTRY_DSN
      plausibleDomain: '', // NUXT_PUBLIC_PLAUSIBLE_DOMAIN
      environment: 'development', // NUXT_PUBLIC_ENVIRONMENT
    },
  },

  nitro: {
    experimental: { openAPI: true },
    // Les options strictes du projet doivent aussi être propagées au contexte
    // server (Nitro) : `typescript.tsConfig` (ci-dessus) ne couvre que l'app.
    typescript: {
      tsConfig: {
        compilerOptions: {
          exactOptionalPropertyTypes: true,
          noPropertyAccessFromIndexSignature: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: true,
          useUnknownInCatchVariables: true,
        },
      },
    },
    storage: {
      // Cache éphémère via Redis pour les jobs (OG scraping, etc.) — branché en v1.1
      cache: { driver: 'memory' },
    },
  },

  vite: {
    resolve: {
      alias: {
        '~~': fileURLToPath(new URL('./', import.meta.url)),
        '@@': fileURLToPath(new URL('./', import.meta.url)),
      },
    },
    // Pré-bundle des deps découvertes au runtime (évite des reloads en dev).
    optimizeDeps: {
      include: ['@unhead/schema-org/vue'],
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      titleTemplate: '%s — Cursus',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/branding/favicon.svg' }],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Cursus — gestion de parcours de stages tech' },
      ],
    },
  },
});
