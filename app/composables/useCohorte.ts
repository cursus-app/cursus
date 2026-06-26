/**
 * Composable de gestion des cohortes — toutes les opérations CRUD + transitions
 * de cycle de vie passent ici. Cf. ST-04.1 — CRUD cohorte avec cycle de vie.
 */
import type { CohorteCreateInput, CohorteUpdateInput } from '~~/shared/schemas/cohorte';

export type CohorteStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type CohorteRhythm = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
export type MembershipRole = 'STAGIAIRE' | 'FORMATEUR_PRINCIPAL' | 'CO_FORMATEUR';

export interface CohorteCursus {
  id: string;
  title: string;
  slug: string;
  domain?: string;
}

export interface CohorteCursusVersion {
  id: string;
  version: number;
  cursus: CohorteCursus;
}

export interface CohorteMember {
  id: string;
  role: MembershipRole;
  /** Pour les CO_FORMATEUR : null = accès global, string[] = limité aux modules listés. */
  moduleIds: string[] | null;
  joinedAt: string;
  leftAt: string | null;
  user: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    githubHandle: string | null;
  };
}

export interface CohorteListItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  rhythm: CohorteRhythm;
  status: CohorteStatus;
  createdAt: string;
  cursusVersion: CohorteCursusVersion;
  _count: { memberships: number };
}

export interface CohorteFull {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  rhythm: CohorteRhythm;
  status: CohorteStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  cursusVersion: CohorteCursusVersion;
  memberships: CohorteMember[];
  _count: { memberships: number };
}

export interface CohorteListResponse {
  data: CohorteListItem[];
  total: number;
  page: number;
  limit: number;
}

export function useCohorte() {
  const { t } = useT();
  const { track } = useAnalytics();
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function listCohortes(query?: {
    status?: CohorteStatus;
    page?: number;
    limit?: number;
  }): Promise<CohorteListResponse> {
    loading.value = true;
    error.value = null;
    try {
      const cleanQuery = query
        ? (Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined)) as Record<
            string,
            string | number
          >)
        : null;
      return await $fetch<CohorteListResponse>('/api/cohortes', {
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

  async function getCohorte(id: string): Promise<CohorteFull> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<CohorteFull>(`/api/cohortes/${id}`);
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createCohorte(data: CohorteCreateInput): Promise<CohorteFull> {
    loading.value = true;
    error.value = null;
    try {
      const cohorte = await $fetch<CohorteFull>('/api/cohortes', {
        method: 'POST',
        body: data,
      });
      track('cohorte_created', { rhythm: data.rhythm });
      return cohorte;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateCohorte(id: string, data: CohorteUpdateInput): Promise<CohorteFull> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<CohorteFull>(`/api/cohortes/${id}`, {
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

  async function deleteCohorte(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await $fetch(`/api/cohortes/${id}`, { method: 'DELETE' });
      track('cohorte_deleted');
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function startCohorte(id: string): Promise<CohorteFull> {
    loading.value = true;
    error.value = null;
    try {
      const cohorte = await $fetch<CohorteFull>(`/api/cohortes/${id}/start`, { method: 'POST' });
      track('cohorte_started');
      return cohorte;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function completeCohorte(id: string): Promise<CohorteFull> {
    loading.value = true;
    error.value = null;
    try {
      const cohorte = await $fetch<CohorteFull>(`/api/cohortes/${id}/complete`, { method: 'POST' });
      track('cohorte_completed');
      return cohorte;
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function archiveCohorte(id: string): Promise<CohorteFull> {
    loading.value = true;
    error.value = null;
    try {
      const cohorte = await $fetch<CohorteFull>(`/api/cohortes/${id}/archive`, { method: 'POST' });
      track('cohorte_archived');
      return cohorte;
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
    listCohortes,
    getCohorte,
    createCohorte,
    updateCohorte,
    deleteCohorte,
    startCohorte,
    completeCohorte,
    archiveCohorte,
  };
}
