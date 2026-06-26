/**
 * Composable de gestion des modules d'un cursus.
 * Cf. ST-03.2 — Édition modules avec drag-and-drop.
 *
 * Gère le CRUD des modules et l'auto-save débounce (1 s).
 */
import type { ComputedRef } from 'vue';
import type { ModuleInput, UpdateModuleInput } from '~~/shared/schemas/module';

export interface ModuleResource {
  label: string;
  url: string;
}

export interface DeliverableSpec {
  description: string;
  repoRequired: boolean;
  deployRequired: boolean;
}

export interface ModuleItem {
  id: string;
  cursusId: string;
  week: number;
  title: string;
  objectives: string;
  resourcesJson: ModuleResource[];
  deliverableSpecJson: DeliverableSpec;
  xpReward: number;
  createdAt: string;
  updatedAt: string;
}

export function useModules(cursusId: ComputedRef<string>) {
  const { t } = useT();

  const modules = ref<ModuleItem[]>([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isDirty = ref(false);
  const saveError = ref<string | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  async function fetchModules(): Promise<void> {
    if (!cursusId.value) {
      return;
    }
    isLoading.value = true;
    saveError.value = null;
    try {
      const data = await $fetch<ModuleItem[]>(`/api/cursus/${cursusId.value}/modules`);
      modules.value = data;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      saveError.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // ─── Create ───────────────────────────────────────────────────────────────────

  async function createModule(data?: Partial<ModuleInput>): Promise<ModuleItem> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const module = await $fetch<ModuleItem>(`/api/cursus/${cursusId.value}/modules`, {
        method: 'POST',
        body: data ?? { title: t('modules.defaultTitle') },
      });
      modules.value = [...modules.value, module];
      return module;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      saveError.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  async function updateModule(id: string, data: UpdateModuleInput): Promise<ModuleItem> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const updated = await $fetch<ModuleItem>(`/api/cursus/${cursusId.value}/modules/${id}`, {
        method: 'PATCH',
        body: data,
      });
      modules.value = modules.value.map((m) => (m.id === id ? updated : m));
      isDirty.value = false;
      return updated;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      saveError.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  async function deleteModule(id: string): Promise<void> {
    isSaving.value = true;
    saveError.value = null;
    try {
      // Nuxt route type inference narrows the method for this URL pattern;
      // we cast to string to bypass route-specific method restriction.
      const url: string = `/api/cursus/${cursusId.value}/modules/${id}`;
      await $fetch(url, { method: 'DELETE' });
      modules.value = modules.value.filter((m) => m.id !== id);
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      saveError.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  // ─── Reorder ──────────────────────────────────────────────────────────────────

  async function reorderModules(orderedModules: { id: string; week: number }[]): Promise<void> {
    isSaving.value = true;
    saveError.value = null;
    try {
      const updated = await $fetch<ModuleItem[]>(`/api/cursus/${cursusId.value}/modules/order`, {
        method: 'PATCH',
        body: { modules: orderedModules },
      });
      modules.value = updated;
      isDirty.value = false;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      saveError.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  // ─── Auto-save (debounce 1s) ─────────────────────────────────────────────────

  const autosave = useDebounceFn(async (id: string, data: UpdateModuleInput): Promise<void> => {
    await updateModule(id, data);
  }, 1_000);

  function markDirty(): void {
    isDirty.value = true;
  }

  // ─── beforeunload guard ───────────────────────────────────────────────────────

  if (import.meta.client) {
    window.addEventListener('beforeunload', (e) => {
      if (isDirty.value) {
        e.preventDefault();
      }
    });
  }

  return {
    modules,
    isLoading,
    isSaving,
    isDirty,
    saveError,
    fetchModules,
    createModule,
    updateModule,
    deleteModule,
    reorderModules,
    autosave,
    markDirty,
  };
}
