// Validation Zod des variables d'environnement au boot.
// Cf. 09-engineering-playbook §3.2 (Zod aux frontières).
//
// Importer `env` depuis ce fichier garantit que toutes les vars critiques
// sont présentes ET typées. En cas d'absence, on throw au boot — fail-fast.
import { z } from 'zod';

const EnvSchema = z.object({
  // --- Runtime ----------------------------------------------------------------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // --- Database (Supabase via Prisma) -----------------------------------------
  DATABASE_URL: z.string().url().min(1),
  DIRECT_URL: z.string().url().min(1),
  SHADOW_URL: z.string().url().optional(),

  // --- Supabase (client JS pour Auth / Storage / Realtime) --------------------
  NUXT_PUBLIC_SUPABASE_URL: z.string().url().min(1),
  NUXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // --- App --------------------------------------------------------------------
  NUXT_PUBLIC_SITE_URL: z.string().url().min(1),
  NUXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'preview', 'production']).default('development'),

  // --- Email (Resend) ---------------------------------------------------------
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // --- Cache & rate limiting (Upstash) ----------------------------------------
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // --- Queue async (Inngest) --------------------------------------------------
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // --- GitHub App (harness) ---------------------------------------------------
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),

  // --- Invitations (JWT signé HS256) -----------------------------------------
  // Minimum 32 caractères. Générer : openssl rand -base64 32
  INVITATION_JWT_SECRET: z.string().min(32).optional(),

  // --- Certificate signing (Ed25519, base64) ----------------------------------
  CERTIFICATE_SIGNING_KEY: z.string().optional(),

  // --- Observabilité ----------------------------------------------------------
  NUXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NUXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),

  // --- Alertes opérationnelles ------------------------------------------------
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  ALERT_EMAIL: z.string().email().optional(), // alias ops@cursus.app

  // --- Logging ----------------------------------------------------------------
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

/**
 * Récupère les env vars validées. Throw au premier appel si invalide.
 * À utiliser exclusivement côté server (Nitro) — pas exposé client.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    // Pas de console.log direct — mais ici c'est un fail-fast au boot,
    // logger Pino n'est peut-être pas encore initialisé.

    console.error('Invalid environment variables:', JSON.stringify(formatted, null, 2));
    throw new Error('Invalid environment variables. See output above. Cf. .env.example');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Alias direct (lazy via Proxy). */
export const env = new Proxy({} as Env, {
  get(_, key: string) {
    return getEnv()[key as keyof Env];
  },
});
