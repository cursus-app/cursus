// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Jeu minimal de variables requises par le schéma Zod (cf. server/utils/env.ts).
const REQUIRED = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  DIRECT_URL: 'postgresql://u:p@localhost:5432/db',
  NUXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NUXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  NUXT_PUBLIC_SITE_URL: 'http://localhost:3000',
} as const;

describe('server/utils/env', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Module rechargé à chaque test → le cache `cachedEnv` repart de zéro.
    vi.resetModules();
    process.env = { NODE_ENV: 'test', ...REQUIRED };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it('parse les vars et applique les valeurs par défaut', async () => {
    const { getEnv } = await import('~~/server/utils/env');
    const env = getEnv();
    expect(env.DATABASE_URL).toBe(REQUIRED.DATABASE_URL);
    expect(env.NODE_ENV).toBe('test');
    expect(env.LOG_LEVEL).toBe('info'); // défaut
    expect(env.NUXT_PUBLIC_ENVIRONMENT).toBe('development'); // défaut
  });

  it('met en cache : deux appels renvoient la même référence', async () => {
    const { getEnv } = await import('~~/server/utils/env');
    expect(getEnv()).toBe(getEnv());
  });

  it('throw (fail-fast) quand une variable requise manque', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    delete process.env['DATABASE_URL'];
    const { getEnv } = await import('~~/server/utils/env');
    expect(() => getEnv()).toThrowError(/Invalid environment variables/);
  });

  it('throw quand une URL est mal formée', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env['NUXT_PUBLIC_SITE_URL'] = 'pas-une-url';
    const { getEnv } = await import('~~/server/utils/env');
    expect(() => getEnv()).toThrow();
  });

  it('le Proxy `env` expose les valeurs validées (accès paresseux)', async () => {
    const { env } = await import('~~/server/utils/env');
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe(REQUIRED.SUPABASE_SERVICE_ROLE_KEY);
    expect(env.NUXT_PUBLIC_SITE_URL).toBe(REQUIRED.NUXT_PUBLIC_SITE_URL);
  });
});
