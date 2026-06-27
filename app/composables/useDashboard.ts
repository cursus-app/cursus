/**
 * Composable useDashboard — données agrégées du dashboard stagiaire.
 *
 * Utilise $fetch pour être testable unitairement (même pattern que
 * useNotifications, useMySubmissions, etc.).
 *
 * Expose :
 *   - data      : DashboardData | null
 *   - isLoading : boolean
 *   - error     : string | null
 *   - fetch()   : chargement initial / revalidation
 *   - hasCurrentWeek : boolean
 *   - hasNoCohort    : boolean
 *
 * ST-13.1
 */

export interface DashboardBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
  awardedAt: string;
}

export interface DashboardFeedItem {
  type: 'VALIDATION' | 'BADGE';
  moduleTitle: string | null;
  badgeName: string | null;
  occurredAt: string;
}

export interface DashboardDeadline {
  cohortModuleId: string;
  moduleId: string;
  moduleTitle: string;
  dueDate: string;
  progressionStatus: string | null;
}

export interface DashboardData {
  currentWeek: {
    moduleId: string | null;
    moduleTitle: string | null;
    dueDate: string | null;
    status: string | null;
    hasSubmitted: boolean;
    cohortModuleId: string | null;
  };
  progress: {
    completedModules: number;
    totalModules: number;
    progressPct: number;
    xpTotal: number;
  };
  badges: {
    total: number;
    last3: DashboardBadge[];
  };
  feed: DashboardFeedItem[];
  upcomingDeadlines: DashboardDeadline[];
}

export function useDashboard() {
  const data = ref<DashboardData | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const loaded = ref(false);

  async function fetch() {
    isLoading.value = true;
    error.value = null;
    try {
      data.value = await $fetch<DashboardData>('/api/me/dashboard');
      loaded.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      isLoading.value = false;
    }
  }

  /** true si le module de la semaine courante est défini */
  const hasCurrentWeek = computed(() => !!data.value?.currentWeek.moduleId);

  /**
   * true quand les données sont chargées et que le stagiaire n'est
   * affecté à aucune cohorte (pas de module en cours, pas de total modules)
   */
  const hasNoCohort = computed(
    () =>
      loaded.value &&
      !isLoading.value &&
      !data.value?.currentWeek.moduleId &&
      !data.value?.progress.totalModules,
  );

  return {
    data,
    isLoading,
    error,
    fetch,
    hasCurrentWeek,
    hasNoCohort,
  };
}
