// Vitest setup — chargé via vitest.config.ts → test.setupFiles.
// Fixtures globales, mocks, env de test.
import { afterEach, beforeEach, vi } from 'vitest';

// Mock console pour silence pendant les tests (sauf error/warn qui restent visibles).
// IMPORTANT : on (ré)installe les spies dans `beforeEach`, pas `beforeAll`, car
// le `afterEach` ci-dessous appelle `restoreAllMocks()` qui les retirerait après
// le 1er test — laissant le bruit console réapparaître pour les suivants.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// Env de test minimal
process.env['NODE_ENV'] = 'test';
process.env['NUXT_PUBLIC_ENVIRONMENT'] ??= 'development';
process.env['NUXT_PUBLIC_SITE_URL'] ??= 'http://localhost:3000';
process.env['NUXT_PUBLIC_SUPABASE_URL'] ??= 'http://localhost:54321';
process.env['NUXT_PUBLIC_SUPABASE_ANON_KEY'] ??= 'test-anon-key';
process.env['SUPABASE_SERVICE_ROLE_KEY'] ??= 'test-service-role-key';
process.env['DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/cursus_test';
process.env['DIRECT_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/cursus_test';
process.env['INVITATION_JWT_SECRET'] ??= 'test-invitation-jwt-secret-at-least-32-chars!!';
