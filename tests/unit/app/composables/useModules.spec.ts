// @vitest-environment happy-dom
//
// Tests unitaires pour le composable useModules (ST-03.2).
// Stratégie : mock $fetch global, mock useT et useDebounceFn auto-imports.

import { computed } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

// ─── Mocks auto-imports Nuxt ──────────────────────────────────────────────────

const mockT = vi.fn((key: string) => key);
mockNuxtImport('useT', () => () => ({
  t: mockT,
  locale: { value: 'fr' },
  setLocale: vi.fn(),
  locales: { value: [] },
}));

// useDebounceFn : retourne la fonction sans délai (synchrone en tests).
// NOTE : le factory ne doit pas référencer de variables externes (hoisting).
mockNuxtImport('useDebounceFn', () => {
  return (fn: (...args: unknown[]) => unknown) => fn;
});

// ─── Mock $fetch global ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ─── Données de test ──────────────────────────────────────────────────────────

const CURSUS_ID = '11111111-1111-1111-1111-111111111111';
const MODULE_ID = '22222222-2222-2222-2222-222222222222';

const SAMPLE_MODULE = {
  id: MODULE_ID,
  cursusId: CURSUS_ID,
  week: 1,
  title: 'Introduction',
  objectives: 'Apprendre les bases',
  resourcesJson: [],
  deliverableSpecJson: { description: '', repoRequired: true, deployRequired: false },
  xpReward: 100,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useModules — fetchModules()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches modules and sets the reactive array', async () => {
    mockFetch.mockResolvedValue([SAMPLE_MODULE]);

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { modules, fetchModules, isLoading } = useModules(cursusId);

    expect(isLoading.value).toBe(false);
    await fetchModules();

    expect(mockFetch).toHaveBeenCalledWith(`/api/cursus/${CURSUS_ID}/modules`);
    expect(modules.value).toHaveLength(1);
    expect(modules.value[0]?.id).toBe(MODULE_ID);
    expect(isLoading.value).toBe(false);
  });

  it('sets saveError when fetch fails', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cursus.errors.notFound' } });

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { saveError, fetchModules } = useModules(cursusId);

    await expect(fetchModules()).rejects.toBeDefined();
    expect(saveError.value).toBe('cursus.errors.notFound');
  });

  it('does nothing when cursusId is empty', async () => {
    const cursusId = computed(() => '');
    const { useModules } = await import('~/composables/useModules');
    const { modules, fetchModules } = useModules(cursusId);

    await fetchModules();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(modules.value).toHaveLength(0);
  });
});

describe('useModules — createModule()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a module and appends it to the list', async () => {
    const newModule = { ...SAMPLE_MODULE, id: '33333333-3333-3333-3333-333333333333', week: 2 };
    mockFetch.mockResolvedValue(newModule);

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { modules, createModule } = useModules(cursusId);

    const created = await createModule({ title: 'Module 2' });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/cursus/${CURSUS_ID}/modules`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(created.id).toBe(newModule.id);
    expect(modules.value).toHaveLength(1);
    expect(modules.value[0]?.id).toBe(newModule.id);
  });

  it('sets isSaving to false after creation', async () => {
    mockFetch.mockResolvedValue(SAMPLE_MODULE);

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { isSaving, createModule } = useModules(cursusId);

    await createModule({ title: 'Test' });
    expect(isSaving.value).toBe(false);
  });

  it('throws and sets saveError when creation fails', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'modules.errors.weekTaken' } });

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { saveError, createModule } = useModules(cursusId);

    await expect(createModule({ title: 'Test' })).rejects.toBeDefined();
    expect(saveError.value).toBe('modules.errors.weekTaken');
  });
});

describe('useModules — updateModule()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a module in place', async () => {
    const updated = { ...SAMPLE_MODULE, title: 'Titre mis à jour' };
    mockFetch
      .mockResolvedValueOnce([SAMPLE_MODULE]) // fetchModules
      .mockResolvedValueOnce(updated); // updateModule

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { modules, fetchModules, updateModule } = useModules(cursusId);

    await fetchModules();
    expect(modules.value[0]?.title).toBe('Introduction');

    await updateModule(MODULE_ID, { title: 'Titre mis à jour' });
    expect(modules.value[0]?.title).toBe('Titre mis à jour');
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/cursus/${CURSUS_ID}/modules/${MODULE_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('clears isDirty after successful update', async () => {
    const updated = { ...SAMPLE_MODULE, title: 'New' };
    mockFetch.mockResolvedValue(updated);

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { isDirty, markDirty, updateModule } = useModules(cursusId);

    markDirty();
    expect(isDirty.value).toBe(true);

    await updateModule(MODULE_ID, { title: 'New' });
    expect(isDirty.value).toBe(false);
  });
});

describe('useModules — deleteModule()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the module from the list', async () => {
    mockFetch
      .mockResolvedValueOnce([SAMPLE_MODULE]) // fetchModules
      .mockResolvedValueOnce(undefined); // deleteModule

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { modules, fetchModules, deleteModule } = useModules(cursusId);

    await fetchModules();
    expect(modules.value).toHaveLength(1);

    await deleteModule(MODULE_ID);
    expect(modules.value).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/modules/${MODULE_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('useModules — reorderModules()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the order endpoint and updates modules', async () => {
    const reordered = [{ ...SAMPLE_MODULE, week: 3 }];
    mockFetch.mockResolvedValue(reordered);

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { modules, reorderModules } = useModules(cursusId);

    await reorderModules([{ id: MODULE_ID, week: 3 }]);

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/cursus/${CURSUS_ID}/modules/order`,
      expect.objectContaining({
        method: 'PATCH',
        body: { modules: [{ id: MODULE_ID, week: 3 }] },
      }),
    );
    expect(modules.value[0]?.week).toBe(3);
  });

  it('clears isDirty after successful reorder', async () => {
    mockFetch.mockResolvedValue([SAMPLE_MODULE]);

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { isDirty, markDirty, reorderModules } = useModules(cursusId);

    markDirty();
    expect(isDirty.value).toBe(true);

    await reorderModules([{ id: MODULE_ID, week: 1 }]);
    expect(isDirty.value).toBe(false);
  });

  it('sets saveError when reorder fails', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'modules.errors.duplicateWeeks' } });

    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { saveError, reorderModules } = useModules(cursusId);

    await expect(reorderModules([{ id: MODULE_ID, week: 1 }])).rejects.toBeDefined();
    expect(saveError.value).toBe('modules.errors.duplicateWeeks');
  });
});

describe('useModules — markDirty() & isDirty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks isDirty as true', async () => {
    const cursusId = computed(() => CURSUS_ID);
    const { useModules } = await import('~/composables/useModules');
    const { isDirty, markDirty } = useModules(cursusId);

    expect(isDirty.value).toBe(false);
    markDirty();
    expect(isDirty.value).toBe(true);
  });
});
