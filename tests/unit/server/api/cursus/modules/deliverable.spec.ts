// @vitest-environment node
//
// Tests unitaires pour la gestion des specs de livrable dans le PATCH module
// endpoint (ST-03.4). Couvre la validation Zod des checks et le stockage JSONB.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deliverableSpecSchema } from '~~/shared/schemas/module';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCursusFindUnique = vi.fn();
const mockModuleFindUnique = vi.fn();
const mockModuleUpdate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: { findUnique: mockCursusFindUnique },
    module: {
      findUnique: mockModuleFindUnique,
      update: mockModuleUpdate,
    },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

// Nitro/H3 globals
const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties added for tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CURSUS_ID = 'cursus-uuid-001';
const MODULE_ID = 'module-uuid-001';
const FORMATEUR = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const VALID_DELIVERABLE_SPEC = {
  description: 'Créer une page de connexion complète.',
  repoRequired: true,
  deployRequired: false,
  checks: [
    { type: 'branches', enabled: true, params: { branches: ['main', 'feature/login'] } },
    { type: 'readme_present', enabled: true, params: {} },
    { type: 'tests_pass', enabled: true, params: {} },
  ],
};

const importHandler = () => import('~~/server/api/cursus/[id]/modules/[moduleId].patch');

// ─── Setup commune ────────────────────────────────────────────────────────────

function setupAuthAndCursus(): void {
  mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR.id });
  mockUserFindUnique.mockResolvedValue(FORMATEUR);
  mockModuleFindUnique.mockResolvedValue({
    id: MODULE_ID,
    cursusId: CURSUS_ID,
    cursus: { ownerId: FORMATEUR.id, status: 'DRAFT' },
  });

  mockGetRouterParam.mockImplementation((_event: unknown, param: string) => {
    if (param === 'id') {
      return CURSUS_ID;
    }
    if (param === 'moduleId') {
      return MODULE_ID;
    }
    return null;
  });
}

// ─── Tests — authentification ──────────────────────────────────────────────────

describe('PATCH module — deliverable spec — authentification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockImplementation((_event: unknown, param: string) => {
      if (param === 'id') {
        return CURSUS_ID;
      }
      if (param === 'moduleId') {
        return MODULE_ID;
      }
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 404 when module does not belong to requested cursus', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockModuleFindUnique.mockResolvedValue({
      id: MODULE_ID,
      cursusId: 'other-cursus-id',
      cursus: { ownerId: FORMATEUR.id, status: 'DRAFT' },
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when module not found', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockModuleFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── Tests — autorisation ──────────────────────────────────────────────────────

describe('PATCH module — deliverable spec — autorisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupAuthAndCursus();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 403 when user is not owner or admin', async () => {
    const otherUser = { id: 'other-user', globalRole: 'STAGIAIRE' };
    mockServerSupabaseUser.mockResolvedValue({ id: otherUser.id });
    mockUserFindUnique.mockResolvedValue(otherUser);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to update any module', async () => {
    const admin = { id: 'admin-uuid', globalRole: 'ADMIN' };
    mockServerSupabaseUser.mockResolvedValue({ id: admin.id });
    mockUserFindUnique.mockResolvedValue(admin);
    mockReadValidatedBody.mockResolvedValue({
      deliverableSpecJson: VALID_DELIVERABLE_SPEC,
    });
    mockModuleUpdate.mockResolvedValue({
      id: MODULE_ID,
      deliverableSpecJson: VALID_DELIVERABLE_SPEC,
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: MODULE_ID });
  });

  it('throws 422 when cursus is not DRAFT', async () => {
    mockModuleFindUnique.mockResolvedValue({
      id: MODULE_ID,
      cursusId: CURSUS_ID,
      cursus: { ownerId: FORMATEUR.id, status: 'PUBLISHED' },
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });
});

// ─── Tests — sauvegarde deliverable spec ──────────────────────────────────────

describe('PATCH module — deliverable spec — sauvegarde', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupAuthAndCursus();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persiste la deliverableSpecJson avec les checks', async () => {
    mockReadValidatedBody.mockResolvedValue({
      deliverableSpecJson: VALID_DELIVERABLE_SPEC,
    });
    mockModuleUpdate.mockResolvedValue({
      id: MODULE_ID,
      cursusId: CURSUS_ID,
      week: 1,
      deliverableSpecJson: VALID_DELIVERABLE_SPEC,
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockModuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliverableSpecJson: VALID_DELIVERABLE_SPEC,
        }),
      }),
    );
  });

  it('accepte une spec avec 0 checks (aucun check actif)', async () => {
    const emptySpec = {
      description: 'Livrable sans checks.',
      repoRequired: true,
      deployRequired: false,
      checks: [],
    };
    mockReadValidatedBody.mockResolvedValue({ deliverableSpecJson: emptySpec });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, deliverableSpecJson: emptySpec });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: MODULE_ID });
  });

  it('retourne le module mis à jour', async () => {
    const updatedModule = {
      id: MODULE_ID,
      cursusId: CURSUS_ID,
      week: 1,
      title: 'Semaine 1',
      deliverableSpecJson: VALID_DELIVERABLE_SPEC,
    };
    mockReadValidatedBody.mockResolvedValue({
      deliverableSpecJson: VALID_DELIVERABLE_SPEC,
    });
    mockModuleUpdate.mockResolvedValue(updatedModule);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toEqual(updatedModule);
  });
});

// ─── Tests — validation Zod des checks ───────────────────────────────────────

describe('deliverableSpecSchema — validation checks dans updateModuleSchema', () => {
  // Ces tests valident directement le schéma Zod (symétrique client/serveur)
  // pour s'assurer que les checks invalides sont rejetés.
  it('valide branches check avec branches valides', () => {
    const r = deliverableSpecSchema.safeParse({
      checks: [{ type: 'branches', enabled: true, params: { branches: ['main', 'develop'] } }],
    });
    expect(r.success).toBe(true);
  });

  it('rejette branches check avec branches vides', () => {
    const r = deliverableSpecSchema.safeParse({
      checks: [{ type: 'branches', enabled: true, params: { branches: [] } }],
    });
    expect(r.success).toBe(false);
  });

  it('rejette lighthouse_score avec score > 100', () => {
    const r = deliverableSpecSchema.safeParse({
      checks: [
        {
          type: 'lighthouse_score',
          enabled: true,
          params: { minScore: 150, categories: ['performance'] },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('rejette un check de type inconnu', () => {
    const r = deliverableSpecSchema.safeParse({
      checks: [{ type: 'custom_script', enabled: true, params: {} }],
    });
    expect(r.success).toBe(false);
  });

  it('rejette une spec avec plus de 15 checks', () => {
    const checks = Array.from({ length: 16 }, () => ({
      type: 'linter_pass' as const,
      enabled: true,
      params: {},
    }));
    const r = deliverableSpecSchema.safeParse({ checks });
    expect(r.success).toBe(false);
  });
});
