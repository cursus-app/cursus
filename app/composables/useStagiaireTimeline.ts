/**
 * useStagiaireTimeline — composable Vue 3 pour la timeline paginée d'un stagiaire.
 *
 * Gère le fetching, la pagination cursor-based, et les filtres par type d'événement.
 * Utilisé par la page fiche stagiaire 360 (ST-13.3).
 */
import type { Ref } from 'vue';
import type { TimelineEvent, TimelineEventType, TimelineResponse } from '~~/shared/types/timeline';

export function useStagiaireTimeline(stagiaireId: Ref<string>, cohorteId: Ref<string>) {
  const events = ref<TimelineEvent[]>([]);
  const nextCursor = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const activeFilters = ref<TimelineEventType[]>([]);

  /**
   * Construit la query string à partir des filtres actifs et du cursor.
   */
  function buildQuery(cursor?: string): Record<string, string> {
    const params: Record<string, string> = {
      cohorteId: cohorteId.value,
    };
    if (cursor) {
      params['cursor'] = cursor;
    }
    if (activeFilters.value.length > 0) {
      params['type'] = activeFilters.value.join(',');
    }
    return params;
  }

  /**
   * Charge la première page (ou recharge après changement de filtres).
   * Réinitialise les événements existants.
   */
  async function fetchPage(cursor?: string): Promise<void> {
    if (!stagiaireId.value || !cohorteId.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await $fetch<TimelineResponse>(`/api/stagiaires/${stagiaireId.value}/timeline`, {
        query: buildQuery(cursor),
      });

      if (cursor) {
        // Append pour le "load more"
        events.value = [...events.value, ...data.events];
      } else {
        // Première page ou rechargement
        events.value = data.events;
      }
      nextCursor.value = data.nextCursor;
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err : new Error('Erreur lors du chargement de la timeline');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Charge la page suivante si elle existe.
   */
  async function loadMore(): Promise<void> {
    if (!nextCursor.value || loading.value) {
      return;
    }
    await fetchPage(nextCursor.value);
  }

  /**
   * Réinitialise les filtres et recharge depuis le début.
   */
  function resetFilters(): void {
    activeFilters.value = [];
    void fetchPage();
  }

  // Recharger automatiquement quand les filtres changent
  watch(activeFilters, () => {
    events.value = [];
    nextCursor.value = null;
    void fetchPage();
  });

  return {
    events,
    nextCursor,
    loading,
    error,
    activeFilters,
    fetchPage,
    loadMore,
    resetFilters,
  };
}
