/**
 * useAlerts — composable pour la gestion des alertes côté formateur.
 *
 * Fournit :
 *  - alerts           : liste paginée courante
 *  - meta             : métadonnées pagination
 *  - filters          : état des filtres (kind, status, search, page)
 *  - isLoading        : état de chargement
 *  - error            : message d'erreur éventuel
 *  - fetch()          : (re)charger depuis l'API
 *  - resolve()        : marquer une alerte comme résolue
 *  - setFilter()      : modifier un filtre (réinitialise page à 1)
 *  - setPage()        : naviguer entre pages
 *
 * ST-08.3 — TT-08.3.1
 */

import type { AlertKind, AlertSeverity } from '@prisma/client';

export interface AlertUser {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface AlertItem {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  context: Record<string, unknown> | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  sourceType: string | null;
  sourceId: string | null;
  user: AlertUser;
  resolvedBy: { id: string; fullName: string | null } | null;
}

export type AlertKindFilter = 'all' | AlertKind;
export type AlertStatusFilter = 'open' | 'resolved';

export interface AlertFilters {
  kind: AlertKindFilter;
  status: AlertStatusFilter;
  search: string;
  page: number;
}

interface AlertsResponse {
  data: AlertItem[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export function useAlerts() {
  const alerts = ref<AlertItem[]>([]);
  const meta = ref<AlertsResponse['meta']>({
    total: 0,
    page: 1,
    perPage: 20,
    totalPages: 0,
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const filters = reactive<AlertFilters>({
    kind: 'all',
    status: 'open',
    search: '',
    page: 1,
  });

  async function fetch() {
    isLoading.value = true;
    error.value = null;
    try {
      const query: Record<string, string | number> = {
        kind: filters.kind,
        status: filters.status,
        page: filters.page,
      };
      if (filters.search) {
        query['search'] = filters.search;
      }

      const res = await $fetch<AlertsResponse>('/api/me/alerts', { query });
      alerts.value = res.data;
      meta.value = res.meta;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement des alertes';
      error.value = message;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Marque une alerte comme résolue (optimistic update).
   */
  async function resolve(id: string) {
    const index = alerts.value.findIndex((a) => a.id === id);
    if (index === -1) {
      return;
    }

    const prev = alerts.value[index];
    if (!prev || prev.resolvedAt !== null) {
      return;
    }

    // Optimistic update
    const now = new Date().toISOString();
    alerts.value[index] = { ...prev, resolvedAt: now };

    // Si le filtre courant est "open", on retire l'alerte de la liste
    if (filters.status === 'open') {
      alerts.value = alerts.value.filter((a) => a.id !== id);
      meta.value = { ...meta.value, total: Math.max(0, meta.value.total - 1) };
    }

    try {
      await $fetch(`/api/alerts/${id}/resolve`, { method: 'PATCH' });
    } catch {
      // Rollback
      if (filters.status === 'open') {
        await fetch();
      } else {
        if (prev) {
          alerts.value[index] = prev;
        }
      }
    }
  }

  /**
   * Modifie un filtre et réinitialise la page à 1.
   */
  function setFilter<K extends keyof Omit<AlertFilters, 'page'>>(key: K, value: AlertFilters[K]) {
    filters[key] = value;
    filters.page = 1;
  }

  /**
   * Navigue à une page spécifique.
   */
  function setPage(page: number) {
    filters.page = page;
  }

  return {
    alerts: readonly(alerts),
    meta: readonly(meta),
    filters: readonly(filters),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetch,
    resolve,
    setFilter,
    setPage,
  };
}
