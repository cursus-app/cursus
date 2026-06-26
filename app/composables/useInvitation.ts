/**
 * Composable de gestion des invitations stagiaires.
 * Opérations : envoi batch, liste, renvoi.
 * Cf. ST-04.2 — invitation stagiaires (single + bulk CSV).
 */
import type { InvitationBatchResult, InvitationItem } from '~~/shared/schemas/invitation';

export type { InvitationBatchResult, InvitationItem };

export function useInvitation() {
  const { t } = useT();
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Invite une liste d'emails dans une cohorte.
   * Accepte entre 1 et 50 emails par appel.
   */
  async function inviteEmails(
    cohorteId: string,
    emails: string[],
  ): Promise<InvitationBatchResult> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<InvitationBatchResult>(`/api/cohortes/${cohorteId}/invitations`, {
        method: 'POST',
        body: { emails },
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
   * Récupère la liste des invitations en attente pour une cohorte.
   */
  async function listInvitations(cohorteId: string): Promise<InvitationItem[]> {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch<InvitationItem[]>(`/api/cohortes/${cohorteId}/invitations`);
    } catch (err: unknown) {
      const fetchErr = err as { data?: { message?: string } };
      error.value = fetchErr.data?.message ?? t('errors.generic');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Renvoie une invitation à son destinataire.
   * @param invitationId - ID de l'invitation à renvoyer
   */
  async function resendInvitation(invitationId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await $fetch(`/api/invitations/${invitationId}/resend`, { method: 'POST' });
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
    inviteEmails,
    listInvitations,
    resendInvitation,
  };
}
