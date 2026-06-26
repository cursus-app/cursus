/**
 * Composable de gestion des co-formateurs d'une cohorte.
 * Wrap les appels API (add, remove, update modules) avec état loading/error.
 * Cf. ST-04.3 — Attribution co-formateurs (globaux ou par module).
 */
import type { CoFormateurAddInput, CoFormateurUpdateInput } from '~~/shared/schemas/cohorte';

export interface CoFormateurMember {
  id: string;
  role: 'CO_FORMATEUR';
  moduleIds: string[] | null;
  joinedAt: string;
  leftAt: string | null;
  user: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    githubHandle: string | null;
    email?: string;
  };
}

export function useCoFormateurCohorte() {
  const { t } = useT();
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Ajoute un co-formateur à la cohorte.
   * @param cohorteId - ID de la cohorte
   * @param data - { email? | userId?, moduleIds?: string[] | null }
   */
  async function addCoFormateur(
    cohorteId: string,
    data: CoFormateurAddInput,
  ): Promise<CoFormateurMember> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<CoFormateurMember>(`/api/cohortes/${cohorteId}/co-formateurs`, {
        method: 'POST',
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

  /**
   * Retire un co-formateur de la cohorte.
   * @param cohorteId - ID de la cohorte
   * @param userId - ID de l'utilisateur à retirer
   */
  async function removeCoFormateur(cohorteId: string, userId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await $fetch(`/api/cohortes/${cohorteId}/co-formateurs/${userId}`, {
        method: 'DELETE',
      });
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Met à jour les modules assignés à un co-formateur.
   * @param cohorteId - ID de la cohorte
   * @param userId - ID du co-formateur
   * @param data - { moduleIds: string[] | null }
   */
  async function updateCoFormateurModules(
    cohorteId: string,
    userId: string,
    data: CoFormateurUpdateInput,
  ): Promise<CoFormateurMember> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<CoFormateurMember>(
        `/api/cohortes/${cohorteId}/co-formateurs/${userId}`,
        {
          method: 'PATCH',
          body: data,
        },
      );
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
    addCoFormateur,
    removeCoFormateur,
    updateCoFormateurModules,
  };
}
