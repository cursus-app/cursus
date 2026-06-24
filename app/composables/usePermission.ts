/**
 * Composable de vérification des permissions RBAC côté client.
 * Pure functions — aucun roundtrip réseau, basé uniquement sur le store Pinia.
 *
 * Ces helpers servent à masquer les actions interdites dans l'UI (UX).
 * La source de vérité sécurité reste toujours la RLS Supabase + les middlewares Nitro.
 */
export function usePermission() {
  const store = useUserStore();

  /** Vrai si l'utilisateur est admin global. */
  function isAdmin(): boolean {
    return store.globalRole === 'ADMIN';
  }

  /** Vrai si l'utilisateur est formateur (principal ou co-formateur) dans au moins une cohorte. */
  function isFormateur(): boolean {
    return (
      store.globalRole === 'FORMATEUR_PRINCIPAL' ||
      store.globalRole === 'CO_FORMATEUR' ||
      store.memberships.some((m) => m.role === 'FORMATEUR_PRINCIPAL' || m.role === 'CO_FORMATEUR')
    );
  }

  /**
   * Vrai si l'utilisateur est formateur principal.
   * @param cohorteId — si fourni, vérifie le rôle dans cette cohorte spécifique.
   *   Sans cohorteId, retourne vrai si au moins une cohorte a ce rôle.
   */
  function isFormateurPrincipal(cohorteId?: string): boolean {
    if (isAdmin()) {
      return true;
    }
    if (cohorteId) {
      return store.memberships.some(
        (m) => m.cohorteId === cohorteId && m.role === 'FORMATEUR_PRINCIPAL',
      );
    }
    return (
      store.globalRole === 'FORMATEUR_PRINCIPAL' ||
      store.memberships.some((m) => m.role === 'FORMATEUR_PRINCIPAL')
    );
  }

  /**
   * Vrai si l'utilisateur est stagiaire dans la cohorte donnée.
   * Nécessite toujours un cohorteId — un utilisateur multi-cohortes peut être
   * stagiaire dans l'une et formateur dans une autre.
   */
  function isStagiaire(cohorteId: string): boolean {
    return store.memberships.some((m) => m.cohorteId === cohorteId && m.role === 'STAGIAIRE');
  }

  /** Peut créer/modifier un cursus (template). */
  function canManageCursus(): boolean {
    return isAdmin() || isFormateur();
  }

  /** Peut gérer les paramètres et membres d'une cohorte. */
  function canManageCohorte(cohorteId?: string): boolean {
    return isAdmin() || isFormateurPrincipal(cohorteId);
  }

  /** Peut consulter les soumissions d'une cohorte. */
  function canViewSubmissions(cohorteId: string): boolean {
    return isAdmin() || isFormateur() || isStagiaire(cohorteId);
  }

  /**
   * Peut forcer la validation d'une soumission (override manuel).
   * Réservé aux formateurs principaux et admins.
   */
  function canOverrideSubmission(cohorteId?: string): boolean {
    return isAdmin() || isFormateurPrincipal(cohorteId);
  }

  /** Peut consulter les alertes d'une cohorte. */
  function canSeeAlert(cohorteId?: string): boolean {
    return isAdmin() || isFormateurPrincipal(cohorteId);
  }

  /** Peut éditer le contenu d'un cursus (modules, quiz). */
  function canEditCursus(): boolean {
    return isAdmin() || isFormateur();
  }

  return {
    isAdmin,
    isFormateur,
    isFormateurPrincipal,
    isStagiaire,
    canManageCursus,
    canManageCohorte,
    canViewSubmissions,
    canOverrideSubmission,
    canSeeAlert,
    canEditCursus,
  };
}
