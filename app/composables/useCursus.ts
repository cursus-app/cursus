/**
 * Composable de gestion des cursus — toutes les opérations CRUD passent ici.
 * Cf. ST-03.1 — CRUD cursus avec brouillon/publié/archivé.
 */
import type {
  CreateCursusInput,
  UpdateCursusInput,
  ListCursusQuery,
  ImportRoadmapInput,
} from '~~/shared/schemas/cursus';

export interface CursusListItem {
  id: string;
  title: string;
  slug: string;
  domain: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationWeeks: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  ownerId: string;
  createdAt: string;
  _count: { modules: number };
}

export interface CursusVersion {
  id: string;
  version: number;
  publishedAt: string;
}

export interface CursusFull {
  id: string;
  title: string;
  slug: string;
  domain: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationWeeks: number;
  description: string | null;
  prerequisites: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count: { modules: number; versions: number };
  versions: CursusVersion[];
}

export interface CursusListResponse {
  data: CursusListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface RoadmapCatalogEntry {
  id: string;
  title: string;
  category: string;
  sourceUrl: string;
  conceptCount: number;
}

export interface ImportRoadmapResult {
  created: number;
  deleted: number;
  roadmapTitle: string;
  sourceUrl: string | undefined;
  attribution: string;
}

export function useCursus() {
  const { t } = useT();
  const { track } = useAnalytics();
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function listCursus(query?: Partial<ListCursusQuery>): Promise<CursusListResponse> {
    loading.value = true;
    error.value = null;
    try {
      const cleanQuery = query
        ? (Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined)) as Record<
            string,
            string | number
          >)
        : null;
      return await $fetch<CursusListResponse>('/api/cursus', {
        ...(cleanQuery ? { query: cleanQuery } : {}),
      });
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getCursus(id: string): Promise<CursusFull> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<CursusFull>(`/api/cursus/${id}`);
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createCursus(data: CreateCursusInput): Promise<CursusFull> {
    loading.value = true;
    error.value = null;
    try {
      const cursus = await $fetch<CursusFull>('/api/cursus', {
        method: 'POST',
        body: data,
      });
      track('cursus_created', { domain: data.domain, level: data.level });
      return cursus;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateCursus(id: string, data: UpdateCursusInput): Promise<CursusFull> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<CursusFull>(`/api/cursus/${id}`, {
        method: 'PATCH',
        body: data,
      });
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCursus(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await $fetch(`/api/cursus/${id}`, { method: 'DELETE' });
      track('cursus_deleted');
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function publishCursus(id: string): Promise<CursusFull> {
    loading.value = true;
    error.value = null;
    try {
      const cursus = await $fetch<CursusFull>(`/api/cursus/${id}/publish`, { method: 'POST' });
      track('cursus_published');
      return cursus;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function archiveCursus(id: string): Promise<CursusFull> {
    loading.value = true;
    error.value = null;
    try {
      const cursus = await $fetch<CursusFull>(`/api/cursus/${id}/archive`, { method: 'POST' });
      track('cursus_archived');
      return cursus;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function cloneCursus(id: string): Promise<CursusFull> {
    loading.value = true;
    error.value = null;
    try {
      const cursus = await $fetch<CursusFull>(`/api/cursus/${id}/clone`, { method: 'POST' });
      track('cursus_cloned');
      return cursus;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getRoadmapCatalog(): Promise<RoadmapCatalogEntry[]> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<RoadmapCatalogEntry[]>('/api/cursus/import-roadmap/catalog');
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function importRoadmap(
    cursusId: string,
    data: ImportRoadmapInput,
  ): Promise<ImportRoadmapResult> {
    loading.value = true;
    error.value = null;
    try {
      const result = await $fetch<ImportRoadmapResult>(
        `/api/cursus/${cursusId}/import-roadmap`,
        { method: 'POST', body: data },
      );
      track('cursus_roadmap_imported', {
        ...(data.roadmapId !== undefined ? { roadmapId: data.roadmapId } : {}),
        created: result.created,
        mode: data.mode,
      });
      return result;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    listCursus,
    getCursus,
    createCursus,
    updateCursus,
    deleteCursus,
    publishCursus,
    archiveCursus,
    cloneCursus,
    getRoadmapCatalog,
    importRoadmap,
  };
}
