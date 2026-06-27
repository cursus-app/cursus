/**
 * Composable useDashboard — données agrégées du dashboard stagiaire.
 *
 * Compatible SSR (useAsyncData). Expose :
 *   - data      : DashboardData | null
 *   - status    : 'idle' | 'pending' | 'success' | 'error'
 *   - error     : Error | null
 *   - refresh() : revalidation manuelle
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
  const { data, status, error, refresh } = useAsyncData<DashboardData>('dashboard', () =>
    $fetch<DashboardData>('/api/me/dashboard'),
  );

  const isLoading = computed(() => status.value === 'pending');

  const hasCurrentWeek = computed(() => !!data.value?.currentWeek.moduleId);

  const hasNoCohort = computed(
    () =>
      status.value === 'success' &&
      !data.value?.currentWeek.moduleId &&
      !data.value?.progress.totalModules,
  );

  return {
    data,
    status,
    error,
    refresh,
    isLoading,
    hasCurrentWeek,
    hasNoCohort,
  };
}
