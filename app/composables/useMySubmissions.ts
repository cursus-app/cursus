/**
 * useMySubmissions — composable SSR-compatible pour la page /mon-parcours.
 *
 * Fournit :
 *  - submissions : liste des soumissions de la page courante
 *  - meta        : pagination { total, page, perPage, totalPages }
 *  - isLoading   : état de chargement
 *  - error       : message d'erreur éventuel
 *  - filter      : filtre actif
 *  - setFilter() : changer le filtre et recharger
 *  - setPage()   : aller à une page
 *  - refresh()   : recharger sans changer les paramètres
 *
 * ST-05.4
 */

export type SubmissionStatusFilter =
  | 'all'
  | 'PENDING'
  | 'RUNNING'
  | 'VALIDATED'
  | 'VALIDATED_OVERRIDE'
  | 'FAILED'
  | 'TIMEOUT'
  | 'BLOCKED';

export interface HarnessRunSummary {
  id: string;
  status: string;
  githubWorkflowUrl: string | null;
  checksJson: unknown;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface SubmissionItem {
  id: string;
  status: string;
  repoUrl: string;
  deployUrl: string | null;
  attemptNumber: number;
  submittedAt: string;
  validatedAt: string | null;
  module: {
    id: string;
    title: string;
    week: number;
  };
  latestHarnessRun: HarnessRunSummary | null;
}

interface SubmissionsMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface SubmissionsResponse {
  data: SubmissionItem[];
  meta: SubmissionsMeta;
}

export function useMySubmissions() {
  const submissions = ref<SubmissionItem[]>([]);
  const meta = ref<SubmissionsMeta>({ total: 0, page: 1, perPage: 20, totalPages: 0 });
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const filter = ref<SubmissionStatusFilter>('all');
  const currentPage = ref(1);

  async function fetch() {
    isLoading.value = true;
    error.value = null;
    try {
      const query: Record<string, string> = {
        status: filter.value,
        page: String(currentPage.value),
      };

      const res = await $fetch<SubmissionsResponse>('/api/me/submissions', { query });
      submissions.value = res.data;
      meta.value = res.meta;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur de chargement des soumissions';
      error.value = message;
    } finally {
      isLoading.value = false;
    }
  }

  function setFilter(newFilter: SubmissionStatusFilter) {
    filter.value = newFilter;
    currentPage.value = 1;
    void fetch();
  }

  function setPage(page: number) {
    currentPage.value = page;
    void fetch();
  }

  function refresh() {
    void fetch();
  }

  return {
    submissions: readonly(submissions),
    meta: readonly(meta),
    isLoading: readonly(isLoading),
    error: readonly(error),
    filter: readonly(filter),
    currentPage: readonly(currentPage),
    setFilter,
    setPage,
    refresh,
    fetch,
  };
}
