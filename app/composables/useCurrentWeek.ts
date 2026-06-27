/**
 * useCurrentWeek — composable SSR-compatible pour la page "Cette semaine".
 *
 * Fournit :
 *  - module       : informations du module courant
 *  - progression  : état de progression du stagiaire
 *  - allModules   : tous les modules (pour la timeline)
 *  - cohort       : infos de la cohorte active
 *  - totalModules : nombre total de modules
 *  - dueDate      : date limite du module courant
 *  - daysLeft     : jours restants (négatif si en retard)
 *  - isLate       : retard détecté (daysLeft < 0 ET status pas SOUMIS/VALIDE)
 *  - hasSubmitted : le stagiaire a soumis le module courant
 *  - isLoading    : état de chargement
 *  - error        : message d'erreur éventuel
 *  - refresh()    : rechargement depuis l'API
 */

export type ProgressionStatus =
  | 'A_VENIR'
  | 'EN_COURS'
  | 'SOUMIS'
  | 'VALIDE'
  | 'BLOQUE'
  | 'EN_ALERTE'
  | 'EN_RETARD'
  | 'VALIDE_OVERRIDE';

export interface CurrentWeekResource {
  url: string;
  title: string;
  type: string;
}

export interface ModuleDeliverable {
  description: string | null;
  repoRequired: boolean;
  deployRequired: boolean;
}

export interface CurrentWeekModule {
  cohortModuleId: string;
  moduleId: string;
  week: number;
  title: string;
  objectives: string;
  resources: CurrentWeekResource[];
  deliverable: ModuleDeliverable;
  hasQuiz: boolean;
  quizId: string | null;
  quizTitle: string | null;
  xpReward: number;
  dueDate: string;
  daysLeft: number;
  isLate: boolean;
}

export interface CurrentWeekProgression {
  status: ProgressionStatus;
  submittedAt: string | null;
  validatedAt: string | null;
}

export interface TimelineModule {
  cohortModuleId: string;
  moduleId: string;
  week: number;
  title: string;
  position: number;
  dueDate: string;
  daysLeft: number;
  isLate: boolean;
  status: ProgressionStatus;
  submittedAt: string | null;
  validatedAt: string | null;
  hasQuiz: boolean;
}

export interface CurrentWeekCohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface CurrentWeekResponse {
  cohort: CurrentWeekCohort | null;
  currentModule: CurrentWeekModule | null;
  progression: CurrentWeekProgression | null;
  totalModules?: number;
  allModules: TimelineModule[];
}

/** Statuts qui indiquent que le stagiaire a soumis le livrable. */
const SUBMITTED_STATUSES = new Set<ProgressionStatus>(['SOUMIS', 'VALIDE', 'VALIDE_OVERRIDE']);

/** Statuts terminaux (ne compte pas comme "en retard"). */
const DONE_STATUSES = new Set<ProgressionStatus>(['SOUMIS', 'VALIDE', 'VALIDE_OVERRIDE']);

export function useCurrentWeek() {
  const data = ref<CurrentWeekResponse | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  async function refresh() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<CurrentWeekResponse>('/api/me/current-week');
      data.value = res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      error.value = message;
    } finally {
      isLoading.value = false;
    }
  }

  const cohort = computed(() => data.value?.cohort ?? null);
  const module = computed(() => data.value?.currentModule ?? null);
  const progression = computed(() => data.value?.progression ?? null);
  const allModules = computed(() => data.value?.allModules ?? []);
  const totalModules = computed(() => data.value?.totalModules ?? 0);

  const dueDate = computed(() => module.value?.dueDate ?? null);
  const daysLeft = computed(() => module.value?.daysLeft ?? null);

  /**
   * Le stagiaire est en retard si :
   *  - la dueDate est passée (daysLeft < 0)
   *  - ET il n'a pas encore soumis (status pas dans DONE_STATUSES)
   */
  const isLate = computed(() => {
    const prog = progression.value;
    const mod = module.value;
    if (!mod || !prog) {
      return false;
    }
    return mod.daysLeft < 0 && !DONE_STATUSES.has(prog.status);
  });

  /** Le stagiaire a soumis (ou le module est validé). */
  const hasSubmitted = computed(() => {
    const prog = progression.value;
    if (!prog) {
      return false;
    }
    return SUBMITTED_STATUSES.has(prog.status);
  });

  return {
    cohort,
    module,
    progression,
    allModules,
    totalModules,
    dueDate,
    daysLeft,
    isLate,
    hasSubmitted,
    isLoading: readonly(isLoading),
    error: readonly(error),
    refresh,
  };
}
